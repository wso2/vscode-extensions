/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/* eslint-disable @typescript-eslint/naming-convention */
import { createMachine, assign, interpret } from 'xstate';
import * as vscode from 'vscode';
import { AIMachineStateValue, AIMachineContext, AI_EVENT_TYPE, AIMachineSendableEvent, LoginMethod } from '@wso2/mi-core';
import { AiPanelWebview } from './webview';
import { extension } from '../MIExtensionContext';
import {
    getAuthCredentials,
    getPlatformExtensionAPI,
    initiateInbuiltAuth,
    logout,
    validateApiKey,
    validateAwsCredentials,
    isPlatformExtensionAvailable,
    isDevantUserLoggedIn,
    getPlatformStsToken,
    exchangeStsToCopilotToken,
    storeAuthCredentials
} from './auth';
import { PromptObject } from '@wso2/mi-core';
import { logError, logInfo, logWarn } from './copilot/logger';

const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

let silentPlatformBootstrapInFlight = false;
const LOGIN_STS_RETRY_COUNT = 10;
const LOGIN_STS_RETRY_DELAY_MS = 500;

const trySilentPlatformBootstrap = async (): Promise<void> => {
    if (silentPlatformBootstrapInFlight) {
        return;
    }

    // Only bootstrap when the machine is currently unauthenticated.
    if (aiStateService.getSnapshot().value !== 'Unauthenticated') {
        return;
    }

    silentPlatformBootstrapInFlight = true;
    try {
        const isLoggedIn = await isDevantUserLoggedIn();
        if (!isLoggedIn) {
            return;
        }

        const stsToken = await getPlatformStsToken({
            retries: LOGIN_STS_RETRY_COUNT,
            retryDelayMs: LOGIN_STS_RETRY_DELAY_MS,
        });
        if (!stsToken) {
            return;
        }

        const secrets = await exchangeStsToCopilotToken(stsToken);
        await storeAuthCredentials({
            loginMethod: LoginMethod.MI_INTEL,
            secrets
        });

        // Transition to authenticated only if state is still unauthenticated.
        if (aiStateService.getSnapshot().value === 'Unauthenticated') {
            aiStateService.send({ type: AI_EVENT_TYPE.SIGN_IN_SUCCESS });
        }
    } catch (error) {
        logError('Silent platform auth bootstrap failed', error);
    } finally {
        silentPlatformBootstrapInFlight = false;
    }
};

export const openAIWebview = (initialPrompt?: PromptObject) => {
    extension.initialPrompt = initialPrompt;
    if (!AiPanelWebview.currentPanel) {
        AiPanelWebview.currentPanel = new AiPanelWebview();
    } else {
        AiPanelWebview.currentPanel!.getWebview()?.reveal();
    }

    // If platform session is already active, silently bootstrap auth for the AI panel.
    void trySilentPlatformBootstrap();
};

export const closeAIWebview = () => {
    if (AiPanelWebview.currentPanel) {
        AiPanelWebview.currentPanel.dispose();
        AiPanelWebview.currentPanel = undefined;
    }
};

const createAuthSuccessTransition = (target: string) => ({
    target,
    actions: assign({
        errorMessage: (_ctx: AIMachineContext) => undefined,
    }),
});

