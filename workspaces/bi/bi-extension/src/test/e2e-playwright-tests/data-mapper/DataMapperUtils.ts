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
import { newProjectPath, page } from '../utils';
import path from "path";
import { update } from "xstate/lib/actionTypes";

const dmDataDir = path.join(__dirname, 'data');
const projectDir = path.join(newProjectPath, 'sample');

export class DataMapperUtils {

    constructor(private webView: Frame) {
    }

    public async waitFor() {
        await this.webView.locator('#data-mapper-canvas-container').waitFor();
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

    // public async importSchema(ioType: IOType, schemaType: SchemaType, schemaFile: string) {
    //     const importNode = this.webView.getByTestId(`${ioType}-data-import-node`);
    //     // const importNode = this.webView.getByText(`Import ${ioType} schema`);
    //     await importNode.waitFor();
    //     await importNode.click();

    //     await this.fillImportForm(schemaType, schemaFile);

    //     await importNode.waitFor({ state: 'detached' });
    // }

    // public async editSchema(ioType: IOType, schemaType: SchemaType, schemaFile: string) {
    //     const editButton = this.webView.getByTestId(`change-${ioType}-schema-btn`);
    //     await editButton.click()
    //     await this.fillImportForm(schemaType, schemaFile);
    //     await page.page.getByRole('button', { name: 'Yes' }).click();
    //     await editButton.waitFor({ state: 'detached' });
    //     await editButton.waitFor({ state: 'attached' });
    // }

    // private async fillImportForm(schemaType: SchemaType, schemaFile: string) {
    //     const importForm = new ImportForm(this.webView);
    //     await importForm.init();
    //     await importForm.importData(schemaType, fs.readFileSync(path.join(dmDataFolder, schemaFile), 'utf8'));
    // }

    // public async loadJsonFromCompFolder(category: string) {
    //     const inputJsonFile = path.join(category, 'inp.json');
    //     const outputJsonFile = path.join(category, 'out.json');
    //     await this.importSchema(IOType.Input, SchemaType.Json, inputJsonFile);
    //     await this.importSchema(IOType.Output, SchemaType.Json, outputJsonFile);
    // }

    public async expandField(fieldFQN: string) {
        const expandButton = this.webView.locator(`div[id="expand-or-collapse-${fieldFQN}"]`);

        // Expand only if collapsed
        if (await expandButton.locator('.codicon-chevron-right').isVisible()){
            await expandButton.click();
            await expandButton.locator('.codicon-chevron-down').waitFor();
        }
    }

    public async refresh() {
        await this.webView.getByTitle('Refresh').click();
        await this.waitForProgressEnd();
    }

    public async mapFields(sourceFieldFQN: string, targetFieldFQN: string, menuOptionId?: string) {

        const sourceField = this.webView.locator(`div[id="recordfield-${sourceFieldFQN}"]`);
        const targetField = this.webView.locator(`div[id="recordfield-${targetFieldFQN}"] .port`);

        await targetField.waitFor();
        await sourceField.waitFor();

        await sourceField.click({force: true});

        await expect(sourceField).toHaveCSS('outline-style', 'solid'); 

        await targetField.click({force: true});

        if (menuOptionId) {
            const menuItem = this.webView.locator(`#menu-item-${menuOptionId}`);
            await menuItem.click();
            await menuItem.waitFor({ state: 'hidden' });
        } 
        try {
            await this.webView.waitForSelector('vscode-progress-ring', { state: 'attached', timeout : 3000 });
        } catch (error) {}
        try {
            await this.webView.waitForSelector('vscode-progress-ring', { state: 'detached' });
        } catch (error) {}
        
    }

    // public async mapArrayDirect(sourceFieldFQN: string, targetFieldFQN: string) {

    //     const sourceField = this.webView.locator(`div[data-name="${sourceFieldFQN}.OUT"]`);
    //     await sourceField.waitFor();
    //     await sourceField.click();

    //     const targetField = this.webView.locator(`div[data-name="${targetFieldFQN}.IN"]`);
    //     await targetField.waitFor();
    //     await targetField.click();

    //     const menuItem = this.webView.locator(`div[id="menu-item-a2a-direct"]`);
    //     await menuItem.waitFor();
    //     await menuItem.click();

    //     // await this.webView.waitForSelector('vscode-progress-ring', { state: 'attached' });
    //     await this.webView.waitForSelector('vscode-progress-ring', { state: 'detached' });

    // }

    // public async mapArrayInner(sourceFieldFQN: string, targetFieldFQN: string) {

    //     const sourceField = this.webView.locator(`div[data-name="${sourceFieldFQN}.OUT"]`);
    //     await sourceField.waitFor();
    //     await sourceField.click();

    //     const targetField = this.webView.locator(`div[data-name="${targetFieldFQN}.IN"]`);
    //     await targetField.waitFor();
    //     await targetField.click();

    //     const menuItem = this.webView.locator(`div[id="menu-item-a2a-inner"]`);
    //     await menuItem.waitFor();
    //     await menuItem.click();

    //     // await this.webView.waitForSelector('vscode-progress-ring', { state: 'attached' });
    //     await this.webView.waitForSelector('vscode-progress-ring', { state: 'detached' });

    //     const expandButton = await this.webView.locator(`div[data-testid="array-connector-node-${targetFieldFQN}.IN"] vscode-button[title="Map array elements"]`);
    //     await expandButton.waitFor();
    //     await expandButton.click();

    //     const fieldName = sourceFieldFQN.split('.').pop();
    //     await this.webView.waitForSelector(`div[id^="recordfield-focusedInput."]`);

    // }

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
        const hasDiagnostic = await locator.evaluate((el) => el.getAttribute('data-diagnostics'));
        expect(hasDiagnostic).toBeTruthy();
    }

