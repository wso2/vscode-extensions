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

export class EventIntegration {

    constructor(private _page: Page) {
    }

    public async init() {
        const addArtifactPage = new AddArtifact(this._page);
        await addArtifactPage.init();
        await addArtifactPage.add('Event Integration');
    }

    public async add(name: string) {
        const epWebView = await switchToIFrame('Event Integration Form', this._page);
        if (!epWebView) {
            throw new Error("Failed to switch to Event Integration Form iframe");
        }
        await epWebView.getByText('Inbuilt HTTP Event Listener').click();
        await epWebView.getByRole('textbox', { name: 'Event Integration Name*' }).fill(name);
        try {
            await epWebView.getByText('An artifact with same').click();
            console.log('Artifact:' + name + 'found, no action on Create button.');
            return;
        } catch (error) {
            await epWebView.getByRole('textbox', { name: 'Port*' }).fill('8093');
            await epWebView.getByRole('button', { name: 'Create' }).click();         
        }
    }

    public async edit(name: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Event Integrations', name], true);
        const webView = await switchToIFrame('Event Integration View', this._page);
        if (!webView) {
            throw new Error("Failed to switch to Event Integration View iframe");
        }
        await webView.getByTestId('edit-button').click();
        await webView.getByRole('textbox', { name: 'Port*' }).fill('8098');
        await webView.getByText('Update').click();
    }

    public async openDiagramView(name: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Event Integrations', name], true);
        const webView = await switchToIFrame('Event Integration View', this._page);
        if (!webView) {
            throw new Error("Failed to switch to Event Integration View iframe");
        }
        await webView.getByText('Start').click();
    }
}
