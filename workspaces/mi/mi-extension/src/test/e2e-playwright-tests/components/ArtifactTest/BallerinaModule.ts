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

import { expect, Page } from "@playwright/test";
import { switchToIFrame } from "@wso2/playwright-vscode-tester";
import { ProjectExplorer } from "../ProjectExplorer";
import { AddArtifact } from "../AddArtifact";
import { Overview } from "../Overview";
import { clearNotificationAlerts, page, showNotifications } from "../../Utils";
import { ServiceDesigner } from "../ServiceDesigner";
import { Form } from '../Form';
import { Diagram } from '../Diagram';
import { MACHINE_VIEW } from "@wso2/mi-core";

export class BallerinaModule {

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
        await addArtifactPage.add('Ballerina Module');
    }

    public async createBallerinaModuleFromProjectExplorer(moduleName: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Ballerina Modules'], true);
        await this._page.getByLabel('Add Ballerina Module').click();
        const ballerinaModuleView = await switchToIFrame('Ballerina Module Creation Form', this._page);
        if (!ballerinaModuleView) {
            throw new Error("Failed to switch to the Ballerina Module Form iframe");
        }

        const ballerinaFormFrame = ballerinaModuleView.locator('div#root');
        await ballerinaFormFrame.getByRole('textbox', { name: 'Module Name*' }).fill(moduleName);
        await ballerinaFormFrame.getByRole('textbox', { name: 'Version*' }).fill('1.0.0');
        await ballerinaFormFrame.getByRole('button', { name: 'Create' }).click();

        await this._page.getByRole('tab', { name: `${moduleName}-module.bal` }).getByLabel('Close').click();
        await projectExplorer.goToOverview("testProject");
        const overview = await switchToIFrame('Project Overview', this._page);
        if (!overview) {
            throw new Error("Failed to switch to the project overview page");
        }
    }

    public async createBallerinaModule(moduleName: string) {
        const form = new Form(this._page, 'Ballerina Module Creation Form');
        await form.switchToFormView();
        await form.fill({
            values: {
                'Module Name*': {
                    type: 'input',
                    value: moduleName,
                },
                'Version*': {
                    type: 'input',
                    value: '1.0.0',
                },
            }
        });
        await form.submit();
    }

    public async openFromProjectExplorerAndBuild(moduleName: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Ballerina Modules', `${moduleName}-module.bal (${moduleName})`], true);

        const currentPage = this._page;
        await currentPage.getByLabel('Build Ballerina Module').click();
        const successNotification = currentPage.getByText('Ballerina module build successful', { exact: true })
        const errorNotification = currentPage.getByText('Ballerina not found. Please download Ballerina and try again.', { exact: true })
        await Promise.race([
            successNotification.waitFor({ state: 'visible', timeout: 40000 }),
            errorNotification.waitFor({ state: 'visible', timeout: 40000 })
        ]);

        if (await errorNotification.isVisible()) {
            await showNotifications();
            await currentPage.getByRole('button', { name: 'Install Now' }).click();
            await clearNotificationAlerts();
            const webview = await switchToIFrame('WSO2 Integrator: BI', this._page, 24000);
            console.log("Switching to WSO2 Integrator: BI iframe");
            if (!webview) {
                throw new Error("Failed to switch to the Ballerina Module Form iframe");
            }
            await webview.locator('vscode-button').locator('div:has-text("Set up Ballerina distribution")').click();
            console.log("Downloading Ballerina");
            const restartButton = webview.locator('vscode-button').locator('div:has-text("Restart VS Code")');
            await expect(restartButton).toBeVisible({ timeout: 600000 });
            console.log("Ballerina download completed");
            await currentPage.getByRole('tab', { name: 'WSO2 Integrator: BI', exact: true }).getByLabel('Close').click();
            await clearNotificationAlerts();
            await currentPage.getByLabel('Build Ballerina Module').click();
            const updatedNotification = currentPage.getByText('Ballerina module build successful', { exact: true });
            await expect(updatedNotification).toBeVisible({ timeout: 60000 });
            console.log("Ballerina module build successful");
        }
        await clearNotificationAlerts();

        await currentPage.getByRole('tab', { name: `${moduleName}-module.bal` }).getByLabel('Close').click();
        await page.selectSidebarItem('Micro Integrator');
        await projectExplorer.goToOverview("testProject");
    }

    public async openFromMediatorPaletteAndBuild(moduleName: string) {
        const { title: iframeTitle } = await page.getCurrentWebview();
        if (iframeTitle === MACHINE_VIEW.Overview) {
            const overviewPage = new Overview(page.page);
            await overviewPage.init();
            await overviewPage.goToAddArtifact();
        }

        const addArtifactPage = new AddArtifact(page.page);
        await addArtifactPage.init();
        await addArtifactPage.add('API');

        const apiForm = new Form(page.page, 'API Form');
        await apiForm.switchToFormView();
        await apiForm.fill({
            values: {
                'Name*': {
                    type: 'input',
                    value: 'TestBallerinaAPI',
                },
                'Context*': {
                    type: 'input',
                    value: '/TestBallerinaAPI',
                },
            }
        });
        await apiForm.submit();

        const serviceDesigner = new ServiceDesigner(page.page);
        await serviceDesigner.init();
        const resource = await serviceDesigner.resource('GET', '/');
        await resource.click();

        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        await diagram.refreshBallerinaModule(moduleName);
        const notificationAlert = await page.page.getByText('Ballerina module build successful', { exact: true })
        await expect(notificationAlert).toBeVisible({ timeout: 40000 });
    }
}
