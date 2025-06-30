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

import { Page } from "@playwright/test";
import { switchToIFrame } from "@wso2/playwright-vscode-tester";
import { ProjectExplorer } from "../ProjectExplorer";
import { AddArtifact } from "../AddArtifact";
import { Overview } from "../Overview";

export class Proxy {

    constructor(private _page: Page) {
    }

    public async init() {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");

        const overviewPage = new Overview(this._page);
        await overviewPage.init();
        await overviewPage.goToAddArtifact();

        const addArtifactPage = new AddArtifact(this._page);
        await addArtifactPage.init();
        await addArtifactPage.add('Proxy');
    }

    public async add(name: string) {
        const proxyWebView = await switchToIFrame('Proxy Service Form', this._page);
        if (!proxyWebView) {
            throw new Error("Failed to switch to Proxy Service Form iframe");
        }
        const proxyFrame = proxyWebView.locator('div#root');
        await proxyFrame.getByRole('textbox', { name: 'Proxy Service Name*' }).fill(name);
        await proxyFrame.getByLabel('vfs').click();
        await proxyFrame.getByLabel('udp').click();
        await proxyFrame.getByRole('button', { name: 'Create' }).click();
    }

    public async edit(prevName: string, newName: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Proxy Services', prevName], true);

        const webView = await switchToIFrame('Proxy View', this._page);
        if (!webView) {
            throw new Error("Failed to switch to Proxy View iframe");
        }
        const frame = webView.locator('div#root');
        await frame.getByTestId('edit-button').click();
        await frame.getByRole('textbox', { name: 'Name' }).click();
        await frame.getByRole('textbox', { name: 'Name' }).fill(newName);
        await frame.getByRole('textbox', { name: 'Pinned Servers' }).fill('newPinnedServers');
        await frame.getByRole('textbox', { name: 'Service Group' }).fill('newServiceGroup');
        await frame.getByLabel('vfs').click();
        await frame.getByLabel('udp').click();
        await frame.getByRole('button', { name: 'Update' }).click();
    }

    public async createProxyServiceFormSidepanel(name: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        console.log("Navigated to project overview");
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Proxy Services'], true);
        await this._page.getByLabel('Add Proxy Service').click();
        const proxyWebView = await switchToIFrame('Proxy Service Form', this._page);
        if (!proxyWebView) {
            throw new Error("Failed to switch to Proxy Service Form iframe");
        }
        const proxyFrame = proxyWebView.locator('div#root');
        await proxyFrame.getByRole('textbox', { name: 'Proxy Service Name*' }).fill(name);
        await proxyFrame.getByLabel('rabbitmq').click();
        await proxyFrame.getByRole('button', { name: 'Create' }).click();
    }

    public async openDiagramView(name: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Proxy Services', name], true);
        const webView = await switchToIFrame('Proxy View', this._page);
        if (!webView) {
            throw new Error("Failed to switch to Proxy View iframe");
        }
        const startBtn = webView.getByText('Start');
        await startBtn.waitFor();
        await startBtn.click({force: true});
    }
}
