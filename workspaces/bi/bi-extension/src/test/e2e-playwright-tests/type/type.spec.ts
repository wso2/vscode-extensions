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
import { addArtifact, initTest, page } from '../utils';
import { Form, switchToIFrame } from '@wso2/playwright-vscode-tester';
import { ProjectExplorer } from '../ProjectExplorer';

export default function createTests() {
    test.describe('Type Editor Tests', {
        tag: '@group1',
    }, async () => {
        initTest();

        test('Create Types from Scratch', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Creating a record type from scratch in test attempt: ', testAttempt);

            // Navigate to type editor
            await addArtifact('Type', 'type');

            // Wait for page to be stable before accessing iframe
            await page.page.waitForLoadState('networkidle');

            // Retry logic for iframe access
            let artifactWebView;
            let retryCount = 0;
            const maxRetries = 3;

            while (retryCount < maxRetries) {
                try {
                    artifactWebView = await switchToIFrame('WSO2 Integrator: BI', page.page);
                    if (artifactWebView) {
                        break;
                    }
                } catch (error) {
                    console.log(`Attempt ${retryCount + 1} failed to access iframe:`, error instanceof Error ? error.message : String(error));
                    retryCount++;
                    if (retryCount < maxRetries) {
                        // Wait a bit before retrying
                        await page.page.waitForTimeout(2000);
                        await page.page.waitForLoadState('domcontentloaded');
                    }
                }
            }

            if (!artifactWebView) {
                throw new Error('WSO2 Integrator: BI webview not found after multiple attempts');
            }

            // Click Add Type button
            // const addTypeButton = artifactWebView.getByRole('button', { name: 'Add Type' });
            // await addTypeButton.waitFor({ state: 'visible', timeout: 60000 });
            // await addTypeButton.click();

            // Wait for the type editor to load
            await page.page.waitForTimeout(2000);
            await page.page.waitForLoadState('domcontentloaded');

            // Wait for type editor content to be visible
            const typeEditorContent = artifactWebView.locator('[data-testid="type-editor-container"]');
            await typeEditorContent.waitFor({ state: 'visible', timeout: 60000 });

            // create an enum type to verify the type diagram updates
            // await addTypeButton.waitFor({ state: 'visible', timeout: 60000 });
            // await addTypeButton.click();

            // ENUM: Role

            const enumName = `Role${testAttempt}`;

            const form = new Form(page.page, 'WSO2 Integrator: BI', artifactWebView);
            await form.switchToFormView(false, artifactWebView);
        
            await form.fill({
                values: {
                    'Name': {
                        type: 'input',
                        value: enumName,
                    },
                    'Kind': {
                        type: 'dropdown',
                        value: 'Enum',
                    }
                }
            });

            // already a field is added in enum, so we just need to fill it
            const enumFieldNameInput = artifactWebView.locator('[data-testid="identifier-field"]').first();
            await enumFieldNameInput.waitFor({ state: 'visible', timeout: 60000 });
            await enumFieldNameInput.dblclick();
            await enumFieldNameInput.type('Admin');

            // add new enum field
            const addMemberButton = artifactWebView.locator('[data-testid="add-member-button"]');
            await addMemberButton.click();


            const enumFieldNameInput2 = artifactWebView.locator('[data-testid="identifier-field"]').nth(1);
            await enumFieldNameInput2.waitFor({ state: 'visible', timeout: 60000 });
            await enumFieldNameInput2.dblclick();
            await enumFieldNameInput2.type('Engineer');

            // add sales enum field
            await addMemberButton.click();
            const enumFieldNameInput3 = artifactWebView.locator('[data-testid="identifier-field"]').nth(2);
            await enumFieldNameInput3.waitFor({ state: 'visible', timeout: 60000 });
            await enumFieldNameInput3.dblclick();
            await enumFieldNameInput3.type('Sales');

            //add marketing enum field
            await addMemberButton.click();
            const enumFieldNameInput4 = artifactWebView.locator('[data-testid="identifier-field"]').nth(3);
            await enumFieldNameInput4.waitFor({ state: 'visible', timeout: 60000 });
            await enumFieldNameInput4.dblclick();
            await enumFieldNameInput4.type('Marketing');

            // delete the second field
            const deleteButton2 = artifactWebView.locator('[data-testid="delete-member-1"]');
            await deleteButton2.waitFor({ state: 'visible', timeout: 60000 });
            await deleteButton2.click();

            // Save the enum type
            await form.submit('Save');

            // Wait for the save operation to complete
            await page.page.waitForTimeout(2000);
            await page.page.waitForLoadState('domcontentloaded');

            // Verify the enum type was created in the type diagram by checking for EntityHeads data-testid
            const enumElement = artifactWebView.locator(`[data-testid="type-node-${enumName}"]`);
            await enumElement.waitFor({ state: 'visible', timeout: 60000 });

            // UNION: Id
            const addTypeButton = artifactWebView.getByRole('button', { name: 'Add Type' });

            // create union type to verify the type diagram updates union has two fields int and string
            await addTypeButton.waitFor({ state: 'visible', timeout: 60000 });
            await addTypeButton.click();

            const unionName = `Id${testAttempt}`;
            await form.fill({
                values: {
                    'Name': {
                        type: 'input',
                        value: unionName,
                    },
                    'Kind': {
                        type: 'dropdown',
                        value: 'Union',
                    }
                }
            });

            // add first field to union already a field is added in union, so we just need to fill it
            const unionFieldNameInput = artifactWebView.locator('[data-testid="type-field"]').first();
            await unionFieldNameInput.waitFor({ state: 'visible', timeout: 60000 });
            await unionFieldNameInput.dblclick();
            await unionFieldNameInput.type('int');
            // just need to fill the second field as well
            const unionFieldNameInput2 = artifactWebView.locator('[data-testid="type-field"]').nth(1);
            await unionFieldNameInput2.waitFor({ state: 'visible', timeout: 60000 });
            await unionFieldNameInput2.dblclick();
            await unionFieldNameInput2.type('string');

            //save
            await form.submit('Save');


            // RECORD: Employee

            // const addTypeButton = artifactWebView.getByRole('button', { name: 'Add Type' });
            await addTypeButton.waitFor({ state: 'visible', timeout: 60000 });
            await addTypeButton.click();

            // Fill in the record type details using test IDs
            const recordName = `Employee${testAttempt}`;

            await form.fill({
                values: {
                    'Name': {
                        type: 'input',
                        value: recordName,
                    },
                    'Kind': {
                        type: 'dropdown',
                        value: 'Record',
                    }
                }
            });

            // Add a field to the record
            const addFieldButton = artifactWebView.locator('[data-testid="add-field-button"]');
            await addFieldButton.waitFor({ state: 'visible', timeout: 60000 });
            await addFieldButton.click();

            // Fill in field details - use identifier-field for field name and type-field for field type
            const fieldNameInput = artifactWebView.locator('[data-testid="identifier-field"]').first();
            await fieldNameInput.waitFor({ state: 'visible', timeout: 60000 });
            // For VS Code text fields, we need to double-click to select all, then type
            await fieldNameInput.dblclick();
            await fieldNameInput.type('role');

            const fieldTypeInput = artifactWebView.locator('[data-testid="type-field"]').first();
            await fieldTypeInput.waitFor({ state: 'visible', timeout: 60000 });
            // For VS Code text fields, we need to double-click to select all, then type
            await fieldTypeInput.dblclick();
            await fieldTypeInput.type(enumName); // Use the enum type created earlier

            // Add a field to the record
            await addFieldButton.click();

            // Fill in field details - use identifier-field for field name and type-field for field type
            const fieldNameInput2 = artifactWebView.locator('[data-testid="identifier-field"]').first();
            await fieldNameInput2.waitFor({ state: 'visible', timeout: 60000 });
            // For VS Code text fields, we need to double-click to select all, then type
            await fieldNameInput2.dblclick();
            await fieldNameInput2.type('id');

            const fieldTypeInput2 = artifactWebView.locator('[data-testid="type-field"]').first();
            await fieldTypeInput2.waitFor({ state: 'visible', timeout: 60000 });
            // For VS Code text fields, we need to double-click to select all, then type
            await fieldTypeInput2.dblclick();
            await fieldTypeInput2.type(unionName); // Use the union type created earlier

            await form.submit('Save');

            // Wait for the save operation to complete
            await page.page.waitForTimeout(2000);
            await page.page.waitForLoadState('domcontentloaded');

            // Verify the record was created in the type diagram by checking for EntityHeads data-testid
            const recordElement = artifactWebView.locator(`[data-testid="type-node-${recordName}"]`);
            await recordElement.waitFor({ state: 'visible', timeout: 60000 });

            // Verify the link between the record and enum in the type diagram
            const enumLinkTestID = `node-link-${recordName}/id-${unionName}`;
            // Verify the link between the record and enum
            const enumLinkElement = artifactWebView.locator(`[data-testid="${enumLinkTestID}"]`);
            await enumLinkElement.waitFor({ state: 'visible', timeout: 60000 });

            await page.page.pause();

        });
    });
}