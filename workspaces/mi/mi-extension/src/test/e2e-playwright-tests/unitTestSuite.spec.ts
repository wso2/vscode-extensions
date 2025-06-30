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
import { Form } from './components/Form';
import { AddArtifact } from './components/AddArtifact';
import { initTest, page } from './Utils';
import { MACHINE_VIEW } from '@wso2/mi-core';
import { Overview } from './components/Overview';
import { UnitTest } from './components/UnitTest';
import { Sequence } from './components/ArtifactTest/Sequence';
import { Resource } from './components/ArtifactTest/Resource';
import { Endpoint } from './components/ArtifactTest/Endpoint';

export default function createTests() {
  test.describe("Unit Test Suite Tests", {
    tag: '@group3',
  }, async () => {
    initTest();

    test("Unit Test Suite Tests", async ({ }, testInfo) => {
      const testAttempt = testInfo.retry + 1;

      await test.step('Create new APIs', async () => {
        const { title: iframeTitle } = await page.getCurrentWebview();

        if (iframeTitle === MACHINE_VIEW.Overview) {
          const overviewPage = new Overview(page.page);
          await overviewPage.init();
          await overviewPage.goToAddArtifact();
        }

        const addArtifactPage = new AddArtifact(page.page);
        await addArtifactPage.init();
        await addArtifactPage.add('API');

        console.log('Creating new API');
        const apiForm = new Form(page.page, 'API Form');
        await apiForm.switchToFormView();
        await apiForm.fill({
          values: {
            'Name*': {
              type: 'input',
              value: 'unitTestAPI1-' + testAttempt,
            },
            'Context*': {
              type: 'input',
              value: '/unitTestAPI1-' + testAttempt,
            },
          }
        });
        await apiForm.submit();
      });

      await test.step('Create new sequences', async () => {
        console.log('Creating new sequences');
        const sequence = new Sequence(page.page);
        await sequence.init();
        await sequence.createSequence('unitTestSeq1-' + testAttempt);
        await sequence.init();
        await sequence.createSequence('unitTestSeq2-' + testAttempt);
      })

      await test.step('Create new http endpoints', async () => {
        console.log('Creating new http Endpoint');
        const ep = new Endpoint(page.page);
        await ep.init();
        await ep.addHttpEndpoint('httpUnitTestEp' + testAttempt);
      })

      await test.step('Create new resources', async () => {
        console.log('Creating new resources');
        const resource = new Resource(page.page);
        await resource.openNewFormFromArtifacts();
        await resource.addFromTemplate({
          name: 'xsltForUnitTest1-' + testAttempt,
          type: 'XSLT File',
          registryPath: 'xslt'
        });
        await resource.openNewFormFromArtifacts();
        await resource.addFromTemplate({
          name: 'xsltForUnitTest2-' + testAttempt,
          type: 'XSLT File',
          registryPath: 'xslt'
        });
      });

      await test.step('Add a unit test', async () => {
        const unitTest = new UnitTest(page.page);
        await unitTest.init();
        await unitTest.openUnitTestFormByExplorer();
        await unitTest.createUnitTest({
          name: `unitTest1-${testAttempt}`,
          artifactType: 'API',
          artifact: 'unitTestAPI1-' + testAttempt,
          supportiveArtifacts: ['unitTestSeq1-' + testAttempt, 'unitTestSeq2-' + testAttempt],
          registryResources: ['xsltForUnitTest1-' + testAttempt, 'xsltForUnitTest2-' + testAttempt],
          testCases: [
            {
              name: 'TestCase1-' + testAttempt,
              resourcePath: '/testCase1',
              resourceMethod: 'GET',
              resourceProtocol: 'HTTP',
              inputPayload: '{ "key": "value" }',
            },
            {
              name: 'TestCase2-' + testAttempt,
              resourcePath: '/testCase2',
              resourceMethod: 'POST',
              resourceProtocol: 'HTTPS',
              inputPayload: '{ "key": "value" }',
              properties: [
                {
                  name: 'Property1',
                  scope: 'default',
                  value: 'Value1'
                },
                {
                  name: 'Property2',
                  scope: 'axis2',
                  value: 'Value2'
                },
                {
                  name: 'Property3',
                  scope: 'transport',
                  value: 'Value3'
                }
              ]
            },
            {
              name: 'TestCase3-' + testAttempt,
              resourcePath: '/testCase3',
              resourceMethod: 'POST',
              resourceProtocol: 'HTTPS',
              inputPayload: '{ "key": "value" }',
              properties: [
                {
                  name: 'Property1',
                  scope: 'default',
                  value: 'Value1'
                },
                {
                  name: 'Property2',
                  scope: 'axis2',
                  value: 'Value2'
                }
              ],
              assertions: [
                {
                  type: 'Assert Equals',
                  actualExpression: 'var!=null',
                  expectedValue: 'true',
                  errorMessage: 'Assertion failed'
                },
                {
                  type: 'Assert Not Null',
                  actualExpression: 'var==null',
                  errorMessage: 'Assertion failed'
                }
              ]
            }
          ],
          mockServices: [
            {
              name: 'MockService1-' + testAttempt,
              endpoint: 'httpUnitTestEp' + testAttempt,
              port: '8080',
              context: '/mockService1',
            },
            {
              name: 'MockService2-' + testAttempt,
              endpoint: 'httpUnitTestEp' + testAttempt,
              port: '8081',
              context: '/mockService2',
              resources: [
                {
                  serviceSubContext: '/resource1',
                  serviceMethod: 'POST',
                  expectedRequest: {
                    headers: [
                      {
                        name: 'Content-Type',
                        value: 'application/json'
                      },
                      {
                        name: 'Accept',
                        value: 'application/json'
                      }
                    ],
                    payload: '{ "key": "value" }'
                  },
                  expectedResponse: {
                    statusCode: '200 OK',
                    headers: [
                      {
                        name: 'Content-Type',
                        value: 'application/xml'
                      },
                      {
                        name: 'Accept',
                        value: 'application/xml'
                      }
                    ],
                    payload: '{ "key": "result" }'
                  }
                },
                {
                  serviceSubContext: '/resource2',
                  serviceMethod: 'PUT',
                  expectedRequest: {
                    headers: [
                      {
                        name: 'Content-Type',
                        value: 'application/text'
                      },
                      {
                        name: 'Accept',
                        value: 'application/text'
                      }
                    ],
                    payload: '{ "key": "value" }'
                  },
                  expectedResponse: {
                    statusCode: '201 Created',
                    headers: [
                      {
                        name: 'Content-Type',
                        value: 'application/xml'
                      },
                      {
                        name: 'Accept',
                        value: 'application/xml'
                      }
                    ],
                    payload: '{ "key": "result" }'
                  }
                }
              ]
            }
          ]
        });
      });

      await test.step('Add mock service from side panel', async () => {
        const unitTest = new UnitTest(page.page);
        await unitTest.addMockServiceFromSidePanel({
          name: 'MockService1-sidepanel-' + testAttempt,
          endpoint: 'httpUnitTestEp' + testAttempt,
          port: '8080',
          context: '/mockService1',
          resources: [
            {
              serviceSubContext: '/resource1',
              serviceMethod: 'POST',
              expectedRequest: {
                payload: '{}'
              },
              expectedResponse: {
                statusCode: '100 Continue',
                payload: '{result}'
              }
            },
            {
              serviceSubContext: '/resource2',
              serviceMethod: 'PUT',
              expectedRequest: {
                payload: '{}'
              },
              expectedResponse: {
                statusCode: '200 OK',
                payload: '{result}'
              }
            }
          ]
        })
      });

      await test.step('Add test case from sidepanel', async () => {
        const unitTest = new UnitTest(page.page);
        await unitTest.addTestCaseFromSidePanel(`unitTest1-${testAttempt}`, {
          name: 'TestCase1-sidepanel-' + testAttempt,
          resourcePath: '/testCase1',
          resourceMethod: 'GET',
          resourceProtocol: 'HTTP',
          inputPayload: '{ "key": "value" }',
        })
      });

      await test.step('Edit mock service', async () => {
        const unitTest = new UnitTest(page.page);
        const editForm = await unitTest.getEditMockServiceForm(`MockService1-sidepanel-${testAttempt}`);
        await unitTest.fillMockServiceBasicForm(editForm, {
          name: 'MockService1-sidepanel-edited-' + testAttempt,
          endpoint: 'httpUnitTestEp' + testAttempt,
          port: '8081',
          context: '/mockService1'
        });
        const resourcesParamManager = await editForm.getParamManagerWithNewCreateForm('MockServiceResources', 'Mock Service', 'card-select-mockServiceResourceCard');
        await resourcesParamManager.deleteParam(1);
        const resourceEditForm = await resourcesParamManager.getEditForm(0);
        await unitTest.fillMockServiceResourceForm(resourceEditForm, {
          serviceSubContext: '/resource1-edited',
          serviceMethod: 'PUT',
          expectedRequest: {
            payload: '{}'
          },
          expectedResponse: {
            statusCode: '200 OK',
            payload: '{result}'
          }
        })
        await resourceEditForm.submit('Submit'); 
        await editForm.submit('Update');
      });

      await test.step('Edit unit test with test cases', async () => {
        const unitTest = new UnitTest(page.page);
        const editForm = await unitTest.getEditUnitTestForm(`unitTest1-${testAttempt}`);
        await unitTest.fillUnitTestBasicForm(editForm, {
          name: 'unitTest3Edited-' + testAttempt,
          artifactType: 'API',
          artifact: 'unitTestAPI1-' + testAttempt
        });
        const testCasesParamManager = await editForm.getParamManagerWithNewCreateForm('TestCases', 'Test Suite Form', 'card-select-testSuiteTestCasesCard');
        const testCaseEditForm = await testCasesParamManager.getEditForm(1);
        await unitTest.fillTestCaseBasicForm(testCaseEditForm, {
          name: 'TestCase2Edited-' + testAttempt,
          resourcePath: '/testCase2Edited',
          resourceMethod: 'POST',
          resourceProtocol: 'HTTPS',
          inputPayload: '{ "key": "value" }',
        })
        await testCaseEditForm.submit('Update');
        await testCasesParamManager.deleteParam(2);
        const mockServicesParamManager = await editForm.getParamManagerWithNewCreateForm('MockServices', 'Test Suite Form', 'card-select-testSuiteMockServicesCard');
        const mockServiceEditForm = await mockServicesParamManager.getEditForm(1);
        await mockServiceEditForm.fill({
          values: {
            'Select Mock Service': {
              type: 'combo',
              value: 'MockService2-' + testAttempt
            }
          }
        });
        await mockServiceEditForm.submit('Update');
        await mockServicesParamManager.deleteParam(0);
        await editForm.submit('Update');
      });
    });
  });
}
