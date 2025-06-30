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

import { expect, test } from '@playwright/test';
import { Form } from './../components/Form';
import { AddArtifact } from './../components/AddArtifact';
import { ServiceDesigner } from './../components/ServiceDesigner';
import { initTest, page } from '../Utils';
import { Diagram, SidePanel } from './../components/Diagram';
import { MACHINE_VIEW } from '@wso2/mi-core';
import { Overview } from '../components/Overview';
import { Sequence } from '../components/ArtifactTest/Sequence';
import { switchToIFrame } from '@wso2/playwright-vscode-tester/lib/components/Utils';

export default function createTests() {
  test.describe("Call Sequence Mediator Tests", {
    tag: '@group3',
  }, async () => {
    initTest();

    test("Call Sequence Mediator Tests", async ({}, testInfo) => {
      const testAttempt = testInfo.retry + 1;
      await test.step('Create new API', async () => {
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
              value: 'callSequenceMediatorAPI' + testAttempt,
            },
            'Context*': {
              type: 'input',
              value: '/callSequenceMediatorAPI' + testAttempt,
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

      await test.step('Add call sequence mediator creating a new sequence', async () => {
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        await diagram.clickPlusButtonByIndex(0);
        const sidePanel = new SidePanel(diagram.getDiagramWebView());
        await sidePanel.init();
        await sidePanel.search('Call Sequence');
        await sidePanel.selectMediator('Call\\ Sequence');
        const form = await sidePanel.getForm();
        await form.clickAddNewForField('Referring Sequence');
        const sequence = new Sequence(page.page);
        await sequence.createSequence('callSeq1' + testAttempt, true);
        await form.submit("Add");
      });

      await test.step('Delete call sequence mediator', async () => {
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        await page.page
        const mediator = await diagram.getMediator('sequence', 0, 'reference');
        await mediator.delete();
      });

      await test.step('Add call sequence mediator selecting an available sequence', async () => {
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        await diagram.clickPlusButtonByIndex(0);
        const sidePanel = new SidePanel(diagram.getDiagramWebView());
        await sidePanel.init();
        await sidePanel.search('Call Sequence');
        await sidePanel.selectMediator('Call\\ Sequence');
        const form = await sidePanel.getForm();
        await form.fill({
            values: {
                'Referring Sequence': {
                    type: 'combo',
                    value: 'callSeq1' + testAttempt,
                }
            }
        });
        await form.submit("Add");
        await diagram.getMediator('sequence', 0, 'reference');
      });

      await test.step('Enter a simple expression', async () => {
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        await diagram.clickPlusButtonByIndex(0);
        const sidePanel = new SidePanel(diagram.getDiagramWebView());
        await sidePanel.init();
        await sidePanel.search('Call Sequence');
        await sidePanel.selectMediator('Call\\ Sequence');
        const form = await sidePanel.getForm();
        await form.clickExBtnForField('Referring\\ Sequence');
        await form.fill({
            values: {
                'EXReferring Sequence*': {
                    type: 'input',
                    value: '$ctx:seq1',
                }
            }
        });
        await form.submit("Add");
        await diagram.getMediator('sequence', 0, 'reference');
      });

      await test.step('Edit the entered expression', async () => {
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        const mediator = await diagram.getMediator('sequence', 0, 'reference');
        await mediator.click();
        const form = await mediator.getEditForm();
        await form.fill({
            values: {
                'EXReferring Sequence*': {
                    type: 'input',
                    value: '$ctx:seq2',
                }
            }
        });
        await form.submit("Update");
      })

      await test.step('Edit a expression with pencil button', async () => {
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        const mediator = await diagram.getMediator('sequence', 0, 'reference');
        await mediator.click();
        const form = await mediator.getEditForm();
        await form.clickPencilBtnForField('Referring\\ Sequence');
        await switchToIFrame('Resource View', page.page);
        const expressionEditorPanel = new SidePanel(diagram.getDiagramWebView());
        await expressionEditorPanel.init();
        const expressionEditorForm = await expressionEditorPanel.getForm();
        await expressionEditorForm.fill({
            values: {
                'Expression Value': {
                    type: 'input',
                    value: '$ctx:seq3'
                }
            }
        })
        await expressionEditorForm.submit('Save');
        await form.submit('Update');
      });

      await test.step('Add multiple name spaces while editing', async () => {
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        const mediator = await diagram.getMediator('sequence', 0, 'reference');
        await mediator.click();
        const form = await mediator.getEditForm();
        await form.clickPencilBtnForField('Referring\\ Sequence');
        await switchToIFrame('Resource View', page.page);
        const expressionEditorPanel = new SidePanel(diagram.getDiagramWebView());
        await expressionEditorPanel.init();
        const expressionEditorForm = await expressionEditorPanel.getForm();
        
        const namespaceParamManager = await expressionEditorForm.getSimpleParamManager('Namespace');
        let namespaceForm = await namespaceParamManager.getAddNewForm();
        await namespaceForm.fill({
            values: {
                'Prefix': {
                    type: 'input',
                    value: 'prefix1'
                }, 
                'URI': {
                    type: 'input',
                    value: 'uri1'
                }
            }
        });
        await namespaceForm.submit('Save');

        namespaceForm = await namespaceParamManager.getAddNewForm();
        await namespaceForm.fill({
            values: {
                'Prefix': {
                    type: 'input',
                    value: 'prefix2'
                }, 
                'URI': {
                    type: 'input',
                    value: 'uri2'
                }
            }
        });
        await namespaceForm.submit('Save');

        namespaceForm = await namespaceParamManager.getAddNewForm();
        await namespaceForm.fill({
            values: {
                'Prefix': {
                    type: 'input',
                    value: 'prefix3'
                }, 
                'URI': {
                    type: 'input',
                    value: 'uri3'
                }
            }
        });
        await namespaceForm.submit('Save');
        const namespacesCount = await namespaceParamManager.getParamsCount();
        expect(namespacesCount).toBe(3);
        await expressionEditorForm.submit('Save');
        await form.submit('Update');
      });

      await test.step('Edit an already added namespace', async () => {
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        const mediator = await diagram.getMediator('sequence', 0, 'reference');
        await mediator.click();
        const form = await mediator.getEditForm();
        await form.clickPencilBtnForField('Referring\\ Sequence');
        await switchToIFrame('Resource View', page.page);
        const expressionEditorPanel = new SidePanel(diagram.getDiagramWebView());
        await expressionEditorPanel.init();
        const expressionEditorForm = await expressionEditorPanel.getForm();
        const namespaceParamManager = await expressionEditorForm.getSimpleParamManager('Namespace');
        const namespaceForm = await namespaceParamManager.getEditForm(1);
        await namespaceForm.fill({
            values: {
                'Prefix': {
                    type: 'input',
                    value: 'prefix4'
                }, 
                'URI': {
                    type: 'input',
                    value: 'uri4'
                }
            }
        });
        await namespaceForm.submit('Save');
        await expressionEditorForm.submit('Save');
        await form.submit('Update');
      });

      await test.step('Delete an already added namespace', async () => {
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        const mediator = await diagram.getMediator('sequence', 0, 'reference');
        await mediator.click();
        const form = await mediator.getEditForm();
        await form.clickPencilBtnForField('Referring\\ Sequence');
        await switchToIFrame('Resource View', page.page);
        const expressionEditorPanel = new SidePanel(diagram.getDiagramWebView());
        await expressionEditorPanel.init();
        const expressionEditorForm = await expressionEditorPanel.getForm();
        const namespaceParamManager = await expressionEditorForm.getSimpleParamManager('Namespace');
        await namespaceParamManager.deleteParam(2);
        const namespacesCount = await namespaceParamManager.getParamsCount();
        expect(namespacesCount).toBe(2);
        await expressionEditorForm.submit('Save');
        await form.submit('Update');
      });
    });
  });
}
