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
import { initTest, page } from '../Utils';
import path from 'path';
import { Registry } from '../components/ArtifactTest/Registry';

export default function createTests() {
  test.describe('4.3.0 Project Tests', {
    tag: '@group3',
  }, async () => {
    initTest(true, false, true, 'testProject430', '4.3.0', 'group3');

    test('Registry Tests from 4.3.0 runtime', async () => {
      const testAttempt = test.info().retry + 1;
      await test.step('Create new registry from artifacts', async () => {
        console.log('Creating new registry from artifacts');
        const registry = new Registry(page.page);
        await registry.openFormFromArtifacts();
        await registry.addFromTemplate({
          name: 'testRegistry11',
          templateType: 'JSON File',
          registryType: 'gov',
          registryPath: 'json',
        });
      });

      await test.step('Create new registry importing a file', async () => {
        console.log('Create new registry importing a file');
        const registry = new Registry(page.page);
        await registry.openFormFromArtifacts();
        console.log('Initialized registry form');
        
        // Build file path with proper cross-platform compatibility
        const fileName = `testRegistry11.json`;
        const filePath = path.resolve(__dirname, '..', 'data', 'new-project', 'testProjectFolder', 'testProject430', 'src', 'main', 'wso2mi', 'resources', 'registry', 'gov', 'json', fileName);
        console.log('Importing file from path: ' + filePath);
        console.log('File path length:', filePath.length);
        
        // Verify file exists before attempting to use it
        const fs = require('fs');
        if (!fs.existsSync(filePath)) {
          console.error('File does not exist at path:', filePath);
          throw new Error(`Test file not found: ${filePath}`);
        }
        
        await registry.addFromFileSystem({
          filePath: filePath,
          registryType: 'conf',
          registryPath: 'newJson'
        })
      });
    });
  });
}
