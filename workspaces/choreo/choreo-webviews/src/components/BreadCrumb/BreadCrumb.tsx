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

import { VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import classNames from "classnames";
import React, { type FC, type ReactNode } from "react";

export interface BreadCrumbItem {
	label: string;
	onClick?: () => void;
}
interface Props {
	items: BreadCrumbItem[];
}

export const BreadCrumb: FC<Props> = ({ items }) => {
	const nodes: ReactNode[] = [];
	for (const [index, item] of items.entries()) {
		if (item.onClick) {
			nodes.push(
				<VSCodeLink className="text-sm text-vsc-foreground opacity-70" onClick={item.onClick}>
					{item.label}
				</VSCodeLink>,
			);
		} else {
			nodes.push(<span className={classNames("text-sm", index + 1 < items.length && "opacity-70")}>{item.label}</span>);
		}

		if (index + 1 < items.length) {
			nodes.push(<span className="text-sm opacity-70">/</span>);
		}
	}
	return <div className="flex flex-wrap items-center gap-1">{nodes}</div>;
};
