/* eslint-disable @typescript-eslint/naming-convention */
import { createMachine, assign, interpret } from 'xstate';
import * as vscode from 'vscode';
import { Uri, ViewColumn } from 'vscode';
import { MILanguageClient } from './lang-client/activator';
import { extension } from './MIExtensionContext';
import {
    DM_FUNCTION_NAME,
    EVENT_TYPE,
    HistoryEntry,
    MACHINE_VIEW,
    MachineStateValue,
    SyntaxTreeMi,
    VisualizerLocation,
    webviewReady
} from '@wso2/mi-core';
import { ExtendedLanguageClient } from './lang-client/ExtendedLanguageClient';
import { VisualizerWebview, webviews } from './visualizer/webview';
import { RPCLayer } from './RPCLayer';
import { history } from './history/activator';
import { COMMANDS } from './constants';
import { activateProjectExplorer } from './project-explorer/activate';
import { MockService, STNode, UnitTest, Task, InboundEndpoint } from '../../syntax-tree/lib/src';
import { log } from './util/logger';
import { deriveConfigName, getSources } from './util/dataMapper';
import { fileURLToPath } from 'url';
import path = require('path');
import { activateTestExplorer } from './test-explorer/activator';
import { DMProject } from './datamapper/DMProject';
import { setupEnvironment } from './util/onboardingUtils';
import { getPopupStateMachine } from './stateMachinePopup';
import { askForProject } from './util/workspace';
const fs = require('fs');

interface MachineContext extends VisualizerLocation {
    langClient: ExtendedLanguageClient | null;
}

