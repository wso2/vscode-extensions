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

import { test, expect } from '@playwright/test';
import { Form } from '../components/Form';
import { AddArtifact } from '../components/AddArtifact';
import { ConnectorStore } from '../components/ConnectorStore';
import { initTest, page } from '../Utils';
import { ProjectExplorer } from '../components/ProjectExplorer';
import { MACHINE_VIEW } from '@wso2/mi-core';
import { Overview } from '../components/Overview';

export default function createTests() {
    test.describe("Connection Tests", {
        tag: '@group2',
    }, async () => {
        initTest();

        test("Connection Tests", async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            await test.step('Create new Connection', async () => {
                console.log('Initializing AddArtifact page for connection creation');

                const { title: iframeTitle } = await page.getCurrentWebview();

                if (iframeTitle === MACHINE_VIEW.Overview) {
                    const overviewPage = new Overview(page.page);
                    await overviewPage.init();
                    await overviewPage.goToAddArtifact();
                }

                const addArtifactPage = new AddArtifact(page.page);
                await addArtifactPage.init();
                await addArtifactPage.add('Connections');

                const connectorStore = new ConnectorStore(page.page, "Connector Store Form");
                await connectorStore.init();
                console.log('Searching for Email connector');
                await connectorStore.search('Email');
                await connectorStore.selectOperation('IMAP');
                await connectorStore.confirmDownloadDependency();

                const connectionForm = new Form(page.page, 'Connector Store Form');
                await connectionForm.switchToFormView();
                console.log('Filling out connection form');
                await connectionForm.fill({
                    values: {
                        'Connection Name*': {
                            type: 'input',
                            value: 'email_connection' + testAttempt,
                        },
                        'Host*': {
                            type: 'expression',
                            value: 'http://localhost'
                        },
                        'Port*': {
                            type: 'expression',
                            value: '80',
                        },
                        'Username*': {
                            type: 'expression',
                            value: 'exampleusername'
                        }
                    }
                });
                await connectionForm.submit('Add');

                console.log('Finding created connection in Project Explorer');
                const projectExplorer = new ProjectExplorer(page.page);
                await projectExplorer.findItem(["Project testProject", "Other Artifacts", "Connections", "email_connection" + testAttempt]);
            });

            await test.step('Edit Connection', async () => {
                console.log('Editing connection: email_connection');
                const projectExplorer = new ProjectExplorer(page.page);
                console.log('Finding existing connection in Project Explorer');
                await projectExplorer.findItem(["Project testProject", "Other Artifacts", "Connections", "email_connection" + testAttempt], true);

                const connectionForm = new Form(page.page, 'Connection Creation Form');
                await connectionForm.switchToFormView();
                const connectionName = await connectionForm.getInputValue('Connection Name*');
                console.log(`Current connection name is: ${connectionName}`);
                expect(connectionName).toBe('email_connection' + testAttempt);

                console.log('Filling out the connection form with new values');
                await connectionForm.fill({
                    values: {
                        'Connection Name*': {
                            type: 'input',
                            value: 'email_connection2' + testAttempt,
                        },
                        'Host*': {
                            type: 'expression',
                            value: 'example2.com',
                        },
                        'Port*': {
                            type: 'expression',
                            value: '8080',
                        }
                    }
                });
                await connectionForm.submit('Update');
            });

            await test.step('Create Connection from project explorer', async () => {
                console.log('Creating Connection from project explorer: http_connection');
                const projectExplorer = new ProjectExplorer(page.page);
                console.log('Click connection + in Project Explorer');
                await projectExplorer.addArtifact(["Project testProject", "Other Artifacts", "Connections"]);

                const connectorStore = new ConnectorStore(page.page, "Connector Store Form");
                await connectorStore.init();
                await connectorStore.search('HTTP');
                await connectorStore.selectOperation('HTTP');

                const connectionForm = new Form(page.page, 'Connector Store Form');
                await connectionForm.switchToFormView();
                console.log('Filling out connection form');
                await connectionForm.fill({
                    values: {
                        'Connection Name*': {
                            type: 'input',
                            value: 'http_connection' + testAttempt,
                        }
                    }
                });
                await connectionForm.submit('Add');

                console.log('Finding created connection in Project Explorer');
                await projectExplorer.findItem(["Project testProject", "Other Artifacts", "Connections", "http_connection" + testAttempt]);
            });

            // TODO: Need to investigate why these tests are failing. Fix this after https://github.com/wso2/mi-vscode/issues/1149.
            // await test.step('Import proto Connector', async () => {
            //     console.log('Importing connector: order-new.proto');
            //     const overviewPage = new Overview(page.page);
            //     await overviewPage.init();
            //     await overviewPage.goToAddArtifact();

            //     const addArtifactPage = new AddArtifact(page.page);
            //     await addArtifactPage.init();
            //     await addArtifactPage.add('Connections');

            //     const connectorStore = new ConnectorStore(page.page, "Connector Store Form");
            //     await connectorStore.init();

            //     console.log('importing connector');
            //     await connectorStore.importConnector('order-new.proto', 'proto');
            //     await connectorStore.search('OrderService');
            //     await connectorStore.selectOperation('ORDERSERVICE');
            //     const connectionForm = new Form(page.page, 'Connector Store Form');
            //     await connectionForm.switchToFormView();
            //     console.log('Filling out connection form');
            //     await connectionForm.fill({
            //         values: {
            //             'Connection Name*': {
            //                 type: 'input',
            //                 value: 'order_connection' + testAttempt,
            //             },
            //             'Server URL*': {
            //                 type: 'expression',
            //                 value: 'http://localhost'
            //             },
            //             'Port*': {
            //                 type: 'expression',
            //                 value: '80',
            //             }
            //         }
            //     });
            //     await connectionForm.submit('Add');
            //     console.log('Finding created connection in Project Explorer');
            //     const projectExplorer = new ProjectExplorer(page.page);
            //     await projectExplorer.findItem(["Project testProject", "Other Artifacts", "Connections", "order_connection" + testAttempt]);            
            //     console.log('Connection tests completed');
            // });

            // await test.step('Import openapi Connector', async () => {
            //     console.log('Importing connector: openapi-connector');
            //     const overviewPage = new Overview(page.page);
            //     await overviewPage.init();
            //     await overviewPage.goToAddArtifact();

            //     const addArtifactPage = new AddArtifact(page.page);
            //     await addArtifactPage.init();
            //     await addArtifactPage.add('Connections');

            //     const connectorStore = new ConnectorStore(page.page, "Connector Store Form");
            //     await connectorStore.init();

            //     console.log('importing connector');
            //     await connectorStore.importConnector('openapi.yaml', 'OpenAPI');
            //     await connectorStore.search('Swagger_petstore');
            //     await connectorStore.selectOperation('SWAGGER_PETSTORE');

            //     const connectionForm = new Form(page.page, 'Connector Store Form');
            //     await connectionForm.switchToFormView();
            //     console.log('Filling out connection form');
            //     await connectionForm.fill({
            //         values: {
            //             'Connection Name*': {
            //                 type: 'input',
            //                 value: 'petstore_connection' + testAttempt,
            //             }
            //         }
            //     });
            //     await connectionForm.submit('Add');
            //     console.log('Finding created connection in Project Explorer');
            //     const projectExplorer = new ProjectExplorer(page.page);
            //     await projectExplorer.findItem(["Project testProject", "Other Artifacts", "Connections", "petstore_connection" + testAttempt]);
            // });
        });
    });
}
