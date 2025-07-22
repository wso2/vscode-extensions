/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import { createMachine, assign, interpret } from "xstate";
import * as vscode from "vscode";
import { extension } from "./SIExtensionContext";
import {
    EVENT_TYPE,
    MACHINE_VIEW,
    MachineStateValue,
    VisualizerLocation,
    webviewReady,
} from "@wso2/si-core";
import { ExtendedLanguageClient } from "./core/ExtendedLanguageClient";
import { VisualizerWebview } from "./visualizer/webview";
import { RPCLayer } from "./RPCLayer";
import { debug, log } from "./utils/logger";
import { siExtensionInstance } from "./core/extension";
import { getSetupDetails } from "./utils/onboardingUtils";

interface MachineContext extends VisualizerLocation {
    langClient: ExtendedLanguageClient | null;
}

const stateMachine = createMachine<MachineContext>(
    {
        /** @xstate-layout N4IgpgJg5mDOIC5SwJYDoUDsUBcUEMAbFALzAGIIB7TMDTANyoGs6BjACzDeYFFGUAJxoBbMJhwBlMDgCuABwDaABgC6iUPKqo8NDSAAeiAEwBmAIxoArMoDsADju2AnABZlx28tMAaEAE9EV2NLW1dnZwdg2ytjK1MAXwS-VHpcAmIySho6LCZWNE5uPgFhTDEJaTklc3UkEC0dFD16owQQyxsHJzcPL18AxHtjNGcANmU3F3tTCNdzWySU9Cx0olIKMEFhQTR5QnwcADMqQRFCrh5+BiFRcSkZBRU6zW10ltA24xDrO0dbFzuTzePyBdpxNC2cyTVw2Sb2SJjJYgVKEWAASWwOGytHo+ToqIxWIQeSobEOzUwz2e+ka70w+jaY2MoMQ5nMEPsYyhrlMxgRVnMM2RhMxuHIWx2ewOx1O51FxNJ5N0VLUNPqdJVjMQsVZCHMplsI2U3LGsMNVisznsi2SKPQgjA+Ag-jQNzAAHcADJUZ1YKA43KMFgEh1Ol1ulCen1+zBQEnB5WU6lqWlvLWtIKuWyQoUxcKmCZQ4xjPUchZocxWMbmZz8rnKE1WEVh52u90egCq8ggh0ggbxIbQqUdbcjnu7vZwkATTCTNBTLwa6cp2oQrnsVjQxnGm4bE2U7lcerrW4iEVM9nm-MmxhbaFHEY7ACVw-5yAB5AAKvAAcgB9AA1dFeAAdXVV4mg+QwsxzKEbSsAsiw5UtBn1QtLDMXljGCQ0Nzie9H3bKMPVfNtyGfXgvy9ABBABhXggJA8DUw1FdoLaVxs1zBCkLsFCyxLVw0DGatayhRtwi4wi33HUi33IX8aOAgBxGiABVeAg5coIZTN124+D82cQt+JLMtlFraxulsQ0XEtEsZLHF8FIAMXRL1GN4AARdF1O0zVV30ri4LzRCTOQ8y0PZMYxhEsTxmcSzPFMZs7RHWSO14CB0jjcgfL8-9vI-X8tNYyD6TXcJnEhbx2WGa1wiNMsYsratjEbZxzFE9xbWWNBxBuMoKgeao5JjHK8uoXFSQKVJBtucp7iqBRxt9Sb4yVCkFzVcqdMq-Thhzc1a0mOYTXsPVXBrUZz3zeJggRe8FuG5bHnkOSyJdCjeFcyjJAACX-P9gOfEqAFk-38vbAo4kwLF+GzAT6EE0KsI1boiMIrC5dGzSSO1MCoCA4H0VA010tcAFpULBKmz3PRmmaNe9VjwdYyApg7PiCFk0c5aqAVMPDIjvdL0DRMUcC5jMeYQHH7GsRCxmcdHhc3Dw9XsTpG0srl5mu740v6oiZaCuWQlMNALDiOxha6q8Zi1y80GqyJlHRg1JkScWH0ykiJv9M24YQM04q69wJli7N4lptkSxzWtYjGQteWUTcnKfEjJz7CBg70uWw9GcxI5NM0YkLCyTW3STescDrvEz4jPS+sEKtlmD2hum2untoUNwGMEDTGRXrsmA1EN5IV7CbuTstyqB87XIuI5NMuY8r6Lus6I17G1hZDxZ32ctgfAACNCEgJf9O+ZRXdsUSR+rQ8IisMsmrQbWcMFPDsxNZ7Sh3EqO9a+ctLQ5n5F1DwsIuSeGcHqVKd9dbJRVnyVBAChpANGqtDsgc4ygM7hMLckDoTf1gS4K6hpXbnkcA9B+JkMGLRGitD6Lk2wELaKQuKZorzjF3unOsV0JiY3GCPEeFgcYEwSEAA */
        id: "si",
        initial: "initialize",
        predictableActionArguments: true,
        context: {
            langClient: null,
            errors: [],
            view: MACHINE_VIEW.Welcome,
        },
        states: {
            initialize: {
                invoke: {
                    id: "checkEnvironmentSetup",
                    src: checkIfEnvironmentSetup,
                    onDone: [
                        {
                            target: "environmentSetup",
                            cond: (_context, event) => !event.data.isEnvironmentSetup,
                        },
                        {
                            target: "lsInit",
                            cond: (context, event) => event.data.isEnvironmentSetup,
                        },
                    ],
                    onError: {
                        target: "disabled",
                        actions: assign({
                            errors: (context, event) => [
                                ...(context.errors || []),
                                ...(Array.isArray(event.data) ? event.data : [event.data]),
                            ],
                        }),
                    },
                },
            },
            lsInit: {
                invoke: {
                    src: "waitForLS",
                    onDone: [
                        {
                            target: "ready",
                            actions: assign({
                                langClient: (context, event) => event.data,
                            }),
                        },
                    ],
                    onError: {
                        target: "disabled",
                        actions: assign({
                            errors: (context, event) => [
                                ...(context.errors || []),
                                ...(Array.isArray(event.data) ? event.data : [event.data]),
                            ],
                        }),
                    },
                },
            },
            ready: {
                initial: "viewReady",
                states: {
                    viewLoading: {
                        invoke: {
                            src: "openWebPanel",
                            onDone: {
                                target: "viewReady",
                            },
                        },
                    },
                    viewReady: {
                        on: {
                            OPEN_VIEW: {
                                target: "viewLoading",
                                actions: assign({
                                    view: (context, event) => event.viewLocation.view,
                                }),
                            },
                        },
                    },
                },
            },
            disabled: {
                invoke: {
                    src: "disableExtension",
                },
            },
            environmentSetup: {
                initial: "viewLoading",
                states: {
                    viewLoading: {
                        invoke: [
                            {
                                src: "openWebPanel",
                                onDone: {
                                    target: "viewReady",
                                },
                            },
                        ],
                    },
                    viewReady: {
                        on: {
                            REFRESH_ENVIRONMENT: {
                                target: "#si.initialize",
                            },
                            OPEN_VIEW: {
                                target: "#si.ready.viewLoading",
                                actions: assign({
                                    view: (context, event) => event.viewLocation.view,
                                }),
                            },
                        },
                    },
                },
            },
        },
    },
    {
        services: {
            waitForLS: (context, event) => {
                return new Promise(async (resolve, reject) => {
                    debug("Waiting for LS to be ready " + new Date().toLocaleTimeString());
                    let statusBarItem: vscode.StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
                    statusBarItem.text = "$(sync~spin) Initializing WSO2 Integrator: SI Language Server...";
                    statusBarItem.show();
                    try {
                        siExtensionInstance.init().catch((exception) => {
                            return reject(
                                "Failed to activate Siddhi extension. " +
                                    (exception.message ? exception.message : exception)
                            );
                        });
                        resolve(siExtensionInstance.langClient);
                        debug("LS is ready " + new Date().toLocaleTimeString());
                    } catch (error) {
                        log("Error occured while waiting for LS to be ready " + new Date().toLocaleTimeString());
                        reject(error);
                    } finally {
                        statusBarItem.hide();
                        statusBarItem.dispose();
                    }
                });
            },
            openWebPanel: (context, event) => {
                return new Promise(async (resolve, reject) => {
                    if (!VisualizerWebview.currentPanel) {
                        VisualizerWebview.currentPanel = new VisualizerWebview(context.view!, extension.webviewReveal);
                        RPCLayer._messenger.onNotification(webviewReady, () => {
                            resolve(true);
                        });
                    } else {
                        const webview = VisualizerWebview.currentPanel!.getWebview();
                        webview?.reveal(vscode.ViewColumn.Active);

                        const start = Date.now();
                        while (!webview?.visible && Date.now() - start < 5000) {
                            await new Promise((resolve) => setTimeout(resolve, 10));
                        }
                        resolve(true);
                    }
                });
            },
            disableExtension: (context, event) => {
                return new Promise(async (resolve, reject) => {
                    vscode.commands.executeCommand("setContext", "SI.status", "disabled");
                    if (context.errors) {
                        vscode.window
                            .showErrorMessage(
                                `WSO2 Integrator: SI \n ${context.errors.map((error) => error.message).join("\n")}`,
                                "Reload Window"
                            )
                            .then((selection) => {
                                if (selection === "Reload Window") {
                                    vscode.commands.executeCommand("workbench.action.reloadWindow");
                                }
                            });
                    }

                    resolve(true);
                });
            },
        },
    }
);

async function checkIfEnvironmentSetup() {
    let setupDetails = await getSetupDetails();
    return {
        isEnvironmentSetup: setupDetails.siDetails.status === "valid" && setupDetails.javaDetails.status === "valid",
    };
}

export const stateService = interpret(stateMachine);

export const StateMachine = {
    initialize: () => stateService.start(),
    service: () => {
        return stateService;
    },
    context: () => {
        return stateService.getSnapshot().context;
    },
    state: () => {
        return stateService.getSnapshot().value as MachineStateValue;
    },
    sendEvent: (eventType: EVENT_TYPE) => {
        stateService.send({ type: eventType });
    },
};

export function openView(type: EVENT_TYPE, viewLocation?: VisualizerLocation) {
    let c = stateService.getSnapshot().value;
    stateService.send({ type: type, viewLocation: viewLocation });
}
