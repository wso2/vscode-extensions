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
import { VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import { GitProvider, type NewComponentWebviewProps } from "@wso2/wso2-platform-core";
import React, { type FC, type ReactNode, useEffect } from "react";
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

export const ComponentFormRepoInitSection: FC<Props> = ({ onNextClick, organization, form, nextText, loadingNextText, initializingRepo }) => {
	const [compDetailsSections] = useAutoAnimate();
	const { extensionName } = useExtWebviewContext();

	const orgName = form.watch("org");
	const repoName = form.watch("repo");

	const { data: hasSubscriptions = false } = useQuery({
		queryKey: ["hasSubscriptions", { orgId: organization?.id }],
		queryFn: () => ChoreoWebViewAPI.getInstance().getChoreoRpcClient().getSubscriptions({ orgId: organization?.id?.toString() }),
		select: (data) => !!data.list?.length,
	});

	const { data: gitOrgs, isLoading: loadingGitOrgs, error: errorFetchingGitOrg } = useGetAuthorizedGitOrgs(organization.id?.toString());
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
			form.setValue("repo", "");
		}
		if (matchingOrgItem) {
			form.setValue("orgHandler", matchingOrgItem.orgHandler);
		}
	}, [matchingOrgItem]);

	const { data: branches = [] } = useGetGitBranches(repoUrl, organization, provider === GitProvider.GITHUB ? "" : credential, !errorFetchingGitOrg, {
		enabled: !!repoName && !!provider && (provider === GitProvider.GITHUB ? !errorFetchingGitOrg : !!credential),
		refetchOnWindowFocus: true,
	});

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

	const onSubmitForm: SubmitHandler<ComponentRepoInitSchemaType> = () => onNextClick();

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
					wrapClassName="col-span-full"
				/>
				<div key="gen-repo" className="col-span-full">
					<Dropdown
						label={hasSubscriptions ? "Repository" : "Public Repository"}
						key="gen-details-repo"
						required
						name="repo"
						control={form.control}
						items={matchingOrgItem?.repositories?.map((item) => ({ value: item.name }))}
						disabled={!matchingOrgItem}
					/>
					<div className="mt-1 flex justify-between">
						<VSCodeLink
							className="mt-0.5 font-semibold text-[11px] text-vsc-foreground"
							onClick={() => ChoreoWebViewAPI.getInstance().openExternal("https://github.com/new")}
						>
							Create New Repository
						</VSCodeLink>
						<VSCodeLink
							className="mt-0.5 font-semibold text-[11px] text-vsc-foreground"
							onClick={() => ChoreoWebViewAPI.getInstance().triggerGithubInstallFlow(organization.id?.toString())}
						>
							Connect More Repositories
						</VSCodeLink>
					</div>
				</div>
				{branches?.length > 0 && (
					<Dropdown
						label="Branch"
						key="gen-details-branch"
						required
						name="branch"
						control={form.control}
						items={branches}
						wrapClassName="col-span-full"
					/>
				)}
				<TextField label="Path" key="gen-details-path" required name="subPath" placeholder="/" control={form.control} wrapClassName="col-span-full" />
				<TextField
					label="Name"
					key="gen-details-name"
					required
					name="name"
					placeholder={extensionName === "Devant" ? "integration-name" : "component-name"}
					control={form.control}
					wrapClassName="col-span-full"
				/>
			</div>

			<div className="flex justify-end gap-3 pt-6 pb-2">
				<Button onClick={form.handleSubmit(onSubmitForm)} disabled={initializingRepo}>
					{initializingRepo ? (loadingNextText ?? nextText) : nextText}
				</Button>
			</div>
		</>
	);
};
