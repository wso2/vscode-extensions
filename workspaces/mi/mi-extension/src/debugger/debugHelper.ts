
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

import * as vscode from 'vscode';
import * as childprocess from 'child_process';
import { COMMANDS, MVN_COMMANDS } from '../constants';
import { loadEnvVariables, getBuildCommand, getRunCommand, getStopCommand } from './tasks';
import * as fs from 'fs';
import * as path from 'path';
import { SELECTED_SERVER_PATH, INCORRECT_SERVER_PATH_MSG } from './constants';
import { reject } from 'lodash';
import axios from 'axios';
import * as net from 'net';
import { MACHINE_VIEW } from '@wso2/mi-core';
import { getStateMachine } from '../stateMachine';
import { logDebug, LogLevel } from '../util/logger';
import * as toml from "@iarna/toml";
import { DebuggerConfig } from './config';
import { ChildProcess } from 'child_process';
import treeKill = require('tree-kill');
import { serverLog, showServerOutputChannel } from '../util/serverLogger';
import { getJavaHomeFromConfig, getServerPathFromConfig } from '../util/onboardingUtils';
import * as crypto from 'crypto';
import { Uri, workspace } from "vscode";
import { MILanguageClient } from '../lang-client/activator';
import { getBuildOrder } from './pomResolver';

const child_process = require('child_process');
const findProcess = require('find-process');
export async function isPortActivelyListening(port: number, timeout: number): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        const startTime = Date.now();

        const checkPort = () => {
            if (Date.now() - startTime >= timeout) {
                resolve(false); // Timeout reached
            } else {
                if (process.platform === 'win32') {
                    const command = `netstat -an | findstr "LISTENING" | findstr ":${port}"`;
                    childprocess.exec(command, (error, stdout, stderr) => {
                        if (!error && stdout.trim() !== '') {
                            resolve(true);
                        } else {
                            setTimeout(checkPort, 1000);
                        }
                    });
                } else {
                    const command = `lsof -i :${port}`;
                    childprocess.exec(command, (error, stdout, stderr) => {
                        if (!error && stdout.trim() !== '') {
                            resolve(true);
                        } else {
                            setTimeout(checkPort, 1000);
                        }
                    });
                }
            }
        };

        checkPort();
    });
}

function checkServerLiveness(): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = new net.Socket();

        socket.on('connect', () => {
            socket.destroy(); // Close the connection
            resolve(true); // Port is up
        });

        socket.on('error', () => {
            socket.destroy();
            resolve(false); // Port is not up
        });
        socket.connect(DebuggerConfig.getServerPort(), DebuggerConfig.getHost());
    });
}

export function checkServerReadiness(projectUri: string): Promise<void> {
    const startTime = Date.now();
    const config = workspace.getConfiguration('MI', Uri.file(projectUri));
    const configuredTimeout = config.get("serverTimeoutInSecs");
    const maxTimeout = (Number.isFinite(Number(configuredTimeout)) && Number(configuredTimeout) > 0) ? Number(configuredTimeout) * 1000 : 120000;
    const retryInterval = 2000;

    return new Promise((resolve, reject) => {
        const checkReadiness = () => {
            const readinessEndpoint = `http://${DebuggerConfig.getHost()}:${DebuggerConfig.getServerReadinessPort()}/healthz`;
            axios.get(readinessEndpoint)
                .then((response: { status: number; data: any; }) => {
                    if (response.status === 200) {
                        if (response.data.status === 'ready') {
                            logDebug('Server is ready with CApp deployed', LogLevel.INFO);
                            resolve();
                        } else {
                            reject(response.data.status);
                        }

                    } else {
                        const elapsedTime = Date.now() - startTime;
                        if (elapsedTime < maxTimeout) {
                            setTimeout(checkReadiness, retryInterval);
                        } else {
                            logDebug('Timeout reached while checking server readiness', LogLevel.ERROR);
                            reject('CApp has encountered deployment issues. Please refer to the output for error logs.');
                        }
                    }
                })
                .catch((error) => {
                    const elapsedTime = Date.now() - startTime;
                    if (elapsedTime < maxTimeout) {
                        setTimeout(checkReadiness, retryInterval);
                    } else {
                        const errorMsg = error?.errors[0]?.message;
                        logDebug(`Error while checking for Server readiness: ${errorMsg}`, LogLevel.ERROR);
                        reject(`CApp has encountered deployment issues. Please refer to the output for error logs.`);
                    }
                });
        };
        checkReadiness();
    });
}

