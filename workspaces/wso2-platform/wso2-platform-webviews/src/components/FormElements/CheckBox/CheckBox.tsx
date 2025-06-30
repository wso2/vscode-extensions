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

import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";
import React, { type FC, type HTMLProps, type ReactNode } from "react";
import { type Control, Controller } from "react-hook-form";

interface Props {
	name?: string;
	label?: string | ReactNode;
	loading?: boolean;
	control?: Control;
	disabled?: boolean;
	className?: HTMLProps<HTMLElement>["className"];
}

export const CheckBox: FC<Props> = (props) => {
	const { label, loading, name, control, disabled, className } = props;

	if (!control) {
		return (
			<VSCodeCheckbox className={className} disabled={disabled || loading || undefined}>
				{label}
			</VSCodeCheckbox>
		);
	}

	return (
		<Controller
			name={name}
			control={control}
			render={({ field }) => (
				<VSCodeCheckbox
					className={className}
					disabled={disabled || loading || undefined}
					{...field}
					checked={field.value}
					onChange={(event: any) => field.onChange(event.target.checked)}
				>
					{label}
				</VSCodeCheckbox>
			)}
		/>
	);
};