const aiMachine = createMachine<AIMachineContext, AIMachineSendableEvent>({
    id: 'mi-ai',
    initial: 'Initialize',
    predictableActionArguments: true,
    context: {
        loginMethod: undefined,
        userToken: undefined,
        usage: undefined,
        errorMessage: undefined,
    },
    on: {
        DISPOSE: {
            target: 'Initialize',
            actions: assign({
                loginMethod: (_ctx) => undefined,
                userToken: (_ctx) => undefined,
                usage: (_ctx) => undefined,
                errorMessage: (_ctx) => undefined,
            })
        }
    },
    states: {
        Initialize: {
            invoke: {
                id: 'checkWorkspaceAndToken',
                src: 'checkWorkspaceAndToken',
                onDone: [
                    {
                        cond: (_ctx, event) => event.data.workspaceSupported && !!event.data.tokenData,
                        target: 'Authenticated',
                        actions: assign({
                            loginMethod: (_ctx, event) => event.data.tokenData.loginMethod,
                            userToken: (_ctx, event) => ({ token: event.data.tokenData.token }),
                            errorMessage: (_ctx) => undefined,
                        })
                    },
                    {
                        cond: (_ctx, event) => event.data.workspaceSupported && !event.data.tokenData,
                        target: 'Unauthenticated',
                        actions: assign({
                            loginMethod: (_ctx) => undefined,
                            userToken: (_ctx) => undefined,
                            usage: (_ctx) => undefined,
                            errorMessage: (_ctx) => undefined,
                        })
                    },
                    {
                        cond: (_ctx, event) => !event.data.workspaceSupported,
                        target: 'NotSupported',
                        actions: assign({
                            loginMethod: (_ctx) => undefined,
                            userToken: (_ctx) => undefined,
                            usage: (_ctx) => undefined,
                            errorMessage: (_ctx) => 'Multi-root workspace is not supported',
                        })
                    }
                ],
                onError: [
                    {
                        cond: (_ctx, event) => event.data?.message === 'TOKEN_EXPIRED',
                        target: 'Unauthenticated',
                        actions: [
                            'silentLogout',
                            assign({
                                loginMethod: (_ctx) => undefined,
                                userToken: (_ctx) => undefined,
                                usage: (_ctx) => undefined,
                                errorMessage: (_ctx) => undefined,
                            })
                        ]
                    },
                    {
                        target: 'Disabled',
                        actions: assign({
                            loginMethod: (_ctx) => undefined,
                            userToken: (_ctx) => undefined,
                            usage: (_ctx) => undefined,
                            errorMessage: (_ctx, event) => event.data?.message || 'Unknown error'
                            })
                    }
                ]
            }
        },
        Unauthenticated: {
            on: {
                [AI_EVENT_TYPE.LOGIN]: {
                    target: 'Authenticating',
                    actions: assign({
                        loginMethod: (_ctx) => LoginMethod.MI_INTEL
                    })
                },
                [AI_EVENT_TYPE.AUTH_WITH_API_KEY]: {
                    target: 'Authenticating',
                    actions: assign({
                        loginMethod: (_ctx) => LoginMethod.ANTHROPIC_KEY
                    })
                },
                [AI_EVENT_TYPE.AUTH_WITH_AWS_BEDROCK]: {
                    target: 'Authenticating',
                    actions: assign({
                        loginMethod: (_ctx) => LoginMethod.AWS_BEDROCK
                    })
                },
                [AI_EVENT_TYPE.COMPLETE_AUTH]: createAuthSuccessTransition('Authenticated'),
                [AI_EVENT_TYPE.SIGN_IN_SUCCESS]: createAuthSuccessTransition('Authenticated'),
            }
        },
        Authenticating: {
            initial: 'determineFlow',
            states: {
                determineFlow: {
                    always: [
                        {
                            cond: (context) => context.loginMethod === LoginMethod.MI_INTEL,
                            target: 'ssoFlow'
                        },
                        {
                            cond: (context) => context.loginMethod === LoginMethod.ANTHROPIC_KEY,
                            target: 'apiKeyFlow'
                        },
                        {
                            cond: (context) => context.loginMethod === LoginMethod.AWS_BEDROCK,
                            target: 'awsBedrockFlow'
                        },
                        {
                            target: 'ssoFlow' // default
                        }
                    ]
                },
                ssoFlow: {
                    invoke: {
                        id: 'openLogin',
                        src: 'openLogin',
                        onError: {
                                target: '#mi-ai.Unauthenticated',
                                actions: assign({
                                        loginMethod: (_ctx) => undefined,
                                        errorMessage: (_ctx, event) => event.data?.message || 'SSO authentication failed'
                            })
                        }
                    },
                    on: {
                        [AI_EVENT_TYPE.COMPLETE_AUTH]: createAuthSuccessTransition('#mi-ai.Authenticated'),
                        [AI_EVENT_TYPE.SIGN_IN_SUCCESS]: createAuthSuccessTransition('#mi-ai.Authenticated'),
                        [AI_EVENT_TYPE.CANCEL_LOGIN]: {
                            target: '#mi-ai.Unauthenticated',
                            actions: assign({
                                loginMethod: (_ctx) => undefined,
                                errorMessage: (_ctx) => undefined,
                            })
                        },
                        [AI_EVENT_TYPE.CANCEL]: {
                            target: '#mi-ai.Unauthenticated',
                            actions: assign({
                                loginMethod: (_ctx) => undefined,
                                errorMessage: (_ctx) => undefined,
                            })
                        }
                    }
                },
                apiKeyFlow: {
                    on: {
                        [AI_EVENT_TYPE.SUBMIT_API_KEY]: {
                            target: 'validatingApiKey',
                            actions: assign({
                                errorMessage: (_ctx) => undefined
                            })
                        },
                        [AI_EVENT_TYPE.CANCEL_LOGIN]: {
                            target: '#mi-ai.Unauthenticated',
                            actions: assign({
                                loginMethod: (_ctx) => undefined,
                                errorMessage: (_ctx) => undefined,
                            })
                        },
                        [AI_EVENT_TYPE.CANCEL]: {
                            target: '#mi-ai.Unauthenticated',
                            actions: assign({
                                loginMethod: (_ctx) => undefined,
                                errorMessage: (_ctx) => undefined,
                            })
                        }
                    }
                },
                validatingApiKey: {
                    invoke: {
                        id: 'validateApiKey',
                        src: 'validateApiKey',
                        onDone: {
                            target: '#mi-ai.Authenticated',
                            actions: assign({
                                errorMessage: (_ctx) => undefined,
                            })
                        },
                        onError: {
                            target: 'apiKeyFlow',
                            actions: assign({
                                errorMessage: (_ctx, event) => event.data?.message || 'API key validation failed'
                            })
                        }
                    }
                },
                awsBedrockFlow: {
                    on: {
                        [AI_EVENT_TYPE.SUBMIT_AWS_CREDENTIALS]: {
                            target: 'validatingAwsCredentials',
                            actions: assign({
                                errorMessage: (_ctx) => undefined
                            })
                        },
                        [AI_EVENT_TYPE.CANCEL_LOGIN]: {
                            target: '#mi-ai.Unauthenticated',
                            actions: assign({
                                loginMethod: (_ctx) => undefined,
                                errorMessage: (_ctx) => undefined,
                            })
                        },
                        [AI_EVENT_TYPE.CANCEL]: {
                            target: '#mi-ai.Unauthenticated',
                            actions: assign({
                                loginMethod: (_ctx) => undefined,
                                errorMessage: (_ctx) => undefined,
                            })
                        }
                    }
                },
                validatingAwsCredentials: {
                    invoke: {
                        id: 'validateAwsCredentials',
                        src: 'validateAwsCredentials',
                        onDone: {
                            target: '#mi-ai.Authenticated',
                            actions: assign({
                                errorMessage: (_ctx) => undefined,
                            })
                        },
                        onError: {
                            target: 'awsBedrockFlow',
                            actions: assign({
                                errorMessage: (_ctx, event) => event.data?.message || 'AWS credentials validation failed'
                            })
                        }
                    }
                }
            }
        },
        Authenticated: {
            invoke: {
                id: 'getTokenAndLoginMethod',
                src: 'getTokenAndLoginMethod',
                onDone: {
                    actions: assign({
                        userToken: (_ctx, event) => ({ token: event.data.token }),
                        loginMethod: (_ctx, event) => event.data.loginMethod,
                        errorMessage: (_ctx) => undefined,
                    })
                },
                onError: {
                    target: 'Unauthenticated',
                    actions: assign({
                        userToken: (_ctx) => undefined,
                        loginMethod: (_ctx) => undefined,
                        usage: (_ctx) => undefined,
                        errorMessage: (_ctx, event) => event.data?.message || 'Failed to retrieve authentication credentials',
                    })
                }
            },
            on: {
                [AI_EVENT_TYPE.LOGOUT]: {
                    target: 'Unauthenticated',
                    actions: [
                        'logout',
                        assign({
                            loginMethod: (_) => undefined,
                            userToken: (_) => undefined,
                            usage: (_) => undefined,
                            errorMessage: (_) => undefined,
                        })
                    ]
                },
                [AI_EVENT_TYPE.SILENT_LOGOUT]: {
                    target: 'Unauthenticated',
                    actions: [
                        'silentLogout',
                        assign({
                            loginMethod: (_) => undefined,
                            userToken: (_) => undefined,
                            usage: (_) => undefined,
                            errorMessage: (_) => undefined,
                        })
                    ]
                },
                [AI_EVENT_TYPE.USAGE_EXCEEDED]: {
                    target: 'UsageExceeded',
                    actions: assign({
                        errorMessage: (_ctx) => 'Your free usage quota has been exceeded. Set your own Anthropic API key to continue.',
                    })
                },
                [AI_EVENT_TYPE.UPDATE_USAGE]: {
                    actions: assign({
                        usage: (_ctx, event) => event.payload?.usage,
                    })
                }
            }
        },
        UsageExceeded: {
            on: {
                [AI_EVENT_TYPE.AUTH_WITH_API_KEY]: {
                    target: 'Authenticating',
                    actions: assign({
                        loginMethod: (_ctx) => LoginMethod.ANTHROPIC_KEY,
                        errorMessage: (_ctx) => undefined,
                    })
                },
                [AI_EVENT_TYPE.AUTH_WITH_AWS_BEDROCK]: {
                    target: 'Authenticating',
                    actions: assign({
                        loginMethod: (_ctx) => LoginMethod.AWS_BEDROCK,
                        errorMessage: (_ctx) => undefined,
                    })
                },
                [AI_EVENT_TYPE.USAGE_RESET]: {
                    target: 'Authenticated',
                    actions: assign({
                        errorMessage: (_ctx) => undefined,
                    })
                },
                [AI_EVENT_TYPE.LOGOUT]: {
                    target: 'Unauthenticated',
                    actions: [
                        'logout',
                        assign({
                            loginMethod: (_) => undefined,
                            userToken: (_) => undefined,
                            usage: (_) => undefined,
                            errorMessage: (_) => undefined,
                        })
                    ]
                },
                [AI_EVENT_TYPE.UPDATE_USAGE]: {
                    actions: assign({
                        usage: (_ctx, event) => event.payload?.usage,
                    })
                }
            }
        },
        Disabled: {
            on: {
                [AI_EVENT_TYPE.RETRY]: {
                    target: 'Initialize',
                    actions: assign({
                        userToken: (_ctx) => undefined,
                        usage: (_ctx) => undefined,
                        loginMethod: (_ctx) => undefined,
                        errorMessage: (_ctx) => undefined,
                    })
                }
            }
        },
        NotSupported: {
            on: {
                [AI_EVENT_TYPE.RETRY]: {
                    target: 'Initialize',
                    actions: assign({
                        userToken: (_ctx) => undefined,
                        usage: (_ctx) => undefined,
                        loginMethod: (_ctx) => undefined,
                        errorMessage: (_ctx) => undefined,
                    })
                },
                [AI_EVENT_TYPE.LOGOUT]: {
                    target: 'Unauthenticated',
                    actions: [
                        'logout',
                        assign({
                            loginMethod: (_) => undefined,
                            userToken: (_) => undefined,
                            usage: (_) => undefined,
                            errorMessage: (_) => undefined,
                        })
                    ]
                }
            }
        }
    }
});

