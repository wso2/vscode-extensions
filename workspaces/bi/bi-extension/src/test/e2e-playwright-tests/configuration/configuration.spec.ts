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
import { addArtifact, enableICP, initTest, page } from '../utils';
import { Form, switchToIFrame } from '@wso2/playwright-vscode-tester';
import { ConfigEditor } from '../ConfigEditor';
import { config } from 'process';

export default function createTests() {
    test.describe('Configuration Tests', {
        tag: '@group1',
    }, async () => {
        initTest();
        test('Create Configuration', async () => {
            await enableICP();

            // Create new configurable variables in configuration view
            await addArtifact('Configuration', 'configurable');

            // Wait for 3 seconds to ensure the webview is loaded
            await new Promise(resolve => setTimeout(resolve, 3000));

            const configEditor = new ConfigEditor(page.page, 'WSO2 Integrator: BI');
            await configEditor.init();
            const configurationWebView = configEditor.getWebView();

            // Verify initial configuration view selects integration package
            const selectedPackage = await configEditor.getSelectedPackage();
            expect(selectedPackage).toBe('Integration');

            // Verify Configurable Variables view
            await configEditor.verifyPageLoaded();

            // Create a new configurable variable
            await configEditor.addNewConfigurableVariable();

            // Fill the form fields
            const form = new Form(page.page, 'WSO2 Integrator: BI', configurationWebView);
            await form.switchToFormView(false, configurationWebView);
            await form.fill({
                values: {
                    'Variable name*Name of the variable': {
                        type: 'input',
                        value: 'time',
                    },
                    'Variable Type': {
                        type: 'textarea',
                        value: 'int'
                    },
                    'Default Value': {
                        type: 'textarea',
                        value: '100'
                    }
                }
            });
        
            const documentationField = await configurationWebView.locator('textarea[name="documentation"]');
            await documentationField.fill('This is the description of the time config variable');

            await configurationWebView.getByRole('button', { name: 'Save' }).click();

            await configEditor.verifyConfigurableVariable('time', '100', '');

            await configEditor.editConfigurableVariable('time');

            // Fill the form fields
            const editForm = new Form(page.page, 'WSO2 Integrator: BI', configurationWebView);
            await editForm.switchToFormView(false, configurationWebView);
            await editForm.fill({
                values: {
                    'Default Value': {
                        type: 'textarea',
                        value: '200'
                    }
                }
            });

            await configurationWebView.getByRole('button', { name: 'Save' }).click();
            await configEditor.verifyConfigurableVariable('time', '200', '');

            await configEditor.addConfigTomlValue('time', '500');
            await configEditor.verifyConfigurableVariable('time', '200', '500');

            // Create a new configurable variable with no default value
            await configEditor.addNewConfigurableVariable();

            // Fill the form fields
            const addForm = new Form(page.page, 'WSO2 Integrator: BI', configurationWebView);
            await addForm.switchToFormView(false, configurationWebView);
            await addForm.fill({
                values: {
                    'Variable name*Name of the variable': {
                        type: 'input',
                        value: 'place',
                    },
                    'Variable Type': {
                        type: 'textarea',
                        value: 'string'
                    }
                }
            });

            await configurationWebView.getByRole('button', { name: 'Save' }).click();
            await configEditor.verifyConfigurableVariable('place', '', '');
            await configEditor.verifyWarning('place');

            await configEditor.deleteConfigVariable('place');

            await configEditor.selectPackage('ballerinax/wso2.controlplane');
            await configEditor.addConfigTomlValue('dashboard', 'example-dashboard');
            await configEditor.verifyConfigurableVariable('dashboard', '', 'example-dashboard');

        });
    });
}
