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
import { Diagram } from './../components/Diagram';

export default function createTests() {
  test.describe("Log Mediator Tests", {
    tag: '@group2',
  }, async () => {
    initTest();

    test("Log Mediator Tests", async ({ }, testInfo) => {
      const testAttempt = testInfo.retry + 1;
      await test.step('Create new API', async () => {
        console.log('Starting to create a new API');
        // wait until window reload
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
        console.log('Filling API form with values');
        await apiForm.fill({
          values: {
            'Name*': {
              type: 'input',
              value: 'logMediatorAPI' + testAttempt,
            },
            'Context*': {
              type: 'input',
              value: '/logMediatorAPI' + testAttempt,
            },
          }
        });
        await apiForm.submit();
        console.log('API form submitted successfully');
      });

      await test.step('Service designer', async () => {
        console.log('Accessing service designer');
        // service designer
        const serviceDesigner = new ServiceDesigner(page.page);
        await serviceDesigner.init();
        const resource = await serviceDesigner.resource('GET', '/');
        await resource.click();
        console.log('Service designer initialized and resource selected');
      });

      await test.step('Add log mediator in to resource with default values', async () => {
        console.log('Adding log mediator to resource with default values');
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        await diagram.addMediator('Log');
        await diagram.getMediator('log');
        console.log('Log mediator added successfully with default values');
      });

      await test.step('Delete log mediator', async () => {
        console.log('Deleting log mediator');
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        const mediator = await diagram.getMediator('log');
        await mediator.delete();
        console.log("Log mediator deleted");
        const logMediatorsCount = await diagram.getMediatorsCount('log');
        expect(logMediatorsCount).toBe(0);
        console.log('Log mediator verified');
      });

      await test.step('Add log mediator in to resource with custom values', async () => {
        console.log("Adding log mediator in to resource with custom values");
        // sleep for 1 seconds to ensure the diagram is ready
        await page.page.waitForTimeout(2000);
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        await diagram.addMediator('Log', {
          values: {
            'Log Category': {
              type: 'combo',
              value: 'WARN',
            },
            'Append Message ID': {
              type: 'checkbox',
              value: 'checked',
            },
            'Append Payload': {
              type: 'checkbox',
              value: '',
            },
            'Message': {
              type: 'inlineExpression',
              value: 'test message: ${payload.message}',
            }
          }
        });
        await page.page.waitForTimeout(2000);
        await diagram.getMediator('log');
        console.log('Log mediator added successfully with custom values');
      });

      await test.step('Edit log mediator in resource', async () => {
        console.log('Editing log mediator in resource');
        await page.page.waitForTimeout(2000);
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        const mediator = await diagram.getMediator('log');
        await mediator.edit({
          values: {
            'Log Category': {
              type: 'combo',
              value: 'DEBUG',
            },
            'Message': {
              type: 'inlineExpression',
              value: 'test message edited',
            },
            'Append Message ID': {
              type: 'checkbox',
              value: '',
            },
            'Append Payload': {
              type: 'checkbox',
              value: 'checked',
            },
            'Description': {
              type: 'input',
              value: 'log mediator edited',
            }
          }
        });
        console.log('Log mediator edited successfully');
        const editedDescription = await mediator.getDescription();
        console.log('Edited log mediator description:', editedDescription);
        expect(editedDescription).toBe('log mediator edited');
        console.log('Log mediator description verified');
      });
    });
  });
}
