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
import { Form } from './../components/Form';
import { AddArtifact } from './../components/AddArtifact';
import { ServiceDesigner } from './../components/ServiceDesigner';
import { initTest, page } from '../Utils';
import { MACHINE_VIEW } from '@wso2/mi-core';
import { Overview } from '../components/Overview';
import { Diagram, SidePanel } from './../components/Diagram';
import { Resource } from '../components/ArtifactTest/Resource';

export default function createTests() {
    test.describe("DB Report Mediator Tests", {
        tag: '@group4',
    }, async () => {
        initTest();

        test("DB Report Mediator Tests", async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            await test.step('Create new API', async () => {
                // wait until window reload
                const { title: iframeTitle } = await page.getCurrentWebview();

                if (iframeTitle === MACHINE_VIEW.Overview) {
                    const overviewPage = new Overview(page.page);
                    await overviewPage.init();
                    await overviewPage.goToAddArtifact();
                }

                const addArtifactPage = new AddArtifact(page.page);
                await addArtifactPage.init();
                await addArtifactPage.add('API');

                const apiForm = new Form(page.page, 'API Form');
                await apiForm.switchToFormView();
                await apiForm.fill({
                    values: {
                        'Name*': {
                            type: 'input',
                            value: 'dbReportMediatorAPI' + testAttempt,
                        },
                        'Context*': {
                            type: 'input',
                            value: '/dbReportMediatorAPI' + testAttempt,
                        },
                    }
                });
                await apiForm.submit();
            });

            await test.step('Service designer', async () => {
                // service designer
                const serviceDesigner = new ServiceDesigner(page.page);
                await serviceDesigner.init();
                const resource = await serviceDesigner.resource('GET', '/');
                await resource.click();
            });

            await test.step('Add DB Report mediator into resource with custom values', async () => {
                const diagram = new Diagram(page.page, 'Resource');
                await diagram.init();
                await diagram.clickPlusButtonByIndex(0);
                const sidePanel = new SidePanel(diagram.getDiagramWebView());
                await sidePanel.init();
                await sidePanel.search('DB Report');
                await sidePanel.selectMediator('DB\\ Report');
                const form = await sidePanel.getForm();
                await form.fill({
                    values: {
                        'Connection Type': {
                            type: 'combo',
                            value: 'DB_CONNECTION',
                        },
                        'Connection DB Type': {
                            type: 'combo',
                            value: 'OTHER',
                        },
                        'Connection DB Driver*': {
                            type: 'input',
                            value: 'mysql driver',
                        },
                        'Connection URL*': {
                            type: 'input',
                            value: 'connection url',
                        },
                        'Connection Username*': {
                            type: 'input',
                            value: 'root',
                        },
                        'Connection Password*': {
                            type: 'input',
                            value: 'password',
                        },
                        'Description': {
                            type: 'input',
                            value: 'initial db report mediator',
                        }
                    }
                })
                await form.submit('Add');
                await diagram.getMediator('dbreport');
            });

            await test.step('Edit DB Report mediator in resource', async () => {
                const diagram = new Diagram(page.page, 'Resource');
                await diagram.init();
                const mediator = await diagram.getMediator('dbreport');
                await mediator.edit({
                    values: {
                        'Connection DB Driver*': {
                            type: 'input',
                            value: 'mongodb driver',
                        },
                        'Description': {
                            type: 'input',
                            value: 'edited db report mediator',
                        }
                    }
                });
                await diagram.getMediator('dbreport');
            });

            await test.step('Navigate to new resource creation page with add new button', async () => {
                const diagram = new Diagram(page.page, 'Resource');
                await diagram.init();
                const mediator = await diagram.getMediator('dbreport');
                await mediator.click();
                const editForm = await mediator.getEditForm();
                await editForm.fill({
                    values: {
                        'Is Registry Based Driver Config': {
                            type: 'checkbox',
                            value: 'checked',
                        },
                        'Is Registry Based URL Config': {
                            type: 'checkbox',
                            value: 'checked',
                        },
                        'Is Registry Based User Config': {
                            type: 'checkbox',
                            value: 'checked',
                        },
                        'Is Registry Based Pass Config': {
                            type: 'checkbox',
                            value: 'checked',
                        },
                    }
                });
                const resource = new Resource(page.page);

                await editForm.clickAddNewForField('Registry Based Connection DB Driver');
                await resource.addFromTemplate({
                    name: 'driver',
                    type: 'JSON File',
                    registryPath: 'json'
                }, true);

                await editForm.clickAddNewForField('Registry Based URL Config Key');
                await resource.addFromTemplate({
                    name: 'urlConfig',
                    type: 'JSON File',
                    registryPath: 'json'
                }, true);

                await editForm.clickAddNewForField('Registry Based User Config Key');
                await resource.addFromTemplate({
                    name: 'user',
                    type: 'JSON File',
                    registryPath: 'json'
                }, true);

                await editForm.clickAddNewForField('Registry Based Pass Config Key');
                await resource.addFromTemplate({
                    name: 'pass',
                    type: 'JSON File',
                    registryPath: 'json'
                }, true);
                await editForm.submit('Update');
                await diagram.getMediator('dbreport');
            });

            await test.step('Select already created resources from drop down', async () => {
                const diagram = new Diagram(page.page, 'Resource');
                await diagram.init();
                const mediator = await diagram.getMediator('dbreport');
                await mediator.click();
                const editForm = await mediator.getEditForm();
                await editForm.fill({
                    values: {
                        'Registry Based Connection DB Driver': {
                            type: 'combo',
                            value: 'json/urlConfig.json',
                        },
                        'Registry Based URL Config Key': {
                            type: 'combo',
                            value: 'json/driver.json',
                        },
                        'Registry Based User Config Key': {
                            type: 'combo',
                            value: 'json/pass.json',
                        },
                        'Registry Based Pass Config Key': {
                            type: 'combo',
                            value: 'json/user.json',
                        },
                    }
                });
                await editForm.submit('Update');
                await diagram.getMediator('dbreport');
            });

            await test.step('Add SQL statements', async () => {
                const diagram = new Diagram(page.page, 'Resource');
                await diagram.init();
                const mediator = await diagram.getMediator('dbreport');
                await mediator.click();
                const editForm = await mediator.getEditForm();

                // 1st sql statement
                const sqlStatementManager = await editForm.getDefaultParamManager('sqlStatements');
                let sqlStatementForm = await sqlStatementManager.getAddNewForm();
                await sqlStatementForm.fill({
                    values: {
                        'Query String*': {
                            type: 'input',
                            value: 'select * from customer;'
                        }
                    }
                });
                await sqlStatementForm.submit('Add');

                // 2nd sql statement
                sqlStatementForm = await sqlStatementManager.getAddNewForm();
                await sqlStatementForm.fill({
                    values: {
                        'Query String*': {
                            type: 'input',
                            value: 'select * from teacher;'
                        }
                    }
                });

                const parameterManager = await sqlStatementForm.getDefaultParamManager('parameters');
                let parameterForm = await parameterManager.getAddNewForm();
                await parameterForm.fill({
                    values: {
                        'Value Literal*': {
                            type: 'input',
                            value: 'Sam'
                        }
                    }
                });
                await parameterForm.submit('Add');

                parameterForm = await parameterManager.getAddNewForm();
                await parameterForm.fill({
                    values: {
                        'Data Type': {
                            type: 'combo',
                            value: 'LONGVARCHAR'
                        },
                        'Value Type': {
                            type: 'combo',
                            value: 'EXPRESSION'
                        },
                        'Value Expression*': {
                            type: 'expression',
                            value: '$ctx:username'
                        }
                    }
                });
                await parameterForm.submit('Add');
                await sqlStatementForm.submit('Add');

                // 3rd sql statement
                sqlStatementForm = await sqlStatementManager.getAddNewForm();
                await sqlStatementForm.fill({
                    values: {
                        'Query String*': {
                            type: 'input',
                            value: 'select * from school;'
                        }
                    }
                });

                const resultManager = await sqlStatementForm.getDefaultParamManager('results');
                let resultForm = await resultManager.getAddNewForm();
                await resultForm.fill({
                    values: {
                        'Property Name': {
                            type: 'input',
                            value: 'field'
                        },
                        'Column ID': {
                            type: 'input',
                            value: 'student count'
                        }
                    }
                });
                await resultForm.submit('Add');
                await sqlStatementForm.submit('Add');

                // 4th sql statement
                sqlStatementForm = await sqlStatementManager.getAddNewForm();
                await sqlStatementForm.fill({
                    values: {
                        'Query String*': {
                            type: 'input',
                            value: 'select * from district;'
                        }
                    }
                });

                parameterForm = await parameterManager.getAddNewForm();
                await parameterForm.fill({
                    values: {
                        'Data Type': {
                            type: 'combo',
                            value: 'NUMERIC'
                        },
                        'Value Type': {
                            type: 'combo',
                            value: 'LITERAL'
                        },
                        'Value Literal*': {
                            type: 'input',
                            value: '12'
                        }
                    }
                });
                await parameterForm.submit('Add');
                parameterForm = await parameterManager.getAddNewForm();
                await parameterForm.fill({
                    values: {
                        'Data Type': {
                            type: 'combo',
                            value: 'NUMERIC'
                        },
                        'Value Type': {
                            type: 'combo',
                            value: 'EXPRESSION'
                        },
                        'Value Expression*': {
                            type: 'expression',
                            value: '$ctx:value'
                        }
                    }
                });
                await parameterForm.submit('Add');

                resultForm = await resultManager.getAddNewForm();
                await resultForm.fill({
                    values: {
                        'Property Name': {
                            type: 'input',
                            value: 'result1'
                        },
                        'Column ID': {
                            type: 'input',
                            value: 'count1'
                        }
                    }
                });
                await resultForm.submit('Add');

                resultForm = await resultManager.getAddNewForm();
                await resultForm.fill({
                    values: {
                        'Property Name': {
                            type: 'input',
                            value: 'result2'
                        },
                        'Column ID': {
                            type: 'input',
                            value: 'count2'
                        }
                    }
                });
                await resultForm.submit('Add');
                await sqlStatementForm.submit('Add');
                await editForm.submit('Update');
                await diagram.getMediator('dbreport');
            });

            await test.step('Edit SQL statements', async () => {
                const diagram = new Diagram(page.page, 'Resource');
                await diagram.init();
                const mediator = await diagram.getMediator('dbreport');
                await mediator.click();
                const editForm = await mediator.getEditForm();
                const sqlStatementManager = await editForm.getDefaultParamManager('sqlStatements');
                const sqlStatementForm = await sqlStatementManager.getEditForm(3);
                await sqlStatementForm.fill({
                    values: {
                        'Query String*': {
                            type: 'input',
                            value: 'select * from foreign-country;'
                        }
                    }
                });

                // edit parameter
                const parameterManager = await sqlStatementForm.getDefaultParamManager('parameters');
                const parameterForm = await parameterManager.getEditForm(1);
                await parameterForm.fill({
                    values: {
                        'Data Type': {
                            type: 'combo',
                            value: 'DECIMAL'
                        }
                    }
                });
                await parameterForm.submit('Update');

                // edit result 
                const resultManager = await sqlStatementForm.getDefaultParamManager('results');
                const resultForm = await resultManager.getEditForm(1);
                await resultForm.fill({
                    values: {
                        'Column ID': {
                            type: 'input',
                            value: 'column1'
                        }
                    }
                });
                await resultForm.submit('Update');
                await sqlStatementForm.submit('Update');
                await editForm.submit('Update');
            });

            await test.step('Delete SQL statements', async () => {
                const diagram = new Diagram(page.page, 'Resource');
                await diagram.init();
                const mediator = await diagram.getMediator('dbreport');
                await mediator.click();
                const editForm = await mediator.getEditForm();
                const sqlStatementManager = await editForm.getDefaultParamManager('sqlStatements');
                await sqlStatementManager.deleteParam(1);

                // delete parameter 
                const sqlStatementForm = await sqlStatementManager.getEditForm(2);
                const parameterManager = await sqlStatementForm.getDefaultParamManager('parameters');
                await parameterManager.deleteParam(1);

                // delete result
                const resultManager = await sqlStatementForm.getDefaultParamManager('results');
                await resultManager.deleteParam(1);
                await sqlStatementForm.submit('Update');
                await editForm.submit('Update');
            });

            await test.step('Delete DB Report mediator', async () => {
                const diagram = new Diagram(page.page, 'Resource');
                await diagram.init();
                const mediator = await diagram.getMediator('dbreport');
                await mediator.delete();
                const logMediatorsCount = await diagram.getMediatorsCount('dbreport');
                expect(logMediatorsCount).toBe(0);
            });
        });
    });
}
