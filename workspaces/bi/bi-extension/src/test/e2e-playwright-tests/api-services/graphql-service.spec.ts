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
    test.describe('GraphQL Service Tests', {
        tag: '@group1',
    }, async () => {
        initTest();
        test('Create GraphQL Service', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Creating a new service in test attempt: ', testAttempt);
            // Creating a HTTP Service
            await addArtifact('GraphQL Service', 'graphql-service-card');
            const artifactWebView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!artifactWebView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }
            const sampleName = `/sample${testAttempt}`;
            const form = new Form(page.page, 'WSO2 Integrator: BI', artifactWebView);
            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    'Service Base Path*': {
                        type: 'input',
                        value: sampleName,
                    }
                }
            });
            await form.submit('Create');

            // Check if the type diagram canvas is visible
            const typeDiagram = artifactWebView.locator('[data-testid="type-diagram"]');
            await typeDiagram.waitFor({ state: 'visible', timeout: 30000 });

            // Check if the service name is visible
            const context = artifactWebView.locator(`text=${sampleName}`).first();
            await context.waitFor();

            // Check if the AI Chat Agent is created in the project explorer
            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.findItem(['sample', `GraphQL Service`], true);

            const updateArtifactWebView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!updateArtifactWebView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }
        });

        test('Editing GraphQL Service', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Editing a service in test attempt: ', testAttempt);
            const artifactWebView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!artifactWebView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }
            const editBtn = artifactWebView.locator('[data-testid="edit-service-btn"]');
            await editBtn.waitFor();
            await editBtn.click({ force: true });
            const form = new Form(page.page, 'WSO2 Integrator: BI', artifactWebView);
            await form.switchToFormView(false, artifactWebView);
            const sampleName = `/editedSample${testAttempt}`;
            await form.fill({
                values: {
                    'Service Base Path*': {
                        type: 'input',
                        value: sampleName,
                    }
                }
            });
            await form.submit('Save');

            // Check if the type diagram canvas is visible
            const typeDiagram = artifactWebView.locator('[data-testid="type-diagram"]');
            await typeDiagram.waitFor({ state: 'visible', timeout: 30000 });

            // Check if the service name is visible
            const context = artifactWebView.locator(`text=${sampleName}`).first();
            await context.waitFor();
        });
    });
}
