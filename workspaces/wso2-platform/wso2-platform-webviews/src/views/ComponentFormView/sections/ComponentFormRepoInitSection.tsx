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
import { useMutation, useQuery } from "@tanstack/react-query";
import { RequiredFormInput } from "@wso2/ui-toolkit";
import { GitProvider, type NewComponentWebviewProps } from "@wso2/wso2-platform-core";
import React, { type FC, useEffect, useState } from "react";
import type { SubmitHandler, UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import { Banner } from "../../../components/Banner";
import { Button } from "../../../components/Button";
import { Dropdown } from "../../../components/FormElements/Dropdown";
import { TextField } from "../../../components/FormElements/TextField";
import { useGetAuthorizedGitOrgs, useGetGitBranches } from "../../../hooks/use-queries";
import { useExtWebviewContext } from "../../../providers/ext-vewview-ctx-provider";
import { ChoreoWebViewAPI } from "../../../utilities/vscode-webview-rpc";
import type { componentRepoInitSchema } from "../componentFormSchema";

type ComponentRepoInitSchemaType = z.infer<typeof componentRepoInitSchema>;

interface Props extends NewComponentWebviewProps {
	onNextClick: () => void;
	initializingRepo?: boolean;
	nextText: string;
	loadingNextText?: string;
	initialFormValues?: ComponentRepoInitSchemaType;
	form: UseFormReturn<ComponentRepoInitSchemaType>;
	componentType: string;
}

const connectMoreRepoText = "Connect More Repositories";
const createNewRpoText = "Create New Repository";

export const ComponentFormRepoInitSection: FC<Props> = ({ onNextClick, organization, form, nextText, loadingNextText, initializingRepo }) => {
	const [compDetailsSections] = useAutoAnimate();
	const { extensionName } = useExtWebviewContext();
	const [creatingRepo, setCreatingRepo] = useState(false);

	const orgName = form.watch("org");
	const repo = form.watch("repo");
	const repoError = form.formState?.errors?.repo;
	const repoName = [connectMoreRepoText, createNewRpoText].includes(repo) ? "" : repo;

	const { data: hasSubscriptions = false } = useQuery({
		queryKey: ["hasSubscriptions", { orgId: organization?.id }],
		queryFn: () => ChoreoWebViewAPI.getInstance().getChoreoRpcClient().getSubscriptions({ orgId: organization?.id?.toString() }),
		select: (data) => !!data.list?.length,
	});

	const {
		data: gitOrgs,
		isLoading: loadingGitOrgs,
		error: errorFetchingGitOrg,
	} = useGetAuthorizedGitOrgs(organization.id?.toString(), "", { refetchOnWindowFocus: true });
	const matchingOrgItem = gitOrgs?.gitOrgs?.find((item) => item.orgName === orgName);

	// todo: handle bitbucket and gitlab
	const provider = GitProvider.GITHUB;
	const repoUrl = matchingOrgItem && repoName && `https://github.com/${matchingOrgItem?.orgHandler}/${repoName}`;
	const credential = "";

	useEffect(() => {
		if (gitOrgs?.gitOrgs.length > 0 && form.getValues("org") === "") {
			form.setValue("org", gitOrgs?.gitOrgs[0]?.orgName);
		}
	}, [gitOrgs]);

	useEffect(() => {
		if (matchingOrgItem?.repositories.length > 0 && !matchingOrgItem?.repositories?.some((item) => item.name === form.getValues("repo"))) {
			setTimeout(() => form.setValue("repo", ""), 1000);
		}
		if (matchingOrgItem) {
			form.setValue("orgHandler", matchingOrgItem.orgHandler);
		}
	}, [matchingOrgItem]);

	const { data: branches = [], isLoading: isLoadingBranches } = useGetGitBranches(
		repoUrl,
		organization,
		provider === GitProvider.GITHUB ? "" : credential,
		!errorFetchingGitOrg,
		{
			enabled: !!repoName && !!provider && (provider === GitProvider.GITHUB ? !errorFetchingGitOrg : !!credential),
			refetchOnWindowFocus: true,
		},
	);

	useEffect(() => {
		if (branches?.length > 0 && !branches.includes(form.getValues("branch"))) {
			if (branches.includes("main")) {
				form.setValue("branch", "main", { shouldValidate: true });
			}
			if (branches.includes("master")) {
				form.setValue("branch", "master", { shouldValidate: true });
			} else {
				form.setValue("branch", branches[0], { shouldValidate: true });
			}
		}
	}, [branches]);

	useEffect(() => {
		// TODO: avoid using useEffect and try to override the onChange handler
		if (repo === createNewRpoText) {
			setTimeout(() => form.setValue("repo", ""), 1000);
			ChoreoWebViewAPI.getInstance().openExternal("https://github.com/new");
			setCreatingRepo(true);
		} else if (repo === connectMoreRepoText) {
			setTimeout(() => form.setValue("repo", ""), 1000);
			ChoreoWebViewAPI.getInstance().triggerGithubInstallFlow(organization.id?.toString());
		}
	}, [repo]);

	const { mutateAsync: getRepoMetadata, isLoading: isValidatingPath } = useMutation({
		mutationFn: (data: ComponentRepoInitSchemaType) => {
			const subPath = data.subPath.startsWith("/") ? data.subPath.slice(1) : data.subPath;
			return ChoreoWebViewAPI.getInstance().getChoreoRpcClient().getGitRepoMetadata({
				branch: data.branch,
				gitOrgName: data.org,
				gitRepoName: data.repo,
				relativePath: subPath,
				orgId: organization?.id?.toString()
			});
		},
	});

	const onSubmitForm: SubmitHandler<ComponentRepoInitSchemaType> = async (data) => {
		const resp = await getRepoMetadata(data);
		if(resp?.metadata && !resp?.metadata?.isSubPathEmpty){
			form.setError("subPath",{message:"Path is not empty"})
		}else{
			onNextClick()
		}
	};

	const repoDropdownItems = [{ value: connectMoreRepoText }, { value: createNewRpoText }];
	if (matchingOrgItem?.repositories?.length > 0) {
		repoDropdownItems.push(
			{ type: "separator", value: "" } as { value: string },
			...matchingOrgItem?.repositories?.map((item) => ({ value: item.name })),
		);
	}

	return (
		<>
			<div className="grid gap-4 md:grid-cols-2" ref={compDetailsSections}>
				<label className="col-span-full mb-4 opacity-80">You integration must exist in a remote Git repository in order to continue</label>
				{errorFetchingGitOrg && (
					<Banner
						type="error"
						className="col-span-full"
						key="invalid-repo-banner"
						title={`Please authorize ${extensionName} to access your GitHub repositories.`}
						actionLink={{ title: "Authorize", onClick: () => ChoreoWebViewAPI.getInstance().triggerGithubAuthFlow(organization.id?.toString()) }}
					/>
				)}
				<Dropdown
					label="Organization"
					key="gen-details-org"
					required
					name="org"
					control={form.control}
					items={gitOrgs?.gitOrgs?.map((item) => ({ value: item.orgName }))}
					loading={loadingGitOrgs}
				/>
				{creatingRepo ? (
					<div className="flex w-full flex-col" key="connect-repo-btn">
						<div className="flex justify-between gap-1">
							<span className="flex gap-1">
								<label className="font-light">{hasSubscriptions ? "Repository" : "Public Repository"}</label>
								<RequiredFormInput />
							</span>
							{repoError?.message && (
								<label className="line-clamp-1 flex-1 text-right text-vsc-errorForeground" title={repoError?.message}>
									{repoError?.message}
								</label>
							)}
						</div>
						<div className="grid grid-cols-1">
							<Button
								onClick={() => {
									ChoreoWebViewAPI.getInstance().triggerGithubInstallFlow(organization.id?.toString());
									setCreatingRepo(false);
								}}
								appearance="secondary"
							>
								{connectMoreRepoText}
							</Button>
						</div>
					</div>
				) : (
					<Dropdown
						label={hasSubscriptions ? "Repository" : "Public Repository"}
						key="gen-details-repo"
						required
						name="repo"
						control={form.control}
						items={repoDropdownItems}
						disabled={!matchingOrgItem}
					/>
				)}
				{repoName && (branches?.length > 0 || isLoadingBranches) && (
					<Dropdown
						label="Branch"
						key="gen-details-branch"
						required
						name="branch"
						control={form.control}
						items={branches}
						loading={isLoadingBranches}
					/>
				)}
				<TextField label="Path" key="gen-details-path" required name="subPath" placeholder="/directory-path" control={form.control} />
				<div className="col-span-full" key="gen-details-name-wrap">
					<TextField
						label="Name"
						key="gen-details-name"
						required
						name="name"
						placeholder={extensionName === "Devant" ? "integration-name" : "component-name"}
						control={form.control}
					/>
				</div>
			</div>

			<div className="flex justify-end gap-3 pt-6 pb-2">
				<Button onClick={form.handleSubmit(onSubmitForm)} disabled={isValidatingPath || initializingRepo}>
					{(isValidatingPath || initializingRepo) ? (loadingNextText ?? nextText) : nextText}
				</Button>
			</div>
		</>
	);
};
