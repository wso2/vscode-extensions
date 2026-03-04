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

import { ExtendedPage, Form, startVSCode, switchToIFrame } from "@wso2/playwright-vscode-tester";
import { test } from '@playwright/test';
import fs, { existsSync } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getWebview } from './webview';

const dataFolder = path.join(__dirname, '..', 'data');
export const extensionsFolder = path.join(__dirname, '..', '..', '..', '..', '..', 'vsix');
const vscodeVersion = 'latest';
export const resourcesFolder = path.join(__dirname, '..', '..', '..', 'test-resources');
export const newProjectPath = path.join(dataFolder, 'new-project', 'testProject');
export let vscode: any;
export let page: ExtendedPage;

const execAsync = promisify(exec);

/**
 * Execute bal pull command to download Ballerina packages before project creation
 * This is done to fix "Language server has stopped working due to unresolved modules in your project. Please resolve them to proceed." issue
 * This is a temporary solution until Ballerina 2201.13.0 release
 */
async function executeBallPullCommand(): Promise<void> {
    console.log('Executing bal pull ballerina/task:2.7.0...');
    try {
        const { stdout, stderr } = await execAsync('bal pull ballerina/task:2.7.0');
        console.log('bal pull stdout:', stdout);
        if (stderr) {
            console.warn('bal pull stderr:', stderr);
        }
        console.log('✓ Successfully executed bal pull ballerina/task:2.7.0');
    } catch (error) {
        console.error('Failed to execute bal pull command:', error);
        // Don't throw error - continue with project creation even if bal pull fails
        // This ensures tests don't fail due to network issues or package availability
        console.warn('Continuing with project creation despite bal pull failure...');
    }
}

async function initVSCode() {
    if (vscode && page) {
        await page.executePaletteCommand('Reload Window');
    } else {
        vscode = await startVSCode(resourcesFolder, vscodeVersion, undefined, false, extensionsFolder, newProjectPath, 'bi-test-profile');
    }
    page = new ExtendedPage(await vscode!.firstWindow({ timeout: 60000 }));
}

