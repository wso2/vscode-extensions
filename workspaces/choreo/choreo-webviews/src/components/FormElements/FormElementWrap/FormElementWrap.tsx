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
import { RequiredFormInput } from "@wso2/ui-toolkit";
import { ProgressIndicator } from "@wso2/ui-toolkit";
import classNames from "classnames";
import React, { type FC, type HTMLProps, type PropsWithChildren, type ReactNode } from "react";

interface Props extends PropsWithChildren {
	label?: string | ReactNode;
	required?: boolean;
	errorMsg?: string;
	loading?: boolean;
	wrapClassName?: HTMLProps<HTMLElement>["className"];
	labelWrapClassName?: HTMLProps<HTMLElement>["className"];
}

export const FormElementWrap: FC<Props> = (props) => {
	const { label, required, errorMsg, loading, wrapClassName, labelWrapClassName, children } = props;
	return (
		<div className={classNames("flex w-full flex-col", wrapClassName)}>
			<div className={classNames("flex justify-between gap-1", labelWrapClassName)}>
				<span className="flex gap-1">
					<label className="font-light">{label}</label>
					{required && <RequiredFormInput />}
				</span>
				{errorMsg && (
					<label className="line-clamp-1 flex-1 text-right text-vsc-errorForeground" title={errorMsg}>
						{errorMsg}
					</label>
				)}
			</div>
			<div className="grid grid-cols-1">{children}</div>
			{loading && (
				<div className="relative">
					<ProgressIndicator />
				</div>
			)}
		</div>
	);
};