    // public verifyFileCreation() {
    //     const configFolder = path.join(
    //         newProjectPath, 'testProject', 'src', 'main', 'wso2mi', 'resources', 'datamapper', this._name);

    //     const operatorsFile = path.join(configFolder, `${DM_OPERATORS_FILE_NAME}.ts`);

    //     return fs.existsSync(operatorsFile) && fs.existsSync(this.tsFile);
    // }

    // public overwriteTsFile(newTsFile: string) {
    //     fs.writeFileSync(this.tsFile, fs.readFileSync(newTsFile, 'utf8'));
    // }

    // public resetTsFile() {
    //     this.overwriteTsFile(path.join(dmDataFolder, 'reset.ts'));
    // }

    public writeFile(sourceFile: string, targetFile: string) {
        const sourcePath = path.join(dmDataDir, sourceFile);
        const targetPath = path.join(newProjectPath, 'sample')
        
    }

}

export function updateProjectFileSync(sourceFile: string, targetFile: string) {
    const sourcePath = path.join(dmDataDir, sourceFile);
    const targetPath = path.join(newProjectPath, 'sample', targetFile);
    fs.writeFileSync(targetPath, fs.readFileSync(sourcePath, 'utf8'));
}

export function updateDataFileSync(sourceFile: string, targetFile: string) {
    const sourcePath = path.join(newProjectPath, 'sample', sourceFile);
    const targetPath = path.join(dmDataDir, targetFile);
    fs.writeFileSync(targetPath, fs.readFileSync(sourcePath, 'utf8'));
}

export async function verifyFileContent(comparingFile: string, projectFile: string) {

    // // Uncomment this blcok for update data files
    // console.log({comparingFile, projectFile});
    // await page.page.pause();
    // updateDataFileSync(projectFile, comparingFile);
    // return true;
    // // End of the block

    return compareFilesSync(
        path.join(dmDataDir, comparingFile),
        path.join(projectDir, projectFile)
    );
}

export function compareFilesSync(file1: string, file2: string) {
    const file1Content =  fs.readFileSync(file1, 'utf8').replaceAll('\r\n', '\n');
    const file2Content =  fs.readFileSync(file2, 'utf8').replaceAll('\r\n', '\n');

    return file1Content === file2Content;
}


