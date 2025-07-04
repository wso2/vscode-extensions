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

import { expect, Frame, Page } from "@playwright/test";
import { getVsCodeButton, switchToIFrame } from "@wso2/playwright-vscode-tester";
import { AddArtifact } from "../AddArtifact";
import { ProjectExplorer } from "../ProjectExplorer";
import { Overview } from "../Overview";
import { copyFile, page } from "../../Utils";
import { MACHINE_VIEW } from '@wso2/mi-core';
import path from "path";
import os from "os";
import { Form } from "../Form";

export class API {
    private webView!: Frame;

    constructor(private _page: Page) {
    }

    public async init(projectName: string = "testProject") {
        console.log("API init");
        let iframeTitle;

        try {
            const webview = await page.getCurrentWebview();
            iframeTitle = webview.title;
        } catch (error) {
            console.error("Error retrieving iframe title:", error);
            iframeTitle = null;
        }                         
        if (iframeTitle != MACHINE_VIEW.ADD_ARTIFACT) {
            const projectExplorer = new ProjectExplorer(this._page);
            await projectExplorer.goToOverview(projectName);
            console.log("Navigated to project overview");

            const overviewPage = new Overview(this._page);
            await overviewPage.init();
            console.log("Initialized overview page");
            await overviewPage.goToAddArtifact();
            console.log("Navigated to add artifact");
        }

        const addArtifactPage = new AddArtifact(this._page);
        await addArtifactPage.init();
        console.log("Initialized add artifact page");
        await addArtifactPage.add('API');
        console.log("Clicked on API");
        const apiWebView = await switchToIFrame('API Form', this._page);
        if (!apiWebView) {
            throw new Error("Failed to switch to API Form iframe");
        }
        console.log("Switched to API Form iframe");
        this.webView = apiWebView;
    }

    public async addAPI(name: string, context: string) {
        const frame = this.webView.locator('div#root');
        await frame.waitFor();
        await frame.getByRole('textbox', { name: 'Name*' }).fill(name);
        await frame.getByRole('textbox', { name: 'Context*' }).fill(context);
        await frame.locator('#version-type div').nth(1).click();
        await frame.getByLabel('Context', { exact: true }).click();
        const version = frame.getByRole('textbox', { name: 'Version' });
        await version.waitFor();
        await version.fill('1.0.1');
        await frame.getByRole('radio', { name: 'None' }).click();
        const submitBtn = await getVsCodeButton(frame, 'Create', 'primary');
        expect(await submitBtn.isEnabled()).toBeTruthy();
        await submitBtn.click();
    }

    public async editAPI(name: string, context: string) {
        const webView = await switchToIFrame('Service Designer', this._page);
        if (!webView) {
            throw new Error("Failed to switch to Service Designer iframe");
        }
        const frame = webView.locator('div#root');
        await frame.waitFor();
        const editBtn = frame.getByTestId('edit-button').getByLabel('Icon Button');
        await editBtn.waitFor();
        await editBtn.click();
        const apiFormWebView = await switchToIFrame('API Form', this._page);
        if (!apiFormWebView) {
            throw new Error("Failed to switch to API Form iframe");
        }
        const apiFormFrame = apiFormWebView.locator('div#root');
        await apiFormFrame.getByRole('textbox', { name: 'Name*' }).fill(name);
        await apiFormFrame.getByRole('textbox', { name: 'Context*' }).fill(context);
        await apiFormFrame.getByRole('textbox', { name: 'Version' }).fill('1.0.2');
        await apiFormFrame.getByLabel('Trace Enabled').click();
        await apiFormFrame.getByLabel('Statistics Enabled').click();
        await apiFormFrame.getByRole('button', { name: 'Add Handler' }).click();
        await apiFormFrame.getByRole('textbox', { name: 'Text field' }).fill('testClass');
        await apiFormFrame.getByRole('button', { name: 'Add Property' }).click();
        await apiFormFrame.locator('#property-name').getByPlaceholder('Property name').click();
        await apiFormFrame.locator('#property-name').getByPlaceholder('Property name').fill('testProp');
        await apiFormFrame.locator('#property-value').getByPlaceholder('Property value').click();
        await apiFormFrame.locator('#property-value').getByPlaceholder('Property value').fill('testValue');
        const submitBtn = await getVsCodeButton(frame, 'Save changes', 'primary');
        expect(await submitBtn.isEnabled()).toBeTruthy();
        await submitBtn.click();
        await submitBtn.waitFor({ state: 'detached' });
    }

