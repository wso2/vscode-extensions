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

import { expect, Frame, Locator, Page } from "@playwright/test";
import { switchToIFrame } from "@wso2/playwright-vscode-tester";
import * as fs from 'fs';
import { dataFolder, newProjectPath, page } from '../Utils';
import path from "path";
import { DM_OPERATORS_FILE_NAME } from "../../../constants";
import { IOType } from "@wso2/mi-core";

export { IOType };
export enum SchemaType {
    Json = "JSON",
    JsonSchema = "JSON Schema",
    Xml = "XML",
    Csv = "CSV",
    Xsd = "XSD"
}

const dmDataFolder = path.join(dataFolder, 'datamapper-files');

export class DataMapper {

    public webView!: Frame;
    tsFile!: string;

    constructor(private _page: Page, private _name: string) {
    }

    public async init() {
        const webview = await switchToIFrame("Data Mapper View", this._page)
        if (!webview) {
            throw new Error("Failed to switch to Data Mapper View iframe");
        }
        this.webView = webview;
        this.tsFile = path.join(newProjectPath, 'testProject', 'src', 'main', 'wso2mi', 'resources', 'datamapper', this._name, `${this._name}.ts`);
    }

    public getWebView() {
        return this.webView;
    }

    public async scrollClickOutput(locator: Locator) {
        await this.scrollOutputUntilClickable(locator);
        await locator.click();
    }

    public async scrollOutputUntilClickable(locator: Locator) {
        const outputNode = this.webView.locator(`div[data-testid$="Output-node"]`);
        await outputNode.hover();

        for (let i = 0; !(await this.isClickable(locator)) && i < 5; i++) {
            await page.page.mouse.wheel(0, 400);
        }
    }

    public async isClickable(element: Locator): Promise<boolean> {

        // Check if the element is not covered by other elements
        const isNotObstructed = await element.evaluate((el) => {
            const rect = el.getBoundingClientRect();
            const elementAtPoint = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
            return elementAtPoint === el || el.contains(elementAtPoint) || (elementAtPoint?.contains(el) ?? false);
        });

        return isNotObstructed;
    }

    public async waitForProgressEnd() {
        await this.webView.waitForSelector('vscode-progress-ring', { state: 'detached' });
    }

    public async importSchema(ioType: IOType, schemaType: SchemaType, schemaFile: string) {
        const importNode = this.webView.getByTestId(`${ioType}-data-import-node`);
        // const importNode = this.webView.getByText(`Import ${ioType} schema`);
        await importNode.waitFor();
        await importNode.click();

        await this.fillImportForm(schemaType, schemaFile);

        await importNode.waitFor({ state: 'detached' });
    }

    public async editSchema(ioType: IOType, schemaType: SchemaType, schemaFile: string) {
        const editButton = this.webView.getByTestId(`change-${ioType}-schema-btn`);
        await editButton.click()
        await this.fillImportForm(schemaType, schemaFile);
        await page.page.getByRole('button', { name: 'Yes' }).click();
        await editButton.waitFor({ state: 'detached' });
        await editButton.waitFor({ state: 'attached' });
    }

    private async fillImportForm(schemaType: SchemaType, schemaFile: string) {
        const importForm = new ImportForm(this.webView);
        await importForm.init();
        await importForm.importData(schemaType, fs.readFileSync(path.join(dmDataFolder, schemaFile), 'utf8'));
    }

    public async loadJsonFromCompFolder(category: string) {
        const inputJsonFile = path.join(category, 'inp.json');
        const outputJsonFile = path.join(category, 'out.json');
        await this.importSchema(IOType.Input, SchemaType.Json, inputJsonFile);
        await this.importSchema(IOType.Output, SchemaType.Json, outputJsonFile);
    }

    public async mapFields(sourceFieldFQN: string, targetFieldFQN: string, menuOptionId?: string) {

        const sourceField = this.webView.locator(`div[id="recordfield-${sourceFieldFQN}"] .port`);
        const targetField = this.webView.locator(`div[id="recordfield-${targetFieldFQN}"] .port`);

        await targetField.waitFor();
        await sourceField.waitFor();

        await sourceField.click({force: true});
        await targetField.click({force: true});

        if (menuOptionId) {
            const menuItem = this.webView.locator(`#${menuOptionId}`);
            await menuItem.click();
            await menuItem.waitFor({ state: 'detached' });
        } else {
            try {
                await this.webView.waitForSelector('vscode-progress-ring', { state: 'attached' });
            } catch (error) {}
            try {
                await this.webView.waitForSelector('vscode-progress-ring', { state: 'detached' });
            } catch (error) {}
        }
        
    }

