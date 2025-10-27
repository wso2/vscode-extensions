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

import { expect, test } from '@playwright/test';
import { initTest, page } from '../utils';
import { switchToIFrame } from '@wso2/playwright-vscode-tester';
import { Diagram } from '../components/Diagram';
import { TestScenarios, FileUtils } from './DataMapperUtils';
import { ProjectExplorer } from '../ProjectExplorer';

export default function createTests() {
    test.describe('Inline Data Mapper Tests', {
        tag: '@group1',
    }, async () => {
        initTest();
        test('Create', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;

            console.log('Inline Data Mapper - Create: START TEST ATTEMPT', testAttempt);

            FileUtils.updateProjectFileSync('basic/types.bal.txt', 'types.bal');
            FileUtils.updateProjectFileSync('create/inline/init.bal.txt', 'automation.bal');

            console.log(' - Add Declare Variable Node');

            const webView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!webView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }

            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.refresh('sample');

            await webView.getByRole('heading', { name: 'sample' }).waitFor();
            await page.page.getByRole('treeitem', { name: 'main' }).click();

            await webView.getByRole('heading', { name: 'Automation' }).waitFor();

            // Add a node to the diagram
            const diagram = new Diagram(page.page);
            await diagram.init();
            await diagram.clickAddButtonByIndex(1);

            await webView.getByText('Declare Variable').click();

            const varType = webView.getByRole('textbox', { name: 'Type' });
            await varType.click();
            await webView.getByText('OutRoot').click();
            await expect(varType).toHaveValue('OutRoot');

            await webView.getByRole('button', { name: 'Open in Data Mapper' }).click();

            console.log(' - Wait for Data Mapper to open');
            await webView.locator('#data-mapper-canvas-container').waitFor();

            await FileUtils.verifyFileContent('create/inline/final.bal.txt', 'automation.bal');

            console.log(' - Go back to overview (using back button)');
            await webView.getByTestId('back-button').click();
            await webView.getByRole('heading', { name: 'Automation' }).waitFor();
            await webView.getByTestId('back-button').click();
            await webView.getByRole('heading', { name: 'sample' }).waitFor();

            console.log('Inline Data Mapper - Create: COMPLETE TEST ATTEMPT', testAttempt);
        });

        test('Basic', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;

            console.log('Inline Data Mapper - Basic: START TEST ATTEMPT', testAttempt);

            FileUtils.updateProjectFileSync('basic/inline/init.bal.txt', 'automation.bal');
            FileUtils.updateProjectFileSync('basic/types.bal.txt', 'types.bal');

            const webView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!webView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }

            const isDataMapperOpend = await webView.getByRole('heading', { name: 'Data Mapper' }).isVisible();
            if (!isDataMapperOpend) {
                await webView.getByRole('heading', { name: 'sample' }).waitFor();
                await page.page.getByRole('treeitem', { name: 'main' }).click();

                await webView.getByRole('heading', { name: 'Automation' }).waitFor();
                await webView.getByText('output = {}').click();
                await webView.getByRole('button', { name: 'Open in Data Mapper' }).click();
            }

            await TestScenarios.testBasicMappings(webView, 'automation.bal', 'inline', isDataMapperOpend);

            console.log('Inline Data Mapper - Basic: COMPLETE TEST ATTEMPT', testAttempt);
        });

        test('Array Inner', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;

            console.log('Inline Data Mapper - Array Inner: START TEST ATTEMPT', testAttempt);

            FileUtils.updateProjectFileSync('array-inner/inline/init.bal.txt', 'automation.bal');
            FileUtils.updateProjectFileSync('array-inner/types.bal.txt', 'types.bal');

            const webView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!webView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }

            const isDataMapperOpend = await webView.getByRole('heading', { name: 'Data Mapper' }).isVisible();
            if (!isDataMapperOpend) {
                await webView.getByRole('heading', { name: 'sample' }).waitFor();
                await page.page.getByRole('treeitem', { name: 'main' }).click();

                await webView.getByRole('heading', { name: 'Automation' }).waitFor();
                await webView.getByText('output = {}').click();
                await webView.getByRole('button', { name: 'Open in Data Mapper' }).click();
            }

            await TestScenarios.testArrayInnerMappings(webView, 'automation.bal', 'inline', isDataMapperOpend);

            console.log('Inline Data Mapper - Array Inner: COMPLETE TEST ATTEMPT', testAttempt);
        });

        test('Array Root', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;

            console.log('Inline Data Mapper - Array Root: START TEST ATTEMPT', testAttempt);

            FileUtils.updateProjectFileSync('array-root/inline/init.bal.txt', 'automation.bal');
            FileUtils.updateProjectFileSync('array-root/types.bal.txt', 'types.bal');

            const webView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!webView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }

            const isDataMapperOpend = await webView.getByRole('heading', { name: 'Data Mapper' }).isVisible();
            if (!isDataMapperOpend) {
                await webView.getByRole('heading', { name: 'sample' }).waitFor();
                await page.page.getByRole('treeitem', { name: 'main' }).click();

                await webView.getByRole('heading', { name: 'Automation' }).waitFor();
                await webView.getByText('output = []').click();
                await webView.getByRole('button', { name: 'Open in Data Mapper' }).click();
            }

            await TestScenarios.testArrayRootMappings(webView, 'automation.bal', 'inline', isDataMapperOpend);

            console.log('Inline Data Mapper - Array Root: COMPLETE TEST ATTEMPT', testAttempt);
        });
    });
}