const stateMachine = createMachine<MachineContext>({
    /** @xstate-layout N4IgpgJg5mDOIC5QFsCWA6VA7VAXVAhgDaoBeYAxBAPZZiZYBu1A1vQMYAWY7LACgCdqAKx64A2gAYAuolAAHarDypackAA9EAJm0A2dJICs2yQE49k7QEYT1vXoA0IAJ469ADnTWPAdiOSDkY+gX4AvmHOaAwqxGSUNHQMzGzoXDz8QqLsEtaySCCKyvhqBVoINgbGphZWtpVOrojW-uhGetomehYWHtpmRhFRGNixJORUtPTYKRzcvIIiYuLa+QpKKqWg5aZVJuaWNnYOzm4IfehmAMy+ACz+vleS1mbaV9pDINGj+HETidMmKw5hlFtkJFc1oUNiUsOodlc9jVDvV7I0zlcBug7k9btdfHpbHjPt8cL9xgkpslgWl5pkljlxLcoUVNnCyjpbkiDnVjujEITtOgPCKRf1Xo9jCSRmTCBSKGABEIBOh5EQCLgAGbUATIWmgrLLGTqVmw+GIEynZoedroLmPW67PoEjzStK0Og5HUASTJkySMxp0XYHrEPrJCED7A1qiwUmk8ZNMNj5oQvjMt0Mt3svg8xl8L35FSMV28RjMjxMHgs7w8ejd8kNOQAImBcGJIP7AbN0NFGwzcK32zlIJGgdHYfHEwVTSmOQgOlaEPYWpc9I8M9ZbpJbqK3dQiBAwWIhx2IF3qalogej03B22z2PmBPY1PjTPk1tNIhfNol7ZfEkO112zHcrm3FpfDdIhYF9PAL0DK8MBguDcCfagX1oN8WU-dltkQe4jGxQCPExDxbluTEzGsf8iXQJ4jBLSwAj0K4Xmg2C-QBS96GiFCIyjGMsJkcQ8iTYo53whAuSI3wSLIiiqJoppl0Cax0E8Yx2kRG1JFdSIvmQzj4MVZVVXVLUdT1PjjLQwTJxE991gkr9ykI4i9IUyizGo-9CQMbo9BLEtAiMPo3QEMACAgFx0AIHJUEYDUwAAeVwbgBAAMSi3AAFdItgBCgSQ9BIui2L4vwJL2zSjLso1fK4HQzC40cnCXLw79VOubxbjCm4rhFDpJF8f9fy8UijD68jrCsfRBgM6Iypi9BGFQMAAHcABlqGi7AoCKnslqila1s2na9qwKBmqE1qEyc6EOtTWwOmFPRpu0G08QGUaVPsIxfHQbRfwzbcnjzFoIpO2Kzo2zLsAgfbDqDDBlph9a4YR-aboc+72rZZ6My8V5uhuEUKxuIw-PA7FZsdDxbERK4rgW4ZSuh1aMYAZVweKWCR7jEN41GOdhnm+ex+zXza8SCfnN4bDtewKLkl5Qb8gGgZBijJHB54oMWkXys5zaAFV5AgZLz0F4rhfZ43YfNy32wgHHpbx2WzXnFpWOFZmXkkQOt06P8-sU4DdfA9MOlJqGHYxgA5Ag1qgK3kZKtGTY2pOU6tt3hI9j8nvl951Ozd77gLHyKP-d4hW8rkgjCkw49OjGACVoYoFK+AAUQTgB9AA1b1e4AdWnZy5ak2aeq3frHiG0xfrOexmaB2abgeaj3tZwz7bbzbO-Kih297vgtoAQQAYV74fR4nh7Z1c5pzFLefSMXutl--EtAeb-oIEGZWH0mzTOsNj4xQoAnS+I8ADil8AAqvdJ6PWnl1We79poDSXiNf8FF1K1BZiHIK5Y97HXjkfLumVvRbTvr3Zs3pEGoOfp1comDeoL0Gt-PBf1TBAR8BmQk9xtykWsK3dGm1e6I3wFdCgDCmED2bClBOKCn64Wei8UsZhqxBXXBWOs1hQ6ry3GYDS1ZsxvApgDchGA6AbWPDkLOF1EZyJtkdOxm1HG4GcbtVx10pYFxYRo+cDN1KWEdC0AYg0WYrx-FYei9wbAZmop9DMbp7HeKzpAlw3c+6DxHuPYJxcpLfzaGxYGgR9C2GuEuSwBhfy6FmjYfwoMIgGSwNQCAcB1BoE9pJLqABaIswzDCB3GRMoOW43Q-DlPEfpL9pLGJ-LoNo1hMSfReFNVitw3QhiwJ6XA4Y8ALLYRaN4Gl54+WIdYZWS5OjqW4dROm2ZfwswbHeU8I4ICnOejueu9xqIUUdGFe5wR6Lk1uTuV5bxbHoBvN4r5LtfnzmCKWYR5Zrh2DuSpBm3gHDrlmoHLemIOKoRRVJYGQpej+CsISNeyzlzlnReBYwEFczMQkRSrqjwDCYjCv0Fo-RcweH-FUtougGb9CmuBBwEi4oJWqqldKip6p5QKty8ouZMz8r6NREGIqxo7jaHUHwn1WmgP3uAjGLj9qauaMzMxfgAgMyjqYq41NqWYksJiPSLR3jythvDLA-j7XLgJKWUibEzDjODpaP6rEvVEJjQzR4HxDYH0kRtcWvA7VF3QTsW5hCfLkXAv1KanrLjet1im-16awGiwxk7K2YaXpeCeKYIxu5tzbPwdmcxAxZqMT0npS1FDD7Z2TqgVOyL81e0pcEPlFcTA2EpoyrcFFvDVmCFpEdIpA0d2hmG6sgNA79D6l29ZBJaKvTrHmZ4LNmZsQPVImReap7zowY64UtLXX3HdbRMKWtgYlmos8PqbpEawAIAAIyIJAMNu8N5+FzKYci5Fbj-lImYhwfguRckCCCjJXi7xhuCpcvqjx-adFBSpYIZjGKMQ2UK+wY7PEOLvL4y6UAyOkQowDJ9RjGKipUoSJ1Qm2U7OBsRjjA5slHrnQM9hzwhQAzSc8Ewry6k3DenmKa5YCwvANhEIAA */
    id: 'mi',
    initial: 'initialize',
    predictableActionArguments: true,
    context: {
        projectUri: "",
        langClient: null,
        errors: [],
        view: MACHINE_VIEW.Welcome
    },
    states: {
        initialize: {
            invoke: {
                id: 'checkProject',
                src: (context) => checkIfMiProject(context.projectUri),
                onDone: [
                    {
                        target: 'environmentSetup',
                        cond: (context, event) => (event.data.isProject === true || event.data.isOldProject === true) && event.data.isEnvironmentSetUp === false,
                        actions: assign({
                            view: (context, event) => MACHINE_VIEW.SETUP_ENVIRONMENT
                        })
                    },
                    {
                        target: 'oldProjectDetected',
                        cond: (context, event) =>
                            // Assuming true means old project detected
                            event.data.isOldProject === true && event.data.displayOverview === true,
                        actions: assign({
                            view: (context, event) => MACHINE_VIEW.UnsupportedProject,
                            projectUri: (context, event) => event.data.projectUri,
                            isOldProject: (context, event) => true,
                            displayOverview: (context, event) => true,
                        })
                    },
                    {
                        target: 'lsInit',
                        cond: (context, event) =>
                            event.data.isOldProject || event.data.isProject,
                        actions: assign({
                            view: (context, event) => event.data.view,
                            customProps: (context, event) => event.data.customProps,
                            projectUri: (context, event) => event.data.projectUri,
                            isOldProject: (context, event) => event.data.isOldProject,
                            displayOverview: (context, event) => event.data.displayOverview
                        })
                    },
                    {
                        target: 'newProject',
                        // Assuming false means new project
                        cond: (context, event) => event.data.isProject === false && event.data.isOldProject === false,
                        actions: assign({
                            view: (context, event) => MACHINE_VIEW.Welcome
                        })
                    }
                    // No need for an explicit action for the false case unless you want to assign something specific
                ],
                onError: {
                    target: 'disabled',
                    actions: assign({
                        view: (context, event) => MACHINE_VIEW.Disabled,
                        errors: (context, event) => event.data
                    })
                }
            }
        },
        projectDetected: {
            invoke: {
                src: 'openWebPanel',
                onDone: {
                    target: 'lsInit'
                }
            }
        },
        oldProjectDetected: {
            invoke: {
                src: 'openWebPanel',
                onDone: {
                    target: 'lsInit'
                }
            }
        },
        lsInit: {
            invoke: {
                src: 'waitForLS',
                onDone: [
                    {
                        target: 'ready',
                        cond: (context, event) => context.displayOverview === true,
                        actions: assign({
                            langClient: (context, event) => event.data
                        })
                    },
                    {
                        target: 'ready.viewReady',
                        cond: (context, event) => context.displayOverview === false,
                        actions: assign({
                            langClient: (context, event) => event.data
                        })
                    }
                ],
                onError: {
                    target: 'disabled',
                    actions: assign({
                        view: (context, event) => MACHINE_VIEW.Disabled,
                        errors: (context, event) => event.data
                    })
                }
            }
        },
        ready: {
            initial: 'activateOtherFeatures',
            states: {
                activateOtherFeatures: {
                    invoke: {
                        src: 'activateOtherFeatures',
                        onDone: {
                            target: 'viewLoading'
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
                                view: (context, event) => event.data.view,
                                stNode: (context, event) => event.data.stNode,
                                diagnostics: (context, event) => event.data.diagnostics,
                                dataMapperProps: (context, event) => event.data?.dataMapperProps
                            })
                        }
                    }
                },
                viewStacking: {
                    invoke: {
                        src: 'updateStack',
                        onDone: {
                            target: "viewReady"
                        }
                    }
                },
                viewUpdated: {
                    invoke: {
                        src: 'findView',
                        onDone: {
                            target: "viewReady",
                            actions: assign({
                                stNode: (context, event) => event.data.stNode,
                                diagnostics: (context, event) => event.data.diagnostics,
                                dataMapperProps: (context, event) => event.data?.dataMapperProps
                            })
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
                                projectUri: (context, event) => context.projectUri,
                                position: (context, event) => event.viewLocation.position,
                                projectOpened: (context, event) => true,
                                customProps: (context, event) => event.viewLocation.customProps,
                                dataMapperProps: (context, event) => event.viewLocation.dataMapperProps,
                                stNode: (context, event) => undefined,
                                diagnostics: (context, event) => undefined,
                                type: (context, event) => event.type,
                                previousContext: (context, event) => context
                            })
                        },
                        REPLACE_VIEW: {
                            target: "viewLoading",
                            actions: assign({
                                view: (context, event) => event.viewLocation.view,
                                identifier: (context, event) => event.viewLocation.identifier,
                                documentUri: (context, event) => event.viewLocation.documentUri,
                                projectUri: (context, event) => event.viewLocation.projectUri,
                                position: (context, event) => event.viewLocation.position,
                                projectOpened: (context, event) => true,
                                customProps: (context, event) => event.viewLocation.customProps,
                                dataMapperProps: (context, event) => event.viewLocation.dataMapperProps,
                                stNode: (context, event) => undefined,
                                diagnostics: (context, event) => undefined,
                                type: (context, event) => event.type
                            })
                        },
                        NAVIGATE: {
                            target: "viewUpdated",
                            actions: assign({
                                view: (context, event) => event.viewLocation.view,
                                identifier: (context, event) => event.viewLocation.identifier,
                                documentUri: (context, event) => event.viewLocation.documentUri,
                                position: (context, event) => event.viewLocation.position,
                                projectOpened: (context, event) => true,
                                customProps: (context, event) => event.viewLocation.customProps,
                                dataMapperProps: (context, event) => event.viewLocation.dataMapperProps
                            })
                        }
                    }
                }
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
                        data: (context, event) => ({ context, event, setTitle: true }),
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
        },
        environmentSetup: {
            initial: "viewLoading",
            states: {
                viewLoading: {
                    invoke: [
                        {
                            src: 'openWebPanel',
                            onDone: {
                                target: 'viewReady'
                            }
                        },
                        {
                            src: 'focusProjectExplorer',
                            onDone: {
                                target: 'viewReady'
                            }
                        }
                    ]
                },
                viewReady: {
                    on: {
                        REFRESH_ENVIRONMENT: {
                            target: '#mi.initialize'
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
        waitForLS: (context, event) => {
            // replace this with actual promise that waits for LS to be ready
            return new Promise(async (resolve, reject) => {
                log("Waiting for LS to be ready " + new Date().toLocaleTimeString());
                try {
                    vscode.commands.executeCommand(COMMANDS.FOCUS_PROJECT_EXPLORER);
                    const instance = await MILanguageClient.getInstance(context.projectUri!);
                    const errors = instance.getErrors();
                    if (errors.length) {
                        return reject(errors);
                    }
                    const ls = instance.languageClient;
                    vscode.commands.executeCommand('setContext', 'MI.status', 'projectLoaded');

                    resolve(ls);
                    log("LS is ready " + new Date().toLocaleTimeString());
                } catch (error) {
                    log("Error occured while waiting for LS to be ready " + new Date().toLocaleTimeString());
                    reject(error);
                }
            });
        },
        openWebPanel: (context, event, setTitle) => {
            // Get context values from the project storage so that we can restore the earlier state when user reopens vscode
            return new Promise(async (resolve, reject) => {
                if (!context?.projectUri) {
                    return reject(new Error("Project URI is not defined"));
                }
                if (!webviews.has(context.projectUri)) {
                    const panel = new VisualizerWebview(context.view!, context.projectUri, extension.webviewReveal);
                    webviews.set(context.projectUri!, panel);

                    const messenger = RPCLayer._messengers.get(context.projectUri);
                    if (messenger) {
                        messenger.onNotification(webviewReady, () => {
                            resolve(true);
                        });
                    }
                } else {
                    const webview = webviews.get(context.projectUri)?.getWebview();
                    if (webview) {
                        webview.reveal(ViewColumn.Active);

                        // wait until webview is ready
                        const start = Date.now();
                        while (!webview.visible && Date.now() - start < 5000) {
                            await new Promise(resolve => setTimeout(resolve, 10));
                        }
                        if (setTitle) {
                            const workspaces = vscode.workspace.workspaceFolders;
                            const projectName = workspaces && workspaces.length > 1 ? path.basename(context.projectUri!) : '';
                            webview.title = projectName ? `${context.view} - ${projectName}` : context.view!;
                        }
                    }
                    resolve(true);
                }
            });
        },
        findView: (context, event): Promise<VisualizerLocation> => {
            return new Promise(async (resolve, reject) => {
                const langClient = context.langClient!;
                const viewLocation = context;

                if (context.view?.includes("Form") && !context.view.includes("Test") && !context.view.includes("Mock")) {
                    return resolve(viewLocation);
                }
                if (context.view === MACHINE_VIEW.DataMapperView) {
                    if (context.documentUri) {
                        const filePath = context.documentUri;
                        const functionName = DM_FUNCTION_NAME;
                        DMProject.refreshProject(filePath);
                        const [fileContent, nonMappingFileContent] = getSources(filePath, functionName);
                        viewLocation.dataMapperProps = {
                            filePath: filePath,
                            functionName: functionName,
                            fileContent: fileContent,
                            nonMappingFileContent: nonMappingFileContent,
                            configName: deriveConfigName(filePath)
                        };
                        viewLocation.view = MACHINE_VIEW.DataMapperView;
                    }
                    return resolve(viewLocation);
                }
                if (context.documentUri) {
                    try {
                        let retryCount = 0;
                        const maxRetries = 3;
                        let response;

                        while (retryCount < maxRetries) {
                            try {
                                response = await langClient.getSyntaxTree({
                                    documentIdentifier: {
                                        uri: context.documentUri!
                                    },
                                });
                                if (response?.syntaxTree) {
                                    break;
                                }
                                await new Promise(resolve => setTimeout(resolve, 200));
                                retryCount++;
                            } catch (error) {
                                retryCount++;
                                console.log(`Attempt ${retryCount} failed to get syntax tree:`, error);
                                if (retryCount >= maxRetries) {
                                    console.error(`Failed to get syntax tree after ${maxRetries} attempts:`, error);
                                    throw error;
                                }
                                // Wait before retrying
                                await new Promise(resolve => setTimeout(resolve, 500));
                            }
                        }

                        if (response?.syntaxTree) {
                            const node: SyntaxTreeMi = response.syntaxTree;
                            switch (true) {
                                case !!node.api:
                                    viewLocation.view = MACHINE_VIEW.ServiceDesigner;
                                    viewLocation.stNode = node.api;
                                    if (context.identifier?.toString()) {
                                        viewLocation.view = MACHINE_VIEW.ResourceView;
                                        viewLocation.stNode = node.api.resource[context.identifier];
                                    }
                                    break;
                                case !!node.proxy:
                                    viewLocation.view = MACHINE_VIEW.ProxyView;
                                    viewLocation.stNode = node.proxy;
                                    break;
                                case !!node.sequence:
                                    viewLocation.view = MACHINE_VIEW.SequenceView;
                                    viewLocation.stNode = node.sequence;
                                    break;
                                case !!node.data_mapper:
                                    viewLocation.view = MACHINE_VIEW.DataMapperView;
                                    viewLocation.stNode = node.data_mapper;
                                    break;
                                case !!node.template:
                                    if (node.template.sequence) {
                                        viewLocation.view = MACHINE_VIEW.SequenceTemplateView;
                                        viewLocation.stNode = node.template;
                                        break;
                                    }
                                case !!node.task:
                                    // we need to enrich Task with the sequence model
                                    const task: Task = node.task as Task;
                                    viewLocation.view = MACHINE_VIEW.TaskView;
                                    const sequenceName = task.property.find((p) => { return p.name === 'sequenceName' })?.value
                                    const sequencePath = await langClient.getSequencePath(sequenceName ? sequenceName : "");
                                    if (sequencePath) {
                                        const sequence = await langClient.getSyntaxTree({ documentIdentifier: { uri: sequencePath } });
                                        task.sequence = sequence.syntaxTree.sequence;
                                        task.sequenceURI = sequencePath;
                                    }
                                    viewLocation.stNode = task;
                                    break;
                                case !!node["unit-test"]:
                                    if (viewLocation.view !== MACHINE_VIEW.TestCase) {
                                        viewLocation.view = MACHINE_VIEW.TestSuite;
                                    }
                                    viewLocation.stNode = node["unit-test"] as UnitTest;
                                    break;
                                case !!node["mock-service"]:
                                    viewLocation.stNode = node["mock-service"] as MockService;
                                    break;
                                case !!node.inboundEndpoint:
                                    // enrich inbound endpoint with the sequence model
                                    const inboundEndpoint: InboundEndpoint = node.inboundEndpoint as InboundEndpoint;
                                    viewLocation.view = MACHINE_VIEW.InboundEPView;
                                    const epSequenceName = inboundEndpoint.sequence;
                                    const sequenceURI = await langClient.getSequencePath(epSequenceName ? epSequenceName : "");
                                    if (sequenceURI) {
                                        const sequence = await langClient.getSyntaxTree({ documentIdentifier: { uri: sequenceURI } });
                                        inboundEndpoint.sequenceModel = sequence.syntaxTree.sequence;
                                        inboundEndpoint.sequenceURI = sequenceURI;
                                    }
                                    viewLocation.stNode = node.inboundEndpoint;
                                    break;
                                default:
                                    // Handle default case
                                    viewLocation.stNode = node as any as STNode;
                                    break;
                            }
                        }
                    } catch (error) {
                        viewLocation.stNode = undefined;
                        console.log("Error occured", error);
                    }
                }
                if (viewLocation.view === MACHINE_VIEW.ResourceView) {
                    const res = await langClient!.getDiagnostics({ documentUri: context.documentUri! });
                    if (res.diagnostics && res.diagnostics.length > 0) {
                        viewLocation.diagnostics = res.diagnostics;
                    }
                }

                // set webview title
                const webview = webviews.get(context.projectUri!)?.getWebview();
                if (webview) {
                    const workspaces = vscode.workspace.workspaceFolders;
                    const projectName = workspaces && workspaces.length > 1 ? path.basename(context.projectUri!) : '';
                    webview.title = projectName ? `${context.view} - ${projectName}` : context.view!;
                }

                updateProjectExplorer(viewLocation);
                resolve(viewLocation);
            });
        },
        updateStack: (context, event) => {
            return new Promise(async (resolve, reject) => {
                if (event.data.type === EVENT_TYPE.REPLACE_VIEW) {
                    history.pop();
                }
                if (!context.view?.includes("Form")) {
                    const ctx = context?.previousContext ? context?.previousContext : context;
                    const historyStack = history.get();
                    const lastEntry = historyStack[historyStack.length - 1];
                    const newEntry = {
                        location: {
                            view: ctx?.view,
                            documentUri: ctx?.documentUri,
                            position: ctx?.position,
                            identifier: ctx?.identifier,
                            dataMapperProps: ctx?.dataMapperProps
                        }
                    };

                    if (!lastEntry || JSON.stringify(lastEntry) !== JSON.stringify(newEntry)) {
                        history.push(newEntry);
                    }
                }
                getPopupStateMachine(context.projectUri!).resetState();
                resolve(true);
            });
        },
        updateAIView: () => {
            return new Promise(async (resolve, reject) => {
                resolve(true);
            });
        },
        activateOtherFeatures: (context, event) => {
            return new Promise(async (resolve, reject) => {
                const ls = await MILanguageClient.getInstance(context.projectUri!);
                await activateProjectExplorer(extension.context, ls.languageClient!);
                await activateTestExplorer(extension.context);
                resolve(true);
            });
        },
        disableExtension: (context, event) => {
            return new Promise(async (resolve, reject) => {
                vscode.commands.executeCommand('setContext', 'MI.status', 'disabled');
                updateProjectExplorer(context);
                resolve(true);
            });
        },
        focusProjectExplorer: (context, event) => {
            return new Promise(async (resolve, reject) => {
                vscode.commands.executeCommand(COMMANDS.FOCUS_PROJECT_EXPLORER);
                resolve(true);
            });
        }
    }
});


// Create a service to interpret the machine
const stateMachines: Map<string, any> = new Map();

export const getStateMachine = (projectUri: string): {
    service: () => any;
    context: () => MachineContext;
    state: () => MachineStateValue;
    sendEvent: (eventType: EVENT_TYPE) => void;
} => {
    let stateService;
    if (!stateMachines.has(projectUri)) {
        // check if provided project is a valid workspace
        const workspaces = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(projectUri));
        if (!workspaces) {
            console.warn('No workspace folder is open.');
        }
        stateService = interpret(stateMachine.withContext({
            projectUri: projectUri,
            langClient: null,
            errors: [],
            view: MACHINE_VIEW.Welcome
        })).start();
        stateMachines.set(projectUri, stateService);
    }
    stateService = stateMachines.get(projectUri);

    return {
        service: () => {
            const service = stateService;
            return service;
        },
        context: () => { return stateService.getSnapshot().context; },
        state: () => { return stateService.getSnapshot().value as MachineStateValue; },
        sendEvent: (eventType: EVENT_TYPE) => { stateService.send({ type: eventType }); },
    };
};

export const deleteStateMachine = (projectUri: string) => {
    if (stateMachines.has(projectUri)) {
        const stateService = stateMachines.get(projectUri);
        stateService.stop();
        stateMachines.delete(projectUri);
    }
};

export function openView(type: EVENT_TYPE, viewLocation?: VisualizerLocation) {
    if (viewLocation?.documentUri) {
        viewLocation.documentUri = viewLocation.documentUri.startsWith("file") ? fileURLToPath(viewLocation.documentUri) : Uri.file(viewLocation.documentUri).fsPath;
    }
    updateProjectExplorer(viewLocation);

    if (viewLocation?.projectUri) {
        if (!webviews.has(viewLocation.projectUri)) {
            const panel = new VisualizerWebview(viewLocation.view!, viewLocation.projectUri, extension.webviewReveal);
            webviews.set(viewLocation.projectUri!, panel);
        } else {
            const webview = webviews.get(viewLocation.projectUri)?.getWebview();
            webview?.reveal(ViewColumn.Active);
        }

        const stateMachine = getStateMachine(viewLocation?.projectUri);
        const state = stateMachine.state();
        if (state === 'initialize') {
            const listener = (state) => {
                if (state?.value?.ready === "viewReady") {
                    stateMachine.service().send({ type: type, viewLocation: viewLocation });
                    stateMachine.service().off(listener);
                }
            };
            stateMachine.service().onTransition(listener);
        } else {
            stateMachine.service().send({ type: type, viewLocation: viewLocation });
        }
    } else {
        const workspaces = vscode.workspace.workspaceFolders;
        if (!workspaces || workspaces.length === 0) {
            vscode.window.showErrorMessage('No workspace folder is open.');
            return;
        }

        if (workspaces.length > 1) {
            askForPrj();
            async function askForPrj() {
                const projectUri = await askForProject();
                if (projectUri) {
                    const stateMachine = getStateMachine(projectUri);
                    stateMachine.service().send({ type: type, viewLocation: viewLocation });
                }
            }
        }

        viewLocation!.projectUri = workspaces[0].uri.fsPath;
        const stateMachine = getStateMachine(workspaces[0].uri.fsPath);
        return stateMachine.service().send({ type: type, viewLocation: viewLocation });
    }
}

export function navigate(projectUri: string, entry?: HistoryEntry) {
    const historyStack = history.get();
    const stateMachine = getStateMachine(projectUri);
    if (historyStack.length === 0) {
        if (entry) {
            history.push({ location: entry.location });
            stateMachine.service().send({ type: "NAVIGATE", viewLocation: entry!.location });
        } else {
            history.push({ location: { view: MACHINE_VIEW.Overview } });
            stateMachine.service().send({ type: "NAVIGATE", viewLocation: { view: MACHINE_VIEW.Overview } });
        }
    } else {
        const location = entry ? entry.location : historyStack[historyStack.length - 1].location;
        stateMachine.service().send({ type: "NAVIGATE", viewLocation: location });
    }
}

export function refreshUI(projectUri: string) {
    const stateMachine = getStateMachine(projectUri);
    const context = stateMachine?.context();
    if (!context) {
        return;
    }
    const location = {
        view: context?.view,
        documentUri: context?.documentUri,
        position: context?.position,
        identifier: context?.identifier,
        dataMapperProps: context?.dataMapperProps
    };
    getStateMachine(projectUri).service().send({ type: "NAVIGATE", viewLocation: location });
}

function updateProjectExplorer(location: VisualizerLocation | undefined) {
    if (location && location.documentUri) {
        const projectRoot = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(location.documentUri))?.uri?.fsPath;

        const relativePath = vscode.workspace.asRelativePath(location.documentUri);
        const isTestFile = relativePath.startsWith(`src${path.sep}test${path.sep}`);
        if (isTestFile) {
            vscode.commands.executeCommand(COMMANDS.REVEAL_TEST_PANE);
        } else if (projectRoot && !extension.preserveActivity) {
            location.projectUri = projectRoot;
            if (!getStateMachine(projectRoot).context().isOldProject) {
                vscode.commands.executeCommand(COMMANDS.REVEAL_ITEM_COMMAND, location);
            }
        }
    }
}

