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

import classNames from "classnames";
import React, { type HTMLProps, type FC } from "react";
import { Codicon } from "../Codicon";

interface Props {
	className?: HTMLProps<HTMLElement>["className"];
	text: string;
	subText?: string;
	showIcon?: boolean;
}

export const Empty: FC<Props> = ({ text, className, subText, showIcon = true }) => {
	return (
		<div className={classNames("col-span-full flex flex-col items-center justify-center gap-3 p-8 lg:min-h-44", className)}>
			<p className="text-center font-light text-sm opacity-50">{text}</p>
			{subText && <p className="text-center font-thin text-[11px] opacity-50">{subText}</p>}
			{showIcon && <Codicon name="inbox" className="!text-4xl opacity-20" />}
		</div>
	);
};
