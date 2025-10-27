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
import { TestScenarios, FileUtils } from './DataMapperUtils';

export default function createTests() {
    test.describe('Reusable Data Mapper Tests', {
        tag: '@group1',
    }, async () => {
        initTest();
        test('Create', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;

            console.log('Reusable Data Mapper - Create: START TEST ATTEMPT', testAttempt);

            FileUtils.updateProjectFileSync('basic/types.bal.txt', 'types.bal');
            FileUtils.updateProjectFileSync('empty.txt', 'data_mappings.bal');

            console.log(' - Create reusable Data Mapper');

            const webView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!webView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }

            await page.page.getByRole('treeitem', { name: 'Data Mappers' }).hover();
            await page.page.getByLabel('Add Data Mapper').click();

            await webView.getByRole('textbox', { name: 'Data Mapper Name*Name of the' }).fill('output');

            await webView.getByText('Add Input').click();
            const inputType = webView.getByRole('textbox', { name: 'Type' });
            await inputType.click();
            await webView.getByText('InRoot').click();
            await expect(inputType).toHaveValue('InRoot');

            await webView.getByRole('textbox', { name: 'Name*Name of the parameter' }).click();
            await webView.getByRole('textbox', { name: 'Name*Name of the parameter' }).fill('input');
            await webView.getByRole('button', { name: 'Add' }).click();
            await webView.getByTestId('input-item').waitFor();

            const outputType = webView.getByRole('textbox', { name: 'Output' });
            await outputType.click();
            await webView.getByText('OutRoot').click();
            await expect(outputType).toHaveValue('OutRoot');

            await webView.getByRole('button', { name: 'Create', exact: true }).click();

            console.log(' - Wait for Data Mapper to open');
            await webView.locator('#data-mapper-canvas-container').waitFor();

            await FileUtils.verifyFileContent('basic/reusable/init.bal.txt', 'data_mappings.bal');

            console.log('Reusable Data Mapper - Create: COMPLETE TEST ATTEMPT', testAttempt);
        });

        test('Basic', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;

            console.log('Reusable Data Mapper - Basic: START TEST ATTEMPT', testAttempt);

            FileUtils.updateProjectFileSync('basic/reusable/init.bal.txt', 'data_mappings.bal');
            FileUtils.updateProjectFileSync('basic/types.bal.txt', 'types.bal');

            const webView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!webView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }

            const isDataMapperOpend = await webView.getByRole('heading', { name: 'Data Mapper' }).isVisible();
            if (!isDataMapperOpend) {
                await webView.getByRole('heading', { name: 'sample' }).waitFor();
                await page.page.getByRole('treeitem', { name: 'output' }).click();
            }

            await TestScenarios.testBasicMappings(webView, 'data_mappings.bal', 'reusable', isDataMapperOpend);

            console.log('Reusable Data Mapper - Basic: COMPLETE TEST ATTEMPT', testAttempt);
        });

        test('Array Inner', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;

            console.log('Reusable Data Mapper - Array Inner: START TEST ATTEMPT', testAttempt);

            FileUtils.updateProjectFileSync('array-inner/reusable/init.bal.txt', 'data_mappings.bal');
            FileUtils.updateProjectFileSync('array-inner/types.bal.txt', 'types.bal');

            const webView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!webView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }

            const isDataMapperOpend = await webView.getByRole('heading', { name: 'Data Mapper' }).isVisible();
            if (!isDataMapperOpend) {
                await webView.getByRole('heading', { name: 'sample' }).waitFor();
                await page.page.getByRole('treeitem', { name: 'output' }).click();
            }

            await TestScenarios.testArrayInnerMappings(webView, 'data_mappings.bal', 'reusable', isDataMapperOpend);

            console.log('Reusable Data Mapper - Array Inner: COMPLETE TEST ATTEMPT', testAttempt);
        });

        test('Array Root', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;

            console.log('Reusable Data Mapper - Array Root: START TEST ATTEMPT', testAttempt);

            FileUtils.updateProjectFileSync('array-root/reusable/init.bal.txt', 'data_mappings.bal');
            FileUtils.updateProjectFileSync('array-root/types.bal.txt', 'types.bal');

            const webView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!webView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }

            const isDataMapperOpend = await webView.getByRole('heading', { name: 'Data Mapper' }).isVisible();
            if (!isDataMapperOpend) {
                await webView.getByRole('heading', { name: 'sample' }).waitFor();
                await page.page.getByRole('treeitem', { name: 'output' }).click();
            }

            await TestScenarios.testArrayRootMappings(webView, 'data_mappings.bal', 'reusable', isDataMapperOpend);

            console.log('Reusable Data Mapper - Array Root: COMPLETE TEST ATTEMPT', testAttempt);
        });
    });
}
