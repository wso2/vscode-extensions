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

import { Page } from "@playwright/test";
import { Form } from "./Form";
import { ProjectExplorer } from "./ProjectExplorer";

interface PropertyData {
    name: string,
    scope: 'default' | 'transport' | 'axis2' | 'axis2-client',
    value: string
}

interface AssertionData {
    type: 'Assert Equals' | 'Assert Not Null',
    actualExpression: string,
    expectedValue?: string,
    errorMessage: string
}

interface HeaderData {
    name: string,
    value: string
}

interface ExpectedRequestData {
    headers?: HeaderData[],
    payload: string
}

interface ExpectedResponseData {
    statusCode: string,
    headers?: HeaderData[],
    payload: string
}

interface MockServiceResourceData {
    serviceSubContext: string,
    serviceMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS',
    expectedRequest: ExpectedRequestData,
    expectedResponse: ExpectedResponseData
}

interface TestCaseData {
    name: string,
    resourcePath: string,
    resourceMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'TRACE' | 'CONNECT',
    resourceProtocol: 'HTTP' | 'HTTPS',
    inputPayload?: string,
    properties?: PropertyData[],
    assertions?: AssertionData[]
}

interface MockServiceData {
    name: string,
    endpoint?: string,
    port: string,
    context: string
    resources?: MockServiceResourceData[]
}

interface UnitTestData {
    name: string,
    artifactType: 'API' | 'Sequence',
    artifact: string,
    supportiveArtifacts?: string[];
    registryResources?: string[];
    testCases?: TestCaseData[];
    mockServices?: string | MockServiceData[];
}

export class UnitTest {
    private projectName: string = 'testProject';

    constructor(private _page: Page) {
    }

    public async init() {
        console.log('Selecting Testing section in VS Code');
        const testBtn = this._page.getByRole('tab', { name: 'Testing' }).locator('a');
        await testBtn.waitFor();
        await testBtn.click();
    }

    public async openUnitTestFormByMainBtn() {
        console.log('Opening Unit Test Form by "Add Unit Test" button');
        await this._page.getByRole('button', { name: 'Add Unit Test', exact: true }).click();
    }

    public async openUnitTestFormByExplorer() {
        const testExplorer = this._page.locator('div[aria-label="Test Explorer Section"]');
        await testExplorer.hover();
        await testExplorer.getByLabel('Test Explorer actions').getByLabel('Add unit test').click();
    }

    private async getUniTestForm(): Promise<Form> {
        console.log('Opening Unit Test Form');
        const form = new Form(this._page, 'Test Suite Form');
        await form.switchToFormView();
        return form;
    }

    private async getTestCaseForm(): Promise<Form> {
        console.log('Opening Test Case Form');
        const form = new Form(this._page, 'Test Case Form');
        await form.switchToFormView();
        return form;
    }

    private async getMockServiceForm(): Promise<Form> {
        console.log('Opening Mock Service Form');
        const form = new Form(this._page, 'Mock Service');
        await form.switchToFormView();
        return form;    
    }

    private async addSupportiveArtifacts(parentForm: Form, artifacts: string[]) {
        console.log('Adding supportive artifacts to Unit Test');
        for (const artifact of artifacts) {
            console.log('Adding supportive artifact: ', artifact);
            const paramManager = await parentForm.getSimpleParamManager('Supportive Artifact', 'testSuiteSupportiveArtifactsSection');
            const form = await paramManager.getAddNewForm();      
            await form.fill({
            values: {
                'Name': {
                    type: 'combo',
                    value: artifact
                }
            }
            });
            await form.submit('Save');
        }
    }

    private async addRegistryResources(parentForm: Form, resources: string[]) {
        console.log('Adding registry resources to Unit Test');
        for (const resource of resources) {
            console.log('Adding registry resource: ', resource);
            const paramManager = await parentForm.getSimpleParamManager('Registry Resources', 'testSuiteRegistryResourcesSection');
            const form = await paramManager.getAddNewForm();
            await form.fill({
                values: {
                    'Name': {
                        type: 'combo',
                        value: resource
                    }
                }
            });
            await form.submit('Save');
        }
    }

    public async fillTestCaseForm(form: Form, testCase: TestCaseData) {
        await this.fillTestCaseBasicForm(form, testCase);
        console.log('Filling Test Case Properties');
        for (const property of testCase.properties ?? []) {
            const propertiesParamManager = await form.getDefaultParamManager('Properties', 'Add Property', 'card-select-testCasePropertiesCard');
            const propertiesForm = await propertiesParamManager.getAddNewForm();
            await this.fillTestCasePropertyForm(propertiesForm, property);
            await propertiesForm.submit('Save');
        }
        console.log('Filling Test Case Assertions');
        for (const assertion of testCase.assertions ?? []) {
            const assertionsParamManager = await form.getDefaultParamManager('Assertions', 'Add Assertion', 'card-select-testCaseAssertionsCard');
            const assertionsForm = await assertionsParamManager.getAddNewForm();
            await this.fillTestCaseAssertionForm(assertionsForm, assertion);
            await assertionsForm.submit('Save');
        }
    }

