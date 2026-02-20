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
import { type ComponentFormSectionProps, GitProvider, buildGitURL } from "@wso2/wso2-platform-core";
import classNames from "classnames";
import debounce from "lodash.debounce";
import React, { type FC, useCallback, useEffect, useState } from "react";
import type { SubmitHandler, UseFormReturn } from "react-hook-form";
import type { z } from "zod/v3";
import { Banner } from "../../../components/Banner";
import { Button } from "../../../components/Button";
import { Dropdown } from "../../../components/FormElements/Dropdown";
import { TextField } from "../../../components/FormElements/TextField";
import { useGetAuthorizedGitOrgs, useGetGitBranches } from "../../../hooks/use-queries";
import { useExtWebviewContext } from "../../../providers/ext-vewview-ctx-provider";
import { ChoreoWebViewAPI } from "../../../utilities/vscode-webview-rpc";
import type { componentRepoInitSchema } from "../componentFormSchema";

type ComponentRepoInitSchemaType = z.infer<typeof componentRepoInitSchema>;

interface Props extends ComponentFormSectionProps {
	onNextClick: () => void;
	initializingRepo?: boolean;
	initialFormValues?: ComponentRepoInitSchemaType;
	form: UseFormReturn<ComponentRepoInitSchemaType>;
	componentType: string;
}

const connectMoreRepoText = "Connect More Repositories";
const createNewRpoText = "Create New Repository";
const createNewCredText = "Create New Credential";
const addOrganization = "Add";

