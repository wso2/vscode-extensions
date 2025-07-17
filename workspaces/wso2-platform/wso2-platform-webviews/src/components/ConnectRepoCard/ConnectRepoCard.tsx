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

import classNames from "classnames";
import React, { type FC, type ReactNode, useEffect, useState } from "react";
import { Button } from "../Button";
import { ChoreoWebViewAPI } from "../../utilities/vscode-webview-rpc";
import { useExtWebviewContext } from "../../providers/ext-vewview-ctx-provider";
import { useGetGitBranches } from "../../hooks/use-queries";

interface ConnectRepoCardProps {
	organizationId: string;
	className?: string;
	repoAuthStatus?: {
		isAccessible?: boolean;
		retrievedRepos?: boolean;
	};
	onRepositorySelect?: (repository: any) => void;
}

interface GitHubOrganization {
	name: string;
	repositories?: any[];
}

export const ConnectRepoCard: FC<ConnectRepoCardProps> = ({ 
	organizationId, 
	className, 
	repoAuthStatus,
	onRepositorySelect
}) => {
	const { extensionName } = useExtWebviewContext();
	const [isInstallingApp, setIsInstallingApp] = useState(false);
	const [isAuthenticating, setIsAuthenticating] = useState(false);
	const [authenticationStatus, setAuthenticationStatus] = useState<"INITIAL" | "SUCCESS" | "FAILED">("INITIAL");
	const [organizations, setOrganizations] = useState<GitHubOrganization[]>([]);
	const [selectedOrganization, setSelectedOrganization] = useState<GitHubOrganization | null>(null);
	const [isRefreshingOrgs, setIsRefreshingOrgs] = useState(false);
	const [isRefreshingRepos, setIsRefreshingRepos] = useState(false);
	const [newRepoRequested, setNewRepoRequested] = useState(false);
	const [selectedRepository, setSelectedRepository] = useState<any>(null);
	const [selectedBranch, setSelectedBranch] = useState<string>("");

	// Generate repo URL for the selected repository
	const repoUrl = selectedRepository && selectedOrganization 
		? `https://github.com/${selectedOrganization.name}/${selectedRepository.name}.git`
		: "";

	// Use the hook to fetch branches when repository is selected
	const { data: branches = [], isLoading: isLoadingBranches } = useGetGitBranches(
		repoUrl,
		organizationId,
		"",
		true,
		{
			enabled: !!selectedRepository && !!selectedOrganization && !!repoUrl,
			onSuccess: (branchData) => {
				if (branchData && branchData.length > 0) {
					// Auto-select default branch if available
					const defaultBranch = selectedRepository.default_branch || "main";
					if (defaultBranch && branchData.includes(defaultBranch)) {
						setSelectedBranch(defaultBranch);
					} else {
						setSelectedBranch(branchData[0]);
					}
				} else {
					setSelectedBranch("");
				}
			}
		}
	);

	useEffect(() => {
		if (repoAuthStatus?.isAccessible || repoAuthStatus?.retrievedRepos) {
			setAuthenticationStatus("SUCCESS");
			// Try to fetch repositories when props indicate success
			if (organizationId) {
				fetchRepositories();
			}
		} else {
			setAuthenticationStatus("INITIAL");
		}
	}, [repoAuthStatus, organizationId]);

	const fetchRepositories = async (preserveSelection = false) => {
		try {
			const authorizedOrgs = await ChoreoWebViewAPI.getInstance().getGitHubRepositories(organizationId);
			console.log("Fetched GitHub repositories:", authorizedOrgs);
			if (authorizedOrgs && authorizedOrgs.gitOrgs && authorizedOrgs.gitOrgs.length > 0) {
				const orgs = authorizedOrgs.gitOrgs.map((gitOrg: any) => ({
					name: gitOrg.orgName,
					repositories: gitOrg.repositories || []
				}));
				
				setOrganizations(orgs);
				
				if (preserveSelection && selectedOrganization) {
					// Find the updated version of the currently selected organization
					const updatedSelectedOrg = orgs.find((org: GitHubOrganization) => org.name === selectedOrganization.name);
					if (updatedSelectedOrg) {
						setSelectedOrganization(updatedSelectedOrg);
					} else {
						setSelectedOrganization(null);
						setSelectedRepository(null);
						setSelectedBranch("");
					}
				} else {
					// Auto-select first organization if none selected (initial load behavior)
					if (!selectedOrganization && orgs.length > 0) {
						setSelectedOrganization(orgs[0]);
					}
				}
			} else {
				// No organizations found, clear state
				console.log("No organizations found, clearing state");
				setOrganizations([]);
				setSelectedOrganization(null);
				setSelectedRepository(null);
				setSelectedBranch("");
			}
		} catch (error) {
			console.error("Error fetching GitHub repositories:", error);
			setOrganizations([]);
			setSelectedOrganization(null);
			setSelectedRepository(null);
			setSelectedBranch("");
		}
	};

	// Reset authenticating state when authentication status changes
	useEffect(() => {
		if (authenticationStatus === "SUCCESS" || authenticationStatus === "FAILED") {
			setIsAuthenticating(false);
		}
	}, [authenticationStatus]);

	// Clear authenticating state when organizationId changes
	useEffect(() => {
		setIsAuthenticating(false);
	}, [organizationId]);

	// Filter repositories based on selected organization
	const filteredRepos = selectedOrganization?.repositories || [];

	const handleGitHubAuth = async () => {
		setIsAuthenticating(true);
		
		// Safety timeout to ensure we always clear the authenticating state
		const authTimeout = setTimeout(() => {
			console.log("Auth timeout - clearing isAuthenticating state");
			setIsAuthenticating(false);
			setAuthenticationStatus("FAILED");
		}, 120000); // 2 minutes timeout for auth flow
		
		try {
			await ChoreoWebViewAPI.getInstance().triggerGithubAuthFlow(organizationId);
			
			// Use polling instead of focus events for more reliability
			let pollCount = 0;
			const maxPolls = 60; // Poll for up to 2 minutes (60 * 2 seconds)
			
			const pollAuthStatus = async () => {
				try {
					// Check if user cancelled the OAuth flow
					const authStatus = await ChoreoWebViewAPI.getInstance().getGithubAuthStatus(organizationId);
					if (authStatus.cancelled) {
						console.log("GitHub OAuth was cancelled by user");
						setAuthenticationStatus("FAILED");
						setIsAuthenticating(false);
						clearTimeout(authTimeout);
						return;
					}

					// Check if repositories are available (successful auth)
					const authorizedOrgs = await ChoreoWebViewAPI.getInstance().getGitHubRepositories(organizationId);
					
					if (authorizedOrgs && authorizedOrgs.gitOrgs && authorizedOrgs.gitOrgs.length > 0) {
						// Authentication successful and repositories found
						await fetchRepositories();
						setAuthenticationStatus("SUCCESS");
						setIsAuthenticating(false);
						clearTimeout(authTimeout);
						return;
					}
					
					// Continue polling if no repos found yet and we haven't timed out
					pollCount++;
					if (pollCount < maxPolls) {
						setTimeout(pollAuthStatus, 2000); // Poll every 2 seconds
					} else {
						console.log("Polling timeout - no repositories found");
						setIsAuthenticating(false);
						setAuthenticationStatus("FAILED");
						clearTimeout(authTimeout);
					}
				} catch (error) {
					console.error("Error during polling:", error);
					pollCount++;
					if (pollCount < maxPolls) {
						setTimeout(pollAuthStatus, 2000); // Continue polling on error
					} else {
						setIsAuthenticating(false);
						setAuthenticationStatus("FAILED");
						clearTimeout(authTimeout);
					}
				}
			};
			
			// Start polling after a short delay to allow OAuth flow to begin
			setTimeout(pollAuthStatus, 3000);
		} catch (error) {
			console.error("Error during GitHub auth:", error);
			setAuthenticationStatus("FAILED");
			setIsAuthenticating(false);
			clearTimeout(authTimeout);
		}
	};

	// GitHub install flow for additional repositories
	const handleGitHubInstall = async () => {
		setIsInstallingApp(true);
		
		// Safety timeout to ensure we always clear the installing state
		const installTimeout = setTimeout(() => {
			console.log("Install timeout - clearing isInstallingApp state");
			setIsInstallingApp(false);
		}, 120000); // 2 minutes timeout for install flow
		
		try {
			await ChoreoWebViewAPI.getInstance().triggerGithubInstallFlow(organizationId);
			
			// Use polling instead of focus events for more reliability
			let pollCount = 0;
			const maxPolls = 60; // Poll for up to 2 minutes (60 * 2 seconds)
			
			const pollInstallStatus = async () => {
				try {
					
					// Check if new repositories are available (successful install)
					const authorizedOrgs = await ChoreoWebViewAPI.getInstance().getGitHubRepositories(organizationId);
					console.log("Polling - Authorized organizations:", authorizedOrgs);

					if (authorizedOrgs && authorizedOrgs.gitOrgs && authorizedOrgs.gitOrgs.length > 0) {
						// Install successful - fetch repositories
						console.log("Install successful - fetching repositories");
						await fetchRepositories(true);
						setIsInstallingApp(false);
						clearTimeout(installTimeout);
						return;
					}
					
					// Continue polling if no repos found yet and we haven't timed out
					pollCount++;
					if (pollCount < maxPolls) {
						setTimeout(pollInstallStatus, 2000); // Poll every 2 seconds
					} else {
						console.log("Polling timeout - install flow completed");
						setIsInstallingApp(false);
						clearTimeout(installTimeout);
					}
				} catch (error) {
					console.error("Error during install polling:", error);
					pollCount++;
					if (pollCount < maxPolls) {
						setTimeout(pollInstallStatus, 2000); // Continue polling on error
					} else {
						setIsInstallingApp(false);
						clearTimeout(installTimeout);
					}
				}
			};
			
			// Start polling after a short delay to allow install flow to begin
			setTimeout(pollInstallStatus, 3000);
			
		} catch (error) {
			console.error("Error during GitHub install:", error);
			setIsInstallingApp(false);
			clearTimeout(installTimeout);
		}
	};

	const handleConnectMoreRepos = () => {
		handleGitHubInstall();
	};

	const handleRepoSelect = (repo: any) => {
		setSelectedRepository(repo);
		setSelectedBranch("");
		onRepositorySelect?.(repo);
	};

	const handleBranchSelect = (branch: string) => {
		setSelectedBranch(branch);
	};

	// Refresh organizations (refetch repositories and extract orgs)
	const handleRefreshOrganizations = async () => {
		setIsRefreshingOrgs(true);
		setNewRepoRequested(false);
		try {
			await fetchRepositories(true); // Preserve selection when refreshing
		} catch (error) {
			console.error("Error refreshing organizations:", error);
		} finally {
			setIsRefreshingOrgs(false);
		}
	};

	// Refresh repositories (same as refresh organizations since they come from the same API)
	const handleRefreshRepositories = async () => {
		setIsRefreshingRepos(true);
		try {
			await fetchRepositories(true); // Preserve selection when refreshing
		} catch (error) {
			console.error("Error refreshing repositories:", error);
		} finally {
			setIsRefreshingRepos(false);
		}
	};

	const renderAuthenticationState = (): ReactNode => {
		if (authenticationStatus === "SUCCESS") {
			// Show organization and repository selection
			return (
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h3 className="text-lg font-medium">Select a Git Repository</h3>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Organization Dropdown */}
						<div className="space-y-1">
							<div className="flex items-center justify-between">
								<label className="block text-sm font-medium" style={{ color: 'var(--vscode-foreground)' }}>
									Organization
								</label>
								<button
									onClick={handleRefreshOrganizations}
									disabled={isRefreshingOrgs || organizations.length === 0}
									className="text-sm flex items-center gap-1 disabled:cursor-not-allowed"
									style={{ 
										color: isRefreshingOrgs || organizations.length === 0 
											? 'var(--vscode-disabledForeground)' 
											: 'var(--vscode-foreground)',
									}}
									title="Refresh Organizations"
									onMouseEnter={(e) => {
										if (!isRefreshingOrgs && organizations.length > 0) {
											e.currentTarget.style.color = 'var(--vscode-textLink-activeForeground)';
										}
									}}
									onMouseLeave={(e) => {
										if (!isRefreshingOrgs && organizations.length > 0) {
											e.currentTarget.style.color = 'var(--vscode-foreground)';
										}
									}}
								>
									<svg 
										className={`w-4 h-4 ${isRefreshingOrgs ? 'animate-spin' : ''}`} 
										fill="none" 
										stroke="currentColor" 
										viewBox="0 0 24 24"
									>
										<path 
											strokeLinecap="round" 
											strokeLinejoin="round" 
											strokeWidth="2" 
											d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
										/>
									</svg>
								</button>
							</div>
							<select
								value={selectedOrganization?.name || ""}
								onChange={(e) => {
									if (e.target.value === "add_more") {
										// Handle adding more organizations
										handleConnectMoreRepos();
										return;
									}
									const selectedOrg = organizations.find(org => org.name === e.target.value);
									setSelectedOrganization(selectedOrg || null);
									// Reset downstream selections
									setSelectedRepository(null);
									setSelectedBranch("");
								}}
								className="w-full px-3 py-1 text-sm rounded focus:outline-none"
								style={{
									backgroundColor: 'var(--vscode-dropdown-background)',
									color: 'var(--vscode-dropdown-foreground)',
									border: '1px solid var(--vscode-dropdown-border)',
									height: '32px',
									minHeight: '32px',
									lineHeight: '1.4',
									paddingTop: '6px',
									paddingBottom: '6px'
								}}
								onFocus={(e) => {
									e.target.style.borderColor = 'var(--vscode-focusBorder)';
									e.target.style.outline = '1px solid var(--vscode-focusBorder)';
								}}
								onBlur={(e) => {
									e.target.style.borderColor = 'var(--vscode-dropdown-border)';
									e.target.style.outline = 'none';
								}}
								disabled={organizations.length === 0 || isRefreshingOrgs}
							>
								<option value="">Select Organization</option>
								{organizations.map((org) => {
									return (
										<option key={org.name} value={org.name}>
											{org.name}
										</option>
									);
								})}
								{organizations.length > 0 && (
									<option value="add_more" className="font-medium text-blue-600">
										+ Add More Organizations
									</option>
								)}
							</select>
						</div>
						<div className="space-y-1">
							<div className="flex items-center justify-between">
								<label className="block text-sm font-medium" style={{ color: 'var(--vscode-foreground)' }}>
									Repository
								</label>
								{!newRepoRequested && (
									<button
										onClick={handleRefreshRepositories}
										disabled={isRefreshingRepos || !selectedOrganization}
										className="text-sm flex items-center gap-1 disabled:cursor-not-allowed"
										style={{ 
											color: isRefreshingRepos || !selectedOrganization 
												? 'var(--vscode-disabledForeground)' 
												: 'var(--vscode-foreground)',
										}}
										title="Refresh Repositories"
										onMouseEnter={(e) => {
											if (!isRefreshingRepos && selectedOrganization) {
												e.currentTarget.style.color = 'var(--vscode-textLink-activeForeground)';
											}
										}}
										onMouseLeave={(e) => {
											if (!isRefreshingRepos && selectedOrganization) {
												e.currentTarget.style.color = 'var(--vscode-foreground)';
											}
										}}
									>
										<svg 
											className={`w-4 h-4 ${isRefreshingRepos ? 'animate-spin' : ''}`} 
											fill="none" 
											stroke="currentColor" 
											viewBox="0 0 24 24"
										>
											<path 
												strokeLinecap="round" 
												strokeLinejoin="round" 
												strokeWidth="2" 
												d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
											/>
										</svg>
									</button>
								)}
							</div>
							
							{newRepoRequested ? (
								<button
									onClick={() => {
										ChoreoWebViewAPI.getInstance().openExternal("https://github.com/apps/wso2-cloud-app-dev/installations/select_target");
										setNewRepoRequested(false);
									}}
									className="w-full px-4 py-3 font-medium text-sm flex items-center justify-center gap-2 rounded focus:outline-none"
									style={{
										backgroundColor: 'var(--vscode-button-background)',
										color: 'var(--vscode-button-foreground)',
										border: '1px solid var(--vscode-button-border)',
										height: '32px',
										minHeight: '32px'
									}}
									onMouseEnter={(e) => {
										e.currentTarget.style.backgroundColor = 'var(--vscode-button-hoverBackground)';
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.backgroundColor = 'var(--vscode-button-background)';
									}}
								>
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
									</svg>
									Connect Your Newly Created Repo
								</button>
							) : (
								<select
									value={selectedRepository?.name || ""}
									onChange={(e) => {
										if (e.target.value === "connect_more") {
											// Handle connecting more repositories
											handleConnectMoreRepos();
											return;
										}
										if (e.target.value === "create_new") {
											// Handle creating new repository
											ChoreoWebViewAPI.getInstance().openExternal("https://github.com/new");
											setNewRepoRequested(true);
											return;
										}
										const selectedRepo = filteredRepos.find((repo: any) => repo.name === e.target.value);
										if (selectedRepo) {
											handleRepoSelect(selectedRepo);
										}
									}}
									className="w-full px-3 py-1 text-sm rounded focus:outline-none"
									style={{
										backgroundColor: 'var(--vscode-dropdown-background)',
										color: 'var(--vscode-dropdown-foreground)',
										border: '1px solid var(--vscode-dropdown-border)',
										height: '32px',
										minHeight: '32px',
										lineHeight: '1.4',
										paddingTop: '6px',
										paddingBottom: '6px'
									}}
									onFocus={(e) => {
										e.target.style.borderColor = 'var(--vscode-focusBorder)';
										e.target.style.outline = '1px solid var(--vscode-focusBorder)';
									}}
									onBlur={(e) => {
										e.target.style.borderColor = 'var(--vscode-dropdown-border)';
										e.target.style.outline = 'none';
									}}
									disabled={!selectedOrganization || isRefreshingRepos || isInstallingApp}
								>
									<option value="">
										{!selectedOrganization 
											? "Select an organization first" 
											: filteredRepos.length === 0 
												? "No repositories available"
												: "Select Repository"
										}
									</option>
									{filteredRepos.map((repo: any) => (
										<option key={repo.name} value={repo.name}>
											{repo.name}
										</option>
									))}
									{selectedOrganization && (
										<>
											<option value="" disabled className="text-gray-400">
												────────────────
											</option>
											<option value="connect_more" className="font-medium text-blue-600">
												+ Connect More Repositories
											</option>
											<option value="create_new" className="font-medium text-green-600">
												+ Create New Repository
											</option>
										</>
									)}
								</select>
							)}
						</div>
					</div>

					{/* Branch and Directory Selection - Only show when repository is selected */}
					{selectedRepository && (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{/* Branch Dropdown */}
							<div className="space-y-1">
								<label className="block text-sm font-medium" style={{ color: 'var(--vscode-foreground)' }}>
									Branch
								</label>
								<select
									value={selectedBranch}
									onChange={(e) => handleBranchSelect(e.target.value)}
									className="w-full px-3 py-1 text-sm rounded focus:outline-none"
									style={{
										backgroundColor: 'var(--vscode-dropdown-background)',
										color: 'var(--vscode-dropdown-foreground)',
										border: '1px solid var(--vscode-dropdown-border)',
										height: '32px',
										minHeight: '32px',
										lineHeight: '1.4',
										paddingTop: '6px',
										paddingBottom: '6px'
									}}
									onFocus={(e) => {
										e.target.style.borderColor = 'var(--vscode-focusBorder)';
										e.target.style.outline = '1px solid var(--vscode-focusBorder)';
									}}
									onBlur={(e) => {
										e.target.style.borderColor = 'var(--vscode-dropdown-border)';
										e.target.style.outline = 'none';
									}}
									disabled={isLoadingBranches || branches.length === 0}
								>
									<option value="">
										{isLoadingBranches 
											? "Loading branches..." 
											: branches.length === 0 
												? "No branches available" 
												: "Select Branch"
										}
									</option>
									{branches.map((branch) => (
										<option key={branch} value={branch}>
											{branch}
										</option>
									))}
								</select>
							</div>
						</div>
					)}
				</div>
			);
		}

		// Default state - show authentication options
		return (
			<div className="space-y-2">
				<div className="text-center py-4">
					<h3 className="text-lg font-medium mb-1" style={{ color: 'var(--vscode-foreground)' }}>Connect a Git Repository</h3>
					<p className="mb-3" style={{ color: 'var(--vscode-descriptionForeground)' }}>
						Create new or connect your existing empty GitHub repository to get started with {extensionName}
					</p>
					
					{authenticationStatus === "FAILED" && (
						<div 
							className="mb-3 p-3 rounded-lg"
							style={{
								backgroundColor: 'var(--vscode-inputValidation-errorBackground)',
								border: '1px solid var(--vscode-inputValidation-errorBorder)',
								color: 'var(--vscode-inputValidation-errorForeground)'
							}}
						>
							<p>GitHub authentication failed or was cancelled. Please try again.</p>
						</div>
					)}

					<div className="space-y-2">
						<Button
							onClick={() => {
								// Reset failed state when user tries again
								setAuthenticationStatus("INITIAL");
								if (repoAuthStatus?.retrievedRepos) {
									// If repos are retrieved but not accessible, trigger install flow
									handleGitHubInstall();
								} else {
									// Otherwise trigger auth flow
									handleGitHubAuth();
								}
							}}
							disabled={isInstallingApp || isAuthenticating}
							className="w-full"
						>
							{isInstallingApp ? (
								<>
									<svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
										<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
										<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
									Installing App...
								</>
							) : isAuthenticating ? (
								<>
									<svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
										<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
										<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
									Connecting to GitHub...
								</>
							) : (
								<>
									<svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
										<path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
									</svg>
									{repoAuthStatus?.retrievedRepos ? "Grant Access" : "Authorize with GitHub"}
								</>
							)}
						</Button>
					</div>
				</div>
			</div>
		);
	};

	return (
		<div 
			className={classNames("p-3 rounded-lg shadow-sm", className)}
			style={{
				backgroundColor: 'var(--vscode-editor-background)',
				border: '1px solid var(--vscode-panel-border)',
				color: 'var(--vscode-foreground)'
			}}
		>
			{renderAuthenticationState()}
		</div>
	);
};
