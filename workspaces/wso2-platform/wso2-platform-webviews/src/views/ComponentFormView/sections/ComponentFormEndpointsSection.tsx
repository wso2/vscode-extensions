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
import { useQuery } from "@tanstack/react-query";
import { VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import { type ComponentFormSectionProps, EndpointType } from "@wso2/wso2-platform-core";
import React, { type FC, type ReactNode } from "react";
import { type SubmitHandler, type UseFieldArrayAppend, type UseFieldArrayRemove, type UseFormReturn, useFieldArray, useWatch } from "react-hook-form";
import type { z } from "zod/v3";
import { Button } from "../../../components/Button";
import { Codicon } from "../../../components/Codicon";
import { Divider } from "../../../components/Divider";
import { CheckBoxGroup } from "../../../components/FormElements/CheckBoxGroup";
import { Dropdown } from "../../../components/FormElements/Dropdown";
import { PathSelect } from "../../../components/FormElements/PathSelect";
import { TextField } from "../../../components/FormElements/TextField";
import { useCreateNewOpenApiFile, useGoToSource } from "../../../hooks/use-queries";
import { useExtWebviewContext } from "../../../providers/ext-vewview-ctx-provider";
import { ChoreoWebViewAPI } from "../../../utilities/vscode-webview-rpc";
import { type componentEndpointItemSchema, type componentEndpointsFormSchema, getOpenApiFiles, sampleEndpointItem } from "../componentFormSchema";

type ComponentFormEndpointsType = z.infer<typeof componentEndpointsFormSchema>;
type ComponentFormEndpointItemType = z.infer<typeof componentEndpointItemSchema>;

interface Props extends ComponentFormSectionProps {
	componentName: string;
	isSaving?: boolean;
	onNextClick: (data: ComponentFormEndpointsType) => void;
	onBackClick: () => void;
	form: UseFormReturn<ComponentFormEndpointsType>;
}

export const ComponentFormEndpointsSection: FC<Props> = ({
	directoryFsPath,
	directoryUriPath,
	componentName,
	onBackClick,
	onNextClick,
	isSaving,
	form,
}) => {
	const [endpointListRef] = useAutoAnimate();

	const watchedForm = useWatch({ control: form.control });

	const { fields: endpoints, append, remove } = useFieldArray({ name: "endpoints", control: form.control });

	const onSubmitForm: SubmitHandler<ComponentFormEndpointsType> = (data) => onNextClick(data);

	return (
		<div ref={endpointListRef}>
			{endpoints?.map((item, index) => (
				<ComponentEndpointItem
					key={item.id}
					append={append}
					remove={remove}
					endpoints={endpoints}
					form={form}
					index={index}
					item={{ ...watchedForm?.endpoints?.[index], id: item.id }}
					componentName={componentName}
					directoryFsPath={directoryFsPath}
					directoryUriPath={directoryUriPath}
				/>
			))}

			<div className="flex justify-end gap-3 pt-6 pb-2">
				<Button appearance="secondary" onClick={() => onBackClick()}>
					Back
				</Button>
				<Button onClick={form.handleSubmit(onSubmitForm)} disabled={isSaving}>
					{isSaving ? "Loading..." : "Next"}
				</Button>
			</div>
		</div>
	);
};

interface ComponentEndpointItemProps extends Pick<Props, "componentName" | "directoryFsPath" | "directoryUriPath"> {
	item: ComponentFormEndpointItemType & { id: string };
	endpoints: ComponentFormEndpointItemType[];
	form: UseFormReturn<ComponentFormEndpointsType>;
	index: number;
	append: UseFieldArrayAppend<ComponentFormEndpointsType, "endpoints">;
	remove: UseFieldArrayRemove;
}

const ComponentEndpointItem: FC<ComponentEndpointItemProps> = ({
	item,
	endpoints,
	form,
	index,
	componentName,
	append,
	remove,
	directoryFsPath,
	directoryUriPath,
}) => {
	const [endpointListItemRef] = useAutoAnimate();
	const { extensionName } = useExtWebviewContext();

	const { createNewOpenApiFile } = useCreateNewOpenApiFile({
		directoryFsPath,
		onSuccess: (subPath) => form.setValue(`endpoints.${index}.schemaFilePath`, subPath, { shouldValidate: true }),
	});

	// automatically detect open api files and select if only one available within the selected directory
	useQuery({
		queryKey: ["get-possible-openapi-schemas", { directoryFsPath }],
		queryFn: async () => getOpenApiFiles(directoryFsPath),
		onSuccess: async (fileNames) => {
			if (fileNames.length === 1) {
				if (form.getValues(`endpoints.${index}.schemaFilePath`) === "") {
					form.setValue(`endpoints.${index}.schemaFilePath`, fileNames[0], { shouldValidate: true });
				} else {
					const schemaFullPath = await ChoreoWebViewAPI.getInstance().joinFsFilePaths([
						directoryFsPath,
						form.getValues(`endpoints.${index}.schemaFilePath`),
					]);
					const fileExists = await ChoreoWebViewAPI.getInstance().fileExist(schemaFullPath);
					if (!fileExists) {
						form.setValue(`endpoints.${index}.schemaFilePath`, "");
					}
				}
			}
		},
	});

	const { openFile } = useGoToSource();

	const fields: ReactNode[] = [
		<TextField
			label="Endpoint Name"
			required
			key="ep-name"
			name={`endpoints.${index}.name`}
			placeholder={extensionName === "Devant" ? "integration-name" : "component-name"}
			control={form.control}
			wrapClassName="col-span-2"
		/>,
		<TextField
			label="Port"
			required
			key="ep-port"
			name={`endpoints.${index}.port`}
			control={form.control}
			placeholder="8080"
			wrapClassName="col-span-2"
		/>,
		<Dropdown
			label="Type"
			required
			name={`endpoints.${index}.type`}
			key="ep-type"
			items={[
				{ value: EndpointType.REST },
				{ value: EndpointType.GraphQL },
				{ value: EndpointType.GRPC },
				{ value: EndpointType.TCP },
				{ value: EndpointType.UDP },
			]}
			control={form.control}
		/>,
	];

	if (item.type === EndpointType.REST || item.type === EndpointType.GraphQL) {
		fields.push(<TextField label="Base Path" required name={`endpoints.${index}.context`} key="ep-context" placeholder="/" control={form.control} />);
	}

	fields.push(
		<CheckBoxGroup
			label="Network Visibilities"
			wrapClassName="col-span-2"
			name={`endpoints.${index}.networkVisibilities`}
			key="ep-visibility"
			items={["Public", "Organization", "Project"]}
			control={form.control}
		/>,
	);

	if (item.type === EndpointType.REST) {
		fields.push(
			<div key="ep-schema" className="col-span-2 md:col-span-4">
				<PathSelect
					name={`endpoints.${index}.schemaFilePath`}
					label="Schema File Path"
					required
					control={form.control}
					baseUriPath={directoryUriPath}
					type="file"
					promptTitle="Select Schema File Path"
				/>
				{item.schemaFilePath && (
					<VSCodeLink
						className="mt-0.5 font-semibold text-[11px] text-vsc-foreground"
						onClick={() => openFile([directoryFsPath, item.schemaFilePath])}
					>
						Edit Schema File
					</VSCodeLink>
				)}
				{!item.schemaFilePath && item.type === EndpointType.REST && (
					<VSCodeLink className="mt-0.5 font-semibold text-[11px] text-vsc-foreground" onClick={() => createNewOpenApiFile()}>
						Create new OpenAPI schema file
					</VSCodeLink>
				)}
			</div>,
		);
	}

	return (
		<div key={item.id}>
			<div className="grid grid-cols-2 gap-4 md:grid-cols-4" ref={endpointListItemRef}>
				{fields}
			</div>

			<div className="mt-4 flex flex-1 gap-3">
				{endpoints.length > 1 && (
					<Button appearance="icon" className="hover:text-vsc-errorForeground" onClick={() => remove(index)}>
						<Codicon name="trash" className="mr-1" />
						Remove
					</Button>
				)}
				{index === endpoints.length - 1 && (
					<Button
						appearance="icon"
						onClick={() => {
							let tempIndex = endpoints.length;
							while (endpoints.some((item) => item.name === `${componentName} ${tempIndex}`)) {
								tempIndex++;
							}
							append({ ...sampleEndpointItem, name: `${componentName} ${tempIndex}` });
						}}
					>
						<Codicon name="plus" className="mr-1" />
						Add Another
					</Button>
				)}
			</div>

			{endpoints.length > 1 && index < endpoints.length - 1 && <Divider className="mt-2 mb-6" />}
		</div>
	);
};