export async function testBasicMappings(dmWebView: Frame, projectFile: string, compDir: string, needRefresh?: boolean) {
    console.log('Testing Basic Mappings');

    const dm = new DataMapperUtils(dmWebView);
    await dm.waitFor();

    console.log('- Test direct mappings');

    await dm.expandField('input');
    if (needRefresh) {
        await dm.refresh();
    }

    console.log(' - Test direct - fields');
    // direct mapping
    // objectOutput.output.oPrimDirect = input.iPrimDirect;
    await dm.mapFields('input.iPrimDirect', 'objectOutput.output.oPrimDirect');
    const loc0 = dmWebView.getByTestId('link-from-input.iPrimDirect.OUT-to-objectOutput.output.oPrimDirect.IN');
    await loc0.waitFor({ state: 'attached' });

    // direct mapping with error
    // objectOutput.output.oPrimDirectErr = input.iPrimDirectErr;
    await dm.mapFields('input.iPrimDirectErr', 'objectOutput.output.oPrimDirectErr');
    const loc1 = dmWebView.getByTestId('link-from-input.iPrimDirectErr.OUT-to-objectOutput.output.oPrimDirectErr.IN')
    await dm.expectErrorLink(loc1);

    // await clearNotificationsByCloseButton(page);

    // many-one mapping
    // objectOutput.output.oManyOne = input.iManyOne1 + input.iManyOne2 + input.iManyOne3;
    await dm.mapFields('input.iManyOne1', 'objectOutput.output.oManyOne');
    await dm.mapFields('input.iManyOne2', 'objectOutput.output.oManyOne');
    await dm.mapFields('input.iManyOne3', 'objectOutput.output.oManyOne');

    await dmWebView.getByTestId('link-from-input.iManyOne1.OUT-to-datamapper-intermediate-port').waitFor({ state: 'attached' });
    await dmWebView.getByTestId('link-from-input.iManyOne2.OUT-to-datamapper-intermediate-port').first().waitFor({ state: 'attached' });
    await dmWebView.getByTestId('link-from-input.iManyOne3.OUT-to-datamapper-intermediate-port').first().waitFor({ state: 'attached' });
    await dmWebView.getByTestId('link-from-datamapper-intermediate-port-to-objectOutput.output.oManyOne.IN').waitFor({ state: 'attached' });
    const loc2 = dmWebView.getByTestId('link-connector-node-objectOutput.output.oManyOne.IN')
    await loc2.waitFor();

    // many-one mapping with error
    // objectOutput.output.oManyOneErr = input.iManyOneErr1 + input.iPrimDirectErr + input.iManyOneErr2
    await dm.mapFields('input.iManyOneErr1', 'objectOutput.output.oManyOneErr');
    await dm.mapFields('input.iPrimDirectErr', 'objectOutput.output.oManyOneErr');
    await dm.mapFields('input.iManyOneErr2', 'objectOutput.output.oManyOneErr');

    await dm.expectErrorLink(dmWebView.getByTestId('link-from-input.iManyOneErr1.OUT-to-datamapper-intermediate-port'));
    await dm.expectErrorLink(dmWebView.getByTestId('link-from-input.iPrimDirectErr.OUT-to-datamapper-intermediate-port'));
    await dm.expectErrorLink(dmWebView.getByTestId('link-from-input.iManyOneErr2.OUT-to-datamapper-intermediate-port'));
    await dm.expectErrorLink(dmWebView.getByTestId('link-from-datamapper-intermediate-port-to-objectOutput.output.oManyOneErr.IN'));
    const loc3 = dmWebView.getByTestId('link-connector-node-objectOutput.output.oManyOneErr.IN');
    await loc3.getByTestId('expression-label-diagnostic').waitFor();

    // object direct mapping
    // objectOutput.output.oObjDirect= input.iObjDirect;
    await dm.mapFields('input.iObjDirect', 'objectOutput.output.oObjDirect', 'direct');
    await dmWebView.getByTestId('link-from-input.iObjDirect.OUT-to-objectOutput.output.oObjDirect.IN').waitFor({ state: 'attached' });

    // object direct mapping with error
    // objectOutput.output.oObjDirectErr = input.iObjDirect
    await dm.mapFields('input.iObjDirect', 'objectOutput.output.oObjDirectErr', 'direct');
    await dm.expectErrorLink(dmWebView.getByTestId('link-from-input.iObjDirect.OUT-to-objectOutput.output.oObjDirectErr.IN'));

    // object properties mapping
    // objectOutput.output.oObjProp.p1 = input.iObjDirect.d1;
    await dm.mapFields('input.iObjDirect.d1', 'objectOutput.output.oObjProp.p1');
    const loc4 = dmWebView.getByTestId('link-from-input.iObjDirect.d1.OUT-to-objectOutput.output.oObjProp.p1.IN');
    await loc4.waitFor({ state: 'attached' });

    // objectOutput.output.oObjProp.p2 = input.iObjProp.d2;
    await dm.mapFields('input.iObjProp.op2', 'objectOutput.output.oObjProp.p2');
    await dm.expectErrorLink(dmWebView.getByTestId('link-from-input.iObjProp.op2.OUT-to-objectOutput.output.oObjProp.p2.IN'));

    expect(await verifyFileContent(`basic/${compDir}/map1.bal.txt`, projectFile)).toBeTruthy();

    console.log('- Test basic mapping delete');
    // await dm.expandField('input');

    await loc0.click({ force: true });
    await dmWebView.getByTestId('expression-label-for-input.iPrimDirect.OUT-to-objectOutput.output.oPrimDirect.IN')
        .locator('.codicon-trash').click({ force: true });
    await loc0.waitFor({ state: 'detached' });

    await loc1.click({ force: true });
    await dmWebView.getByTestId('expression-label-for-input.iPrimDirectErr.OUT-to-objectOutput.output.oPrimDirectErr.IN')
        .locator('.codicon-trash').click({ force: true });
    await loc1.waitFor({ state: 'detached' });

    await loc2.locator('.codicon-trash').click({ force: true });
    await loc2.waitFor({ state: 'detached' });

    await loc3.locator('.codicon-trash').click({ force: true });
    await loc3.waitFor({ state: 'detached' });

    await loc4.click({ force: true });
    await dmWebView.getByTestId('expression-label-for-input.iObjDirect.d1.OUT-to-objectOutput.output.oObjProp.p1.IN')
        .locator('.codicon-trash').click({ force: true });
    await loc4.waitFor({ state: 'detached' });

    expect(await verifyFileContent(`basic/${compDir}/del1.bal.txt`, projectFile)).toBeTruthy();

    console.log(' - Test Clear All Mappings');

    await dmWebView.getByTitle('Clear all mappings').click();
    await dm.waitForProgressEnd();
    const links = dmWebView.locator('[data-testid^="link-from-"]');
    await expect(links).toHaveCount(0);

    expect(await verifyFileContent(`basic/${compDir}/del2.bal.txt`, projectFile)).toBeTruthy();


    console.log(' - Test direct - root');

    // root mapping
    await dm.mapFields('input', 'objectOutput.output', 'direct');
    const locRoot = dmWebView.getByTestId('link-from-input.OUT-to-objectOutput.output.IN');
    await dm.expectErrorLink(locRoot);

    expect(await verifyFileContent(`basic/${compDir}/map2.bal.txt`, projectFile)).toBeTruthy();
    
    // delete root mapping
    await locRoot.click({ force: true });
    await dmWebView.getByTestId('expression-label-for-input.OUT-to-objectOutput.output.IN').locator('.codicon-trash').click({ force: true });
    await locRoot.waitFor({ state: 'detached' });

    expect(await verifyFileContent(`basic/${compDir}/del2.bal.txt`, projectFile)).toBeTruthy();

    console.log('Finished Testing Basic Mappings');

}

