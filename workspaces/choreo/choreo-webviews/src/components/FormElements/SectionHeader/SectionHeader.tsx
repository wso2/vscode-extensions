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
import React, { type ReactNode } from "react";
import { Divider } from "../../Divider";

export const SectionHeader = ({ title, subTitle, alignLeft }: { title: string; subTitle?: ReactNode; alignLeft?: boolean }) => {
	return (
		<div className="mb-2">
			<div className={classNames("flex items-center gap-2 sm:gap-4", alignLeft && "flex-row-reverse")}>
				<Divider className="flex-1" />
				<h1 className={classNames("font-light text-base opacity-75", !alignLeft && "text-right")}>{title}</h1>
			</div>
			{subTitle && <h2 className={classNames("hidden font-extralight text-xs opacity-75 sm:block", !alignLeft && "text-right")}>{subTitle}</h2>}
		</div>
	);
};
