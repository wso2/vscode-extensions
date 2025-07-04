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

import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import React, { type HTMLProps, type PropsWithChildren, forwardRef } from "react";

interface Props extends PropsWithChildren {
	className?: HTMLProps<HTMLElement>["className"];
	appearance?: "primary" | "secondary" | "icon";
	title?: string;
	disabled?: boolean;
	onClick?: (event: React.MouseEvent<HTMLElement | SVGSVGElement>) => void;
}

export const Button = forwardRef<any, Props>((props, ref) => {
	const { children, disabled, ...rest } = props;

	return (
		<VSCodeButton {...rest} disabled={disabled || undefined} ref={ref}>
			{children}
		</VSCodeButton>
	);
});
Button.displayName = "Button";
