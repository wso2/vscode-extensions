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

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	ComponentDisplayType,
	type ComponentKind,
	type ConnectionDetailed,
	type ConnectionListItem,
	type CreateComponentConnectionReq,
	type DeploymentTrack,
	type MarketplaceItem,
	type MarketplaceItemSchema,
	type Organization,
	type Project,
	ServiceInfoVisibilityEnum,
	capitalizeFirstLetter,
	getTypeForDisplayType,
} from "@wso2/wso2-platform-core";
import React, { useEffect, type FC } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";
import { queryKeys } from "../../../hooks/use-queries";
import { ChoreoWebViewAPI } from "../../../utilities/vscode-webview-rpc";
import { Button } from "../../Button";
import { Dropdown } from "../../FormElements/Dropdown";
import { TextField } from "../../FormElements/TextField";

interface Props {
	item: MarketplaceItem;
	allItems: ConnectionListItem[];
	component: ComponentKind;
	org: Organization;
	project: Project;
	onCreate: (createdItem: ConnectionDetailed) => void;
	directoryFsPath: string;
	deploymentTrack: DeploymentTrack;
}

const getPossibleVisibilities = (marketplaceItem: MarketplaceItem, project: Project) => {
	const { connectionSchemas = [], visibility: visibilities = [] } = marketplaceItem;
	const filteredVisibilities = visibilities.filter((item) => {
		if (item === ServiceInfoVisibilityEnum.Project) {
			return marketplaceItem.projectId === project.id;
		}
		return item;
	});
	/**
	 *
	 * There can be services with multiple visibilities but only with one schema.
	 * [PROJECT, ORGANIZATION] => Default OAuth Connection - Organization
	 *
	 * In this case, the visibilities should be filtered to only include the one that mathces the schema.
	 *
	 * If the schema is Unsecured, the visibilities should be filtered to include only Organization and Public
	 * else, the visibilities should be filtered to include only the visibilities that match the schema name.
	 */
	if (connectionSchemas.length === 1 && filteredVisibilities.length > 1) {
		return filteredVisibilities.filter((v) => {
			const connectionSchemaName = connectionSchemas[0].name.toLowerCase();
			if (connectionSchemaName.includes("Unsecured".toLowerCase())) {
				return v === ServiceInfoVisibilityEnum.Organization || v === ServiceInfoVisibilityEnum.Public;
			}
			return connectionSchemaName.includes(v.toLowerCase());
		});
	}
	return filteredVisibilities;
};

const getInitialVisibility = (visibilities: string[] = []) => {
	if (visibilities.includes(ServiceInfoVisibilityEnum.Project)) {
		return ServiceInfoVisibilityEnum.Project;
	}
	if (visibilities.includes(ServiceInfoVisibilityEnum.Organization)) {
		return ServiceInfoVisibilityEnum.Organization;
	}
	return;
};

const getPossibleSchemas = (selectedVisibility: string, connectionSchemas: MarketplaceItemSchema[] = []) => {
	// Set the filtered schemas based on the selected visibility
	// organization and public visibilities can have
	// Oauth2, api key or unauthenaticated
	// project visibility can have only project
	const schemasFiltered = connectionSchemas.filter((schema) => {
		if (selectedVisibility.toLowerCase().includes("organization") || selectedVisibility.toLowerCase().includes("public")) {
			return schema.name.toLowerCase().includes(selectedVisibility.toLowerCase()) || schema.name.toLowerCase().includes("unsecured");
		}
		return schema.name.toLowerCase().includes("project");
	});
	return schemasFiltered;
};

export const CreateConnection: FC<Props> = ({ item, component, org, project, directoryFsPath, deploymentTrack, allItems = [], onCreate }) => {
	const queryClient = useQueryClient();

	const createConnectionSchema = z
		.object({
			name: z.string().min(1, "Required"),
			visibility: z.string().min(1, "Required"),
			schemaId: z.string().min(1, "Required"),
		})
		.partial()
		.superRefine(async (data, ctx) => {
			if (allItems.some((item) => item.name === data.name)) {
				ctx.addIssue({ path: ["name"], code: z.ZodIssueCode.custom, message: "Name already exists" });
			}
		});

	type CreateConnectionForm = z.infer<typeof createConnectionSchema>;

	const visibilities = getPossibleVisibilities(item, project);

	const form = useForm<CreateConnectionForm>({
		resolver: zodResolver(createConnectionSchema),
		mode: "all",
		defaultValues: {
			name: item.name,
			visibility: getInitialVisibility(visibilities),
			schemaId: "",
		},
	});

	const selectedVisibility = form.watch("visibility");

	const schemas = getPossibleSchemas(selectedVisibility, item.connectionSchemas);

	useEffect(() => {
		if (!schemas.some((item) => item.id === form.getValues("schemaId")) && schemas.length > 0) {
			form.setValue("schemaId", schemas[0].id);
		}
	}, [schemas]);

	const { mutate: createConnection, isLoading: isCreatingConnection } = useMutation({
		mutationFn: async (data: CreateConnectionForm) => {
			const req: CreateComponentConnectionReq = {
				componentId: component.metadata?.id,
				name: data.name,
				orgId: org.id?.toString(),
				orgUuid: org.uuid,
				projectId: project.id,
				serviceSchemaId: data.schemaId,
				serviceId: item.serviceId,
				serviceVisibility: data.visibility,
				componentType: getTypeForDisplayType(component?.spec?.type),
				componentPath: directoryFsPath,
				generateCreds: component?.spec?.type !== ComponentDisplayType.ByocWebAppDockerLess,
			};
			const created = await ChoreoWebViewAPI.getInstance().getChoreoRpcClient().createComponentConnection(req);

			if (created) {
				ChoreoWebViewAPI.getInstance().createLocalConnectionsConfig({
					componentDir: directoryFsPath,
					marketplaceItem: item,
					name: data.name,
					visibility: data.visibility,
				});
				onCreate(created);
				const connectionQueryKey = queryKeys.getComponentConnections(component, project, org);
				const connectionItems: ConnectionListItem[] = queryClient.getQueryData(connectionQueryKey) ?? [];
				queryClient.setQueryData(connectionQueryKey, [...connectionItems, { name: data.name }]);
				queryClient.refetchQueries({ exact: true, queryKey: queryKeys.getComponentConfigDraft(directoryFsPath, component, deploymentTrack?.branch) });
			}
		},
		onError: () => {
			ChoreoWebViewAPI.getInstance().showErrorMsg("Failed to create new connection");
		},
	});

	const onSubmit: SubmitHandler<CreateConnectionForm> = (data) => createConnection(data);

	return (
		<div className="flex flex-col gap-2 overflow-y-auto px-4 sm:px-6">
			<form className="grid gap-4">
				<TextField label="Name" required name="name" placeholder="connection-name" control={form.control} />
				<Dropdown
					label="Access Mode"
					key="visibility"
					required
					name="visibility"
					control={form.control}
					items={visibilities?.map((item) => ({ value: item, label: capitalizeFirstLetter(item.toLowerCase()) }))}
					disabled={visibilities?.length === 0}
				/>
				<Dropdown
					label="Authentication Scheme"
					key="schemaId"
					required
					name="schemaId"
					control={form.control}
					items={schemas.map((item) => ({ value: item.id, label: item.name }))}
					disabled={schemas?.length === 0}
				/>
				<div className="flex justify-end gap-3 pt-8 pb-4">
					<Button onClick={form.handleSubmit(onSubmit)} disabled={isCreatingConnection}>
						{isCreatingConnection ? "Creating..." : "Create"}
					</Button>
				</div>
			</form>
		</div>
	);
};
