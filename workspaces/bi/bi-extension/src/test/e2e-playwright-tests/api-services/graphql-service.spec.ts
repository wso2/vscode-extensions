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
import { Frame, test } from '@playwright/test';
import { addArtifact, initTest, page } from '../utils';
import { Form, switchToIFrame } from '@wso2/playwright-vscode-tester';
import { ProjectExplorer } from '../ProjectExplorer';
import { TEST_DATA, GraphQLServiceUtils} from './graphqlUtils';
import { TypeEditorUtils } from '../type/TypeEditorUtils';

export default function createTests() {
    test.describe('GraphQL Service Tests', {
        tag: '@group1',
    }, async () => {
        initTest();
        
        // Global utility instances for all tests
        let graphqlServiceUtils: GraphQLServiceUtils;
        let typeEditorUtils: TypeEditorUtils;
        let artifactWebView: Frame;

        // Setup utilities before each test
        test.beforeEach(async () => {
            artifactWebView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!artifactWebView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }
            graphqlServiceUtils = new GraphQLServiceUtils(page.page, artifactWebView);
            typeEditorUtils = new TypeEditorUtils(page.page, artifactWebView);
        });

        test('Create GraphQL Service', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Creating a new service in test attempt: ', testAttempt);
            // Creating a HTTP Service
            await addArtifact('GraphQL Service', 'graphql-service-card');
            const form = new Form(page.page, 'WSO2 Integrator: BI', artifactWebView);
            await form.switchToFormView(false, artifactWebView);
            await form.submit('Create');

            // Check if the type diagram canvas is visible
            const typeDiagram = artifactWebView.locator('[data-testid="type-diagram"]');
            await typeDiagram.waitFor();

            // Check if the AI Chat Agent is created in the project explorer
            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.findItem(['sample', `GraphQL Service`], true);

            const updateArtifactWebView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!updateArtifactWebView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }
        });

        test('Editing GraphQL Service', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Editing a service in test attempt: ', testAttempt);
            const editBtn = artifactWebView.locator('[data-testid="edit-service-btn"]');
            await editBtn.waitFor();
            await editBtn.click({ force: true });
            const form = new Form(page.page, 'WSO2 Integrator: BI', artifactWebView);
            await form.switchToFormView(false, artifactWebView);
            const sampleName = TEST_DATA.editedBasePath(testAttempt);
            await form.fill({
                values: {
                    'Service Base Path*': {
                        type: 'input',
                        value: sampleName,
                    }
                }
            });
            await form.submit('Save');

            // Check if the type diagram canvas is visible
            const typeDiagram = artifactWebView.locator('[data-testid="type-diagram"]');
            await typeEditorUtils.waitForElement(typeDiagram);

            // Check if the service name is visible
            const context = artifactWebView.locator(`text=${sampleName}`).first();
            await context.waitFor();
        });

        test('Create Operations in GraphQL Service', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Creating operations in test attempt: ', testAttempt);

            await graphqlServiceUtils.clickButtonByTestId('create-operation-button');
            await graphqlServiceUtils.addGraphQLOperation('query', TEST_DATA.query.name, TEST_DATA.query.fieldType);
            await graphqlServiceUtils.addGraphQLOperation('mutation', TEST_DATA.mutation[0].name, TEST_DATA.mutation[0].fieldType);
            await graphqlServiceUtils.addGraphQLOperation('subscription', TEST_DATA.subscription.name, TEST_DATA.subscription.fieldType);
        });

        test('Add types and arguments to GraphQL Service', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Adding types and arguments in test attempt: ', testAttempt);
            console.log('Adding Query');

            await graphqlServiceUtils.clickButtonByTestId('graphql-add-mutation-btn');
            console.log('Clicked on Add Mutation button');
            await graphqlServiceUtils.addArgumentToGraphQLService();
            console.log('Added argument to the mutation');
            await graphqlServiceUtils.createInputObjectFromScratch();
            console.log('Created input object from scratch');
            await graphqlServiceUtils.addOutputObject();
            await artifactWebView.getByRole('textbox', { name: 'Field Name*The name of the' }).fill(TEST_DATA.mutation[1].name);
            await artifactWebView.getByRole('button', { name: 'Save' }).click();
            await graphqlServiceUtils.closePanel();

            const outputName = TEST_DATA.mutation[1].outputType;
            await typeEditorUtils.verifyTypeLink(TEST_DATA.editedBasePath(testAttempt), TEST_DATA.mutation[1].name, outputName);
            await typeEditorUtils.verifyTypeNodeExists(outputName);
            await graphqlServiceUtils.addFunction("function1", "string");
        });

        test('Edit and Delete Operations in GraphQL Service', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Adding types and arguments in test attempt: ', testAttempt);

            const editedBasePath = TEST_DATA.editedBasePath(testAttempt);
            await artifactWebView.getByTestId(`type-node-${editedBasePath}`).getByText(`${editedBasePath}`).click({ force: true });
            const editButton = await artifactWebView.getByTestId(`edit-button-${TEST_DATA.mutation[0].name}`);
            await editButton.click();
            
            // Fill mutation name
            const mutationNameInput = artifactWebView.getByRole('textbox', { name: 'Mutation Name*The name of the mutation' });
            await typeEditorUtils.waitForElement(mutationNameInput);
            await mutationNameInput.fill(TEST_DATA.mutation[0].editedName);
            await artifactWebView.getByRole('button', { name: 'Save' }).click();

            // Delete the mutation
            await artifactWebView.getByTestId(`delete-button-${TEST_DATA.mutation[0].editedName}`).click();
            await artifactWebView.getByRole('button', { name: 'Okay' }).click();
        });

        test('Navigate to respective flow diagram', async ({ }, testInfo) => {
            await artifactWebView.getByTestId('side-panel').getByText(TEST_DATA.mutation[1].name).click();
            await artifactWebView.getByTestId('link-add-button-undefined').click();
            await artifactWebView.getByText('Return').click();
            await artifactWebView.getByRole('textbox', { name: 'Expression' }).fill(TEST_DATA.mutation[1].expression);
            await artifactWebView.getByRole('button', { name: 'Save' }).click();
        });
    });
}
