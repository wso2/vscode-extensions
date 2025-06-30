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

import { commands, window as w } from "vscode";
import { ResponseError } from "vscode-jsonrpc";
import { ErrorCode } from "./choreo-rpc/constants";
import { choreoEnvConfig } from "./config";
import { getLogger } from "./logger/logger";
import { authStore } from "./stores/auth-store";

export function handlerError(err: any) {
	if (err instanceof ResponseError) {
		switch (err.code) {
			case ErrorCode.ParseError:
				getLogger().error("ParseError", err);
				break;
			case ErrorCode.InvalidRequest:
				getLogger().error("InvalidRequest", err);
				break;
			case ErrorCode.MethodNotFound:
				getLogger().error("MethodNotFound", err);
				break;
			case ErrorCode.InvalidParams:
				getLogger().error("InvalidParams", err);
				break;
			case ErrorCode.InternalError:
				getLogger().error("InternalError", err);
				break;
			case ErrorCode.UnauthorizedError:
				if (authStore.getState().state?.userInfo) {
					authStore.getState().logout();
					w.showErrorMessage("Unauthorized. Please sign in again.");
				}
				break;
			case ErrorCode.TokenNotFoundError:
				if (authStore.getState().state?.userInfo) {
					authStore.getState().logout();
					w.showErrorMessage("Token not found. Please sign in again.");
				}
				break;
			case ErrorCode.InvalidTokenError:
				if (authStore.getState().state?.userInfo) {
					authStore.getState().logout();
					w.showErrorMessage("Invalid token. Please sign in again.");
				}
				break;
			case ErrorCode.ForbiddenError:
				getLogger().error("ForbiddenError", err);
				break;
			case ErrorCode.RefreshTokenError:
				if (authStore.getState().state?.userInfo) {
					authStore.getState().logout();
					w.showErrorMessage("Failed to refresh user session. Please sign in again.");
				}
				break;
			case ErrorCode.ComponentNotFound:
				w.showErrorMessage("Component not found");
				break;
			case ErrorCode.ProjectNotFound:
				w.showErrorMessage("Project not found");
				break;
			case ErrorCode.UserNotFound:
				// Ignore error
				break;
			case ErrorCode.MaxProjectCountError:
				w.showErrorMessage("Failed to create project due to reaching maximum number of projects allowed within the free tier.", "Upgrade").then(
					(res) => {
						if (res === "Upgrade") {
							commands.executeCommand("vscode.open", `${choreoEnvConfig.getBillingUrl()}/cloud/choreo/upgrade`);
						}
					},
				);
				break;
			case ErrorCode.MaxComponentCountError:
				w.showErrorMessage("Failed to create component due to reaching maximum number of components allowed within the free tier.", "Upgrade").then(
					(res) => {
						if (res === "Upgrade") {
							commands.executeCommand("vscode.open", `${choreoEnvConfig.getBillingUrl()}/cloud/choreo/upgrade`);
						}
					},
				);
				break;
			case ErrorCode.EpYamlNotFound:
				w.showErrorMessage(
					".choreo/component.yaml file is required in your remote repository. Try again after committing & pushing your component.yaml file",
					"View Documentation",
				).then((res) => {
					if (res === "View Documentation") {
						commands.executeCommand("vscode.open", "https://wso2.com/choreo/docs/develop-components/configure-endpoints/");
					}
				});
				break;
			case ErrorCode.InvalidSubPath:
				w.showErrorMessage(
					"Failed to create component. Please try again after synching your local repo directory changes with your remote directory.",
				);
				break;
			case ErrorCode.NoOrgsAvailable:
				w.showErrorMessage(
					"No organizations attached to the user. Please create an organization in Choreo and try logging in again",
					"Open Choreo Console",
				).then((res) => {
					if (res === "Open Choreo Console") {
						commands.executeCommand("vscode.open", choreoEnvConfig.getConsoleUrl());
					}
				});
				break;
			default:
				getLogger().error("Unknown error", err);
				break;
		}
	}
}
