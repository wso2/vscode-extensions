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
import dataMapperArtifact from './other-artifacts/data-mapper.spec';
import typeDiagramArtifact from './other-artifacts/type.spec';
import connectionArtifact from './other-artifacts/connection.spec';

import configuration from './configuration/configuration.spec';
import typeTest from './type/type.spec';

test.describe.configure({ mode: 'default' });

test.beforeAll(async () => {
    if (fs.existsSync(videosFolder)) {
        fs.rmSync(videosFolder, { recursive: true, force: true });
    }
    console.log('>>> Starting test suite');
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
test.describe(naturalFunctionArtifact);
test.describe(dataMapperArtifact); // TODO: Fix this test
test.describe(typeDiagramArtifact); // TODO: Fix this test
test.describe(connectionArtifact);
test.describe(configuration); // TODO: Fix this test
test.describe(typeTest);

test.afterAll(async () => {
    console.log(`>>> Finished test suite`);
    const dateTime = new Date().toISOString().replace(/:/g, '-');
    console.log('>>> Saving video');
    await page.page?.close();
    page.page.video()?.saveAs(path.join(videosFolder, `test_${dateTime}.webm`));
    console.log('>>> Video saved');
});
