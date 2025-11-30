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

    public async openOtherDependenciesManager() {
        await this.webView.locator('[id="link-external-manage-dependencies-Other\\ Dependencies"] i').click();
        const popupPanel = this.webView.locator('#popUpPanel');
        await popupPanel.waitFor();
    }

    public async openConnectorDependenciesManager() {
        await this.webView.locator('[id="link-external-manage-dependencies-Connector\\ Dependencies"] i').click();
        const popupPanel = this.webView.locator('#popUpPanel');
        await popupPanel.waitFor();
    }

    public async openIntegrationDependenciesManager() {
        await this.webView.locator('[id="link-external-manage-dependencies-Integration\\ Project\\ Dependencies"] i').click();
        const popupPanel = this.webView.locator('#popUpPanel');
        await popupPanel.waitFor();
    }

    public async addOtherDependencies() {
        const popupPanel = this.webView.locator('#popUpPanel');
        await popupPanel.waitFor();
        await popupPanel.getByText('Add Dependency').click();
        await popupPanel.getByRole('textbox', { name: 'Group ID' }).fill("mysql");
        await popupPanel.getByRole('textbox', { name: 'Artifact ID' }).fill("mysql-connector-java");
        await popupPanel.getByRole('textbox', { name: 'Version' }).fill("8.0.33");
        await popupPanel.getByRole('button', { name: 'Add Dependency' }).click();
        const loader = this.webView.locator('[data-testid="dependency-manager-loader"]');
        await loader.waitFor({ state: 'detached', timeout: 10000 });
        await this._page.waitForTimeout(5000);
        const dependencyItemComponent = popupPanel.locator('[data-testid="mysql-mysql-connector-java-8.0.33"]');
        await dependencyItemComponent.waitFor({ state: 'visible', timeout: 50000 });
    }

    public async editOtherDependencies() {
        const popupPanel = this.webView.locator('#popUpPanel');
        await popupPanel.waitFor();
        await popupPanel.locator('h2:has-text("Other Dependencies")').waitFor({ state: 'visible', timeout: 5000 });
        const dependencyItemComponent = popupPanel.locator('[data-testid="mysql-mysql-connector-java-8.0.33"]');
        await dependencyItemComponent.waitFor({ state: 'visible', timeout: 10000 });
        await dependencyItemComponent.hover();
        await dependencyItemComponent.locator('.codicon-edit').click();
        await popupPanel.getByRole('textbox', { name: 'Version' }).fill("8.0.32");
        await popupPanel.getByText('Save Changes').click();
        const loader = this.webView.locator('[data-testid="dependency-manager-loader"]');
        await loader.waitFor({ state: 'detached', timeout: 10000 });
        const newDependencyItemComponent = popupPanel.locator('[data-testid="mysql-mysql-connector-java-8.0.32"]');
        await newDependencyItemComponent.waitFor({ state: 'visible', timeout: 10000 });
    }

    public async deleteOtherDependencies() {
        const popupPanel = this.webView.locator('#popUpPanel');
        await popupPanel.waitFor();
        await popupPanel.locator('h2:has-text("Other Dependencies")').waitFor();
        const dependencyItemComponent = popupPanel.locator('[data-testid="mysql-mysql-connector-java-8.0.32"]');
        await dependencyItemComponent.waitFor({ state: 'visible', timeout: 10000 });
        await dependencyItemComponent.hover();
        await dependencyItemComponent.locator('.codicon-trash').click();
        const loader = this.webView.locator('[data-testid="dependency-manager-loader"]');
        await loader.waitFor({ state: 'detached', timeout: 10000 });
        await dependencyItemComponent.waitFor({ state: 'detached', timeout: 10000 });
    }

    public async closeDependencyManager() {
        const popupPanel = this.webView.locator('#popUpPanel');
        await popupPanel.locator('vscode-button[title="Close"]').click();
        await popupPanel.waitFor({ state: 'detached' });
    }

    public async addConnectorDependencies() {
        const popupPanel = this.webView.locator('#popUpPanel');
        await popupPanel.waitFor();
        await popupPanel.locator('h2:has-text("Connector Dependencies")').waitFor();
        await this.webView.getByText('Add Dependency').click();
        await this.webView.getByRole('textbox', { name: 'Group ID' }).fill("org.wso2.integration.connector");
        await this.webView.getByRole('textbox', { name: 'Artifact ID' }).fill("mi-connector-amazonsqs");
        await this.webView.getByRole('textbox', { name: 'Version' }).fill("2.0.3");
        await popupPanel.getByRole('button', { name: 'Add Dependency' }).click();
        const loader = this.webView.locator('[data-testid="dependency-manager-loader"]');
        await loader.waitFor({ state: 'detached', timeout: 10000 });
        const dependencyItemComponent = popupPanel.locator(
            '[data-testid="org.wso2.integration.connector-mi-connector-amazonsqs-2.0.3"]'
        );
        await dependencyItemComponent.waitFor({ state: 'visible', timeout: 10000 });
    }

    public async editConnectorDependencies() {
        const popupPanel = this.webView.locator('#popUpPanel');
        await popupPanel.waitFor();
        const dependencyItemComponent = popupPanel.locator('[data-testid="org.wso2.integration.connector-mi-connector-amazonsqs-2.0.3"]');
        await dependencyItemComponent.waitFor({ state: 'visible', timeout: 10000 });
        await dependencyItemComponent.hover();
        await dependencyItemComponent.locator('.codicon-edit').click();
        await this.webView.getByRole('textbox', { name: 'Version' }).fill("3.0.1");
        await popupPanel.getByText('Save Changes').click();
        const loader = this.webView.locator('[data-testid="dependency-manager-loader"]');
        await loader.waitFor({ state: 'detached', timeout: 10000 });
        const newDependencyItemComponent = popupPanel.locator(
            '[data-testid="org.wso2.integration.connector-mi-connector-amazonsqs-3.0.1"]'
        );
        await newDependencyItemComponent.waitFor({ state: 'visible', timeout: 10000 });
    }

    public async deleteConnectorDependencies() {
        const popupPanel = this.webView.locator('#popUpPanel');
        await popupPanel.waitFor();
        await popupPanel.locator('h2:has-text("Connector Dependencies")').waitFor();
        const dependencyItemComponent = popupPanel.locator('[data-testid="org.wso2.integration.connector-mi-connector-amazonsqs-3.0.1"]');
        await dependencyItemComponent.waitFor({ state: 'visible', timeout: 10000 });
        await dependencyItemComponent.hover();
        await dependencyItemComponent.locator('.codicon-trash').click();
        const loader = this.webView.locator('[data-testid="dependency-manager-loader"]');
        await loader.waitFor({ state: 'detached', timeout: 10000 });
        await dependencyItemComponent.waitFor({ state: 'detached', timeout: 10000 });
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
