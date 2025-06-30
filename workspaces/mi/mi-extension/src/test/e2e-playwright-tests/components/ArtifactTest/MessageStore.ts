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

import { Page } from "@playwright/test";
import { switchToIFrame } from "@wso2/playwright-vscode-tester";
import { ProjectExplorer } from "../ProjectExplorer";
import { AddArtifact } from "../AddArtifact";
import { Overview } from "../Overview";
import { page } from "../../Utils";
import { Form, ParamManagerValues } from "../Form";

export class MessageStore {

    constructor(private _page: Page) {
    }

    public async init() {
        const addArtifactPage = new AddArtifact(this._page);
        await addArtifactPage.init();
        await addArtifactPage.add('Message Store');
    }

    public async createMessageStoreFromProjectExplorer(msName: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Message Stores'], true);
        await this._page.getByLabel('Add Message Store').click();
        const msWebView = await switchToIFrame('Message Store Form', this._page);
        if (!msWebView) {
            throw new Error("Failed to switch to Message Store Form iframe");
        }

        await msWebView.getByText('In Memory Message Store').click();
        const messageStoreForm = new Form(page.page, 'Message Store Form');
        await messageStoreForm.switchToFormView();
        await messageStoreForm.fill({
            values: {
                'Message Store Name*': {
                    type: 'input',
                    value: msName,
                }
            }
        });
        await messageStoreForm.submit();

        const overview = await switchToIFrame('Project Overview', this._page);
        if (!overview) {
            throw new Error("Failed to switch to project overview iframe");
        }
    }

    public async createInMemoryMessageStore(msName: string) {
        await this.init();
        const msWebView = await switchToIFrame('Message Store Form', this._page);
        if (!msWebView) {
            throw new Error("Failed to switch to Message Store Form iframe");
        }

        await msWebView.getByText('In Memory Message Store').click();
        const messageStoreForm = new Form(page.page, 'Message Store Form');
        await messageStoreForm.switchToFormView();
        await messageStoreForm.fill({
            values: {
                'Message Store Name*': {
                    type: 'input',
                    value: msName,
                }
            }
        });
        await messageStoreForm.submit();

        const overview = await switchToIFrame('Project Overview', this._page);
        if (!overview) {
            throw new Error("Failed to switch to overview iframe");
        }
    }

    public async editInMemoryMessageStore(msName: string, msUpdatedName: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Message Stores', msName], true);
        const msWebview = await switchToIFrame('Message Store Form', this._page);
        if (!msWebview) {
            throw new Error("Failed to switch to Message Store Form iframe");
        }

        const messageStoreForm = new Form(page.page, 'Message Store Form');
        await messageStoreForm.switchToFormView();
        await messageStoreForm.fill({
            values: {
                'Message Store Name*': {
                    type: 'input',
                    value: msUpdatedName,
                }
            }
        });
        await messageStoreForm.submit("Update");

        const overview = await switchToIFrame('Project Overview', this._page);
        if (!overview) {
            throw new Error("Failed to switch to project overview iframe");
        }
    }