export async function testArrayInnerMappings(dmWebView: Frame, projectFile: string, compDir: string, needRefresh?: boolean) {

    console.log('Testing Array Mappings');

    const dm = new DataMapperUtils(dmWebView);
    await dm.waitFor();

    console.log('- Test query expression');


    await dm.expandField('input');


    if (needRefresh) {
        await dm.refresh();
        await dmWebView.locator(`div[id="recordfield-input.iArr1D"]`).waitFor();
    }

    console.log(' - Input preview');

    await dm.expandField('input.iArr1D');

    await dmWebView.locator('div[id="recordfield-input.iArr1D.iArr1D"]').waitFor();

    console.log(' - Output preview');

    await dm.expandField('objectOutput.output.oArr1D');
    await dmWebView.locator('div[id="recordfield-objectOutput.output.oArr1D.oArr1D"]').waitFor();

    console.log(' - Map iArr1D to oArr1D using query expression');
    await dm.mapFields('input.iArr1D', 'objectOutput.output.oArr1D', 'a2a-inner');

    console.log(' - Map withing query exprression');
    await dm.mapFields('iArr1DItem.p2', 'queryOutput.oArr1D.p2');
    const loc1 = dmWebView.getByTestId('link-from-iArr1DItem.p2.OUT-to-queryOutput.oArr1D.p2.IN');
    await dm.expectErrorLink(loc1);

    await dm.mapFields('iArr1DItem.p2', 'queryOutput.oArr1D.p1');
    await dm.mapFields('iArr1DItem.p3', 'queryOutput.oArr1D.p1');

    await dmWebView.getByTestId('link-from-iArr1DItem.p2.OUT-to-datamapper-intermediate-port').waitFor({ state: 'attached' });
    await dmWebView.getByTestId('link-from-iArr1DItem.p3.OUT-to-datamapper-intermediate-port').waitFor({ state: 'attached' });
    await dmWebView.getByTestId('link-from-datamapper-intermediate-port-to-queryOutput.oArr1D.p1.IN').waitFor({ state: 'attached' });

    const loc2 = dmWebView.getByTestId('link-connector-node-queryOutput.oArr1D.p1.IN');
    await loc2.waitFor();

    expect(await verifyFileContent(`array-inner/${compDir}/map1.bal.txt`, projectFile)).toBeTruthy();

    console.log('- Go back to root before test deletion');
    await dm.gotoPreviousView();
    const loc0 = dmWebView.getByTestId('link-connector-node-objectOutput.output.oArr1D.IN');
    await loc0.waitFor();

    console.log(' - Goto focused view');
    await dmWebView.getByTestId('expand-array-fn-output.oArr1D').click();
    await dmWebView.getByText('oArr1D:Query').waitFor();
    await dmWebView.getByTestId('link-from-input.iArr1D.OUT-to-queryOutput.oArr1D.#.IN').waitFor();

    console.log('- Delete within focused view');
    await loc1.click({ force: true });
    await dmWebView.getByTestId('expression-label-for-iArr1DItem.p2.OUT-to-queryOutput.oArr1D.p2.IN')
        .locator('.codicon-trash').click({ force: true });
    await loc1.waitFor({ state: 'detached' });

    await loc2.locator('.codicon-trash').click({ force: true });
    await loc2.waitFor({ state: 'detached' });

    expect(await verifyFileContent(`array-inner/${compDir}/del1.bal.txt`, projectFile)).toBeTruthy();

    console.log(' - Within focused view root mapping');
    await dm.mapFields('iArr1DItem', 'queryOutput.oArr1D', 'direct');
    const loc3 = dmWebView.getByTestId('link-from-iArr1DItem.OUT-to-queryOutput.oArr1D.IN');
    await loc3.waitFor();

    expect(await verifyFileContent(`array-inner/${compDir}/map2.bal.txt`, projectFile)).toBeTruthy();

    console.log(' - Delete within focused view root mapping');
    await loc3.click({ force: true });
    await dmWebView.getByTestId('expression-label-for-iArr1DItem.OUT-to-queryOutput.oArr1D.IN')
        .locator('.codicon-trash').click({ force: true });
    await loc3.waitFor({ state: 'detached' });

    expect(await verifyFileContent(`array-inner/${compDir}/del2.bal.txt`, projectFile)).toBeTruthy();

    console.log('- Go back to root view');
    await dmWebView.getByTestId('back-button').click();
    await dmWebView.getByText('oArr1D:Query').waitFor({ state: 'detached' });

    // TODO: Need to add deletion of query expression


    console.log(' - Initialize and add elements');
    await dm.selectConfigMenuItem('objectOutput.output.oArr1D', 'Initialize Array');
    await dm.waitForProgressEnd();
    const locArrInit = dmWebView.getByTestId('array-widget-field-objectOutput.output.oArr1D.IN');
    await locArrInit.waitFor();
    expect(locArrInit).toHaveText('[]');

    await dm.selectConfigMenuItem('objectOutput.output.oArr1D', 'Add Element');

    await dmWebView.locator('div[id="recordfield-objectOutput.output.oArr1D.0"]').waitFor();

    console.log(' - Add element using button');
    const addElementBtn = dmWebView.getByTestId('array-widget-objectOutput.output.oArr1D.IN-add-element');
    await addElementBtn.click();
    await dm.waitForProgressEnd();
    await dmWebView.locator('div[id="recordfield-objectOutput.output.oArr1D.1"]').waitFor();

    await addElementBtn.click();
    await dm.waitForProgressEnd();
    await dmWebView.locator('div[id="recordfield-objectOutput.output.oArr1D.2"]').waitFor();


    console.log(' - Map to array elements');
    await dm.mapFields('input.p1', 'objectOutput.output.oArr1D.0.p1');
    const loc4 = dmWebView.getByTestId('link-from-input.p1.OUT-to-objectOutput.output.oArr1D.0.p1.IN');
    await dm.expectErrorLink(loc4);

    await dm.mapFields('input.p2', 'objectOutput.output.oArr1D.1.p1');
    await dmWebView.getByTestId('link-from-input.p2.OUT-to-objectOutput.output.oArr1D.1.p1.IN').waitFor({ state: 'attached' });

    await dm.mapFields('input.p1', 'objectOutput.output.oArr1D.2', 'direct');
    const loc5 = dmWebView.getByTestId('link-from-input.p1.OUT-to-objectOutput.output.oArr1D.2.IN');
    await dm.expectErrorLink(loc5);

    expect(await verifyFileContent(`array-inner/${compDir}/map3.bal.txt`, projectFile)).toBeTruthy();

    console.log(' - Delete array element mappings and elements');
    await loc4.click({ force: true });
    await dmWebView.getByTestId('expression-label-for-input.p1.OUT-to-objectOutput.output.oArr1D.0.p1.IN')
        .locator('.codicon-trash').click({ force: true });
    await loc4.waitFor({ state: 'detached' });

    
    await loc5.click({ force: true });
    await dmWebView.getByTestId('expression-label-for-input.p1.OUT-to-objectOutput.output.oArr1D.2.IN')
        .locator('.codicon-trash').click({ force: true });
    await loc5.waitFor({ state: 'detached' });

    await dm.selectConfigMenuItem('objectOutput.output.oArr1D.1', 'Delete Element');
    await dm.waitForProgressEnd();
    await dmWebView.locator('div[id="recordfield-objectOutput.output.oArr1D.1"]').waitFor({ state: 'detached' });

    expect(await verifyFileContent(`array-inner/${compDir}/del3.bal.txt`, projectFile)).toBeTruthy();

    await dm.selectConfigMenuItem('objectOutput.output.oArr1D', 'Delete Array');

    expect(await verifyFileContent(`array-inner/${compDir}/del4.bal.txt`, projectFile)).toBeTruthy();
}