export async function executeCopyTask(task: vscode.Task) {
    return new Promise<void>(async resolve => {
        await vscode.tasks.executeTask(task);
        let disposable = vscode.tasks.onDidEndTaskProcess(async e => {
            if (e.execution.task.name === 'copy') {
                disposable.dispose();
                if (e.exitCode === 0) {
                    resolve();
                } else {
                    reject(`Task '${task.name}' failed.`);
                }
            }
        });
    });
}

export async function executeBuildTask(projectUri: string, serverPath: string, shouldCopyTarget: boolean = true, postBuildTask?: Function) {
    if (shouldCopyTarget) {
        const isEqual = await compareFilesByMD5(path.join(serverPath, "conf", "deployment.toml"),
            path.join(projectUri, "deployment", "deployment.toml"));
        if (!isEqual) {
            const copyConf = await vscode.window.showWarningMessage(
                'Deployment configurations in the runtime is different from the project. How do you want to proceed?',
                { modal: true },
                "Use Project Configurations", "Use Server Configurations"
            );
            if (copyConf === 'Use Project Configurations') {
                fs.copyFileSync(path.join(serverPath, "conf", "deployment.toml"), path.join(serverPath, "conf", "deployment-backup.toml"));
                fs.copyFileSync(path.join(projectUri, "deployment", "deployment.toml"), path.join(serverPath, "conf", "deployment.toml"));
                vscode.window.showInformationMessage("A backup of the server configuration is stored at conf/deployment-backup.toml.");
            } else if (copyConf === 'Use Server Configurations') {
                fs.copyFileSync(path.join(serverPath, "conf", "deployment.toml"), path.join(projectUri, "deployment", "deployment.toml"));
                DebuggerConfig.setConfigPortOffset(projectUri);
            } else {
                throw new Error('Deployment configurations in the project should be the same as the runtime.');
            }
        }
    } else {
        DebuggerConfig.setProjectList([projectUri]);
    }

    if (DebuggerConfig.getProjectList().length > 0) {
        const orderedProjectList = DebuggerConfig.getProjectList().length > 1 ? 
                await getBuildOrder(DebuggerConfig.getProjectList()) : DebuggerConfig.getProjectList();
        for (const project of orderedProjectList) {
            await new Promise<void>(async (resolve, reject) => {
                const buildCommand = getBuildCommand(project);
                const envVariables = {
                    ...process.env,
                    ...setJavaHomeInEnvironmentAndPath(project)
                };

                const buildProcess = await child_process.spawn(
                    buildCommand,
                    [],
                    { shell: true, cwd: project, env: envVariables }
                );
                showServerOutputChannel();

                buildProcess.stdout.on('data', (data) => {
                    serverLog(data.toString('utf8'));
                });

                if (shouldCopyTarget) {
                    buildProcess.on('close', async (code) => {
                        if (code === 0) {
                            vscode.window.showInformationMessage(`${path.basename(project)} build was successful`);
                        } else {
                            vscode.window.showErrorMessage(`${path.basename(project)} build failed`);
                        }
                    });
                }

                buildProcess.stderr.on('data', (data) => {
                    serverLog(`Build error:\n${data.toString('utf8')}`);
                });

                if (shouldCopyTarget) {

                    buildProcess.on('exit', async (code) => {
                        if (shouldCopyTarget && code === 0) {
                            if (!fs.existsSync(serverPath)) {
                                reject(INCORRECT_SERVER_PATH_MSG);
                                return;
                            }
                            // Check if the target directory exists in the workspace
                            const workspaceFolders = vscode.workspace.workspaceFolders;
                            if (workspaceFolders && workspaceFolders.length > 0) {
                                // copy all the jars present in deployement/libs
                                const workspaceLibs = vscode.Uri.joinPath(vscode.Uri.file(project), "deployment", "libs");
                                if (fs.existsSync(workspaceLibs.fsPath)) {
                                    try {
                                        const jars = await getDeploymentLibJars(workspaceLibs);
                                        if (jars.length > 0) {
                                            const targetLibs = path.join(serverPath, 'lib');
                                            jars.forEach(jar => {
                                                const destinationJar = path.join(targetLibs, path.basename(jar.fsPath));
                                                fs.copyFileSync(jar.fsPath, destinationJar);
                                                DebuggerConfig.setCopiedLibs(destinationJar);
                                            });
                                        }
                                    } catch (err) {
                                        reject(err);
                                        return;
                                    }
                                }
                                const targetDirectory = vscode.Uri.joinPath(vscode.Uri.file(project), "target");
                                if (fs.existsSync(targetDirectory.fsPath)) {
                                    try {
                                        const sourceFiles = await getCarFiles(targetDirectory);
                                        if (sourceFiles.length === 0) {
                                            const errorMessage = "No .car files were found in the target directory. Built without copying to the server's carbonapps directory.";
                                            logDebug(errorMessage, LogLevel.ERROR);
                                            reject(errorMessage);
                                        } else {
                                            const targetPath = path.join(serverPath, 'repository', 'deployment', 'server', 'carbonapps');
                                            sourceFiles.forEach(sourceFile => {
                                                const destinationFile = path.join(targetPath, path.basename(sourceFile.fsPath));
                                                fs.copyFileSync(sourceFile.fsPath, destinationFile);
                                                DebuggerConfig.setCopiedCapp(destinationFile);
                                            });
                                            logDebug('Build and copy tasks executed successfully', LogLevel.INFO);
                                            resolve();
                                        }
                                    } catch (err) {
                                        reject(err);
                                    }
                                } else {
                                    reject(`Target directory not found for project ${path.basename(project)}`);
                                }
                            }
                        } else {
                            reject(`Build process failed`);
                        }
                    });
                } else {
                    buildProcess.on('exit', async (code) => {
                        if (code === 0) {
                            resolve();
                        } else {
                            reject(`Build process failed`);
                        }
                    });
                }
            });
        }
        if (postBuildTask) {
            postBuildTask();
        }
    }
}