async function resumeVSCode() {
    if (vscode && page) {
        await page.executePaletteCommand('Reload Window');
    } else {
        console.log('Starting VSCode');
        vscode = await startVSCode(resourcesFolder, vscodeVersion, undefined, false, extensionsFolder, path.join(newProjectPath, 'sample'), 'bi-test-profile');
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    page = new ExtendedPage(await vscode!.firstWindow({ timeout: 60000 }));
}

export async function toggleNotifications(disable: boolean) {
    const notificationStatus = page.page.locator('#status\\.notifications');
    await notificationStatus.waitFor();
    const ariaLabel = await notificationStatus.getAttribute('aria-label');
    if ((ariaLabel !== "Do Not Disturb" && disable) || (ariaLabel === "Do Not Disturb" && !disable)) {
        console.log("Toggling notifications");
        await page.executePaletteCommand("Notifications: Toggle Do Not Disturb Mode");
        console.log("Toggled notifications");
    }
    console.log("Finished");
}

export async function setupBallerinaIntegrator() {
    await page.selectSidebarItem('WSO2 Integrator: BI');
    console.log('Selecting WSO2 Integrator: BI sidebar item');
    let webview;
    try {
        webview = await switchToIFrame('WSO2 Integrator: BI', page.page, 20000);
    } catch (error) {
        console.log('Failed to get webview on first attempt, retrying...');
        await page.selectSidebarItem('WSO2 Integrator: BI');
        webview = await getWebview('WSO2 Integrator: BI', page);
    }
    if (!webview) {
        throw new Error('WSO2 Integrator: BI webview not found');
    }
    const txt = webview.locator('text=WSO2 Integrator: BI for VS');
    await txt.waitFor({ timeout: 30000 });
    const createNewIntegrationBtn = webview.getByRole('button', { name: 'Create New Integration' });
    try {
        // Check if 'Create New Integration' button exists
        await createNewIntegrationBtn.waitFor({ timeout: 1000 });
        console.log('Found Create New Integration button, clicking it');
        await createNewIntegrationBtn.click({ force: true });
    } catch (error) {
        console.log('Create New Integration button not found, will use Set up Ballerina distribution button');
        const setupButton = webview.getByRole('button', { name: 'Set up Ballerina distribution' });
        await setupButton.waitFor();
        await setupButton.click({ force: true });
        const restartButton = webview.getByRole('button', { name: 'Restart VS Code' });
        await restartButton.waitFor({ timeout: 600000 });
        await resumeVSCode();
        await setupBallerinaIntegrator();
    }
}

export const DEFAULT_PROJECT_NAME = 'sample';

export async function createProject(page: ExtendedPage, projectName?: string) {
    console.log('Creating new project');

    // Execute bal pull command before project creation
    await executeBallPullCommand();

    await setupBallerinaIntegrator();
    const webview = await getWebview('WSO2 Integrator: BI', page);
    if (!webview) {
        throw new Error('WSO2 Integrator: BI webview not found');
    }
    const form = new Form(page.page, 'WSO2 Integrator: BI', webview);
    await form.switchToFormView(false, webview);
    await form.fill({
        values: {
            'Integration Name*': {
                type: 'input',
                value: projectName ?? DEFAULT_PROJECT_NAME,
            },
            'Select Path': {
                type: 'directory',
                value: newProjectPath
            }
        }
    });
    await form.submit('Create Integration');
    const artifactWebView = await getWebview('WSO2 Integrator: BI', page);
    if (!artifactWebView) {
        throw new Error('WSO2 Integrator: BI webview not found');
    }
    const integrationName = artifactWebView.locator('text=sample');
    await integrationName.waitFor({ timeout: 200000 });
}

export function initTest(newProject: boolean = true, skipProjectCreation: boolean = false, cleanupAfter?: boolean, projectName?: string) {
    test.beforeAll(async ({ }, testInfo) => {
        console.log(`\n▶️  STARTING TEST: ${testInfo.title} (Attempt ${testInfo.retry + 1})`);
        if (!existsSync(path.join(newProjectPath, projectName ?? 'sample')) || newProject) {
            if (fs.existsSync(newProjectPath)) {
                fs.rmSync(newProjectPath, { recursive: true });
            }
            fs.mkdirSync(newProjectPath, { recursive: true });
            console.log('  📦 Starting VSCode...');
            await initVSCode();
            if (!skipProjectCreation) {
                await createProject(page, projectName);
            }
        } else {
            console.log('  🔄 Resuming VSCode...');
            await resumeVSCode();
            await page.page.waitForLoadState();
            await toggleNotifications(true);
        }
        console.log('  ✅ Test environment ready');
    });

    test.afterAll(async ({ }, testInfo) => {
        if (cleanupAfter && fs.existsSync(newProjectPath)) {
            fs.rmSync(newProjectPath, { recursive: true });
        }
        const statusEmoji = testInfo.status === 'passed' ? '✅' : testInfo.status === 'failed' ? '❌' : '⏭️';
        console.log(`${statusEmoji} FINISHED TEST: ${testInfo.title} (${testInfo.status.toUpperCase()}, Attempt ${testInfo.retry + 1})\n`);
    });
}

export function initMigrationTest() {
    test.beforeAll(async ({ }, testInfo) => {
        console.log(`>>> Starting migration tests. Title: ${testInfo.title}, Attempt: ${testInfo.retry + 1}`);
        console.log('Setting up BI extension for migration testing');
        if (!existsSync(path.join(newProjectPath, 'sample'))) {
            if (fs.existsSync(newProjectPath)) {
                fs.rmSync(newProjectPath, { recursive: true });
            }
            fs.mkdirSync(newProjectPath, { recursive: true });
            console.log('Starting VSCode');
        } else {
            console.log('Resuming VSCode');
            await resumeVSCode();
            await page.page.waitForLoadState();
            await toggleNotifications(true);
        }
        await initVSCode();
        await page.page.waitForLoadState();
        await toggleNotifications(true);

        // Reload VS Code to apply the language server setting
        await page.executePaletteCommand('Reload Window');
        await page.page.waitForLoadState();
        await page.page.waitForTimeout(5000); // Give VS Code time to fully reload

        // Select the BI sidebar item and navigate to Import External Integration
        await page.selectSidebarItem('WSO2 Integrator: BI');
        const webview = await getWebview('WSO2 Integrator: BI', page);
        if (!webview) {
            throw new Error('WSO2 Integrator: BI webview not found');
        }
        console.log('Migration test runner started');
    });
}
