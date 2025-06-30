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
import { ProjectExplorer } from "../ProjectExplorer";
import { switchToIFrame } from "@wso2/playwright-vscode-tester";
import { AddArtifact } from "../AddArtifact";
import { page } from "../../Utils";

export class ClassMediator {

    constructor(private _page: Page) {
    }

    public async init() {
        const addArtifactPage = new AddArtifact(this._page);
        await addArtifactPage.init();
        await addArtifactPage.add('Class Mediator');
    }

    public async createClassMediatorFromProjectExplorer(className: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.addArtifact(['Project testProject', 'Other Artifacts', 'Class Mediators']);

        const cmWebview = await switchToIFrame('ClassMediator Creation Form', this._page);
        if (!cmWebview) {
            throw new Error("Failed to switch to Class Mediator Form iframe");
        }
        const classMediatorFrame = cmWebview.locator('div#root');
        await classMediatorFrame.getByRole('textbox', { name: 'Package Name*' }).fill('org.wso2.sample');
        await classMediatorFrame.getByRole('textbox', { name: 'Class Name*' }).fill(className);
        await classMediatorFrame.getByRole('button', { name: 'Create' }).click();
    }

    public async createClassMediator(className: string) {
        const cmWebview = await switchToIFrame('ClassMediator Creation Form', this._page);
        if (!cmWebview) {
            throw new Error("Failed to switch to Class Mediator Form iframe");
        }
        const classMediatorFrame = cmWebview.locator('div#root');
        await classMediatorFrame.getByRole('textbox', { name: 'Package Name*' }).fill("org.wso2.sample");
        await classMediatorFrame.getByRole('textbox', { name: 'Class Name*' }).fill(className);
        await classMediatorFrame.getByRole('button', { name: 'Create' }).click();
    }

    public async openClassMediator(className: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Class Mediators', `${className}.java (org.wso2.sample)`], true);
        await page.selectSidebarItem('Micro Integrator');
        await projectExplorer.goToOverview("testProject");
    }

    public async clear(classNames: string[]) {
        for (const className of classNames) {
            await this._page.getByRole('tab', { name: className }).getByLabel('Close').click();
        }
    }
}
