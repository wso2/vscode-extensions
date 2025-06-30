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
import { ProjectExplorer } from "../components/ProjectExplorer";
import { EventIntegration } from "../components/ArtifactTest/EventIntegration";
import { Overview } from '../components/Overview';
import { API } from '../components/ArtifactTest/APITests';
import { Automation } from "../components/ArtifactTest/Automation";
import { initTest, page} from '../Utils';

export default function createTests() {
    test.describe("View Artifact Tests", {
        tag: '@group2',
    }, async () => {
        initTest();

        test('View Artifact Tests', async ({ }) => {
            await test.step('API Diagram Rendering Test', async () => {
                console.log('Starting API Diagram Rendering Test');
                const projectExplorer = new ProjectExplorer(page.page);
                await projectExplorer.goToOverview("testProject");
                console.log('Navigated to project overview');
                const api = new API(page.page);
                await api.init();
                await api.addAPI('helloWorld', "/helloWorld");
                console.log('API added successfully');
                const explorer = new ProjectExplorer(page.page);
                await explorer.goToOverview("testProject");
                const overviewPage = new Overview(page.page);
                await overviewPage.init();
                console.log('Clicking on diagram view for helloWorld API');
                await overviewPage.clickOnDiagramView('helloWorldAPI');
            });

            await test.step('Auotomation Diagram Rendering Test', async () => {
                console.log('Starting Automation Diagram Rendering Test');
                const automation = new Automation(page.page);
                await automation.init();
                await automation.add('TestTask');
                console.log('Automation added successfully');
                const projectExplorer = new ProjectExplorer(page.page);
                await projectExplorer.goToOverview("testProject");
                const overviewPage = new Overview(page.page);
                await overviewPage.init();
                console.log('Clicking on diagram view for TestTask Automation');
                await overviewPage.clickOnDiagramView('Automation')
            });

            await test.step('Event Integration Diagram Rendering Test', async () => {
                console.log('Starting Event Integration Diagram Rendering Test');
                const eventIntegration = new EventIntegration(page.page);
                await eventIntegration.init();
                await eventIntegration.add('HttpEventIntegration');
                console.log('Event Integration added successfully');
                const projectExplorer = new ProjectExplorer(page.page);
                await projectExplorer.goToOverview("testProject");
                const overviewPage = new Overview(page.page);
                await overviewPage.init();
                console.log('Clicking on diagram view for HttpEventIntegration');
                await overviewPage.clickOnDiagramView('Event Integration')
            });
        });
    });
}
