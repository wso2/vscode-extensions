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