async function checkIfMiProject(projectUri) {
    log(`Detecting project in ${projectUri} - ${new Date().toLocaleTimeString()}`);

    let isProject = false, isOldProject = false, displayOverview = true, view = MACHINE_VIEW.Overview, isEnvironmentSetUp = false;
    const customProps: any = {};
    try {
        // Check for pom.xml files excluding node_modules directory
        const pomFilePath = path.join(projectUri, 'pom.xml');
        if (fs.existsSync(pomFilePath)) {
            const pomContent = await fs.promises.readFile(pomFilePath, 'utf-8');
            isProject = pomContent.includes('<projectType>integration-project</projectType>');
            if (isProject) {
                log("MI project detected in " + projectUri);
            }
        }

        // If not found, check for .project files
        if (!isProject) {
            const projectFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(projectUri, '.project'), '**/node_modules/**', 1);
            if (projectFiles.length > 0) {
                const oldProjectNatures = [
                    '<nature>org.wso2.developerstudio.eclipse.mavenmultimodule.project.nature</nature>',
                    '<nature>org.eclipse.m2e.core.maven2Nature</nature>'
                ];
                const projectContent = await vscode.workspace.openTextDocument(projectFiles[0]);
                if (oldProjectNatures.some(nature => projectContent.getText().includes(nature))) {
                    isOldProject = true;
                    log("Integration Studio project detected in " + projectUri);
                }
            }
        }
    } catch (err) {
        console.error(err);
        throw err; // Rethrow the error to ensure the error handling flow is not broken
    }

    if (isProject) {
        // Check if the project is empty
        const files = await vscode.workspace.findFiles(new vscode.RelativePattern(projectUri, "src/main/wso2mi/artifacts/*/*.xml"), '**/node_modules/**', 1);
        if (files.length === 0) {
            const config = vscode.workspace.getConfiguration('MI', projectUri);
            const scope = config.get<string>("Scope");
            switch (scope) {
                case "integration-as-api":
                    view = MACHINE_VIEW.APIForm;
                    break;
                case "automation":
                    view = MACHINE_VIEW.TaskForm;
                    customProps.type = "external";
                    break;
                case "event-integration":
                case "file-integration":
                    view = MACHINE_VIEW.InboundEPForm;
                    break;
                default:
                    view = MACHINE_VIEW.ADD_ARTIFACT;
                    break;
            }
        }

        vscode.commands.executeCommand('setContext', 'MI.status', 'projectDetected');
        vscode.commands.executeCommand('setContext', 'MI.projectType', 'miProject'); // for command enablements
        await extension.context.workspaceState.update('projectType', 'miProject');
    } else if (isOldProject) {
        const displayState: boolean | undefined = extension.context.workspaceState.get('displayOverview');
        displayOverview = displayState === undefined ? true : displayState;
        vscode.commands.executeCommand('setContext', 'MI.status', 'projectDetected');
        vscode.commands.executeCommand('setContext', 'MI.projectType', 'oldProject'); // for command enablements
        await extension.context.workspaceState.update('projectType', 'oldProject');
    } else {
        vscode.commands.executeCommand('setContext', 'MI.status', 'unknownProject');
    }

    if (isProject || isOldProject) {
        isEnvironmentSetUp = await setupEnvironment(projectUri, isOldProject);
        if (!isEnvironmentSetUp) {
            vscode.commands.executeCommand('setContext', 'MI.status', 'notSetUp');
        }
        // Log project path
        log(`Current workspace path: ${projectUri}`);
    }

    log(`Project detection completed for path: ${projectUri} at ${new Date().toLocaleTimeString()}`);
    return {
        isProject,
        isOldProject,
        displayOverview,
        projectUri, // Return the path of the detected project
        view,
        customProps,
        isEnvironmentSetUp
    };
}