    public async fillTestCaseBasicForm(form: Form, testCase: TestCaseData) {
        console.log('Filling Test Case Form');
        await form.fill({
            values: {
                'Name*': {
                    type: 'input',
                    value: testCase.name 
                },
                'Resource path*': {
                    type: 'input',
                    value: testCase.resourcePath
                },
                'Resource method': {
                    type: 'dropdown',
                    value: testCase.resourceMethod  
                },
                'Resource Protocol': {
                    type: 'dropdown',
                    value: testCase.resourceProtocol
                },
                'Input Payload ': {
                    type: 'textarea',
                    value: testCase.inputPayload || ''
                }
            }
        });
    }

    private async fillTestCasePropertyForm(form: Form, property: PropertyData) {
        console.log('Filling Test Case Property Form for:', property.name);
        await form.fill({
            values: {
                'Property Name*': {
                    type: 'input',
                    value: property.name
                },
                'Property Scope*': {
                    type: 'dropdown',
                    value: property.scope
                },
                'Property Value*': {
                    type: 'input',
                    value: property.value
                }
            }
        });
    }

    private async fillTestCaseAssertionForm(form: Form, assertion: AssertionData) {
        console.log(`Filling Test Case Assertion Form for actualExpression: ${assertion.actualExpression}`);
        await form.fill({
            values: {
                'Assertion Type': {
                    type: 'dropdown',
                    value: assertion.type
                },
                'Actual Expression*': {
                    type: 'input',
                    value: assertion.actualExpression
                },
                'Error Message*': {
                    type: 'input',
                    value: assertion.errorMessage
                }
            }
        });
        if (assertion.expectedValue) {
            await form.fill({
                values: {
                    'Expected Value ': {
                        type: 'textarea',
                        value: assertion.expectedValue
                    },
                }
            });
        }
    }
    
    private async addTestCases(parentForm: Form, testCases: TestCaseData[]) {
        console.log('Adding test cases to Unit Test');
        for (const testCase of testCases) {
            console.log('Adding test case: ', testCase.name);
            const paramManager = await parentForm.getParamManagerWithNewCreateForm('TestCases', 'Test Suite Form', 'card-select-testSuiteTestCasesCard');
            const form = await paramManager.getAddNewForm();
            await this.fillTestCaseForm(form, testCase);
            await form.submit('Create');
        }
    }

    public async fillMockServiceBasicForm(mockServiceForm: Form, mockService: MockServiceData) {
        console.log('Filling Mock Service Form');
        await mockServiceForm.fill({
            values: {
                'Name*': {
                    type: 'input',
                    value: mockService.name
                },
                'Endpoint': {
                    type: 'combo',
                    value: mockService.endpoint || ''
                },
                'Service port*': {
                    type: 'input',
                    value: mockService.port
                },
                'Service context*': {
                    type: 'input',
                    value: mockService.context
                }
            }
        });
    }

    private async fillMockServiceForm(mockServiceForm: Form, mockService: MockServiceData, frame: string) {
        console.log('Filling Mock Service Form');
        await this.fillMockServiceBasicForm(mockServiceForm, mockService);
        for (const resource of mockService.resources || []) {
            const resourceParamManager = await mockServiceForm.getParamManagerWithNewCreateForm('MockServiceResources', frame, 'card-select-mockServiceResourceCard');
            const resourceForm = await resourceParamManager.getAddNewForm();
            await this.fillMockServiceResourceForm(resourceForm, resource);
            console.log('Adding mock service request headers');
            for (const header of resource.expectedRequest.headers ?? []) {
                const requestHeaderParamManager = await resourceForm.getDefaultParamManager('Request', 'Add Header', 'card-select-mockResourceRequestCard');
                const requestHeaderForm = await requestHeaderParamManager.getAddNewForm();
                await this.fillResourceHeaderForm(requestHeaderForm, header);
                await requestHeaderForm.submit('Save');
            }   
            console.log('Adding mock service response headers');
            for (const header of resource.expectedResponse.headers ?? []) {
                const responseHeaderParamManager = await resourceForm.getDefaultParamManager('Response', 'Add Header', 'card-select-mockResourceResponseCard');
                const responseHeaderForm = await responseHeaderParamManager.getAddNewForm();
                await this.fillResourceHeaderForm(responseHeaderForm, header);
                await responseHeaderForm.submit('Save');
            }
            await resourceForm.submit('Submit');
        }
    }

    public async fillMockServiceResourceForm(form: Form, resource: MockServiceResourceData) {
        console.log('Filling Mock Service Resource Form');
        await form.fill({
            values: {
                'Service Sub Context*': {
                    type: 'input',
                    value: resource.serviceSubContext
                },
                'Service Method': {
                    type: 'dropdown',
                    value: resource.serviceMethod
                },
                'Expected Request Payload ': {
                    type: 'textarea',
                    value: resource.expectedRequest.payload
                },
                'Response Status Code': {
                    type: 'dropdown',
                    value: resource.expectedResponse.statusCode
                },
                'Expected Response Payload ': {
                    type: 'textarea',
                    value: resource.expectedResponse.payload
                }
            }
        });
    }

