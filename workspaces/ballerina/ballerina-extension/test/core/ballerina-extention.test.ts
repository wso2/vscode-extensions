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

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';
import * as fs from 'fs';
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import { extension } from '../../src/BalExtensionContext';
import { getBallerinaHome, getBallerinaVersion } from '../test-util';

// Ballerina tools distribution will be copied to following location by maven
const testBallerinaHome = getBallerinaHome();
const testBallerinaVersion = getBallerinaVersion();

// Defines a Mocha test suite to group tests of similar kind together
suite("Ballerina Extension Core Tests", function () {
    test("Test autoDetectBallerinaHome", function () {
        // Following should not throw an error all times.
        const { home } = extension.ballerinaExtInstance.autoDetectBallerinaHome();
        if (home) {
            assert.equal(fs.existsSync(home), true);
        }
    });

    test("Test getBallerinaVersion", function () {
        extension.ballerinaExtInstance.getBallerinaVersion(testBallerinaHome, true).then(detected => {
            const regex = /(s|S)wan( |-)(l|L)ake/g;
            if (detected.match(regex) && testBallerinaHome.match(regex)) {
                let detectedLowerCase = detected.toLowerCase();
                let balVersionLowerCase = testBallerinaVersion.toLowerCase();
                assert.equal(balVersionLowerCase.substring(balVersionLowerCase.indexOf('lake') + 4)
                    .replace(/( |-)/g, '').includes(detectedLowerCase.substring(detectedLowerCase.indexOf('lake') + 4)
                        .replace(/( |-)/g, '')), true);
            } else {
                assert.equal(detected, testBallerinaVersion);
            }
        });
    });
});
