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

export class DataSource {

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
        await addArtifactPage.add('Data Source');
    }

    public async add(name: string) {
        const dsWebView = await switchToIFrame('Data Source Creation Form', this._page);
        if (!dsWebView) {
            throw new Error("Failed to switch to Data Source Creation Form iframe");
        }
        const dsFrame = dsWebView.locator('div#root');
        await dsFrame.getByRole('textbox', { name: 'Datasource Name*' }).fill(name);
        await dsFrame.locator('#dbEngine div').nth(1).click();
        await dsFrame.getByRole('textbox', { name: 'Description' }).fill('Test Ds');
        await dsFrame.getByRole('textbox', { name: 'Database Name*' }).fill('TestDB');
        await dsFrame.getByRole('textbox', { name: 'Username*' }).fill('wso2');
        await dsFrame.getByRole('textbox', { name: 'Password' }).click();
        await dsFrame.getByRole('textbox', { name: 'Password' }).fill('wso2');
        await dsFrame.getByRole('button', { name: 'Next' }).click();
        await dsFrame.getByLabel('Continue without any database').click();
        await dsFrame.getByRole('button', { name: 'Create' }).click();
    }

    public async edit(prevName: string, newName: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Data Sources', prevName], true);

        const webView = await switchToIFrame('Data Source Creation Form', this._page);
        if (!webView) {
            throw new Error("Failed to switch to Data Source Creation Form iframe");
        }
        const frame = webView.locator('div#root');
        await frame.getByRole('textbox', { name: 'Datasource Name*' }).fill(newName);
        await frame.locator('#dbEngine div').nth(2).click();
        await frame.getByRole('textbox', { name: 'Description' }).fill('New Test Ds');
        await frame.getByRole('textbox', { name: 'Database Name*' }).fill('NewTestDB');
        await frame.getByRole('textbox', { name: 'Username*' }).fill('newwso2');
        await frame.getByRole('textbox', { name: 'Password' }).fill('newwso2');
        await frame.getByRole('button', { name: 'Next' }).click();
        await frame.getByLabel('Continue without any database').click();
        await frame.getByRole('button', { name: 'Update' }).click();
    }

    public async addCustomDataSourceFromSidepanel(name: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        console.log("Navigated to project overview");
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Data Sources'], true);
        await this._page.getByLabel('Add Data Source').click();
        const form = new Form(this._page, 'Data Source Creation Form');
        await form.switchToFormView();
        const webView = await form.getWebview();
        await form.fill({
            values: {
                'Datasource Name*': {
                    type: 'input',
                    value: name,
                },
                'Datasource Type': {
                    type: 'dropdown',
                    value: 'Custom',
                },
                'Custom Datasource Type*': {
                    type: 'input',
                    value: 'CustomType',
                },
                'Custom Configuration *': {
                    type: 'textarea',
                    value: 'CustomConfig',
                },
                'Description': {
                    type: 'input',
                    value: 'Test Ds',
                },
            }
        });
        await form.submit('Create');
        console.log("Created custom data source");
    }

    public async editCustomDataSource(prevName: string, newName: string) {
        console.log("Editing custom data source with previous name: " + prevName + " and new name: " + newName);
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Data Sources', prevName], true);

        const form = new Form(this._page, 'Data Source Creation Form');
        await form.switchToFormView();
        const webView = await form.getWebview();
        const frame = webView.locator('div#root');
        await form.fill({
            values: {
                'Datasource Name*': {
                    type: 'input',
                    value: newName,
                },
                'Custom Datasource Type*': {
                    type: 'input',
                    value: 'NewCustomType',
                },
                'Custom Configuration *': {
                    type: 'textarea',
                    value: 'CustomConfig2',
                },
                'Description': {
                    type: 'input',
                    value: 'New Test Ds',
                },
            }
        });
        await form.submit('Update');
        console.log("Updated custom data source");
    }
}
