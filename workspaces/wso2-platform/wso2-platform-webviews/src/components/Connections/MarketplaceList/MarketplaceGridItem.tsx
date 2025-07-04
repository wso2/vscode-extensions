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

import { type MarketplaceItem, getTimeAgo } from "@wso2/wso2-platform-core";
import classNames from "classnames";
import React from "react";
import type { FC } from "react";
import { Badge, BadgeSkeleton } from "../../Badge";
import { SkeletonText } from "../../SkeletonText";

type Props = {
	onClick?: () => void;
	item?: MarketplaceItem;
	loading?: boolean;
};

export const MarketplaceGridItem: FC<Props> = ({ onClick, item, loading }) => {
	let visibility = "Project";
	if (item?.visibility.includes("PUBLIC")) {
		visibility = "Public";
	} else if (item?.visibility.includes("ORGANIZATION")) {
		visibility = "Organization";
	}
	return (
		<div
			onClick={item ? onClick : undefined}
			className={classNames({
				"flex min-h-32 flex-col gap-1 rounded-sm border-1 border-vsc-list-hoverBackground p-2": true,
				"cursor-pointer duration-200 hover:bg-vsc-list-hoverBackground": item,
				"animate-pulse": !item || loading,
			})}
		>
			<div className="flex flex-1 flex-col gap-1">
				{item ? <div className="line-clamp-2 font-semibold text-base">{item.name}</div> : <SkeletonText className="mb-0.5 w-1/2" />}
				<div className="flex flex-wrap gap-1">
					{item ? (
						<>
							<Badge>Type: {item.serviceType}</Badge>
							<Badge>Version: {item.version}</Badge>
							<Badge className="capitalize">Status: {item.status}</Badge>
						</>
					) : (
						<>
							<BadgeSkeleton />
							<BadgeSkeleton />
							<BadgeSkeleton />
						</>
					)}
				</div>
			</div>
			<div className="flex items-center justify-between gap-2 justify-self-end font-thin text-[10px] opacity-70">
				{item ? (
					<>
						<div className="line-clamp-1">Visibility: {visibility}</div>
						<div className="line-clamp-1 font-extralight opacity-70">Created: {getTimeAgo(new Date(Number.parseInt(item.createdTime) * 1000))}</div>
					</>
				) : (
					<>
						<SkeletonText className="h-3 w-20" />
						<SkeletonText className="h-3 w-28" />
					</>
				)}
			</div>
		</div>
	);
};
