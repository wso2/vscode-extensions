// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

/**
 * Ballerina+WSO2 Cloud tool: returns the currently selected WSO2 Cloud integration
 * (component) and workspace context needed for creating connections.
 *
 * This is the first tool to call in any connection creation workflow.
 * It provides org, project, and integration context from the Ballerina
 * workspace state, and determines whether connections will be created at
 * integration level or project level.
 */
import { tool } from "ai";
import { z } from "zod";
import { CopilotEventHandler } from "../../../utils/events";
import { platformExtStore } from "../../../../../rpc-managers/platform-ext/platform-store";
import { CLOUD_CREATE_CONNECTION_TOOL } from "./cloud-create-connection";

export const CLOUD_GET_SELECTED_INTEGRATION_TOOL = "CloudGetSelectedIntegrationTool";

export function createCloudGetSelectedIntegrationTool(eventHandler: CopilotEventHandler) {
    return tool({
        description: `Returns the currently selected WSO2 Cloud integration (component) and workspace context required for creating connections.

**Always call this tool first** in any connection creation workflow — before CloudListMarketplaceServicesTool or ${CLOUD_CREATE_CONNECTION_TOOL}.
It returns all context values that must be passed as parameters to those tools.

**What it returns:**
- \`orgId\`: Numeric organization ID (pass to CloudListMarketplaceServicesTool and ${CLOUD_CREATE_CONNECTION_TOOL})
- \`orgUuid\`: Organization UUID (pass to ${CLOUD_CREATE_CONNECTION_TOOL})
- \`projectId\`: Project ID (pass to CloudListMarketplaceServicesTool and ${CLOUD_CREATE_CONNECTION_TOOL})
- \`hasIntegration\`: Whether a Ballerina integration (component) is currently selected
- \`integration\`: Selected integration details ({ id, name, type }) — null if none selected
- \`componentId\`: Component ID to pass to ${CLOUD_CREATE_CONNECTION_TOOL} (empty string if no integration)
- \`componentType\`: Component type to pass to ${CLOUD_CREATE_CONNECTION_TOOL} (empty string if no integration)
- \`connectionScope\`: \`"integration"\` | \`"project"\` — determines the connection level

**Connection scope rules:**
- \`"integration"\`: A WSO2 Cloud integration is selected → connection is created at integration level and scoped to that component
- \`"project"\`: No integration selected but a project is associated → connection is created at project level

Make sure to communicate the connection scope to the user before proceeding:
- Integration level: "I'll create this connection for the [name] integration"
- Project level: "No integration is currently selected, so I'll create this connection at the project level"`,
        inputSchema: z.object({}),
        execute: async (_input, context?: { toolCallId?: string }) => {
            const toolCallId = context?.toolCallId ?? `fallback-${Date.now()}`;

            eventHandler({
                type: "tool_call",
                toolName: CLOUD_GET_SELECTED_INTEGRATION_TOOL,
                toolInput: {},
                toolCallId,
            });

            const state = platformExtStore.getState().state;

            if (!state?.isLoggedIn) {
                const result = {
                    success: false,
                    message: "You are not logged in to WSO2 Cloud. Please log in first.",
                };
                eventHandler({ type: "tool_result", toolName: CLOUD_GET_SELECTED_INTEGRATION_TOOL, toolCallId, toolOutput: result });
                return result;
            }

            const selectedContext = state.selectedContext;
            if (!selectedContext?.org || !selectedContext?.project) {
                const result = {
                    success: false,
                    message: "No WSO2 Cloud organization or project is associated with this workspace. Please associate your workspace with a WSO2 Cloud project first.",
                };
                eventHandler({ type: "tool_result", toolName: CLOUD_GET_SELECTED_INTEGRATION_TOOL, toolCallId, toolOutput: result });
                return result;
            }

            const orgId = selectedContext.org.id?.toString() ?? "";
            const orgUuid = selectedContext.org.uuid ?? "";
            const projectId = selectedContext.project.id?.toString() ?? "";

            const selectedComponent = state.selectedComponent;
            const hasIntegration = !!selectedComponent;
            const componentId = selectedComponent?.metadata?.id ?? "";
            const componentType = selectedComponent?.spec?.type ?? "";
            const componentName = selectedComponent?.metadata?.name ?? "";

            const connectionScope: "integration" | "project" = hasIntegration ? "integration" : "project";

            const result = {
                success: true,
                orgId,
                orgUuid,
                projectId,
                hasIntegration,
                integration: hasIntegration
                    ? { id: componentId, name: componentName, type: componentType }
                    : null,
                componentId,
                componentType,
                connectionScope,
                message: hasIntegration
                    ? `Connection will be created at integration level for "${componentName}" (${componentType}). orgId: ${orgId}, projectId: ${projectId}, componentId: ${componentId}.`
                    : `No integration selected — connection will be created at project level. orgId: ${orgId}, projectId: ${projectId}.`,
            };

            eventHandler({ type: "tool_result", toolName: CLOUD_GET_SELECTED_INTEGRATION_TOOL, toolCallId, toolOutput: result });
            return result;
        },
    });
}
