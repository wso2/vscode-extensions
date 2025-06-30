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
import { Resource } from '../components/ArtifactTest/Resource';

export default function createTests() {
  test.describe("Validate Mediator Tests", {
    tag: '@group3',
  }, async () => {
    initTest();

    test("Validate Mediator Tests", async ({}, testInfo) => {
      const testAttempt = testInfo.retry + 1;
      await test.step('Create new API', async () => {
        console.log('Create API for validate mediator tests');
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
              value: 'validateMediatorAPI' + testAttempt,
            },
            'Context*': {
              type: 'input',
              value: '/validateMediatorAPI' + testAttempt,
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

      await test.step('Add validate mediator with custom values', async () => {
        console.log('Adding validate mediator with custom values');
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        await diagram.addMediator('Validate', {
          values: {
            'Source': {
              type: 'expression',
              value: '$ctx:src'
            },
            'Enable Schema Caching': {
              type: 'checkbox',
              value: 'checked'
            },
            'Description': {
              type: 'input',
              value: 'validate mediator'
            }
          }
        });
        await diagram.getMediator('validate', 0, 'group');
        console.log('Adding log mediator to inner sequence');
        await diagram.addMediator('Log', { values: {}}, 1)
        await diagram.getMediator('log', 0);
      });

      await test.step('Edit validate mediator basic values', async () => {
        console.log('Editing validate mediator basic values');
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        const mediator = await diagram.getMediator('validate', 0, 'group');
        await mediator.edit({
          values: {
            'Source': {
              type: 'expression',
              value: '$ctx:updatedSrc'
            },
            'Description': {
              type: 'input',
              value: 'validate mediator edited'
            }
          }
        });
        await diagram.getMediator('validate', 0, 'group');
      });

      await test.step('Select a variable from expression chip', async () => {
        console.log('Selecting a variable from expression chip');
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        await diagram.addMediator('Variable', {
          values: {
            'Name*': {
              type: 'input',
              value: 'var1'
            },
            'Value*': {
              type: 'expression',
              value: 'test variable'
            }
          }
        });
        const mediator = await diagram.getMediator('validate', 0, 'group');
        await mediator.click();
        const form = await mediator.getEditForm();
        await form.clickHelperPaneBtnForField('Source');
        await diagram.selectVariableFromHelperPane('var1');
        await form.submit('Update');
      });

      await test.step('Handle schemas', async () => {
        console.log('Adding new schema');
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        const mediator = await diagram.getMediator('validate', 0, 'group');
        await mediator.click();
        const form = await  mediator.getEditForm();
        const schemaParamManager = await form.getDefaultParamManager('schemas');
        const schemaManagerForm = await schemaParamManager.getAddNewForm();
        await schemaManagerForm.clickAddNewForField('Validate Schema Key');
        const resource = new Resource(page.page);
        await resource.addFromTemplate({
          name: 'xsdSchema1',
          type: 'XSD File',
          registryPath: 'xsd'
        }, true);
        await schemaManagerForm.submit('Add');

        console.log('Adding more schemas');
        await schemaParamManager.getAddNewForm();
        await schemaManagerForm.clickAddNewForField('Validate Schema Key');
        await resource.addFromTemplate({
          name: 'xsdSchema2',
          type: 'XSD File',
          registryPath: 'xsd'
        }, true);
        await schemaManagerForm.submit('Add');

        await schemaParamManager.getAddNewForm();
        await schemaManagerForm.clickAddNewForField('Validate Schema Key');
        await resource.addFromTemplate({
          name: 'xsdSchema3',
          type: 'XSD File',
          registryPath: 'xsd'
        }, true);
        await schemaManagerForm.submit('Add');

        console.log('Deleting a schema');
        await schemaParamManager.deleteParam(2);

        console.log('Editing a schema');
        const schemaEditForm = await schemaParamManager.getEditForm(1);
        await schemaEditForm.fill({
          values: {
            'Validate Schema Key': {
              type: 'combo',
              value: 'xsd/xsdSchema3.xsd'
            }
          }
        })
        await schemaEditForm.submit('Update');
        await form.submit('Update');
      });

      await test.step('Handle features', async () => {
        console.log('Adding a feature');
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        const mediator = await diagram.getMediator('validate', 0, 'group');
        await mediator.click();
        const form = await  mediator.getEditForm();
        const featureParamManager = await form.getDefaultParamManager('features');
        const featureManagerForm = await featureParamManager.getAddNewForm();
        await featureManagerForm.fill({
          values: {
            'Feature Name*': {
              type: 'input',
              value: 'feature1'
            },
            'Feature Enabled': {
              type: 'checkbox',
              value: 'checked'
            }
          }
        });
        await featureManagerForm.submit('Add');

        console.log('Adding more features');
        await featureParamManager.getAddNewForm();
        await featureManagerForm.fill({
          values: {
            'Feature Name*': {
              type: 'input',
              value: 'feature2'
            }
          }
        });
        await featureManagerForm.submit('Add');

        await featureParamManager.getAddNewForm();
        await featureManagerForm.fill({
          values: {
            'Feature Name*': {
              type: 'input',
              value: 'feature3'
            }
          }
        });
        await featureManagerForm.submit('Add');

        console.log('Deleting a feature');
        await featureParamManager.deleteParam(2);

        console.log('Editing a feature');
        const featureEditForm = await featureParamManager.getEditForm(1);
        await featureEditForm.fill({
          values: {
            'Feature Name*': {
              type: 'input',
              value: 'feature5'
            }
          }
        });
        await featureEditForm.submit('Update');
        await form.submit('Update');
      });

      await test.step('Handle resources', async () => {
        console.log('Adding a resource');
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        const mediator = await diagram.getMediator('validate', 0, 'group');
        await mediator.click();
        const form = await  mediator.getEditForm();
        const resourceParamManager = await form.getDefaultParamManager('resources');
        const resourceManagerForm = await resourceParamManager.getAddNewForm();
        await resourceManagerForm.fill({
          values: {
            'Location*': {
              type: 'input',
              value: 'resource1'
            },
            'Location Key': {
              type: 'combo',
              value: 'xsd/xsdSchema1.xsd'
            }
          }
        });
        await resourceManagerForm.submit('Add');

        console.log('Adding more resources');
        await resourceParamManager.getAddNewForm();
        await resourceManagerForm.fill({
          values: {
            'Location*': {
              type: 'input',
              value: 'resource2'
            },
            'Location Key': {
              type: 'combo',
              value: 'xsd/xsdSchema2.xsd'
            }
          }
        });
        await resourceManagerForm.submit('Add');

        await resourceParamManager.getAddNewForm();
        await resourceManagerForm.fill({
          values: {
            'Location*': {
              type: 'input',
              value: 'resource3'
            },
            'Location Key': {
              type: 'combo',
              value: 'xsd/xsdSchema3.xsd'
            }
          }
        });
        await resourceManagerForm.submit('Add');

        console.log('Deleting a resource');
        await resourceParamManager.deleteParam(2);

        console.log('Editing a resource');
        const resourceEditForm = await resourceParamManager.getEditForm(1);
        await resourceEditForm.fill({
          values: {
            'Location Key': {
              type: 'combo',
              value: 'xsd/xsdSchema3.xsd'
            }
          }
        });
        await resourceEditForm.submit('Update');
        await form.submit('Update');
      });

      await test.step('Delete validate mediator', async () => {
        console.log('Deleting validate mediator');
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        const mediator = await diagram.getMediator('validate', 0, 'group');
        await mediator.delete()
      });
    });
  });
}
