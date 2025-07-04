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

import React, { type FC } from "react";
import { Button } from "../Button";
import { Codicon } from "../Codicon";

interface Props {
	webviewSection: string;
	tooltip?: string;
	params?: object;
}

export const ContextMenu: FC<Props> = ({ webviewSection, tooltip = "More Actions", params = {} }) => {
	return (
		<Button
			appearance="icon"
			onClick={(event) => {
				event.preventDefault();
				event.target.dispatchEvent(
					new MouseEvent("contextmenu", {
						bubbles: true,
						clientX: event.currentTarget.getBoundingClientRect().left,
						clientY: event.currentTarget.getBoundingClientRect().bottom,
					}),
				);
				event.stopPropagation();
			}}
			data-vscode-context={JSON.stringify({
				preventDefaultContextMenuItems: true,
				webviewSection,
				...params,
			})}
			title={tooltip}
		>
			<Codicon name="ellipsis" />
		</Button>
	);
};
