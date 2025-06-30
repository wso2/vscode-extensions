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
import { EVENT_TYPE, AIVisualizerLocation, AIMachineStateValue, AI_EVENT_TYPE, AIUserTokens } from '@wso2/mi-core';
import { AiPanelWebview } from './webview';
import { getAuthUrl, refreshAuthCode } from './auth';
import { extension } from '../MIExtensionContext';
import fetch from 'node-fetch';
import { log } from '../util/logger';
import { PromptObject } from '@wso2/mi-core';

interface ChatEntry {
    role: string;
    content: string;
    errorCode?: string;
}

interface UserToken {
    token?: string;
    userToken?: AIUserTokens;
}

interface AiMachineContext extends AIVisualizerLocation {
    token: string | undefined;
    errorMessage?: string;
    errorCode?: string;
    chatLog: ChatEntry[];
}

const aiStateMachine = createMachine<AiMachineContext>({
    /** @xstate-layout N4IgpgJg5mDOIC5QFsCWBaAhqgdASQDtUAXVTAG1QC8wBiCAewLB1QIDcGBrFtLXQiTKUaCNpwDGmUkwDaABgC6CxYlAAHBrCFM1IAB6IATEYAsOAJwBmAOwBWeaZs2rFm-Lt2ANCACeiGwA2QJw7KysjeXkLAA4Y0wt5AEYAXxSfPmx8IlIKajpGZlYObl4MLMFckTAxEqkZAhVZJNUkEE1tBr1DBCMLEJsY+3lA0zshmLsbH38ECz6cd3k+1xikvs80jPKBHOF82jAAJyOGI5x1cmkAMzPkHEzdoTzRcQZ61DklFT0OnQJuohAjFFjYkuEostAvIYvJpn5EEk4fJLKZbEYhs4nEYtiBHjhyAwoDAIAB5ACuxFoABlSQBxPAAOR+bT+XTaPQsphRySSozsJmSgQs3gRCCSSXioJFkqspjMphiOPSeJ2OAASmBMBBfDT6aSAKoAFRZGi0-0BCDsiRwRkCfLWgRcSRcMRmASsdhw0SmNjMGLlcVx+M12t1AFEABrhgDCxvDpva5vZoB663coKMdmhdklNic7qtGO9SXlTmdGPBwbVoZ1tBj1PDAEF1Ym2Z8ARzEeEQaYkhZYn35BEYoFC36QtFEnCjEkwn3ldt+DgAOrYUgEKAAMTO1KJbHoTBYbx4DzVa6Em53Rz3UDYtUk0g7TSUv2THctSO53qcMUSVmhNFwkLIYBnGRIkSmcsbGrZcLw3bdd33AhDhOM4LiuYhbiOe58XgthEJvZCH3eJ8vmUV9WXfXQuwQSYLBwJFoTtFwjHCF0QLCSwe36J1hQ8WCsnwq8kLvFCYybRkY3Dak22oztUwCGwGL6Cx+z-F0ISMQsJVnb0ljtQIIjtOxBNwYTCNvA8tybPBqTwcNW0os1Og-WinRU4JImFfohjsUwdKiAZTBzdwrElKYzJwcN9DACRKQI+tSQAWQABUbI0E2cpNXJoxTxSMFxQmUl0EmBEUjMLPsQRiKx4n7cZuRdKKYrihLN1oRz1VJJzWhci1aPWP8cD-ZTPSdMw4kLADzGiExnDUtx+k9FrYvihDaAAZSNUlUrk3KFIMRE+nMYF-L6YVfTGQs+hsYr7FiQratGQJVrajbaTpcMABFDRNbL2zyo7xTlIxFn7FwHCzDx1h0qxHBwe1lLWf0-0cNIVQIBgIDgPRHjfA7LXQeHGLqv0-X8sI1MCbSxVnFFCvsP9mOCBqosqfYaAJgb8vlEDauK3MlmSELFSiwliUgCliG5lNgetBjJTcOcEkxJUdJdFT4cGfMB1U16VRDLUdVltz8sgsGhkVNYpmSKYLELAUwezWEIWhcLlKiiBUFgTAACNyEgU2gbTO7R3TQqxhCmE6o1yZGNqiIRjR0coos68rMOwHDp6NYrEsMw1MmDF+hcQtHtRHMFy5JG3vWgjg5zxEwnzyYYXmEZXBMx2TFCYFh3h93NYxlIgA */
    id: 'mi-ai',
    initial: "checkWorkspace",
    predictableActionArguments: true,
    context: {
        token: undefined,
        chatLog: [],
        errorCode: undefined,
        errorMessage: undefined,
    },
    on: {
        DISPOSE: {
            target: "checkWorkspace",
        }
    },
    states: {
        checkWorkspace: {
            invoke: {
                src: "checkWorkspaceSupport",
                onDone: [
                    {
                        cond: (context, event) => event.data === true,
                        target: "initialize",
                    }
                ],
                onError: [
                    {
                        target: 'notSupported',
                    },
                ]
            }
        },
        notSupported: {
            on: {
                RETRY: {
                    target: "checkWorkspace",
                },
                LOGOUT: "loggedOut",
            }
        },
        initialize: {
            invoke: {
                src: "checkToken",
                onDone: [
                    {
                        cond: (context, event) => event.data.token !== undefined, // Token is valid
                        target: "Ready",
                        actions: assign({
                            token: (context, event) => event.data.token,
                            userTokens: (context, event) => event.data.userToken
                        })
                    },
                    {
                        cond: (context, event) => event.data.token === undefined, // No token found
                        target: 'loggedOut'
                    }
                ],
                onError: [
                    {
                        cond: (context, event) => event.data.status === 404,
                        target: 'updateExtension',
                    },
                    {
                        target: 'disabled',
                        actions:
                            assign({
                                errorCode: (context, event) => event.data
                            })
                    }
                ]
            }
        },

        loggedOut: {
            on: {
                LOGIN: {
                    target: "WaitingForLogin",
                }
            }
        },

        Ready: {
            invoke: {
                src: 'getSuggestions',
                onDone: {
                    target: "Ready"
                },
                onError: {
                    target: "Ready",
                    actions: assign({
                        errorCode: (context, event) => event.data
                    })
                }
            },
            on: {
                LOGOUT: "loggedOut",
                EXECUTE: "Executing",
                CLEAR: {
                    target: "Ready",
                }
            }
        },

        disabled: {
            invoke: {
                src: 'disableExtension'
            },
            on: {
                RETRY: {
                    target: "initialize",
                },
                LOGOUT: "loggedOut",
            }
        },

        WaitingForLogin: {
            invoke: {
                src: 'openLogin',
                onError: {
                    target: "loggedOut",
                    actions: assign({
                        errorCode: (context, event) => event.data
                    })
                }
            },
            on: {
                SIGN_IN_SUCCESS: "Ready",
                CANCEL: "loggedOut",
                FAILIER: "loggedOut"
            }
        },

        Executing: {
            on: {
                COMPLETE: "Ready",
                ERROR: "Ready",
                STOP: "Ready",
                LOGEDOUT: "loggedOut"
            }
        },

        updateExtension: {
            on: {
                RETRY: {
                    target: "initialize",
                }
            }
        }
    }
}, {
    services: {
        checkToken: checkToken,
        openLogin: openLogin,
        checkWorkspaceSupport: checkWorkspaceSupport,
    }
});

