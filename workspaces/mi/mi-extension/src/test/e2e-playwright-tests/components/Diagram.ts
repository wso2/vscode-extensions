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

import { Frame, Locator, Page } from "@playwright/test";
import { switchToIFrame } from "@wso2/playwright-vscode-tester";
import { Form, FormFillProps } from "./Form";

export class Diagram {
    private diagramWebView!: Frame;

    constructor(private _page: Page, private type: 'Resource' | 'Sequence' | 'Event Integration') {
    }

    public async init() {
        const webview = await switchToIFrame(`${this.type} View`, this._page)
        if (!webview) {
            throw new Error("Failed to switch to Diagram View iframe");
        }
        this.diagramWebView = webview;
    }

    public getDiagramWebView() : Frame {
        return this.diagramWebView;
    }

    public async edit() {
        const editButton = await this.diagramWebView.waitForSelector('vscode-button[title="Edit"]');
        await editButton.click();
    }

    public async getDiagramTitle() {
        const titleElement = await this.diagramWebView.waitForSelector('[data-testid="diagram-title"] h3');
        const title = await titleElement.innerText();
        return title;
    }

    public async getMediatorsCount(mediatorName: string, type = 'mediator') {
        const container = await this.getDiagramContainer();
        return await container.locator(`[data-testid^="${type}Node-${mediatorName}-"]`).count();
    }

    public async getMediator(mediatorName: string, index: number = 0, type = 'mediator') {
        const mediatorNode = (await this.getDiagramContainer()).locator(`[data-testid^="${type}Node-${mediatorName}-"]`).nth(index).locator('div').first();
        await mediatorNode.waitFor();
        await mediatorNode.hover();
        return new Mediator(this.diagramWebView, mediatorNode);
    }

    public async getConnectorOperation(connectorName: string, operationName: string, index: number = 0) {
        const connectorNode = (await this.getDiagramContainer()).locator(`[data-testid^="connectorNode-${connectorName}.${operationName}-"]`).nth(index).locator('div').first();
        await connectorNode.waitFor();
        await connectorNode.hover();
        return new Mediator(this.diagramWebView, connectorNode);
    }

    public async addMediator(mediatorName: string, data?: FormFillProps, index: number = 0) {
        await this.clickPlusButtonByIndex(index);
        const sidePanel = new SidePanel(this.diagramWebView);
        await sidePanel.init();
        await sidePanel.search(mediatorName);
        await sidePanel.selectMediator(mediatorName);
        const form = await sidePanel.getForm();
        if (data) {
            await form.fill(data);
        }
        await form.submit("Add");
    }

    public async selectVariableFromHelperPane(varName: string) {
        const variablesContainer = this.diagramWebView.locator('div').filter({ hasText: /^Variables$/ });
        await variablesContainer.waitFor();
        await variablesContainer.click();
        const variable = this.diagramWebView.getByTitle(varName);
        await variable.waitFor();
        await variable.click();
    }

    public async downloadConnectorThroughModulesList(name: string, index: number = 0, version?: string) {
        await this.clickPlusButtonByIndex(index);

        const sidePanel = new SidePanel(this.diagramWebView);
        await sidePanel.init();
        await sidePanel.goToAddModulesPage();

        await sidePanel.downloadConnector(name, version, true);
    }

    public async clickImportModuleFile() {
        const sidePanel = new SidePanel(this.diagramWebView);
        await sidePanel.init();
        console.log("Clicking on Import Module File");
        await sidePanel.goToMediatorsPage();
        console.log("Navigating to Import Module Page");
        await sidePanel.goToAddModulesPage();
        console.log("Navigating to Import Module Page");
        await sidePanel.goImportModulePage();
        console.log("Navigated to Import Module Page");
    }
        

    public async downloadConnectorThroughSearch(name: string, index: number = 0) {
        await this.clickPlusButtonByIndex(index);

        const sidePanel = new SidePanel(this.diagramWebView);
        await sidePanel.init();
        await sidePanel.search(name);

        await sidePanel.downloadConnector(name);
    }

    public async deleteConnector(name: string, index: number = 0) {
        await this.clickPlusButtonByIndex(index);

        const sidePanel = new SidePanel(this.diagramWebView);
        await sidePanel.init();
        await sidePanel.search(name);
        await sidePanel.deleteConnector(name);
        await sidePanel.close();
    }

    public async refreshBallerinaModule(name: string, index: number = 0) {
        await this.clickPlusButtonByIndex(index);
        const sidePanel = new SidePanel(this.diagramWebView);
        await sidePanel.init();
        await sidePanel.search(name);
        await sidePanel.refreshBallerinaModule(name);
        await sidePanel.close();
    }

    public async addConnectorOperation(connector: string, operation: string) {
        const sidePanel = new SidePanel(this.diagramWebView);
        await sidePanel.init();
        await sidePanel.search(operation);
        await sidePanel.addConnector(connector, operation);
    }

