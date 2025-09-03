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

import * as path from 'path';
import { generateBallerinaCode } from '../../../src/rpc-managers/ai-panel/utils';
import * as assert from 'assert';
import * as fs from 'fs';
import { cleanAndGetInlineParamDefinitions } from '../../../src/rpc-managers/ai-panel/inline-utils';

const RESOURCES_PATH = path.resolve(__dirname, '../../../../test/ai/datamapper/resources');

function getTestFolders(dirPath: string): string[] {
    return fs.readdirSync(dirPath)
        .filter((file) => fs.lstatSync(path.join(dirPath, file)).isDirectory());
}

suite.only("AI Datamapper Tests Suite", () => {
    setup(done => {
        done();
    });

    function runTests(basePath: string) {
        const testFolders = getTestFolders(basePath);

        testFolders.forEach((folder) => {
            const folderPath = path.join(basePath, folder);

            suite(`Group: ${folder}`, () => {
                const subFolders = getTestFolders(folderPath);

                if (subFolders.length > 0) {
                    // Recursively process subdirectories
                    runTests(folderPath);
                } else {
                    test(`Datamapper Test - ${folder}`, async () => {
                        const mappingFile = path.join(folderPath, 'mapping.json');
                        const paramDefFile = path.join(folderPath, 'param_def.json');
                        const inlineDefFile = path.join(folderPath, 'inline_def.json');
                        const expectedFile = path.join(folderPath, 'expected.json');

                        assert.ok(fs.existsSync(mappingFile), `Missing mapping.json in ${folder}`);
                        assert.ok(fs.existsSync(expectedFile), `Missing expected.json in ${folder}`);

                        const mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
                        const expected = JSON.parse(fs.readFileSync(expectedFile, 'utf8'));
                        if (fs.existsSync(inlineDefFile)) {
                            // Only inline definition file is present - run inline test
                            const inlineDef = JSON.parse(fs.readFileSync(inlineDefFile, 'utf8'));
                            let { parameterDefinitions } = await cleanAndGetInlineParamDefinitions(inlineDef);

                            // If param_def.json exists, assert that parameterDefinitions equals its content
                            if (fs.existsSync(paramDefFile)) {
                                const paramDef = JSON.parse(fs.readFileSync(paramDefFile, 'utf8'));
                                assert.deepStrictEqual(parameterDefinitions, paramDef,
                                    `parameterDefinitions from cleanAndGetInlineParamDefinitions should equal param_def.json content in ${folder}`);
                            }

                            const resp = await generateBallerinaCode(mapping, parameterDefinitions, "", []);
                            assert.deepStrictEqual(resp, expected);
                        } else if (fs.existsSync(paramDefFile)) {
                            // Only param definition file is present - run reusable test
                            const paramDef = JSON.parse(fs.readFileSync(paramDefFile, 'utf8'));
                            const resp = await generateBallerinaCode(mapping, paramDef, "", []);
                            assert.deepStrictEqual(resp, expected);
                        } else {
                            assert.fail(`Neither inline_def.json nor param_def.json found in ${folder}`);
                        }
                    });
                }
            });
        });
    }
    runTests(RESOURCES_PATH);
});
