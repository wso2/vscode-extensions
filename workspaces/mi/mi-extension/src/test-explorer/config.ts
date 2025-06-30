
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

export class TestRunnerConfig {
    private static serverPort: number = vscode.workspace.getConfiguration().get<number>('MI.test.serverPort', 9008);
    private static host: string = vscode.workspace.getConfiguration().get<string>('MI.test.server', 'localhost');

    public static getServerPort(): number {
        return this.serverPort;
    }

    public static getHost(): string {
        return this.host;
    }
}
