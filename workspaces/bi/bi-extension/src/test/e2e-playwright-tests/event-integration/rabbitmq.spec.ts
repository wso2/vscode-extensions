
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
import { addArtifact, initTest, page } from '../utils/helpers';
import { Form, switchToIFrame } from '@wso2/playwright-vscode-tester';
import { ProjectExplorer } from '../utils/pages';

export default function createTests() {
    test.describe('RabbitMQ Integration Tests', {
        tag: '@group1',
    }, async () => {
        let listenerName: string;
        initTest();
        test('Create RabbitMQ Integration', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Creating a new service in test attempt: ', testAttempt);
            // Creating a HTTP Service
            await addArtifact('RabbitMQ Integration', 'trigger-rabbitmq');
            const artifactWebView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!artifactWebView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }
            // Create a new listener
            listenerName = `rabbitmqListener`;
            const form = new Form(page.page, 'WSO2 Integrator: BI', artifactWebView);
            await form.switchToFormView(false, artifactWebView);

            await form.fill({
                values: {
                    'basePath': {
                        type: 'cmEditor',
                        value: '"myQueueName"',
                        additionalProps: { clickLabel: true, switchMode: 'expression-mode', window: global.window }
                    }
                }
            });
            await form.submit('Create');

            const selectedListener = artifactWebView.locator(`text=${listenerName}`);
            await selectedListener.waitFor();

            // Verify integration appears in project tree
            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.findItem(['sample', `RabbitMQ Event Integration - "myQueueName"`], true);
        });

        test('Editing RabbitMQ Integration', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Editing a service in test attempt: ', testAttempt);
            const artifactWebView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!artifactWebView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }

            const editBtn = artifactWebView.locator('vscode-button[title="Edit Service"]');
            await editBtn.waitFor();
            await editBtn.click({ force: true });

            const updatedQueueName = `"updated-queue-name"`;
            const form = new Form(page.page, 'WSO2 Integrator: BI', artifactWebView);
            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    'Queue Name*The name of the queue': {
                        type: 'input',
                        value: updatedQueueName
                    }
                }
            });
            await form.submit('Save Changes');

            // Wait for the save changes button inside the container with id "save-changes-btn",
            // ensuring the disabled attribute is present and the button text is "Save Changes"
            const saveChangesBtn = artifactWebView.locator('#save-changes-btn vscode-button[appearance="primary"]');
            await saveChangesBtn.waitFor({ state: 'visible' });
            await expect(saveChangesBtn).toHaveClass('disabled', { timeout: 5000 });
            await expect(saveChangesBtn).toHaveText('Save Changes');

            // Click back button
            const backBtn = artifactWebView.locator('[data-testid="back-button"]');
            await backBtn.waitFor();
            await backBtn.click();

            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.findItem(['sample', `RabbitMQ Event Integration - "${updatedQueueName}"`], true);

            const updatedQueueNameElement = artifactWebView.locator(`text=${updatedQueueName}`);
            await updatedQueueNameElement.waitFor({ state: 'visible' });
        });
    });
}
