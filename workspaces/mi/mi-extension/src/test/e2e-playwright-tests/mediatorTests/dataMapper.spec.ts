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

import { test, expect } from '@playwright/test';
import { Form } from './../components/Form';
import { AddArtifact } from './../components/AddArtifact';
import { ServiceDesigner } from './../components/ServiceDesigner';
import { initTest, page } from '../Utils';
import { MACHINE_VIEW } from '@wso2/mi-core';
import { Overview } from '../components/Overview';
import { Diagram, SidePanel } from './../components/Diagram';
import { DataMapper } from '../components/DataMapper';
import { switchToIFrame } from '@wso2/playwright-vscode-tester';
import { ProjectExplorer } from '../components/ProjectExplorer';

export default function createTests() {
  test.describe("Data Mapper Mediator Tests", {
    tag: '@group4',
  }, async () => {
    initTest();

    test("Data Mapper Mediator Tests", async ({}, testInfo) => {
      const testAttempt = testInfo.retry + 1;
      await test.step('Create new API', async () => {
        console.log('Create API for data mapper mediator tests');
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
              value: 'dataMapperMediatorAPI' + testAttempt,
            },
            'Context*': {
              type: 'input',
              value: '/dataMapperMediatorAPI' + testAttempt,
            },
          }
        });
        await apiForm.submit();
      });

      await test.step('Service designer', async () => {
        const serviceDesigner = new ServiceDesigner(page.page);
        await serviceDesigner.init();
        const resource = await serviceDesigner.resource('GET', '/');
        await resource.click();
      });

      await test.step('Add data mapper mediator with new mapping', async () => {
        console.log('Adding data mapper mediator with new mapping');
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        await diagram.clickPlusButtonByIndex(0);
        const sidePanel = new SidePanel(diagram.getDiagramWebView());
        await sidePanel.init();
        await sidePanel.search('Data Mapper');
        await sidePanel.selectMediator('Data\\ Mapper');
        const form = await sidePanel.getForm();
        await form.clickAddNewForField('Name');
        const dataMapperFrom = new DataMapper(page.page, "dm" + testAttempt);
        await dataMapperFrom.add('mapping1' + testAttempt);
        await form.fill({
            values: {
                'Description': {
                    type: 'input',
                    value: 'dm1'
                }
            }
        });
        await form.submit('Add');
        await switchToIFrame('Data Mapper View', page.page);

        // go to resource
        const projectExplorer = new ProjectExplorer(page.page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'APIs', 'dataMapperMediatorAPI' + testAttempt, '/'], true);
        await diagram.getMediator('datamapper', 0, 'reference');
      });

      await test.step('Delete data mapper mediator', async () => {
        console.log('Deleting data mapper mediator');
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        const mediator = await diagram.getMediator('datamapper', 0, 'reference');
        await mediator.delete();
        const mediatorsCount = await diagram.getMediatorsCount('datamapper', 'reference');
        expect(mediatorsCount).toBe(0);
      });

      await test.step('Add data mapper mediator existing mapping', async () => {
        console.log('Adding data mapper mediator with existing mapping');
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        await diagram.clickPlusButtonByIndex(0);
        const sidePanel = new SidePanel(diagram.getDiagramWebView());
        await sidePanel.init();
        await sidePanel.search('Data Mapper');
        await sidePanel.selectMediator('Data\\ Mapper');
        const form = await sidePanel.getForm();
        await form.fill({
            values: {
                'Name': {
                    type: 'combo',
                    value: 'datamapper/mapping1' + testAttempt
                },
                'Description': {
                    type: 'input',
                    value: 'dm2'
                }
            }
        });
        await form.submit('Add');
        await diagram.getMediator('datamapper', 0, 'reference')
      });

      await test.step('Update data mapper mediator', async () => {
        console.log('Updating data mapper mediator');
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        const mediator = await diagram.getMediator('datamapper', 0, 'reference');
        await mediator.clickOnImg();
        const form = await mediator.getEditForm();
        await form.fill({
            values: {
                'Description': {
                    type: 'input',
                    value: 'data mapper 1 edited'
                }
            }
        });
        await form.submit('Update');
        await diagram.getMediator('datamapper', 0, 'reference')
      });

      await test.step('Goto mapping from data mapper mediator', async () => {
        console.log('Goto mapping from data mapper mediator');
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        const mediator = await diagram.getMediator('datamapper', 0, 'reference');
        await mediator.click();
        await switchToIFrame('Data Mapper View', page.page);

        // go to resource
        const projectExplorer = new ProjectExplorer(page.page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'APIs', 'dataMapperMediatorAPI' + testAttempt, '/'], true);
        await diagram.getMediator('datamapper', 0, 'reference');
      });

      await test.step('Goto mapping from project explorer', async () => {
        console.log('Goto mapping from project explorer');
        const projectExplorer = new ProjectExplorer(page.page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Data Mappers', 'mapping1' + testAttempt], true);
        await switchToIFrame('Data Mapper View', page.page);
      });
    });
  });
}
