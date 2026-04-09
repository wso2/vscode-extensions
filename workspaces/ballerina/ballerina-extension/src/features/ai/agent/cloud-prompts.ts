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
 * WSO2 Cloud platform domain knowledge injected into the agent system prompt.
 * Delegates to wi-extension for generic WSO2 Cloud platform knowledge, then
 * appends Ballerina+WSO2 Cloud specific knowledge about connections and tooling.
 */
import * as vscode from "vscode";
import { WI_EXTENSION_ID } from '../../../utils/config';
import {
    CLOUD_CREATE_CONNECTION_TOOL,
} from './tools/cloud/cloud-create-connection';
import {
    CLOUD_GET_SELECTED_INTEGRATION_TOOL,
} from './tools/cloud/cloud-get-selected-integration';
import { CONNECTOR_GENERATOR_TOOL } from './tools/connector-generator';
import { LIBRARY_SEARCH_TOOL } from './tools/library-search';
import { LIBRARY_GET_TOOL } from './tools/library-get';
import {
    CLOUD_REGISTER_THIRD_PARTY_SERVICE_TOOL,
} from './tools/cloud/cloud-register-third-party-service';

const CLOUD_LIST_MARKETPLACE_SERVICES_TOOL = "CloudListMarketplaceServicesTool";

export function getCloudKnowledge(): string {
    const wiExt = vscode.extensions.getExtension(WI_EXTENSION_ID);
    let wiKnowledge = "";
    if (wiExt?.isActive && typeof wiExt.exports?.ai?.getCloudKnowledge === "function") {
        wiKnowledge = wiExt.exports.ai.getCloudKnowledge();
    }
    return [wiKnowledge, getBallerinaCloudConnectionKnowledge()].filter(Boolean).join("\n\n");
}