const checkWorkspaceAndToken = async (): Promise<{ workspaceSupported: boolean; tokenData?: { token: string; loginMethod: LoginMethod } }> => {
    // Check workspace support first
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 1) {
        return { workspaceSupported: false };
    }

    const credentials = await getAuthCredentials();
    let tokenData: { token: string; loginMethod: LoginMethod } | undefined;
    if (credentials?.loginMethod === LoginMethod.MI_INTEL) {
        const secrets = credentials.secrets as { accessToken?: string; expiresAt?: number };
        if (secrets.accessToken) {
            const isExpiredOrUnknown = !secrets.expiresAt || (secrets.expiresAt - TOKEN_EXPIRY_BUFFER_MS) < Date.now();
            if (isExpiredOrUnknown) {
                // Token expired — try silent STS refresh so the user doesn't have to re-login.
                logInfo('Stored MI_INTEL token is expired. Attempting silent STS refresh...');
                try {
                    const stsToken = await getPlatformStsToken({ retries: 3, retryDelayMs: 500 });
                    if (stsToken) {
                        const newSecrets = await exchangeStsToCopilotToken(stsToken);
                        await storeAuthCredentials({ loginMethod: LoginMethod.MI_INTEL, secrets: newSecrets });
                        tokenData = { token: newSecrets.accessToken, loginMethod: LoginMethod.MI_INTEL };
                        logInfo('Silent STS refresh succeeded. Token refreshed.');
                    } else {
                        logWarn('Silent STS refresh skipped: platform STS token unavailable. User will need to re-login.');
                    }
                } catch (error) {
                    logWarn(`Silent STS refresh failed during initialization. User will need to re-login. ${error instanceof Error ? error.message : String(error)}`);
                }
            } else {
                tokenData = { token: secrets.accessToken, loginMethod: LoginMethod.MI_INTEL };
            }
        }
    } else if (credentials?.loginMethod === LoginMethod.ANTHROPIC_KEY) {
        const apiKey = (credentials.secrets as { apiKey?: string })?.apiKey;
        if (apiKey) {
            tokenData = { token: apiKey, loginMethod: LoginMethod.ANTHROPIC_KEY };
        }
    } else if (credentials?.loginMethod === LoginMethod.AWS_BEDROCK) {
        const secrets = credentials.secrets as { accessKeyId?: string; secretAccessKey?: string; region?: string };
        if (secrets.accessKeyId && secrets.secretAccessKey && secrets.region) {
            tokenData = { token: secrets.accessKeyId, loginMethod: LoginMethod.AWS_BEDROCK };
        }
    }

    return { workspaceSupported: true, tokenData };
};

