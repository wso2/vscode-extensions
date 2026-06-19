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

import { Locator, Page } from "@playwright/test";
import { ExtendedPage } from "@wso2/playwright-vscode-tester";

export class ProjectExplorer {
    private explorer!: Locator;

    constructor(private page: Page, name?: string) {
        if (name) {
            this.explorer = this.page.locator(`div[role="tree"][aria-label="${name}"]`);
        } else {
            this.explorer = this.page.locator('div[role="tree"]').filter({
                has: this.page.locator('div[role="treeitem"][aria-label^="Project "]')
            });
        }
    }

    private treeItem(label: string): string {
        return `div[role="treeitem"][aria-label="${label}"], div[role="treeitem"][aria-label^="${label}, "]`;
    }

    public async init () {
        await this.explorer.waitFor();
    }

    public async findItem(path: string[], click: boolean = false): Promise<Locator | undefined> {
        let currentItem: Locator | undefined = undefined;
        for (let i = 0; i < path.length; i++) {

            currentItem = this.explorer.locator(this.treeItem(path[i]));
            await currentItem.waitFor();

            if (i < path.length - 1) {
                const isExpanded = await currentItem.getAttribute('aria-expanded');
                if (isExpanded === 'false') {
                    await currentItem.click();
                }
            } else {
                if (click) {
                    await currentItem.click();
                } else {
                    await currentItem.hover();
                }
            }
        }
        return currentItem;
    }

    private async focusProjectExplorer() {
        await new ExtendedPage(this.page).executePaletteCommand('Focus on MI Project Explorer View');
        await this.page.waitForTimeout(500);
    }

    public async goToOverview(projectName: string, timeout?: number) {
        const projectExplorerRoot = this.explorer.locator(this.treeItem(`Project ${projectName}`));
        const waitTimeout = timeout || 30000;
        await this.focusProjectExplorer();

        try {
            await projectExplorerRoot.waitFor({ state: 'visible', timeout: waitTimeout });
        } catch (error) {
            // If project not found, re-open the explorer view and wait again.
            console.warn(`Project ${projectName} not found, waiting additional time...`);
            await this.page.waitForTimeout(2000);
            await this.focusProjectExplorer();
            await projectExplorerRoot.waitFor({ state: 'visible', timeout: waitTimeout });
        }

        await projectExplorerRoot.first().hover();
        const locator = projectExplorerRoot.getByLabel('Open Project Overview');
        await locator.waitFor();
        await this.page.waitForTimeout(500); // To fix intermittent issues
        await locator.click();
    }

    public async goToAddArtifact(projectName: string) {
        // wait for 1s
        const projectExplorerRoot = this.explorer.locator(this.treeItem(`Project ${projectName}`));
        await projectExplorerRoot.waitFor();
        await projectExplorerRoot.hover();
        const locator = projectExplorerRoot.getByLabel('Add Artifact');
        await locator.waitFor();
        await this.page.waitForTimeout(500); // To fix intermittent issues
        await locator.click();
    }

    public async addArtifact(path: string[]) {
        let currentItem;
        for (let i = 0; i < path.length; i++) {

            currentItem = this.explorer.locator(this.treeItem(path[i]));
            await currentItem.waitFor();

            const isExpanded = await currentItem.getAttribute('aria-expanded');
            if (isExpanded === 'false') {
                await currentItem.click();
            }

            if (i === path.length - 1) {
                await currentItem.hover();
                const plusBtn = currentItem.locator('div.monaco-action-bar').locator('a[aria-label^="Add"]')
                await plusBtn.waitFor();
                await this.page.waitForTimeout(1000); // To fix intermittent issues
                await plusBtn.click();
            }
        }
        return currentItem;
    }

}
