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
import { Frame,Page } from '@playwright/test';
import { TypeEditorUtils } from '../type/TypeEditorUtils';
import { Form } from '@wso2/playwright-vscode-tester';

// Centralized test data for all GraphQL service E2E tests
export const TEST_DATA = {
    editedBasePath: (attempt: number) => `/editedSample${attempt}`,
    query: {
    name: 'query1',
    fieldType: 'string',
    },
    mutation: [{
        name: 'mutation1',
        editedName: 'editedMutation1',
        fieldType: 'boolean',
    },{
        name: 'mutation2',
        fieldType: 'float',
        expression: '"Hello World!"',
        arguments: [
            { name: 'arg1', type: 'string' },
            { name: 'arg2', type: 'mytype1' },
        ],
        outputType: 'outputtype1',
    }],
    subscription: {
        name: 'subscription1',
        fieldType: 'float',
    },
};

export class GraphQLServiceUtils {
    /**
     * Constructor for GraphQLServiceUtils
     * @param webView - The Playwright frame/locator for the webview
     */
    constructor(private page: Page, private webView: Frame) {}

    async addGraphQLOperation(operationType: string, name: string, fieldType: string) {
        const addBtnTestId = `graphql-add-${operationType}-btn`;
        await this.webView.getByTestId(addBtnTestId).waitFor({ state: 'visible', timeout: 10000 });
        const addBtn = this.webView.getByTestId(addBtnTestId);
        await addBtn.click();

        await this.setSidePanel({
            fieldName: { value: name, label: 'Field Name' },
            fieldType: { value: fieldType, label: 'Field Type' }
        });
    }

    async addFunction(name: string, returnType: string) {
        const outputType = TEST_DATA.mutation[1].outputType;
        await this.webView.getByTestId(`type-node-${outputType}`).getByText(`${outputType}`).click();
        await this.webView.getByRole('button', { name: '   Implement' }).click();
        await this.webView.getByTestId('add-variable-button').click({ force: true });
        await this.setSidePanel({
            fieldName: { value: TEST_DATA.mutation[1].arguments[0].name, label: 'Variable Name' },
            fieldType: { value: TEST_DATA.mutation[1].arguments[0].type, label: 'Variable Type' }
        });
        await this.webView.getByTestId('back-button').click();
    }

    private async setSidePanel(params: { 
        fieldName: { value: string; label: string }; 
        fieldType: { value: string; label: string }; 
    }) {
        const { fieldName, fieldType } = params;

        const fieldNameBox = this.webView.getByRole('textbox', { name: fieldName.label });
        await this.waitForElement(fieldNameBox);
        await fieldNameBox.fill(fieldName.value);

        const fieldTypeBox = this.webView.getByRole('textbox', { name: fieldType.label });
        await this.waitForElement(fieldTypeBox);
        await fieldTypeBox.fill(fieldType.value);
        console.log(`Filled ${fieldType.label} with value: ${fieldType.value}`);

        // Wait a short moment to allow UI to register the value
        await this.page.waitForTimeout(10000);
        const fieldDefaultCompletion = this.webView.getByRole('button', { name: ` ${fieldType.value}`, exact: true });
        await this.waitForElement(fieldDefaultCompletion);
        console.log(`Field default completion is visible: ${await fieldDefaultCompletion.isVisible()}`);
        // Click on Field Type label to move focus out of the input box
        await this.webView.getByText(fieldType.label).click();

        // TODO: https://github.com/wso2/product-ballerina-integrator/issues/917
        if (await fieldDefaultCompletion.isVisible()) {
            await fieldTypeBox.press('Escape');
        }

        const saveBtn = this.webView.getByRole('button', { name: 'Save' });
        await this.waitForElement(saveBtn);
        await saveBtn.click();
        await this.page.waitForTimeout(2000);
        await this.page.waitForLoadState('domcontentloaded');  
    }   

    async clickButtonByTestId(testId: string) {
        const button = this.webView.getByTestId(testId);
        await this.waitForElement(button);
        await button.click();
    }

    async addOutputObject() {
        const createFromScratchTab = this.webView.getByTestId('create-from-scratch-tab');
        await this.webView.getByRole('textbox', { name: 'Field Type' }).click();
        console.log('Clicked on Field Type textbox');
        await this.webView.getByText('Create New Type').click();

        const form = new Form(this.page, 'WSO2 Integrator: BI', this.webView);
        await form.switchToFormView(false, this.webView);
        console.log('Switched to form view for creating new type');
        await form.fill({
            values: {
                'Name': {
                    type: 'input',
                    value: TEST_DATA.mutation[1].outputType,
                },  
                'Kind': {
                    type: 'dropdown',
                    value: 'Object',
                }
            }
        });
        console.log('Filled form for new output object type');
        const typeEditorUtils = new TypeEditorUtils(this.page, this.webView);
        await typeEditorUtils.addFunction("function1", "string");
        console.log('Added function to the new type');
        await this.webView.getByTestId('type-create-save').getByRole('button', { name: 'Save' }).click();
        console.log('Saved the new output object type');
    }

    async createInputObjectFromScratch() {
        const form = new Form(this.page, 'WSO2 Integrator: BI', this.webView);
        await this.webView.getByText('Add Argument').click();
        await this.webView.getByRole('textbox', { name: 'Argument Type' }).click();
        await this.webView.getByText('Create New Type').click();
        await form.fill({
            values: {
                'Name': {
                    type: 'input',
                    value: TEST_DATA.mutation[1].arguments[1].type,
                },
                'Kind': {
                    type: 'dropdown',
                    value: 'Input Object',
                }
            }
        });

        await this.webView.getByTestId('type-create-save').getByRole('button', { name: 'Save' }).click();
        await this.webView.getByRole('textbox', { name: 'Argument Name*The name of the' }).fill(TEST_DATA.mutation[1].arguments[1].name);
        await this.webView.getByRole('button', { name: 'Add' }).click();
    }

    async addArgumentToGraphQLService() {
        await this.webView.getByText('Add Argument').click();
        await this.webView.getByRole('textbox', { name: 'Argument Type' }).click();
        await this.webView.getByRole('button', { name: ' string', exact: true }).click();
        await this.webView.getByText('Argument Type*').click();
        await this.webView.getByRole('textbox', { name: 'Argument Name*The name of the' }).fill(TEST_DATA.mutation[1].arguments[0].name);
        await this.webView.getByText('Argument Name*').click();
        await this.webView.getByRole('button', { name: 'Add' }).click();
    }

    async waitForElement(locator: any, timeout = 10000) {
        await locator.waitFor({ state: 'visible', timeout });
    }

    async closePanel() {
        await this.page.waitForTimeout(2000);
        const closeButton = this.webView.getByTestId('close-panel-btn');
        await this.waitForElement(closeButton);

        await closeButton.click({ force: true });
        await closeButton.waitFor({
            state: 'detached',
            timeout: 10000
        });
    }
}
