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

import automation from './automation/automation.spec';

import httpService from './api-services/http-service.spec';
import aiChatService from './api-services/ai-chat-service.spec';
import graphqlService from './api-services/graphql-service.spec';
import tcpService from './api-services/tcp-service.spec';

import kafkaIntegration from './event-integrations/kafka.spec';
import rabbitmqIntegration from './event-integrations/rabbitmq.spec';
import mqttIntegration from './event-integrations/mqtt.spec';
import azureIntegration from './event-integrations/azure.spec';
import salesforceIntegration from './event-integrations/salesforce.spec';
import twillioIntegration from './event-integrations/twillio.spec';
import githubIntegration from './event-integrations/github.spec';

import ftpIntegration from './file-integrations/ftp.spec';
import directoryIntegration from './file-integrations/directory.spec';

import functionArtifact from './other-artifacts/function.spec';
import naturalFunctionArtifact from './other-artifacts/np.spec';
import typeDiagramArtifact from './other-artifacts/type.spec';
import connectionArtifact from './other-artifacts/connection.spec';

import configuration from './configuration/configuration.spec';
import typeTest from './type/type.spec';
import serviceTest from './service-class-designer/service-class.spec';

import importIntegration from './import-integration/import-integration.spec';

import reusableDataMapper from './data-mapper/reusable-data-mapper.spec';
import inlineDataMapper from './data-mapper/inline-data-mapper.spec';

test.describe.configure({ mode: 'default' });

test.beforeAll(async () => {
    if (fs.existsSync(videosFolder)) {
        fs.rmSync(videosFolder, { recursive: true, force: true });
    }
    console.log('\n' + '='.repeat(80));
    console.log('🚀 STARTING BI EXTENSION E2E TEST SUITE');
    console.log('='.repeat(80) + '\n');
});

// <----Automation Test---->
test.describe(automation);

// <----AI Chat Service Test---->
test.describe(aiChatService);

// <----Integration as API Test---->
test.describe(httpService);
test.describe(graphqlService);
test.describe(tcpService);

// <----Event Integration Test---->
test.describe(kafkaIntegration);
test.describe(rabbitmqIntegration);
test.describe(mqttIntegration);
test.describe(azureIntegration);
test.describe(salesforceIntegration);
test.describe(twillioIntegration);
test.describe(githubIntegration);

// <----File Integration Test---->
test.describe(ftpIntegration);
test.describe(directoryIntegration);

// <----Other Artifacts Test---->
test.describe(functionArtifact);
// test.describe(naturalFunctionArtifact); // TODO: Enable this once the ballerina version is switchable
// test.describe(dataMapperArtifact); // TODO: Enable this later once tests are improved
test.describe(typeDiagramArtifact);
test.describe(connectionArtifact);
test.describe(configuration); // TODO: This tests is failing due to https://github.com/wso2/product-ballerina-integrator/issues/1231. Enable after fixing the issue.
test.describe(typeTest); // TODO: This tests is failing due to https://github.com/wso2/product-ballerina-integrator/issues/1222. Enable after fixing the issue.
test.describe(serviceTest);

// <----Import Integration Test---->
test.describe(importIntegration);

// <----Data Mapper Test---->
test.describe(reusableDataMapper);
test.describe(inlineDataMapper);

test.afterAll(async () => {
    console.log('\n' + '='.repeat(80));
    console.log('✅ BI EXTENSION E2E TEST SUITE COMPLETED');
    console.log('='.repeat(80));

    const dateTime = new Date().toISOString().replace(/:/g, '-');
    console.log('💾 Saving test video...');
    await page.page?.close();
    page.page.video()?.saveAs(path.join(videosFolder, `test_${dateTime}.webm`));
    console.log('✅ Video saved successfully\n');
});
