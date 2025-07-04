import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import { ProgressIndicator } from "@wso2/ui-toolkit";
import type { ComponentKind, MarketplaceItem, Organization, Project } from "@wso2/wso2-platform-core";
import classNames from "classnames";
import debounce from "lodash.debounce";
import React, { useEffect, useRef, type FC } from "react";
import { ChoreoWebViewAPI } from "../../../utilities/vscode-webview-rpc";
import { Banner } from "../../Banner";
import { Button } from "../../Button";
import { Divider } from "../../Divider";
import { Empty } from "../../Empty";
import { MarketplaceGridItem } from "./MarketplaceGridItem";

interface Props {
	org: Organization;
	project: Project;
	component: ComponentKind;
	enabled: boolean;
	onSelectItem: (item: MarketplaceItem) => void;
}

const PAGE_SIZE = 12;

export const MarketplaceGrid: FC<Props> = ({ enabled, org, project, component, onSelectItem }) => {
	const searchQuery = useRef("");
	const [gridRef] = useAutoAnimate();

	const {
		data: marketplaceData,
		isFetching,
		isLoading,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		refetch,
		error,
	} = useInfiniteQuery(
		["marketplace-items", { org: org.id, project: project.id }],
		async ({ pageParam = 0 }) => {
			const resp = await ChoreoWebViewAPI.getInstance()
				.getChoreoRpcClient()
				.getMarketplaceItems({
					orgId: org.id.toString(),
					request: {
						limit: PAGE_SIZE,
						offset: pageParam,
						networkVisibilityFilter: "all",
						networkVisibilityprojectId: project.id,
						sortBy: "createdTime",
						query: searchQuery.current.trim() ?? undefined,
						searchContent: false,

						isThirdParty: false,
					},
				});
			return resp;
		},
		{
			enabled,
			select: (data) => {
				// removing current component from the marketplace list
				let hasComponent = false;
				const newData = {
					...data,
					pages: data.pages?.map((page) => ({
						...page,
						data: page.data.filter((pageDate) => {
							const sameComp = pageDate.component?.componentId === component.metadata.id;
							if (sameComp) {
								hasComponent = true;
							}
							return !sameComp;
						}),
					})),
				};
				return {
					...newData,
					pages: newData.pages?.map((page) => ({
						...page,
						pagination: { ...page.pagination, total: hasComponent ? page.pagination?.total - 1 : page.pagination?.total },
					})),
				};
			},
			getNextPageParam: (params) => {
				if (params.pagination?.offset + params.count < params.pagination?.total) {
					return params.pagination?.offset + params.count;
				}
			},
		},
	);

	const handleSearchQueryChange = debounce((event: any) => {
		searchQuery.current = event.target.value;
		refetch();
	}, 500);

	useEffect(() => {
		if (enabled) {
			searchQuery.current = "";
			refetch(); // todo:  check if enabled needs to be passed in as another query key instead of this
		}
	}, [enabled]);

	const totalCount = marketplaceData?.pages?.[0]?.pagination?.total ?? 0;

	return (
		<div className="flex h-[calc(100vh-96px)] flex-col gap-2 overflow-y-auto px-4 sm:px-6">
			<VSCodeTextField className="mb-2 w-full" placeholder="Search..." onKeyUpCapture={handleSearchQueryChange} />
			<div className="flex items-center gap-2 sm:gap-4">
				<h1 className="font-light text-xs opacity-50">
					{isLoading ? "Loading results" : totalCount ? `${totalCount} results found` : "No results found"}
				</h1>
				<div className="relative flex-1">
					{isFetching && !isLoading && <ProgressIndicator />}
					<Divider className="flex-1" />
				</div>
			</div>
			<div className="overflow-y-auto overflow-x-hidden">
				<div className="grid w-full gap-2 sm:grid-cols-2" ref={gridRef}>
					{error && !isFetching && <Banner type="error" title="Oops, something went wrong when loading marketplace" />}
					{marketplaceData?.pages?.map((page, i) => (
						<React.Fragment key={i}>
							{page?.data?.map((item) => (
								<MarketplaceGridItem key={item.serviceId} item={item} onClick={() => onSelectItem(item)} />
							))}
						</React.Fragment>
					))}
					{(isLoading || (isFetching && !(marketplaceData?.pages?.[0]?.data?.length > 0))) &&
						Array.from(new Array(PAGE_SIZE)).map((_, index) => <MarketplaceGridItem key={`loading-item-${index}`} />)}
					{isFetchingNextPage && Array.from(new Array(PAGE_SIZE)).map((_, index) => <MarketplaceGridItem key={`loading-item-${index}`} />)}
					{!isFetching && !hasNextPage && !(marketplaceData?.pages?.[0]?.data?.length > 0) && (
						<Empty text={searchQuery.current ? `No service APIs matching with '${searchQuery.current}'` : "No service APIs available"} />
					)}
					{hasNextPage && !isFetchingNextPage && (
						<div key="load-more-btn" className="col-span-full flex h-12 items-end justify-center">
							<Button
								appearance="secondary"
								className={classNames(isFetching && "animate-pulse")}
								disabled={isFetching}
								onClick={() => fetchNextPage()}
							>
								Load More
							</Button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
