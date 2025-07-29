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

import { type ServerOptions } from "ws";
import {
  type RequestMessage,
  type ResponseMessage,
  NotificationMessage,
} from "vscode-languageserver-protocol";
import * as cp from "node:child_process";

export enum LanguageName {
  ballerina = "ballerina",
  java = "java",
  python = "python",
}

export interface LanguageServerRunConfig {
  serverName: string;
  pathName: string;
  serverPort: number;
  runCommand: LanguageName | string;
  runCommandArgs: string[];
  wsServerOptions: ServerOptions;
  spawnOptions?: cp.SpawnOptions;
  logMessages?: boolean;
  requestMessageHandler?: (message: RequestMessage) => RequestMessage;
  responseMessageHandler?: (message: ResponseMessage) => ResponseMessage;
  NotificationMessageHandler?: (
    message: NotificationMessage
  ) => NotificationMessage;
}

export const SCHEME = "web-bala";
