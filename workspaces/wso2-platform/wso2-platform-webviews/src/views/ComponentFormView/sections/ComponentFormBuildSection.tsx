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
import {
	ChoreoBuildPackNames,
	ChoreoComponentType,
	type ComponentFormSectionProps,
	WebAppSPATypes,
} from "@wso2/wso2-platform-core";
import React, { type FC, type ReactNode, useEffect } from "react";
import type { SubmitHandler, UseFormReturn } from "react-hook-form";
import type { z } from "zod/v3";
import { Button } from "../../../components/Button";
import { CheckBox } from "../../../components/FormElements/CheckBox";
import { Dropdown } from "../../../components/FormElements/Dropdown";
import { PathSelect } from "../../../components/FormElements/PathSelect";
import { TextField } from "../../../components/FormElements/TextField";
import { useGetBuildPacks } from "../../../hooks/use-queries";
import { useExtWebviewContext } from "../../../providers/ext-vewview-ctx-provider";
import { ChoreoWebViewAPI } from "../../../utilities/vscode-webview-rpc";
import { type componentBuildDetailsSchema, getPossibleBuildPack } from "../componentFormSchema";

type ComponentFormBuildDetailsType = z.infer<typeof componentBuildDetailsSchema>;

interface Props extends ComponentFormSectionProps {
	selectedType: string;
	baseUriPath: string;
	onNextClick: () => void;
	onBackClick: () => void;
	form: UseFormReturn<ComponentFormBuildDetailsType>;
	gitRoot: string;
	subPath: string;
}

