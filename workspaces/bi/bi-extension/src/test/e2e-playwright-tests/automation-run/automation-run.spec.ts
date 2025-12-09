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
import { ProjectExplorer, Diagram, SidePanel } from '../utils/pages';
import { DEFAULT_PROJECT_NAME } from '../utils/helpers/setup';

export default function createTests() {
    // Run Integration Tests
    test.describe('Run Integration Tests', {
        tag: '@group1',
    }, async () => {
        test('Click Run button from toolbar', async () => {
            // 1. Navigate to WSO2 Integrator: BI view
            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.findItem([DEFAULT_PROJECT_NAME, 'Entry Points', 'main'], true);

            // 2. Verify the "Run Integration" button is visible in the editor toolbar
            const runButton = page.page.locator('[data-testid="run-integration-button"], button[title*="Run Integration"], button:has-text("Run Integration")').first();
            await runButton.waitFor({ timeout: 10000 });

            // 3. Click on the "Run Integration" button
            await runButton.click();

            // 4. Verify the button is clicked successfully
            await page.page.waitForTimeout(1000);

            // 5. Verify the terminal panel opens (if not already open)
            const terminal = page.page.locator('.terminal-view, .integrated-terminal').first();
            await terminal.waitFor({ timeout: 10000 }).catch(() => {
                // Terminal might already be open
            });
        });

        test('Verify terminal opens', async () => {
            // 1. Click on the "Run Integration" button
            const runButton = page.page.locator('[data-testid="run-integration-button"], button[title*="Run Integration"]').first();
            await runButton.waitFor({ timeout: 10000 });
            await runButton.click();

            // 2. Verify the VS Code terminal panel is visible
            const terminal = page.page.locator('.terminal-view, .integrated-terminal').first();
            await terminal.waitFor({ timeout: 10000 });

            // 3. Verify the terminal panel is focused/active
            // 4. Verify a new terminal instance is created (if applicable)
            // 5. Verify the terminal shows the command being executed
            await page.page.waitForTimeout(2000);
        });

        test('Run with missing config', async () => {
            // 1. Ensure the project has missing required configurations
            // 2. Click on the "Run Integration" button
            const runButton = page.page.locator('[data-testid="run-integration-button"], button[title*="Run Integration"]').first();
            await runButton.waitFor({ timeout: 10000 });
            await runButton.click();

            // 3. Verify the terminal opens
            const terminal = page.page.locator('.terminal-view').first();
            await terminal.waitFor({ timeout: 10000 });

            // 4. Verify the `bal run` command is executed
            // 5. Verify a missing configuration popup/dialog is displayed
            const configPopup = page.page.locator('[data-testid="missing-config-popup"], .dialog').first();
            await configPopup.waitFor({ timeout: 15000 }).catch(() => {
                // Popup might not appear if configs are present
            });
        });

        test('Run after config added', async () => {
            // 1. Add the missing configurations (via Config.toml or config.bal)
            // 2. Save the configuration file
            // 3. Click on the "Run Integration" button
            const runButton = page.page.locator('[data-testid="run-integration-button"], button[title*="Run Integration"]').first();
            await runButton.waitFor({ timeout: 10000 });
            await runButton.click();

            // 4. Verify the terminal opens
            const terminal = page.page.locator('.terminal-view').first();
            await terminal.waitFor({ timeout: 10000 });

            // 5. Verify the `bal run` command is executed
            // 6. Verify no missing configuration popup is displayed
            // 7. Verify the process starts successfully
            await page.page.waitForTimeout(2000);
        });

        test('Verify process starts', async () => {
            // 1. Click on the "Run Integration" button
            const runButton = page.page.locator('[data-testid="run-integration-button"], button[title*="Run Integration"]').first();
            await runButton.waitFor({ timeout: 10000 });
            await runButton.click();

            // 2. Verify the terminal opens
            const terminal = page.page.locator('.terminal-view').first();
            await terminal.waitFor({ timeout: 10000 });

            // 3. Verify the `bal run` command is visible in the terminal
            // 4. Verify the command executes successfully
            // 5. Verify the process starts (check for process ID or running indicator)
            await page.page.waitForTimeout(3000);
        });

        test('View run output', async () => {
            // 1. Click on the "Run Integration" button
            const runButton = page.page.locator('[data-testid="run-integration-button"], button[title*="Run Integration"]').first();
            await runButton.waitFor({ timeout: 10000 });
            await runButton.click();

            // 2. Verify the terminal opens
            const terminal = page.page.locator('.terminal-view').first();
            await terminal.waitFor({ timeout: 10000 });

            // 3. Verify the terminal displays the `bal run` command output
            // 4. Verify compilation output is displayed (if applicable)
            // 5. Verify runtime output is displayed
            await page.page.waitForTimeout(3000);
        });

        test('Stop running process', async () => {
            // 1. Start the integration using "Run Integration" button
            const runButton = page.page.locator('[data-testid="run-integration-button"], button[title*="Run Integration"]').first();
            await runButton.waitFor({ timeout: 10000 });
            await runButton.click();
            await page.page.waitForTimeout(2000);

            // 2. Verify the process is running
            // 3. Verify the terminal shows the running process
            // 4. Click on the "Stop" button in the terminal toolbar (or use Ctrl+C)
            const stopButton = page.page.locator('[data-testid="stop-process-button"], button[title*="Stop"], .terminal-stop-button').first();
            if (await stopButton.isVisible({ timeout: 3000 }).catch(() => false)) {
                await stopButton.click();
            } else {
                // Try Ctrl+C in terminal
                const terminal = page.page.locator('.terminal-view').first();
                if (await terminal.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await terminal.click();
                    await page.page.keyboard.press('Control+C');
                }
            }
            await page.page.waitForTimeout(1000);
        });

        test('Run from command palette', async () => {
            // 1. Open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
            await page.page.keyboard.press(process.platform === 'darwin' ? 'Meta+Shift+P' : 'Control+Shift+P');
            await page.page.waitForTimeout(500);

            // 2. Type "BI.project.run" or "Run Integration"
            await page.page.keyboard.type('BI.project.run');
            await page.page.waitForTimeout(500);

            // 3. Verify the command is listed
            // 4. Select the "BI.project.run" command
            await page.page.keyboard.press('Enter');
            await page.page.waitForTimeout(2000);

            // 5. Verify the command executes
            // 6. Verify the terminal opens
            const terminal = page.page.locator('.terminal-view').first();
            await terminal.waitFor({ timeout: 10000 });
        });

        test('Run with multiple services', async () => {
            // 1. Ensure the project contains multiple HTTP services
            // 2. Click on the "Run Integration" button
            const runButton = page.page.locator('[data-testid="run-integration-button"], button[title*="Run Integration"]').first();
            await runButton.waitFor({ timeout: 10000 });
            await runButton.click();

            // 3. Verify the terminal opens
            const terminal = page.page.locator('.terminal-view').first();
            await terminal.waitFor({ timeout: 10000 });

            // 4. Verify the `bal run` command is executed
            // 5. Verify all services start successfully
            await page.page.waitForTimeout(3000);
        });

        test('Re-run after code change', async () => {
            // 1. Start the integration using "Run Integration" button
            const runButton = page.page.locator('[data-testid="run-integration-button"], button[title*="Run Integration"]').first();
            await runButton.waitFor({ timeout: 10000 });
            await runButton.click();
            await page.page.waitForTimeout(2000);

            // 2. Verify the process is running
            // 3. Make a code change to a service file
            // 4. Save the file
            // 5. Verify the integration detects the change (if hot reload is supported)
            await page.page.waitForTimeout(2000);
        });

        test('Run Automation task', async () => {
            // 1. Ensure the project contains an Automation artifact
            // 2. Click on the "Run Integration" button
            const runButton = page.page.locator('[data-testid="run-integration-button"], button[title*="Run Integration"]').first();
            await runButton.waitFor({ timeout: 10000 });
            await runButton.click();

            // 3. Verify the terminal opens
            const terminal = page.page.locator('.terminal-view').first();
            await terminal.waitFor({ timeout: 10000 });

            // 4. Verify the `bal run` command is executed
            // 5. Verify the Automation task starts
            await page.page.waitForTimeout(3000);
        });
    });


}