export async function testArrayRootMappings(dmWebView: Frame, projectFile: string, compDir: string, needRefresh?: boolean) {
    console.log('Testing Array Root Mappings');

    const dm = new DataMapperUtils(dmWebView);
    await dm.waitFor();

    console.log(' - Expand input');
    await dm.expandField('input');

    if(needRefresh){
        await dm.refresh();
    }

    console.log(' - Test preview');
    await dmWebView.getByText('<inputItem>').waitFor();
    await dmWebView.getByText('<outputItem>*').waitFor();

    console.log(' - Map input to ouput using query expression');

    await dm.mapFields('input', 'arrayOutput.output', 'a2a-inner');
    await page.page.pause(); // TODO: Remove after fixing root level mapping issue
    const locH = dmWebView.getByTestId('link-from-input.OUT-to-queryOutput.output.#.IN');
    await locH.waitFor({state: 'attached'});

    console.log(' - Map iArr1D to oArr1D using query expression');
    await dm.mapFields('inputItem.iArr1D', 'queryOutput.output.oArr1D', 'a2a-inner');

    console.log(' - Map withing query exprression');
    await dm.mapFields('iArr1DItem.p2', 'queryOutput.oArr1D.p2');
    const loc1 = dmWebView.getByTestId('link-from-iArr1DItem.p2.OUT-to-queryOutput.oArr1D.p2.IN');
    await dm.expectErrorLink(loc1);

    await dm.mapFields('iArr1DItem.p2', 'queryOutput.oArr1D.p1');
    await dm.mapFields('iArr1DItem.p3', 'queryOutput.oArr1D.p1');

    await dmWebView.getByTestId('link-from-iArr1DItem.p2.OUT-to-datamapper-intermediate-port').waitFor({ state: 'attached' });
    await dmWebView.getByTestId('link-from-iArr1DItem.p3.OUT-to-datamapper-intermediate-port').waitFor({ state: 'attached' });
    await dmWebView.getByTestId('link-from-datamapper-intermediate-port-to-queryOutput.oArr1D.p1.IN').waitFor({ state: 'attached' });

    const loc2 = dmWebView.getByTestId('link-connector-node-queryOutput.oArr1D.p1.IN');
    await loc2.waitFor();

    expect(await verifyFileContent(`array-root/${compDir}/map1.bal.txt`, projectFile)).toBeTruthy();

    console.log(' - Go back to root before test deletion');
    await dm.gotoPreviousView();
    const loc0 = dmWebView.getByTestId('link-connector-node-queryOutput.output.oArr1D.IN');
    await loc0.waitFor();

    console.log(' - Goto focused view');
    await dmWebView.getByTestId('expand-array-fn-output.oArr1D').click();
    await dmWebView.getByText('oArr1D:Query').waitFor();
    await dmWebView.getByTestId('link-from-inputItem.iArr1D.OUT-to-queryOutput.oArr1D.#.IN').waitFor({ state: 'attached' });

    console.log(' - Delete within focused view');
    await loc1.click({ force: true });
    await dmWebView.getByTestId('expression-label-for-iArr1DItem.p2.OUT-to-queryOutput.oArr1D.p2.IN')
        .locator('.codicon-trash').click({ force: true });
    await loc1.waitFor({ state: 'detached' });

    await loc2.locator('.codicon-trash').click({ force: true });
    await loc2.waitFor({ state: 'detached' });

    expect(await verifyFileContent(`array-root/${compDir}/del1.bal.txt`, projectFile)).toBeTruthy();

    console.log(' - Within focused view root mapping');
    await dm.mapFields('iArr1DItem', 'queryOutput.oArr1D', 'direct');
    const loc3 = dmWebView.getByTestId('link-from-iArr1DItem.OUT-to-queryOutput.oArr1D.IN');
    await loc3.waitFor();

    expect(await verifyFileContent(`array-root/${compDir}/map2.bal.txt`, projectFile)).toBeTruthy();

    console.log(' - Delete within focused view root mapping');
    await loc3.click({ force: true });
    await dmWebView.getByTestId('expression-label-for-iArr1DItem.OUT-to-queryOutput.oArr1D.IN')
        .locator('.codicon-trash').click({ force: true });
    await loc3.waitFor({ state: 'detached' });

    expect(await verifyFileContent(`array-root/${compDir}/del2.bal.txt`, projectFile)).toBeTruthy();

    console.log(' - Go back to previous view');
    await dmWebView.getByTestId('back-button').click();
    await dmWebView.getByText('oArr1D:Query').waitFor({ state: 'detached' });

    console.log(' - Delete intermediate query expression');
    await loc0.locator('.codicon-trash').click({ force: true });
    await loc0.waitFor({ state: 'detached' });
    expect(await verifyFileContent(`array-root/${compDir}/del3.bal.txt`, projectFile)).toBeTruthy();


    console.log(' - Go back to root view');
    await dmWebView.getByTestId('back-button').click();

    const loc4 = dmWebView.getByTestId('link-connector-node-arrayOutput.output.IN');
    await loc4.waitFor();

    console.log(' - Delete root level array mapping');
    await loc4.locator('.codicon-trash').click({ force: true });
    await loc4.waitFor({ state: 'detached' });

    expect(await verifyFileContent(`array-root/${compDir}/del4.bal.txt`, projectFile)).toBeTruthy();

    console.log(' - Test root level element initialization');
    
    await dm.selectConfigMenuItem('arrayOutput.output', 'Add Element');
    await dm.waitForProgressEnd();
    await dmWebView.locator('div[id="recordfield-arrayOutput.output.0"]').waitFor();

    await dmWebView.getByTestId('array-widget-arrayOutput.output.IN-add-element').click();
    await dm.waitForProgressEnd();
    await dmWebView.locator('div[id="recordfield-arrayOutput.output.1"]').waitFor();

    console.log(' - Map to root level array elements');
    await dm.expandField('input');
    await dm.mapFields('input', 'arrayOutput.output.0.oArr1D', 'a2a-direct');
    const loc5 = dmWebView.getByTestId('link-from-input.OUT-to-arrayOutput.output.0.oArr1D.IN');
    await dm.expectErrorLink(loc5);

    await dm.mapFields('input', 'arrayOutput.output.1.oArr1D', 'a2a-direct');
    await dm.expectErrorLink(dmWebView.getByTestId('link-from-input.OUT-to-arrayOutput.output.1.oArr1D.IN'));

    expect(await verifyFileContent(`array-root/${compDir}/map3.bal.txt`, projectFile)).toBeTruthy();

    console.log(' - Delete root level array element mappings and elements');
    await loc5.click({ force: true });
    await dmWebView.getByTestId('expression-label-for-input.OUT-to-arrayOutput.output.0.oArr1D.IN')
        .locator('.codicon-trash').click({ force: true });
    await loc5.waitFor({ state: 'detached' });

    await dm.selectConfigMenuItem('arrayOutput.output.1', 'Delete Element');
    await dm.waitForProgressEnd();
    await dmWebView.locator('div[id="recordfield-arrayOutput.output.1"]').waitFor({ state: 'detached' });

    await dm.selectConfigMenuItem('arrayOutput.output', 'Delete Array');
    await dm.waitForProgressEnd();
    await dmWebView.getByText('<outputItem>*').waitFor();

    expect(await verifyFileContent(`array-root/${compDir}/del5.bal.txt`, projectFile)).toBeTruthy();

}