export const ComponentFormBuildSection: FC<Props> = (props) => {
	const { onBackClick, onNextClick, initialValues, gitRoot, subPath, organization, selectedType, form, directoryFsPath } = props;
	const { extensionName } = useExtWebviewContext();

	const [buildConfigSections] = useAutoAnimate();

	const { isLoading: isLoadingBuildPacks, data: buildpacks = [] } = useGetBuildPacks(selectedType, organization, {
		enabled: !!selectedType,
	});

	useQuery({
		queryKey: ["set-possible-build-pack", { buildpacks, directoryFsPath }],
		queryFn: async (): Promise<null> => {
			const possiblePack = await getPossibleBuildPack(directoryFsPath, buildpacks);
			const selectedLang = form.getValues("buildPackLang");
			if (buildpacks.length > 0 && (!selectedLang || !buildpacks.find((item) => item.language === selectedLang))) {
				form.setValue("buildPackLang", possiblePack || "");
				form.setValue("langVersion", "");
			}
			return null;
		},
		enabled: buildpacks?.length > 0,
	});

	// automatically set dockerfile path
	useQuery({
		queryKey: ["set-dockerfile", { buildpacks, gitRoot, subPath }],
		queryFn: async (): Promise<null> => {
			if (form.getValues("dockerFile") === "") {
				const dockerFileFullPath = await ChoreoWebViewAPI.getInstance().joinFsFilePaths([gitRoot, subPath, "Dockerfile"]);
				const dockerFileExists = await ChoreoWebViewAPI.getInstance().fileExist(dockerFileFullPath);
				if (dockerFileExists) {
					const dockerFilePath = await ChoreoWebViewAPI.getInstance().joinFsFilePaths([subPath, "Dockerfile"]);
					form.setValue("dockerFile", dockerFilePath, { shouldValidate: true });
				}
			} else {
				const dockerFilePreviousPath = await ChoreoWebViewAPI.getInstance().joinFsFilePaths([gitRoot, form.getValues("dockerFile")]);
				const dockerFilePreviousExists = await ChoreoWebViewAPI.getInstance().fileExist(dockerFilePreviousPath);
				if (!dockerFilePreviousExists) {
					const dockerFileFullPath = await ChoreoWebViewAPI.getInstance().joinFsFilePaths([gitRoot, subPath, "Dockerfile"]);
					const dockerFileExists = await ChoreoWebViewAPI.getInstance().fileExist(dockerFileFullPath);
					if (dockerFileExists) {
						const dockerFilePath = await ChoreoWebViewAPI.getInstance().joinFsFilePaths([subPath, "Dockerfile"]);
						form.setValue("dockerFile", dockerFilePath, { shouldValidate: true });
					} else {
						form.setValue("dockerFile", "");
					}
				}
			}
			return null;
		},
		enabled: buildpacks?.length > 0,
	});

	const selectedLang = form.watch("buildPackLang");

	const selectedBuildPack = buildpacks?.find((item) => item.language === selectedLang);

	const supportedVersions: string[] = selectedBuildPack?.supportedVersions?.split(",")?.reverse() ?? [];

	useEffect(() => {
		if (supportedVersions.length > 0 && (!form.getValues("langVersion") || !supportedVersions.includes(form.getValues("langVersion")))) {
			setTimeout(() => {
				form.setValue("langVersion", supportedVersions[0], { shouldValidate: true });
			}, 100);
		}
	}, [supportedVersions]);

	const onSubmitForm: SubmitHandler<ComponentFormBuildDetailsType> = () => onNextClick();

	const buildConfigs: ReactNode[] = [];
	if ([ChoreoBuildPackNames.StaticFiles, ChoreoBuildPackNames.Prism].includes(selectedLang as ChoreoBuildPackNames)) {
		// do nothing
	} else if ([ChoreoBuildPackNames.MicroIntegrator, ChoreoBuildPackNames.Ballerina].includes(selectedLang as ChoreoBuildPackNames)) {
		if (selectedType === ChoreoComponentType.Service) {
			buildConfigs.push(
				<CheckBox
					control={form.control}
					className="col-span-full"
					name="useDefaultEndpoints"
					label="Use Default Endpoint Configuration"
					key="use-default-endpoints"
				/>,
			);
		}
	} else if (selectedLang === ChoreoBuildPackNames.Docker) {
		buildConfigs.push(
			<PathSelect
				name="dockerFile"
				label="Dockerfile path"
				required
				control={form.control}
				// todo: check this in windows
				baseUriPath={gitRoot}
				type="file"
				key="docker-path"
				promptTitle="Select Dockerfile"
				wrapClassName="col-span-full"
			/>,
		);
		if (selectedType === ChoreoComponentType.WebApplication) {
			buildConfigs.push(<TextField label="Port" key="webAppPort" required name="webAppPort" control={form.control} />);
		}
	} else if (WebAppSPATypes.includes(selectedLang as ChoreoBuildPackNames)) {
		buildConfigs.push(
			<TextField label="Node Version" key="node-version" required name="spaNodeVersion" control={form.control} placeholder="Eg: 18, 18.1.2" />,
		);
		buildConfigs.push(
			<TextField
				label="Build Command"
				key="build-command"
				required
				name="spaBuildCommand"
				control={form.control}
				placeholder="npm run build / yarn build"
			/>,
		);
		buildConfigs.push(
			<TextField label="Build Output Directory" key="spa-out-dir" required name="spaOutputDir" control={form.control} placeholder="build" />,
		);
	} else if (selectedLang) {
		// Build pack type
		buildConfigs.push(
			<Dropdown
				label="Language Version"
				key="lang-version"
				required
				name="langVersion"
				control={form.control}
				items={supportedVersions}
				disabled={supportedVersions?.length === 0}
			/>,
		);

		if (selectedType === ChoreoComponentType.WebApplication) {
			buildConfigs.push(<TextField label="Port" key="webAppPort" required name="webAppPort" control={form.control} placeholder="8080" />);
		}
	}

	// TODO: handle prism mock build pack type

	return (
		<>
			<div className="grid gap-4 md:grid-cols-2" ref={buildConfigSections}>
				<Dropdown
					label={extensionName === "Devant" ? "Technology" : "Build Pack"}
					required
					name="buildPackLang"
					wrapClassName="col-span-full"
					control={form.control}
					items={buildpacks?.map((item) => ({
						label: item.displayName,
						value: item.language,
					}))}
					loading={isLoadingBuildPacks}
					disabled={buildpacks.length === 0 || !!initialValues?.buildPackLang}
				/>
				{buildConfigs}
				{/** TODO: enable autoBuildOnCommit once its stable */}
				{/* {selectedType !== ChoreoComponentType.ApiProxy && (
					<CheckBox
						control={form.control}
						className="col-span-full"
						name="autoBuildOnCommit"
						label="Auto Trigger Build on New Commit"
						key="auto-build-on-trigger"
					/>
				)} */}
			</div>

			<div className="flex justify-end gap-3 pt-6 pb-2">
				<Button appearance="secondary" onClick={() => onBackClick()}>
					Back
				</Button>
				<Button onClick={form.handleSubmit(onSubmitForm)} disabled={isLoadingBuildPacks}>
					Next
				</Button>
			</div>
		</>
	);
};
