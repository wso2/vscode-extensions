/* eslint-disable @typescript-eslint/naming-convention */
import { createMachine, assign, interpret } from 'xstate';
import * as vscode from 'vscode';
import { Uri, ViewColumn } from 'vscode';
import { extension } from './APIDesignerExtensionContext';
import {
    EVENT_TYPE,
    HistoryEntry,
    MACHINE_VIEW,
    MachineStateValue,
    VisualizerLocation,
    webviewReady
} from '@wso2/api-designer-core';
import { VisualizerWebview } from './visualizer/webview';
import { RPCLayer } from './RPCLayer';
import { history } from './history/activator';
import { COMMANDS } from './constants';
import { activateProjectExplorer } from './project-explorer/activate';
import { StateMachinePopup } from './stateMachinePopup';
import { fileURLToPath } from 'url';
import path = require('path');

interface MachineContext extends VisualizerLocation {
    error?: any | null;
}

const stateMachine = createMachine<MachineContext>({
    /** @xstate-layout N4IgpgJg5mDOIC5QFsCWA6VA7VAXVAhgDaoBeYAxBAPZZiZYBu1A1vQMYAWY7LACgCdqAKx64A2gAYAuolAAHarDypackAA9EAJm0A2dJICs2yQE49k7QEYT1vXoA0IAJ469ADnTWPAdiOSDkY+gX4AvmHOaAwqxGSUNHQMzGzoXDz8QqLsEtaySCCKyvhqBVoINgbGphZWtpVOrojW-uhGetomehYWHtpmRhFRGNixJORUtPTYKRzcvIIiYuLa+QpKKqWg5aZVJuaWNnYOzm4IfehmAMy+ACz+vleS1mbaV9pDINGj+HETidMmKw5hlFtkJFc1oUNiUsOodlc9jVDvV7I0zlcBug7k9btdfHpbHjPt8cL9xgkpslgWl5pkljlxLcoUVNnCyjpbkiDnVjujEITtOgPCKRf1Xo9jCSRmTCBSKGABEIBOh5EQCLgAGbUATIWmgrLLGTqVmw+GIEynZoedroLmPW67PoEjzStK0Og5HUASTJkySMxp0XYHrEPrJCED7A1qiwUmk8ZNMNj5oQvjMt0Mt3svg8xl8L35FSMV28RjMjxMHgs7w8ejd8kNOQAImBcGJIP7AbN0NFGwzcK32zlIJGgdHYfHEwVTSmOQgOlaEPYWpc9I8M9ZbpJbqK3dQiBAwWIhx2IF3qalogej03B22z2PmBPY1PjTPk1tNIhfNol7ZfEkO112zHcrm3FpfDdIhYF9PAL0DK8MBguDcCfagX1oN8WU-dltkQe4jGxQCPExDxbluTEzGsf8iXQJ4jBLSwAj0K4Xmg2C-QBS96GiFCIyjGMsJkcQ8iTYo53whAuSI3wSLIiiqJoppl0Cax0E8Yx2kRG1JFdSIvmQzj4MVZVVXVLUdT1PjjLQwTJxE991gkr9ykI4i9IUyizGo-9CQMbo9BLEtAiMPo3QEMACAgFx0AIHJUEYDUwAAeVwbgBAAMSi3AAFdItgBCgSQ9BIui2L4vwJL2zSjLso1fK4HQzC40cnCXLw79VOubxbjCm4rhFDpJF8f9fy8UijD68jrCsfRBgM6Iypi9BGFQMAAHcABlqGi7AoCKnslqila1s2na9qwKBmqE1qEyc6EOtTWwOmFPRpu0G08QGUaVPsIxfHQbRfwzbcnjzFoIpO2Kzo2zLsAgfbDqDDBlph9a4YR-aboc+72rZZ6My8V5uhuEUKxuIw-PA7FZsdDxbERK4rgW4ZSuh1aMYAZVweKWCR7jEN41GOdhnm+ex+zXza8SCfnN4bDtewKLkl5Qb8gGgZBijJHB54oMWkXys5zaAFV5AgZLz0F4rhfZ43YfNy32wgHHpbx2WzXnFpWOFZmXkkQOt06P8-sU4DdfA9MOlJqGHYxgA5Ag1qgK3kZKtGTY2pOU6tt3hI9j8nvl951Ozd77gLHyKP-d4hW8rkgjCkw49OjGACVoYoFK+AAUQTgB9AA1b1e4AdWnZy5ak2aeq3frHiG0xfrOexmaB2abgeaj3tZwz7bbzbO-Kih297vgtoAQQAYV74fR4nh7Z1c5pzFLefSMXutl--EtAeb-oIEGZWH0mzTOsNj4xQoAnS+I8ADil8AAqvdJ6PWnl1We79poDSXiNf8FF1K1BZiHIK5Y97HXjkfLumVvRbTvr3Zs3pEGoOfp1comDeoL0Gt-PBf1TBAR8BmQk9xtykWsK3dGm1e6I3wFdCgDCmED2bClBOKCn64Wei8UsZhqxBXXBWOs1hQ6ry3GYDS1ZsxvApgDchGA6AbWPDkLOF1EZyJtkdOxm1HG4GcbtVx10pYFxYRo+cDN1KWEdC0AYg0WYrx-FYei9wbAZmop9DMbp7HeKzpAlw3c+6DxHuPYJxcpLfzaGxYGgR9C2GuEuSwBhfy6FmjYfwoMIgGSwNQCAcB1BoE9pJLqABaIswzDCB3GRMoOW43Q-DlPEfpL9pLGJ-LoNo1hMSfReFNVitw3QhiwJ6XA4Y8ALLYRaN4Gl54+WIdYZWS5OjqW4dROm2ZfwswbHeU8I4ICnOejueu9xqIUUdGFe5wR6Lk1uTuV5bxbHoBvN4r5LtfnzmCKWYR5Zrh2DuSpBm3gHDrlmoHLemIOKoRRVJYGQpej+CsISNeyzlzlnReBYwEFczMQkRSrqjwDCYjCv0Fo-RcweH-FUtougGb9CmuBBwEi4oJWqqldKip6p5QKty8ouZMz8r6NREGIqxo7jaHUHwn1WmgP3uAjGLj9qauaMzMxfgAgMyjqYq41NqWYksJiPSLR3jythvDLA-j7XLgJKWUibEzDjODpaP6rEvVEJjQzR4HxDYH0kRtcWvA7VF3QTsW5hCfLkXAv1KanrLjet1im-16awGiwxk7K2YaXpeCeKYIxu5tzbPwdmcxAxZqMT0npS1FDD7Z2TqgVOyL81e0pcEPlFcTA2EpoyrcFFvDVmCFpEdIpA0d2hmG6sgNA79D6l29ZBJaKvTrHmZ4LNmZsQPVImReap7zowY64UtLXX3HdbRMKWtgYlmos8PqbpEawAIAAIyIJAMNu8N5+FzKYci5Fbj-lImYhwfguRckCCCjJXi7xhuCpcvqjx-adFBSpYIZjGKMQ2UK+wY7PEOLvL4y6UAyOkQowDJ9RjGKipUoSJ1Qm2U7OBsRjjA5slHrnQM9hzwhQAzSc8Ewry6k3DenmKa5YCwvANhEIAA */
    id: 'api-designer',
    initial: 'ready',
    predictableActionArguments: true,
    context: {
        errors: [],
        view: MACHINE_VIEW.Welcome
    },
    states: {
        ready: {
            initial: 'activateProjectExplorer',
            states: {
                activateProjectExplorer: {
                    invoke: {
                        src: 'activateProjectExplorer',
                        onDone: {
                            target: 'viewReady'
                        }
                    }
                },
                viewReady: {
                    on: {
                        OPEN_VIEW: {
                            target: "viewLoading",
                            actions: assign({
                                view: (context, event) => event.viewLocation.view,
                                identifier: (context, event) => event.viewLocation.identifier,
                                documentUri: (context, event) => event.viewLocation.documentUri,
                                projectUri: (context, event) => event.viewLocation.projectUri,
                                position: (context, event) => event.viewLocation.position
                            })
                        },
                        NAVIGATE: {
                            target: "viewUpdated"
                        }
                    }
                },
                viewLoading: {
                    invoke: {
                        src: 'openWebPanel',
                        onDone: {
                            target: 'viewFinding'
                        }
                    }
                },
                viewFinding: {
                    invoke: {
                        src: 'findView',
                        onDone: {
                            target: 'viewStacking',
                            actions: assign({
                                view: (context, event) => event.data.view
                            })
                        }
                    }
                },
                viewStacking: {
                    invoke: {
                        src: 'updateStack',
                        onDone: {
                            target: "viewNavigated"
                        }
                    }
                },
                viewUpdated: {
                    invoke: {
                        src: 'findView',
                        onDone: {
                            target: "viewNavigated",
                            actions: assign({
                            })
                        }
                    }
                },
                viewNavigated: {
                    invoke: {
                        src: 'updateAIView',
                        onDone: {
                            target: "viewReady"
                        }
                    }
                },
                viewEditing: {
                    on: {
                        EDIT_DONE: {
                            target: "viewReady"
                        }
                    }
                },
            }
        },
        disabled: {
            invoke: {
                src: 'disableExtension',
            },
        },
        newProject: {
            initial: "viewLoading",
            states: {
                viewLoading: {
                    invoke: {
                        src: 'openWebPanel',
                        onDone: {
                            target: 'viewReady'
                        }
                    }
                },
                viewReady: {
                    on: {
                        OPEN_VIEW: {
                            target: "viewLoading",
                            actions: assign({
                                view: (context, event) => event.viewLocation.view
                            })
                        }
                    }
                }
            }
        }
    }
}, {
    guards: {

    },
    services: {
        openWebPanel: (context, event) => {
            // Get context values from the project storage so that we can restore the earlier state when user reopens vscode
            return new Promise((resolve, reject) => {
                if (!VisualizerWebview.currentPanel) {
                    VisualizerWebview.currentPanel = new VisualizerWebview(extension.webviewReveal);
                    RPCLayer._messenger.onNotification(webviewReady, () => {
                        resolve(true);
                    });
                } else {
                    VisualizerWebview.currentPanel!.getWebview()?.reveal(ViewColumn.Active);
                    vscode.commands.executeCommand('setContext', 'isViewOpenAPI', true);
                    resolve(true);
                }
            });
        },
        findView: (context, event): Promise<VisualizerLocation> => {
            return new Promise(async (resolve, reject) => {
                const viewLocation = context;
                updateProjectExplorer(viewLocation);
                resolve(viewLocation);
            });
        },
        updateStack: (context, event) => {
            return new Promise(async (resolve, reject) => {
                if (event.data.type === EVENT_TYPE.REPLACE_VIEW) {
                    history.pop();
                }

                history.push({
                    location: {
                        view: context.view,
                        documentUri: context.documentUri,
                        position: context.position,
                        identifier: context.identifier
                    }
                });

                StateMachinePopup.resetState();
                resolve(true);
            });
        },
        updateAIView: () => {
            return new Promise(async (resolve, reject) => {
                resolve(true);
            });
        },
        activateProjectExplorer: (context, event) => {
            return new Promise(async (resolve, reject) => {
                // await activateProjectExplorer(extension.context);
                resolve(true);
            });
        },
        disableExtension: (context, event) => {
            return new Promise(async (resolve, reject) => {
                vscode.commands.executeCommand('setContext', 'APIDesigner.status', 'disabled');
                updateProjectExplorer(context);
                resolve(true);
            });
        }
    }
});


