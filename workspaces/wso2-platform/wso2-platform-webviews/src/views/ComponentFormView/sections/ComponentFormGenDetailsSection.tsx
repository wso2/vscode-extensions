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
import { GitProvider, type NewComponentWebviewProps, parseGitURL, toSentenceCase } from "@wso2/wso2-platform-core";
import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import classnames from "classnames";
import React, { type FC, type ReactNode, useEffect, useState } from "react";
import type { SubmitHandler, UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";
import type { z } from "zod";
import { Banner } from "../../../components/Banner";
import { Button } from "../../../components/Button";
import { ConnectRepoCard } from "../../../components/ConnectRepoCard";
import { Dropdown } from "../../../components/FormElements/Dropdown";
import { FormElementWrap } from "../../../components/FormElements/FormElementWrap";
import { TextField } from "../../../components/FormElements/TextField";
import { useGetGitBranches } from "../../../hooks/use-queries";
import { useExtWebviewContext } from "../../../providers/ext-vewview-ctx-provider";
import { ChoreoWebViewAPI } from "../../../utilities/vscode-webview-rpc";
import type { componentGeneralDetailsSchema } from "../componentFormSchema";

// Helper function to generate URL-safe integration name from display name
const generateIntegrationName = (displayName: string): string => {
	return displayName
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '') // Only allow lowercase letters, digits, and hyphens
		.replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
		.replace(/-+/g, '-'); // Replace multiple consecutive hyphens with single hyphen
};

// Helper function to extract display name from repository name
const extractDisplayName = (repoName: string): string => {
	return repoName
		.replace(/[-_]/g, ' ')
		.replace(/\b\w/g, (char) => char.toUpperCase());
};

type ComponentFormGenDetailsType = z.infer<typeof componentGeneralDetailsSchema>;

interface Props extends NewComponentWebviewProps {
	onNextClick: () => void;
	initialFormValues?: ComponentFormGenDetailsType;
	form: UseFormReturn<ComponentFormGenDetailsType>;
	componentType: string;
}