const openLogin = async () => {
    await setupPlatformExtensionListener();

    const tryCompleteAuthFromSts = async (): Promise<boolean> => {
        const stsToken = await getPlatformStsToken({
            retries: LOGIN_STS_RETRY_COUNT,
            retryDelayMs: LOGIN_STS_RETRY_DELAY_MS,
        });
        if (!stsToken) {
            return false;
        }

        const secrets = await exchangeStsToCopilotToken(stsToken);
        await storeAuthCredentials({
            loginMethod: LoginMethod.MI_INTEL,
            secrets
        });
        aiStateService.send({ type: AI_EVENT_TYPE.COMPLETE_AUTH });
        return true;
    };

    // If platform extension already has an authenticated session, complete auth immediately.
    const isLoggedIn = await isDevantUserLoggedIn();
    if (isLoggedIn) {
        if (await tryCompleteAuthFromSts()) {
            return true;
        }
        logWarn('Platform reports logged in but STS token is not available yet; continuing with interactive sign-in.');
    }

    // Otherwise trigger platform login; completion is handled by the platform login listener.
    const status = await initiateInbuiltAuth();
    if (!status) {
        aiStateService.send({ type: AI_EVENT_TYPE.CANCEL_LOGIN });
        return status;
    }
    // Keep waiting in ssoFlow; platform login callback will complete token exchange.
    return status;
};

