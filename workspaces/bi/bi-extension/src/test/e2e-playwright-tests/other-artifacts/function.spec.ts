
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
import { Form, switchToIFrame } from '@wso2/playwright-vscode-tester';
import { ProjectExplorer } from '../ProjectExplorer';

export default function createTests() {
    test.describe('Function Artifact Tests', {
        tag: '@group1',
    }, async () => {
        let functionName = '';
        initTest();
        test('Create Function Artifact', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Creating a new function in test attempt: ', testAttempt);
            // Creating a HTTP Service
            await addArtifact('Function Artifact', 'bi-function');
            const artifactWebView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!artifactWebView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }
            functionName = `sample${testAttempt}`;
            const form = new Form(page.page, 'WSO2 Integrator: BI', artifactWebView);
            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    'Name*Name of the function': {
                        type: 'input',
                        value: functionName,
                    }
                }
            });
            await form.submit('Create');
            const context = artifactWebView.locator(`text=${functionName}`);
            await context.waitFor();
            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.findItem(['sample', `${functionName}`], true);
            const updateArtifactWebView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!updateArtifactWebView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }
        });

        test('Editing Function Artifact', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Editing a function in test attempt: ', testAttempt);
            const artifactWebView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!artifactWebView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }
            const editBtn = artifactWebView.locator('#bi-edit');
            await editBtn.waitFor();
            await editBtn.click({ force: true });
            const form = new Form(page.page, 'WSO2 Integrator: BI', artifactWebView);
            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    'Return Type': {
                        type: 'textarea',
                        value: 'string',
                    }
                }
            });
            await form.submit('Save');
            const context = artifactWebView.locator(`text=${functionName}`);
            await context.waitFor();
            const contextReturnType = artifactWebView.locator('span:has(i.fw-bi-return)', { hasText: 'string' });
            await contextReturnType.waitFor();
        });
    });
}
