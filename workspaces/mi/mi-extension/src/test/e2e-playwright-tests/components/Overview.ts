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

import { Frame, Page } from "@playwright/test";
import { Form, getVsCodeButton, switchToIFrame } from "@wso2/playwright-vscode-tester";
import { ProjectExplorer } from "./ProjectExplorer";
import { MACHINE_VIEW } from '@wso2/mi-core';
import { page } from '../Utils';

export class Overview {
    private webView!: Frame;

    constructor(private _page: Page) {
    }

    public async init(projectName : string = "testProject", isMultiWorkspace : boolean = false) {
        let iframeTitle;

        try {
            const webview = await page.getCurrentWebview();
            iframeTitle = webview.title;
        } catch (error) {
            console.error("Error retrieving iframe title:", error);
            iframeTitle = null;
        }
        if (iframeTitle != MACHINE_VIEW.Overview) {
            const projectExplorer = new ProjectExplorer(this._page);
            await projectExplorer.goToOverview(projectName);
        }
        const webview = isMultiWorkspace ? 
            await switchToIFrame(`Project Overview - ${projectName}`, this._page) : 
            await switchToIFrame("Project Overview", this._page);
        if (!webview) {
            throw new Error("Failed to switch to Overview iframe");
        }
        this.webView = webview;
    }
    public async createNewProject() {
        const container = this.webView.locator('div#root');
        (await getVsCodeButton(container, 'Create New Project', 'primary')).click();
    }

    public async checkForArtifact(artifactType: string, artifactName: string) {
        const artifactTypeSection = await this.webView.waitForSelector(`h3:text("${artifactType}") >> ..`);
        const artifact = await artifactTypeSection.waitForSelector(`div:text("${artifactName}") >> ..`);
        if (await artifact.isVisible()) {
            return true;
        }
        return false;
    }

    public async selectArtifact(artifactType: string, artifactName: string) {
        const artifactTypeSection = await this.webView.waitForSelector(`h3:text("${artifactType}") >> ..`);
        const artifact = await artifactTypeSection.waitForSelector(`div:text("${artifactName}") >> ..`);
        await artifact.click();
    }

    public async goToAddArtifact() {
        const addArtifactBtn = await this.webView.waitForSelector(`vscode-button:text("Add Artifact")`);
        await addArtifactBtn.click();
    }

    public async diagramRenderingForApi(api : string) {
        await this.webView.getByText(api, { exact: true }).click();
    }

    public async getWebView() {
        return this.webView;
    }

    public async getProjectSummary() {
        const projectInfoIcon = await this.webView.getByRole('heading', { name: 'Project Information Icon' }).locator('i');
        await projectInfoIcon.click();
    }

    public async updateProjectVersion(version: string) {
        const popupPanel = this.webView.locator('#popUpPanel');
        await popupPanel.waitFor();
        await popupPanel.getByRole('textbox', { name: 'Version*The version of the' }).fill(version);
        const saveChangesButton = await getVsCodeButton(popupPanel, 'Save Changes', 'primary');
        await saveChangesButton.click();
        await popupPanel.waitFor({ state: 'detached', timeout: 100000 });
    }

    public async addOtherDependencies() {
        const manageDependency = this.webView.locator('[id="link-external-manage-dependencies-Other\\ Dependencies"] i');
        await manageDependency.waitFor();
        await manageDependency.click();
        const popupPanel = this.webView.locator('#popUpPanel');
        await popupPanel.waitFor();
        await popupPanel.getByText('Add Dependency').click();
        await popupPanel.getByRole('textbox', { name: 'Group ID*' }).waitFor();
        const form = new Form(page.page, 'Project Overview');
        await form.switchToFormView();
        await form.fill({
            values: {
                'Group ID*': {
                    type: 'input',
                    value: 'mysql',
                },
                'Artifact ID*': {
                    type: 'input',
                    value: 'mysql-connector-java',
                },
                'Version*': {
                    type: 'input',
                    value: '8.0.33',
                }
            }
        });
        await page.page.waitForTimeout(2000);
        await form.submit('Save');
        console.log("Saved the dependency");
        const mySqlDependency = popupPanel.locator('[data-testid^="mysql-connector-java   8.0.33"]:has-text("mysql mysql-connector-java")');
        await mySqlDependency.waitFor();
        console.log("Located the dependency");
        const updateButton = await getVsCodeButton(this.webView, 'Update Dependencies', 'primary');
        await updateButton.waitFor();
        await page.page.waitForTimeout(2000);
        await updateButton.click();
        await updateButton.waitFor({ state: 'detached' });
        await popupPanel.waitFor({ state: 'detached' });
        await page.page.waitForTimeout(4000);
    }

