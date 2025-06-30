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
import { Overview } from '../components/Overview';
import path from "path";
import { initTest, page, waitUntilPomContains, waitUntilPomNotContains } from '../Utils';
const dataFolder = path.join(__dirname, '..', 'data');
export const newProjectPath = path.join(dataFolder, 'new-project', 'testProject');
export const pomFilePath = path.join(newProjectPath, 'testProject', 'pom.xml');
export const configFilePath = path.join(newProjectPath, 'testProject', 'src', 'main', 'wso2mi', 'resources', 'conf', 'config.properties');

export default function createTests() {
    test.describe("Project Settings tests", {
        tag: '@group2',
    }, async () => {
        initTest();

        test('Project Summary Page Tests', async ({ }) => {
            await test.step('Create new API', async () => {
                'Get Project Summary Page'
                console.log('Starting to create a new API');
                const overviewPage = new Overview(page.page);
                await overviewPage.init();
                await overviewPage.getProjectSummary();
            });

            await test.step('Update Project Version', async () => {
                console.log('Starting to update project version');
                const overviewPage = new Overview(page.page);
                await overviewPage.init();
                await overviewPage.updateProjectVersion("1.1.0");
                console.log('Waiting for pom.xml to contain updated version');
                await overviewPage.getProjectSummary();
                await waitUntilPomContains(page.page, pomFilePath, '<version>1.1.0</version>');
                await overviewPage.updateProjectVersion("1.0.0");
                console.log('Project version updated successfully');
            });

            await test.step('Add Other Dependencies', async () => {
                console.log('Starting to add other dependencies');
                const overviewPage = new Overview(page.page);
                await waitUntilPomNotContains(page.page, pomFilePath, '<artifactId>mysql-connector-java</artifactId>');
                await overviewPage.init();
                await overviewPage.addOtherDependencies();
                console.log('Waiting for pom.xml to contain mysql-connector-java dependency');
                await waitUntilPomContains(page.page, pomFilePath, '<artifactId>mysql-connector-java</artifactId>')
            });

            await test.step('Update Other Dependencies', async () => {
                console.log('Starting to update other dependencies');
                const overviewPage = new Overview(page.page);
                console.log('Waiting for pom.xml to not contain mysql-connector--java dependency');
                await waitUntilPomNotContains(page.page, pomFilePath, '<artifactId>mysql-connector--java</artifactId>');
                await overviewPage.init();
                await overviewPage.editOtherDependencies();
                console.log('Waiting for pom.xml to contain mysql-connector--java dependency');
                await waitUntilPomContains(page.page, pomFilePath, '<artifactId>mysql-connector--java</artifactId>');
            });

            await test.step('Delete Other Dependencies', async () => {
                console.log('Starting to delete other dependencies');
                const overviewPage = new Overview(page.page);
                await overviewPage.init();
                console.log('Deleting mysql-connector--java dependency');
                await overviewPage.deleteOtherDependencies();
                console.log('Waiting for pom.xml to not contain mysql-connector--java dependency');
                await waitUntilPomNotContains(page.page, pomFilePath, '<artifactId>mysql-connector--java</artifactId>');
            });

            await test.step('Add Connector Dependencies', async () => {
                console.log('Starting to add connector dependencies');
                await waitUntilPomNotContains(page.page, pomFilePath,
                    '<artifactId>mi-connector-amazonsqs</artifactId>');
                const overviewPage = new Overview(page.page);
                await overviewPage.init();
                await overviewPage.addConnectorDependencies();
                console.log('Waiting for pom.xml to contain mi-connector-amazonsqs dependency');
                await waitUntilPomContains(page.page, pomFilePath, '<artifactId>mi-connector-amazonsqs</artifactId>');
            });

            await test.step('Update Connector Dependencies', async () => {
                console.log('Starting to update connector dependencies');
                await waitUntilPomNotContains(page.page, pomFilePath, '<artifactId>mi-connector--amazonsqs</artifactId>');
                const overviewPage = new Overview(page.page);
                await overviewPage.init();
                await overviewPage.editConnectorDependencies();
                console.log('Waiting for pom.xml to contain mi-connector--amazonsqs dependency');
                await waitUntilPomContains(page.page, pomFilePath, '<artifactId>mi-connector--amazonsqs</artifactId>');
            });

            await test.step('Delete Connector Dependencies', async () => {
                console.log('Starting to delete connector dependencies');
                const overviewPage = new Overview(page.page);
                await overviewPage.init();
                await overviewPage.deleteConnectorDependencies();
                console.log('Waiting for pom.xml to not contain mi-connector--amazonsqs dependency');
                await waitUntilPomNotContains(page.page, pomFilePath, '<artifactId>mi-connector--amazonsqs</artifactId>');
            });

            await test.step('Add Config', async () => {
                console.log('Starting to add config');
                await waitUntilPomNotContains(page.page, configFilePath, 'test_name:string');
                const overviewPage = new Overview(page.page);
                await overviewPage.init();
                await overviewPage.addConfig();
                console.log('Waiting for config.properties to contain test_name:string');
                await waitUntilPomContains(page.page, configFilePath, 'test_name:string');
            });

            await test.step('Edit Config', async () => {
                console.log('Starting to edit config');
                const overviewPage = new Overview(page.page);
                await overviewPage.init();
                await overviewPage.editConfig();
                console.log('Waiting for config.properties to contain test_name:cert');
                await waitUntilPomContains(page.page, configFilePath, 'test_name:cert');
            });

            await test.step('Delete Config', async () => {
                console.log('Starting to delete config');
                const overviewPage = new Overview(page.page);
                await overviewPage.init();
                await overviewPage.deleteConfig();
                console.log('Waiting for config.properties to not contain test_name:cert');
                await waitUntilPomNotContains(page.page, configFilePath, 'test_name:cert');
            });
        });
    });
}
