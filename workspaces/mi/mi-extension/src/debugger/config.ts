
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
import * as path from "path";
import { LOCALHOST, ADMIN } from './constants';

const toml = require('@iarna/toml');
const fs = require('fs');

export class DebuggerConfig {
    private static commandPort: number = vscode.workspace.getConfiguration().get<number>('MI.debugger.commandPort', 9005);
    private static eventPort: number = vscode.workspace.getConfiguration().get<number>('MI.debugger.eventPort', 9006);
    private static baseServerPort: number = vscode.workspace.getConfiguration().get<number>('MI.serverPort', 8290);
    private static serverReadinessPort: number = 9201;
    private static managementPort: number = 9164;
    private static host: string = LOCALHOST;
    private static internalOffset = 10;
    private static envVariables: { [key: string]: string } = {};
    private static vmArgs: string[] = [];
    private static vmArgsPortOffset: number | null = null;
    private static configPortOffset: number | null = null;
    private static remoteDebuggingEnabled: boolean = false;
    private static connectionTimeout: number = 10000;

    //Capps and Libs copied to the MI server
    private static copiedCappUri: string[] = [];
    private static copiedLibs: string[] = [];
    private static projectList: string[] = [];
    
    // Management API username and password
    private static managementUserName: string = ADMIN;
    private static managementPassword: string = ADMIN;

    private static portOffset: number | undefined;

    public static getEnvVariables(): { [key: string]: string } {
        return this.envVariables;
    }

    public static setEnvVariables(envVariables: { [key: string]: string }): void {
        this.envVariables = envVariables;
    }


    public static getCommandPort(): number {
        return this.commandPort;
    }

    public static getEventPort(): number {
        return this.eventPort;
    }

    public static setPortOffset(offset: number | undefined): void {
        this.portOffset = offset;
    }

    public static setCopiedCapp(capp: string) {
        if (this.copiedCappUri.length > 0) {
            this.copiedCappUri.push(capp);
        } else {
            this.copiedCappUri = [capp];
        }
    }

    public static getCopiedCapp() {
        return this.copiedCappUri;
    }

    public static setCopiedLibs(libs: string) {
        if (this.copiedLibs.length > 0) {
            this.copiedLibs.push(libs);
        } else {
            this.copiedLibs = [libs];
        }
    }

    public static getCopiedLibs() {
        return this.copiedLibs;
    }

    public static resetCappandLibs() {
        this.copiedCappUri = [];
        this.copiedLibs = [];
    }

    public static setServerPort(port: number): void {
        this.baseServerPort = port;
    }

    public static setProjectList(projects: string[]) {
        this.projectList = projects;
    }

    public static getProjectList() {
        return this.projectList;
    }

    public static getServerPort(): number {
        if (this.vmArgsPortOffset !== null) {
            return this.baseServerPort + this.vmArgsPortOffset - this.internalOffset;
        }
        if (this.configPortOffset !== null) {
            return this.baseServerPort + this.configPortOffset - this.internalOffset;
        }
        return this.baseServerPort;
    }

    public static setServerReadinessPort(port: number): void {
        this.serverReadinessPort = port;
    }

    public static getServerReadinessPort(): number {
        if (this.vmArgsPortOffset !== null) {
            return this.serverReadinessPort + this.vmArgsPortOffset - this.internalOffset;
        }
        if (this.configPortOffset !== null) {
            return this.serverReadinessPort + this.configPortOffset - this.internalOffset;
        }
        return this.serverReadinessPort;
    }

    public static setManagementPort(port: number): void {
        this.managementPort = port;
    }

    public static getManagementPort(): number {
        if (this.vmArgsPortOffset !== null) {
            return this.managementPort + this.vmArgsPortOffset - this.internalOffset;
        }
        if (this.configPortOffset !== null) {
            return this.managementPort + this.configPortOffset - this.internalOffset;
        }
        return this.managementPort;
    }

    public static getHost(): string {
        return this.host;
    }

    public static setHost(host: string): void {
        this.host = host;
    }

    public static getManagementUserName(): string {
        return this.managementUserName;
    }

    public static getManagementPassword(): string {
        return this.managementPassword;
    }

    public static setManagementUserName(userName: string): void {
        this.managementUserName = userName;
    }

    public static setManagementPassword(password: string): void {
        this.managementPassword = password;
    }
    public static getVmArgs(): string[] {
        return this.vmArgs;
    }

    public static setVmArgs(vmArgs: string[]): void {
        this.vmArgs = vmArgs;
        for (const arg of this.vmArgs) {
            const match = arg.match(/-DportOffset=(\d+)/);
            if (match) {
                this.vmArgsPortOffset = parseInt(match[1]);
            }
        }
    }

    public static setConfigPortOffset(projectUri: string): void {
        const deploymentConfig = path.join(projectUri, "deployment", "deployment.toml");
        const configs = toml.parse(fs.readFileSync(deploymentConfig, 'utf8'));
        this.configPortOffset = configs.server?.offset ?? null;
    }

    public static setRemoteDebuggingEnabled(enabled: boolean): void {
        this.remoteDebuggingEnabled = enabled;
    }

    public static isRemoteDebuggingEnabled(): boolean {
        return this.remoteDebuggingEnabled;
    }

    public static getDefaultServerPort(): number {
        return vscode.workspace.getConfiguration().get<number>('MI.serverPort', 8290);
    }

    public static getConnectionTimeout(): number {
        return this.connectionTimeout;
    }
    public static setConnectionTimeout(timeout: number): void {
        this.connectionTimeout = timeout * 1000;
    }
}