async function checkWorkspaceSupport(context, event): Promise<boolean> {
    return new Promise((resolve, reject) => {
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 1) {
            reject();
        } else {
            resolve(true);
        }
    });
}

async function checkToken(context, event): Promise<UserToken> {
    return new Promise(async (resolve, reject) => {
        try {
            const token = await extension.context.secrets.get('MIAIUser');
            if (token) {
                const MI_COPILOT_BACKEND_V2 = process.env.MI_COPILOT_BACKEND_V2 as string;
                const url = MI_COPILOT_BACKEND_V2 + '/user/usage';
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });
                if (response.ok) {
                    const responseBody = await response.json() as AIUserTokens | undefined;
                    resolve({token, userToken: responseBody});
                } else {
                    if (response.status === 401 || response.status === 403) {
                        const newToken = await refreshAuthCode();
                        if (newToken !=""){
                            const tokenFetchResponse = await fetch(url, {
                                method: 'GET',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${newToken}`,
                                },
                            });
                            if(tokenFetchResponse.ok){
                                const responseBody = await tokenFetchResponse.json() as AIUserTokens | undefined;
                                resolve({token: newToken, userToken: responseBody});
                            }else{
                                console.log("Error: " + tokenFetchResponse.statusText);
                                console.log("Error Code: " + tokenFetchResponse.status);
                                throw new Error(`Error while checking token: ${tokenFetchResponse.statusText}`);
                            }
                        }else{
                            resolve({token: undefined, userToken: undefined});
                        }
                    }else if (response.status === 404){
                        throw { status: 404, message: 'Resource not found' };
                    }else{
                        console.log("Error: " + response.statusText);
                        console.log("Error Code: " + response.status);
                        throw new Error(`Error while checking token: ${response.statusText}`);
                    }
                }
            } else {
                resolve({ token: undefined, userToken: undefined });
            }
        } catch (error: any) {
            log(error.toString());
            reject(error);
        }
    });
}

async function openLogin(context, event) {
    return new Promise(async (resolve, reject) => {
        try {
            initiateInbuiltAuth();
        } catch (error) {
            reject(error);
        }
    });
}

async function initiateInbuiltAuth() {
    const callbackUri = await vscode.env.asExternalUri(
        vscode.Uri.parse(`${vscode.env.uriScheme}://wso2.micro-integrator/signin`)
    );
    const oauthURL = await getAuthUrl(callbackUri.toString());
    return vscode.env.openExternal(vscode.Uri.parse(oauthURL));
}

// Create a service to interpret the machine
export const aiStateService = interpret(aiStateMachine);

// Define your API as functions
export const StateMachineAI = {
    initialize: () => aiStateService.start(),
    service: () => { return aiStateService; },
    context: () => { return aiStateService.getSnapshot().context; },
    state: () => { return aiStateService.getSnapshot().value as AIMachineStateValue; },
    sendEvent: (eventType: AI_EVENT_TYPE) => { aiStateService.send({ type: eventType }); },
};

export function openAIWebview(initialPrompt?: PromptObject) {
    extension.initialPrompt = initialPrompt;
    if (!AiPanelWebview.currentPanel) {
        AiPanelWebview.currentPanel = new AiPanelWebview();
    } else {
        AiPanelWebview.currentPanel!.getWebview()?.reveal();
    }
}

export function navigateAIView(type: EVENT_TYPE, viewLocation?: AIVisualizerLocation) {
    aiStateService.send({ type: type, viewLocation: viewLocation });
}

async function checkAiStatus() {
    return new Promise((resolve, reject) => {
        // Check for AI API status
        resolve(true);
    });
}