export async function executeRemoteDeployTask(projectUri: string, postBuildTask?: Function) {
    return new Promise<void>(async (resolve, reject) => {

        const config = workspace.getConfiguration('MI', Uri.file(projectUri));
        const mvnCmd = config.get("useLocalMaven") ? "mvn" : (process.platform === "win32" ?
            MVN_COMMANDS.MVN_WRAPPER_WIN_COMMAND : MVN_COMMANDS.MVN_WRAPPER_COMMAND);
        const buildCommand = mvnCmd + MVN_COMMANDS.DEPLOY_COMMAND;
        const envVariables = {
            ...process.env,
            ...setJavaHomeInEnvironmentAndPath(projectUri)
        };
        const buildProcess = await child_process.spawn(buildCommand, [], { shell: true, cwd: projectUri, env: envVariables });
        showServerOutputChannel();

        buildProcess.stdout.on('data', (data) => {
            serverLog(data.toString('utf8'));
        });

        buildProcess.stderr.on('data', (data) => {
            serverLog(`Build error:\n${data.toString('utf8')}`);
        });

        if (postBuildTask) {
            buildProcess.on('exit', async (code) => {
                if (code === 0) {
                    postBuildTask();
                    resolve();
                } else {
                    reject(`Build process failed`);
                }
            });
        }
    });
}

async function getCarFiles(targetDirectory) {
    const carFiles = await vscode.workspace.findFiles(
        new vscode.RelativePattern(targetDirectory.fsPath, '*.car')
    );
    return carFiles;
}

let serverProcess: ChildProcess;
const debugConsole = vscode.debug.activeDebugConsole;