    public async addResource(path: string) {
        const desWebView = await switchToIFrame('Service Designer', this._page);
        if (!desWebView) {
            throw new Error("Failed to switch to Service Designer iframe");
        }
        const frame = desWebView.locator('div#root');
        await frame.getByRole('button', { name: ' Resource' }).click();
        await frame.getByRole('textbox', { name: 'Resource Path' }).fill(path);
        await frame.getByText('Add Path Param').click();
        await frame.getByRole('textbox', { name: 'Path Parameter*' }).fill('p1');
        await frame.getByRole('button', { name: 'Add' }).click();
        await frame.getByText('Add Query Param').click();
        await frame.getByRole('textbox', { name: 'Query Parameter*' }).fill('q1');
        await frame.getByRole('button', { name: 'Add' }).click();
        await frame.getByLabel('GET').click();
        await frame.getByLabel('DELETE').click();
        await frame.getByRole('button', { name: 'Create' }).click();
    }

    public async editResource() {
        const webView = await switchToIFrame('Service Designer', this._page);
        if (!webView) {
            throw new Error("Failed to switch to Service Designer iframe");
        }
        const frame = webView.locator('div#root');
        await frame.getByTestId('service-design-view').locator('i').nth(1).click();
        // wait until go to source text appear
        await webView.getByRole('gridcell', { name: 'Edit' }).click();
        await frame.getByText('Add Query Param').click();
        await frame.getByRole('textbox', { name: 'Query Parameter*' }).fill('q2');
        await frame.getByRole('button', { name: 'Add' }).click();
        await frame.getByLabel('POST').click();
        await frame.getByRole('button', { name: 'Update' }).click();
    }

    public async goToSwaggerView(attemptId: number) {
        const desWebView = await switchToIFrame('Service Designer', this._page);
        if (!desWebView) {
            throw new Error("Failed to switch to Service Designer iframe");
        }
        console.log("Switched to Service Designer iframe");
        const serviceDesignerFrame = desWebView.locator('div#root');
        await serviceDesignerFrame.getByRole('button', { name: ' OpenAPI Spec' }).click();
        console.log("Clicked on OpenAPI Spec");
        const webviewFrame = this._page.locator('iframe.webview.ready').nth(1);
        await webviewFrame.waitFor();
        console.log("Found webview frame");
        const frame = webviewFrame.contentFrame();
        if (!frame) {
            throw new Error(`IFrame of Swagger View not found`);
        }
        const targetFrame = frame.locator(`iframe[title="Swagger View"]`);
        console.log("Waiting for target frame");
        await targetFrame.waitFor();
        const swaggerView = targetFrame.contentFrame();
        if (!swaggerView) {
            throw new Error(`IFrame of Swagger View not found`);
        }
        console.log("Found swagger view frame");
        // Save changes
        // Save all files
        await page.executePaletteCommand('File: Save All Files');
        const swaggerFrame = swaggerView.locator('div#root');
        console.log("Waiting for swagger frame");
        await swaggerFrame.waitFor();
        const getRes = swaggerFrame.getByRole('button', { name: 'GET /', exact: true });
        console.log("Waiting for GET resource button");
        await getRes.waitFor();
        console.log("GET resource button found");
        await getRes.click();
        console.log("Clicked on GET resource button");
        await swaggerView.getByRole('button', { name: 'Try it out' }).click();
        console.log("Clicked on try it out");
        await swaggerView.getByRole('button', { name: 'Execute' }).click();
        console.log("Clicked on execute");
        await page.page.waitForTimeout(1000);
        await page.executePaletteCommand('View: Close All Editor Groups');
        // wait for the editor to close
        await page.page.waitForTimeout(1000);
        try {
            const saveBtn = this._page.getByRole('button', { name: 'Save', exact: true });
            await saveBtn.waitFor({ timeout: 5000 });
            console.log("Save button found");
            await saveBtn.click();
            console.log("Clicked on save button");
        } catch (error) {
            console.log("Save button not found or not clickable, continuing anyway");
        }

        const projectExplorer = new ProjectExplorer(this._page);
        console.log("Navigating to project overview");
        const apiProjectName = `NewTestAPI${attemptId}:v1.0.2`;
        const item = await projectExplorer.findItem(['Project testProject', 'APIs', apiProjectName], true);
        console.log("Found project testProject");
        await item.getByRole('button', { name: 'Open Service Designer' }).click();
    }

