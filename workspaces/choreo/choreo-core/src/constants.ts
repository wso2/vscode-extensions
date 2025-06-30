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
	FocusChoreoProjectActivity: "choreo.activity.project.focus",
	SignIn: "wso2.choreo.sign.in",
	SignInWithAuthCode: "wso2.choreo.sign.in.with.authCode",
	SignOut: "wso2.choreo.sign.out",
	AddComponent: "wso2.choreo.add.component",
	CreateNewComponent: "wso2.choreo.create.component",
	DeleteComponent: "wso2.choreo.delete.component",
	OpenWalkthrough: "wso2.choreo.getStarted",
	OpenInConsole: "wso2.choreo.open.external",
	ViewComponent: "wso2.choreo.component.view",
	CloneProject: "wso2.choreo.project.clone",
	CreateDirectoryContext: "wso2.choreo.project.create.context",
	ManageDirectoryContext: "wso2.choreo.project.manage.context",
	RefreshDirectoryContext: "wso2.choreo.project.refresh",
	CreateProjectWorkspace: "wso2.choreo.project.create.workspace",
	CreateComponentDependency: "wso2.choreo.component.create.dependency",
	ViewDependency: "wso2.choreo.component.view.dependency",
	// TODO: add command & code lens to delete dependency
};

export const WebAppSPATypes = [ChoreoBuildPackNames.React, ChoreoBuildPackNames.Vue, ChoreoBuildPackNames.Angular];