// Start the server
export async function startServer(projectUri: string, serverPath: string, isDebug: boolean): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
        const filePath = path.resolve(projectUri, '.env');
        if (fs.existsSync(filePath)) {
            loadEnvVariables(filePath)
        }
        const runCommand = await getRunCommand(serverPath, isDebug);
        if (runCommand === undefined) {
            reject('Error getting run command');
        } else {
            const definedEnvVariables = DebuggerConfig.getEnvVariables();
            const vmArgs = DebuggerConfig.getVmArgs();
            const envVariables = {
                ...process.env,
                ...setJavaHomeInEnvironmentAndPath(projectUri),
                ...definedEnvVariables
            };

            serverProcess = child_process.spawn(`${runCommand}`, vmArgs, { shell: true, env: envVariables });
            showServerOutputChannel();

            if (serverProcess.stdout) {
                serverProcess.stdout.on('data', (data) => {
                    serverLog(data.toString());
                });
            }

            if (serverProcess.stderr) {
                serverProcess.stderr.on('data', (data) => {
                    serverLog(data.toString());
                    reject(data.toString());
                });
            }

            serverProcess.on('error', (error) => {
                serverLog(error.message);
                reject(error);
            });

            resolve();
        }
    });
}

// Stop the server
export async function stopServer(projectUri: string, serverPath: string, isWindows?: boolean): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        if (serverProcess) {
            const stopCommand = getStopCommand(serverPath);

            if (stopCommand === undefined) {
                reject(INCORRECT_SERVER_PATH_MSG);
            } else {
                const env = setJavaHomeInEnvironmentAndPath(projectUri);
                const stopProcess = child_process.spawn(`${stopCommand}`, [], { shell: true, env });
                showServerOutputChannel();

                let killTimeout = setTimeout(() => {
                    if (serverProcess) {
                        treeKill(serverProcess.pid!, 'SIGKILL');
                        serverLog('Server did not exit gracefully in time, therefore the process was forcefully killed.');
                    }
                }, 8000); // 8 seconds timeout to see if the server stops gracefully

                serverProcess.on('exit', (code) => {
                    clearTimeout(killTimeout); // Clear the timeout if the process exits in time

                    if (code !== 0 && code !== null) {
                        reject(`Server process exited with code ${code}`);
                    } else {
                        resolve();
                    }
                });

                stopProcess.on('error', (error) => {
                    serverLog(error.message);
                    if (serverProcess) {
                        treeKill(serverProcess.pid!, 'SIGKILL');
                    }
                    reject(error);
                });

                if (stopProcess.stdout) {
                    stopProcess.stdout.on('data', (data) => {
                        serverLog(data.toString());
                    });
                }

                if (stopProcess.stderr) {
                    stopProcess.stderr.on('data', (data) => {
                        serverLog(data.toString());
                        if (serverProcess) {
                            treeKill(serverProcess.pid!, 'SIGKILL');
                        }
                    });
                }
            }
        } else {
            resolve();
        }
    });
}

export async function executeTasks(projectUri: string, serverPath: string, isDebug: boolean): Promise<void> {
    const config = workspace.getConfiguration('MI', Uri.file(projectUri));
    const configuredTimeout = config.get("serverTimeoutInSecs");
    const maxTimeout = (Number.isFinite(Number(configuredTimeout)) && Number(configuredTimeout) > 0) ? Number(configuredTimeout) * 1000 : 120000;
    return new Promise<void>(async (resolve, reject) => {
        const langClient = await MILanguageClient.getInstance(projectUri);
        const isTerminated = await langClient.shutdownTryoutServer();
        if (!isTerminated) {
            reject('Failed to terminate the tryout server. Kill the server manually and try again.');
        }
        executeBuildTask(projectUri, serverPath).then(async () => {
            const isServerRunning = await checkServerLiveness();
            if (!isServerRunning) {
                startServerWithPortCheck(resolve, reject);
            } else {
                // Server could be running in the background without debug mode, but we need to rerun to support this mode
                if (isDebug) {
                    isPortActivelyListening(DebuggerConfig.getCommandPort(), maxTimeout).then((isListening) => {
                        if (isListening) {
                            resolve();
                            // Proceed with connecting to the port
                        } else {
                            logDebug('Server is running, but the debugger command port not acitve', LogLevel.ERROR);
                            reject(`Server command port isn't actively listening. Stop any running MI servers and restart the debugger.`);
                        }
                    });
                } else {
                    const stopServer = await vscode.window.showWarningMessage('A server is already running. Do you wish to stop the running server?',
                        { modal: true },
                        'Yes', 'No');
                    if (stopServer === 'Yes') {
                        await killProcessByPort(DebuggerConfig.getServerPort());
                        startServerWithPortCheck(resolve, reject);
                    } else {
                        resolve();
                    }
                }
            }
        }).catch((error) => {
            reject(error);
            logDebug(`Error executing BuildTask: ${error}`, LogLevel.ERROR);
        });
    });

    function startServerWithPortCheck(resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void) {
        startServer(projectUri, serverPath, isDebug).then(() => {
            if (isDebug) {
                // check if server command port is active
                isPortActivelyListening(DebuggerConfig.getCommandPort(), maxTimeout).then((isListening) => {
                    if (isListening) {
                        resolve();
                        // Proceed with connecting to the port
                    } else {
                        logDebug(`The ${DebuggerConfig.getCommandPort()} port is not actively listening or the timeout has been reached.`, LogLevel.ERROR);
                        reject(`Server command port isn't actively listening. Stop any running MI servers and restart the debugger.`);
                    }
                });
            } else {
                resolve();
            }
        }).catch((error) => {
            reject(error);
        });
    }
}

