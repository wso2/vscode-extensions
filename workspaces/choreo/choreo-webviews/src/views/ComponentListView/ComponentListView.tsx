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

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { type ComponentsListActivityViewProps, getComponentKey } from "@wso2/choreo-core";
import { ProgressIndicator } from "@wso2/ui-toolkit";
import React, { type FC } from "react";
import { useExtWebviewContext } from "../../providers/ext-vewview-ctx-provider";
import { useLinkedDirStateContext } from "../../providers/linked-dir-state-ctx-provider";
import { ComponentListItem } from "./ComponentListItem";
import { ComponentsEmptyView } from "./ComponentsEmptyView";
import { NoContextView } from "./NoContextView";

export const ComponentListView: FC<ComponentsListActivityViewProps> = () => {
	const webviewState = useExtWebviewContext();

	const { state: linkedDirState, isLoading } = useLinkedDirStateContext();

	const [componentListRef] = useAutoAnimate();

	const validContextItems = Object.values(linkedDirState?.items ?? {}).filter((item) => item.project && item.org);

	if (validContextItems.length === 0) {
		return <NoContextView loading={isLoading || linkedDirState.loading} />;
	}

	if (linkedDirState?.components?.length === 0) {
		return <ComponentsEmptyView loading={isLoading || linkedDirState.loading} items={validContextItems} selected={linkedDirState.selected} />;
	}

	return (
		<>
			{(isLoading || linkedDirState.loading) && <ProgressIndicator />}
			<div className="flex w-full flex-col py-2" ref={componentListRef}>
				{linkedDirState?.components?.map((item, index) => (
					<div key={item.component?.metadata?.id}>
						<ComponentListItem
							item={item}
							org={linkedDirState.selected?.org}
							project={linkedDirState.selected?.project}
							isListLoading={isLoading}
							opened={
								webviewState?.openedComponentKey === getComponentKey(linkedDirState.selected?.org, linkedDirState.selected?.project, item?.component)
							}
						/>
						{index !== linkedDirState.components?.length - 1 && <div className="h-[0.5px] bg-vsc-dropdown-border opacity-70" />}
					</div>
				))}
			</div>
		</>
	);
};
