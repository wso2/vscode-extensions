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

import { expect, Frame, test } from '@playwright/test';
import { addArtifact, initTest, page } from '../utils';
import { switchToIFrame } from '@wso2/playwright-vscode-tester';
import { Diagram } from '../components/Diagram';
import { SidePanel } from '../components/SidePanel';
import { DataMapperUtils, updateProjectFileSync, verifyFileContentSync } from './DataMapperUtils';
import { ProjectExplorer } from '../ProjectExplorer';
import path from 'path';

export default function createTests() {
    test.describe('Inline Data Mapper Tests', {
        tag: '@group1',
    }, async () => {
        initTest();
        test.skip('Open In Data Mapper option', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;

            console.log('Update types.bal');
            updateProjectFileSync('types.bal', 'types.bal');

            console.log('Adding Declare Variable Node: ', testAttempt);

            // Create an automation
            await addArtifact('Automation', 'automation');

            /* Uncomment this code if the timeout issue persists */
            // // FIXME:Remove this once timeout issue is fixed
            // await new Promise((resolve) => setTimeout(resolve, 3000));

            const webView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!webView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }
            await webView.getByRole('button', { name: 'Create' }).click();

            // Add a node to the diagram
            const diagram = new Diagram(page.page);
            await diagram.init();
            await diagram.clickAddButtonByIndex(1);

            await webView.getByText('Declare Variable').click();
            await webView.getByRole('textbox', { name: 'Type' }).click();
            await webView.getByText('BasicIn').click();

            await webView.getByRole('textbox', { name: 'Expression' }).click();
            await webView.getByRole('textbox', { name: 'Expression' }).fill('{}');

            await webView.locator('#expression-editor-close i').click();

            await webView.getByRole('button', { name: 'Open in Data Mapper' }).click();

            console.log('Waiting for Data Mapper to open');
            await webView.locator('#data-mapper-canvas-container').waitFor();

        });

        test('Inline Data Mapper - Basic In to Basic Out mapping', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;

            console.log('Inline Data Mapper - Basic mapping: ', testAttempt);


            updateProjectFileSync('inline/init.bal.txt', 'automation.bal');
            updateProjectFileSync('inline/basic/types.bal.txt', 'types.bal');
            updateProjectFileSync('empty.txt', 'functions.bal');

            // Added to wait until project sync with file changes
            // await page.page.waitForTimeout(5000);
            // await page.page.pause();

            // const explorer = new ProjectExplorer(page.page);
            // await explorer.refresh('sample');
            // await explorer.findItem(['sample', 'Entry Points', 'main'], true);

            // await page.page.pause();

            const webView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!webView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }

            await webView.getByRole('heading', { name: 'sample' }).waitFor();

            await page.page.getByRole('treeitem', { name: 'main' }).click();

            await webView.getByRole('heading', { name: 'Automation' }).waitFor();
            await webView.getByText('output = {}').click();
            await webView.getByRole('button', { name: 'Open in Data Mapper' }).click();

            await testBasicMappings(webView, 'automation.bal', 'inline');
        });
    });
}

