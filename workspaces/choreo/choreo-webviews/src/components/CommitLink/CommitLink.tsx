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

import { VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import { GitProvider, getShortenedHash, parseGitURL } from "@wso2/choreo-core";
import classnames from "classnames";
import React, { type FC, type HTMLProps } from "react";
import { ChoreoWebViewAPI } from "../../utilities/vscode-webview-rpc";

interface Props {
	className?: HTMLProps<HTMLElement>["className"];
	commitHash: string;
	commitMessage: string;
	repoPath: string;
}

export const CommitLink: FC<Props> = ({ className, commitHash, commitMessage, repoPath }) => {
	const openLink = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
		event.stopPropagation();

		const parsedRepo = parseGitURL(repoPath);
		const provider = parsedRepo ? parsedRepo[2] : null;
		let commitUrl = `${repoPath}/commit/${commitHash}`;
		if (provider === GitProvider.BITBUCKET) {
			commitUrl = `${repoPath}/src/${commitHash}`;
		} else if (provider === GitProvider.GITLAB_SERVER) {
			commitUrl = `${repoPath}/-/commit/${commitHash}`;
		}
		ChoreoWebViewAPI.getInstance().openExternal(commitUrl);
	};

	return (
		<VSCodeLink onClick={openLink} className={classnames("text-vsc-foreground", className)} title={`Open Commit (Commit Message: ${commitMessage})`}>
			{getShortenedHash(commitHash)}
		</VSCodeLink>
	);
};
