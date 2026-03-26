/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com)
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
import { DEFAULT_PROJECT_NAME } from '../utils/helpers/setup';

export default function createTests() {
    const listenerName = 'smbListener';
    test.describe('SMB Integration Tests', {
        tag: '@group1',
    }, async () => {
        test.describe.configure({ mode: 'serial' });
        initTest();
        test('Create SMB Integration', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Creating a new service in test attempt: ', testAttempt);
            await addArtifact('SMB Integration', 'trigger-smb');
            const artifactWebView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!artifactWebView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }
            const form = new Form(page.page, 'WSO2 Integrator: BI', artifactWebView);
            await form.switchToFormView(false, artifactWebView);
            await form.submit('Create');

            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.findItem([DEFAULT_PROJECT_NAME, `SMB Integration`], true);

            const context = artifactWebView.locator(`text=${listenerName}`);
            await context.waitFor();
        });

        test('Editing SMB Service', async ({ }, testInfo) => {
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

            await form.fill({
                values: {
                    'host': {
                        type: 'cmEditor',
                        value: `127.0.0.6`,
                        additionalProps: { clickLabel: true, switchMode: 'primary-mode', window: global.window }
                    }
                }
            });

            await form.submit('Save Changes');

            const saveChangesBtn = artifactWebView.locator('#save-changes-btn vscode-button[appearance="primary"]');
            await saveChangesBtn.waitFor({ state: 'visible' });
            await expect(saveChangesBtn).toHaveClass('disabled', { timeout: 5000 });
            await expect(saveChangesBtn).toHaveText('Save Changes');

            const backBtn = artifactWebView.locator('[data-testid="back-button"]');
            await backBtn.waitFor();
            await backBtn.click();

            await editBtn.waitFor();

            const context = artifactWebView.locator(`text=${listenerName}`);
            await context.waitFor();
        });

        test('Delete SMB Integration', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Deleting SMB integration in test attempt: ', testAttempt);

            const artifactWebView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!artifactWebView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }
            const projectExplorer = new ProjectExplorer(page.page);
            const serviceTreeItem = await projectExplorer.findItem([DEFAULT_PROJECT_NAME, `SMB Integration`], true);
            await serviceTreeItem.click({ button: 'right' });
            const deleteButton = page.page.getByRole('button', { name: 'Delete' }).first();
            await deleteButton.waitFor({ timeout: 5000 });
            await deleteButton.click();
            await expect(serviceTreeItem).not.toBeVisible({ timeout: 10000 });
        });
    });
}
