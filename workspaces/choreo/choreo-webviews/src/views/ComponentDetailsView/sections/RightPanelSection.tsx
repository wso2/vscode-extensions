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
import React, { type FC, type PropsWithChildren, type ReactNode } from "react";

interface Props extends PropsWithChildren {
	title?: ReactNode;
}

export const RightPanelSection: FC<Props> = ({ title, children }) => {
	const [rightPanelRef] = useAutoAnimate();

	return (
		<div className="flex flex-col gap-3">
			{title && <div className="text-base">{title}</div>}
			<div className="flex flex-col gap-1" ref={rightPanelRef}>
				{children}
			</div>
		</div>
	);
};

export interface IRightPanelSectionItem {
	label: string;
	value: ReactNode;
	tooltip?: string;
}

export const RightPanelSectionItem: FC<IRightPanelSectionItem> = ({ label, value, tooltip }) => {
	return (
		<div
			className="line-clamp-1 flex w-full! items-center justify-between gap-0.5 break-all marker:flex-row"
			title={tooltip || ["string", "number"].includes(typeof value) ? `${label}: ${value}` : label}
		>
			<p className="line-clamp-1 break-all font-extralight opacity-80">{label}</p>
			<p className="line-clamp-1 break-all text-right">{value}</p>
		</div>
	);
};
