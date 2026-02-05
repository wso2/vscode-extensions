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
import {
	GitProvider,
	type MultiComponentSectionProps,
	parseGitURL,
	toSentenceCase,
} from "@wso2/wso2-platform-core";
import React, { type FC, type ReactNode, useEffect, useState } from "react";
import type { SubmitHandler, UseFormReturn } from "react-hook-form";
import type { z } from "zod/v3";
import { Banner } from "../../../components/Banner";
import { Button } from "../../../components/Button";
import { Dropdown } from "../../../components/FormElements/Dropdown";
import { TextField } from "../../../components/FormElements/TextField";
import { useGetGitBranches } from "../../../hooks/use-queries";
import { useExtWebviewContext } from "../../../providers/ext-vewview-ctx-provider";
import { ChoreoWebViewAPI } from "../../../utilities/vscode-webview-rpc";
import type { componentGeneralDetailsSchema } from "../componentFormSchema";
import { MultiComponentSelector } from "./MultiComponentSelector";

type ComponentFormGenDetailsType = z.infer<typeof componentGeneralDetailsSchema>;

interface Props extends MultiComponentSectionProps {
	onNextClick: () => void;
	initialFormValues?: ComponentFormGenDetailsType;
	form: UseFormReturn<ComponentFormGenDetailsType>;
	componentType: string;
}

