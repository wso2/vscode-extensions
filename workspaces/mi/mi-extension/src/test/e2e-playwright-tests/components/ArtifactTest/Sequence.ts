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
import { switchToIFrame } from "@wso2/playwright-vscode-tester";
import { ProjectExplorer } from "../ProjectExplorer";
import { AddArtifact } from "../AddArtifact";
import { Form } from "../Form";
import { page } from "../../Utils";

export class Sequence {

    constructor(private _page: Page) {
    }

    public async init() {
        const addArtifactPage = new AddArtifact(this._page);
        await addArtifactPage.init();
        await addArtifactPage.add('Sequence');
    }

    public async createSequenceFromProjectExplorer(sequenceName: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Sequences'], true);
        await this._page.getByLabel('Add Sequence').click();
        const seqWebview = await switchToIFrame('Sequence Form', this._page);
        if (!seqWebview) {
            throw new Error("Failed to switch to Sequence Form iframe");
        }

        await seqWebview.getByRole('heading', { name: 'Advanced Configuration' }).click();
        const sequenceForm = new Form(page.page, 'Sequence Form');
        await sequenceForm.switchToFormView();
        await sequenceForm.fill({
            values: {
                'Name*': {
                    type: 'input',
                    value: sequenceName,
                },
                'Enable statistics': {
                    type: 'checkbox',
                    value: 'checked',
                },
                'Enable tracing': {
                    type: 'checkbox',
                    value: 'checked',
                },
                'On Error Sequence': {
                    type: 'combo',
                    value: 'TestSequenceEdited',
                    additionalProps: { hasMultipleValue: true }
                }
            }
        });
        await sequenceForm.submit();

        await projectExplorer.goToOverview("testProject");
        const overview = await switchToIFrame('Project Overview', this._page);
        if (!overview) {
            throw new Error("Failed to switch to project overview iframe");
        }
    }

    public async createSequence(sequenceName: string, isPopUp?: boolean) {
        let sequenceFrame: Locator;
        if (isPopUp) {
            const seqWebview = await switchToIFrame('Resource View', this._page);
            if (!seqWebview) {
                throw new Error("Failed to switch to Resource Form iframe");
            }
            sequenceFrame = seqWebview.locator('#popUpPanel');
        } else {
            const seqWebview = await switchToIFrame('Sequence Form', this._page);
            if (!seqWebview) {
                throw new Error("Failed to switch to Sequence Form iframe");
            }
            sequenceFrame = seqWebview.locator('div#root');
        }
  
        await sequenceFrame.waitFor();
        await sequenceFrame.getByRole('textbox', { name: 'Name*' }).fill(sequenceName);
        await sequenceFrame.getByTestId('create-button').click();

        if (!isPopUp) {
            const projectExplorer = new ProjectExplorer(this._page);
            await projectExplorer.goToOverview("testProject");
            const overview = await switchToIFrame('Project Overview', this._page);
            if (!overview) {
                throw new Error("Failed to switch to project overview iframe");
            }
        }
    }

    public async editSequence(sequenceName: string, sequenceUpdatedName: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Sequences', sequenceName], true);
        const seqWebview = await switchToIFrame('Sequence View', this._page);
        if (!seqWebview) {
            throw new Error("Failed to switch to Sequence View iframe");
        }

        const frame = seqWebview.locator('div#root');
        await frame.getByTestId('edit-button').click();
        const sequenceForm = new Form(page.page, 'Sequence View');
        await sequenceForm.switchToFormView();
        await sequenceForm.fill({
            values: {
                'Name*': {
                    type: 'input',
                    value: sequenceUpdatedName,
                },
                'Enable statistics': {
                    type: 'checkbox',
                    value: 'checked',
                },
                'Enable tracing': {
                    type: 'checkbox',
                    value: 'checked',
                }
            }
        });
        await sequenceForm.submit("Update");

        const overview = await switchToIFrame('Project Overview', this._page);
        if (!overview) {
            throw new Error("Failed to switch to project overview iframe");
        }
    }

    public async openDiagramView(name: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Sequences', name], true);
        const webView = await switchToIFrame('Sequence View', this._page);
        if (!webView) {
            throw new Error("Failed to switch to Sequence View iframe");
        }
        await webView.getByText('Start').click();
    }
}
