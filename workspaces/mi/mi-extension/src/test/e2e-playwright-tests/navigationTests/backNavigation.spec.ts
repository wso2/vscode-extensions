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

/**
 * E2E tests for Issue #820 — Back button in artifact creation forms must
 * navigate back to the Add Artifact page, NOT to the Project Overview.
 *
 * Root cause (fixed in this codebase):
 *   Defect 1 — goBack() in rpc-manager.ts called navigate(projectUri) with no
 *     history entry when the view included "Form", always landing on Overview.
 *   Defect 2 — handleClick() in AddArtifact/index.tsx never pushed the Add
 *     Artifact view onto the history stack before opening a creation form.
 *
 * After the fix:
 *   - handleClick calls addToHistory({ location: { view: ADD_ARTIFACT } })
 *     before executing the artifact command.
 *   - goBack() unconditionally pops the history stack and navigates to the
 *     popped entry, so the user correctly returns to the Add Artifact page.
 */

import { test, expect, Frame } from '@playwright/test';
import { switchToIFrame } from '@wso2/playwright-vscode-tester';
import { MACHINE_VIEW } from '@wso2/mi-core';
import { initTest, page } from '../Utils';
import { AddArtifact } from '../components/AddArtifact';
import { Overview } from '../components/Overview';
import { ProjectExplorer } from '../components/ProjectExplorer';

/** Navigate from wherever we are to the Add Artifact page of testProject. */
async function goToAddArtifact(): Promise<void> {
    const projectExplorer = new ProjectExplorer(page.page);
    await projectExplorer.goToOverview('testProject');
    const overviewPage = new Overview(page.page);
    await overviewPage.init();
    await overviewPage.goToAddArtifact();
}

/** Click an artifact-type card on the Add Artifact page and return the resulting form frame. */
async function openArtifactForm(artifactType: string, formIframeTitle: string): Promise<Frame> {
    const addArtifact = new AddArtifact(page.page);
    await addArtifact.init();
    await addArtifact.add(artifactType);
    const frame = await switchToIFrame(formIframeTitle, page.page);
    if (!frame) {
        throw new Error(`Failed to switch to "${formIframeTitle}" iframe`);
    }
    return frame;
}

export default function createTests() {
    test.describe('Back Navigation Tests (Issue #820)', {
        tag: '@group2',
    }, async () => {
        initTest(false, false, false, undefined, undefined, 'group2');

        // ------------------------------------------------------------------
        // Primary regression — API form "Go Back" button
        // ------------------------------------------------------------------

        test('Back button from API form navigates to Add Artifact page', async () => {
            let apiFormFrame: Frame;

            await test.step('Navigate to Add Artifact page', async () => {
                await goToAddArtifact();
            });

            await test.step('Open API creation form', async () => {
                apiFormFrame = await openArtifactForm('API', 'API Form');
            });

            await test.step('Click the Go Back (←) button', async () => {
                const goBackBtn = apiFormFrame!.locator('vscode-button[title="Go Back"]');
                await goBackBtn.waitFor({ state: 'visible', timeout: 10000 });
                await goBackBtn.click();
            });

            await test.step('Verify navigation lands on Add Artifact page, not Project Overview', async () => {
                await page.page.waitForTimeout(2000);
                const { title: iframeTitle } = await page.getCurrentWebview();
                console.log(`After Go Back from API Form: iframeTitle="${iframeTitle}"`);
                // Bug: before fix this was MACHINE_VIEW.Overview — now must be ADD_ARTIFACT.
                expect(iframeTitle).toBe(MACHINE_VIEW.ADD_ARTIFACT);
            });
        });

        // ------------------------------------------------------------------
        // Negative — Home (⌂) button must still reach Project Overview
        // ------------------------------------------------------------------

        test('Home button from API form navigates to Project Overview', async () => {
            let apiFormFrame: Frame;

            await test.step('Navigate to Add Artifact page', async () => {
                await goToAddArtifact();
            });

            await test.step('Open API creation form', async () => {
                apiFormFrame = await openArtifactForm('API', 'API Form');
            });

            await test.step('Click the Home (⌂) button', async () => {
                const homeBtn = apiFormFrame!.locator('vscode-button[title="Home"]');
                await homeBtn.waitFor({ state: 'visible', timeout: 10000 });
                await homeBtn.click();
            });

            await test.step('Verify navigation lands on Project Overview (not Add Artifact)', async () => {
                await page.page.waitForTimeout(2000);
                const { title: iframeTitle } = await page.getCurrentWebview();
                console.log(`After Home from API Form: iframeTitle="${iframeTitle}"`);
                expect(iframeTitle).toBe(MACHINE_VIEW.Overview);
            });
        });

        // ------------------------------------------------------------------
        // Parametrized — "Go Back" from every affected creation form type
        // ------------------------------------------------------------------

        const artifactFormPairs: Array<{ artifactType: string; formIframeTitle: string }> = [
            { artifactType: 'Automation', formIframeTitle: 'Task Form' },
            { artifactType: 'Sequence',   formIframeTitle: 'Sequence Form' },
            { artifactType: 'Endpoint',   formIframeTitle: 'Endpoint Form' },
            { artifactType: 'Template',   formIframeTitle: 'Template Form' },
        ];

        for (const { artifactType, formIframeTitle } of artifactFormPairs) {
            test(`Back button from ${artifactType} form navigates to Add Artifact page`, async () => {
                let formFrame: Frame;

                await test.step('Navigate to Add Artifact page', async () => {
                    await goToAddArtifact();
                });

                await test.step(`Open ${artifactType} creation form`, async () => {
                    formFrame = await openArtifactForm(artifactType, formIframeTitle);
                });

                await test.step('Click the Go Back (←) button', async () => {
                    const goBackBtn = formFrame!.locator('vscode-button[title="Go Back"]');
                    await goBackBtn.waitFor({ state: 'visible', timeout: 10000 });
                    await goBackBtn.click();
                });

                await test.step('Verify navigation returns to Add Artifact page', async () => {
                    await page.page.waitForTimeout(2000);
                    const { title: currentTitle } = await page.getCurrentWebview();
                    console.log(`After Go Back from ${artifactType} Form: iframeTitle="${currentTitle}"`);
                    expect(currentTitle).toBe(MACHINE_VIEW.ADD_ARTIFACT);
                });
            });
        }
    });
}
