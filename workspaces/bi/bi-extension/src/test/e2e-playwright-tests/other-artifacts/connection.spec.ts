

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

export default function createTests() {
    test.describe('Connection Artifact Tests', {
        tag: '@group1',
    }, async () => {
        initTest();
        test('Create Connection Artifact', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Creating a new connection in test attempt: ', testAttempt);
            // Creating a HTTP Connection
            await addArtifact('HTTP Connection', 'connection');
            const artifactWebView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!artifactWebView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }

            const cardHttp = artifactWebView.locator('#connector-http');
            await cardHttp.waitFor();
            await cardHttp.click({ force: true });

            const form = new Form(page.page, 'WSO2 Integrator: BI', artifactWebView);
            const connectionName = `sample${testAttempt}`;
            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    'Url': {
                        type: 'textarea',
                        value: '"https://foo.bar/baz"',
                    },
                    'Connection Name*Name of the connection': {
                        type: 'input',
                        value: connectionName,
                    }
                }
            });
            await page.page.waitForTimeout(1000); // Wait for the form button to be enabled
            await form.submit('Create');

            const connectionCard = artifactWebView.getByText(connectionName, { exact: true }).first();
            await connectionCard.waitFor();

            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.findItem(['sample', `${connectionName}`], true);
            const updateArtifactWebView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!updateArtifactWebView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }
        });

    });
}


