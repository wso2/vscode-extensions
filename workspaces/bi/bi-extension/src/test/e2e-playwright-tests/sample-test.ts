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
import { initTest, page } from './utils';
import { switchToIFrame } from '@wso2/playwright-vscode-tester';

export default function createTests() {
    test.describe('Sample Test Group', {
        tag: '@group1',
    }, async () => {
        initTest();
        test('Sample', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;

            console.log('Sample Test: START TEST ATTEMPT', testAttempt);


            const webView = await switchToIFrame('WSO2 Integrator: BI', page.page);
            if (!webView) {
                throw new Error('WSO2 Integrator: BI webview not found');
            }

            expect(false).toBeTruthy();

            console.log('Sample Test: COMPLETE TEST ATTEMPT', testAttempt);
        });
    });
}
