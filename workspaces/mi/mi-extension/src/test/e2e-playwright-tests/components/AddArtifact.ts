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
import { switchToIFrame } from "@wso2/playwright-vscode-tester";
import { MACHINE_VIEW } from '@wso2/mi-core';
import { page } from '../Utils';
import { ProjectExplorer } from "../components/ProjectExplorer";
import { Overview } from "../components/Overview";

export class AddArtifact {
    private webView!: Frame;

    constructor(private _page: Page) {
    }

    public async init(projectName?: string) {
        let iframeTitle;

        try {
            const webview = await page.getCurrentWebview();
            iframeTitle = webview.title;
        } catch (error) {
            console.error("Error retrieving iframe title:", error);
            iframeTitle = null;
        }                         
        if (iframeTitle !== MACHINE_VIEW.ADD_ARTIFACT && !projectName) {
            const projectExplorer = new ProjectExplorer(this._page);
            await projectExplorer.goToOverview("testProject");
    
            const overviewPage = new Overview(this._page);
            await overviewPage.init();
            await overviewPage.goToAddArtifact();    
        } 

        const webview = projectName ? await switchToIFrame(`Add Artifact - ${projectName}`, this._page) : await switchToIFrame('Add Artifact', this._page); 
        if (!webview) {
            throw new Error("Failed to switch to Add Artifact iframe");
        }
        this.webView = webview;
    }

    public async add(artifactType: string) {
        const createIntegrationSection = this.webView.locator('div#artifacts');
        await createIntegrationSection.waitFor({ state: 'visible' });
        
        const viewMoreBtn = createIntegrationSection.locator('p:text("View More")').locator('..');
        await viewMoreBtn.waitFor({ state: 'visible' });
        await viewMoreBtn.click();
        
        const btn = createIntegrationSection.locator(`div[id="${artifactType}"]`);
        await btn.waitFor({ state: 'visible' });
        await btn.click();
    }
}