    private async fillResourceHeaderForm(form: Form, header: HeaderData) {
        await form.fill({
            values: {
                'Header Name*': {
                    type: 'input',
                    value: header.name
                },
                'Header Value*': {
                    type: 'input',
                    value: header.value
                }
            }
        });
    }

    private async addMockServices(parentForm: Form, mockServices: string | MockServiceData[]) {
        const frame = 'Test Suite Form';
        for (const mockService of mockServices) {
            console.log('Adding mock service:', typeof mockService === 'string' ? mockService : mockService.name);
            const mockServicesParamManager = await parentForm.getParamManagerWithNewCreateForm('MockServices', frame, 'card-select-testSuiteMockServicesCard');
            const form = await mockServicesParamManager.getAddNewForm();
            if (typeof mockService === 'string') {
                await form.fill({
                    values: {
                        'Select Mock Service': {
                            type: 'combo',
                            value: mockService
                        }
                    }
                });
                await form.submit('Add');
            } else {
                await form.clickAddNewForField('Select Mock Service');
                const mockServiceForm = new Form(this._page, frame);
                await mockServiceForm.switchToFormView();
                await this.fillMockServiceForm(mockServiceForm, mockService, frame);
                await mockServiceForm.submit('Create');
            }
        }
    }

    public async fillUnitTestBasicForm(form: Form, data: UnitTestData) {
        console.log('Filling Unit Test Form');
        await form.fill({
            values: {
                'Name*': {
                    type: 'input',
                    value: data.name
                },
                'Artifact type*': {
                    type: 'dropdown',
                    value: data.artifactType
                },
                'Artifact*': {
                    type: 'dropdown',
                    value: data.artifact
                }
            }
        });
    }

    public async createUnitTest(data: UnitTestData) {
        const form = await this.getUniTestForm();
        await this.fillUnitTestBasicForm(form, data);

        if (data.supportiveArtifacts) {
            await this.addSupportiveArtifacts(form, data.supportiveArtifacts);
        }
        if (data.registryResources) {
            await this.addRegistryResources(form, data.registryResources);
        }
        if (data.testCases) {
            await this.addTestCases(form, data.testCases);
        }
        if (data.mockServices) {
            await this.addMockServices(form, data.mockServices);
        }

        await form.submit('Create');
    }

    public async addTestCaseFromSidePanel(unitTestName: string, testCase: TestCaseData) {
        console.log('Adding Test Case from side panel to Unit Test:', unitTestName);
        await this.openAddTestCaseViewOfUnitTest(unitTestName);
        const form = await this.getTestCaseForm();
        await this.fillTestCaseForm(form, testCase);
        await form.submit('Create');
    }

    private async openAddTestCaseViewOfUnitTest(name: string) {
        console.log('Opening Add Test Case view of Unit Test:', name);
        const testExplorer = new ProjectExplorer(this._page, 'Test Explorer');
        await testExplorer.init();
        await testExplorer.findItem([`${this.projectName} (Not yet run)`, `${name} (Not yet run)`], true);
        console.log(`Expand the explorer to ensure the unit test "${name}" is visible`);
        await this._page.getByRole('button', { name: 'Add test case' }).click();
        console.log(`Clicked on "Add test case" button for unit test "${name}"`);
    }

    private async openEditViewOfUnitTest(name: string) {
        console.log('Opening Edit view of Unit Test:', name);
        const testExplorer = new ProjectExplorer(this._page, 'Test Explorer');
        await testExplorer.init();
        await testExplorer.findItem([`${this.projectName} (Not yet run)`, `${name} (Not yet run)`]);
        await this._page.getByText(name, { exact: true }).click();
        await this._page.getByRole('button', { name: 'Edit test suite' }).click();
    }

    private async openEditViewOfMockService(name: string) {
        console.log('Opening Edit view of Mock Service:', name);
        const mockServiceExplorer = new ProjectExplorer(this._page, 'Mock Services'); 
        await mockServiceExplorer.init();
        await mockServiceExplorer.findItem([this.projectName + ' ', name + ' '], true);
        await this._page.getByRole('button', { name: 'Edit mock service' }).click();
    }

    public async addMockServiceFromSidePanel(data: MockServiceData) {
        console.log('Adding Mock Service from side panel');
        const mockServiceExplorer = new ProjectExplorer(this._page, 'Mock Services'); 
        await mockServiceExplorer.init();
        await mockServiceExplorer.findItem([this.projectName + ' '], true);
        await this._page.getByLabel('Add mock service').click();
        const form = await this.getMockServiceForm();
        await this.fillMockServiceForm(form, data, 'Mock Service');
        await form.submit('Create');
    }

    public async getEditUnitTestForm(unitTestName: string): Promise<Form> {
        console.log('Getting Edit Unit Test Form for:', unitTestName);
        await this.openEditViewOfUnitTest(unitTestName);
        return this.getUniTestForm();
    }

    public async getEditMockServiceForm(mockServiceName: string): Promise<Form> {
        console.log('Getting Edit Mock Service Form for:', mockServiceName);
        await this.openEditViewOfMockService(mockServiceName);
        return this.getMockServiceForm();
    }
}
