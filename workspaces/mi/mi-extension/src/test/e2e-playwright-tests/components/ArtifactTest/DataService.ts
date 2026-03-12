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
import { Form } from "../Form";

export class DataService {

    constructor(private _page: Page) {
    }

    public async init() {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");

        const overviewPage = new Overview(this._page);
        await overviewPage.init();
        await overviewPage.goToAddArtifact();

        const addArtifactPage = new AddArtifact(this._page);
        await addArtifactPage.init();
        await addArtifactPage.add('Data Service');
    }

    public async addRDBMS(name: string) {
        const dsWebView = await switchToIFrame('Data Service Form', this._page);
        if (!dsWebView) {
            throw new Error("Failed to switch to Data Service Form iframe");
        }
        const dsFrame = dsWebView.locator('div#root');
        await dsFrame.getByRole('textbox', { name: 'Data Service Name*' }).fill(name);
        await dsFrame.getByRole('textbox', { name: 'Description' }).fill('Test Ds');
        await dsFrame.getByText('Add Datasource').click();
        await dsFrame.getByRole('textbox', { name: 'Datasource Identifier*' }).fill('dataID');
        await dsFrame.locator('#dataSourceType div').first().click();
        await dsFrame.getByLabel('RDBMS').click();
        await dsFrame.getByRole('textbox', { name: 'Database Name*' }).fill('testDb');
        await dsFrame.getByRole('textbox', { name: 'Username*' }).fill('wso2');
        await dsFrame.getByRole('textbox', { name: 'Password' }).fill('wso2');
        await dsFrame.getByRole('button', { name: 'Next' }).click();
        await dsFrame.getByLabel('Continue without any database').click();
        await dsFrame.getByRole('button', { name: 'Create' }).click();
        await dsFrame.getByRole('button', { name: 'Create' }).click();
    }

    public async editRDBMS(prevName: string, newName: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Data Services', prevName], true);

        const webView = await switchToIFrame('DSS Resource Designer', this._page);
        if (!webView) {
            throw new Error("Failed to switch to DSS Resource Designer iframe");
        }
        const frame = webView.locator('div#root');
        await frame.getByTestId('edit-button').getByLabel('Icon Button').click();

        const dssWebView = await switchToIFrame('Data Service Form', this._page);
        if (!dssWebView) {
            throw new Error("Failed to switch to Data Service Form iframe");
        }
        await dssWebView.getByRole('textbox', { name: 'Data Service Name*' }).fill(newName);
        await dssWebView.getByRole('textbox', { name: 'Description' }).fill('New Test Ds');
        await frame.getByRole('button', { name: 'Save Changes' }).click();
    }

    public async addMongoDB(name: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        console.log("Navigated to project overview");
        await projectExplorer.findItem(['Project testProject', 'Data Services'], true);
        await this._page.getByLabel("Add Data Service").click();
        const dsWebView = await switchToIFrame("Data Service Form", this._page);
        if (!dsWebView) {
            throw new Error("Failed to switch to Data Service Form iframe");
        }
        const frame = dsWebView.locator('div#root');
        await frame.getByRole('textbox', { name: 'Data Service Name*' }).fill(name);
        await frame.getByRole('textbox', { name: 'Description' }).fill('Test Mongo');
        await frame.getByText('Add Datasource').click();
        const form = new Form(this._page, "Data Service Form", frame);
        await form.switchToFormView();
        await form.fill({
            values: {
                'Datasource Identifier*': {
                    type: 'input',
                    value: 'mongoID'
                },
                'Datasource Type': {
                    type: 'dropdown',
                    value: 'MongoDB'
                },
                'Servers*': {
                    type: 'input',
                    value: 'TestServer'
                },
                'Database Name*': {
                    type: 'input',
                    value: 'testDb'
                },
                'Username': {
                    type: 'input',
                    value: 'wso2'
                },
                'Password': {
                    type: 'input',
                    value: 'wso2'
                },
                'Authentication Source': {
                    type: 'input',
                    value: 'authSource'
                },
                'Connection Timeout': {
                    type: 'input',
                    value: '1000'
                },
                'Max Wait Time': {
                    type: 'input',
                    value: '1000'
                },
                'Socket Timeout': {
                    type: 'input',
                    value: '1000'
                },
                'Connections per Host': {
                    type: 'input',
                    value: '100'
                },
            }
        });
        await form.submit("Add");
        await frame.getByRole('button', { name: 'Create' }).click();
    }

