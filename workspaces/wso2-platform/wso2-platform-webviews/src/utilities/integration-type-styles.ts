/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import {
	ChoreoComponentSubType,
	ChoreoComponentType,
	DevantScopes,
} from "@wso2/wso2-platform-core";
import type { CSSProperties } from "react";

export interface TypeIconConfig {
	name: string;
	isCodicon: boolean;
}

/**
 * Get icon configuration for integration/component types.
 * Handles both DevantScopes (from supportedIntegrationTypes) and mapped ChoreoComponentType (from initialValues).
 */
export const getIntegrationTypeIcon = (type: string, subType?: string): TypeIconConfig => {
	// First check DevantScopes (direct values from supportedIntegrationTypes)
	const devantIcons: Record<string, TypeIconConfig> = {
		[DevantScopes.AUTOMATION]: { name: "task", isCodicon: false },
		[DevantScopes.INTEGRATION_AS_API]: { name: "cloud", isCodicon: true },
		[DevantScopes.EVENT_INTEGRATION]: { name: "Event", isCodicon: false },
		[DevantScopes.FILE_INTEGRATION]: { name: "file", isCodicon: false },
		[DevantScopes.AI_AGENT]: { name: "bi-ai-agent", isCodicon: false },
		[DevantScopes.LIBRARY]: { name: "package", isCodicon: true },
		[DevantScopes.ANY]: { name: "project", isCodicon: true },
	};

	if (devantIcons[type]) {
		return devantIcons[type];
	}

	// Then check mapped ChoreoComponentType (from getTypeOfIntegrationType mapping)
	// Handle subTypes first for more specific matches
	if (subType === ChoreoComponentSubType.AiAgent) {
		return { name: "bi-ai-agent", isCodicon: false };
	}
	if (subType === ChoreoComponentSubType.fileIntegration) {
		return { name: "file", isCodicon: false };
	}

	// Map ChoreoComponentType to icons
	const choreoIcons: Record<string, TypeIconConfig> = {
		[ChoreoComponentType.ScheduledTask]: { name: "task", isCodicon: false },
		[ChoreoComponentType.Service]: { name: "cloud", isCodicon: true },
		[ChoreoComponentType.EventHandler]: { name: "Event", isCodicon: false },
		[ChoreoComponentType.ManualTrigger]: { name: "task", isCodicon: false },
		[ChoreoComponentType.Webhook]: { name: "Event", isCodicon: false },
		[ChoreoComponentType.WebApplication]: { name: "browser", isCodicon: true },
		[ChoreoComponentType.TestRunner]: { name: "beaker", isCodicon: true },
		[ChoreoComponentType.Library]: { name: "package", isCodicon: true },
	};

	return choreoIcons[type] || { name: "symbol-class", isCodicon: true };
};

/**
 * Get color for integration/component types.
 * Handles both DevantScopes and mapped ChoreoComponentType.
 */
export const getIntegrationTypeColor = (type: string, subType?: string): string | undefined => {
	// First check DevantScopes
	const devantColors: Record<string, string> = {
		[DevantScopes.AUTOMATION]: "var(--vscode-charts-blue)",
		[DevantScopes.INTEGRATION_AS_API]: "var(--vscode-charts-green)",
		[DevantScopes.EVENT_INTEGRATION]: "var(--vscode-charts-orange)",
		[DevantScopes.FILE_INTEGRATION]: "var(--vscode-charts-purple)",
		[DevantScopes.AI_AGENT]: "var(--vscode-charts-red)",
		[DevantScopes.LIBRARY]: "var(--vscode-charts-yellow)",
		[DevantScopes.ANY]: "var(--vscode-charts-gray)",
	};

	if (devantColors[type]) {
		return devantColors[type];
	}

	// Handle subTypes first for more specific matches
	if (subType === ChoreoComponentSubType.AiAgent) {
		return "var(--vscode-charts-red)";
	}
	if (subType === ChoreoComponentSubType.fileIntegration) {
		return "var(--vscode-charts-purple)";
	}

	// Map ChoreoComponentType to colors
	const choreoColors: Record<string, string> = {
		[ChoreoComponentType.ScheduledTask]: "var(--vscode-charts-blue)",
		[ChoreoComponentType.Service]: "var(--vscode-charts-green)",
		[ChoreoComponentType.EventHandler]: "var(--vscode-charts-orange)",
		[ChoreoComponentType.ManualTrigger]: "var(--vscode-charts-blue)",
		[ChoreoComponentType.Webhook]: "var(--vscode-charts-orange)",
		[ChoreoComponentType.WebApplication]: "var(--vscode-charts-yellow)",
		[ChoreoComponentType.TestRunner]: "var(--vscode-charts-gray)",
		[ChoreoComponentType.Library]: "var(--vscode-charts-yellow)",
	};

	return choreoColors[type];
};

/**
 * Get chip/badge styles for a type color.
 * Returns inline styles for colored chips with subtle background.
 */
export const getTypeChipStyle = (typeColor: string | undefined): CSSProperties | undefined => {
	if (!typeColor) return undefined;
	return {
		background: `color-mix(in srgb, ${typeColor} 12%, transparent)`,
		color: typeColor,
		border: `1px solid color-mix(in srgb, ${typeColor} 25%, transparent)`,
		borderRadius: "12px",
		gap: "4px",
		textTransform: "capitalize",
		whiteSpace: "nowrap",
		display: "inline-flex",
		alignItems: "center",
		padding: "4px 10px",
		fontSize: "11px",
		fontWeight: 500,
	} as CSSProperties;
};
