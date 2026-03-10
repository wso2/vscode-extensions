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

import { ChoreoBuildPackNames } from "./types/common.types";

export const CommandIds = {
	SignIn: "wso2.wso2-platform.sign.in",
	SignInWithAuthCode: "wso2.wso2-platform.sign.in.with.authCode",
	SignOut: "wso2.wso2-platform.sign.out",
	CancelSignIn: "wso2.wso2-platform.cancel.sign.in",
	CreateNewComponent: "wso2.wso2-platform.create.component",
	CreateMultipleNewComponents: "wso2.wso2-platform.create.multiple.components",
	DeleteComponent: "wso2.wso2-platform.delete.component",
	OpenInConsole: "wso2.wso2-platform.open.external",
	ViewComponent: "wso2.wso2-platform.component.view",
	CloneProject: "wso2.wso2-platform.project.clone",
	CreateDirectoryContext: "wso2.wso2-platform.project.create.context",
	ManageDirectoryContext: "wso2.wso2-platform.project.manage.context",
	RefreshDirectoryContext: "wso2.wso2-platform.project.refresh",
	CreateProjectWorkspace: "wso2.wso2-platform.project.create.workspace",
	CreateComponentDependency: "wso2.wso2-platform.component.create.dependency",
	ViewDependency: "wso2.wso2-platform.component.view.dependency",
	OpenCompSrcDir: "wso2.wso2-platform.open.component.src",
	CommitAndPushToGit: "wso2.wso2-platform.push-to-git",
	// TODO: add command & code lens to delete dependency
};

// todo: rename as WICloudCommandIds
export const WICommandIds = {
	SignIn: "wso2.integrator.cloud.auth.signIn",
	SignOut: "wso2.integrator.cloud.auth.signOut",
	CancelSignIn: "wso2.integrator.cloud.auth.cancelSignIn",
	CreateNewComponent: "wso2.integrator.cloud.integration.create",
	DeleteComponent: "wso2.integrator.cloud.integration.delete",
	OpenInConsole: "wso2.integrator.cloud.integration.openInConsole",
	CloneProject: "wso2.integrator.cloud.project.clone",
	CreateDirectoryContext: "wso2.integrator.cloud.project.createContext",
	ManageDirectoryContext: "wso2.integrator.cloud.project.manageContext",
	RefreshDirectoryContext: "wso2.integrator.cloud.project.refresh",
	OpenCompSrcDir: "wso2.integrator.cloud.integration.open.src",
	CommitAndPushToGit: "wso2.integrator.cloud.integration.push-to-git",
};

export const WebAppSPATypes = [ChoreoBuildPackNames.React, ChoreoBuildPackNames.Vue, ChoreoBuildPackNames.Angular];
