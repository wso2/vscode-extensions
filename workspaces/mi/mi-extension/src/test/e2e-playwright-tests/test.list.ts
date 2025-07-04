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
import connectionTests from './connectorTests/connection.spec';
import connectorTests from './connectorTests/connector.spec';
import inboundEpTests from './connectorTests/inboundEndpoint.spec';
import artifactTests from './artifactTests/artifact.spec';
import dataMapperTests from './dataMapper.spec';
import createProjectTests from './projectTests/createProject.spec';
import artifact430Tests from './artifactTests/artifact430.spec';
import logMediatorTests from './mediatorTests/log.spec';
import cacheMediatorTests from './mediatorTests/cache.spec';
import throttleMediatorTests from './mediatorTests/throttle.spec';
import callSequenceMediatorTests from './mediatorTests/callSequence.spec';
import overviewPageTests from './overviewPageTests/projectSettingPage.spec';
import openEntryPointArtifact from './overviewPageTests/openEntryPointArtifact.spec';
import validateMediatorTests from './mediatorTests/validate.spec';
import multiWorkspaceTests from './multiWorkspaceTests/multiWorkspace.spec';
import unitTestSuitTests from './unitTestSuite.spec';
import { page } from './Utils';
const fs = require('fs');
const path = require('path');
const videosFolder = path.join(__dirname, '..', 'test-resources', 'videos');

test.describe.configure({ mode: 'default' });

test.beforeAll(async () => {
    if (fs.existsSync(videosFolder)) {
        fs.rmSync(videosFolder, { recursive: true, force: true });
    }
    console.log('>>> Starting test suite');
});

test.describe(createProjectTests);
test.describe(artifactTests);
test.describe(multiWorkspaceTests);
test.describe(dataMapperTests);
test.describe(overviewPageTests);
test.describe(openEntryPointArtifact);
test.describe(connectionTests);
test.describe(connectorTests);
test.describe(inboundEpTests);
test.describe(logMediatorTests);
test.describe(cacheMediatorTests);
test.describe(throttleMediatorTests);
test.describe(callSequenceMediatorTests);
test.describe(validateMediatorTests);
test.describe(unitTestSuitTests);
test.describe(artifact430Tests);

test.afterAll(async () => {
    console.log(`>>> Finished test suite`);
    const dateTime = new Date().toISOString().replace(/:/g, '-');
    page.page.video()?.saveAs(path.join(videosFolder, `test_${dateTime}.webm`));
    await page.page?.close();
});
