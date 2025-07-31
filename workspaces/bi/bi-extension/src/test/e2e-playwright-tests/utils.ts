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

const dataFolder = path.join(__dirname, 'data');
const extensionsFolder = path.join(__dirname, '..', '..', '..', 'vsix');
const vscodeVersion = 'latest';
export const resourcesFolder = path.join(__dirname, '..', 'test-resources');
export const newProjectPath = path.join(dataFolder, 'new-project', 'testProject');
export let vscode;
export let page: ExtendedPage;

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
        vscode = await startVSCode(resourcesFolder, vscodeVersion, undefined, false, extensionsFolder, path.join(newProjectPath, 'testProject'), 'bi-test-profile');
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
    console.log("Finished")
}

export async function setupBallerinaIntegrator() {
    await page.selectSidebarItem('WSO2 Integrator: BI');
    const webview = await getWebview('WSO2 Integrator: BI', page);
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
        const setupButton = webview.getByRole('button', { name: 'Set up Ballerina distribution' })
        await setupButton.waitFor();
        await setupButton.click({ force: true });
        const restartButton = webview.getByRole('button', { name: 'Restart VS Code' });
        await restartButton.waitFor({ timeout: 600000 });
        await resumeVSCode();
        await setupBallerinaIntegrator();
    }
}

export async function getWebview(viewName: string, page: ExtendedPage) {
    let webview;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
        try {
            await page.page.waitForLoadState('domcontentloaded');
            await page.page.waitForTimeout(1000);

            webview = await switchToIFrame(viewName, page.page);
            if (webview) {
                return webview;
            }
            // If webview is falsy, treat it as a failed attempt
            console.log(`Attempt ${retryCount + 1} failed: switchToIFrame returned ${webview}`);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (message.includes('Frame was detached')) {
                console.log(`Frame was detached, retrying (${retryCount + 1}/${maxRetries})`);
            } else {
                console.log(`Attempt ${retryCount + 1} failed to access iframe:`, message);
            }
        }
        
        // Always increment retry count after each attempt
        retryCount++;
        
        // Only retry if we haven't reached max retries
        if (retryCount < maxRetries) {
            await page.page.waitForTimeout(2000);
            try {
                await page.selectSidebarItem(viewName);
            } catch (sidebarError) {
                console.log('Failed to reselect sidebar item:', sidebarError);
            }
        }
    }
    throw new Error(`Failed to access iframe for ${viewName} after ${maxRetries} attempts`);
}

export async function createProject(page: ExtendedPage, projectName?: string) {
    console.log('Creating new project');
    await setupBallerinaIntegrator();
    const webview = await getWebview('WSO2 Integrator: BI', page);
    if (!webview) {
        throw new Error('WSO2 Integrator: BI webview not found');
    }
    const form = new Form(page.page, 'WSO2 Integrator: BI', webview);
    await form.switchToFormView(false, webview);
    await form.fill({
        values: {
            'Integration Name': {
                type: 'input',
                value: projectName ?? 'sample',
            },
            'Select Path': {
                type: 'file',
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

export function initTest(newProject: boolean = false, skipProjectCreation: boolean = false, cleanupAfter?: boolean, projectName?: string) {
    test.beforeAll(async ({ }, testInfo) => {
        console.log(`>>> Starting tests. Title: ${testInfo.title}, Attempt: ${testInfo.retry + 1}`);
        if (!existsSync(path.join(newProjectPath, projectName ?? 'testProject')) || newProject) {
            if (fs.existsSync(newProjectPath)) {
                fs.rmSync(newProjectPath, { recursive: true });
            }
            fs.mkdirSync(newProjectPath, { recursive: true });
            console.log('Starting VSCode');
            await initVSCode();
            if (!skipProjectCreation) {
                await createProject(page, projectName);
            }
        } else {
            console.log('Resuming VSCode');
            await resumeVSCode();
            await page.page.waitForLoadState();
            await toggleNotifications(true);
        }
        console.log('Test runner started');
    });

    test.afterAll(async ({ }, testInfo) => {
        if (cleanupAfter && fs.existsSync(newProjectPath)) {
            fs.rmSync(newProjectPath, { recursive: true });
        }
        console.log(`>>> Finished ${testInfo.title} with status: ${testInfo.status}, Attempt: ${testInfo.retry + 1}`);
    });
}

export async function addArtifact(artifactName: string, testId: string) {
    console.log(`Adding artifact: ${artifactName}`);
    const artifactWebView = await getWebview('WSO2 Integrator: BI', page);
    if (!artifactWebView) {
        throw new Error('WSO2 Integrator: BI webview not found');
    }
    // Navigate to the overview page
    await artifactWebView.getByRole('button', { name: ' Add Artifact' }).click();
    // how to get element by id
    const addArtifactBtn = artifactWebView.locator(`#${testId}`);
    await addArtifactBtn.waitFor();
    await addArtifactBtn.click();
}

export async function enableICP() {
    console.log('Enabling ICP');
    const webview = await getWebview('WSO2 Integrator: BI', page);
    if (!webview) {
        throw new Error('WSO2 Integrator: BI webview not found');
    }
    const icpToggle = webview.getByRole('checkbox', { name: 'Enable WSO2 Integrator: ICP' });
    await icpToggle.waitFor();
    if (!(await icpToggle.isChecked())) {
        await icpToggle.click();
    }
}

/**
 * Normalize source code for comparison
 */
function normalizeSource(source: string): string {
    return source
        .replace(/\r\n/g, '\n')           // Normalize line endings
        .replace(/\t/g, '    ')           // Convert tabs to spaces
        .split('\n')
        .map(line => line.trimEnd())      // Remove trailing whitespace
        .filter(line => line.trim() !== '') // Remove empty lines
        .join('\n')
        .trim();
}

/**
 * Compare a generated .bal file with an expected .bal file
 * @param generatedFileName - Name of the generated file (e.g., 'types.bal')
 * @param expectedFilePath - Path to the expected file (e.g., path to testOutput.bal)
 */
export async function verifyGeneratedSource(generatedFileName: string, expectedFilePath: string): Promise<void> {
    const { expect } = await import('@playwright/test');
    
    // Generated file is in the project sample folder
    const generatedFilePath = path.join(newProjectPath, 'sample', generatedFileName);
    
    if (!fs.existsSync(generatedFilePath)) {
        throw new Error(`Generated file not found at: ${generatedFilePath}`);
    }
    
    if (!fs.existsSync(expectedFilePath)) {
        throw new Error(`Expected file not found at: ${expectedFilePath}`);
    }
    
    const actualContent = fs.readFileSync(generatedFilePath, 'utf-8');
    const expectedContent = fs.readFileSync(expectedFilePath, 'utf-8');
    
    const normalizedActual = normalizeSource(actualContent);
    const normalizedExpected = normalizeSource(expectedContent);
    
    expect(normalizedActual).toBe(normalizedExpected);
}
