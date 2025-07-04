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

import { test } from '@playwright/test';
import { clearNotificationAlerts, initTest, page, showNotifications, resumeVSCode } from '../Utils';
import { ProjectExplorer } from '../components/ProjectExplorer';
import { Overview } from '../components/Overview';
import { AddArtifact } from '../components/AddArtifact';
import { switchToIFrame } from '@wso2/playwright-vscode-tester';
import { Form } from '../components/Form';
import path from 'path';

export default function createTests() {
    test.describe('Multi Workspace Tests', {
        tag: '@group1',
    }, async () => {
        initTest(true, false, true, "project1");

        let multiWorkspaceName;
        test("Multi Workspace Tests", async ({ }) => {
            console.log("Starting multi project tests");
            const testAttempt = test.info().retry + 1;
            const apiName = `multiProjectTestAPI${testAttempt}`;
            const context = `/test${testAttempt}`;
            await test.step('API in first project', async () => {
                console.log("Adding API to first project");
                const overviewPage = new Overview(page.page);
                await overviewPage.init("project1");
                console.log("Initialized overview page");
                await overviewPage.goToAddArtifact();
                console.log("Navigated to add artifact");

                const addArtifactPage = new AddArtifact(page.page);
                await addArtifactPage.init();
                console.log("Initialized add artifact page");

                await addArtifactPage.add('API');
                console.log("Clicked on API");

                const apiForm = new Form(page.page, 'API Form');
                await apiForm.switchToFormView();
                console.log("Switched to API Form view");
                await apiForm.fill({
                    values: {
                        'Name*': {
                            type: 'input',
                            value: apiName,
                        },
                        'Context*': {
                            type: 'input',
                            value: context,
                        },
                        'Version Type': {
                            type: 'dropdown',
                            value: 'Context',
                        },
                        'Version': {
                            type: 'input',
                            value: '1.0.1',
                        }
                    }
                });
                console.log("Filled API form");
                await apiForm.submit();
                console.log("Submitted API form");
                const webView = await switchToIFrame('Service Designer', page.page);
                if (!webView) {
                    throw new Error("Failed to switch to Service Designer iframe");
                }
            });

            await test.step('Add second project', async () => {
                console.log("Creating new project for second API");
                multiWorkspaceName = `newMultiProjectTestAPI${testAttempt}`;
                await page.page.getByRole('button', { name: 'Create New Project' }).click();
                console.log("Clicked on Create New Project button");
                const apiWebView = await switchToIFrame('Project Creation Form', page.page);
                if (!apiWebView) {
                    throw new Error("Failed to switch to Project Creation Form iframe");
                }
                const createNewProjectForm = new Form(page.page, 'Project Creation Form');
                await createNewProjectForm.switchToFormView();
                console.log("Switched to Project Creation Form view");
                const parentDir = path.dirname(__dirname);
                const newProjectPath = path.join(parentDir, 'data', 'new-project', 'testProject');
                await clearNotificationAlerts();
                await showNotifications();
                console.log("Filling Project Creation Form");
                await createNewProjectForm.fill({
                    values: {
                        'Project Name*': {
                            type: 'input',
                            value: multiWorkspaceName,
                        },
                        'Micro Integrator runtime version*': {
                            type: 'dropdown',
                            value: '4.4.0'
                        },
                        'Select Location': {
                            type: 'file',
                            value: newProjectPath
                        }
                    }
                });
                console.log("Filled Project Creation Form");
                await createNewProjectForm.submit();
                console.log('Project created');
                const currentWindowButton = page.page.getByRole('button', { name: 'Current Window' });
                await currentWindowButton.waitFor({ timeout: 24000 });
                await currentWindowButton.click();
                console.log("Clicked on current window");
            });

            await test.step('Add API to second project', async () => {
                console.log("Adding API to second project");
                // Wait for the project explorer to be ready
                await page.executePaletteCommand('Reload Window');
                console.log("Reloaded window");
                const project1Explorer = new ProjectExplorer(page.page);
                console.log("Initializing project explorer");
                await project1Explorer.goToOverview("project1", 120000);
                console.log("Navigated to project1 overview");
                // Timeout to ensure the project explorer is loaded
                await page.page.waitForTimeout(500);
                await page.executePaletteCommand('View: Close All Editors');
                console.log("Closed editor groups");
                const projectExplorer = new ProjectExplorer(page.page);
                console.log("Initializing project explorer");
                await projectExplorer.goToOverview(multiWorkspaceName, 120000);
                console.log("Navigated to new project overview");
                const overviewPage = new Overview(page.page);
                console.log("Initializing overview page");
                await overviewPage.init(multiWorkspaceName, true);
                console.log("Initialized overview page");
                await overviewPage.goToAddArtifact();
                console.log("Navigated to add artifact");
                const addArtifactPage = new AddArtifact(page.page);
                await addArtifactPage.init(multiWorkspaceName);
                console.log("Initialized add artifact page");
                await addArtifactPage.add('API');
                console.log("Clicked on API");
                const apiForm = new Form(page.page, 'API Form - ' + multiWorkspaceName);
                await apiForm.switchToFormView();
                console.log("Switched to API Form view");
                await apiForm.fill({
                    values: {
                        'Name*': {
                            type: 'input',
                            value: apiName,
                        },
                        'Context*': {
                            type: 'input',
                            value: context,
                        },
                        'Version Type': {
                            type: 'dropdown',
                            value: 'Context',
                        },
                        'Version': {
                            type: 'input',
                            value: '1.0.1',
                        }
                    }
                });
                console.log("Filled API form in second project");
                await apiForm.submit();
                console.log("Submitted API form in second project");
                const webView = await switchToIFrame(`Service Designer - ${multiWorkspaceName}`, page.page);
                if (!webView) {
                    throw new Error("Failed to switch to Service Designer iframe");
                }
            });
        });
    });
}