    public async editOtherDependencies() {
        const manageDependency = this.webView.locator('[id="link-external-manage-dependencies-Other\\ Dependencies"] i');
        await manageDependency.waitFor();
        await manageDependency.click();
        const popupPanel = this.webView.locator('#popUpPanel');
        await popupPanel.waitFor();
        await popupPanel.locator('h2:has-text("Other Dependencies")').waitFor({ state: 'visible', timeout: 5000 });
        await page.page.waitForTimeout(2000);
        const mySqlDependency = popupPanel.locator('[data-testid^="mysql-connector-java   8.0.33"]:has-text("mysql mysql-connector-java")');
        await mySqlDependency.waitFor();
        await mySqlDependency.click();
        const form = new Form(page.page, 'Project Overview');
        await form.switchToFormView();
        await form.fill({
            values: {
                'Artifact ID*': {
                    type: 'input',
                    value: 'mysql-connector--java',
                }
            }
        });
        await page.page.waitForTimeout(2000);
        await form.submit('Save');
        const updateBtn = await getVsCodeButton(this.webView, 'Update Dependencies', 'primary');
        await updateBtn.waitFor();
        await page.page.waitForTimeout(2000);
        await updateBtn.click();
        await updateBtn.waitFor({ state: 'detached' });
        await popupPanel.waitFor({ state: 'detached' });
        await page.page.waitForTimeout(2000);
    }

    public async deleteOtherDependencies() {
        const manageDependency = this.webView.locator('[id="link-external-manage-dependencies-Other\\ Dependencies"] i');
        await manageDependency.waitFor();
        await manageDependency.click();
        const popupPanel = this.webView.locator('#popUpPanel');
        await popupPanel.waitFor();
        await popupPanel.locator('h2:has-text("Other Dependencies")').waitFor();
        await popupPanel.waitFor();
        await page.page.waitForTimeout(2000);
        
        // More robust selector that works cross-platform
        const deleteBtn = this.webView.locator(`#paramTrash-0`);
        await deleteBtn.waitFor({ timeout: 10000 });
        await deleteBtn.click();

        const updateButton = await getVsCodeButton(this.webView, 'Update Dependencies', 'primary');
        await updateButton.waitFor();
        await page.page.waitForTimeout(2000);
        await updateButton.click();
        await popupPanel.waitFor({ state: 'detached' });
    }

    public async addConnectorDependencies() {
        await this.webView.locator('[id="link-external-manage-dependencies-Connector\\ Dependencies"] i').click();
        const popupPanel = this.webView.locator('#popUpPanel');
        await popupPanel.waitFor();
        await popupPanel.locator('h2:has-text("Connector Dependencies")').waitFor();
        await this.webView.getByText('Add Dependency').click();
        await popupPanel.getByRole('textbox', { name: 'Group ID*' }).waitFor();
        const form = new Form(page.page, 'Project Overview');
        await form.switchToFormView();
        await form.fill({
            values: {
                'Group ID*': {
                    type: 'input',
                    value: 'org.wso2.integration.connector',
                },
                'Artifact ID*': {
                    type: 'input',
                    value: 'mi-connector-amazonsqs',
                },
                'Version*': {
                    type: 'input',
                    value: '2.0.3',
                }
            }
        });
        await form.submit('Save');
        console.log("Saved the dependency");
        const amazonSqsDependency = popupPanel.locator('[data-testid^="mi-connector-amazonsqs   2.0.3"]:has-text("mi-connector-amazonsqs")');
        await amazonSqsDependency.waitFor();
        await page.page.waitForTimeout(2000);
        console.log("Located the dependency");
        const updateButton = await getVsCodeButton(this.webView, 'Update Dependencies', 'primary');
        await updateButton.click();
        await updateButton.waitFor({ state: 'detached' });
        await popupPanel.waitFor({ state: 'detached' });
        await page.page.waitForTimeout(4000);
    }

