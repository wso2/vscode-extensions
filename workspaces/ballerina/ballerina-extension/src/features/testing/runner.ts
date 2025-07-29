'use strict';
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

/**
 * Test explorer run and debug related funtions.
 */

import { log } from "console";
import fileUriToPath from "file-uri-to-path";
import { ballerinaExtInstance, LANGUAGE } from "../../core";
import { constructDebugConfig } from "../debugger";
import { Uri, WorkspaceFolder, workspace, DebugConfiguration, debug, window, CancellationToken, TestItem, TestMessage, TestRunProfileKind, TestRunRequest } from "vscode";
import child_process from 'child_process';

const fs = require('fs');
import path from 'path';
import { BALLERINA_COMMANDS } from "../project";
import { discoverTests, gatherTestItems } from "./discover";
import { testController, projectRoot } from "./activator";

enum EXEC_ARG {
    TESTS = '--tests',
    COVERAGE = '--code-coverage'
}
enum TEST_STATUS {
    PASSED = 'PASSED',
    FAILED = 'FAILURE'
}
const TEST_RESULTS_PATH = path.join("target", "report", "test_results.json").toString();

// run tests.
export function runHandler(request: TestRunRequest, cancellation: CancellationToken) {
    const queue: { test: TestItem; data: any; }[] = [];
    const run = testController.createTestRun(request);

    discoverTests(request, request.include ?? gatherTestItems(testController.items), queue).then(runTestQueue);

    async function runTestQueue() {
        if (!projectRoot) {
            run.end();
            return;
        }

        const startTime = Date.now();
        run.appendOutput(`Running Tests\r\n`);

        if (request.profile?.kind == TestRunProfileKind.Run) {
            let testNames = "";
            // mark tests as running in test explorer
            for (const { test, } of queue) {
                testNames = testNames == "" ? test.label : `${testNames},${test.label}`;
                run.started(test);
            }
            let testsJson: JSON | undefined = undefined;
            try {
                // execute test
                const executor = ballerinaExtInstance.getBallerinaCmd();
                const commandText = `${executor} ${BALLERINA_COMMANDS.TEST} ${EXEC_ARG.TESTS} ${testNames} ${EXEC_ARG.COVERAGE}`;
                await runCommand(commandText, projectRoot);

            } catch {
                // exception.
            } finally {
                const EndTime = Date.now();
                const timeElapsed = (EndTime - startTime) / queue.length;

                // reading test results
                testsJson = await readTestJson(path.join(projectRoot!, TEST_RESULTS_PATH).toString());
                if (!testsJson) {
                    for (const { test, } of queue) {
                        const testMessage: TestMessage = new TestMessage("Command failed");
                        run.failed(test, testMessage, timeElapsed);
                    }
                    return;
                }

                const moduleStatus = testsJson["moduleStatus"];

                for (const { test, } of queue) {
                    let found = false;
                    for (const status of moduleStatus) {
                        const testResults = status["tests"];
                        for (const testResult of testResults) {
                            if (testResult.name !== test.label && !testResult.name.startsWith(`${test.label}#`)) {
                                continue;
                            }

                            if (testResult.status === TEST_STATUS.PASSED) {
                                run.passed(test, timeElapsed);
                                found = true;
                            } else if (testResult.status === TEST_STATUS.FAILED) {
                                // test failed
                                const testMessage: TestMessage = new TestMessage(testResult.failureMessage);
                                run.failed(test, testMessage, timeElapsed);
                                found = true;
                            }
                        }
                        if (found) {
                            break;
                        }
                    }
                    if (found) {
                        continue;
                    }
                    // test failed
                    const testMessage: TestMessage = new TestMessage("");
                    run.failed(test, testMessage, timeElapsed);
                }
            }
        } else if (request.profile?.kind == TestRunProfileKind.Debug) {
            const tests = queue.map(t => t.test.label);
            await startDebugging(Uri.parse(projectRoot), true, tests);
        }
        run.appendOutput(`Tests Completed\r\n`);

        run.end();
    }
}
/**
 * Run terminal command.
 * @param command Command to run.
 * @param pathToRun Path to execute the command.
 * @param returnData Indicates whether to return the stdout
 */
export async function runCommand(command, pathToRun: string | undefined, returnData = false) {
    return new Promise<string>(function (resolve, reject) {
        if (pathToRun == undefined) {
            return;
        } else if (pathToRun.endsWith(".bal")) {
            const lastIndex = pathToRun.lastIndexOf(path.sep);
            pathToRun = pathToRun.slice(0, lastIndex);
        }
        child_process.exec(`${command}`, { cwd: pathToRun }, async (err, stdout, stderr) => {
            if (err) {
                log(`error: ${err}`);
                window.showInformationMessage(
                    err.message
                );
                reject(err);
            } else {
                if (returnData) {
                    resolve(stdout);
                } else {
                    resolve("OK");
                }
            }
        });
    });
}

/** 
 * Read test json output.
 * @param file File path of the json.
 */
export async function readTestJson(file): Promise<JSON | undefined> {
    try {
        let rawdata = fs.readFileSync(file);
        return JSON.parse(rawdata);
    } catch {
        return undefined;
    }
}

/**
 * Start debugging
 */
export async function startDebugging(uri: Uri, testDebug: boolean, args: any[])
    : Promise<void> {
    const workspaceFolder: WorkspaceFolder | undefined = workspace.getWorkspaceFolder(uri);
    const debugConfig: DebugConfiguration = await constructDebugConfig(uri, testDebug, args);

    return debug.startDebugging(workspaceFolder, debugConfig).then(
        // Wait for debug session to be complete.
        () => {
            return new Promise<void>((resolve) => {
                debug.onDidTerminateDebugSession(() => {
                    resolve();
                });
            });
        },
        (ex) => log('Failed to start debugging tests' + ex),
    );
}
