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

import { ExtendedPage, startVSCode, switchToIFrame } from "@wso2/playwright-vscode-tester";
import { Form } from "./components/Form";
import { Welcome } from "./components/Welcome";
import path from "path";
import { ElectronApplication, expect } from "@playwright/test";
import { test } from '@playwright/test';
import fs, { existsSync } from 'fs';
import { promises as fsp } from 'fs';
import { readFile } from 'fs/promises';
import { Page } from "@playwright/test";

export const dataFolder = path.join(__dirname, 'data');
const extensionsFolder = path.join(__dirname, '..', '..', '..', 'vsix');
const vscodeVersion = 'latest';
export const resourcesFolder = path.join(__dirname, '..', 'test-resources');
export const newProjectPath = path.join(dataFolder, 'new-project', 'testProjectFolder');
export const screenShotsFolder = path.join(__dirname, '..', 'test-resources', 'screenshots');
export const videosFolder = path.join(__dirname, '..', 'test-resources', 'videos');

export let vscode: ElectronApplication | undefined;
export let page: ExtendedPage;

async function initVSCode(groupName?: string, title?: string, attempt: number = 1) {
    if (vscode && page) {
        await page.executePaletteCommand('Reload Window');
        await page.executePaletteCommand('View: Toggle Secondary Side Bar Visibility');
    } else {
        vscode = await startVSCode(resourcesFolder, vscodeVersion, undefined, false, extensionsFolder, newProjectPath, 'mi-test-profile');
    }
    page = new ExtendedPage(await vscode!.firstWindow({ timeout: 60000 }));
}

export async function buildAndRunProject(page: ExtendedPage) {
    console.log('Building and running the project');
    await page.page.getByRole('button', { name: 'Build and Run' }).click();
    console.log('Clicked the Build and Run button');
    await page.page.getByText('Runtime Services', { exact: true }).waitFor();
    console.log('Project built and run successfully');
}

export async function stopRunningProject(page: ExtendedPage) {
    console.log('Stopping the running project');
    await page.page.getByRole('button', { name: 'Stop (⇧F5)' }).click();
    await page.page.getByRole('tab', { name: 'Runtime Services, Editor Group' }).getByLabel('Close (⌘W)').click();
    await page.page.getByRole('checkbox', { name: 'Hide Panel (⌘J)' }).click();
    console.log('Stopped the project and closed the runtime services tab');
}

export async function createProject(page: ExtendedPage, projectName?: string, runtimeVersino?: string, addAdvancedConfig: boolean = false) {
    console.log('Creating new project with runtime version ' + (runtimeVersino || '4.4.0'));
    await page.selectSidebarItem('WSO2 Integrator: MI');
    const welcomePage = new Welcome(page);
    await welcomePage.init();
    await welcomePage.createNewProject();

    const createNewProjectForm = new Form(page.page, 'Project Creation Form');
    await createNewProjectForm.switchToFormView();
    await createNewProjectForm.fill({
        values: {
            'Project Name*': {
                type: 'input',
                value: projectName || 'testProject',
            },
            'WSO2 Integrator: MI runtime version*': {
                type: 'dropdown',
                value: runtimeVersino || '4.4.0'
            },
            'Select Location': {
                type: 'file',
                value: newProjectPath
            }
        }
    });
    if (addAdvancedConfig) {
        const webView = await switchToIFrame('Project Creation Form', page.page);
        if (!webView) {
            throw new Error("Failed to switch to Project Creation Form iframe");
        }
        await webView.locator('vscode-button[title="Expand"]').click();
        await webView.getByRole('textbox', { name: 'Artifact Id*' }).fill('test');
    }
    await createNewProjectForm.submit();
    await welcomePage.waitUntilDeattached();
    await page.page.getByRole('button', { name: "No, Don't Ask Again" })
        .click({ timeout: 30000 }).catch(() => {});
    console.log('Project created');

    const setupEnvPage = new Welcome(page);
    await setupEnvPage.setupEnvironment();
    console.log('Environment setup done');
}