    public async deleteResource() {
        const desWebView = await switchToIFrame('Service Designer', this._page);
        if (!desWebView) {
            throw new Error("Failed to switch to Service Designer iframe");
        }
        const frame = desWebView.locator('div#root');
        await frame.getByTestId('service-design-view').locator('i').first().click();
        await desWebView.getByRole('gridcell', { name: 'Delete' }).click();
    }

    public async deleteAPI() {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        console.log("Navigated to project overview");

        const overviewPage = new Overview(this._page);
        await overviewPage.init();
        const webview = await overviewPage.getWebView();
        console.log("Found project testProject");
        const openProjectOverviewBtn = this._page.getByLabel('Open Project Overview');
        await openProjectOverviewBtn.waitFor();
        await openProjectOverviewBtn.click();
        console.log("Clicked on open project overview");
        const vscodeButton = webview.locator('vscode-button > svg').nth(1);
        await vscodeButton.waitFor();
        await vscodeButton.click({force: true});
        const deleteBtn = webview.getByText('Delete');
        console.log("Clicked on delete API");
        await deleteBtn.waitFor();
        await deleteBtn.click();
        console.log("Clicked on delete");
    }

    public async createWSDLFromFile(name: string, context: string) {
        const overviewPage = new Overview(this._page);
        await overviewPage.init();
        console.log("Initialized overview page");
        await overviewPage.goToAddArtifact();
        const addArtifactPage = new AddArtifact(this._page);
        await addArtifactPage.init();
        console.log("Initialized add artifact page");
        await addArtifactPage.add('API');
        console.log("Clicked on API");
        const apiWebView = await switchToIFrame('API Form', this._page);
        if (!apiWebView) {
            throw new Error("Failed to switch to API Form iframe");
        }
        console.log("Switched to API Form iframe");

        const wsdlFile = path.join(__dirname, 'data', 'wsdl.xml');
        // Get the users home directory
        const homeDir = os.homedir();
        const desination = path.join(homeDir, 'wsdl.wsdl');
        console.log("Copying WSDL file to ", desination, " from ", wsdlFile);
        await copyFile(wsdlFile, desination);
        const apiForm = new Form(page.page, 'API Form');
        await apiForm.switchToFormView();
        await apiForm.fill({
            values: {
                'Name*': {
                    type: 'input',
                    value: name,
                },
                'Context*': {
                    type: 'input',
                    value: context,
                },
                'From WSDL file': {
                    type: 'radio',
                    value: 'checked',
                },
                'Select Location': {
                    type: 'file',
                    value: desination
                }
            },
        });
        await apiForm.submit();
        const webView = await switchToIFrame('Service Designer', this._page);
        if (!webView) {
            throw new Error("Failed to switch to Service Designer iframe");
        }
    }

