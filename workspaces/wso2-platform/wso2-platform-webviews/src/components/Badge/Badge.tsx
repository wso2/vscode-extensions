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
import type { FC, HTMLProps, PropsWithChildren } from "react";
import React from "react";

interface Props extends PropsWithChildren {
	className?: HTMLProps<HTMLElement>["className"];
}

export const BadgeSkeleton: FC = () => <Badge className="h-[18px] w-20 animate-pulse" />;

export const Badge: FC<Props> = ({ children, className }) => (
	<div className={classNames("rounded-[12px] bg-vsc-button-secondaryBackground px-2 py-0.5 text-[10px] text-vsc-badge-foreground", className)}>
		{children}
	</div>
);