async function testBasicMappings(dmWebView: Frame, projectFile: string, compDir: string) {
    console.log('Testing Basic Mappings');

    const dm = new DataMapperUtils(dmWebView);
    await dm.waitFor();

    console.log('- Test direct mappings');
    await dm.expandField('input');

    // direct mapping
    // objectOutput.output.oPrimDirect = input.iPrimDirect;
    await dm.mapFields('input.iPrimDirect', 'objectOutput.output.oPrimDirect');
    const loc0 = dmWebView.getByTestId('link-from-input.iPrimDirect.OUT-to-objectOutput.output.oPrimDirect.IN');
    await loc0.waitFor({ state: 'attached' });

    // direct mapping with error
    // objectOutput.output.oPrimDirectErr = input.iPrimDirectErr;
    await dm.mapFields('input.iPrimDirectErr', 'objectOutput.output.oPrimDirectErr', 'direct');
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
    // objectOutput.output.oManyOneErr = input.iManyOne2 + input.iManyOneErr + input.iManyOne3
    await dm.mapFields('input.iManyOne2', 'objectOutput.output.oManyOneErr', 'direct');
    await dm.mapFields('input.iManyOneErr', 'objectOutput.output.oManyOneErr', 'direct');
    await dm.mapFields('input.iManyOne3', 'objectOutput.output.oManyOneErr', 'direct');

    await dm.expectErrorLink(dmWebView.getByTestId('link-from-input.iManyOne2.OUT-to-datamapper-intermediate-port').nth(1));
    await dm.expectErrorLink(dmWebView.getByTestId('link-from-input.iManyOne3.OUT-to-datamapper-intermediate-port').nth(1));
    await dm.expectErrorLink(dmWebView.getByTestId('link-from-input.iManyOneErr.OUT-to-datamapper-intermediate-port'));
    await dm.expectErrorLink(dmWebView.getByTestId('link-from-datamapper-intermediate-port-to-objectOutput.output.oManyOneErr.IN'));
    const loc3 = dmWebView.getByTestId('link-connector-node-objectOutput.output.oManyOneErr.IN');
    await loc3.waitFor();



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
    await dmWebView.getByTestId('link-from-input.iObjDirect.d1.OUT-to-objectOutput.output.oObjProp.p1.IN').waitFor({ state: 'attached' });

    // objectOutput.output.oObjProp.p2 = input.iObjProp.d2;
    await dm.mapFields('input.iObjProp.op2', 'objectOutput.output.oObjProp.p2', 'direct');
    await dm.expectErrorLink(dmWebView.getByTestId('link-from-input.iObjProp.op2.OUT-to-objectOutput.output.oObjProp.p2.IN'));


    console.log('- Test expression bar');

    // expression bar - use method from completion
    await dmWebView.locator('[id="recordfield-objectOutput\\.output\\.oExp"]').click();
    const expressionBar = dmWebView.locator('#expression-bar').getByRole('textbox', { name: 'Text field' });
    await expect(expressionBar).toBeFocused();
    await dmWebView.locator('[id="recordfield-input\\.iExp"]').click();
    await expect(expressionBar).toHaveValue('input.iExp');
    await expect(expressionBar).toBeFocused();

    await expressionBar.pressSequentially('.toup');
    await dmWebView.getByText('toUpperAscii()').click();
    await expressionBar.press('Enter');

    await expect(expressionBar).toHaveValue('input.iExp.toUpperAscii()');
    await expect(expressionBar).toBeFocused();

    const canvas = dmWebView.locator('#data-mapper-canvas-container');
    await canvas.click();
    await expect(expressionBar).not.toBeFocused();

    // TODO: input.iExp.toUpperAscii() currently shown as direct link, uncomment below when they display as expression
    // await dmWebView.getByTestId('link-from-input.iExp.OUT-to-datamapper-intermediate-port').waitFor({ state: 'attached' });
    // await dmWebView.getByTestId('link-from-datamapper-intermediate-port-to-objectOutput.output.oExp.IN').waitFor({ state: 'attached' });
    // const loc4 = dmWebView.getByTestId('link-connector-node-objectOutput.output.oExp.IN');
    // await loc4.waitFor();
    
    const loc4 = dmWebView.getByTestId('link-from-input.iExp.OUT-to-objectOutput.output.oExp.IN');
    await loc4.waitFor();

    // expression bar - edit existing
    await dmWebView.locator('[id="recordfield-objectOutput\\.output\\.oObjProp\\.p1"]').click();
    await expect(expressionBar).toBeFocused();
    await expressionBar.pressSequentially(' + "HI"');
    await canvas.click();
    await expect(expressionBar).not.toBeFocused();

    // TODO: input.iObjDirect.d1 + "HI" currently shown as direct link, uncomment below when they display as expression
    // await dmWebView.getByTestId('link-from-input.iObjDirect.d1.OUT-to-datamapper-intermediate-port').waitFor({ state: 'attached' });
    // await dmWebView.getByTestId('link-from-datamapper-intermediate-port-to-objectOutput.output.oObjProp.p1.IN').waitFor({ state: 'attached' });
    // await dmWebView.getByTestId('link-connector-node-objectOutput.output.oObjProp.p1.IN').waitFor();


    console.log('- Test custom function');
    // custom function mapping
    // objectOutput.output.oCustomFn = input.iCustomFn;
    await dm.mapFields('input.iCustomFn', 'objectOutput.output.oCustomFn', 'custom-func');

    await dmWebView.getByTestId('link-from-input.iCustomFn.OUT-to-datamapper-intermediate-port').waitFor({ state: 'attached' });
    await dmWebView.getByTestId('link-from-datamapper-intermediate-port-to-objectOutput.output.oCustomFn.IN').waitFor({ state: 'attached' });
    const linkConnCustomFn = dmWebView.getByTestId('link-connector-node-objectOutput.output.oCustomFn.IN');
    await linkConnCustomFn.waitFor();

    await linkConnCustomFn.getByTitle('Custom Function Call Expression').click();
    await dmWebView.getByRole('heading', { name: 'Function' }).waitFor();
    await dmWebView.getByTestId('back-button').click();
    await dm.waitFor();
    await dm.expandField('input');

    // expect(verifyFileContentSync(`${compDir}/basic/map.bal.txt`, projectFile)).toBeTruthy();
    // working

    console.log('- Test basic mapping delete');

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

    await loc4.click({ force: true });
    await dmWebView.getByTestId('expression-label-for-input.iExp.OUT-to-objectOutput.output.oExp.IN')
        .locator('.codicon-trash').click({ force: true });
    await loc4.waitFor({ state: 'detached' });

    await linkConnCustomFn.locator('.codicon-trash').click({ force: true });
    await linkConnCustomFn.waitFor({ state: 'detached' });

    await page.page.pause();

    expect(verifyFileContentSync(`${compDir}/basic/del.ts`, projectFile)).toBeTruthy();

    console.log('Finished Testing Basic Mappings');

}
