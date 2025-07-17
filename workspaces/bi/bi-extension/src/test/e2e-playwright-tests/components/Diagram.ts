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

import { Frame, Locator, Page } from '@playwright/test';
import { switchToIFrame } from '@wso2/playwright-vscode-tester';

export class Diagram {
    private diagramWebView!: Frame;

    constructor(private _page: Page) {}

    public async init() {
        const webview = await switchToIFrame('WSO2 Integrator: BI', this._page);
        if (!webview) {
            throw new Error('Failed to switch to Diagram View iframe');
        }
        this.diagramWebView = webview;
    }

    public getDigramWebView(): Frame {
        return this.diagramWebView;
    }

    /**
     * Used when the plus button is not visible initially. This will hover the link and click on the plus button.
     * @param index - Index of the link to hover and click on the plus button. This can be found via the data-testid of the link. It will have the format `diagram-link-${index}`
     */
    public async clickHoverAddButtonByIndex(index: number): Promise<void> {
        const link = (await this.getDiagramContainer()).getByTestId(`diagram-link-${index}`);
        await link.hover();
        const addButton = link.getByTestId(`link-add-button-${index}`);
        await addButton.waitFor();
        await this._page.pause();
        await addButton.click();
    }

    /**
     * Used when the plus button is visible. This will click on the plus button.
     * @param index - Index of the plus button to click. This can be found via the data-testid of the plus button. It will have the format `empty-node-add-button-${index}`
     */
    public async clickAddButtonByIndex(index: number): Promise<void> {
        const addButton = (await this.getDiagramContainer()).getByTestId(`empty-node-add-button-${index}`);
        await addButton.click();
    }

    private async getDiagramContainer(): Promise<Locator> {
        const container = this.diagramWebView.getByTestId('bi-diagram-canvas');
        await container.waitFor();
        return container;
    }
}
