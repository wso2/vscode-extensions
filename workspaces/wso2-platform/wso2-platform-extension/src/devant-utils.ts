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

import { Uri, commands, window, workspace } from "vscode";
import { ext } from "./extensionVariables";
import { initGit } from "./git/main";
import { getLogger } from "./logger/logger";

export const activateDevantFeatures = () => {
    if (process.env.CLOUD_STS_TOKEN) {
        autoRefetchDevantStsToken();
        showRepoSyncNotification();
    }
};

const autoRefetchDevantStsToken = () => {
    const intervalTime = 20 * 60 * 1000; // 20 minutes
    const intervalId = setInterval(async () => {
        try {
            await ext.clients.rpcClient.getStsToken();
        } catch {
            getLogger().error("Failed to refresh STS token");
            if (intervalId) {
                clearInterval(intervalId);
            }
        }
    }, intervalTime);

    ext.context.subscriptions.push({
        dispose: () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        },
    });
};

const showRepoSyncNotification = async () => {
	if (workspace.workspaceFolders && workspace.workspaceFolders?.length > 0) {
		try {
			const componentPath = Uri.from(workspace.workspaceFolders[0].uri).fsPath;
			const newGit = await initGit(ext.context);
			if (!newGit) {
				throw new Error("failed to initGit");
			}
			const dotGit = await newGit?.getRepositoryDotGit(componentPath);
			const repoRoot = await newGit?.getRepositoryRoot(componentPath);
			const repo = newGit.open(repoRoot, dotGit);
			await repo.fetch();
			const head = await repo.getHEADRef();
			if (head?.behind) {
				window.showInformationMessage(`Your remote Git repository has ${head.behind} new changes`, "Sync Repository").then((res) => {
					if (res === "Sync Repository") {
						commands.executeCommand("git.sync");
					}
				});
			}
		} catch (err) {
			getLogger().error(`Failed to check if the Git head is behind: ${(err as Error)?.message}`);
		}
	}
};