const validateApiKeyService = async (_context: AIMachineContext, event: any) => {
    const apiKey = event.payload?.apiKey;
    if (!apiKey) {
        throw new Error('API key is required');
    }
    return await validateApiKey(apiKey, LoginMethod.ANTHROPIC_KEY);
};

const validateAwsCredentialsService = async (_context: AIMachineContext, event: any) => {
    const { accessKeyId, secretAccessKey, region, sessionToken } = event.payload || {};
    if (!accessKeyId || !secretAccessKey || !region) {
        throw new Error('AWS access key ID, secret access key, and region are required');
    }
    return await validateAwsCredentials({ accessKeyId, secretAccessKey, region, sessionToken });
};

const getTokenAndLoginMethod = async () => {
    const credentials = await getAuthCredentials();
    if (!credentials) {
        throw new Error('No authentication credentials found');
    }

    if (credentials.loginMethod === LoginMethod.MI_INTEL) {
        const accessToken = (credentials.secrets as { accessToken?: string })?.accessToken;
        if (!accessToken) {
            throw new Error('No authentication credentials found');
        }
        return { token: accessToken, loginMethod: LoginMethod.MI_INTEL };
    }

    if (credentials.loginMethod === LoginMethod.ANTHROPIC_KEY) {
        const apiKey = (credentials.secrets as { apiKey?: string })?.apiKey;
        if (!apiKey) {
            throw new Error('No authentication credentials found');
        }
        return { token: apiKey, loginMethod: LoginMethod.ANTHROPIC_KEY };
    }

    if (credentials.loginMethod === LoginMethod.AWS_BEDROCK) {
        const secrets = credentials.secrets as { accessKeyId?: string; secretAccessKey?: string; region?: string };
        if (!secrets.accessKeyId || !secrets.secretAccessKey || !secrets.region) {
            throw new Error('Incomplete AWS Bedrock credentials. Please log in again.');
        }
        return { token: secrets.accessKeyId, loginMethod: LoginMethod.AWS_BEDROCK };
    }

    throw new Error('No authentication credentials found');
};