    public async editMongoDB(prevName: string, newName: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Data Services', prevName], true);

        const webView = await switchToIFrame('DSS Resource Designer', this._page);
        if (!webView) {
            throw new Error("Failed to switch to DSS Resource Designer iframe");
        }
        const frame = webView.locator('div#root');
        await frame.waitFor();
        const editIcon = await frame.getByTestId('edit-button').getByLabel('Icon Button');
        await editIcon.waitFor();
        await editIcon.click();

        const dssWebView = await switchToIFrame('Data Service Form', this._page);
        if (!dssWebView) {
            throw new Error("Failed to switch to Data Service Form iframe");
        }
        await dssWebView.getByRole('textbox', { name: 'Data Service Name*' }).fill(newName);
        await dssWebView.getByRole('textbox', { name: 'Description' }).fill('New Test Mongo');
        await frame.locator('#table-edit-icon').click();
        const form = new Form(this._page, "Data Service Form", frame);
        await form.switchToFormView();
        await form.fill({
            values: {
                'Datasource Identifier*': {
                    type: 'input',
                    value: 'newMongoID'
                },
                'Datasource Type': {
                    type: 'dropdown',
                    value: 'MongoDB'
                },
                'Servers*': {
                    type: 'input',
                    value: 'NewTestServer'
                },
                'Database Name*': {
                    type: 'input',
                    value: 'newTestDb'
                },
                'Username': {
                    type: 'input',
                    value: 'wso2'
                },
                'Password': {
                    type: 'input',
                    value: 'wso2-col'
                },
                'Authentication Source': {
                    type: 'input',
                    value: 'newAuthSource'
                },
                'Connection Timeout': {
                    type: 'input',
                    value: '10'
                },
                'Max Wait Time': {
                    type: 'input',
                    value: '100'
                },
                'Socket Timeout': {
                    type: 'input',
                    value: '1'
                },
                'Connections per Host': {
                    type: 'input',
                    value: '1000'
                },
            }
        });
        await form.submit("Update");
        await frame.getByRole('button', { name: 'Save Changes' }).click();
    }

    public async addCassandraDB(name: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        console.log("Navigated to project overview");
        await projectExplorer.findItem(['Project testProject', 'Data Services'], true);
        await this._page.getByLabel("Add Data Service").click();
        const dsWebView = await switchToIFrame("Data Service Form", this._page);
        if (!dsWebView) {
            throw new Error("Failed to switch to Data Service Form iframe");
        }
        const frame = dsWebView.locator('div#root');
        await frame.getByRole('textbox', { name: 'Data Service Name*' }).fill(name);
        await frame.getByRole('textbox', { name: 'Description' }).fill('Test Cassandra');
        await frame.getByText('Add Datasource').click();
        const form = new Form(this._page, "Data Service Form", frame);
        await form.switchToFormView();
        await form.fill({
            values: {
                'Datasource Identifier*': {
                    type: 'input',
                    value: 'cassandraID'
                },
                'Datasource Type': {
                    type: 'dropdown',
                    value: 'Cassandra'
                },
                'Cassandra Servers*': {
                    type: 'input',
                    value: 'TestServer'
                },
                'Keyspace': {
                    type: 'input',
                    value: 'testKS'
                },
                'Port': {
                    type: 'input',
                    value: '3333'
                },
                'Cluster Name': {
                    type: 'input',
                    value: 'testCluster'
                },
                'Compression': {
                    type: 'dropdown',
                    value: 'SNAPPY'
                },
                'Username': {
                    type: 'input',
                    value: 'wso2'
                },
                'Password': {
                    type: 'input',
                    value: 'wso2'
                }
            }
        });
        await form.submit("Add");
        await frame.getByRole('button', { name: 'Create' }).click();
    }