    public async createRabbitMQMessageStore(msName: string) {
        await this.init();
        const msWebView = await switchToIFrame('Message Store Form', this._page);
        if (!msWebView) {
            throw new Error("Failed to switch to Message Store Form iframe");
        }

        await msWebView.getByText('RabbitMQ Message Store').click();
        await msWebView.getByText('Miscellaneous Properties').click();
        await msWebView.getByText('Guaranteed Delivery').click();
        const messageStoreForm = new Form(page.page, 'Message Store Form');
        await messageStoreForm.switchToFormView();
        await messageStoreForm.fill({
            values: {
                'Message Store Name*': {
                    type: 'input',
                    value: msName,
                },
                'RabbitMQ Server Host Name*': {
                    type: 'input',
                    value: 'hostname',
                },
                'RabbitMQ Server Port*': {
                    type: 'input',
                    value: '5672',
                },
                'SSL Enabled': {
                    type: 'checkbox',
                    value: 'checked',
                },
                'RabbitMQ Queue Name': {
                    type: 'input',
                    value: 'queueName',
                },
                'RabbitMQ Exchange Name': {
                    type: 'input',
                    value: 'exchangeName',
                },
                'Routine Key': {
                    type: 'input',
                    value: 'routineKey',
                },
                'Username': {
                    type: 'input',
                    value: 'username',
                },
                'Password': {
                    type: 'input',
                    value: 'password',
                },
                'Virtual Host': {
                    type: 'input',
                    value: 'host',
                },
                'Enable Producer Guaranteed Delivery': {
                    type: 'checkbox',
                    value: 'checked',
                },
                'Fail Over Message Store': {
                    type: 'combo',
                    value: 'TestInMemoryMessageStoreEdited',
                    additionalProps: { hasMultipleValue: true }
                },
            }
        });
        await messageStoreForm.submit();

        const overview = await switchToIFrame('Project Overview', this._page);
        if (!overview) {
            throw new Error("Failed to switch to project overview iframe");
        }
    }

    public async editRabbitMQMessageStore(msName: string, msUpdatedName: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Message Stores', msName], true);
        const msWebview = await switchToIFrame('Message Store Form', this._page);
        if (!msWebview) {
            throw new Error("Failed to switch to Message Store Form iframe");
        }

        await msWebview.getByText('Miscellaneous Properties').click();
        await msWebview.getByText('Guaranteed Delivery').click();
        const messageStoreForm = new Form(page.page, 'Message Store Form');
        await messageStoreForm.switchToFormView();
        await messageStoreForm.fill({
            values: {
                'Message Store Name*': {
                    type: 'input',
                    value: msUpdatedName,
                },
                'RabbitMQ Server Host Name*': {
                    type: 'input',
                    value: 'hostnameEdited',
                },
                'RabbitMQ Server Port*': {
                    type: 'input',
                    value: '5673',
                },
                'SSL Enabled': {
                    type: 'checkbox',
                    value: 'checked',
                },
                'RabbitMQ Queue Name': {
                    type: 'input',
                    value: 'queueNameEdited',
                },
                'RabbitMQ Exchange Name': {
                    type: 'input',
                    value: 'exchangeNameEdited',
                },
                'Routine Key': {
                    type: 'input',
                    value: 'routineKeyEdited',
                },
                'Username': {
                    type: 'input',
                    value: 'usernameEdited',
                },
                'Password': {
                    type: 'input',
                    value: 'passwordEdited',
                },
                'Virtual Host': {
                    type: 'input',
                    value: 'hostEdited',
                },
                'Enable Producer Guaranteed Delivery': {
                    type: 'checkbox',
                    value: 'checked',
                },
                'Fail Over Message Store': {
                    type: 'combo',
                    value: 'TestInMemoryMessageStoreEdited',
                    additionalProps: { hasMultipleValue: true }
                },
            }
        });
        await messageStoreForm.submit("Update");

        const overview = await switchToIFrame('Project Overview', this._page);
        if (!overview) {
            throw new Error("Failed to switch to project overview iframe");
        }
    }

