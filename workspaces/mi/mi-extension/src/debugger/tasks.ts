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
import * as vscode from 'vscode';
import * as fs from 'fs';
import { createTempDebugBatchFile, setJavaHomeInEnvironmentAndPath } from './debugHelper';
import { ERROR_LOG, logDebug } from '../util/logger';

export function getBuildTask(projectUri: string): vscode.Task {
    const commandToExecute = process.platform === 'win32' ? ".\\mvnw.cmd clean install" : "./mvnw clean install";
    const env = setJavaHomeInEnvironmentAndPath(projectUri);  
    const buildTask = new vscode.Task(
        { type: 'mi-build' },
        vscode.TaskScope.Workspace,
        'build',
        'mi',
        new vscode.ShellExecution(commandToExecute,
            { env }
        )
    );
    return buildTask;
}

export function getBuildCommand(): string {
    return process.platform === 'win32' ? ".\\mvnw.cmd clean install -Dstyle.color=never" : "./mvnw clean install -Dstyle.color=never";
}

export function getDockerTask(projectUri: string): vscode.Task {
    const commandToExecute = process.platform === 'win32' ? ".\\mvnw.cmd clean install -P docker" : "./mvnw clean install -P docker";
    const env = setJavaHomeInEnvironmentAndPath(projectUri);  

    const dockerTask = new vscode.Task(
        { type: 'mi-docker' },
        vscode.TaskScope.Workspace,
        'docker',
        'mi',
        new vscode.ShellExecution(commandToExecute,
            { env }
        )
    );

    return dockerTask;
}

export async function getRunTask(serverPath: string, isDebug: boolean): Promise<vscode.Task | undefined> {
    let command;
    let binFile;

    if (process.platform === 'win32') {
        binFile = 'micro-integrator.bat';
    } else {
        binFile = 'micro-integrator.sh';
    }

    const binPath = path.join(serverPath, 'bin', binFile);

    if (isDebug) {
        // HACK to get the server to run as the debugger since MI 4.2.0 version's .bat file is not supported to run java variables
        if (process.platform === 'win32') {
            const binDirectoryPath = path.join(serverPath, 'bin');
            try {
                const copiedBatchFile = await createTempDebugBatchFile(binPath, binDirectoryPath);
                command = copiedBatchFile;
            } catch (error) {
                vscode.window.showErrorMessage(`Error while creating temporary debug batch file: ${error}`);
                return undefined;
            }
        } else {
            command = `${binPath} -Desb.debug=true`;
        }
    } else {
        command = binPath;
    }
    const runTask = new vscode.Task(
        { type: 'mi-run' },
        vscode.TaskScope.Workspace,
        'run',
        'mi',
        new vscode.ShellExecution(command),
    );
    return runTask;
}

export async function getRunCommand(serverPath: string, isDebug: boolean): Promise<string | undefined> {
    let command;
    let binFile;

    if (process.platform === 'win32') {
        binFile = 'micro-integrator.bat';
    } else {
        binFile = 'micro-integrator.sh';
    }

    const binPath = path.join(serverPath, 'bin', binFile);

    if (isDebug) {
        // HACK to get the server to run as the debugger since MI 4.2.0 version's .bat file is not supported to run java variables
        if (process.platform === 'win32') {
            const binDirectoryPath = path.join(serverPath, 'bin');
            try {
                const copiedBatchFile = await createTempDebugBatchFile(binPath, binDirectoryPath);
                command = copiedBatchFile;
            } catch (error) {
                vscode.window.showErrorMessage(`Error while creating temporary debug batch file: ${error}`);
                return undefined;
            }
        } else {
            command = `"${binPath}" -Desb.debug=true`;
        }
    } else {
        command = `"${binPath}"`;
    }
    return command;
}

export function getStopTask(serverPath: string): vscode.Task | undefined {
    const binPath = path.join(serverPath, 'bin', 'micro-integrator.sh');
    const command = `${binPath} stop`;

    if (!fs.existsSync(binPath)) {
        logDebug(`${binPath} does not exist`, ERROR_LOG);
        return;
    }

    const stopTask = new vscode.Task(
        { type: 'mi-stop' },
        vscode.TaskScope.Workspace,
        'stop',
        'mi',
        new vscode.ShellExecution(command)
    );
    return stopTask;
}

export function getStopCommand(serverPath: string): string | undefined {
    let scriptFile;

    if (process.platform === 'win32') {
        scriptFile = 'micro-integrator.bat';
    } else {
        scriptFile = 'micro-integrator.sh';
    }
    const binPath = path.join(serverPath, 'bin', scriptFile);
    const command = `"${binPath}" stop`;

    if (!fs.existsSync(binPath)) {
        logDebug(`${binPath} does not exist`, ERROR_LOG);
        return;
    }

    return command;
}

// Function to load environment variables from .env file
export function loadEnvVariables(filePath: string): void {
    const fileContent = fs.readFileSync(filePath, { encoding: 'utf8' });
    const lines = fileContent.split('\n');
    lines.forEach(line => {
        const trimmedLine = line.trim();
        // Ignore empty lines or comments
        if (trimmedLine && trimmedLine[0] !== '#') {
            const [key, value] = trimmedLine.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim();
            }
        }
    });
}