export async function getServerPath(projectUri: string): Promise<string | undefined> {
    const config = vscode.workspace.getConfiguration('MI', vscode.Uri.file(projectUri));
    const currentPath = getServerPathFromConfig(projectUri);
    if (!currentPath) {
        await vscode.commands.executeCommand(COMMANDS.CHANGE_SERVER_PATH);
        const updatedPath = config.get(SELECTED_SERVER_PATH) as string;
        if (updatedPath) {
            return path.normalize(updatedPath);
        }
        return updatedPath;
    }
    return path.normalize(currentPath);
}
export function setJavaHomeInEnvironmentAndPath(projectUri: string): { [key: string]: string; } {
    const config = vscode.workspace.getConfiguration('MI', vscode.Uri.file(projectUri));
    const javaHome = getJavaHomeFromConfig(projectUri);
    const env = { ...process.env };
    if (javaHome) {
        env['JAVA_HOME'] = javaHome;
    }
    const sanitizedEnv: { [key: string]: string } = {};

    for (const key in env) {
        if (env[key] !== undefined) {
            sanitizedEnv[key] = env[key] as string;
        }
    }
    return sanitizedEnv;
}

export async function deleteCapp(serverPath: string): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
        const targetPath = path.join(serverPath, 'repository', 'deployment', 'server', 'carbonapps');

        try {
            if (!fs.existsSync(targetPath)) {
                reject(INCORRECT_SERVER_PATH_MSG);
            } else {
                const files = await fs.promises.readdir(targetPath);

                for (const file of files) {
                    if (file.endsWith('.car')) {
                        const filePath = path.join(targetPath, file);
                        await fs.promises.unlink(filePath);
                    }
                }
                resolve();
            }
        } catch (err) {
            logDebug(`Error deleting Capp: ${err}`, LogLevel.ERROR);
            reject(err);
        }
    });
}

export async function deleteCopiedCapAndLibs() {
    try {
        const copiedCapp = DebuggerConfig.getCopiedCapp();
        const copiedLibs = DebuggerConfig.getCopiedLibs();

        await deleteSpecificFiles(copiedCapp);
        await deleteSpecificFiles(copiedLibs);

    } catch (err) {
        logDebug(`Failed to delete Capp and Libs: ${err}`, LogLevel.ERROR);
        throw err;
    }
}

export async function deleteSpecificFiles(filesToDelete: string[]): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
        try {
            for (const fileUri of filesToDelete) {
                if (await fs.promises.stat(fileUri).catch(() => false)) {
                    await fs.promises.unlink(fileUri);
                }
            }
            resolve();
        } catch (err) {
            logDebug(`Error deleting files: ${err}`, LogLevel.ERROR);
            reject(err);
        }
    });
}

async function getDeploymentLibJars(libDirectory) {
    const jars = await vscode.workspace.findFiles(
        new vscode.RelativePattern(libDirectory.fsPath, '*.jar')
    );
    return jars;
}

// Check and return if the current visible view is one of the diagram view which can hit a breakpoint event
export function isADiagramView(projectUri: string): boolean {
    const stateContext = getStateMachine(projectUri).context();
    const diagramViews = [MACHINE_VIEW.ResourceView, MACHINE_VIEW.ProxyView, MACHINE_VIEW.SequenceView, MACHINE_VIEW.SequenceTemplateView];
    return diagramViews.indexOf(stateContext.view!) !== -1;
}