function findViewIcon(view) {
    let icon = 'icon';
    switch (view) {
        case MACHINE_VIEW.ServiceDesigner:
        case MACHINE_VIEW.ResourceView:
        case MACHINE_VIEW.APIForm:
            icon = 'APIResource';
            break;
        case MACHINE_VIEW.SequenceView:
        case MACHINE_VIEW.SequenceForm:
            icon = 'Sequence';
            break;
        case MACHINE_VIEW.EndPointForm:
            icon = 'endpoint';
            break;
        case MACHINE_VIEW.HttpEndpointForm:
            icon = 'http-endpoint';
            break;
        case MACHINE_VIEW.WsdlEndpointForm:
            icon = 'wsdl-endpoint';
            break;
        case MACHINE_VIEW.AddressEndpointForm:
            icon = 'address-endpoint';
            break;
        case MACHINE_VIEW.DefaultEndpointForm:
            icon = 'default-endpoint';
            break;
        case MACHINE_VIEW.FailoverEndPointForm:
            icon = 'failover-endpoint';
            break;
        case MACHINE_VIEW.RecipientEndPointForm:
            icon = 'recipient-endpoint';
            break;
        case MACHINE_VIEW.LoadBalanceEndPointForm:
            icon = 'load-balance-endpoint';
            break;
        case MACHINE_VIEW.InboundEPForm:
            icon = 'inbound-endpoint';
            break;
        case MACHINE_VIEW.MessageStoreForm:
            icon = 'message-store';
            break;
        case MACHINE_VIEW.MessageProcessorForm:
            icon = 'message-processor';
            break;
        case MACHINE_VIEW.ProxyView:
        case MACHINE_VIEW.ProxyServiceForm:
            icon = 'arrow-swap';
            break;
        case MACHINE_VIEW.TaskForm:
            icon = 'task';
            break;
        case MACHINE_VIEW.LocalEntryForm:
            icon = 'local-entry';
            break;
        case MACHINE_VIEW.TemplateEndPointForm:
        case MACHINE_VIEW.TemplateForm:
            icon = 'template';
            break;
        case MACHINE_VIEW.TemplateEndPointForm:
            icon = 'template-endpoint';
            break;
        case MACHINE_VIEW.SequenceTemplateView:
            icon = 'sequence-template';
            break;
        case MACHINE_VIEW.DataSourceForm:
            icon = 'data-source';
            break;
        case MACHINE_VIEW.DataServiceForm:
        case MACHINE_VIEW.DataServiceView:
            icon = 'data-service';
            break;
        case MACHINE_VIEW.RegistryResourceForm:
        case MACHINE_VIEW.RegistryMetadataForm:
            icon = 'registry';
            break;
        case MACHINE_VIEW.DataMapperView:
            icon = 'dataMapper';
            break;
        default:
            break;
    }
    return icon;
}
