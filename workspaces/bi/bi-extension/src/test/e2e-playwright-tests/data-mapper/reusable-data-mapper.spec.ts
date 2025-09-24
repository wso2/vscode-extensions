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
import { DataMapperUtils, testBasicMappings, updateProjectFileSync, verifyFileContentSync } from './DataMapperUtils';
import { ProjectExplorer } from '../ProjectExplorer';
import path from 'path';

export default function createTests() {
    test.describe('Reusable Data Mapper Tests', {
        tag: '@group1',
    }, async () => {
        initTest();
        test('Create reusable Data Mapper option', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;

            console.log('Update types.bal');
            updateProjectFileSync('types.bal', 'types.bal');

            console.log('Creating ', testAttempt);

            await page.page.pause();

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

        test.skip('Inline Data Mapper - Basic In to Basic Out mapping', async ({ }, testInfo) => {
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