export const ComponentFormGenDetailsSection: FC<Props> = ({
	onNextClick,
	organization,
	directoryFsPath,
	form,
	rootDirectory,
	isMultiComponentMode,
	allComponents,
	selectedComponents,
	onComponentSelectionChange,
}) => {
	const [compDetailsSections] = useAutoAnimate();
	const { extensionName } = useExtWebviewContext();

	// Extract workspace name from rootDirectory path
	const workspaceName = rootDirectory ? rootDirectory.split(/[/\\]/).filter(Boolean).pop() || "" : "";

	// Set workspace name as the default name in multi-component mode
	useEffect(() => {
		if (isMultiComponentMode && workspaceName && !form.getValues("name")) {
			form.setValue("name", workspaceName, { shouldValidate: true });
		}
	}, [isMultiComponentMode, workspaceName, form]);

	const repoUrl = form.watch("repoUrl");
	const credential = form.watch("credential");
	const provider = form.watch("gitProvider");

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
	} = useGetGitBranches(repoUrl, organization, provider === GitProvider.GITHUB ? "" : credential, isRepoAuthorizedResp?.isAccessible, {
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

	const [componentGitErrorCount, setComponentGitErrorCount] = useState<number | null>(null);
	const [isValidatingComponents, setIsValidatingComponents] = useState(false);

	const validateComponentsPushed = async (): Promise<boolean> => {
		// Only validate for Devant when repo/branch are selected
		if (extensionName !== "Devant") {
			return true;
		}

		const branch = form.getValues("branch");
		const repoUrlValue = form.getValues("repoUrl");

		if (!branch || !repoUrlValue || !organization?.id) {
			return true;
		}

		const parsed = parseGitURL(repoUrlValue);
		if (!parsed) {
			return true;
		}

		const [gitOrgName, gitRepoName] = parsed;

		// For multi-component mode, validate selected components.
		// For single component mode, fall back to the current directory.
		const targets =
			isMultiComponentMode && allComponents && selectedComponents
				? selectedComponents
						.filter((c) => c.selected)
						.map((c) => allComponents[c.index])
				: directoryFsPath
				? [{ directoryFsPath }]
				: [];

		if (!targets.length) {
			return true;
		}

		let invalidCount = 0;

		for (const target of targets) {
			const componentPath = target.directoryFsPath;

			// If git root is not available, rely on existing repo validation
			if (!gitData?.gitRoot || !componentPath) {
				continue;
			}

			// Compute relative path from git root to component directory
			let relativePath = "";
			try {
				relativePath = await ChoreoWebViewAPI.getInstance().getSubPath({
					subPath: componentPath,
					parentPath: gitData.gitRoot,
				});
				relativePath = relativePath || "";
				relativePath = relativePath.startsWith("/") ? relativePath.slice(1) : relativePath;
			} catch {
				const normalizedRoot = gitData.gitRoot.replace(/[/\\]+$/, "");
				const normalizedPath = componentPath.replace(/[/\\]+$/, "");
				if (normalizedPath.startsWith(normalizedRoot)) {
					const rest = normalizedPath.slice(normalizedRoot.length);
					relativePath = rest.replace(/^[/\\]/, "").replace(/\\/g, "/");
				}
			}

			try {
				const metadata = await ChoreoWebViewAPI.getInstance()
					.getChoreoRpcClient()
					.getGitRepoMetadata({
						branch,
						gitOrgName,
						gitRepoName,
						relativePath,
						orgId: organization.id.toString(),
						secretRef: provider !== GitProvider.GITHUB ? credential || "" : "",
					});

				if (!metadata?.metadata || metadata.metadata.isSubPathEmpty) {
					invalidCount += 1;
				}
			} catch {
				invalidCount += 1;
			}
		}

		setComponentGitErrorCount(invalidCount || null);
		return invalidCount === 0;
	};

	const onSubmitForm: SubmitHandler<ComponentFormGenDetailsType> = async () => {
		setComponentGitErrorCount(null);

		if (isMultiComponentMode || extensionName === "Devant") {
			setIsValidatingComponents(true);
			try {
				const isValid = await validateComponentsPushed();
				if (!isValid) {
					return;
				}
			} finally {
				setIsValidatingComponents(false);
			}
		}

		onNextClick();
	};

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
	let hideBranchDropdown = false;

	if (!isLoadingGitData) {
		if (gitData === null) {
			invalidRepoMsg = "Please initialize the selected directory as a Git repository to proceed.";
			invalidRepoAction = "Source Control";
			onInvalidRepoActionClick = openSourceControl;
			onInvalidRepoRefreshClick = refetchGitData;
			hideBranchDropdown = true;
		} else if (gitData?.remotes?.length === 0) {
			invalidRepoMsg = "The selected Git repository has no configured remotes. Please add a remote to proceed.";
			invalidRepoAction = "Source Control";
			onInvalidRepoActionClick = openSourceControl;
			onInvalidRepoRefreshClick = refetchGitData;
			hideBranchDropdown = true;
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
						{extensionName} lacks access to the selected repository.
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
					<span>Selected Credential does not have sufficient permissions to access the repository.</span>
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

	if (!invalidRepoMsg && componentGitErrorCount && componentGitErrorCount > 0) {
		invalidRepoMsg = `${componentGitErrorCount} selected component(s) have not been pushed to Git. Please push your changes to the remote repository before deploying.`;
		invalidRepoAction = "Source Control";
		onInvalidRepoActionClick = openSourceControl;
		onInvalidRepoRefreshClick = async () => {
			setIsValidatingComponents(true);
			try {
				await validateComponentsPushed();
			} finally {
				setIsValidatingComponents(false);
			}
		};
		onInvalidRepoRefreshing = isValidatingComponents;
	}

	const hasSelectedComponents = selectedComponents?.some((comp) => comp.selected) ?? false;

	// Auto-revalidate on selection/git root changes and approximate refetchOnWindowFocus
	useEffect(() => {
		if (extensionName !== "Devant") {
			return;
		}

		const branch = form.getValues("branch");
		if (!repoUrl || !branch || !organization?.id) {
			return;
		}

		const shouldValidateNow = () => {
			if (isMultiComponentMode) {
				if (!selectedComponents || selectedComponents.length === 0) {
					invalidRepoMsg = "";
					setComponentGitErrorCount(null);
					return false;
				}
			}
			return true;
		};

		// Validate immediately on dependency changes
		if (shouldValidateNow()) {
			void validateComponentsPushed();
		}

		// Also validate when the window regains focus
		const handleFocus = () => {
			if (shouldValidateNow()) {
				void validateComponentsPushed();
			}
		};

		window.addEventListener("focus", handleFocus);
		return () => window.removeEventListener("focus", handleFocus);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [JSON.stringify(selectedComponents ?? []), gitData?.gitRoot, repoUrl, organization?.id, isMultiComponentMode, extensionName]);

	return (
		<>
			{/* Multi-component selection list */}
			{isMultiComponentMode && allComponents && selectedComponents && onComponentSelectionChange && (
				<MultiComponentSelector
					extensionName={extensionName}
					allComponents={allComponents}
					selectedComponents={selectedComponents}
					onComponentSelectionChange={onComponentSelectionChange}
				/>
			)}

			<div className="grid gap-4 md:grid-cols-2" ref={compDetailsSections}>
				{!isMultiComponentMode && (
					<TextField
						label="Name"
						key="gen-details-name"
						required
						name="name"
						placeholder={extensionName === "Devant" ? "integration-name" : "component-name"}
						control={form.control}
						wrapClassName="col-span-full"
					/>
				)}
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
				{!hideBranchDropdown && (
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
				<Button
					onClick={form.handleSubmit(onSubmitForm)}
					disabled={
						!!invalidRepoMsg ||
						branches?.length === 0 ||
						(isMultiComponentMode && !hasSelectedComponents) ||
						isValidatingComponents
					}
				>
					{isValidatingComponents ? "Validating..." : "Next"}
				</Button>
			</div>
		</>
	);
};