export const ComponentFormGenDetailsSection: FC<Props> = ({ onNextClick, organization, directoryFsPath, form }) => {
	const [compDetailsSections] = useAutoAnimate();
	const { extensionName } = useExtWebviewContext();
	const [selectedRepository, setSelectedRepository] = useState<any>(null);
	const [isCheckingNameUniqueness, setIsCheckingNameUniqueness] = useState(false);
	const [integrationNameError, setIntegrationNameError] = useState<string>("");

	const repoUrl = form.watch("repoUrl");
	const credential = form.watch("credential");
	const provider = form.watch("gitProvider");
	const displayName = form.watch("displayName");
	const integrationName = form.watch("integrationName");

	// Validate integration name format
	const validateIntegrationName = (name: string) => {
		if (!name || name.length === 0) {
			setIntegrationNameError("");
			return true;
		}
		
		// Check for invalid characters - only lowercase letters, digits, and hyphens allowed
		if (!/^[a-z0-9-]+$/.test(name)) {
			setIntegrationNameError("You can only use lowercase letters, digits, or hyphens");
			return false;
		}
		
		// Check minimum length
		if (name.length < 3) {
			setIntegrationNameError("Integration name must be at least 3 characters");
			return false;
		}
		
		// Check that it doesn't start or end with hyphens
		if (name.startsWith('-') || name.endsWith('-')) {
			setIntegrationNameError("Integration name cannot start or end with hyphens");
			return false;
		}
		
		setIntegrationNameError("");
		return true;
	};

	// Check integration name uniqueness
	const checkIntegrationNameUniqueness = async (name: string) => {
		if (!name || name.length === 0) {
			return true;
		}
		
		if (!validateIntegrationName(name)) {
			return false;
		}
		
		setIsCheckingNameUniqueness(true);
		
		try {
			// TODO: Replace with actual API call to check uniqueness
			// For now, simulate a check that passes
			await new Promise(resolve => setTimeout(resolve, 500));
			
			return true;
		} catch (error) {
			console.error("Error checking component name uniqueness:", error);
			setIntegrationNameError("Failed to check name availability");
			return false;
		} finally {
			setIsCheckingNameUniqueness(false);
		}
	};

	// Handle repository selection and update display name
	const handleRepositorySelect = (repository: any) => {
		setSelectedRepository(repository);
		if (repository?.name) {
			const newDisplayName = extractDisplayName(repository.name);
			form.setValue("displayName", newDisplayName, { shouldValidate: true });
			
			// Auto-generate integration name from display name
			const newIntegrationName = generateIntegrationName(newDisplayName);
			form.setValue("integrationName", newIntegrationName, { shouldValidate: true });
		}
	};

	// Check integration name uniqueness when it changes
	useEffect(() => {
		if (integrationName && integrationName.length > 0) {
			if (!validateIntegrationName(integrationName)) {
				return;
			}
			
			const timeoutId = setTimeout(() => {
				checkIntegrationNameUniqueness(integrationName);
			}, 500); // Debounce for 500ms

			return () => clearTimeout(timeoutId);
		} else {
			setIntegrationNameError("");
		}
	}, [integrationName]);

	useEffect(() => {
		if (integrationName !== undefined && integrationName !== null) {
			validateIntegrationName(integrationName);
		}
	}, [integrationName]);

	// Watch for form validation state and provide feedback
	useEffect(() => {
		const subscription = form.watch((value, { name }) => {
			if (name === "displayName" && value.displayName) {
				// Auto-generate integration name when display name changes
				const newIntegrationName = generateIntegrationName(value.displayName);
				if (form.getValues("integrationName") !== newIntegrationName) {
					form.setValue("integrationName", newIntegrationName, { shouldValidate: true });
				}
			}
		});
		return () => subscription.unsubscribe();
	}, [form]);

	const {
		data: gitData,
		isLoading: isLoadingGitData,
		refetch: refetchGitData,
	} = useQuery({
		queryKey: ["git-data", { directoryFsPath }],
		queryFn: async () => {
			const gitData = await ChoreoWebViewAPI.getInstance().getLocalGitData(directoryFsPath);
			return gitData ?? null;
		},
		refetchOnWindowFocus: true,
		cacheTime: 0,
	});

	useEffect(() => {
		const parsedRepo = parseGitURL(repoUrl);
		if (parsedRepo && form.getValues("gitProvider") !== parsedRepo[2]) {
			form.setValue("gitProvider", parsedRepo[2]);
		}
	}, [repoUrl]);

	const {
		data: gitCredentials = [],
		isLoading: isLoadingGitCred,
		refetch: refetchGitCred,
		isFetching: isFetchingGitCred,
	} = useQuery({
		queryKey: ["git-creds", { provider }],
		queryFn: () =>
			ChoreoWebViewAPI.getInstance().getChoreoRpcClient().getCredentials({ orgId: organization?.id?.toString(), orgUuid: organization.uuid }),
		select: (gitData) => gitData?.filter((item) => item.type === provider),
		refetchOnWindowFocus: true,
		enabled: !!provider && provider !== GitProvider.GITHUB,
	});

	useEffect(() => {
		if (gitCredentials.length > 0 && (form.getValues("credential") || !gitCredentials.some((item) => item.id === form.getValues("credential")))) {
			form.setValue("credential", gitCredentials[0]?.id);
		}
	}, [gitCredentials]);

	const { data: subPath } = useQuery({
		queryKey: ["sub-path", { gitRoot: gitData?.gitRoot }],
		queryFn: () => ChoreoWebViewAPI.getInstance().getSubPath({ subPath: directoryFsPath, parentPath: gitData?.gitRoot }),
		enabled: !!gitData?.gitRoot,
	});

	useEffect(() => {
		if (gitData?.remotes?.length > 0 && !gitData?.remotes.includes(form.getValues("repoUrl"))) {
			if (gitData?.upstream?.remoteUrl) {
				form.setValue("repoUrl", gitData?.upstream?.remoteUrl, { shouldValidate: true });
			} else {
				form.setValue("repoUrl", gitData?.remotes[0], { shouldValidate: true });
			}
		}
		if (gitData?.gitRoot) {
			form.setValue("gitRoot", gitData?.gitRoot);
		}
	}, [gitData]);

	useEffect(() => {
		form.setValue("subPath", subPath || "");
	}, [subPath]);

	useEffect(() => {
		if (extensionName === "Devant") {
			// Set default values if not already set
			if (!form.getValues("displayName")) {
				form.setValue("displayName", "");
			}
			if (!form.getValues("integrationName")) {
				form.setValue("integrationName", "");
			}
		}
	}, [extensionName, form]);

	const {
		isFetching: isFetchingRepoAccess,
		data: isRepoAuthorizedResp,
		refetch: refetchRepoAccess,
	} = useQuery({
		queryKey: ["git-repo-access", { repo: repoUrl, orgId: organization?.id, provider }],
		queryFn: () =>
			ChoreoWebViewAPI.getInstance()
				.getChoreoRpcClient()
				.isRepoAuthorized({
					repoUrl: repoUrl,
					orgId: organization.id.toString(),
					credRef: provider !== GitProvider.GITHUB ? credential : "",
				}),
		enabled: !!repoUrl && !!provider && (provider !== GitProvider.GITHUB ? !!credential : true),
		refetchOnWindowFocus: true,
	});

	const {
		isLoading: isLoadingBranches,
		data: branches = [],
		refetch: refetchBranches,
		isFetching: isFetchingBranches,
	} = useGetGitBranches(repoUrl, organization.id?.toString() || "", provider === GitProvider.GITHUB ? "" : credential, isRepoAuthorizedResp?.isAccessible, {
		enabled: !!repoUrl && !!provider && (provider === GitProvider.GITHUB ? !!isRepoAuthorizedResp?.isAccessible : !!credential),
		refetchOnWindowFocus: true,
	});

	useEffect(() => {
		if (branches?.length > 0 && (!form.getValues("branch") || !branches.includes(form.getValues("branch")))) {
			if (branches.includes(gitData.upstream?.name)) {
				form.setValue("branch", gitData.upstream?.name, { shouldValidate: true });
			} else if (branches.includes("main")) {
				form.setValue("branch", "main", { shouldValidate: true });
			} else if (branches.includes("master")) {
				form.setValue("branch", "master", { shouldValidate: true });
			} else {
				form.setValue("branch", branches[0], { shouldValidate: true });
			}
		}
	}, [branches, gitData]);

	const onSubmitForm: SubmitHandler<ComponentFormGenDetailsType> = () => onNextClick();

	const { mutate: openSourceControl } = useMutation({
		mutationFn: () => ChoreoWebViewAPI.getInstance().triggerCmd("workbench.scm.focus"),
		onSuccess: () => refetchGitData(),
	});

	const { mutate: pushChanges } = useMutation({
		mutationFn: () => ChoreoWebViewAPI.getInstance().triggerCmd("git.push"),
		onSuccess: () => refetchGitData(),
	});

	let invalidRepoMsg: ReactNode = "";
	let invalidRepoAction = "";
	let invalidRepoBannerType: "error" | "warning" | "info" = "warning";
	let onInvalidRepoActionClick: () => void;
	let onInvalidRepoRefreshClick: () => void;
	let onInvalidRepoRefreshing: boolean;

	if (!isLoadingGitData) {
		if (gitData === null) {
			invalidRepoMsg = "Please initialize the selected directory as a Git repository to proceed.";
			invalidRepoAction = "Source Control";
			onInvalidRepoActionClick = openSourceControl;
			onInvalidRepoRefreshClick = refetchGitData;
		} else if (gitData?.remotes?.length === 0) {
			invalidRepoMsg = "The selected Git repository has no configured remotes. Please add a remote to proceed.";
			invalidRepoAction = "Source Control";
			onInvalidRepoActionClick = openSourceControl;
			onInvalidRepoRefreshClick = refetchGitData;
		}
	}

	if (!invalidRepoMsg && provider && provider !== GitProvider.GITHUB && !isLoadingGitCred && gitCredentials?.length === 0) {
		onInvalidRepoActionClick = () => ChoreoWebViewAPI.getInstance().openExternalChoreo(`organizations/${organization.handle}/settings/credentials`);
		invalidRepoMsg = `${toSentenceCase(provider)} credentials needs to be configured.`;
		invalidRepoAction = "Configure Credentials";
		onInvalidRepoRefreshClick = refetchGitCred;
		onInvalidRepoRefreshing = isFetchingGitCred;
	}

	if (!invalidRepoMsg && repoUrl && !isRepoAuthorizedResp?.isAccessible && provider) {
		if (provider === GitProvider.GITHUB) {
			if (isRepoAuthorizedResp?.retrievedRepos) {
				invalidRepoMsg = (
					<span>
						{extensionName} lacks access to the selected repository.{" "}
						<span className="font-thin">(Only public repos are allowed within the free tier.)</span>
					</span>
				);
				invalidRepoAction = "Grant Access";
				onInvalidRepoActionClick = () => ChoreoWebViewAPI.getInstance().triggerGithubInstallFlow(organization.id?.toString());
			} else {
				invalidRepoMsg = `Please authorize ${extensionName} to access your GitHub repositories.`;
				invalidRepoAction = "Authorize";
				onInvalidRepoActionClick = () => ChoreoWebViewAPI.getInstance().triggerGithubAuthFlow(organization.id?.toString());
				invalidRepoBannerType = "info";
			}
		} else {
			onInvalidRepoActionClick = () => ChoreoWebViewAPI.getInstance().openExternalChoreo(`organizations/${organization.handle}/settings/credentials`);
			if (isRepoAuthorizedResp?.retrievedRepos) {
				invalidRepoMsg = (
					<span>
						Selected Credential does not have sufficient permissions.{" "}
						<span className="font-thin">(Only public repos are allowed within the free tier.)</span>
					</span>
				);
				invalidRepoAction = "Manage Credentials";
			} else {
				invalidRepoMsg = `Failed to retrieve ${toSentenceCase(provider)} repositories using the selected credential.`;
				invalidRepoAction = "Manage Credentials";
			}
		}

		onInvalidRepoRefreshClick = refetchRepoAccess;
		onInvalidRepoRefreshing = isFetchingRepoAccess;
	}

	if (extensionName === "Devant") {
		
		const isNextButtonDisabled = !!invalidRepoMsg || branches?.length === 0;
		
		return (
			<>
				<ConnectRepoCard
					organizationId={organization.id?.toString() || ""}
					className="mb-6"
					repoAuthStatus={isRepoAuthorizedResp}
					onRepositorySelect={handleRepositorySelect}
				/>
				
				<div className="grid gap-4 md:grid-cols-2">
					<TextField
						label="Display Name"
						key="devant-display-name"
						required
						name="displayName"
						placeholder="My Integration"
						control={form.control}
						wrapClassName="col-span-1"
					/>
					<Controller
						name="integrationName"
						control={form.control}
						render={({ field, fieldState }) => (
							<div className="col-span-1">
								<FormElementWrap 
									label="Name" 
									required 
									loading={isCheckingNameUniqueness} 
									wrapClassName="mb-1"
								>
									<VSCodeTextField
										onInput={field.onChange}
										className={classnames(
											"w-full border-[0.5px]", 
											(integrationNameError || fieldState.error) 
												? "border-vsc-errorForeground" 
												: "border-transparent"
										)}
										placeholder="my-integration"
										{...field}
									/>
								</FormElementWrap>
								{(integrationNameError || fieldState.error?.message) && (
									<div className="flex items-center gap-1 text-xs text-vsc-errorForeground mt-1">
										<svg 
											className="w-3 h-3 flex-shrink-0" 
											fill="none" 
											stroke="currentColor" 
											strokeWidth="2" 
											viewBox="0 0 16 16"
										>
											<circle cx="8" cy="8" r="7" />
											<path d="M8 4v4M8 12h.01" strokeLinecap="round" strokeLinejoin="round" />
										</svg>
										<span>
											{integrationNameError || fieldState.error?.message}
										</span>
									</div>
								)}
							</div>
						)}
					/>
				</div>

				<div className="flex justify-end gap-3 pt-6 pb-2">
					<Button 
						onClick={form.handleSubmit(onSubmitForm)} 
						disabled={
							isCheckingNameUniqueness || 
							!displayName || 
							!integrationName || 
							!!integrationNameError
						}
					>
						Push
					</Button>
				</div>
			</>
		);
	}

	return (
		<>
			<div className="grid gap-4 md:grid-cols-2" ref={compDetailsSections}>
				<TextField
					label="Name"
					key="gen-details-name"
					required
					name="name"
					// placeholder={extensionName === "Devant" ? "integration-name" : "component-name"}
					placeholder={"component-name"}
					control={form.control}
					wrapClassName="col-span-full"
				/>
				{gitData?.remotes?.length > 0 && (
					<Dropdown
						label="Repository"
						key="gen-details-repo"
						required
						name="repoUrl"
						control={form.control}
						items={gitData?.remotes}
						loading={isLoadingGitData}
					/>
				)}
				{repoUrl && ![GitProvider.GITHUB, GitProvider.BITBUCKET].includes(provider as GitProvider) && (
					<Dropdown
						label="Git Provider"
						key="gitProvider"
						required
						name="gitProvider"
						control={form.control}
						items={[{ value: GitProvider.GITLAB_SERVER, label: "GitLab" }]}
						loading={isLoadingGitData}
					/>
				)}
				{provider && provider !== GitProvider.GITHUB && gitCredentials?.length > 0 && (
					<Dropdown
						label={`${toSentenceCase(provider).replaceAll("-", " ")} Credential`}
						key="gen-details-cred"
						required
						name="credential"
						control={form.control}
						items={gitCredentials?.map((item) => ({ value: item.id, label: item.name }))}
						loading={isLoadingGitCred}
					/>
				)}
				{!invalidRepoMsg && (
					<Dropdown
						label="Branch"
						key="gen-details-branch"
						required
						name="branch"
						control={form.control}
						items={branches}
						loading={isLoadingBranches}
						disabled={branches?.length === 0}
					/>
				)}
				{invalidRepoMsg && (
					<Banner
						type={invalidRepoBannerType}
						className="col-span-full md:order-last"
						key="invalid-repo-banner"
						title={invalidRepoMsg}
						actionLink={invalidRepoAction && onInvalidRepoActionClick ? { title: invalidRepoAction, onClick: onInvalidRepoActionClick } : undefined}
						refreshBtn={onInvalidRepoRefreshClick ? { onClick: onInvalidRepoRefreshClick, isRefreshing: onInvalidRepoRefreshing } : undefined}
					/>
				)}
				{!invalidRepoMsg && !isLoadingBranches && branches?.length === 0 && (
					<Banner
						type="warning"
						key="no-branches-banner"
						className="col-span-full md:order-last"
						title={"The selected remote repository has no branches. Please publish your local branch to the remote repository."}
						refreshBtn={{ onClick: refetchBranches, isRefreshing: isFetchingBranches }}
						actionLink={{ title: "Push Changes", onClick: pushChanges }}
					/>
				)}
			</div>

			<div className="flex justify-end gap-3 pt-6 pb-2">
				<Button onClick={form.handleSubmit(onSubmitForm)} disabled={!!invalidRepoMsg || branches?.length === 0}>
					Next
				</Button>
			</div>
		</>
	);
};
