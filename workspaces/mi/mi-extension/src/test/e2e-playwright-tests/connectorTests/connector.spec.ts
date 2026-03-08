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
import { initTest, page } from '../Utils';
import { ConnectorStore } from '../components/ConnectorStore';
import { Diagram } from '../components/Diagram';
import { ServiceDesigner } from '../components/ServiceDesigner';
import { AddArtifact } from '../components/AddArtifact';
import { Form } from '../components/Form';
import { Overview } from '../components/Overview';
import { MACHINE_VIEW } from '@wso2/mi-core';
import { switchToIFrame } from '@wso2/playwright-vscode-tester';

export default function createTests() {
  test.describe("Connector Tests", {
    tag: '@group2',
  }, async () => {
    initTest(false, false, false, undefined, undefined, 'group2');

    test("Connector Tests", async ({ }, testInfo) => {
      const testAttempt = testInfo.retry + 1;
      await test.step('Create new API', async () => {
        console.log('Starting to create a new API');

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
              value: 'connectorsAPI' + testAttempt,
            },
            'Context*': {
              type: 'input',
              value: '/connectorsAPI' + testAttempt,
            },
          }
        });
        await apiForm.submit();
      });

      await test.step('Service designer', async () => {
        console.log('Accessing service designer');
        // service designer
        const serviceDesigner = new ServiceDesigner(page.page);
        await serviceDesigner.init();
        const resource = await serviceDesigner.resource('GET', '/');
        await resource.click();
      });

      await test.step('Download connector of specific version through modules list', async () => {
        console.log('Downloading connector of specific version through add modules list ');
        // diagram
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        await diagram.downloadConnectorThroughModulesList('File', 0, '4.0.43');
      });

      await test.step('Add downloaded connector operation to resource', async () => {
        console.log('Adding downloaded connector operation to resource');
        // diagram
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();

        await diagram.addConnectorOperation('File', 'createDirectory');

        // create connection through connector form
        console.log('Create connection through connector operation form');
        await diagram.addNewConnectionFromOperationForm();

        const connectorStore = new ConnectorStore(page.page, "Resource View");
        await connectorStore.init();
        await connectorStore.selectOperation('LOCAL');

        const connectionForm = new Form(page.page, 'Resource View');
        await connectionForm.switchToFormView(true);
        console.log('Filling out connection form');
        await connectionForm.fill({
          values: {
            'Connection Name*': {
              type: 'input',
              value: 'local_connection' + testAttempt,
            },
            'Working Directory': {
              type: 'input',
              value: 'examplefolder/tempfolder/'
            }
          }
        });
        await connectionForm.submit('Add');

        // Fill connector form
        console.log('Fill operation form');
        await diagram.init();
        await diagram.fillConnectorForm({
          values: {
            'Directory Path*': {
              type: 'expression',
              value: 'createdDirectory'
            }
          }
        });
      });

      await test.step('Edit connector operation in resource', async () => {
        console.log('Editing connector operation in resource');
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        const connector = await diagram.getConnector('file', 'createDirectory');
        await connector.edit({
          values: {
            'Directory Path*': {
              type: 'expression',
              value: 'createdDirectory'
            }
          }
        });
      });

      await test.step('Download module through search', async () => {
        console.log('Downloading module through search');
        // diagram
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        await diagram.downloadConnectorThroughSearch('CSV');
      });

      await test.step('Add downloaded module operation to resource', async () => {
        console.log('Adding downloaded module operation to resource');
        // diagram
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();

        await diagram.addConnectorOperation('CSV', 'CSV to CSV', 'CSV\\ to\\ CSV');

        // Fill connector form
        await diagram.fillConnectorForm({
          values: {
            'Skip Data Rows': {
              type: 'expression',
              value: '5'
            }
          }
        });
      });

      await test.step('Delete connector', async () => {
        console.log('Deleting connector');
        // diagram
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        await diagram.deleteConnector('CSV');
        console.log('Deleting connector completed');
      });

      await test.step('Import connector from file', async () => {
        console.log('Importing connector from file');
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        await diagram.clickPlusButtonByIndex(1);
        await diagram.clickImportModuleFile();
        const connectorStore = new ConnectorStore(page.page, "Resource View");
        await connectorStore.init();
        await connectorStore.importConnector('bookservice-1.0.0.zip', 'zip');
        console.log('Connector imported successfully');
        const resourceView = await switchToIFrame('Resource View', page.page);
        if (resourceView) {
          await resourceView.locator('[data-testid="sidepanel"] i.codicon.codicon-close').click({ force: true });
          console.log('Closed side panel');
        } else {
          console.warn('Resource View iframe not found, skipping close side panel step.');
        }
      });

      await test.step('Create connection from connections tab', async () => {
        console.log('Creating connection from connections tab');
        // diagram
        const diagram = new Diagram(page.page, 'Resource');
        await diagram.init();
        console.log('Adding new connection from connections tab');
        await diagram.addNewConnectionFromConnectionsTab();

        console.log('Selecting connector and version');
        const connectorStore = new ConnectorStore(page.page, "Resource View");
        await connectorStore.init();
        const resourceView = await switchToIFrame('Resource View', page.page);
        if (!resourceView) {
          throw new Error("Failed to switch to Resource View iframe");
        }
        console.log('Searching for connector');
        await resourceView.locator('#popUpPanel').getByRole('textbox', { name: 'Text field' }).fill('kafka');
        await connectorStore.downloadConnector('Kafka', resourceView);
        try {
          await resourceView.getByRole('textbox', { name: 'Connection Name*' }).waitFor({ timeout: 150000 });
        } catch (error) {
          console.log('Connection Name textbox not found, retrying to download connector');
          await connectorStore.downloadConnector('Kafka', resourceView);
          await resourceView.getByRole('textbox', { name: 'Connection Name*' }).waitFor({ timeout: 150000 });
        }
        console.log('Connector downloaded successfully');
        console.log('Filling out connection form');
        const connectionForm = new Form(page.page, 'Resource View');
        await connectionForm.switchToFormView(true);
        await connectionForm.fill({
          values: {
            'Connection Name*': {
              type: 'input',
              value: 'kafka_connection',
            },
            'Bootstrap Servers*': {
              type: 'expression',
              value: 'server1'
            },
            'Key Serializer Class*': {
              type: 'expression',
              value: 'key1'
            },
            'Value Serializer Class*': {
              type: 'expression',
              value: 'val1'
            },
          }
        });
        await connectionForm.submit('Add');
        console.log('Connection created successfully');
      });

      // await test.step('Add connector operation through connections tab', async () => {
      //   console.log('Adding connector operation through connections tab');
      //   // diagram
      //   const diagram = new Diagram(page.page, 'Resource');
      //   await diagram.init();
      //   await diagram.addConnectorOperation('kafka_connection', 'PublishMessages');

      //   // Fill connector form
      //   await diagram.fillConnectorForm({
      //     values: {
      //       'Topic*': {
      //         type: 'expression',
      //         value: 'exampleTopic'
      //       },
      //       'Partition Number*': {
      //         type: 'expression',
      //         value: '2'
      //       }
      //     }
      //   });
      // });
    });
  });
}