const aiStateService = interpret(aiMachine.withConfig({
    services: {
        checkWorkspaceAndToken: checkWorkspaceAndToken,
        openLogin: openLogin,
        validateApiKey: validateApiKeyService,
        validateAwsCredentials: validateAwsCredentialsService,
        getTokenAndLoginMethod: getTokenAndLoginMethod,
    },
    actions: {
        logout: () => {
            logout();
        },
        silentLogout: () => {
            logout(false);
        },
    }
}));

const isExtendedEvent = <K extends AI_EVENT_TYPE>(
    arg: K | AIMachineSendableEvent
): arg is Extract<AIMachineSendableEvent, { type: K }> => {
    return typeof arg !== "string";
};

let platformLoginListenerSetup = false;

const setupPlatformExtensionListener = async () => {
    if (platformLoginListenerSetup) {
        return;
    }
    platformLoginListenerSetup = true;

    try {
        const api = await getPlatformExtensionAPI();
        if (!api || !api.subscribeIsLoggedIn) {
            return;
        }

        api.subscribeIsLoggedIn(async (isLoggedIn: boolean) => {
            const currentState = aiStateService.getSnapshot().value;
            const inSsoFlow =
                typeof currentState === 'object' &&
                'Authenticating' in currentState &&
                (currentState as { Authenticating: string }).Authenticating === 'ssoFlow';

            if (!isLoggedIn || !inSsoFlow) {
                return;
            }

            try {
                const stsToken = await getPlatformStsToken({
                    retries: LOGIN_STS_RETRY_COUNT,
                    retryDelayMs: LOGIN_STS_RETRY_DELAY_MS,
                });
                if (!stsToken) {
                    throw new Error('Failed to get STS token after platform login');
                }

                const secrets = await exchangeStsToCopilotToken(stsToken);
                await storeAuthCredentials({
                    loginMethod: LoginMethod.MI_INTEL,
                    secrets
                });
                aiStateService.send({ type: AI_EVENT_TYPE.COMPLETE_AUTH });
            } catch (error) {
                logError('Failed to exchange token after platform login', error);
                aiStateService.send({ type: AI_EVENT_TYPE.CANCEL_LOGIN });
            }
        });
    } catch (error) {
        logError('Failed to activate platform extension for login listener', error);
    }
};

export const StateMachineAI = {
    initialize: () => {
        return aiStateService.start();
    },
    service: () => { return aiStateService; },
    context: () => { return aiStateService.getSnapshot().context; },
    state: () => { return aiStateService.getSnapshot().value as AIMachineStateValue; },
    sendEvent: <K extends AI_EVENT_TYPE>(
        event: K | Extract<AIMachineSendableEvent, { type: K }>
    ) => {
        if (isExtendedEvent(event)) {
            aiStateService.send(event as AIMachineSendableEvent);
    } else {
            aiStateService.send({ type: event } as AIMachineSendableEvent);
        }
    }
};
