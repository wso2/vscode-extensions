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
import { Form } from '@wso2/playwright-vscode-tester';
import fs from 'fs';
import path from 'path';
import { getWebview, initMigrationTest, page } from '../utils';

export default function createTests() {
    test.describe('Import Integration Tests', {
        tag: '@group1',
    }, async () => {
        const migrationOutputPath = path.join(__dirname, 'data', 'migration-output');
        let webview: any;

        initMigrationTest();

        test.beforeEach(async () => {
            webview = await getWebview('WSO2 Integrator: BI', page);
            if (!webview) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }
        });

        test.afterAll(async ({ }, testInfo) => {
            // Clean up migration output folder after all tests complete
            if (fs.existsSync(migrationOutputPath)) {
                fs.rmSync(migrationOutputPath, { recursive: true });
                console.log('✓ Cleaned up migration output folder');
            }

            console.log(`>>> Finished ${testInfo.title} with status: ${testInfo.status}, Attempt: ${testInfo.retry + 1}`);

        });

        test('Navigate to Import Integration from Welcome Page', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Testing Import Integration navigation in test attempt: ', testAttempt);

            // Look for the Import External Integration button on the welcome page
            const importButton = webview.getByRole('button', { name: ' Import External Integration' });
            await importButton.waitFor({ timeout: 30000 });
            await importButton.click({ force: true });

            // Verify we're navigated to the import integration form
            const importTitle = webview.getByRole('heading', { name: 'Migrate External Integration' });
            await importTitle.waitFor({ timeout: 30000 });
        });

        test('Select TIBCO Tool and Set Project Path', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Testing TIBCO tool selection and project path in test attempt: ', testAttempt);

            // Form should already be loaded from initMigrationTest
            // Wait for migration tools to be loaded
            const integrationCards = webview.locator('[id$="-integration-card"]');
            await integrationCards.first().waitFor({ timeout: 15000 });

            // Select TIBCO integration card
            const tibcoCard = webview.locator('[id$="-integration-card"]').filter({ hasText: 'TIBCO' }).first();
            await tibcoCard.click({ force: true });
            console.log('Selected TIBCO migration tool');

            // After selecting a tool, project folder selection should appear
            const folderSelectionTitle = webview.locator('h3', { hasText: 'Select Your Project Folder' });
            await folderSelectionTitle.waitFor({ timeout: 10000 });

            // Get the test resource path
            const tibcoProjectPath = path.join(__dirname, 'resources', 'sample-tibco-project');
            console.log('Test project path:', tibcoProjectPath);

            // Use Form class to handle folder selection
            const form = new Form(page.page, 'WSO2 Integrator: BI', webview);
            await form.fill({
                values: {
                    'Select Project': {
                        type: 'file',
                        value: tibcoProjectPath
                    }
                }
            });

            // Verify the path appears in the UI
            const pathDisplay = webview.locator(`span`, { hasText: tibcoProjectPath }).or(
                webview.getByText(tibcoProjectPath, { exact: true })
            );

            if (await pathDisplay.count() > 0) {
                console.log('✓ Folder path successfully set in UI');
            }

        });

        test('Start Migration Process', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Testing migration start process in test attempt: ', testAttempt);

            // Start Migration button should be enabled after previous test
            const startMigrationButton = webview.getByRole('button', { name: 'Start Migration' });
            await startMigrationButton.waitFor();

            // Verify button is enabled
            const isDisabled = await startMigrationButton.isDisabled();
            if (isDisabled) {
                throw new Error('Start Migration button is disabled - cannot proceed');
            }

            console.log('✓ Start Migration button is enabled, clicking it');
            await startMigrationButton.click({ force: true });

            // Wait for migration to start - look for progress indicators or success messages
            await page.page.waitForTimeout(2000);

            // Wait for migration to complete and look for success message
            const migrationCompleted = webview.locator('h2', { hasText: 'Migration Completed Successfully!' });

            // Give migration time to complete
            try {
                await migrationCompleted.waitFor({ timeout: 60000 });
                console.log('✓ Migration completed successfully');
            } catch (error) {
                console.log('⚠ Migration did not complete within timeout or success message not found');
                throw error;
            }

            console.log('Migration start process tested successfully');
        });

        test('Configure Integration Project', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Testing integration project configuration in test attempt: ', testAttempt);

            // Click the Next button to proceed to project configuration
            const nextButton = webview.getByRole('button', { name: 'Next' });
            await nextButton.waitFor({ timeout: 10000 });
            await nextButton.click({ force: true });
            console.log('✓ Clicked Next button to proceed to project configuration');

            // Wait for the project configuration form to appear
            const configureTitle = webview.locator('h2', { hasText: 'Configure Your Integration Project' });
            await configureTitle.waitFor({ timeout: 10000 });
            console.log('✓ Project configuration form loaded');

            // Create migration output directory if it doesn't exist
            if (!fs.existsSync(migrationOutputPath)) {
                fs.mkdirSync(migrationOutputPath, { recursive: true });
                console.log('✓ Created migration output directory');
            }

            // Fill both fields using Form class
            const form = new Form(page.page, 'WSO2 Integrator: BI', webview);
            await form.fill({
                values: {
                    'Integration Name*': {
                        type: 'input',
                        value: `TibcoMigration${testAttempt}`
                    },
                    'Select Path': {
                        type: 'file',
                        value: migrationOutputPath
                    }
                }
            });
            console.log('✓ Integration name and project location set');

            await page.page.waitForTimeout(1000); // Wait a moment until Create and Open Project button is enabled

            // Click the Create and Open Project button
            const createProjectButton = webview.getByRole('button', { name: 'Create and Open Project' });
            await createProjectButton.waitFor({ timeout: 60000 });

            // Verify button is enabled
            const isDisabled = await createProjectButton.isDisabled();
            if (isDisabled) {
                throw new Error('Create and Open Project button is disabled - form may not be complete');
            }

            console.log('✓ Create and Open Project button is enabled, clicking it');
            await createProjectButton.click({ force: true });

            await page.page.waitForTimeout(5000);

            console.log('Integration project configuration tested successfully');
        });
    });
}
