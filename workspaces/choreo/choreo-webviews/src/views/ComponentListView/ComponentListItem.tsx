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

import {
	CommandIds,
	type ContextStoreComponentState,
	type Organization,
	type Project,
	type ViewComponentDetailsReq,
	getComponentTypeText,
	getTypeForDisplayType,
} from "@wso2/choreo-core";
import classNames from "classnames";
import React, { type FC } from "react";
import { ContextMenu } from "../../components/ContextMenu";
import { ChoreoWebViewAPI } from "../../utilities/vscode-webview-rpc";

interface Props {
	project?: Project;
	org?: Organization;
	item: ContextStoreComponentState;
	isListLoading?: boolean;
	opened?: boolean;
}

export const ComponentListItem: FC<Props> = ({ item, isListLoading, opened, org, project }) => {
	const viewComponentDetails = () =>
		ChoreoWebViewAPI.getInstance().triggerCmd(CommandIds.ViewComponent, {
			component: item.component,
			project: project,
			organization: org,
			componentPath: item.componentFsPath,
		} as ViewComponentDetailsReq);

	return (
		<div
			className={classNames({
				"flex duration-200": true,
				"cursor-pointer hover:bg-vsc-list-hoverBackground": !opened,
				"animate-pulse cursor-progress": isListLoading,
				"cursor-pointer bg-vsc-list-dropBackground": opened,
			})}
			onClick={viewComponentDetails}
		>
			<div className="flex flex-1 flex-col break-all py-3 pl-5">
				<h4 className="font-thin text-[10px] tracking-wider opacity-90">{getComponentTypeText(getTypeForDisplayType(item.component?.spec?.type))}</h4>
				<h3 className="mb-0.5 line-clamp-1 font-bold text-sm">{item?.component?.metadata?.displayName}</h3>
				<p className="text-[11px] tracking-tight">
					Path: {item.workspaceName}/{item.componentRelativePath}
				</p>
			</div>
			<div className="pt-1 pr-3">
				<ContextMenu
					webviewSection="componentListItem"
					params={{
						component: item.component,
						project: project,
						organization: org,
						componentPath: item.componentFsPath,
					}}
				/>
			</div>
		</div>
	);
};
