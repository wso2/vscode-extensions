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

import { expect, test } from '@playwright/test';
import { Form } from '../components/Form';
import { AddArtifact } from '../components/AddArtifact';
import { initTest, page } from '../Utils';
import { InboundEPForm } from '../components/InboundEp';
import { Diagram } from '../components/Diagram';
import { Overview } from '../components/Overview';
import { MACHINE_VIEW } from '@wso2/mi-core';
import { ProjectExplorer } from '../components/ProjectExplorer';

export default function createTests() {
    test.describe("Inbound Ep Tests", {
        tag: '@group',
    }, async () => {
        initTest();

        test("Inbuilt Inbound EP Tests", async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            await test.step('Create new HTTPS inbound endpoint', async () => {
                // Create HTTPS inbound endpoint with automatically generated sequences

                const { title: iframeTitle } = await page.getCurrentWebview();

                if (iframeTitle === MACHINE_VIEW.Overview) {
                    const overviewPage = new Overview(page.page);
                    await overviewPage.init();
                    await overviewPage.goToAddArtifact();
                }

                const addArtifactPage = new AddArtifact(page.page);
                await addArtifactPage.init();
                await addArtifactPage.add('Event Integration');

                const inboundEPSelector = new InboundEPForm(page.page);
                await inboundEPSelector.init();
                await inboundEPSelector.selectType('HTTPS');

                const inboundEPForm = new Form(page.page, 'Event Integration Form');
                await inboundEPForm.switchToFormView();
                await inboundEPForm.fill({
                    values: {
                        'Event Integration Name*': {
                            type: 'input',
                            value: 'HTTPS_inboundEP' + testAttempt,
                        },
                        'Port*': {
                            type: 'input',
                            value: '8080',
                        }
                    }
                });
                await inboundEPForm.submit('Create');

                const diagram = new Diagram(page.page, 'Event Integration');
                await diagram.init();
                await diagram.addMediator('Log');
                const diagramTitle = diagram.getDiagramTitle();

                expect(await diagramTitle).toBe('Event Integration: HTTPS_inboundEP' + testAttempt);
            });

            await test.step('Edit Inbound Endpoint', async () => {
                // Edit HTTPS Inbound Endpoint

                const diagram = new Diagram(page.page, 'Event Integration');
                await diagram.init();
                await diagram.edit();

                const inboundEPForm = new Form(page.page, 'Event Integration Form');
                await inboundEPForm.switchToFormView();
                await inboundEPForm.fill({
                    values: {
                        'Event Integration Name*': {
                            type: 'input',
                            value: 'HTTPS_inboundEP2' + testAttempt,
                        },
                        'Port*': {
                            type: 'input',
                            value: '9090',
                        }
                    }
                });

                await inboundEPForm.submit('Update');

                await diagram.init();
                const diagramTitle = diagram.getDiagramTitle();
                expect(await diagramTitle).toBe('Event Integration: HTTPS_inboundEP2' + testAttempt);
            });

            await test.step('Create new HTTP inbound endpoint', async () => {
                // Create HTTP inbound endpoint
                console.log('Creating Connection from project explorer: http_connection');
                const projectExplorer = new ProjectExplorer(page.page);
                console.log('Click Event Integrations + in Project Explorer');
                await projectExplorer.addArtifact(["Project testProject", "Event Integrations"]);

                const inboundEPSelector = new InboundEPForm(page.page);
                await inboundEPSelector.init();
                await inboundEPSelector.selectType('HTTP');

                const inboundEPForm = new Form(page.page, 'Event Integration Form');
                await inboundEPForm.switchToFormView();
                await inboundEPForm.fill({
                    values: {
                        'Event Integration Name*': {
                            type: 'input',
                            value: 'HTTP_inboundEP' + testAttempt,
                        },
                        'Port*': {
                            type: 'input',
                            value: '8080',
                        }
                    }
                });
                await inboundEPForm.submit('Create');

                const diagram = new Diagram(page.page, 'Event Integration');
                await diagram.init();
                await diagram.addMediator('Log');
                const diagramTitle = diagram.getDiagramTitle();

                expect(await diagramTitle).toBe('Event Integration: HTTP_inboundEP' + testAttempt);
            });

            await test.step('Edit HTTP Inbound Endpoint', async () => {
                // Edit HTTP Inbound Endpoint

                const diagram = new Diagram(page.page, 'Event Integration');
                await diagram.init();
                await diagram.edit();

                const inboundEPForm = new Form(page.page, 'Event Integration Form');
                await inboundEPForm.switchToFormView();
                await inboundEPForm.fill({
                    values: {
                        'Event Integration Name*': {
                            type: 'input',
                            value: 'HTTP_inboundEP2' + testAttempt,
                        },
                        'Port*': {
                            type: 'input',
                            value: '9090',
                        }
                    }
                });

                await inboundEPForm.submit('Update');

                await diagram.init();
                const diagramTitle = diagram.getDiagramTitle();
                expect(await diagramTitle).toBe('Event Integration: HTTP_inboundEP2' + testAttempt);
            });

            await test.step('Create new JMS inbound endpoint', async () => {
                // Create JMS inbound endpoint
                console.log('Creating Connection from project explorer: jms_connection');
                const projectExplorer = new ProjectExplorer(page.page);
                console.log('Click Event Integrations + in Project Explorer');
                await projectExplorer.addArtifact(["Project testProject", "Event Integrations"]);

                const inboundEPSelector = new InboundEPForm(page.page);
                await inboundEPSelector.init();
                await inboundEPSelector.selectType('JMS');

                const inboundEPForm = new Form(page.page, 'Event Integration Form');
                await inboundEPForm.switchToFormView();
                await inboundEPForm.fill({
                    values: {
                        'Event Integration Name*': {
                            type: 'input',
                            value: 'JMS_inboundEP' + testAttempt,
                        },
                        'Polling Interval*': {
                            type: 'input',
                            value: '500',
                        },
                        'Java Naming Factory Initial*': {
                            type: 'input',
                            value: 'exampleInitial',
                        },
                        'Java Naming Provider URL*': {
                            type: 'input',
                            value: 'https://exampleurl.com',
                        },
                        'Connection Factory JNDI Name*': {
                            type: 'input',
                            value: 'exampleName',
                        }
                    }
                });
                await inboundEPForm.submit('Create');

                const diagram = new Diagram(page.page, 'Event Integration');
                await diagram.init();
                await diagram.addMediator('Log');
                const diagramTitle = diagram.getDiagramTitle();

                expect(await diagramTitle).toBe('Event Integration: JMS_inboundEP' + testAttempt);
            });

            await test.step('Edit JMS Inbound Endpoint', async () => {
                // Edit JMS Inbound Endpoint
                console.log('Edit JMS inbound endpoint');
                const diagram = new Diagram(page.page, 'Event Integration');
                await diagram.init();
                await diagram.edit();

                const inboundEPForm = new Form(page.page, 'Event Integration Form');
                await inboundEPForm.switchToFormView();
                await inboundEPForm.fill({
                    values: {
                        'Event Integration Name*': {
                            type: 'input',
                            value: 'JMS_inboundEP2' + testAttempt,
                        },
                        'Polling Interval*': {
                            type: 'input',
                            value: '1000',
                        }
                    }
                });

                await inboundEPForm.submit('Update');

                await diagram.init();
                const diagramTitle = diagram.getDiagramTitle();
                expect(await diagramTitle).toBe('Event Integration: JMS_inboundEP2' + testAttempt);
            });

            await test.step('Create new File inbound endpoint', async () => {
                // Create File inbound endpoint
                console.log('Creating Connection from project explorer: file_connection');
                const projectExplorer = new ProjectExplorer(page.page);
                console.log('Click Event Integrations + in Project Explorer');
                await projectExplorer.addArtifact(["Project testProject", "Event Integrations"]);

                const inboundEPSelector = new InboundEPForm(page.page);
                await inboundEPSelector.init();
                await inboundEPSelector.selectType('File');

                const inboundEPForm = new Form(page.page, 'Event Integration Form');
                await inboundEPForm.switchToFormView();
                await inboundEPForm.fill({
                    values: {
                        'Event Integration Name*': {
                            type: 'input',
                            value: 'file_inboundEP' + testAttempt,
                        },
                        'File URI*': {
                            type: 'input',
                            value: 'file:///path/to/your/file',
                        },
                        'Polling Interval*': {
                            type: 'input',
                            value: '500',
                        }
                    }
                });
                await inboundEPForm.submit('Create');

                const diagram = new Diagram(page.page, 'Event Integration');
                await diagram.init();
                await diagram.addMediator('Log');
                const diagramTitle = diagram.getDiagramTitle();

                expect(await diagramTitle).toBe('Event Integration: file_inboundEP' + testAttempt);
            });

            await test.step('Edit File Inbound Endpoint', async () => {
                // Edit File Inbound Endpoint
                console.log('Edit File inbound endpoint');
                const diagram = new Diagram(page.page, 'Event Integration');
                await diagram.init();
                await diagram.edit();

                const inboundEPForm = new Form(page.page, 'Event Integration Form');
                await inboundEPForm.switchToFormView();
                await inboundEPForm.fill({
                    values: {
                        'Event Integration Name*': {
                            type: 'input',
                            value: 'file_inboundEP2' + testAttempt,
                        },
                        'Polling Interval*': {
                            type: 'input',
                            value: '1000',
                        }
                    }
                });

                await inboundEPForm.submit('Update');

                await diagram.init();
                const diagramTitle = diagram.getDiagramTitle();
                expect(await diagramTitle).toBe('Event Integration: file_inboundEP2' + testAttempt);
            });

            await test.step('Create new RabbitMQ inbound endpoint', async () => {
                // Create RabbitMQ inbound endpoint
                console.log('Creating Connection from project explorer: rabbitmq_connection');
                const projectExplorer = new ProjectExplorer(page.page);
                console.log('Click Event Integrations + in Project Explorer');
                await projectExplorer.addArtifact(["Project testProject", "Event Integrations"]);

                const inboundEPSelector = new InboundEPForm(page.page);
                await inboundEPSelector.init();
                await inboundEPSelector.selectType('RabbitMQ');

                const inboundEPForm = new Form(page.page, 'Event Integration Form');
                await inboundEPForm.switchToFormView();
                await inboundEPForm.fill({
                    values: {
                        'Event Integration Name*': {
                            type: 'input',
                            value: 'rabbitmq_inboundEP' + testAttempt,
                        },
                        'Connection Factory*': {
                            type: 'input',
                            value: 'exampleFactory',
                        },
                        'Queue Name*': {
                            type: 'input',
                            value: 'queue1',
                        }
                    }
                });
                await inboundEPForm.submit('Create');

                const diagram = new Diagram(page.page, 'Event Integration');
                await diagram.init();
                await diagram.addMediator('Log');
                const diagramTitle = diagram.getDiagramTitle();

                expect(await diagramTitle).toBe('Event Integration: rabbitmq_inboundEP' + testAttempt);
            });

            await test.step('Edit RabbitMQ Inbound Endpoint', async () => {
                // Edit RabbitMQ Inbound Endpoint
                console.log('Edit RabbitMQ inbound endpoint');
                const diagram = new Diagram(page.page, 'Event Integration');
                await diagram.init();
                await diagram.edit();

                const inboundEPForm = new Form(page.page, 'Event Integration Form');
                await inboundEPForm.switchToFormView();
                await inboundEPForm.fill({
                    values: {
                        'Event Integration Name*': {
                            type: 'input',
                            value: 'rabbitmq_inboundEP2' + testAttempt,
                        },
                        'Queue Name*': {
                            type: 'input',
                            value: 'queue2',
                        }
                    }
                });

                await inboundEPForm.submit('Update');

                await diagram.init();
                const diagramTitle = diagram.getDiagramTitle();
                expect(await diagramTitle).toBe('Event Integration: rabbitmq_inboundEP2' + testAttempt);
            });

            await test.step('Create new Websocket inbound endpoint', async () => {
                // Create Websocket inbound endpoint
                console.log('Creating Connection from project explorer: websocket_connection');
                const projectExplorer = new ProjectExplorer(page.page);
                console.log('Click Event Integrations + in Project Explorer');
                await projectExplorer.addArtifact(["Project testProject", "Event Integrations"]);

                const inboundEPSelector = new InboundEPForm(page.page);
                await inboundEPSelector.init();
                await inboundEPSelector.selectType('Websocket');

                const inboundEPForm = new Form(page.page, 'Event Integration Form');
                await inboundEPForm.switchToFormView();
                await inboundEPForm.fill({
                    values: {
                        'Event Integration Name*': {
                            type: 'input',
                            value: 'websocket_inboundEP' + testAttempt,
                        },
                        'Port*': {
                            type: 'input',
                            value: '8080',
                        },
                        'Outflow Sequence*': {
                            type: 'input',
                            value: 'outsequence',
                        },
                        'Outflow Fault Sequence*': {
                            type: 'input',
                            value: 'outFaultSequence',
                        }
                    }
                });
                await inboundEPForm.submit('Create');

                const diagram = new Diagram(page.page, 'Event Integration');
                await diagram.init();
                await diagram.addMediator('Log');
                const diagramTitle = diagram.getDiagramTitle();

                expect(await diagramTitle).toBe('Event Integration: websocket_inboundEP' + testAttempt);
            });

            await test.step('Edit Websocket Inbound Endpoint', async () => {
                // Edit File Inbound Endpoint
                console.log('Edit Websocket inbound endpoint');
                const diagram = new Diagram(page.page, 'Event Integration');
                await diagram.init();
                await diagram.edit();

                const inboundEPForm = new Form(page.page, 'Event Integration Form');
                await inboundEPForm.switchToFormView();
                await inboundEPForm.fill({
                    values: {
                        'Event Integration Name*': {
                            type: 'input',
                            value: 'websocket_inboundEP2' + testAttempt,
                        },
                        'Port*': {
                            type: 'input',
                            value: '9090',
                        },
                    }
                });

                await inboundEPForm.submit('Update');

                await diagram.init();
                const diagramTitle = diagram.getDiagramTitle();
                expect(await diagramTitle).toBe('Event Integration: websocket_inboundEP2' + testAttempt);
            });

            await test.step('Create new Secure Websocket inbound endpoint', async () => {
                // Create Secure Websocket inbound endpoint
                console.log('Creating Connection from project explorer: secureWebsocket_connection');
                const projectExplorer = new ProjectExplorer(page.page);
                console.log('Click Event Integrations + in Project Explorer');
                await projectExplorer.addArtifact(["Project testProject", "Event Integrations"]);

                const inboundEPSelector = new InboundEPForm(page.page);
                await inboundEPSelector.init();
                await inboundEPSelector.selectType('Secure Websocket');

                const inboundEPForm = new Form(page.page, 'Event Integration Form');
                await inboundEPForm.switchToFormView();
                await inboundEPForm.fill({
                    values: {
                        'Event Integration Name*': {
                            type: 'input',
                            value: 'secureWebsocket_inboundEP' + testAttempt,
                        },
                        'Port*': {
                            type: 'input',
                            value: '8080',
                        },
                        'Outflow Sequence*': {
                            type: 'input',
                            value: 'outsequence',
                        },
                        'Outflow Fault Sequence*': {
                            type: 'input',
                            value: 'outFaultSequence',
                        },
                        'Keystore Location*': {
                            type: 'input',
                            value: 'keystorePath',
                        },
                        'Keystore Password*': {
                            type: 'input',
                            value: 'keystorePass',
                        },
                        'Truststore Location*': {
                            type: 'input',
                            value: 'truststorePath',
                        },
                        'Truststore Password*': {
                            type: 'input',
                            value: 'truststorePass',
                        },
                        'Certificate Password*': {
                            type: 'input',
                            value: 'certificatePass',
                        }
                    }
                });
                await inboundEPForm.submit('Create');

                const diagram = new Diagram(page.page, 'Event Integration');
                await diagram.init();
                await diagram.addMediator('Log');
                const diagramTitle = diagram.getDiagramTitle();

                expect(await diagramTitle).toBe('Event Integration: secureWebsocket_inboundEP' + testAttempt);
            });

            await test.step('Edit Secure Websocket Inbound Endpoint', async () => {
                // Edit Secure Websocket Inbound Endpoint
                console.log('Edit Secure Websocket inbound endpoint');
                const diagram = new Diagram(page.page, 'Event Integration');
                await diagram.init();
                await diagram.edit();

                const inboundEPForm = new Form(page.page, 'Event Integration Form');
                await inboundEPForm.switchToFormView();
                await inboundEPForm.fill({
                    values: {
                        'Event Integration Name*': {
                            type: 'input',
                            value: 'secureWebsocket_inboundEP2' + testAttempt,
                        },
                        'Port*': {
                            type: 'input',
                            value: '9090',
                        },
                    }
                });

                await inboundEPForm.submit('Update');

                await diagram.init();
                const diagramTitle = diagram.getDiagramTitle();
                expect(await diagramTitle).toBe('Event Integration: secureWebsocket_inboundEP2' + testAttempt);
            });

            await test.step('Create new HL7 inbound endpoint', async () => {
                // Create HL7 inbound endpoint
                console.log('Creating Connection from project explorer: hl7_connection');
                const projectExplorer = new ProjectExplorer(page.page);
                console.log('Click Event Integrations + in Project Explorer');
                await projectExplorer.addArtifact(["Project testProject", "Event Integrations"]);

                const inboundEPSelector = new InboundEPForm(page.page);
                await inboundEPSelector.init();
                await inboundEPSelector.selectType('HL7');

                const inboundEPForm = new Form(page.page, 'Event Integration Form');
                await inboundEPForm.switchToFormView();
                await inboundEPForm.fill({
                    values: {
                        'Event Integration Name*': {
                            type: 'input',
                            value: 'hl7_inboundEP' + testAttempt,
                        },
                        'Port': {
                            type: 'input',
                            value: '8080',
                        }
                    }
                });
                await inboundEPForm.submit('Create');

                const diagram = new Diagram(page.page, 'Event Integration');
                await diagram.init();
                await diagram.addMediator('Log');
                const diagramTitle = diagram.getDiagramTitle();

                expect(await diagramTitle).toBe('Event Integration: hl7_inboundEP' + testAttempt);
            });

            await test.step('Edit HL7 Inbound Endpoint', async () => {
                // Edit HL7 Inbound Endpoint
                console.log('Edit HL7 inbound endpoint');
                const diagram = new Diagram(page.page, 'Event Integration');
                await diagram.init();
                await diagram.edit();

                const inboundEPForm = new Form(page.page, 'Event Integration Form');
                await inboundEPForm.switchToFormView();
                await inboundEPForm.fill({
                    values: {
                        'Event Integration Name*': {
                            type: 'input',
                            value: 'hl7_inboundEP2' + testAttempt,
                        },
                        'Port': {
                            type: 'input',
                            value: '9090',
                        },
                    }
                });

                await inboundEPForm.submit('Update');

                await diagram.init();
                const diagramTitle = diagram.getDiagramTitle();
                expect(await diagramTitle).toBe('Event Integration: hl7_inboundEP2' + testAttempt);
            });
        });

        test("Store Inbound EP Tests", async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            await test.step('Create new Amazon SQS inbound endpoint', async () => {
                // Create Amazon SQS inbound endpoint
                console.log('Creating Connection from project explorer: amazonsqs_connection');
                const projectExplorer = new ProjectExplorer(page.page);
                console.log('Click Event Integrations + in Project Explorer');
                await projectExplorer.addArtifact(["Project testProject", "Event Integrations"]);

                const inboundEPSelector = new InboundEPForm(page.page);
                await inboundEPSelector.init();
                await inboundEPSelector.selectStoreType('Amazon Simple Queue Service (Inbound)', 'Amazon SQS');

                const inboundEPForm = new Form(page.page, 'Event Integration Form');
                await inboundEPForm.switchToFormView();
                await inboundEPForm.fill({
                    values: {
                        'Event Integration Name*': {
                            type: 'input',
                            value: 'amazonsqs_inboundEP' + testAttempt,
                        },
                        'Polling interval*': {
                            type: 'input',
                            value: '10',
                        },
                        'Destination*': {
                            type: 'input',
                            value: 'destLocation',
                        }
                    }
                });
                await inboundEPForm.submit('Create');

                const diagram = new Diagram(page.page, 'Event Integration');
                await diagram.init();
                await diagram.addMediator('Log');
                const diagramTitle = diagram.getDiagramTitle();

                expect(await diagramTitle).toBe('Event Integration: amazonsqs_inboundEP' + testAttempt);
            });

            await test.step('Edit Amazon SQS Inbound Endpoint', async () => {
                // Edit Amazon SQS Inbound Endpoint

                const diagram = new Diagram(page.page, 'Event Integration');
                await diagram.init();
                await diagram.edit();

                const inboundEPForm = new Form(page.page, 'Event Integration Form');
                await inboundEPForm.switchToFormView();
                await inboundEPForm.fill({
                    values: {
                        'Event Integration Name*': {
                            type: 'input',
                            value: 'amazonsqs_inboundEP2' + testAttempt,
                        },
                        'Polling interval*': {
                            type: 'input',
                            value: '20',
                        }
                    }
                });

                await inboundEPForm.submit('Update');

                await diagram.init();
                const diagramTitle = diagram.getDiagramTitle();
                expect(await diagramTitle).toBe('Event Integration: amazonsqs_inboundEP2' + testAttempt);
            });

            await test.step('Create new CDC inbound endpoint', async () => {
                // Create CDC inbound endpoint
                console.log('Creating Connection from project explorer: cdc_connection');
                const projectExplorer = new ProjectExplorer(page.page);
                console.log('Click Event Integrations + in Project Explorer');
                await projectExplorer.addArtifact(["Project testProject", "Event Integrations"]);

                const inboundEPSelector = new InboundEPForm(page.page);
                await inboundEPSelector.init();
                await inboundEPSelector.selectStoreType('CDC (Inbound)', 'Debezium CDC');

                const inboundEPForm = new Form(page.page, 'Event Integration Form');
                await inboundEPForm.switchToFormView();
                await inboundEPForm.fill({
                    values: {
                        'Event Integration Name*': {
                            type: 'input',
                            value: 'cdc_inboundEP' + testAttempt,
                        },
                        'Polling interval*': {
                            type: 'input',
                            value: '10',
                        },
                        'Database Hostname*': {
                            type: 'input',
                            value: 'exampleHost',
                        },
                        'Database Port*': {
                            type: 'input',
                            value: '10',
                        },
                        'Database User*': {
                            type: 'input',
                            value: 'exampleUser',
                        },
                        'Database Password*': {
                            type: 'input',
                            value: 'password@123',
                        },
                        'Database Name*': {
                            type: 'input',
                            value: 'exampleDatabase',
                        }
                    }
                });
                await inboundEPForm.submit('Create');

                const diagram = new Diagram(page.page, 'Event Integration');
                await diagram.init();
                await diagram.addMediator('Log');
                const diagramTitle = diagram.getDiagramTitle();

                expect(await diagramTitle).toBe('Event Integration: cdc_inboundEP' + testAttempt);
            });

            await test.step('Edit CDC Inbound Endpoint', async () => {
                // Edit CDC Inbound Endpoint

                const diagram = new Diagram(page.page, 'Event Integration');
                await diagram.init();
                await diagram.edit();

                const inboundEPForm = new Form(page.page, 'Event Integration Form');
                await inboundEPForm.switchToFormView();
                await inboundEPForm.fill({
                    values: {
                        'Event Integration Name*': {
                            type: 'input',
                            value: 'cdc_inboundEP2' + testAttempt,
                        },
                        'Polling interval*': {
                            type: 'input',
                            value: '20',
                        }
                    }
                });

                await inboundEPForm.submit('Update');

                await diagram.init();
                const diagramTitle = diagram.getDiagramTitle();
                expect(await diagramTitle).toBe('Event Integration: cdc_inboundEP2' + testAttempt);
            });

            await test.step('Create new ISO8583 inbound endpoint', async () => {
                // Create ISO8583 inbound endpoint
                console.log('Creating Connection from project explorer: iso_connection');
                const projectExplorer = new ProjectExplorer(page.page);
                console.log('Click Event Integrations + in Project Explorer');
                await projectExplorer.addArtifact(["Project testProject", "Event Integrations"]);

                const inboundEPSelector = new InboundEPForm(page.page);
                await inboundEPSelector.init();
                await inboundEPSelector.selectStoreType('ISO8583 (Inbound)', 'ISO8583');

                const inboundEPForm = new Form(page.page, 'Event Integration Form');
                await inboundEPForm.switchToFormView();
                await inboundEPForm.fill({
                    values: {
                        'Event Integration Name*': {
                            type: 'input',
                            value: 'iso_inboundEP' + testAttempt,
                        },
                        'Port*': {
                            type: 'input',
                            value: '8080',
                        }
                    }
                });
                await inboundEPForm.submit('Create');

                const diagram = new Diagram(page.page, 'Event Integration');
                await diagram.init();
                await diagram.addMediator('Log');
                const diagramTitle = diagram.getDiagramTitle();

                expect(await diagramTitle).toBe('Event Integration: iso_inboundEP' + testAttempt);
            });

            await test.step('Edit ISO8583 Inbound Endpoint', async () => {
                // Edit ISO8583 Inbound Endpoint

                const diagram = new Diagram(page.page, 'Event Integration');
                await diagram.init();
                await diagram.edit();

                const inboundEPForm = new Form(page.page, 'Event Integration Form');
                await inboundEPForm.switchToFormView();
                await inboundEPForm.fill({
                    values: {
                        'Event Integration Name*': {
                            type: 'input',
                            value: 'iso_inboundEP2' + testAttempt,
                        },
                        'Port*': {
                            type: 'input',
                            value: '9090',
                        }
                    }
                });

                await inboundEPForm.submit('Update');

                await diagram.init();
                const diagramTitle = diagram.getDiagramTitle();
                expect(await diagramTitle).toBe('Event Integration: iso_inboundEP2' + testAttempt);
            });

            await test.step('Create new Kafka inbound endpoint', async () => {
                // Create Kafka inbound endpoint
                console.log('Creating Connection from project explorer: kafka_connection');
                const projectExplorer = new ProjectExplorer(page.page);
                console.log('Click Event Integrations + in Project Explorer');
                await projectExplorer.addArtifact(["Project testProject", "Event Integrations"]);

                const inboundEPSelector = new InboundEPForm(page.page);
                await inboundEPSelector.init();
                await inboundEPSelector.selectStoreType('Kafka (Inbound)', 'Kafka');

                const inboundEPForm = new Form(page.page, 'Event Integration Form');
                await inboundEPForm.switchToFormView();
                await inboundEPForm.fill({
                    values: {
                        'Event Integration Name*': {
                            type: 'input',
                            value: 'kafka_inboundEP' + testAttempt,
                        },
                        'Polling interval*': {
                            type: 'input',
                            value: '10',
                        },
                        'Topic Name*': {
                            type: 'input',
                            value: 'exampleTopic',
                        }
                    }
                });
                await inboundEPForm.submit('Create');

                const diagram = new Diagram(page.page, 'Event Integration');
                await diagram.init();
                await diagram.addMediator('Log');
                const diagramTitle = diagram.getDiagramTitle();

                expect(await diagramTitle).toBe('Event Integration: kafka_inboundEP' + testAttempt);
            });

            await test.step('Edit Kafka Inbound Endpoint', async () => {
                // Edit Kafka Inbound Endpoint

                const diagram = new Diagram(page.page, 'Event Integration');
                await diagram.init();
                await diagram.edit();

                const inboundEPForm = new Form(page.page, 'Event Integration Form');
                await inboundEPForm.switchToFormView();
                await inboundEPForm.fill({
                    values: {
                        'Event Integration Name*': {
                            type: 'input',
                            value: 'kafka_inboundEP2' + testAttempt,
                        },
                        'Polling interval*': {
                            type: 'input',
                            value: '20',
                        }
                    }
                });

                await inboundEPForm.submit('Update');

                await diagram.init();
                const diagramTitle = diagram.getDiagramTitle();
                expect(await diagramTitle).toBe('Event Integration: kafka_inboundEP2' + testAttempt);
            });

            await test.step('Create new Salesforce inbound endpoint', async () => {
                // Create Salesforce inbound endpoint
                console.log('Creating Connection from project explorer: salesforce_connection');
                const projectExplorer = new ProjectExplorer(page.page);
                console.log('Click Event Integrations + in Project Explorer');
                await projectExplorer.addArtifact(["Project testProject", "Event Integrations"]);

                const inboundEPSelector = new InboundEPForm(page.page);
                await inboundEPSelector.init();
                await inboundEPSelector.selectStoreType('Salesforce (Inbound)', 'Salesforce');

                const inboundEPForm = new Form(page.page, 'Event Integration Form');
                await inboundEPForm.switchToFormView();
                await inboundEPForm.fill({
                    values: {
                        'Event Integration Name*': {
                            type: 'input',
                            value: 'salesforce_inboundEP' + testAttempt,
                        },
                        'Polling interval*': {
                            type: 'input',
                            value: '10',
                        },
                        'Salesforce Object*': {
                            type: 'input',
                            value: 'exampleObject',
                        },
                        'Package Version*': {
                            type: 'input',
                            value: '1.0.0',
                        },
                        'User Name*': {
                            type: 'input',
                            value: 'destLocation',
                        },
                        'Password*': {
                            type: 'input',
                            value: 'password@123',
                        }
                    }
                });
                await inboundEPForm.submit('Create');

                const diagram = new Diagram(page.page, 'Event Integration');
                await diagram.init();
                await diagram.addMediator('Log');
                const diagramTitle = diagram.getDiagramTitle();

                expect(await diagramTitle).toBe('Event Integration: salesforce_inboundEP' + testAttempt);
            });

            await test.step('Edit Salesforce Inbound Endpoint', async () => {
                // Edit Salesforce Inbound Endpoint

                const diagram = new Diagram(page.page, 'Event Integration');
                await diagram.init();
                await diagram.edit();

                const inboundEPForm = new Form(page.page, 'Event Integration Form');
                await inboundEPForm.switchToFormView();
                await inboundEPForm.fill({
                    values: {
                        'Event Integration Name*': {
                            type: 'input',
                            value: 'salesforce_inboundEP2' + testAttempt,
                        },
                        'Polling interval*': {
                            type: 'input',
                            value: '20',
                        }
                    }
                });

                await inboundEPForm.submit('Update');

                await diagram.init();
                const diagramTitle = diagram.getDiagramTitle();
                expect(await diagramTitle).toBe('Event Integration: salesforce_inboundEP2' + testAttempt);
            });

            await test.step('Create new SMPP inbound endpoint', async () => {
                // Create SMPP inbound endpoint
                console.log('Creating Connection from project explorer: smpp_connection');
                const projectExplorer = new ProjectExplorer(page.page);
                console.log('Click Event Integrations + in Project Explorer');
                await projectExplorer.addArtifact(["Project testProject", "Event Integrations"]);

                const inboundEPSelector = new InboundEPForm(page.page);
                await inboundEPSelector.init();
                await inboundEPSelector.selectStoreType('SMPP (Inbound)', 'SMPP');

                const inboundEPForm = new Form(page.page, 'Event Integration Form');
                await inboundEPForm.switchToFormView();
                await inboundEPForm.fill({
                    values: {
                        'Event Integration Name*': {
                            type: 'input',
                            value: 'smpp_inboundEP' + testAttempt,
                        },
                        'System ID*': {
                            type: 'input',
                            value: '105',
                        },
                        'Password*': {
                            type: 'input',
                            value: 'password@123',
                        }
                    }
                });
                await inboundEPForm.submit('Create');

                const diagram = new Diagram(page.page, 'Event Integration');
                await diagram.init();
                await diagram.addMediator('Log');
                const diagramTitle = diagram.getDiagramTitle();

                expect(await diagramTitle).toBe('Event Integration: smpp_inboundEP' + testAttempt);
            });

            await test.step('Edit SMPP Inbound Endpoint', async () => {
                // Edit Amazon SQS Inbound Endpoint

                const diagram = new Diagram(page.page, 'Event Integration');
                await diagram.init();
                await diagram.edit();

                const inboundEPForm = new Form(page.page, 'Event Integration Form');
                await inboundEPForm.switchToFormView();
                await inboundEPForm.fill({
                    values: {
                        'Event Integration Name*': {
                            type: 'input',
                            value: 'smpp_inboundEP2' + testAttempt,
                        },
                        'System ID*': {
                            type: 'input',
                            value: '105',
                        }
                    }
                });

                await inboundEPForm.submit('Update');

                await diagram.init();
                const diagramTitle = diagram.getDiagramTitle();
                expect(await diagramTitle).toBe('Event Integration: smpp_inboundEP2' + testAttempt);
            });
        });
    });
}