    public async fillConnectorForm(props: FormFillProps) {
        const sidePanel = new SidePanel(this.diagramWebView);
        await sidePanel.init();
        await sidePanel.fillConnectorForm(props);
    }

    public async goToConnectionsPage() {
        const sidePanel = new SidePanel(this.diagramWebView);
        await sidePanel.init();
        await sidePanel.goToConnectionsPage();
    }

    public async addNewConnectionFromConnectionsTab(index: number = 0) {
        await this.clickPlusButtonByIndex(index);

        const sidePanel = new SidePanel(this.diagramWebView);
        await sidePanel.init();
        await sidePanel.goToConnectionsPage();
        await sidePanel.addNewConnection();
    }

    public async addNewConnectionFromOperationForm() {
        const sidePanel = new SidePanel(this.diagramWebView);
        await sidePanel.init();
        await sidePanel.addNewConnection();
    }

    public async getConnector(connectorName: string, operationName: string, index: number = 0) {
        const connectorNode = (await this.getDiagramContainer()).locator(`[data-testid^="connectorNode-${connectorName}.${operationName}"]`).nth(index).locator('div').first();
        await connectorNode.waitFor();
        await connectorNode.hover();
        return new Mediator(this.diagramWebView, connectorNode);
    }

    public async closeSidePanel() {
        const sidePanel = new SidePanel(this.diagramWebView);
        await sidePanel.init();
        await sidePanel.close();
    }

    public async addDataMapper(name: string) {

        await this.clickPlusButtonByIndex(0);

        await this.diagramWebView.locator('[id="card-select-Data\\ Mapper"]').click();
        await this.diagramWebView.getByText('Add new').click();
        await this.diagramWebView.getByRole('textbox', { name: 'Name' }).click();
        await this.diagramWebView.getByRole('textbox', { name: 'Name' }).fill(name);
        await this.diagramWebView.getByRole('button', { name: 'Create' }).click();
        await this.diagramWebView.getByRole('button', { name: 'Add' }).click();

    }

    private async clickPlusButtonByPosition(line: number, column: number) {
        const link = (await this.getDiagramContainer()).locator(`g[data-linkid=${line},${column}]`);
        await link.waitFor();
        await link.hover();
        await link.getByTestId("add-mediator-button").click();
    }

    public async clickPlusButtonByIndex(index: number) {
        const plusBtns = (await this.getDiagramContainer()).getByTestId("add-mediator-button");
        if (await plusBtns.count() > 1) {
            await plusBtns.nth(index).hover();
            await plusBtns.nth(index).click();
        } else {
            await plusBtns.hover();
            await plusBtns.click();
        }
    }

    private async getDiagramContainer() {
        const continaer = this.diagramWebView.getByTestId("diagram-container");
        await continaer.waitFor();
        return continaer;
    }
}


class Mediator {

    constructor(private container: Frame, private mediatotNode: Locator) {
    }

    public async click() {
        await this.mediatotNode.click();
    }

    public async getEditForm() : Promise<Form> {
        const sidePanel = new SidePanel(this.container);
        await sidePanel.init();
        return new Form(undefined, undefined, sidePanel.getLocator());
    }

    public async edit(props: FormFillProps) {
        await this.mediatotNode.click();
        const form = new SidePanel(this.container);
        await form.init();
        await form.updateMediator(props);
    }

    public async delete(isConditionalMediator = false) {
        if (isConditionalMediator) {
            await this.mediatotNode.locator('vscode-button').getByRole("img").click();
        } else {
            await this.mediatotNode.getByRole("img").click();
        }
        await this.container.getByText('Delete').click();
        await this.mediatotNode.waitFor({ state: 'detached' });
    }

    public async clickLink(linkText: string) {
        const link = this.mediatotNode.locator(`div:text("${linkText}")`);
        await link.waitFor();
        await link.click();
    }

    public async getDescription() {
        const description = this.mediatotNode.getByTestId("mediator-description");
        await description.waitFor();
        return await description.textContent();
    }
}

export class SidePanel {
    private sidePanel!: Locator;

    constructor(private container: Frame) {
    }

    public getLocator() : Locator {
        return this.container.getByTestId("sidepanel");
    }

    public async init() {
        this.sidePanel = this.container.getByTestId("sidepanel");
        await this.sidePanel.waitFor();
        const loader = this.sidePanel.getByTestId("sidepanel-loader");
        await loader.waitFor({ state: "hidden" });
    }

    public async search(str: string) {
        const searchInput = this.sidePanel.locator("input").nth(0);
        await searchInput.type(str);
    }

    public async selectMediator(mediatorName: string) {
        const mediator = this.sidePanel.locator(`#card-select-${mediatorName}`);
        await mediator.waitFor();
        await mediator.click();
    }