    public async editCassandraDB(prevName: string, newName: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Data Services', prevName], true);

        const webView = await switchToIFrame('DSS Resource Designer', this._page);
        if (!webView) {
            throw new Error("Failed to switch to DSS Resource Designer iframe");
        }
        const frame = webView.locator('div#root');
        await frame.waitFor();
        const editIcon = await frame.getByTestId('edit-button').getByLabel('Icon Button');
        await editIcon.waitFor();
        await editIcon.click();

        const dssWebView = await switchToIFrame('Data Service Form', this._page);
        if (!dssWebView) {
            throw new Error("Failed to switch to Data Service Form iframe");
        }
        await dssWebView.getByRole('textbox', { name: 'Data Service Name*' }).fill(newName);
        await dssWebView.getByRole('textbox', { name: 'Description' }).fill('New Test Cassandra');
        
        await frame.locator('#table-edit-icon').click();
        const form = new Form(this._page, "Data Service Form", frame);
        await form.switchToFormView();
        await form.fill({
            values: {
                'Datasource Identifier*': {
                    type: 'input',
                    value: 'newCassandraID'
                },
                'Datasource Type': {
                    type: 'dropdown',
                    value: 'Cassandra'
                },
                'Cassandra Servers*': {
                    type: 'input',
                    value: 'NewTestServer'
                },
                'Keyspace': {
                    type: 'input',
                    value: 'newTestKS'
                },
                'Port': {
                    type: 'input',
                    value: '4444'
                },
                'Cluster Name': {
                    type: 'input',
                    value: 'newTestCluster'
                },
                'Compression': {
                    type: 'dropdown',
                    value: 'LZ4'
                },
                'Username': {
                    type: 'input',
                    value: 'wso2'
                },
                'Password': {
                    type: 'input',
                    value: 'wso2-col'
                },
            }
        });
        await form.submit("Update");
        await frame.getByRole('button', { name: 'Save Changes' }).click();
    }

    public async addCsvDs(name: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        console.log("Navigated to project overview");
        await projectExplorer.findItem(['Project testProject', 'Data Services'], true);
        await this._page.getByLabel("Add Data Service").click();
        const dsWebView = await switchToIFrame("Data Service Form", this._page);
        if (!dsWebView) {
            throw new Error("Failed to switch to Data Service Form iframe");
        }
        const frame = dsWebView.locator('div#root');
        await frame.getByRole('textbox', { name: 'Data Service Name*' }).fill(name);
        await frame.getByRole('textbox', { name: 'Description' }).fill('Test CSV');
        await frame.getByText('Add Datasource').click();
        const form = new Form(this._page, "Data Service Form", frame);
        await form.switchToFormView();
        await form.fill({
            values: {
                'Datasource Identifier*': {
                    type: 'input',
                    value: 'csvID'
                },
                'Datasource Type': {
                    type: 'dropdown',
                    value: 'CSV'
                },
                'CSV File Location*': {
                    type: 'input',
                    value: '/path/to/file.csv'
                },
                'Column Separator': {
                    type: 'input',
                    value: ','
                },
                'Start Reading from Row': {
                    type: 'input',
                    value: '2'
                },
                'Maximum Number of Rows to Read': {
                    type: 'input',
                    value: '5'
                },
                'Header Row': {
                    type: 'input',
                    value: '2'
                }
            }
        });
        await form.submit("Add");
        await frame.getByRole('button', { name: 'Create' }).click();
    }