    public async editConnectorDependencies() {
        await this.webView.locator('[id="link-external-manage-dependencies-Connector\\ Dependencies"] i').click();
        const popupPanel = this.webView.locator('#popUpPanel');
        await popupPanel.waitFor();
        await popupPanel.locator('h2:has-text("Connector Dependencies")').waitFor();
        const connectorDependency = popupPanel.locator('[data-testid^="mi-connector-amazonsqs   2.0.3"]:has-text("mi-connector-amazonsqs")');
        await connectorDependency.waitFor();
        await connectorDependency.click();
        await popupPanel.getByRole('textbox', { name: 'Artifact ID*' }).waitFor();
        await this.webView.getByRole('textbox', { name: 'Artifact ID*' }).fill('mi-connector--amazonsqs');
        const saveButton = await getVsCodeButton(this.webView, 'Save', 'primary');
        await saveButton.waitFor();
        await saveButton.click();
        const popupPanelAfterSave = this.webView.locator('#popUpPanel');
        await popupPanelAfterSave.waitFor();
        const updateButton = await getVsCodeButton(this.webView, 'Update Dependencies', 'primary');
        await updateButton.waitFor();
        await page.page.waitForTimeout(2000);
        await updateButton.click();
        await popupPanelAfterSave.waitFor({ state: 'detached' });
        await page.page.waitForTimeout(2000);
    }

    public async deleteConnectorDependencies() {
        const manageDependency = this.webView.locator('[id="link-external-manage-dependencies-Connector\\ Dependencies"] i');
        await manageDependency.waitFor();
        await manageDependency.click();
        const popupPanel = this.webView.locator('#popUpPanel');
        await popupPanel.waitFor();
        await popupPanel.locator('h2:has-text("Connector Dependencies")').waitFor();
        
        // More robust selector that works cross-platform
        const dependencyRow = this.webView.locator('[data-testid*="mi-connector--amazonsqs"][data-testid*="2.0.3"]');
        await dependencyRow.waitFor({ timeout: 100000 });
        
        // Look for delete icon within the row (usually the last icon)
        const deleteButton = dependencyRow.locator('i').last();
        await deleteButton.waitFor({ timeout: 10000 });
        await deleteButton.click();
        
        const updateButton = await getVsCodeButton(this.webView, 'Update Dependencies', 'primary');
        await updateButton.waitFor();
        await page.page.waitForTimeout(2000);
        await updateButton.click();
        await updateButton.waitFor({ state: 'detached' });
        await popupPanel.waitFor({ state: 'detached' });
        await page.page.waitForTimeout(2000);
    }

    public async addConfig() {
        const manageConfig = this.webView.locator('vscode-link').filter({ hasText: 'Manage Configurables' }).locator('i');
        await manageConfig.waitFor();
        await manageConfig.click();
        const popupPanel = this.webView.locator('#popUpPanel');
        await popupPanel.waitFor();
        await popupPanel.locator('h2:has-text("Configurables")').waitFor();
        await this.webView.getByText('Add Configurable').click();
        await this.webView.getByRole('textbox', { name: 'Key*' }).fill("test_name");
        await this.webView.locator('#dropdown-1 div').nth(1).click()
        await this.webView.getByLabel('string').click();
        await this.webView.getByText('Save').click();
        await this.webView.getByRole('button', { name: 'Update Configurables' }).click();
        await popupPanel.waitFor({ state: 'detached' });
    }

    public async editConfig() {
        const manageConfig = this.webView.locator('vscode-link').filter({ hasText: 'Manage Configurables' }).locator('i');
        await manageConfig.waitFor();
        await manageConfig.click();
        const popupPanel = this.webView.locator('#popUpPanel');
        await popupPanel.waitFor();
        await popupPanel.locator('h2:has-text("Configurables")').waitFor();
        await this.webView.locator('[id="0"] .codicon').first().click();
        await this.webView.locator('#dropdown-1 svg').click();
        await this.webView.getByLabel('cert').click();
        await this.webView.getByText('Save').click();
        await this.webView.getByRole('button', { name: 'Update Configurables' }).click();
        await popupPanel.waitFor({ state: 'detached' });
    }

    public async deleteConfig() {
        const manageConfig = this.webView.locator('vscode-link').filter({ hasText: 'Manage Configurables' }).locator('i');
        await manageConfig.waitFor();
        await manageConfig.click();
        const popupPanel = this.webView.locator('#popUpPanel');
        await popupPanel.waitFor();
        await popupPanel.locator('h2:has-text("Configurables")').waitFor();
        await this.webView.locator('[id="0"] .codicon').nth(1).click();
        await this.webView.getByRole('button', { name: 'Update Configurables' }).click();
        await popupPanel.waitFor({ state: 'detached' });
    }

    public async clickOnDiagramView(api : string) {
        await this.webView.getByText(api, { exact: true }).click();
    }
}
