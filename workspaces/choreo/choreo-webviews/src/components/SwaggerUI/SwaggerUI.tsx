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

import React, { type HTMLProps, type FC } from "react";
import SwaggerUIReact from "swagger-ui-react";
import "@wso2/ui-toolkit/src/styles/swagger/main.scss";
import classNames from "classnames";
import { Codicon } from "../Codicon/Codicon";
import { SkeletonText } from "../SkeletonText";

export const SwaggerUI: FC<any> = (props) => {
	return <SwaggerUIReact {...props} />;
};

export const SwaggerUISkeleton: FC<{ className?: HTMLProps<HTMLElement>["className"] }> = ({ className }) => {
	return (
		<div className={classNames("my-5 flex w-full flex-col gap-4", className)}>
			{Array.from(new Array(10)).map((_, index) => (
				<div key={index} className="flex h-9 animate-pulse items-center gap-3 rounded border-1 border-vsc-button-secondaryBackground p-1">
					<div className="h-full w-20 bg-vsc-button-secondaryBackground" />
					<div className="flex-1">
						<SkeletonText className={index % 2 === 0 ? "w-1/2" : "w-2/5"} />
					</div>
					<Codicon name="chevron-down" className="text-vsc-button-secondaryBackground" />
				</div>
			))}
		</div>
	);
};
