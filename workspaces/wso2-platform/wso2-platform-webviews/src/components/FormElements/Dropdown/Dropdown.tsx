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

import { VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react";
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
	items?: ({ value: string; label?: string } | string)[];
	disabled?: boolean;
	wrapClassName?: HTMLProps<HTMLElement>["className"];
}

export const Dropdown: FC<Props> = (props) => {
	const { label, required, items, loading, control, name, disabled, wrapClassName } = props;
	return (
		<Controller
			name={name}
			control={control}
			render={({ field, fieldState }) => (
				<FormElementWrap
					errorMsg={fieldState.error?.message}
					label={label}
					required={required}
					loading={loading}
					wrapClassName={wrapClassName}
					labelWrapClassName="mb-[1px]"
				>
					<VSCodeDropdown
						className={classnames("w-full border-[0.5px]", fieldState.error ? "border-vsc-errorForeground" : "border-transparent")}
						disabled={disabled || loading || undefined}
						{...field}
					>
						{items?.map((item) => (
							<VSCodeOption key={typeof item === "string" ? item : item?.value} value={typeof item === "string" ? item : item.value} className="p-1">
								{typeof item === "string" ? item : item?.label || item.value}
							</VSCodeOption>
						))}
					</VSCodeDropdown>
				</FormElementWrap>
			)}
		/>
	);
};
