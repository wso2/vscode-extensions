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

import { VSCodeTextArea } from "@vscode/webview-ui-toolkit/react";
import classnames from "classnames";
import React, { type FC, type HTMLProps, type ReactNode } from "react";
import { type Control, Controller } from "react-hook-form";
import { FormElementWrap } from "../FormElementWrap";

interface Props {
	name?: string;
	label?: string | ReactNode;
	required?: boolean;
	loading?: boolean;
	control?: Control;
	disabled?: boolean;
	placeholder?: string;
	rows?: number;
	wrapClassName?: HTMLProps<HTMLElement>["className"];
}

export const TextArea: FC<Props> = (props) => {
	const { label, required, loading, name, control, disabled, placeholder, wrapClassName, rows = 5 } = props;

	if (!control) {
		return (
			<FormElementWrap label={label} required={required} loading={loading} wrapClassName={wrapClassName}>
				<VSCodeTextArea
					className={classnames("w-full border-[0.5px] border-transparent")}
					disabled={disabled || loading || undefined}
					placeholder={placeholder}
				/>
			</FormElementWrap>
		);
	}

	return (
		<Controller
			name={name}
			control={control}
			render={({ field, fieldState }) => (
				<FormElementWrap errorMsg={fieldState.error?.message} label={label} required={required} loading={loading} wrapClassName={wrapClassName}>
					<VSCodeTextArea
						onInput={field.onChange}
						className={classnames("w-full border-[0.5px]", fieldState.error ? "border-vsc-errorForeground" : "border-transparent")}
						disabled={disabled || loading || undefined}
						placeholder={placeholder}
						resize="vertical"
						rows={rows}
						{...field}
					/>
				</FormElementWrap>
			)}
		/>
	);
};