// Create a service to interpret the machine
export const stateService = interpret(stateMachine);

// Define your API as functions
export const StateMachine = {
    initialize: () => stateService.start(),
    service: () => { return stateService; },
    context: () => { return stateService.getSnapshot().context; },
    state: () => { return stateService.getSnapshot().value as MachineStateValue; },
    sendEvent: (eventType: EVENT_TYPE) => { stateService.send({ type: eventType }); },
};

export function openView(type: EVENT_TYPE, viewLocation?: VisualizerLocation) {
    if (!viewLocation?.projectUri && vscode.workspace.workspaceFolders) {
        viewLocation!.projectUri = vscode.workspace.workspaceFolders![0].uri.fsPath;
    }
    updateProjectExplorer(viewLocation);
    stateService.send({ type: type, viewLocation: viewLocation });
}

export function navigate(entry?: HistoryEntry) {
    const historyStack = history.get();
    if (historyStack.length === 0) {
        if (entry) {
            history.push({ location: entry.location });
            stateService.send({ type: "NAVIGATE", viewLocation: entry!.location });
        } else {
            history.push({ location: { view: MACHINE_VIEW.Welcome } });
            stateService.send({ type: "NAVIGATE", viewLocation: { view: MACHINE_VIEW.Welcome } });
        }
    } else {
        const location = historyStack[historyStack.length - 1].location;
        stateService.send({ type: "NAVIGATE", viewLocation: location });
    }
}

function updateProjectExplorer(location: VisualizerLocation | undefined) {
    const webview = VisualizerWebview.currentPanel?.getWebview();
    if (webview) {
        if (location && location.view) {
            webview.title = location.view;
        }
    }
}
