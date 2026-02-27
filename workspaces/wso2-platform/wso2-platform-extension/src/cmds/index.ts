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

import type { ExtensionContext } from "vscode";
import { cloneRepoCommand } from "./clone-project-cmd";
import { commitAndPushToGitCommand } from "./commit-and-push-to-git-cmd";
import { createComponentDependencyCommand } from "./create-comp-dependency-cmd";
import { createMultipleNewComponentsCommand, createNewComponentCommand } from "./create-component-cmd";
import { createDirectoryContextCommand } from "./create-directory-context-cmd";
import { createProjectWorkspaceCommand } from "./create-project-workspace-cmd";
import { deleteComponentCommand } from "./delete-component-cmd";
import { manageProjectContextCommand } from "./manage-dir-context-cmd";
import { openCompSrcCommand } from "./open-comp-src-cmd";
import { openInConsoleCommand } from "./open-in-console-cmd";
import { refreshContextCommand } from "./refresh-directory-context-cmd";
import { signInCommand } from "./sign-in-cmd";
import { signInWithAuthCodeCommand } from "./sign-in-with-code-cmd";
import { signOutCommand } from "./sign-out-cmd";
import { viewComponentDependencyCommand } from "./view-comp-dependency-cmd";
import { viewComponentCommand } from "./view-component-cmd";

export function activateCmds(context: ExtensionContext) {
	createNewComponentCommand(context);
	createMultipleNewComponentsCommand(context);
	refreshContextCommand(context);
	deleteComponentCommand(context);
	signInCommand(context);
	signInWithAuthCodeCommand(context);
	signOutCommand(context);
	openInConsoleCommand(context);
	viewComponentCommand(context);
	cloneRepoCommand(context);
	createProjectWorkspaceCommand(context);
	manageProjectContextCommand(context);
	createDirectoryContextCommand(context);
	createComponentDependencyCommand(context);
	viewComponentDependencyCommand(context);
	openCompSrcCommand(context);
	commitAndPushToGitCommand(context);
}