export const ComponentFormRepoInitSection: FC<Props> = ({ onNextClick, organization, form, initializingRepo }) => {
	const [compDetailsSections] = useAutoAnimate();
	const { extensionName } = useExtWebviewContext();
	const [creatingRepo, setCreatingRepo] = useState(false);

	const org = form.watch("org");
	const repo = form.watch("repo");
	const subPath = form.watch("subPath");
	const serverUrl = form.watch("serverUrl");
	const provider = form.watch("gitProvider");
	const credential = form.watch("credential");
	const orgName = [addOrganization].includes(org) ? "" : org;
	const repoName = [connectMoreRepoText, createNewRpoText].includes(repo) ? "" : repo;

	const {
		data: gitOrgs,
		isLoading: loadingGitOrgs,
		error: errorFetchingGitOrg,
	} = useGetAuthorizedGitOrgs(organization.id?.toString(), provider, credential, {
		refetchOnWindowFocus: true,
		enabled: provider === GitProvider.GITHUB || !!credential,
	});
	const matchingOrgItem = gitOrgs?.gitOrgs?.find((item) => item.orgName === orgName);

	const { data: gitCredentials = [], isLoading: isLoadingGitCred } = useQuery({
		queryKey: ["git-creds", { provider }],
		queryFn: () =>
			ChoreoWebViewAPI.getInstance().getChoreoRpcClient().getCredentials({ orgId: organization?.id?.toString(), orgUuid: organization.uuid }),
		select: (gitData) => gitData?.filter((item) => item.type === provider),
		refetchOnWindowFocus: true,
		enabled: provider !== GitProvider.GITHUB,
	});

	const { isLoading: isLoadingGitlabCreds } = useQuery({
		queryKey: ["gitlab-creds", { provider, credential }],
		queryFn: () =>
			ChoreoWebViewAPI.getInstance().getChoreoRpcClient().getCredentialDetails({
				orgId: organization?.id?.toString(),
				orgUuid: organization.uuid,
				credentialId: credential,
			}),
		enabled: provider === GitProvider.GITLAB_SERVER && !!credential,
		onSuccess: (data) => form.setValue("serverUrl", data?.serverUrl),
	});

	useEffect(() => {
		if (gitCredentials.length > 0 && (form.getValues("credential") || !gitCredentials.some((item) => item.id === form.getValues("credential")))) {
			form.setValue("credential", gitCredentials[0]?.id);
		} else if (gitCredentials.length === 0 && form.getValues("credential") !== "") {
			form.setValue("credential", "");
		}
	}, [gitCredentials]);

	const repoUrl = matchingOrgItem && repoName && buildGitURL(matchingOrgItem?.orgHandler, repoName, provider, false, serverUrl);
	useEffect(() => {
		if (gitOrgs?.gitOrgs.length > 0 && (form.getValues("org") === "" || !gitOrgs?.gitOrgs.some((item) => item.orgName === form.getValues("org")))) {
			form.setValue("org", gitOrgs?.gitOrgs[0]?.orgName);
		} else if (gitOrgs?.gitOrgs.length === 0 && form.getValues("org") !== "") {
			form.setValue("org", "");
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
			enabled: !!repoName && !!provider && !!repoUrl && (provider === GitProvider.GITHUB ? !errorFetchingGitOrg : !!credential),
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

	const handleCreateNewRepo = () => {
		let newRepoLink = "https://github.com/new";
		if (provider === GitProvider.BITBUCKET) {
			newRepoLink = `https://bitbucket.org/${orgName}/workspace/create/repository`;
		} else if (provider === GitProvider.GITLAB_SERVER) {
			newRepoLink = `${serverUrl}/projects/new`;
		}
		ChoreoWebViewAPI.getInstance().openExternal(newRepoLink);
		setCreatingRepo(true);
	};

	useEffect(() => {
		setCreatingRepo(false);
	}, [provider]);

	const debouncedUpdateName = useCallback(
		debounce((subPath: string, repo: string) => {
			if (subPath) {
				const paths = subPath.split("/");
				const lastPath = paths.findLast((item) => !!item);
				if (lastPath) {
					form.setValue("name", lastPath);
					return;
				}
			}
			if (repo) {
				form.setValue("name", repo);
				return;
			}
		}, 1000),
		[],
	);

	useEffect(() => {
		debouncedUpdateName(subPath, repo);
	}, [repo, subPath]);

	const { mutateAsync: getRepoMetadata, isLoading: isValidatingPath } = useMutation({
		mutationFn: (data: ComponentRepoInitSchemaType) => {
			const subPath = data.subPath.startsWith("/") ? data.subPath.slice(1) : data.subPath;
			return ChoreoWebViewAPI.getInstance()
				.getChoreoRpcClient()
				.getGitRepoMetadata({
					branch: data.branch,
					gitOrgName: data.org,
					gitRepoName: data.repo,
					relativePath: subPath,
					orgId: organization?.id?.toString(),
					secretRef: data.credential || "",
				});
		},
	});

	const onSubmitForm: SubmitHandler<ComponentRepoInitSchemaType> = async (data) => {
		try {
			const resp = await getRepoMetadata(data);
			if (resp?.metadata && !resp?.metadata?.isSubPathEmpty) {
				form.setError("subPath", { message: "Path isn't empty in the remote repo" });
			} else {
				onNextClick();
			}
		} catch {
			// the API will throw an error, if branch does not exist
			onNextClick();
		}
	};

	const repoDropdownItems = [{ value: createNewRpoText }];
	if (provider === GitProvider.GITHUB) {
		repoDropdownItems.push({ value: connectMoreRepoText });
	}
	if (matchingOrgItem?.repositories?.length > 0) {
		repoDropdownItems.push(
			{ type: "separator", value: "" } as { value: string },
			...matchingOrgItem?.repositories?.map((item) => ({ value: item.name })),
		);
	}

	const credentialDropdownItems = [{ value: createNewCredText }];
	if (gitCredentials?.length > 0) {
		credentialDropdownItems.push(
			{ type: "separator", value: "" } as { value: string },
			...gitCredentials?.map((item) => ({ value: item.id, label: item.name })),
		);
	}

	const orgDropdownItems = [];
	if (provider === GitProvider.GITHUB) {
		orgDropdownItems.push({ value: addOrganization }, { type: "separator", value: "" } as { value: string });
	}

	orgDropdownItems.push(...(gitOrgs?.gitOrgs ?? [])?.map((item) => ({ value: item.orgName })));

	return (
		<>
			<div className="grid gap-4 md:grid-cols-2" ref={compDetailsSections}>
				<label className="col-span-full mb-2 opacity-80">Your integration must exist in a remote Git repository in order to continue</label>
				<Dropdown
					label="Git Provider"
					key="gen-details-provider"
					required
					name="gitProvider"
					control={form.control}
					items={[
						{ label: "GitHub", value: GitProvider.GITHUB },
						{ label: "Bitbucket", value: GitProvider.BITBUCKET },
						{ label: "GitLab", value: GitProvider.GITLAB_SERVER },
					]}
					wrapClassName="col-span-full"
				/>
				{provider === GitProvider.GITHUB && errorFetchingGitOrg && (
					<Banner
						type="info"
						className="col-span-full"
						key="invalid-repo-banner"
						title={`Please authorize ${extensionName} to access your GitHub repositories.`}
						actionLink={{
							title: "Authorize",
							onClick: () => ChoreoWebViewAPI.getInstance().triggerGithubAuthFlow(organization.id?.toString()),
						}}
					/>
				)}
				{provider !== GitProvider.GITHUB && (
					<Dropdown
						label="Credentials"
						key="gen-details-credentials"
						required
						name="credential"
						control={form.control}
						items={credentialDropdownItems}
						loading={isLoadingGitCred}
						onChange={(e) => {
							const value = (e.target as HTMLSelectElement).value;
							if (credential === createNewCredText) {
								form.setValue("credential", "");
								ChoreoWebViewAPI.getInstance().openExternalChoreo(`organizations/${organization.handle}/settings/credentials`);
							} else {
								form.setValue("credential", value);
							}
						}}
					/>
				)}
				{(provider === GitProvider.GITHUB || credential) && (
					<>
						<Dropdown
							label="Organization"
							key="gen-details-org"
							required
							name="org"
							control={form.control}
							items={orgDropdownItems}
							loading={loadingGitOrgs || (provider === GitProvider.GITLAB_SERVER ? isLoadingGitlabCreds : false)}
							onChange={(e) => {
								const value = (e.target as HTMLSelectElement).value;
								if (value === addOrganization) {
									ChoreoWebViewAPI.getInstance().triggerGithubInstallFlow(organization.id?.toString());
									form.setValue("org", "");
								} else {
									form.setValue("org", value);
								}
							}}
						/>
						<div className="relative">
							<Dropdown
								label="Repository"
								key={"gen-details-repo"}
								required
								name="repo"
								control={form.control}
								items={repoDropdownItems}
								disabled={!matchingOrgItem}
								onChange={(e) => {
									const value = (e.target as HTMLSelectElement).value;
									if (value === createNewRpoText) {
										handleCreateNewRepo();
										form.setValue("repo", "");
									} else if (value === connectMoreRepoText) {
										ChoreoWebViewAPI.getInstance().triggerGithubInstallFlow(organization.id?.toString());
										form.setValue("repo", "");
									} else {
										form.setValue("repo", value);
									}
								}}
							/>
							<div
								className={classNames("w-full flex-col bg-vsc-panel-background", creatingRepo ? "absolute bottom-0 left-0 z-50 flex" : "hidden")}
								key="connect-repo-btn"
							>
								<div className="flex items-center gap-1">
									<Button
										onClick={() => {
											ChoreoWebViewAPI.getInstance().triggerGithubInstallFlow(organization.id?.toString());
											setCreatingRepo(false);
										}}
										appearance="secondary"
										className="flex-1"
									>
										Connect Newly Created Repository
									</Button>
									<Button onClick={() => setCreatingRepo(false)} appearance="icon">
										Cancel
									</Button>
								</div>
							</div>
						</div>

						{repoName && branches?.length > 0 && (
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
					</>
				)}

				<TextField label="Path" key="gen-details-path" required name="subPath" placeholder="/directory-path" control={form.control} />
				{repo && (
					<div className="col-span-full" key="gen-details-name-wrap">
						<TextField
							label={extensionName === "Devant" ? "Integration Name" : "Component Name"}
							key="gen-details-name"
							required
							name="name"
							placeholder={extensionName === "Devant" ? "integration-name" : "component-name"}
							control={form.control}
						/>
					</div>
				)}
			</div>

			<div className="flex justify-end gap-3 pt-6 pb-2">
				<Button onClick={form.handleSubmit(onSubmitForm)} disabled={isValidatingPath || initializingRepo}>
					{isValidatingPath || initializingRepo ? "Deploying..." : "Deploy"}
				</Button>
			</div>
		</>
	);
};