export async function resumeVSCode(groupName?: string, title?: string, attempt: number = 1) {
    if (vscode && page) {
        console.log('Reloading VSCode');
        await page.page.waitForTimeout(1000);
        await page.executePaletteCommand('Reload Window');
    } else {
        console.log('Starting VSCode');
        vscode = await startVSCode(resourcesFolder, vscodeVersion, undefined, false, extensionsFolder, path.join(newProjectPath, 'testProject'), 'mi-test-profile');
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    page = new ExtendedPage(await vscode!.firstWindow({ timeout: 60000 }));
}

export async function clearNotificationAlerts() {
    console.log(`Clearing notifications`);
    if (page) {
        await page.executePaletteCommand("Notifications: Clear All Notifications");
    }
}

export async function clearNotificationsByCloseButton(page: ExtendedPage) {
    const notificationsCloseButton = page.page.locator('a.action-label.codicon.codicon-notifications-clear');
    while (await notificationsCloseButton.count() > 0) {
        await notificationsCloseButton.first().click({ force: true });
    }
}

export async function toggleNotifications(disable: boolean) {
    const notificationStatus = page.page.locator('#status\\.notifications');
    await notificationStatus.waitFor();
    const ariaLabel = await notificationStatus.getAttribute('aria-label');
    if ((ariaLabel !== "Do Not Disturb" && disable) || (ariaLabel === "Do Not Disturb" && !disable)) {
        await page.executePaletteCommand("Notifications: Toggle Do Not Disturb Mode");
    }

}

export async function showNotifications() {
    await page.executePaletteCommand("Notifications: Show Notifications");
}

export async function closeEditorGroup() {
    await page.executePaletteCommand('Close Editor Group');
}

async function safeCleanup(directoryPath: string) {
    // Add a small delay to allow any pending file operations to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Attempt cleanup multiple times with delay between attempts
    for (let i = 0; i < 5; i++) {
        try {
            if (fs.existsSync(directoryPath)) {
                await fs.promises.rm(directoryPath, { recursive: true, force: true });
                // Final verification
                if (!fs.existsSync(directoryPath)) {
                    console.log(`Successfully cleaned up directory: ${directoryPath}`);
                    break;
                }
            } else {
                console.log(`Directory does not exist: ${directoryPath}`);
                break;
            }
        } catch (err: any) {
            console.warn(`Cleanup attempt ${i + 1} failed for ${directoryPath}: ${err?.message || 'Unknown error'}`);
            if (i === 4) {
                console.error(`Failed to cleanup directory after 5 attempts: ${directoryPath}`);
                // Don't throw error, just log warning to prevent test failures
                return;
            }
            // Wait longer between retries
            await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
        }
    }
}

export function initTest(newProject: boolean = false, skipProjectCreation: boolean = false, cleanupAfter?: boolean, projectName?: string, runtimeVersion?: string, groupName?: string) {
    test.beforeAll(async ({ }, testInfo) => {
        console.log(`>>> Starting tests. Title: ${testInfo.title}, Attempt: ${testInfo.retry + 1}`);
        if (!existsSync(path.join(newProjectPath, projectName ?? 'testProject')) || newProject) {
            // Safely cleanup and close VS Code before removing directory
            await safeCleanup(newProjectPath);
            fs.mkdirSync(newProjectPath, { recursive: true });
            console.log('Starting VSCode');
            await initVSCode(groupName, testInfo.title, testInfo.retry + 1);
            await toggleNotifications(true);
            if (!skipProjectCreation) {
                await createProject(page, projectName, runtimeVersion);
            }
        } else {
            console.log('Resuming VSCode');
            await resumeVSCode(groupName, testInfo.title, testInfo.retry + 1);
            await page.page.waitForLoadState();
            await toggleNotifications(true);
        }
        console.log('Test runner started');
    });

    test.afterEach(async ({ }, testInfo) => {
        console.log(`>>> Finished test: ${testInfo.title} with status: ${testInfo.status}, Attempt: ${testInfo.retry + 1}`);
        if (testInfo.status === 'failed') {
            const screenshotPath = path.join(screenShotsFolder, `${testInfo.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${testInfo.retry + 1}.png`);
            await page.page.screenshot({ path: screenshotPath });
            console.log(`Screenshot saved at ${screenshotPath}`);
        }
    });

    test.afterAll(async ({ }, testInfo) => {
        if (cleanupAfter && fs.existsSync(newProjectPath)) {
            try {
                await safeCleanup(newProjectPath);
            } catch (error: any) {
                console.warn(`Warning: Could not remove directory ${newProjectPath}: ${error?.message || 'Unknown error'}`);
            }
        }
        console.log(`>>> Finished ${testInfo.title} with status: ${testInfo.status}, Attempt: ${testInfo.retry + 1}`);
    });
}

export async function copyFile(source: string, destination: string) {
    console.log('Copying file from ' + source + ' to ' + destination);

    if (existsSync(destination)) {
        fs.rmSync(destination);
    }
    fs.copyFileSync(source, destination);
}

export async function waitUntilPomContains(page: Page, filePath: string, expectedText: string, timeout = 20000) {
    await expect.poll(async () => {
        try {
            const content = await readFile(filePath, 'utf8');
            return content.includes(expectedText);
        } catch (error) {
            return false; // File might not exist yet
        }
    }, {
        message: `Timed out waiting for '${expectedText}' in ${filePath}`,
        timeout: timeout,
        intervals: [500, 1000, 2000] // Progressive polling intervals
    }).toBe(true);
    
    return true;
}

export async function waitUntilPomNotContains(page: Page, filePath: string, expectedText: string, timeout = 20000) {
    await expect.poll(async () => {
        try {
            const content = await readFile(filePath, 'utf8');
            return !content.includes(expectedText);
        } catch (error) {
            return true; // If file doesn't exist, it doesn't contain the text
        }
    }, {
        message: `Timed out waiting for '${expectedText}' to be removed from ${filePath}`,
        timeout: timeout,
        intervals: [500, 1000, 2000] // Progressive polling intervals
    }).toBe(true);
    
    return true;
}
