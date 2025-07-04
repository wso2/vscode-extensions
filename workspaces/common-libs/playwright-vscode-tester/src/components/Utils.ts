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

import { Frame, Locator, Page, expect } from "@playwright/test";

export async function switchToIFrame(
    frameName: string,
    page: Page,
    timeout: number = 150000
): Promise<Frame | null> {
    await page.waitForLoadState();
    const webviewFrame = await page.waitForSelector('iframe.webview.ready', { timeout });
    const frame = await webviewFrame.contentFrame();
    if (!frame) {
        throw new Error(`IFrame of ${frameName} not found`);
    }
    await frame.waitForLoadState();
    const targetFrame = await frame.waitForSelector(`iframe[title="${frameName}"]`, { timeout });
    if (!targetFrame) {
        throw new Error(`IFrame of ${frameName} not found`);
    }
    const childFrame = await targetFrame.contentFrame();
    await childFrame?.waitForLoadState();
    await page.waitForTimeout(2000); // To fix intermittent issues since VSCode is not using network calls to load the webview
    return childFrame;
}

export async function getVsCodeButton(container: Locator | Frame, text: string, type: 'primary' | 'secondary'): Promise<Locator> {
    const btn = container.locator(`vscode-button:has-text("${text}")`);
    await btn.waitFor();
    expect(btn).toHaveAttribute('appearance', type);
    return btn;
}

export async function getWebviewInput(container: Locator | Frame, label: string): Promise<Locator> {
    const input = container.locator(`input[aria-label="${label}"]`);
    await input.waitFor();
    return input;
}