    public async createJMSMessageStore(msName: string) {
        await this.init();
        const msWebView = await switchToIFrame('Message Store Form', this._page);
        if (!msWebView) {
            throw new Error("Failed to switch to Message Store Form iframe");
        }

        await msWebView.getByText('JMS Message Store').click();
        await msWebView.getByText('Advanced Properties').click();
        await msWebView.getByText('Guaranteed Delivery').click();
        const messageStoreForm = new Form(page.page, 'Message Store Form');
        await messageStoreForm.switchToFormView();
        await messageStoreForm.fill({
            values: {
                'Message Store Name*': {
                    type: 'input',
                    value: msName,
                },
                'Pre configured Profiles': {
                    type: 'combo',
                    value: 'ActiveMQ',
                },
                'Initial Context Factory*': {
                    type: 'input',
                    value: 'ContextFactory',
                },
                'Provider URL*': {
                    type: 'input',
                    value: 'conf/jndi.properties',
                },
                'JNDI Queue Name': {
                    type: 'input',
                    value: 'queueName',
                },
                'Connection Factory': {
                    type: 'input',
                    value: 'QueueConnectionFactory',
                },
                'User Name': {
                    type: 'input',
                    value: 'username',
                },
                'Password': {
                    type: 'input',
                    value: 'password',
                },
                'Cache Connection': {
                    type: 'checkbox',
                    value: 'checked',
                },
                'JMS API Version': {
                    type: 'combo',
                    value: '1.0',
                },
                'Enable Producer Guaranteed Delivery': {
                    type: 'checkbox',
                    value: 'checked',
                },
                'Fail Over Message Store': {
                    type: 'combo',
                    value: 'TestInMemoryMessageStoreEdited',
                    additionalProps: { hasMultipleValue: true }
                },
            }
        });
        await messageStoreForm.submit();

        const overview = await switchToIFrame('Project Overview', this._page);
        if (!overview) {
            throw new Error("Failed to switch to project overview iframe");
        }
    }

    public async editJMSMessageStore(msName: string, msUpdatedName: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Message Stores', msName], true);
        const msWebview = await switchToIFrame('Message Store Form', this._page);
        if (!msWebview) {
            throw new Error("Failed to switch to Message Store Form iframe");
        }

        await msWebview.getByText('Advanced Properties').click();
        await msWebview.getByText('Guaranteed Delivery').click();
        const messageStoreForm = new Form(page.page, 'Message Store Form');
        await messageStoreForm.switchToFormView();
        await messageStoreForm.fill({
            values: {
                'Message Store Name*': {
                    type: 'input',
                    value: msUpdatedName,
                },
                'Initial Context Factory*': {
                    type: 'input',
                    value: 'ContextFactoryEdited',
                },
                'Provider URL*': {
                    type: 'input',
                    value: 'conf/jndi-edited.properties',
                },
                'JNDI Queue Name': {
                    type: 'input',
                    value: 'queueNameEdited',
                },
                'Connection Factory': {
                    type: 'input',
                    value: 'QueueConnectionFactoryEdited',
                },
                'User Name': {
                    type: 'input',
                    value: 'usernameEdited',
                },
                'Password': {
                    type: 'input',
                    value: 'passwordEdited',
                },
                'Cache Connection': {
                    type: 'checkbox',
                    value: 'checked',
                },
                'JMS API Version': {
                    type: 'combo',
                    value: '1.1',
                },
                'Enable Producer Guaranteed Delivery': {
                    type: 'checkbox',
                    value: 'checked',
                },
                'Fail Over Message Store': {
                    type: 'combo',
                    value: 'TestInMemoryMessageStoreEdited',
                    additionalProps: { hasMultipleValue: true }
                },
            }
        });
        await messageStoreForm.submit("Update");

        const overview = await switchToIFrame('Project Overview', this._page);
        if (!overview) {
            throw new Error("Failed to switch to project overview iframe");
        }
    }

    public async createJDBCMessageStore(msName: string) {
        await this.init();
        const msWebView = await switchToIFrame('Message Store Form', this._page);
        if (!msWebView) {
            throw new Error("Failed to switch to Message Store Form iframe");
        }

        await msWebView.getByText('JDBC Message Store').click();
        await msWebView.getByText('Guaranteed Delivery').click();
        const messageStoreForm = new Form(page.page, 'Message Store Form');
        await messageStoreForm.switchToFormView();
        await messageStoreForm.fill({
            values: {
                'Message Store Name*': {
                    type: 'input',
                    value: msName,
                },
                'Data Base Table*': {
                    type: 'input',
                    value: 'tableName',
                },
                'Connection Information Type': {
                    type: 'combo',
                    value: 'Pool',
                },
                'RDBMS Type': {
                    type: 'combo',
                    value: 'MySQL',
                },
                'URL*': {
                    type: 'input',
                    value: 'jdbc:mysql://localhost:3306/dbname',
                },
                'User*': {
                    type: 'input',
                    value: 'username',
                },
                'Password': {
                    type: 'input',
                    value: 'password',
                },
                'Enable Producer Guaranteed Delivery': {
                    type: 'checkbox',
                    value: 'checked',
                },
                'Fail Over Message Store': {
                    type: 'combo',
                    value: 'TestInMemoryMessageStoreEdited',
                    additionalProps: { hasMultipleValue: true }
                },
            }
        });
        await messageStoreForm.submit();

        const overview = await switchToIFrame('Project Overview', this._page);
        if (!overview) {
            throw new Error("Failed to switch to project overview iframe");
        }
    }

