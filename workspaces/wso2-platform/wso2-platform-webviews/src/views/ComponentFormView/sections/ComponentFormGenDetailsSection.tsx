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
import { GitProvider, type MultiComponentSectionProps, parseGitURL, toSentenceCase } from "@wso2/wso2-platform-core";
import React, { type FC, type ReactNode, useCallback, useEffect, useMemo } from "react";
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

interface UseComponentGitValidationParams {
	extensionName?: string;
	organization: Props["organization"];
	directoryFsPath?: string;
	isMultiComponentMode?: boolean;
	allComponents?: Props["allComponents"];
	selectedComponents?: Props["selectedComponents"];
	gitData: any;
	provider?: ComponentFormGenDetailsType["gitProvider"];
	credential?: string;
	form: UseFormReturn<ComponentFormGenDetailsType>;
}

const useComponentGitValidation = ({
	extensionName,
	organization,
	directoryFsPath,
	isMultiComponentMode,
	allComponents,
	selectedComponents,
	gitData,
	provider,
	credential,
	form,
}: UseComponentGitValidationParams) => {
	const branch = form.watch("branch");
	const repoUrlValue = form.watch("repoUrl");

	const targets = useMemo(() => {
		if (!directoryFsPath && !isMultiComponentMode) {
			return [] as { directoryFsPath: string }[];
		}

		// For multi-component mode, validate selected components.
		// For single component mode, fall back to the current directory.
		if (isMultiComponentMode && allComponents && selectedComponents) {
			const selectedTargets = selectedComponents
				.filter((c) => c.selected)
				.map((c) => allComponents[c.index])
				.filter((c) => !!c?.directoryFsPath)
				.map((c) => ({ directoryFsPath: c.directoryFsPath! }));
			return selectedTargets;
		}

		return directoryFsPath ? [{ directoryFsPath }] : [];
	}, [allComponents, directoryFsPath, isMultiComponentMode, selectedComponents]);

	const targetsSignature = useMemo(
		() => targets.map((t) => t.directoryFsPath).sort().join("|"),
		[targets],
	);

	const shouldRunValidation =
		(extensionName === "Devant" || isMultiComponentMode) &&
		!!branch &&
		!!repoUrlValue &&
		!!organization?.id &&
		targets.length > 0;

	const validationQuery = useQuery({
		queryKey: [
			"component-git-validation",
			{
				orgId: organization?.id,
				repoUrl: repoUrlValue,
				branch,
				provider,
				credential: provider !== GitProvider.GITHUB ? credential || "" : "",
				gitRoot: gitData?.gitRoot,
				targetsSignature,
			},
		],
		enabled: shouldRunValidation,
		staleTime: 60 * 1000, // cache for 60s
		refetchOnWindowFocus: true,
		queryFn: async () => {
			if (!shouldRunValidation || !gitData?.gitRoot) {
				return { invalidCount: 0, invalidTargets: [] as string[] };
			}

			const parsed = parseGitURL(repoUrlValue);
			if (!parsed) {
				return { invalidCount: 0, invalidTargets: [] as string[] };
			}

			const [gitOrgName, gitRepoName] = parsed;

			const metadataRequests: {
				branch: string;
				gitOrgName: string;
				gitRepoName: string;
				relativePath: string;
				orgId: string;
				secretRef: string;
			}[] = [];

			const targetIndices: number[] = [];

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

				targetIndices.push(targets.indexOf(target));
				metadataRequests.push({
					branch,
					gitOrgName,
					gitRepoName,
					relativePath,
					orgId: organization.id.toString(),
					secretRef: provider !== GitProvider.GITHUB ? credential || "" : "",
				});
			}

			if (metadataRequests.length === 0) {
				return { invalidCount: 0, invalidTargets: [] as string[] };
			}

			let invalidCount = 0;
			const invalidTargets: string[] = [];

			try {
				const results = await ChoreoWebViewAPI.getInstance()
					.getChoreoRpcClient()
					.getGitRepoMetadataBatch(metadataRequests);

				results.forEach((metadata, idx) => {
					if (!metadata?.metadata || metadata.metadata.isSubPathEmpty) {
						invalidCount += 1;
						const targetPath = targets[targetIndices[idx]]?.directoryFsPath;
						if (targetPath) {
							invalidTargets.push(targetPath);
						}
					}
				});
			} catch {
				// If batch call fails, mark all as invalid
				invalidCount = metadataRequests.length;
				invalidTargets.push(
					...targets
						.map((t) => t.directoryFsPath)
						.filter((p): p is string => !!p),
				);
			}

			return { invalidCount, invalidTargets };
		},
	});

	const validateComponentsPushed = useCallback(
		async (options?: { force?: boolean }): Promise<boolean> => {
			if (!shouldRunValidation) {
				return true;
			}

			// If we have fresh cached data and not forcing, reuse it
			if (!options?.force && validationQuery.data && !validationQuery.isStale) {
				const invalidCount = validationQuery.data.invalidCount ?? 0;
				return invalidCount === 0;
			}

			const result = await validationQuery.refetch();
			const invalidCount = result.data?.invalidCount ?? 0;
			return invalidCount === 0;
		},
		[shouldRunValidation, validationQuery],
	);

	// Derive from query so UI updates when validation runs (incl. refetchOnWindowFocus)
	const componentGitErrorCount =
		shouldRunValidation && validationQuery.data
			? (validationQuery.data.invalidCount || null)
			: null;
	const componentGitInvalidTargets =
		shouldRunValidation && validationQuery.data ? (validationQuery.data.invalidTargets ?? []) : [];

	return {
		componentGitErrorCount,
		componentGitInvalidTargets,
		isValidatingComponents: validationQuery.isFetching,
		validateComponentsPushed,
	};
};

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

	const { componentGitErrorCount, componentGitInvalidTargets, isValidatingComponents, validateComponentsPushed } = useComponentGitValidation({
		extensionName,
		organization,
		directoryFsPath,
		isMultiComponentMode,
		allComponents,
		selectedComponents,
		gitData,
		provider,
		credential,
		form,
	});

	const onSubmitForm: SubmitHandler<ComponentFormGenDetailsType> = async () => {
		if (isMultiComponentMode || extensionName === "Devant") {
			const isValid = await validateComponentsPushed();
			if (!isValid) {
				return;
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
				invalidRepoMsg = <span>{extensionName} lacks access to the selected repository.</span>;
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
				invalidRepoMsg = <span>Selected Credential does not have sufficient permissions to access the repository.</span>;
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
		const selectedComponentsCount = selectedComponents?.filter(c => c.selected)?.length;
		const baseMessage = componentGitErrorCount === 1
			? (isMultiComponentMode && selectedComponentsCount > 1
				? "One of the selected components has not been pushed to Git."
				: "This component has not been pushed to Git.")
			: componentGitErrorCount === selectedComponentsCount
				? "All selected components have not been pushed to Git."
				: `${componentGitErrorCount} of the selected components have not been pushed to Git.`;
		invalidRepoMsg = `${baseMessage} Please push your changes to the remote repository before deploying.`;
		invalidRepoAction = "Source Control";
		onInvalidRepoActionClick = openSourceControl;
		onInvalidRepoRefreshClick = async () => {
			await validateComponentsPushed({ force: true });
		};
		onInvalidRepoRefreshing = isValidatingComponents;
	}

	const hasSelectedComponents = selectedComponents?.some((comp) => comp.selected) ?? false;

	const notPushedComponentIndices = useMemo(() => {
		if (!componentGitInvalidTargets?.length || !allComponents) {
			return [] as number[];
		}

		const indices: number[] = [];
		for (const path of componentGitInvalidTargets) {
			const idx = allComponents.findIndex((c) => c.directoryFsPath === path);
			if (idx !== -1) {
				indices.push(idx);
			}
		}
		return indices;
	}, [componentGitInvalidTargets, allComponents]);

	return (
		<>
			{/* Multi-component selection list */}
			{isMultiComponentMode && allComponents && selectedComponents && onComponentSelectionChange && (
				<MultiComponentSelector
					extensionName={extensionName}
					allComponents={allComponents}
					selectedComponents={selectedComponents}
					onComponentSelectionChange={onComponentSelectionChange}
					notPushedComponentIndices={notPushedComponentIndices}
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
