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
import { page, extensionsFolder, newProjectPath } from './utils/helpers';
import { downloadExtensionFromMarketplace } from '@wso2/playwright-vscode-tester';
const fs = require('fs');
const path = require('path');
const videosFolder = path.join(__dirname, '..', 'test-resources', 'videos');

import automation from './automation/automation.spec';
import automationRun from './automation-run/automation-run.spec';
import automationDebug from './automation-debug/automation-debug.spec';
import expressionEditor from './expression-editor/expression-editor.spec';

import httpService from './api-integration/http-service.spec';
import aiChatService from './api-integration/ai-chat-service.spec';
import graphqlService from './api-integration/graphql-service.spec';
import tcpService from './api-integration/tcp-service.spec';

import kafkaIntegration from './event-integration/kafka.spec';
import rabbitmqIntegration from './event-integration/rabbitmq.spec';
import mqttIntegration from './event-integration/mqtt.spec';
import azureIntegration from './event-integration/azure.spec';
import salesforceIntegration from './event-integration/salesforce.spec';
import twillioIntegration from './event-integration/twillio.spec';
import githubIntegration from './event-integration/github.spec';

import ftpIntegration from './file-integration/ftp.spec';
import directoryIntegration from './file-integration/directory.spec';

import functionArtifact from './other-artifacts/function.spec';
import naturalFunctionArtifact from './other-artifacts/np.spec';
import connectionArtifact from './other-artifacts/connection.spec';

import configuration from './configuration/configuration.spec';
import typeTest from './type-editor/type.spec';
import serviceTest from './service-designer/service-class.spec';

import importIntegration from './import-integration/import-integration.spec';

import reusableDataMapper from './data-mapper/reusable-data-mapper.spec';
import inlineDataMapper from './data-mapper/inline-data-mapper.spec';

import diagram from './diagram/diagram.spec';

import testFunction from './test-function/test-function.spec';

test.describe.configure({ mode: 'default' });

test.beforeAll(async () => {
    if (fs.existsSync(videosFolder)) {
        fs.rmSync(videosFolder, { recursive: true, force: true });
    }
    console.log('\n' + '='.repeat(80));
    console.log('🚀 STARTING BI EXTENSION E2E TEST SUITE');
    console.log('='.repeat(80) + '\n');

    // Download VSIX if flag is set
    if (process.env.DOWNLOAD_PRERELEASE === 'true') {
        console.log('📦 Downloading BI prerelease VSIXs ...');
        try {
            await downloadExtensionFromMarketplace('wso2.ballerina@prerelease', extensionsFolder);
            await downloadExtensionFromMarketplace('wso2.ballerina-integrator@prerelease', extensionsFolder);
            console.log('✅ BI prerelease VSIXs are ready!');
        } catch (error) {
            console.error('❌ Failed to download BI prerelease VSIXs:', error);
            throw error;
        }
    }
});

// <----Automation Test---->
test.describe(automation);

// // <----Automation Run/Debug Test---->
test.describe(automationRun);
test.describe(automationDebug);

// // <----Expression Editor Test---->
test.describe(expressionEditor);

// // <----AI Chat Service Test---->
test.describe(aiChatService);

// // <----Integration as API Test---->
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
test.describe(connectionArtifact);
test.describe(configuration); // TODO: This tests is failing due to https://github.com/wso2/product-ballerina-integrator/issues/1231. Enable after fixing the issue.
test.describe(typeTest); // TODO: This tests is failing due to https://github.com/wso2/product-ballerina-integrator/issues/1222. Enable after fixing the issue.
test.describe(serviceTest);

// <----Import Integration Test---->
test.describe.skip(importIntegration);

// <----Data Mapper Test---->
test.describe(reusableDataMapper);
test.describe(inlineDataMapper);

// <----Diagram Test---->
test.describe(diagram);

// <----Test Function Test---->
test.describe(testFunction);

test.afterAll(async () => {
    console.log('\n' + '='.repeat(80));
    console.log('✅ BI EXTENSION E2E TEST SUITE COMPLETED');
    console.log('='.repeat(80));

    const dateTime = new Date().toISOString().replace(/:/g, '-');
    console.log('💾 Saving test video...');
    await page.page?.close();
    page.page.video()?.saveAs(path.join(videosFolder, `test_${dateTime}.webm`));
    console.log('✅ Video saved successfully');

    // Clean up the test project directory
    console.log('🧹 Cleaning up test project...');
    if (fs.existsSync(newProjectPath)) {
        try {
            fs.rmSync(newProjectPath, { recursive: true, force: true });
            console.log('✅ Test project cleaned up successfully\n');
        } catch (error) {
            console.error('❌ Failed to clean up test project:', error);
            console.log('⚠️  Test project cleanup failed, but continuing...\n');
        }
    } else {
        console.log('ℹ️  Test project directory does not exist, skipping cleanup\n');
    }
});
