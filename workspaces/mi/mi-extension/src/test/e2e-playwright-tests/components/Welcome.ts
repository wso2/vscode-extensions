1/**
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

import { Locator } from "@playwright/test";
import { MACHINE_VIEW } from "@wso2/mi-core";
import { ExtendedPage, getVsCodeButton, switchToIFrame } from "@wso2/playwright-vscode-tester";

export class Welcome {
    private container!: Locator;

    constructor(private page: ExtendedPage) {
    }

    public async init() {
        const webview = await switchToIFrame(MACHINE_VIEW.Welcome, this.page.page, 60000)
        if (!webview) {
            throw new Error("Failed to switch to Design View iframe");
        }
        this.container = webview.locator('div#root');
    }
    public async createNewProject() {
        const btn = await getVsCodeButton(this.container, 'Create New Project', 'primary', 150000);
        await btn.click();
    }

    public async createNewProjectFromSample(projectName: string, path: string) {
        await this.container.getByText(projectName).click({ force: true });
        const fileInput = await this.page.page?.waitForSelector('.quick-input-header');
        const textInput = await fileInput?.waitForSelector('input[type="text"]');
        await textInput?.fill(path);
        const selectBtn = await fileInput?.waitForSelector('a.monaco-button:has-text("Select Folder")');
        await selectBtn?.click();
        await this.page.page.getByRole('button', { name: 'New Window' }).click();
        await this.page.page.getByRole('button', { name: "No, Don't Ask Again" })
            .click({ timeout: 30000 }).catch(() => { });
    }

    public async waitUntilDeattached() {
        await this.page.page.waitForSelector('iframe.webview.ready', { state: 'detached', timeout: 180000 });
    }

    public async setupEnvironment() {
        const { title: iframeTitle, webview } = await this.page.getCurrentWebview();

        if (iframeTitle === MACHINE_VIEW.ADD_ARTIFACT) {
            return true;
        }
        if (iframeTitle !== MACHINE_VIEW.SETUP_ENVIRONMENT) {
            throw new Error(`Invalid IFrame: ${iframeTitle}`);
        }

        console.log('Setting up environment');
        const container = webview?.locator('div#root');
        await container.waitFor();

        //  if both Java and MI are not setup, we will download both
        const downloadJavaAndMi = container.locator(`vscode-button:has-text("Download Java & MI")`);
        if (await downloadJavaAndMi.count() > 0) {
            console.log('Downloading Java and WSO2 Integrator: MI');
            await downloadJavaAndMi.click();
            try {
                console.log(`Waiting for I Agree button`);
                const iAgreeBtn = await getVsCodeButton(container!, 'I Agree', 'primary');
                await iAgreeBtn.click();
            } catch (error) {
                console.log('No terms and conditions to accept');
            }
            // Wait for both Java and MI to be downloaded
            try {
                console.log('Waiting for Java and WSO2 Integrator: MI to be setup');
                await container.locator('div:has-text("Java is setup")').first().waitFor({ timeout: 100000 });
                console.log('Java setup done');
                await container.locator('div:has-text("WSO2 Integrator: MI is setup")').first().waitFor({ timeout: 100000 });
                console.log('WSO2 Integrator: MI setup done');
            } catch (error) {
                console.log('No Java and MI setup messages, assuming both are setup');
            }
        } else {
            const javaErrorMessage = container?.locator('div:has-text("Java is not properly setup")');
            await javaErrorMessage?.waitFor({ timeout: 8000 }).catch(() => { });
            if (await javaErrorMessage!.count() > 0) {
                console.log('Java is not setup');
                const downloadJava = await getVsCodeButton(container!, 'Download Java', 'primary');
                await downloadJava.click();

                // Wait for Java to be downloaded
                await container?.locator('div:has-text("Java is setup")').first().waitFor({ timeout: 180000 });
                console.log('Java setup done');
            }
            const microIntegratorErrorMessage = container?.locator('div:has-text("WSO2 Integrator: MI is not available")');
            if (await microIntegratorErrorMessage!.count() > 0) {
                console.log('WSO2 Integrator: MI is not setup');
                const checkbox = container?.locator(`vscode-checkbox[aria-label="Download Latest Pack"]`);
                if (await checkbox?.count() > 0) {
                    const isChecked = await checkbox.isChecked();
                    if (isChecked) {
                        await checkbox.click();
                    }
                }
                const downloadMI = await getVsCodeButton(container!, 'Download WSO2 Integrator: MI', 'primary');
                await downloadMI.click();

                // Wait for MI to be downloaded
                await container.locator('div:has-text("WSO2 Integrator: MI is setup")').first().waitFor({ timeout: 180000 });
                console.log('WSO2 Integrator: MI setup done');
            }
        }

        console.log('Finalizing environment setup');
        
        try {
            const continueBtn = container.locator(`vscode-button:has-text("Continue")`);
            console.log('Clicking Continue button');
            await continueBtn.click({ timeout: 10000 });
        } catch (error) {
            console.log('Continue button not found, trying Continue Anyway button');
            try {
                const continueAnywayBtn = await getVsCodeButton(container!, 'Continue Anyway', 'secondary');
                console.log('Clicking Continue Anyway button');
                await continueAnywayBtn.click({ timeout: 10000 });
            } catch (innerError) {
                console.log('No continue buttons found, proceeding without clicking');
            }
        }
        
        console.log('Clicking No, Don\'t Ask Again button');
        await container!.page().getByRole('button', { name: "No, Don't Ask Again" })
            .click({ timeout: 10000 }).catch(() => { });
        console.log('Environment setup done');
    }
}
