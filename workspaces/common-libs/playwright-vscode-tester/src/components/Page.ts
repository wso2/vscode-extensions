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

import { Page } from '@playwright/test';
import * as os from 'os';

export class ExtendedPage {
    constructor(private _page: Page) {
    }

    get page(): Page {
        return this._page;
    }

    async waitUntilExtensionReady() {
        if (process.env.CI) {
            return;
        }
        await this._page.waitForSelector('a:has-text("Activating Extensions...")', { timeout: 60000 });
        await this._page.waitForSelector('a:has-text("Activating Extensions...")', { state: 'detached' });
    }

    async getCurrentWebview() {
        const webviewFrame = this._page.locator('iframe.webview.ready');
        await webviewFrame.waitFor({ timeout: 30000 });
        const frame = webviewFrame.contentFrame();
        if (!frame) {
            throw new Error(`IFrame not found`);
        }
        const targetFrame = frame.locator(`iframe[title]`);
        await targetFrame.waitFor({ timeout: 30000 });
        const iframeTitle = await targetFrame.getAttribute('title');
        const webview = targetFrame.contentFrame();
        console.log('Current webview:', iframeTitle);
        return { title: iframeTitle, webview };
    }

    async executePaletteCommand(command: string) {
        await this._page.keyboard.press(os.platform() === 'darwin' ? 'Meta+Shift+p' : 'Control+Shift+p');
        await this._page.keyboard.type(command);
        await this._page.keyboard.press('Enter');
    }

    async selectSidebarItem(item: string) {
        await this._page.waitForSelector(`a[aria-label="${item}"]`);
        return await this._page.click(`a[aria-label="${item}"]`);
    }
}
