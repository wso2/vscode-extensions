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
import { switchToIFrame } from "@wso2/playwright-vscode-tester";

export class ServiceDesigner {
    private webView!: Frame;

    constructor(private _page: Page) {
    }

    public async init() {
        const webview = await switchToIFrame("Service Designer", this._page)
        if (!webview) {
            throw new Error("Failed to switch to Service Designer iframe");
        }
        this.webView = webview;
    }

    public async resource(type: string, path: string) {
        const resourceList = this.webView.getByTestId("service-design-view-resource");
        await resourceList.waitFor({timeout: 60000});
        const resource = resourceList.filter({ hasText: type }).filter({ hasText: path });
        expect(resource).not.toBeNull();

        return new Resource(resource, this.webView);
    }
}

class Resource {
    constructor(private resource: Locator, private webView: Frame) {
    }

    public async click() {
        await this.resource.click();

    }

    public async goToSource() {
        const contextMenu = await this.getContextMenu();
        await contextMenu.getByTestId("context-menu-go-to-source").click();
    };
    public async edit() {
        const contextMenu = await this.getContextMenu();
        await contextMenu.getByTestId("context-menu-edit").click();
    };
    public async delete() {
        const contextMenu = await this.getContextMenu();
        await contextMenu.getByTestId("context-menu-delete").click();
    };

    private async getContextMenu() {
        const menuBtn = this.resource.locator("#component-list-menu-btn");
        await menuBtn.waitFor();
        await menuBtn.click();
        const contextMenu = this.webView.getByLabel("Context Menu");
        await contextMenu.waitFor();
        return contextMenu;
    }
}
