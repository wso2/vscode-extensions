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
import { page } from './utils';
const fs = require('fs');
const path = require('path');
const videosFolder = path.join(__dirname, '..', 'test-resources', 'videos');

import service from './service/service.spec';
import automation from './automation/automation.spec';
import configuration from './configuration/configuration.spec';

test.describe.configure({ mode: 'default' });

test.beforeAll(async () => {
    if (fs.existsSync(videosFolder)) {
        fs.rmSync(videosFolder, { recursive: true, force: true });
    }
    console.log('>>> Starting test suite');
});

test.describe(service);
test.describe(automation);
test.describe(configuration);

test.afterAll(async () => {
    console.log(`>>> Finished test suite`);
    const dateTime = new Date().toISOString().replace(/:/g, '-');
    console.log('>>> Saving video');
    await page.page?.close();
    page.page.video()?.saveAs(path.join(videosFolder, `test_${dateTime}.webm`));
    console.log('>>> Video saved');
});