    public async editJDBCMessageStore(msName: string, msUpdatedName: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Message Stores', msName], true);
        const msWebview = await switchToIFrame('Message Store Form', this._page);
        if (!msWebview) {
            throw new Error("Failed to switch to Message Store Form iframe");
        }

        await msWebview.getByText('Guaranteed Delivery').click();
        const messageStoreForm = new Form(page.page, 'Message Store Form');
        await messageStoreForm.switchToFormView();
        await messageStoreForm.fill({
            values: {
                'Message Store Name*': {
                    type: 'input',
                    value: msUpdatedName,
                },
                'Data Base Table*': {
                    type: 'input',
                    value: 'tableNameEdited',
                },
                'Connection Information Type': {
                    type: 'combo',
                    value: 'Carbon Datasource',
                },
                'Data Source Name*': {
                    type: 'input',
                    value: 'TestDatasource',
                },
                'Enable Producer Guaranteed Delivery': {
                    type: 'checkbox',
                    value: 'checked',
                },
                'Fail Over Message Store': {
                    type: 'combo',
                    value: 'TestInMemoryMessageStoreEdited',
                    additionalProps: { hasMultipleValue: true }
                },
            }
        });
        await messageStoreForm.submit("Update");

        const overview = await switchToIFrame('Project Overview', this._page);
        if (!overview) {
            throw new Error("Failed to switch to project overview iframe");
        }
    }

    public async createCustomMessageStore(msName: string) {
        await this.init();
        const msWebView = await switchToIFrame('Message Store Form', this._page);
        if (!msWebView) {
            throw new Error("Failed to switch to Message Store Form iframe");
        }

        await msWebView.getByText('Custom Message Store').click();
        const messageStoreForm = new Form(page.page, 'Message Store Form');
        await messageStoreForm.switchToFormView();
        await messageStoreForm.fill({
            values: {
                'Message Store Name*': {
                    type: 'input',
                    value: msName,
                },
                'Provide Class*': {
                    type: 'input',
                    value: 'ProvideClass',
                }
            }
        });
        const paramValues: ParamManagerValues = {
            "param1": "value1",
            "param2": "value2",
            "param3": "value3"
        };
        await messageStoreForm.fillParamManager(paramValues);
        await messageStoreForm.submit();

        const overview = await switchToIFrame('Project Overview', this._page);
        if (!overview) {
            throw new Error("Failed to switch to project overview iframe");
        }
    }

    public async editCustomMessageStore(msName: string, msUpdatedName: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Message Stores', msName], true);
        const msWebview = await switchToIFrame('Message Store Form', this._page);
        if (!msWebview) {
            throw new Error("Failed to switch to Message Store Form iframe");
        }
        const messageStoreForm = new Form(page.page, 'Message Store Form');
        await messageStoreForm.switchToFormView();
        await messageStoreForm.fill({
            values: {
                'Message Store Name*': {
                    type: 'input',
                    value: msUpdatedName,
                },
                'Provide Class*': {
                    type: 'input',
                    value: 'ProviderClassEdited',
                }
            }
        });
        const paramValues: ParamManagerValues = {
            "param4": "value1",
            "param5": "value2",
            "param6": "value3"
        };
        await messageStoreForm.fillParamManager(paramValues);
        await messageStoreForm.submit("Update");

        const overview = await switchToIFrame('Project Overview', this._page);
        if (!overview) {
            throw new Error("Failed to switch to project overview iframe");
        }
    }
}