    public async editCsvDs(prevName: string, newName: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Data Services', prevName], true);

        const webView = await switchToIFrame('DSS Resource Designer', this._page);
        if (!webView) {
            throw new Error("Failed to switch to DSS Resource Designer iframe");
        }
        const frame = webView.locator('div#root');
        await frame.waitFor();
        const editIcon = await frame.getByTestId('edit-button').getByLabel('Icon Button');
        await editIcon.waitFor();
        await editIcon.click();

        const dssWebView = await switchToIFrame('Data Service Form', this._page);
        if (!dssWebView) {
            throw new Error("Failed to switch to Data Service Form iframe");
        }
        await dssWebView.getByRole('textbox', { name: 'Data Service Name*' }).fill(newName);
        await dssWebView.getByRole('textbox', { name: 'Description' }).fill('New Test CSV');
        
        await frame.locator('#table-edit-icon').click();
        const form = new Form(this._page, "Data Service Form", frame);
        await form.switchToFormView();
        await form.fill({
            values: {
                'Datasource Identifier*': {
                    type: 'input',
                    value: 'newCsvID'
                },
                'Datasource Type': {
                    type: 'dropdown',
                    value: 'CSV'
                },
                'CSV File Location*': {
                    type: 'input',
                    value: '/new/path/to/file.csv'
                },
                'Column Separator': {
                    type: 'input',
                    value: ';'
                },
                'Start Reading from Row': {
                    type: 'input',
                    value: '3'
                },
                'Maximum Number of Rows to Read': {
                    type: 'input',
                    value: '10'
                },
                'Header Row': {
                    type: 'input',
                    value: '3'
                }
            }
        });
        await form.submit("Update");
        await frame.getByRole('button', { name: 'Save Changes' }).click();
    }

    public async addCarbonDs(name: string, testAttempt: number) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        console.log("Navigated to project overview");
        await projectExplorer.findItem(['Project testProject', 'Data Services'], true);
        await this._page.getByLabel("Add Data Service").click();
        const dsWebView = await switchToIFrame("Data Service Form", this._page);
        if (!dsWebView) {
            throw new Error("Failed to switch to Data Service Form iframe");
        }
        const frame = dsWebView.locator('div#root');
        await frame.getByRole('textbox', { name: 'Data Service Name*' }).fill(name + testAttempt);
        await frame.getByRole('textbox', { name: 'Description' }).fill('Test CSV');
        await frame.getByText('Add Datasource').click();
        const form = new Form(this._page, "Data Service Form", frame);
        await form.switchToFormView();
        await form.fill({
            values: {
                'Datasource Identifier*': {
                    type: 'input',
                    value: 'csvID'
                },
                'Datasource Type': {
                    type: 'dropdown',
                    value: 'Carbon Datasource'
                }
            }
        });
        await frame.getByLabel('Datasource Name').click();
        await frame.getByText('newTestDataSource' + testAttempt).click();
        await frame.getByLabel('Enable OData').click();
        await frame.getByText('Add Parameter').click();
        await frame.getByRole('textbox', { name: 'Carbon Username*' }).fill('wso2');
        await frame.getByRole('textbox', { name: 'DB Password*' }).fill('admin');
        await frame.getByRole('textbox', { name: 'DB Username*' }).fill('admin');
        await frame.getByText('Save').click();
        await frame.getByRole('button', { name: 'Add' }).click();
        await frame.getByRole('button', { name: 'Create' }).click();
    }

    public async editCarbonDs(prevName: string, newName: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Data Services', prevName], true);

        const webView = await switchToIFrame('DSS Resource Designer', this._page);
        if (!webView) {
            throw new Error("Failed to switch to DSS Resource Designer iframe");
        }
        const frame = webView.locator('div#root');
        await frame.waitFor();
        const editIcon = await frame.getByTestId('edit-button').getByLabel('Icon Button');
        await editIcon.waitFor();
        await editIcon.click();
        const dssWebView = await switchToIFrame('Data Service Form', this._page);
        if (!dssWebView) {
            throw new Error("Failed to switch to Data Service Form iframe");
        }
        await dssWebView.getByRole('textbox', { name: 'Data Service Name*' }).fill(newName);
        await dssWebView.getByRole('textbox', { name: 'Description' }).fill('New Test CSV');
        
        await frame.locator('#table-edit-icon').click();
        const form = new Form(this._page, "Data Service Form", frame);
        await form.switchToFormView();
        await form.fill({
            values: {
                'Datasource Identifier*': {
                    type: 'input',
                    value: 'newCsvID'
                },
                'Datasource Type': {
                    type: 'dropdown',
                    value: 'Carbon Datasource'
                }
            }
        });
        await frame.getByLabel('Enable OData').click();
        await frame.getByText('Update').click();
        await frame.getByRole('button', { name: 'Save Changes' }).click();
    }
}
