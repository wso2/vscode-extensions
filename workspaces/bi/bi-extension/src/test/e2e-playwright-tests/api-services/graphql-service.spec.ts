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
import { addArtifact, initTest, page } from '../utils';
import { Form, switchToIFrame } from '@wso2/playwright-vscode-tester';
import { ProjectExplorer } from '../ProjectExplorer';
import { addGraphQLOperation, clickButtonByTestId, TEST_DATA, addArgumentToGraphQLService, addOutputObject, createInputObjectFromScratch } from './graphqlUtils';


export default function createTests() {
    test.describe('GraphQL Service Tests', {
        tag: '@group1',
    }, async () => {
        initTest();
        test('Create GraphQL Service', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Creating a new service in test attempt: ', testAttempt);
            // Creating a HTTP Service
            await addArtifact('GraphQL Service', 'graphql-service-card');
            const artifactWebView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!artifactWebView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }
            const sampleName = TEST_DATA.service.basePath(testAttempt);
            const form = new Form(page.page, 'WSO2 Integrator: BI', artifactWebView);
            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    'Service Base Path*': {
                        type: 'input',
                        value: sampleName,
                    }
                }
            });
            await form.submit('Create');

            // Check if the type diagram canvas is visible
            const typeDiagram = artifactWebView.locator('[data-testid="type-diagram"]');
            await typeDiagram.waitFor();

            // Check if the service name is visible
            const context = artifactWebView.locator(`text=${sampleName}`).first();
            await context.waitFor();

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
            const artifactWebView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!artifactWebView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }
            const editBtn = artifactWebView.locator('[data-testid="edit-service-btn"]');
            await editBtn.waitFor();
            await editBtn.click({ force: true });
            const form = new Form(page.page, 'WSO2 Integrator: BI', artifactWebView);
            await form.switchToFormView(false, artifactWebView);
            const sampleName = TEST_DATA.service.editedBasePath(testAttempt);
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
            await typeDiagram.waitFor({ state: 'visible', timeout: 30000 });

            // Check if the service name is visible
            const context = artifactWebView.locator(`text=${sampleName}`).first();
            await context.waitFor();
        });

        test('Create Operations in GraphQL Service', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Creating operations in test attempt: ', testAttempt);
            const artifactWebView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!artifactWebView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }            

            await clickButtonByTestId(artifactWebView, 'create-operation-button');
            await addGraphQLOperation(artifactWebView, 'query', TEST_DATA.operations.query.name, TEST_DATA.operations.query.fieldType);
            await addGraphQLOperation(artifactWebView, 'mutation', TEST_DATA.operations.mutation.name, TEST_DATA.operations.mutation.fieldType);
            await addGraphQLOperation(artifactWebView, 'subscription', TEST_DATA.operations.subscription.name, TEST_DATA.operations.subscription.fieldType);
            await clickButtonByTestId(artifactWebView, 'close-panel-btn');

        });

        test('Add types and arguments to GraphQL Service', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Adding types and arguments in test attempt: ', testAttempt);
            const artifactWebView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!artifactWebView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }
                        
            await clickButtonByTestId(artifactWebView, 'graphql-add-mutation-btn');
            await addArgumentToGraphQLService(artifactWebView);
            await createInputObjectFromScratch(artifactWebView);
            await addOutputObject(artifactWebView);

            await artifactWebView.getByRole('textbox', { name: 'Field Name*The name of the' }).fill(TEST_DATA.field.name);
            await artifactWebView.waitForTimeout(5000); // Wait for the field name to be set
            const saveButton = artifactWebView.getByRole('button', { name: 'Save' });
            await saveButton.click();

            // if the the button is not showing saving then again click on the save button
            while (await saveButton.isVisible()) {
                await saveButton.click();
            }
    });

    test('Edit and Delete Operations in GraphQL Service', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Adding types and arguments in test attempt: ', testAttempt);
            const artifactWebView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!artifactWebView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }

            const saveButton = artifactWebView.getByRole('button', { name: 'Save' });
            const editButton = await artifactWebView.getByTestId('edit-button-mutation1');
            await editButton.click();
            
            // Fill mutation name
            const mutationNameInput = artifactWebView.getByRole('textbox', { name: 'Mutation Name*The name of the mutation' });
            await mutationNameInput.waitFor({ state: 'visible', timeout: 10000 });
            await mutationNameInput.fill(TEST_DATA.mutationEdit.name);
            await saveButton.click();

            // Delete the mutation
            await artifactWebView.getByTestId('delete-button-mutation2').click();
            await artifactWebView.waitForTimeout(5000); // Wait for the delete confirmation dialog to appear
            await artifactWebView.getByRole('button', { name: 'Okay' }).click();
            await artifactWebView.waitForTimeout(5000); // Wait for the delete confirmation dialog to close
    });

    test('Navigate to respective flow diagram', async ({ }, testInfo) => {
        const artifactWebView = await switchToIFrame('WSO2 Integrator: BI', page.page);
        if (!artifactWebView) {
            throw new Error('WSO2 Integrator: BI webview not found');
        }

        const saveButton = artifactWebView.getByRole('button', { name: 'Save' });

        await artifactWebView.getByTestId('side-panel').getByText(TEST_DATA.field.name).click();
        await artifactWebView.getByTestId('link-add-button-undefined').click();
        await artifactWebView.getByText('Return').click();
        await artifactWebView.getByRole('textbox', { name: 'Expression' }).fill(TEST_DATA.expression);
        await saveButton.click();
        await artifactWebView.getByText('GraphQL Diagram').click();
    });
});
}
