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
import { AIMachineStateValue, AIMachineContext, AI_EVENT_TYPE, AIUserToken, AIMachineSendableEvent, LoginMethod } from '@wso2/mi-core';
import { AiPanelWebview } from './webview';
import { extension } from '../MIExtensionContext';
import { getAccessToken, getLoginMethod, checkToken, initiateInbuiltAuth, logout, validateApiKey } from './auth';
import { PromptObject } from '@wso2/mi-core';

export const USER_CHECK_BACKEND_URL = '/usage';

export const openAIWebview = (initialPrompt?: PromptObject) => {
    extension.initialPrompt = initialPrompt;
    if (!AiPanelWebview.currentPanel) {
        AiPanelWebview.currentPanel = new AiPanelWebview();
    } else {
        AiPanelWebview.currentPanel!.getWebview()?.reveal();
    }
};

export const closeAIWebview = () => {
    if (AiPanelWebview.currentPanel) {
        AiPanelWebview.currentPanel.dispose();
        AiPanelWebview.currentPanel = undefined;
    }
};

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
                }
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
                        [AI_EVENT_TYPE.COMPLETE_AUTH]: {
                            target: '#mi-ai.Authenticated',
                            actions: assign({
                                errorMessage: (_ctx) => undefined,
                            })
                        },
                        [AI_EVENT_TYPE.SIGN_IN_SUCCESS]: {
                            target: '#mi-ai.Authenticated',
                            actions: assign({
                                errorMessage: (_ctx) => undefined,
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
                }
            }
        },
        Authenticated: {
            invoke: {
                id: 'getUsage',
                src: 'getUsage',
                onDone: {
                    actions: assign({
                        userToken: (_ctx, event) => ({ token: event.data.token }),
                        loginMethod: (_ctx, event) => event.data.loginMethod,
                        usage: (_ctx, event) => event.data.usage,
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
                [AI_EVENT_TYPE.REFRESH_USAGE]: {
                    actions: (context) => {
                        // Fire and forget - fetch usage and update context when ready
                        getUsage().then(data => {
                            if (data.usage && aiStateService.state.value === 'Authenticated') {
                                // Update context directly
                                Object.assign(context, { usage: data.usage });
                                // Notify state change to trigger UI update
                                aiStateService.send({ type: '__internal__' } as any);
                            }
                        }).catch(err => {
                            console.error('Failed to refresh usage:', err);
                        });
                    }
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
    return new Promise(async (resolve, reject) => {
        try {
            // Check workspace support first
            if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 1) {
                resolve({ workspaceSupported: false });
                return;
            }

            // Then check token
            const tokenData = await checkToken();
            resolve({ workspaceSupported: true, tokenData });
        } catch (error) {
            reject(error);
        }
    });
};

const openLogin = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            const status = await initiateInbuiltAuth();
            if (!status) {
                aiStateService.send({ type: AI_EVENT_TYPE.CANCEL_LOGIN });
            }
            resolve(status);
        } catch (error) {
            reject(error);
        }
    });
};

const validateApiKeyService = async (_context: AIMachineContext, event: any) => {
    const apiKey = event.payload?.apiKey;
    if (!apiKey) {
        throw new Error('API key is required');
    }
    return await validateApiKey(apiKey, LoginMethod.ANTHROPIC_KEY);
};

const getUsage = async () => {
    const result = await getAccessToken();
    const loginMethod = await getLoginMethod();
    if (!result || !loginMethod) {
        throw new Error('No authentication credentials found');
    }

    // Fetch user token usage for MI_INTEL users only
    let usage = undefined;
    if (loginMethod === LoginMethod.MI_INTEL) {
        try {
            const { fetchWithAuth } = await import('./copilot/connection');
            const backendUrl = process.env.MI_COPILOT_ANTHROPIC_PROXY_URL as string;
            const response = await fetchWithAuth(backendUrl + USER_CHECK_BACKEND_URL);
            if (response.ok) {
                usage = await response.json();
            }
        } catch (error) {
            console.error('Failed to fetch user token usage:', error);
        }
    }

    return { token: result, loginMethod: loginMethod, usage };
};

const aiStateService = interpret(aiMachine.withConfig({
    services: {
        checkWorkspaceAndToken: checkWorkspaceAndToken,
        openLogin: openLogin,
        validateApiKey: validateApiKeyService,
        getUsage: getUsage,
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

export const StateMachineAI = {
    initialize: () => aiStateService.start(),
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