    public async getForm() : Promise<Form> {
        const drawer = this.sidePanel.locator("#drawer1");
        await drawer.waitFor();
        const formDiv = drawer.locator("div").first();
        await formDiv.waitFor();
        return new Form(undefined, undefined, formDiv);
    }

    public async updateMediator(props: FormFillProps) {
        const form = new Form(undefined, undefined, this.sidePanel);
        await form.fill(props);
        await form.submit("Update");
        await this.sidePanel.waitFor({ state: 'detached' })
    }

    public async addConnector(connectorName: string, operationName: string) {
        const connector = this.sidePanel.locator(`#card-select-${connectorName}`).nth(0);
        await connector.waitFor();
        const connectorComponent = connector.locator(`..`);

        const operation = connectorComponent.locator(`#card-select-${operationName}`);
        await operation.waitFor();
        await operation.click();
    }

    public async fillConnectorForm(props: FormFillProps) {
        const form = new Form(undefined, undefined, this.sidePanel);
        await form.fill(props);

        await form.submit("Add");
    }

    public async downloadConnector(name: string, version?: string, inDrawer?: boolean) {
        const drawer = inDrawer ? this.sidePanel.locator(`#drawer1`) : this.sidePanel;
        const connector = drawer.locator(`#card-select-${name}`);
        await connector.waitFor();

        if (version) {
            await connector.click();
            const connectorComponent = connector.locator(`..`);

            const parentDiv = connectorComponent.locator(`label:text("Version")`).locator('../../..');
            await parentDiv.waitFor();
            const input = parentDiv.locator('input[role="combobox"]');
            await input.click();
            const option = parentDiv.locator(`li:has-text("${version}")`);
            await option.click();

            const versionInput = this.sidePanel.locator(`input[value="${version}"]`);
            await versionInput.waitFor({ state: 'attached' });
        }
        const downloadBtn = connector.locator(`.download-icon`);
        await downloadBtn.waitFor();
        await downloadBtn.click();

        await this.confirmDownloadDependency();

        const loader = this.sidePanel.locator(`span:text("Downloading Module...")`);
        await loader.waitFor();

        const downloadedConnector = drawer.locator(`#card-select-${name}`);
        await downloadedConnector.waitFor();
    }

    public async deleteConnector(connectorName: string) {
        const connector = this.sidePanel.locator(`#card-select-${connectorName}`);
        await connector.waitFor();

        const deleteBtn = connector.locator(`.delete-icon`);
        await deleteBtn.click();

        await this.sidePanel.locator(`p:text(" module will be removed from the project. Make sure all its dependencies are removed.")`);
        const confiramtionBtn = this.sidePanel.locator(`vscode-button:text("Yes") >> ..`);
        await confiramtionBtn.waitFor();
        await confiramtionBtn.click();

        await this.goToMediatorsPage();

        await connector.waitFor({ state: "hidden" });
    }

    public async refreshBallerinaModule(moduleName: string) {
        const module = this.sidePanel.locator(`#card-select-${moduleName}`);
        await module.waitFor();
        const refreshBtn = module.locator(`.refresh-icon`);
        await refreshBtn.click();
        await this.goToMediatorsPage();
        await module.waitFor({ state: "hidden" });
    }

    public async confirmDownloadDependency() {
        await this.sidePanel.locator(`p:text("Dependencies will be added to the project. Do you want to continue?")`);
        const confiramtionBtn = this.sidePanel.locator(`vscode-button:text("Yes") >> ..`);
        await confiramtionBtn.waitFor();
        await confiramtionBtn.click();
    }

    public async goToAddModulesPage() {
        const addModulesPageBtn = this.sidePanel.locator(`div:text("Add Module")`);
        await addModulesPageBtn.waitFor();
        await addModulesPageBtn.click();
    }

    public async goImportModulePage() {
        const importModulesPageBtn = this.sidePanel.locator(`div:text("Import Module")`);
        await importModulesPageBtn.waitFor();
        await importModulesPageBtn.click();
    }

    public async goToMediatorsPage() {
        const connectorsPageBtn = this.sidePanel.locator(`vscode-button:text("Mediators") >> ..`);
        await connectorsPageBtn.waitFor();
        await connectorsPageBtn.click();
    }

    public async goToConnectionsPage() {
        const connectorsPageBtn = this.sidePanel.locator(`vscode-button:text("Connections") >> ..`);
        await connectorsPageBtn.waitFor();
        await connectorsPageBtn.click();
    }

    public async addNewConnection() {
        const addNewConnectionBtn = this.sidePanel.locator(`div:text("Add new connection")`);
        await addNewConnectionBtn.waitFor();
        await addNewConnectionBtn.click();
    }

    public async close() {
        const closeIcon = this.sidePanel.locator('i.codicon.codicon-close');
        await closeIcon.waitFor();
        await closeIcon.click();
    }
}
