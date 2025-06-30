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
import { Form } from './components/Form';
import { AddArtifact } from './components/AddArtifact';
import { ServiceDesigner } from './components/ServiceDesigner';
import { Diagram } from './components/Diagram';
import { initTest, page } from './Utils';
import { MACHINE_VIEW } from '@wso2/mi-core';
import { Overview } from './components/Overview';

export default function createTests() {
  test.describe(async () => {
    initTest(true);

    test("Diagram Tests", async () => {
      test.skip('Create new API', async () => {
        const { title: iframeTitle } = await page.getCurrentWebview();

        if (iframeTitle === MACHINE_VIEW.Overview) {
          const overviewPage = new Overview(page.page);
          await overviewPage.init();
          await overviewPage.goToAddArtifact();
        }

        const overviewPage = new AddArtifact(page.page);
        await overviewPage.init();
        await overviewPage.add('API');

        const apiForm = new Form(page.page, 'API Form');
        await apiForm.switchToFormView();
        await apiForm.fill({
          values: {
            'Name*': {
              type: 'input',
              value: 'api1',
            },
            'Context*': {
              type: 'input',
              value: '/api1',
            },
          }
        });
        await apiForm.submit();
      });

      test.skip('Service designer', async () => {
        // service designer
        const serviceDesigner = new ServiceDesigner(page.page);
        await serviceDesigner.init();
        const resource = await serviceDesigner.resource('GET', '/');
        await resource.click();
      });

      test.skip('Add mediator in to resource', async () => {
        // diagram
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        await diagram.addMediator('Log');
      });

      test.skip('Edit mediator in resource', async () => {
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        const mediator = await diagram.getMediator('log');
        await mediator.edit({
          values: {
            'Log Category': {
              type: 'combo',
              value: 'DEBUG',
            },
            'Log Separator': {
              type: 'input',
              value: ' - ',
            },
            'Description': {
              type: 'input',
              value: 'log mediator',
            }
          }
        });
        expect(await mediator.getDescription()).toEqual('log mediator');

      });
    });
  });
}