    public async mapArrayDirect(sourceFieldFQN: string, targetFieldFQN: string) {

        const sourceField = this.webView.locator(`div[data-name="${sourceFieldFQN}.OUT"]`);
        await sourceField.waitFor();
        await sourceField.click();

        const targetField = this.webView.locator(`div[data-name="${targetFieldFQN}.IN"]`);
        await targetField.waitFor();
        await targetField.click();

        const menuItem = this.webView.locator(`div[id="menu-item-a2a-direct"]`);
        await menuItem.waitFor();
        await menuItem.click();

        // await this.webView.waitForSelector('vscode-progress-ring', { state: 'attached' });
        await this.webView.waitForSelector('vscode-progress-ring', { state: 'detached' });

    }

    public async mapArrayInner(sourceFieldFQN: string, targetFieldFQN: string) {

        const sourceField = this.webView.locator(`div[data-name="${sourceFieldFQN}.OUT"]`);
        await sourceField.waitFor();
        await sourceField.click();

        const targetField = this.webView.locator(`div[data-name="${targetFieldFQN}.IN"]`);
        await targetField.waitFor();
        await targetField.click();

        const menuItem = this.webView.locator(`div[id="menu-item-a2a-inner"]`);
        await menuItem.waitFor();
        await menuItem.click();

        // await this.webView.waitForSelector('vscode-progress-ring', { state: 'attached' });
        await this.webView.waitForSelector('vscode-progress-ring', { state: 'detached' });

        const expandButton = await this.webView.locator(`div[data-testid="array-connector-node-${targetFieldFQN}.IN"] vscode-button[title="Map array elements"]`);
        await expandButton.waitFor();
        await expandButton.click();

        const fieldName = sourceFieldFQN.split('.').pop();
        await this.webView.waitForSelector(`div[id^="recordfield-focusedInput."]`);

    }

    public async selectConfigMenuItem(fieldFQN: string, menuOptionText: string){
        
        const configMenu = this.webView.locator(`[id="recordfield-${fieldFQN}"] #component-list-menu-btn`);
        await configMenu.waitFor();
        await configMenu.click();
        
        const menuOption = this.webView.getByTestId(`context-menu-${menuOptionText}`);
        await menuOption.waitFor();
        await menuOption.click();

        await menuOption.waitFor({ state: 'detached' });
        await this.waitForProgressEnd();
    }

    public async gotoPreviousView() {
        const breadcrumbs = this.webView.locator(`a[data-testid^="dm-header-breadcrumb-"]`);
        const previousCrumb = this.webView.locator(`a[data-testid="dm-header-breadcrumb-${await breadcrumbs.count() - 1}"]`);
        await previousCrumb.waitFor();
        await previousCrumb.click();
        await previousCrumb.waitFor({ state: 'detached' });
    }

    public async saveSnapshot(snapshotFile: string) {
        const root = this.webView.locator(`div#data-mapper-canvas-container`);
        await root.waitFor();
        fs.writeFileSync(snapshotFile, await root.innerHTML());
    }

    public async expectErrorLink(locator: Locator) {
        await locator.waitFor({ state: 'attached' });
        const hasDiagnostic = await locator.evaluate((el) => el.getAttribute('data-diagnostics') == "true");
        expect(hasDiagnostic).toBeTruthy();
    }

    public verifyTsFileContent(comparingFile: string) {
        return this.compareFiles(this.tsFile, path.join(dmDataFolder, comparingFile));
    }

    public compareFiles(file1: string, file2: string) {
        const file1Content = fs.readFileSync(file1, 'utf8');
        const file2Content = fs.readFileSync(file2, 'utf8');

        return file1Content === file2Content;
    }

    public verifyFileCreation() {
        const configFolder = path.join(
            newProjectPath, 'testProject', 'src', 'main', 'wso2mi', 'resources', 'datamapper', this._name);

        const operatorsFile = path.join(configFolder, `${DM_OPERATORS_FILE_NAME}.ts`);

        return fs.existsSync(operatorsFile) && fs.existsSync(this.tsFile);
    }

    public overwriteTsFile(newTsFile: string) {
        fs.writeFileSync(this.tsFile, fs.readFileSync(newTsFile, 'utf8'));
    }

    public resetTsFile() {
        this.overwriteTsFile(path.join(dmDataFolder, 'reset.ts'));
    }

}

class ImportForm {
    private sidePanel!: Locator;

    constructor(private container: Frame) {
    }

    public async init() {
        this.sidePanel = this.container.getByTestId("import-data-form");
        await this.sidePanel.waitFor();
    }

    public async importData(importTypeLabel: SchemaType, content: string) {
        const typeButton = this.sidePanel.getByText(`Import from ${importTypeLabel}`, { exact: true });
        await typeButton.waitFor();
        await typeButton.click();

        const textArea = this.sidePanel.locator(`textarea`);
        await textArea.waitFor();
        await textArea.fill(content);

        const submitBtn = this.sidePanel.locator(`vscode-button:text("Save")`);
        await submitBtn.waitFor();
        await submitBtn.click();
    }

    public async close() {
        const closeIcon = this.sidePanel.locator('i.codicon.codicon-close');
        await closeIcon.waitFor();
        await closeIcon.click();
    }
}