    public async createWSDLFromSidePanel(name: string, context: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        console.log("Navigated to project overview");
        await projectExplorer.findItem(['Project testProject', 'APIs'], true);
        await this._page.getByLabel('Add API').click();
        console.log("Clicked on add API");
        const apiFormWebView = await switchToIFrame('API Form', this._page);
        if (!apiFormWebView) {
            throw new Error("Failed to switch to API Form iframe");
        }
        console.log("Switched to API Form iframe");
        const apiFormFrame = apiFormWebView.locator('div#root');
        await apiFormFrame.getByRole('textbox', { name: 'Name*' }).fill(name);
        await apiFormFrame.getByRole('textbox', { name: 'Context*' }).fill(context);
        console.log("Filled name and context");
        await apiFormFrame.getByLabel('From WSDL file').click();
        console.log("Clicked on From WSDL file");
        await apiFormFrame.getByRole('radio', { name: 'URL' }).click();
        await apiFormFrame.getByRole('radio', { name: 'URL' }).click();
        await apiFormFrame.getByRole('textbox', { name: 'WSDL URL' }).fill('https://www.w3schools.com/xml/tempconvert.asmx?WSDL');
        const submitBtn = await getVsCodeButton(apiFormFrame, 'Create', "primary");
        expect(await submitBtn.isEnabled()).toBeTruthy();
        await submitBtn.click({force: true});
        console.log("Clicked on create");
        const webView = await switchToIFrame('Service Designer', this._page, 90000);
        if (!webView) {
            throw new Error("Failed to switch to Service Designer iframe");
        }
        console.log("Switched to Service Designer iframe");
    }

    public async createOpenApi(name: string, context: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        console.log("Navigated to project overview");

        const overviewPage = new Overview(this._page);
        await overviewPage.init();
        await overviewPage.goToAddArtifact();
        console.log("Navigated to add artifact");

        const addArtifactPage = new AddArtifact(this._page);
        await addArtifactPage.init();
        await addArtifactPage.add('API');
        console.log("Clicked on API");

        const openAPIFile = path.join(__dirname, 'data', 'openapi.yaml');
        // Get the users home directory
        const homeDir = os.homedir();
        const desination = path.join(homeDir, 'openapi.yaml');
        console.log("Copying OpenAPI file to ", desination, " from ", openAPIFile);
        await copyFile(openAPIFile, desination);
        console.log("Copied OpenAPI file to ", desination);
        const apiFormWebView = await switchToIFrame('API Form', this._page);
        if (!apiFormWebView) {
            throw new Error("Failed to switch to API Form iframe");
        }
        const apiFormFrame = apiFormWebView.locator('div#root');
        await apiFormFrame.waitFor();
        await apiFormFrame.locator('#version-type div').nth(1).click();
        await apiFormFrame.getByLabel('Context', { exact: true }).click();
        const apiForm = new Form(page.page, 'API Form');
        await apiForm.switchToFormView();
        await apiForm.fill({
            values: {
                'Name*': {
                    type: 'input',
                    value: name,
                },
                'Context*': {
                    type: 'input',
                    value: context,
                },
                'Version': {
                    type: 'input',
                    value: "1.0.0",
                },
                'From OpenAPI definition': {
                    type: 'radio',
                    value: 'checked',
                },
                'Select Location': {
                    type: 'file',
                    value: desination
                }
            }
        });
        await apiForm.submit();
        const webView = await switchToIFrame('Service Designer', this._page);
        if (!webView) {
            throw new Error("Failed to switch to Service Designer iframe");
        }
        console.log("Switched to Service Designer iframe");
    }

    public async openDiagramView(name: string, resourcePath : string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'APIs', name, resourcePath], true);
        const webView = await switchToIFrame('Resource View', this._page);
        if (!webView) {
            throw new Error("Failed to switch to Resource View iframe");
        }
        await webView.getByText('Start').click();
    }
}