// console.log('- Test expression bar');

    // // expression bar - use method from completion
    // await dmWebView.locator('[id="recordfield-objectOutput\\.output\\.oExp"]').click();
    // const expressionBar = dmWebView.locator('#expression-bar').getByRole('textbox', { name: 'Text field' });
    // await expect(expressionBar).toBeFocused();
    // await expressionBar.fill('');
    // await dmWebView.locator('[id="recordfield-input\\.iExp"]').click();
    // await expect(expressionBar).toHaveValue('input.iExp');
    // await expect(expressionBar).toBeFocused();

    // await expressionBar.pressSequentially('.toup');
    // await dmWebView.getByText('toUpperAscii()').click();
    // await expressionBar.press('Enter');

    // await expect(expressionBar).toHaveValue('input.iExp.toUpperAscii()');
    // await expect(expressionBar).toBeFocused();

    // const canvas = dmWebView.locator('#data-mapper-canvas-container');
    // await canvas.click();
    // await expect(expressionBar).not.toBeFocused();

    // // TODO: input.iExp.toUpperAscii() currently shown as direct link, uncomment below when they display as expression
    // // await dmWebView.getByTestId('link-from-input.iExp.OUT-to-datamapper-intermediate-port').waitFor({ state: 'attached' });
    // // await dmWebView.getByTestId('link-from-datamapper-intermediate-port-to-objectOutput.output.oExp.IN').waitFor({ state: 'attached' });
    // // const loc4 = dmWebView.getByTestId('link-connector-node-objectOutput.output.oExp.IN');
    // // await loc4.waitFor();
    
    // const loc5 = dmWebView.getByTestId('link-from-input.iExp.OUT-to-objectOutput.output.oExp.IN');
    // await loc5.waitFor();

    // // expression bar - edit existing
    // await dmWebView.locator('[id="recordfield-objectOutput\\.output\\.oObjProp\\.p1"]').click();
    // await expect(expressionBar).toHaveValue('input.iObjDirect.d1');
    // await expect(expressionBar).toBeFocused();
    // await expressionBar.pressSequentially(' + "HI"');
    // await canvas.click();
    // await expect(expressionBar).not.toBeFocused();

    // // TODO: input.iObjDirect.d1 + "HI" currently shown as direct link, uncomment below when they display as expression
    // // await dmWebView.getByTestId('link-from-input.iObjDirect.d1.OUT-to-datamapper-intermediate-port').waitFor({ state: 'attached' });
    // // await dmWebView.getByTestId('link-from-datamapper-intermediate-port-to-objectOutput.output.oObjProp.p1.IN').waitFor({ state: 'attached' });
    // // await dmWebView.getByTestId('link-connector-node-objectOutput.output.oObjProp.p1.IN').waitFor();


    // console.log('- Test custom function');
    // // custom function mapping
    // // objectOutput.output.oCustomFn = input.iCustomFn;
    // await dm.mapFields('input.iCustomFn', 'objectOutput.output.oCustomFn', 'custom-func');

    // await dmWebView.getByTestId('link-from-input.iCustomFn.OUT-to-datamapper-intermediate-port').waitFor({ state: 'attached' });
    // await dmWebView.getByTestId('link-from-datamapper-intermediate-port-to-objectOutput.output.oCustomFn.IN').waitFor({ state: 'attached' });
    // const loc6 = dmWebView.getByTestId('link-connector-node-objectOutput.output.oCustomFn.IN');
    // await loc6.waitFor();

    // await loc6.getByTitle('Custom Function Call Expression').click();
    // await dmWebView.getByRole('heading', { name: 'Function' }).waitFor();
    // await dmWebView.getByTestId('back-button').click();
    // await dm.waitFor();

    // await page.page.pause();

    // additional deletions form basic
        // await loc5.click({ force: true });
    // await dmWebView.getByTestId('expression-label-for-input.iExp.OUT-to-objectOutput.output.oExp.IN')
    //     .locator('.codicon-trash').click({ force: true });
    // await loc5.waitFor({ state: 'detached' });

    // await loc6.locator('.codicon-trash').click({ force: true });
    // await loc6.waitFor({ state: 'detached' });

    // await page.page.pause();