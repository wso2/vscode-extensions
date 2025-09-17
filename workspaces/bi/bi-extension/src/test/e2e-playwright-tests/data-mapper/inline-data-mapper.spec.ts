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

import { test } from '@playwright/test';
import { addArtifact, initTest, page } from '../utils';
import { switchToIFrame } from '@wso2/playwright-vscode-tester';
import { Diagram } from '../components/Diagram';
import { SidePanel } from '../components/SidePanel';
import { updateProjectFileSync } from './DataMapper';

export default function createTests() {
    test.describe('Inline Data Mapper Tests', {
        tag: '@group1',
    }, async () => {
        initTest();
        test('Adding Declare Variable Node', async ({ }, testInfo) => {
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
            
            // await webView.getByRole('textbox', { name: 'Expression' }).press('Escape');

            await webView.getByRole('button', { name: 'Save' }).click();
            await webView.getByTestId('side-panel').waitFor({ state: 'detached' });
            
            await webView.getByTestId('diagram-link-1').locator('foreignobject').click();

            await page.page.pause();

            await webView.getByText('Declare Variable').click();
            await webView.getByRole('textbox', { name: 'Type' }).click();
            await webView.getByText('BasicOut').click();
            await webView.getByRole('button', { name: 'Open in Data Mapper' }).click();

            await page.page.pause();
          
        });
    });
}