// This functionality is a workaround to enable debugging in Windows platform.
// The micro-integrator.bat is not supported to read java variables appended by the user in the MI 4.2.0 version.
// As a workaround, MI team requested that we create a temporary batch file with the required java variables and run the server.
let tempWindowsDebug;
export function createTempDebugBatchFile(batchFilePath: string, binPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const destFilePath = path.join(binPath, 'micro-integrator-debug.bat');
        fs.copyFileSync(batchFilePath, destFilePath);
        tempWindowsDebug = destFilePath;

        fs.readFile(destFilePath, 'utf8', (err, data) => {
            if (err) {
                logDebug(`Error reading the micro-integrator-debug.bat file: ${err}`, LogLevel.ERROR);
                reject(`Error while reading the micro-integrator-debug.bat file: ${err}`);
                return;
            }

            const updatedContent = data.replace('CMD_LINE_ARGS=', 'CMD_LINE_ARGS=-Desb.debug=true ');

            fs.writeFile(destFilePath, updatedContent, 'utf8', (err) => {
                if (err) {
                    logDebug(`Error writing the micro-integrator-debug.bat file: ${err}`, LogLevel.ERROR);
                    reject(`Error while updating the micro-integrator-debug.bat file: ${err}`);
                    return;
                }
                resolve(destFilePath);
            });
        });
    });
}

export function removeTempDebugBatchFile() {
    if (tempWindowsDebug) {
        fs.unlinkSync(tempWindowsDebug);
        tempWindowsDebug = undefined;
    }
}

export async function readPortOffset(serverConfigPath: string): Promise<number | undefined> {
    try {
        const configPath = path.join(serverConfigPath, 'conf', 'deployment.toml');
        const content = await fs.promises.readFile(configPath, 'utf-8');
        const config = toml.parse(content);
        interface ServerConfig {
            offset?: number;
        }

        const serverConfig = config?.server as unknown as ServerConfig;
        if (serverConfig) {
            return serverConfig?.offset;
        }
        return undefined;
    } catch (error) {
        logDebug(`Failed to read or parse deployment.toml: ${error}`, LogLevel.ERROR);
        return undefined;
    }
}

export async function setManagementCredentials(serverConfigPath: string) {
    try {
        const configPath = path.join(serverConfigPath, 'conf', 'deployment.toml');
        const content = await fs.promises.readFile(configPath, 'utf-8');
        const config = toml.parse(content);

        interface InternalApis {
            users: User;
        }
        interface User {
            name: string;
            password: string;
        }

        const management = config?.internal_apis as unknown as InternalApis;
        const users = management?.users;


        if (users) {
            const userName = users[0]?.user?.name;
            if (userName) {
                DebuggerConfig.setManagementUserName(userName);
            }
            const password = users[0]?.user?.password;
            if (password) {
                DebuggerConfig.setManagementPassword(password);
            }
        }
    } catch (error) {
        logDebug(`Failed to read or parse deployment.toml: ${error}`, LogLevel.ERROR);
    }
}

/**
 * Kill a process by its listening port.
 * @param port The port number on which the target process is listening.
 */
export async function killProcessByPort(port: number): Promise<void> {
    try {
        const list = await findProcess('port', port);

        if (list.length === 0) {
            return;
        }

        // Iterate over the found processes and kill each
        for (const processInfo of list) {
            const pid = processInfo.pid;
            treeKill(pid, 'SIGKILL');
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Error finding or killing process on port ${port}: ${(error as Error).message}`);
    }
}

function getFileMD5(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('md5');
        const stream = fs.createReadStream(filePath);
        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', (err) => reject(err));
    });
}

async function compareFilesByMD5(file1: string, file2: string): Promise<boolean> {
    return new Promise<boolean>(async (resolve) => {
        try {
            const [hash1, hash2] = await Promise.all([
                getFileMD5(file1),
                getFileMD5(file2),
            ]);
            if (hash1 === hash2) {
                resolve(true);
            } else {
                resolve(false);
            }
        } catch (error) {
            console.error('Error comparing files:', error);
        }
    });
}
