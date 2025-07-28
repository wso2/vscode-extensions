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
// import { page } from '../utils';

// Centralized test data for all GraphQL service E2E tests
export const TEST_DATA = {
    service: {
        basePath: (attempt: number) => `/sample${attempt}`,
        editedBasePath: (attempt: number) => `/editedSample${attempt}`,
    },
    query: {
    name: 'query1',
    fieldType: 'string',
    },
    mutation: [{
        name: 'mutation1',
        editedName: 'editedMutation1',
        fieldType: 'boolean',
        arguments: [
            { name: 'arg1', type: 'string' },
            { name: 'arg2', type: 'mytype1' },
        ],
        outputType: 'outputtype1',
    },{
        name: 'mutation2',
        fieldType: 'float',
        expression: '"Hello World!"',
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

        const fieldNameBox = this.webView.getByRole('textbox', { name: /Field Name/i });
        await fieldNameBox.waitFor({ state: 'visible', timeout: 10000 });
        await fieldNameBox.fill(name);

        const fieldTypeBox = this.webView.getByRole('textbox', { name: /Field Type/i });
        await fieldTypeBox.waitFor({ state: 'visible', timeout: 10000 });
        // await fieldTypeBox.click();
        await fieldTypeBox.fill(fieldType);

        // Wait a short moment to allow UI to register the value
        await this.page.waitForTimeout(5000);
        const fieldDefaultCompletion = this.webView.getByTestId('add-type-completion');
        await fieldDefaultCompletion.waitFor({ state: 'visible', timeout: 10000 });

        if (fieldDefaultCompletion.isVisible()) {
            await fieldTypeBox.press('Escape');
        }

        const saveBtn = this.webView.getByRole('button', { name: /Save/i });
        await saveBtn.waitFor({ state: 'visible', timeout: 10000 });
        await saveBtn.click();
    }

    async clickButtonByTestId(testId: string) {
        const button = this.webView.getByTestId(testId);
        await button.waitFor({ state: 'visible', timeout: 10000 });
        await button.click();
    }

    async addOutputObject() {
        const createFromScratchTab = this.webView.getByTestId('create-from-scratch-tab');
        await this.webView.getByRole('textbox', { name: 'Field Type' }).click();
        await this.webView.getByText('Create New Type').click();
        await this.webView.getByTestId('type-kind-dropdown').locator('svg').click();
        await this.webView.getByRole('option', { name: 'Object' }).click();
        await createFromScratchTab.getByRole('textbox', { name: 'Name' }).fill(TEST_DATA.mutation[0].outputType);
        await this.webView.getByTestId('type-create-save').getByRole('button', { name: 'Save' }).click();
    }

    async createInputObjectFromScratch() {
        await this.webView.getByText('Add Argument').click();
        await this.webView.getByRole('textbox', { name: 'Argument Type' }).click();
        await this.webView.getByText('Create New Type').click();
        await this.webView.locator('slot', { hasText: /^Input Object$/ }).click();
        await this.webView.getByRole('option', { name: 'Input Object' }).click();

        // Fill name for the new input object type
        const createFromScratchTab = this.webView.getByTestId('create-from-scratch-tab');
        await createFromScratchTab.getByRole('textbox', { name: 'Name' }).fill(TEST_DATA.mutation[0].arguments[1].type);
        await this.webView.getByTestId('type-create-save').getByRole('button', { name: 'Save' }).click();
        await this.webView.getByRole('textbox', { name: 'Argument Name*The name of the' }).fill(TEST_DATA.mutation[0].arguments[1].name);
        await this.webView.getByRole('button', { name: 'Add' }).click();
    }

    async addArgumentToGraphQLService() {
        await this.webView.getByText('Add Argument').click();
        await this.webView.getByRole('textbox', { name: 'Argument Type' }).click();
        await this.webView.getByTitle('string', { exact: true }).click();
        await this.webView.getByRole('textbox', { name: 'Argument Name*The name of the' }).fill(TEST_DATA.mutation[0].arguments[0].name);
        await this.webView.getByRole('button', { name: 'Add' }).click();
    }
}
// /**
//  * Utility to add a GraphQL operation (mutation, subscription, etc.)
//  * @param artifactWebView - The Playwright frame/locator for the webview
//  * @param operationType - 'mutation' | 'subscription' | 'query'
//  * @param name - The name to use for the operation
//  * @param fieldType - The type to use for the field (e.g., 'boolean', 'float', etc.)
//  */
// export async function addGraphQLOperation(artifactWebView: Frame, operationType: string, name: string, fieldType: string) {
//     const addBtnTestId = `graphql-add-${operationType}-btn`;
//     await artifactWebView.getByTestId(addBtnTestId).waitFor({ state: 'visible', timeout: 10000 });
//     const addBtn = artifactWebView.getByTestId(addBtnTestId);
//     await addBtn.click();

//     const fieldNameBox = artifactWebView.getByRole('textbox', { name: /Field Name/i });
//     await fieldNameBox.waitFor({ state: 'visible', timeout: 10000 });
//     await fieldNameBox.fill(name);

//     const fieldTypeBox = artifactWebView.getByRole('textbox', { name: /Field Type/i });
//     await fieldTypeBox.waitFor({ state: 'visible', timeout: 10000 });
//     // await fieldTypeBox.click();
//     await fieldTypeBox.fill(fieldType);

//     // Wait a short moment to allow UI to register the value
//     await page.page.waitForTimeout(5000);
//     const fieldDefaultCompletion = artifactWebView.getByTestId('add-type-completion');
//     await fieldDefaultCompletion.waitFor({ state: 'visible', timeout: 10000 });

//     if (fieldDefaultCompletion.isVisible()) {
//         await fieldTypeBox.press('Escape');
//     }

//     const saveBtn = artifactWebView.getByRole('button', { name: /Save/i });
//     await saveBtn.waitFor({ state: 'visible', timeout: 10000 });
//     await saveBtn.click();
// }

// /**
//  * Click a button in the artifact webview by test id
//  * @param artifactWebView - The Playwright frame/locator for the webview
//  * @param testId - The test id of the button to click
//  */
// export async function clickButtonByTestId(artifactWebView: Frame, testId: string) {
//     const button = artifactWebView.getByTestId(testId);
//     await button.waitFor({ state: 'visible', timeout: 10000 });
//     await button.click();
// }

// /**
//  * Create an output object type in the GraphQL service
//  * @param artifactWebView - The Playwright frame/locator for the webview
//  */
// export async function addOutputObject(artifactWebView: Frame) {
//     const createFromScratchTab = artifactWebView.getByTestId('create-from-scratch-tab');
//     await artifactWebView.getByRole('textbox', { name: 'Field Type' }).click();
//     await artifactWebView.getByText('Create New Type').click();
//     await artifactWebView.getByTestId('type-kind-dropdown').locator('svg').click();
//     await artifactWebView.getByRole('option', { name: 'Object' }).click();
//     await createFromScratchTab.getByRole('textbox', { name: 'Name' }).fill(TEST_DATA.mutation[0].outputType);
//     await artifactWebView.getByTestId('type-create-save').getByRole('button', { name: 'Save' }).click();
// }

// /**
//  * Create an input object type from scratch in the GraphQL service
//  * @param artifactWebView - The Playwright frame/locator for the webview
//  */
// export async function createInputObjectFromScratch(artifactWebView: Frame) {
//     await artifactWebView.getByText('Add Argument').click();
//     await artifactWebView.getByRole('textbox', { name: 'Argument Type' }).click();
//     await artifactWebView.getByText('Create New Type').click();
//     await artifactWebView.locator('slot', { hasText: /^Input Object$/ }).click();
//     await artifactWebView.getByRole('option', { name: 'Input Object' }).click();

//     // Fill name for the new input object type
//     const createFromScratchTab = artifactWebView.getByTestId('create-from-scratch-tab');
//     await createFromScratchTab.getByRole('textbox', { name: 'Name' }).fill(TEST_DATA.mutation[0].arguments[1].type);
//     await artifactWebView.getByTestId('type-create-save').getByRole('button', { name: 'Save' }).click();
//     await artifactWebView.getByRole('textbox', { name: 'Argument Name*The name of the' }).fill(TEST_DATA.mutation[0].arguments[1].name);
//     await artifactWebView.getByRole('button', { name: 'Add' }).click();
// }

// /**
//  * Add an argument to a GraphQL service
//  * @param artifactWebView - The Playwright frame/locator for the webview
//  */
// export async function addArgumentToGraphQLService(artifactWebView: Frame) {
//     await artifactWebView.getByText('Add Argument').click();
//     await artifactWebView.getByRole('textbox', { name: 'Argument Type' }).click();
//     await artifactWebView.getByTitle('string', { exact: true }).click();
//     await artifactWebView.getByRole('textbox', { name: 'Argument Name*The name of the' }).fill(TEST_DATA.mutation[0].arguments[0].name);
//     await artifactWebView.getByRole('button', { name: 'Add' }).click();
// }




      