function getBallerinaCloudConnectionKnowledge(): string {
    return `
# Ballerina + WSO2 Cloud: Service Connections

## This Knowledge Block = WSO2 Cloud Project is Active

**The presence of this knowledge in your context means the current project is associated with WSO2 Cloud.** This is not optional context — it is a hard constraint on how you must handle all external service connections:

- If you find yourself about to use \`LibrarySearchTool\` or \`LibraryGetTool\` to connect to an external service, stop — that is a signal to go through the WSO2 Cloud connection workflow first. Only use these tools after the WSO2 Cloud connection has been created, to find the Ballerina library whose client you initialize using the \`configEntries[].name\` variables (already declared as \`configurable\` in \`config.bal\`).
- **NEVER** write \`configurable\` declarations for credentials (API keys, tokens, passwords, host/port settings) yourself.
- **ALWAYS** go through the WSO2 Cloud connection workflow below for any external service, regardless of whether the user explicitly mentions "Cloud" or "connection".

This applies even for well-known services like SMTP, Twilio, Slack, GitHub, databases, etc. The moment the user asks to connect to, call, or use any external service in a WSO2 Cloud project — the workflow below is mandatory.

The correct order is: **WSO2 Cloud connection workflow first** → library search/get second (only to write the import and client init in \`connections.bal\` — \`config.bal\` is already done).

## Types of WSO2 Cloud Connections

| Type | When to use |
|------|-------------|
| **Internal service** | The API is another service running in the same WSO2 Cloud project/org (e.g. another microservice deployed to WSO2 Cloud) |
| **3rd party service** | Any external service — SaaS APIs, email servers, databases, messaging platforms, etc. |

When the user refers to any external service (e.g. "connect to SMTP", "use Twilio", "call the GitHub API") — always use the workflow below. Do not assume it is only for services explicitly visible in the marketplace.

## Connection Scope: Integration-level vs Project-level

Before creating any connection, you must determine the **connection scope**. This depends on whether a Ballerina integration (component) is currently selected in the workspace:

| Scope | Condition | Behavior |
|-------|-----------|----------|
| **Integration-level** | A WSO2 Cloud integration is selected (\`hasIntegration: true\`) | Connection is scoped to the specific component |
| **Project-level** | No integration selected (\`hasIntegration: false\`) | Connection is created at the project level |

**Always inform the user of the scope** before proceeding:
- Integration-level: *"I'll create this connection for the [name] integration."*
- Project-level: *"No integration is currently selected, so I'll create this connection at the project level."*

## Connection Creation Workflow

Follow these steps in order. Do not skip steps.

### Step 0 — Get workspace and integration context (ALWAYS do this first)
Call **${CLOUD_GET_SELECTED_INTEGRATION_TOOL}** to obtain all required context.
This returns: \`orgId\`, \`orgUuid\`, \`projectId\`, \`componentId\`, \`componentType\`, \`connectionScope\`, \`hasIntegration\`.
You must have these values before calling any other tool in this workflow.
Inform the user of the connection scope (integration-level or project-level) based on the result.

### Step 1 — Discover the service in the marketplace
Call **${CLOUD_LIST_MARKETPLACE_SERVICES_TOOL}** with \`orgId\` and \`projectId\` from Step 0.
Search by service name to find the target service.
This returns service items with a \`serviceId\` for each.

**If the service is NOT found in the marketplace** → do NOT fall back to plain Ballerina configurables. Instead, pivot to the **Third-Party Service Registration** flow below to register the service in WSO2 Cloud first, then come back to Step 2.

### Step 2 — Create the platform connection
Call **${CLOUD_CREATE_CONNECTION_TOOL}** with:
- \`serviceId\`: from Step 1
- \`connectionName\`: a valid Ballerina identifier (e.g. \`paymentService\`)
- \`orgId\`, \`orgUuid\`, \`projectId\`: from Step 0
- \`componentId\`, \`componentType\`: from Step 0 (pass as-is — empty string means project-level)

This creates the connection in the WSO2 Cloud platform and returns:
- \`isRest\`: whether the service has a REST / OpenAPI interface
- \`detectedSecurityType\`: \`""\` | \`"oauth"\` | \`"apikey"\`
- \`requireProxy\`: \`true\` when the service uses ORGANIZATION or PROJECT visibility; \`false\` for 3rd party and PUBLIC services
- \`configEntries\`: array of config variable entries (name + envVariableName)
- \`specFilePath\`: (if REST) path to the pre-saved OpenAPI spec file
- \`moduleName\`: (if REST) derived module name for the connector

**Automatic initialization:** This tool also writes \`config.bal\` (configurable declarations, proxy config if needed) and — for REST services with a successful spec fetch — \`connections.bal\` (import + client initialization). You do NOT need to write these files manually for the REST path.

### Step 3 — Generate the Ballerina connector

**If \`isRest: true\` AND \`specFilePath\` is returned** → call **${CONNECTOR_GENERATOR_TOOL}** with:
- \`serviceName\`: the service name from Step 2
- \`specFilePath\`: from Step 2 result (the pre-saved OpenAPI spec path)
- \`moduleName\`: from Step 2 result

This generates a custom Ballerina connector module from the pre-saved OpenAPI spec without user interaction.
Returns: \`moduleName\`, \`importStatement\`, \`generatedFiles\` (use content directly, do NOT re-read files).
Since \`connections.bal\` and \`config.bal\` were already written in Step 2, the connection is fully initialized — proceed to use the connector in your code.

**If \`isRest: true\` but no \`specFilePath\`** (IDL fetch failed) → fall back to Ballerina Central:
1. Call **${LIBRARY_SEARCH_TOOL}** with keywords derived from the service name
2. Call **${LIBRARY_GET_TOOL}** to get full API details for the best matching library
3. Write only the import and client initialization in \`connections.bal\`. Use the \`configEntries[].name\` values as the Ballerina variable names (e.g. \`smtpHost\`). Do NOT add any \`configurable\` declarations — \`config.bal\` is already fully written by the previous tool.

**If \`isRest: false\`** → fall back to Ballerina Central:
1. Call **${LIBRARY_SEARCH_TOOL}** with keywords derived from the service name
2. Call **${LIBRARY_GET_TOOL}** to get full API details for the best matching library
3. Write only the import and client initialization in \`connections.bal\`. Use the \`configEntries[].name\` values as the Ballerina variable names (e.g. \`smtpHost\`). Do NOT add any \`configurable\` declarations — \`config.bal\` is already fully written by the previous tool.

## Quick Reference: Tool Sequence

\`\`\`
${CLOUD_GET_SELECTED_INTEGRATION_TOOL}() → orgId, orgUuid, projectId, componentId, componentType, connectionScope
  ↓ (inform user of connection scope)
${CLOUD_LIST_MARKETPLACE_SERVICES_TOOL}(orgId, projectId, query) → serviceId
  ↓
${CLOUD_CREATE_CONNECTION_TOOL}(serviceId, connectionName, orgId, orgUuid, projectId, componentId, componentType)
  → creates platform connection, writes config.bal + connections.bal (for REST)
  → isRest, specFilePath?, moduleName?, connectionCode?, configEntries
  ↓
[if REST + specFilePath] ${CONNECTOR_GENERATOR_TOOL}(serviceName, specFilePath, moduleName)
  → generates connector module → connection is fully ready
[if non-REST or no specFilePath] ${LIBRARY_SEARCH_TOOL} + ${LIBRARY_GET_TOOL}
  → find library → write import + client init in connections.bal using configEntries[].name (config.bal already written)
\`\`\`

## Important Rules

- **Always call ${CLOUD_GET_SELECTED_INTEGRATION_TOOL} first** — it provides all context (org, project, component) needed for the rest of the workflow. Never call CloudListMarketplaceServicesTool or ${CLOUD_CREATE_CONNECTION_TOOL} without first obtaining these values.
- **Always communicate the connection scope** to the user before creating the connection (integration-level or project-level).
- **Pass context as parameters** — do not read org/project/component from internal state; pass the values returned by ${CLOUD_GET_SELECTED_INTEGRATION_TOOL} explicitly.
- **Always use marketplace services via WSO2 Cloud connections** — do not hardcode API keys or construct HTTP clients manually when the service is in the marketplace.
- **NEVER use plain Ballerina \`configurable\` variables for external service credentials in a WSO2 Cloud project** — this applies even if the service is not found in the marketplace. If a service is not in the marketplace, register it as a third-party service first (see flows below), then create the WSO2 Cloud connection. Plain configurables bypass WSO2 Cloud's secrets management and must not be used.
- **connections.bal** holds all WSO2 Cloud connection client initializations. It is auto-imported by Ballerina. For REST services, this file is written automatically by ${CLOUD_CREATE_CONNECTION_TOOL}. For non-REST services (library fallback), write only the import and client initialization — use the \`configEntries[].name\` values as existing Ballerina variable names. Do NOT add any \`configurable\` declarations or call \`os:getEnv()\` — \`config.bal\` is already fully written by ${CLOUD_CREATE_CONNECTION_TOOL}.
- **config.bal** holds all \`configurable\` declarations for environment-specific values (URLs, tokens, keys). It is written automatically by ${CLOUD_CREATE_CONNECTION_TOOL} — do not write it manually, ever.
- **Do not duplicate** imports or configurable declarations that already exist in the file.

## Third-Party Service Registration (When Service is NOT in Marketplace)

When the user wants to connect to a third-party service that is **NOT already registered** in the WSO2 Cloud marketplace, you must register it first using **${CLOUD_REGISTER_THIRD_PARTY_SERVICE_TOOL}**. This tool collects runtime environment variable values from the user via an inline UI and registers the service in WSO2 Cloud.

### Flow 1 — From OpenAPI Specification (service NOT in marketplace)

Use this when the user provides an OpenAPI spec for a service that isn't in the marketplace:

1. **${CLOUD_GET_SELECTED_INTEGRATION_TOOL}** → get workspace context (orgId, orgUuid, projectId, etc.)
2. **${CONNECTOR_GENERATOR_TOOL}** → generate a custom Ballerina connector from the spec
3. **${CLOUD_REGISTER_THIRD_PARTY_SERVICE_TOOL}** → register the service in WSO2 Cloud:
   - Pass \`serviceType: "REST"\`, \`idlType: "OpenAPI"\`, \`idlFilePath\` (the spec path from step 2)
   - Pass \`initialConfigKeys\` — identify the env config keys from the connector's init params (e.g. API keys, base URLs, tokens)
   - This shows an inline UI where the user can review/edit config keys and provide runtime values
   - Returns \`serviceId\` and \`serviceSchemaId\` on success
4. **${CLOUD_CREATE_CONNECTION_TOOL}** → create the WSO2 Cloud connection using the \`serviceId\` from step 3
   - This writes \`config.bal\` and \`connections.bal\` automatically

### Flow 2 — From Ballerina Connector (service NOT in marketplace)

Use this when the user wants to use an existing Ballerina connector for a service that isn't in the marketplace:

1. **${CLOUD_GET_SELECTED_INTEGRATION_TOOL}** → get workspace context
2. **${LIBRARY_SEARCH_TOOL}** + **${LIBRARY_GET_TOOL}** → find the connector and get its init parameters
3. **${CLOUD_REGISTER_THIRD_PARTY_SERVICE_TOOL}** → register the service:
   - Pass \`serviceType\` based on the connector type (e.g. "REST", "GRPC")
   - Pass \`idlType: "TCP"\` (no OpenAPI spec available)
   - Pass \`initialConfigKeys\` — derived from the connector's init parameters
   - User provides runtime values via inline UI
   - Returns \`serviceId\`
4. **${CLOUD_CREATE_CONNECTION_TOOL}** → create the connection using the \`serviceId\`
5. Write only the import and client initialization in \`connections.bal\` using the connector found in step 2 and the \`configEntries[].name\` values as variable names. Do NOT add any \`configurable\` declarations — \`config.bal\` is already fully written by step 4.

### Flow 3 — From Already Registered Service (NO registration needed)

When the service is **already in the marketplace**, skip registration and use the standard workflow:

1. **${CLOUD_GET_SELECTED_INTEGRATION_TOOL}** → context
2. **${CLOUD_LIST_MARKETPLACE_SERVICES_TOOL}** → find the existing service by name
3. **${CLOUD_CREATE_CONNECTION_TOOL}** → create connection (existing tool handles both internal and third-party)
4. If REST with spec: **${CONNECTOR_GENERATOR_TOOL}** with specFilePath/moduleName from step 3
5. If non-REST or no spec: **${LIBRARY_SEARCH_TOOL}** + **${LIBRARY_GET_TOOL}** → initialize connector

### How to Decide Which Flow

- **First**, always call **${CLOUD_LIST_MARKETPLACE_SERVICES_TOOL}** to check if the service already exists in the marketplace
- **If found** → use Flow 3 (standard workflow, no registration needed)
- **If NOT found** and user has an OpenAPI spec → use Flow 1
- **If NOT found** and no spec → use Flow 2

### Third-Party Registration Tool Reference

\`\`\`
${CLOUD_REGISTER_THIRD_PARTY_SERVICE_TOOL}(
  serviceName,           // Name of the service to register
  serviceType,           // "REST" | "GRPC" | "GRAPHQL" | "SOAP" | "ASYNC_API"
  idlType,               // "OpenAPI" (when spec available) | "TCP" (no spec)
  idlFilePath?,          // Path to OpenAPI spec file (for idlType: "OpenAPI")
  initialConfigKeys,     // Array of {key, isSecret, description?} — agent-identified env config keys
  orgId, orgUuid, projectId  // From ${CLOUD_GET_SELECTED_INTEGRATION_TOOL}
)
→ { success, serviceName, serviceId, serviceSchemaId, isThirdParty }
\`\`\`
`.trim();
}
