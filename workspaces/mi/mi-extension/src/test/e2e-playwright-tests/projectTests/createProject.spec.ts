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
import { Welcome } from "./../components/Welcome";
import { API } from "./../components/ArtifactTest/APITests";
import { ProjectExplorer } from "./../components/ProjectExplorer";
import { Overview } from "./../components/Overview";
import { createProject, page, waitUntilPomContains, initTest} from '../Utils';
import path from "path";
import fs from 'fs';
const dataFolder = path.join( __dirname, '..', 'data');

export const newProjectPath = path.join(dataFolder, 'new-project', 'testProjectFolder');

export default function createTests() {
    test.describe("Create Project Tests", {
        tag: '@group2'
    }, async () => {
        initTest(true, true, false, undefined, undefined, 'group2');

        test("Create Project Tests", async () => {
            await test.step('Create New Project Tests', async () => {
                console.log('Starting to create a new project');
                await createProject(page, 'newProject', '4.4.0');
                console.log('Waiting for pom.xml to contain new project artifactId');
                await waitUntilPomContains(page.page, path.join(newProjectPath, 'newProject', 'pom.xml'), 
                '<artifactId>newProject</artifactId>');
                console.log('New project created successfully');
            });

            await test.step("Create New Project from Sample", async () => {
                console.log('Starting to create a new project from sample');
                await page.executePaletteCommand("MI: Create New Project");
                const welcomePage = new Welcome(page);
                await welcomePage.init();
                console.log('Creating new project from sample');
                await welcomePage.createNewProjectFromSample('Hello World ServiceA simple', newProjectPath);
                // Wait for project to be fully loaded in explorer
                await page.page.waitForTimeout(3000);
                const projectExplorer = new ProjectExplorer(page.page);
                await projectExplorer.goToOverview("HelloWorldService", 45000);
                const overview = new Overview(page.page);
                await overview.init();
                await overview.diagramRenderingForApi('HelloWorldAPI');
                console.log('New project from sample created successfully');
            });

            await test.step("Open Existing Project Tests", async () => {
                console.log('Starting to open an existing project');
                await page.executePaletteCommand("MI: Open Project");
                const fileInput = await page.page?.waitForSelector('.quick-input-header');
                const textInput = await fileInput?.waitForSelector('input[type="text"]');
                console.log('Filling in the project path');
                await textInput?.fill(newProjectPath + '/newProject/');
                const openBtn = await fileInput?.waitForSelector('a.monaco-button:has-text("Open MI Project")');
                await openBtn?.click();
                const newWindowButton = page.page.getByRole('button', { name: 'New Window' });
                await newWindowButton.waitFor({ timeout: 10000 });
                await newWindowButton.click();
                const addArtifactSelector = '.tab-label:has-text("Add Artifact")';
                await page.page.waitForSelector(addArtifactSelector, { state: 'visible' });
                await page.page.waitForSelector(addArtifactSelector, { state: 'attached' });
                const api = new API(page.page);
                await api.init('newProject');
                await api.addAPI('helloWorld', '/helloWorld');
                const overview = new Overview(page.page);
                await overview.init("newProject");
                await overview.diagramRenderingForApi('helloWorldAPI');
                console.log('Existing project opened and API added successfully');
            });

            await test.step("Create New Project with Advanced Config Tests", async () => {
                console.log('Starting to create a new project with advanced configuration');
                await page.executePaletteCommand('Workspaces: Close Workspace');
                console.log("Closed Workspace");
                await createProject(page, 'newProjectWithAdConfig', '4.4.0', true);
                console.log("Project Created");
                await waitUntilPomContains(page.page, path.join(newProjectPath, 'newProjectWithAdConfig', 'pom.xml'), 
                '<artifactId>test</artifactId>');
                console.log('New project with advanced config created successfully');
            });
        });
    });
}
