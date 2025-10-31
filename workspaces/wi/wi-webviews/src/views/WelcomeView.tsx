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

import React from "react";
import type { WelcomeWebviewProps } from "@wso2/wi-core";
import "./WelcomeView.css";
import { RpcClient } from "@wso2/wi-rpc-client";

export const WelcomeView: React.FC<WelcomeWebviewProps> = ({ biAvailable, miAvailable }) => {
	const rpcClient = new RpcClient();
	const handleOpenBI = () => {
		rpcClient.getMainRpcClient().openBiExtension();
	};

	const handleOpenMI = () => {
		rpcClient.getMainRpcClient().openMiExtension();
	};

	return (
		<div className="welcome-container">
			<header className="welcome-header">
				<h1>Welcome to WSO2 Integrator</h1>
				<p className="welcome-subtitle">
					Unified development environment for Ballerina Integrator (BI) and Micro Integrator (MI)
				</p>
			</header>

			<div className="integrations-grid">
				<div className={`integration-card ${biAvailable ? "available" : "unavailable"}`}>
					<div className="card-icon bi-icon">
						<span>BI</span>
					</div>
					<h2>Ballerina Integrator</h2>
					<p>
						Design, develop, and debug integration solutions using Ballerina programming language with low-code
						capabilities.
					</p>
					{biAvailable ? (
						<button type="button" className="primary-button" onClick={handleOpenBI}>
							Open BI Integrations
						</button>
					) : (
						<div className="not-available">
							<p className="warning-text">Extension not installed</p>
							<p className="help-text">Install the Ballerina Integrator extension to get started</p>
						</div>
					)}
				</div>

				<div className={`integration-card ${miAvailable ? "available" : "unavailable"}`}>
					<div className="card-icon mi-icon">
						<span>MI</span>
					</div>
					<h2>Micro Integrator</h2>
					<p>
						Build enterprise integration solutions with graphical design, data mapping, and comprehensive runtime
						support.
					</p>
					{miAvailable ? (
						<button type="button" className="primary-button" onClick={handleOpenMI}>
							Open MI Integrations
						</button>
					) : (
						<div className="not-available">
							<p className="warning-text">Extension not installed</p>
							<p className="help-text">Install the Micro Integrator extension to get started</p>
						</div>
					)}
				</div>
			</div>

			<div className="quick-links">
				<h3>Quick Links</h3>
				<div className="links-grid">
					<a
						href="https://wso2.com/integration/"
						className="link-card"
						onClick={(e) => {
							e.preventDefault();
							// External links should be handled by VS Code
						}}
					>
						<span className="link-icon">📚</span>
						<span>Documentation</span>
					</a>
					<a
						href="https://github.com/wso2/ballerina-plugin-vscode"
						className="link-card"
						onClick={(e) => {
							e.preventDefault();
						}}
					>
						<span className="link-icon">💻</span>
						<span>GitHub Repository</span>
					</a>
					<a
						href="https://wso2.com/integration/tutorials/"
						className="link-card"
						onClick={(e) => {
							e.preventDefault();
						}}
					>
						<span className="link-icon">🎓</span>
						<span>Tutorials</span>
					</a>
					<a
						href="https://discord.gg/wso2"
						className="link-card"
						onClick={(e) => {
							e.preventDefault();
						}}
					>
						<span className="link-icon">💬</span>
						<span>Community Support</span>
					</a>
				</div>
			</div>
		</div>
	);
};
