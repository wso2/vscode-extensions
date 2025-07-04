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
import { switchToIFrame } from '@wso2/playwright-vscode-tester';

export default function createTests() {
    test.describe('Automation Tests', {
        tag: '@group1',
    }, async () => {
        initTest();
        test('Create Automation', async () => {
            // Creating a Automation
            await addArtifact('Automation', 'automation');
            const artifactWebView = await switchToIFrame('WSO2 Integrator: BI', page.page, 30000);
            if (!artifactWebView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }
            await artifactWebView.getByRole('button', { name: 'Create' }).click();
        });
    });
}
