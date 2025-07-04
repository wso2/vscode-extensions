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
import { Form } from './../components/Form';
import { AddArtifact } from './../components/AddArtifact';
import { ServiceDesigner } from './../components/ServiceDesigner';
import { initTest, page } from '../Utils';
import { Diagram, SidePanel } from './../components/Diagram';
import { MACHINE_VIEW } from '@wso2/mi-core';
import { Overview } from '../components/Overview';
import { Sequence } from '../components/ArtifactTest/Sequence';

export default function createTests() {
  test.describe("Throttle Mediator Tests", {
    tag: '@group4',
  }, async () => {
    initTest();

    test("Throttle Mediator Tests", async ({}, testInfo) => {
      const testAttempt = testInfo.retry + 1;
      await test.step('Create new API for Throttle Mediator', async () => {
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
        await apiForm.fill({
          values: {
            'Name*': {
              type: 'input',
              value: 'throttleMediatorAPI' + testAttempt,
            },
            'Context*': {
              type: 'input',
              value: '/throttleMediatorAPI' + testAttempt,
            },
          }
        });
        await apiForm.submit();
      });

      await test.step('Service designer', async () => {
        // service designer
        const serviceDesigner = new ServiceDesigner(page.page);
        await serviceDesigner.init();
        const resource = await serviceDesigner.resource('GET', '/');
        await resource.click();
      });

      await test.step('Add throttle mediator in to resource with default values', async () => {
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        await diagram.addMediator('Throttle', {
          values: {
            'Group ID*': {
              type: 'input',
              value: 'id1'
            }
          }
        });
        await diagram.getMediator('throttle', 0, 'condition');
      });

      await test.step('Add mediators to OnAccept branch in throttle mediator', async () => {
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        await diagram.addMediator('Log', { values: {
          'Description': {
            type: 'input',
            value: 'logging on accept',
          }
        }}, 1)
        await diagram.getMediator('log');
      });

      await test.step('Add mediators to OnReject branch in throttle mediator', async () => {
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        await diagram.addMediator('Log', { values: {
          'Description': {
            type: 'input',
            value: 'logging on reject',
          }
        }}, 2)
        await diagram.getMediator('log');
      });

      await test.step('Edit throttle mediator basic values', async () => {
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        const mediator = await diagram.getMediator("throttle", 0, "condition");
        await mediator.edit({
          values: {
            'Group ID*': {
              type: 'input',
              value: 'id2'
            },
            'Maximum Concurrent Access': {
              type: 'input',
              value: '3'
            },
            'Description': {
              type: 'input',
              value: 'test throttle mediator edited'
            }
          }
        });
        await diagram.getMediator("throttle", 0, "condition");
      });

      await test.step('Enable fields in throttle mediator', async () => {
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        const mediator = await diagram.getMediator("throttle", 0, "condition");
        await mediator.click();
        const form = await mediator.getEditForm()        
        await form.fill({
            values: {
                'On Accept Branch Sequence Type': {
                  type: 'combo',
                  value: 'REGISTRY_REFERENCE',
                },
                'On Reject Branch Sequence Type': {
                  type: 'combo',
                  value: 'REGISTRY_REFERENCE',
                },
                'Policy Type': {
                  type: 'combo',
                  value: 'REGISTRY_REFERENCE',
                },
            },
            enabledFields: ['On Accept Branch Sequence Key', 'On Reject Branch Sequence Key', 'Policy Key']
        });
        await form.cancel();
      });

      await test.step('Navigate to sequence creation form and add new sequences', async () => {
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        const mediator = await diagram.getMediator("throttle", 0, "condition");
        await mediator.click();
        const form = await mediator.getEditForm();
        await form.fill({
          values: {
              'On Accept Branch Sequence Type': {
                type: 'combo',
                value: 'REGISTRY_REFERENCE',
              },
              'On Reject Branch Sequence Type': {
                type: 'combo',
                value: 'REGISTRY_REFERENCE',
              }
          },
          enabledFields: ['On Accept Branch Sequence Key', 'On Reject Branch Sequence Key']
        });
        await form.clickAddNewForField('On Accept Branch Sequence Key');
        const sequence1 = new Sequence(page.page);
        await sequence1.createSequence('throttleSeq1', true);
        await form.clickAddNewForField('On Reject Branch Sequence Key');
        const sequence2 = new Sequence(page.page);
        await sequence2.createSequence('throttleSeq2', true);
        await form.cancel();
      });

      await test.step('Select sequences from the available sequences', async () => {
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        const mediator = await diagram.getMediator("throttle", 0, "condition");
        await mediator.click();
        const form = await mediator.getEditForm();
        await form.fill({
          values: {
            'On Accept Branch Sequence Type': {
              type: 'combo',
              value: 'REGISTRY_REFERENCE',
            },
            'On Accept Branch Sequence Key': {
              type: 'combo',
              value: 'throttleSeq2',
            },
            'On Reject Branch Sequence Type': {
              type: 'combo',
              value: 'REGISTRY_REFERENCE',
            },
            'On Reject Branch Sequence Key': {
              type: 'combo',
              value: 'throttleSeq1',
            }
          }
        });
        await form.cancel();
      });
      
      await test.step('Add policy entries', async () => {
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        const mediator = await diagram.getMediator("throttle", 0, "condition");
        await mediator.click();
        const form = await mediator.getEditForm();

        // add first param
        const paramManager = await form.getDefaultParamManager('policyEntries');
        let paramManagerForm = await paramManager.getAddNewForm();
        await paramManagerForm.fill({
          values: {
            'Throttle Type': {
              type: 'combo',
              value: 'DOMAIN'
            },
            'Access Type': {
              type: 'combo',
              value: 'Deny'
            }
          }
        })
        paramManagerForm.submit('Add');

        // add second param
        paramManagerForm = await paramManager.getAddNewForm();
        await paramManagerForm.fill({
          values: {
            'Throttle Type': {
              type: 'combo',
              value: 'DOMAIN'
            },
            'Access Type': {
              type: 'combo',
              value: 'Control'
            },
            'Unit Time': {
              type: 'input',
              value: '50'
            }
          }
        })
        await paramManagerForm.submit('Add');

        // add third param
        paramManagerForm = await paramManager.getAddNewForm();
        await paramManagerForm.fill({
          values: {
            'Throttle Type': {
              type: 'combo',
              value: 'DOMAIN'
            }
          }
        })
        await paramManagerForm.submit('Add');
        await form.submit('Update')
      });

      await test.step('Edit policy entry', async () => {
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        const mediator = await diagram.getMediator("throttle", 0, "condition");
        await mediator.click();
        const form = await mediator.getEditForm();
        const paramManager = await form.getDefaultParamManager('policyEntries');
        const paramEditForm = await paramManager.getEditForm(1);
        await paramEditForm.fill({
          values: {
            'Throttle Type': {
              type: 'combo',
              value: 'IP'
            },
          }
        });
        await paramEditForm.submit('Update');
        await form.submit('Update');
      });

      await test.step('Delete policy entry', async () => {
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        const mediator = await diagram.getMediator("throttle", 0, "condition");
        await mediator.click();
        const form = await mediator.getEditForm();
        const paramManager = await form.getDefaultParamManager('policyEntries');
        await paramManager.deleteParam(2);
        await form.submit('Update');
      });

      await test.step('Delete throttle mediator', async () => {
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        const mediator = await diagram.getMediator('throttle', 0, "condition");
        await mediator.delete(true);
      });
    });
  });
}
