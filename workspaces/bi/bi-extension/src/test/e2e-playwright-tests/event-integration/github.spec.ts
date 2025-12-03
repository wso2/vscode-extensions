
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
import { addArtifact, initTest, page } from '../utils/helpers';
import { Form, switchToIFrame } from '@wso2/playwright-vscode-tester';
import { ProjectExplorer } from '../utils/pages';

export default function createTests() {
    test.describe('Github Integration Tests', {
        tag: '@group1',
    }, async () => {
        let listenerName: string;
        initTest();
        test('Create Github Integration', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Creating a new service in test attempt: ', testAttempt);
            // Creating a HTTP Service
            await addArtifact('Github Integration', 'trigger-trigger-github');
            const artifactWebView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!artifactWebView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }
            // Create a new listener
            listenerName = `listenerGithub${testAttempt}`;
            const form = new Form(page.page, 'WSO2 Integrator: BI', artifactWebView);
            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    'Name*The name of the listener': {
                        type: 'input',
                        value: listenerName,
                    }
                }
            });
            await form.submit('Next');

            // Check for title
            const configTitle = artifactWebView.locator('h3', { hasText: 'GitHub Event Handler Configuration' });
            await configTitle.waitFor();

            const selectedListener = artifactWebView.locator(`[current-value="${listenerName}"]`);
            await selectedListener.waitFor();

            await form.fill({
                values: {
                    'Event Channel': {
                        type: 'dropdown',
                        value: 'IssuesService',
                    }
                }
            });

            await form.submit('Create');

            const onOpened = artifactWebView.locator(`text="onOpened"`);
            await onOpened.waitFor();

            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.findItem(['sample', `github:IssuesService`], true);

            const updateArtifactWebView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!updateArtifactWebView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }
        });

        test('Editing Github Service', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Editing a service in test attempt: ', testAttempt);
            const artifactWebView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!artifactWebView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }

            const editBtn = artifactWebView.locator('vscode-button[title="Edit Service"]');
            await editBtn.waitFor();
            await editBtn.click({ force: true });

            const form = new Form(page.page, 'WSO2 Integrator: BI', artifactWebView);
            await form.switchToFormView(false, artifactWebView);

            const configTitle = artifactWebView.locator('h3', { hasText: 'GitHub Event Handler Configuration' });
            await configTitle.waitFor();

            const selectedListener = artifactWebView.locator(`[current-value="${listenerName}"]`);
            await selectedListener.waitFor();

            const selectedEventChannel = artifactWebView.locator(`[current-value="IssuesService"]`);
            await selectedEventChannel.waitFor();

            await form.submit('Save');

            const onOpened = artifactWebView.locator(`text="onOpened"`);
            await onOpened.waitFor();
        });
    });
}
