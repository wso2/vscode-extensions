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

import { Frame, Page } from "@playwright/test";
import { getVsCodeButton, switchToIFrame } from "@wso2/playwright-vscode-tester";

export class InboundEPForm {
    private webView!: Frame;

    constructor(private _page: Page) {
    }

    public async init() {
        const webview = await switchToIFrame(`Event Integration Form`, this._page)
        if (!webview) {
            throw new Error("Failed to switch to Inbound EP iframe");
        }
        this.webView = webview;
    }

    public async selectType(type: string) {
        const inboundEPSection = this.webView.locator('div.form-view');
        await inboundEPSection.waitFor();

        const inboundTypeBtn = inboundEPSection.locator(`div[id="${type}"]`);
        await inboundTypeBtn.waitFor();
        await inboundTypeBtn.click();

        const typeLabel = inboundEPSection.locator('span:text("Type:")');
        await typeLabel.waitFor();

        const typeChip = inboundEPSection.locator(`div:text("${type}")`);
        await typeChip.waitFor();
    }

    public async selectStoreType(type: string, typeChipName?: string) {
        const inboundEPSection = this.webView.locator('div.form-view');
        await inboundEPSection.waitFor();

        const inboundTypeBtn = inboundEPSection.locator(`div[id="${type}"]`);
        await inboundTypeBtn.waitFor();
        await inboundTypeBtn.click();
        let isDownloadingMessageVisible = false;

        try {
            console.log('Confirming download of dependencies');
            const dependencyConfirmationLocator = inboundEPSection.locator(`p:text("Dependencies will be added to the project. Do you want to continue?")`).locator('..');
            await dependencyConfirmationLocator.waitFor();

            const confiramtionBtn = await getVsCodeButton(dependencyConfirmationLocator, "Yes", "primary");
            await confiramtionBtn.click();
            console.log('Download dependency confirmed');
            
            const downloadingMessageLocator = inboundEPSection.locator(`span:text("Downloading connector... This might take a while")`);
            try {
                await downloadingMessageLocator.waitFor({ state: 'visible', timeout: 5000 });
                console.log('Downloading connector message appeared');
                isDownloadingMessageVisible = true;
            } catch (error) {
                console.log('Downloading connector message did not appear, proceeding with test');
            }
            if (isDownloadingMessageVisible) {
                await downloadingMessageLocator.waitFor({ state: 'detached', timeout: 600000 });
                console.log('Downloading connector message disappeared');
            }
        } catch (error) {
            console.log("Dependency download confirmation not found");
        }

        const typeLabel = inboundEPSection.locator(`span:text("Type:")`);
        await typeLabel.waitFor();

        const typeChipLocator = inboundEPSection.locator(`div:text("${typeChipName ?? type}")`);
        await typeChipLocator.waitFor();
    }

}
