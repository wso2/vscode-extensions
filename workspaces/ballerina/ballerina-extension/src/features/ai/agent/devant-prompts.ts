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
 * Devant platform domain knowledge injected into the agent system prompt.
 * Delegates to wi-extension for generic Devant platform knowledge, then
 * appends Ballerina+Devant specific knowledge about connections and tooling.
 */
import * as vscode from "vscode";
import { WI_EXTENSION_ID } from '../../../utils/config';
import {
    DEVANT_CREATE_CONNECTION_TOOL,
} from './tools/devant/devant-create-connection';
import {
    DEVANT_GENERATE_OAS_CONNECTOR_TOOL,
} from './tools/devant/devant-generate-oas-connector';
import {
    DEVANT_INITIALIZE_CONNECTOR_TOOL,
} from './tools/devant/devant-initialize-connector';
import {
    DEVANT_GET_SELECTED_INTEGRATION_TOOL,
} from './tools/devant/devant-get-selected-integration';
import { LIBRARY_SEARCH_TOOL } from './tools/library-search';
import { LIBRARY_GET_TOOL } from './tools/library-get';

const DEVANT_LIST_MARKETPLACE_SERVICES_TOOL = "DevantListMarketplaceServicesTool";

export function getDevantKnowledge(): string {
    const wiExt = vscode.extensions.getExtension(WI_EXTENSION_ID);
    let wiKnowledge = "";
    if (wiExt?.isActive && typeof wiExt.exports?.ai?.getDevantKnowledge === "function") {
        wiKnowledge = wiExt.exports.ai.getDevantKnowledge();
    }
    return [wiKnowledge, getBallerinaDevantConnectionKnowledge()].filter(Boolean).join("\n\n");
}

function getBallerinaDevantConnectionKnowledge(): string {
    return `
# Ballerina + Devant: Service Connections

## Recognizing Connection Requests

When the user says ANY of the following, they want a **Devant connection** — do NOT try to write raw HTTP clients or use library packages without going through the Devant connection workflow first:

- "connect to [service/API]"
- "integrate with [service]"
- "call the [name] API"
- "use the [name] service"
- "make requests to [service]"
- "add a connection to [service]"
- "I want to use [external service / 3rd party service / internal service]"
- "create a connector for [service]"
- "set up an integration with [service]"
- Anything involving an **internal service** (a service running in Devant) or a **3rd party API service** visible in the marketplace

## Types of Devant Connections

| Type | When to use |
|------|-------------|
| **Internal service** | The API is another service running in the same Devant project/org (e.g. another microservice deployed to Devant) |
| **3rd party service** | An external SaaS API registered in the Devant marketplace (e.g. Salesforce, GitHub, Stripe) |

When the user refers to an "API service", "external service", "internal API", or "3rd party service" — assume it is in the Devant marketplace and use the connection workflow below.

## Connection Scope: Integration-level vs Project-level

Before creating any connection, you must determine the **connection scope**. This depends on whether a Ballerina integration (component) is currently selected in the workspace:

| Scope | Condition | Behavior |
|-------|-----------|----------|
| **Integration-level** | A Devant integration is selected (\`hasIntegration: true\`) | Connection is scoped to the specific component |
| **Project-level** | No integration selected (\`hasIntegration: false\`) | Connection is created at the project level |

**Always inform the user of the scope** before proceeding:
- Integration-level: *"I'll create this connection for the [name] integration."*
- Project-level: *"No integration is currently selected, so I'll create this connection at the project level."*

## Connection Creation Workflow

Follow these steps in order. Do not skip steps.

### Step 0 — Get workspace and integration context (ALWAYS do this first)
Call **${DEVANT_GET_SELECTED_INTEGRATION_TOOL}** to obtain all required context.
This returns: \`orgId\`, \`orgUuid\`, \`projectId\`, \`componentId\`, \`componentType\`, \`connectionScope\`, \`hasIntegration\`.
You must have these values before calling any other tool in this workflow.
Inform the user of the connection scope (integration-level or project-level) based on the result.

### Step 1 — Discover the service in the marketplace
Call **${DEVANT_LIST_MARKETPLACE_SERVICES_TOOL}** with \`orgId\` and \`projectId\` from Step 0.
Search by service name to find the target service.
This returns service items with a \`serviceId\` for each.

### Step 2 — Create the platform connection
Call **${DEVANT_CREATE_CONNECTION_TOOL}** with:
- \`serviceId\`: from Step 1
- \`connectionName\`: a valid Ballerina identifier (e.g. \`paymentService\`)
- \`orgId\`, \`orgUuid\`, \`projectId\`: from Step 0
- \`componentId\`, \`componentType\`: from Step 0 (pass as-is — empty string means project-level)

This creates the connection in the Devant platform and returns:
- \`isRest\`: whether the service has a REST / OpenAPI interface
- \`detectedSecurityType\`: \`""\` | \`"oauth"\` | \`"apikey"\`
- \`requireProxy\`: \`true\` when the service uses ORGANIZATION or PROJECT visibility (internal non-public services); \`false\` for 3rd party and PUBLIC services — pass directly to DevantInitializeConnectorTool
- \`configEntries\`: array of config variable entries (name + envVariableName) needed for initialization

### Step 3 — Obtain a Ballerina connector

**If \`isRest: true\`** → call **${DEVANT_GENERATE_OAS_CONNECTOR_TOOL}** with:
- \`serviceId\`, \`connectionName\` (same as Step 2)
- \`securityType\`: use \`detectedSecurityType\` from Step 2

This fetches the OpenAPI spec from Devant and generates a custom Ballerina connector module.
Returns: \`moduleName\`, \`importStatement\`, \`generatedFiles\` (use content directly, do NOT re-read files)

**If \`isRest: false\` OR Step 3 fails** → fall back to Ballerina Central:
1. Call **${LIBRARY_SEARCH_TOOL}** with keywords derived from the service name
2. Call **${LIBRARY_GET_TOOL}** to get full API details for the best matching library
3. Use the library's Client type for initialization in Step 4

### Step 4 — Initialize the connector
Call **${DEVANT_INITIALIZE_CONNECTOR_TOOL}** with:
- \`connectionName\`: same as Step 2 (use \`resolvedConnectionName\`)
- \`moduleName\`: from Step 3 (OAS generator output or the Ballerina Central package module path)
- \`securityType\`, \`requireProxy\`: use values returned directly by Step 2 — do not re-derive from visibility
- \`configEntries\`: pass the \`configEntries\` array directly from Step 2
- \`configs\`: object mapping \`serviceUrlVarName\`, \`apiKeyVarName\`, etc. to the config variable names from Step 2's \`configEntries\`:
  - \`serviceUrlVarName\`: \`name\` from configEntries where \`id === "ServiceURL"\`
  - \`apiKeyVarName\`: \`name\` from configEntries where \`id === "ChoreoAPIKey"\` (apikey auth)
  - \`tokenUrlVarName\`: \`name\` from configEntries where \`id === "TokenURL"\` (oauth)
  - \`clientIdVarName\`: \`name\` from configEntries where \`id === "ConsumerKey"\` (oauth)
  - \`clientSecretVarName\`: \`name\` from configEntries where \`id === "ConsumerSecret"\` (oauth)

This writes the import statement and client initialization to \`connections.bal\`, and writes all configurable declarations to \`config.bal\` automatically.

## Quick Reference: Tool Sequence

\`\`\`
${DEVANT_GET_SELECTED_INTEGRATION_TOOL}() → orgId, orgUuid, projectId, componentId, componentType, connectionScope
  ↓ (inform user of connection scope)
${DEVANT_LIST_MARKETPLACE_SERVICES_TOOL}(orgId, projectId, query) → serviceId
  ↓
${DEVANT_CREATE_CONNECTION_TOOL}(serviceId, connectionName, orgId, orgUuid, projectId, componentId, componentType)
  → isRest, detectedSecurityType, requireProxy, configEntries
  ↓
[if REST] ${DEVANT_GENERATE_OAS_CONNECTOR_TOOL}(serviceId, connectionName, securityType)
  → moduleName, importStatement, generatedFiles
[if non-REST or fails] ${LIBRARY_SEARCH_TOOL} + ${LIBRARY_GET_TOOL}
  → library module name
  ↓
${DEVANT_INITIALIZE_CONNECTOR_TOOL}(connectionName, moduleName, securityType, requireProxy, configEntries, configs)
  → writes import + client init to connections.bal
  → writes configurable declarations to config.bal
\`\`\`

## Important Rules

- **Always call DevantGetSelectedIntegrationTool first** — it provides all context (org, project, component) needed for the rest of the workflow. Never call DevantListMarketplaceServicesTool or DevantCreateConnectionTool without first obtaining these values.
- **Always communicate the connection scope** to the user before creating the connection (integration-level or project-level).
- **Pass context as parameters** — do not read org/project/component from internal state; pass the values returned by DevantGetSelectedIntegrationTool explicitly.
- **Always use marketplace services via Devant connections** — do not hardcode API keys or construct HTTP clients manually when the service is in the marketplace.
- **connections.bal** holds all Devant connection client initializations. It is auto-imported by Ballerina.
- **config.bal** holds all \`configurable\` declarations for environment-specific values (URLs, tokens, keys). These are written automatically by **${DEVANT_INITIALIZE_CONNECTOR_TOOL}** — do not write them manually.
- The \`configEntries\` from **${DEVANT_CREATE_CONNECTION_TOOL}** already contain the correct environment variable names — use them directly, do not invent your own names.
- If security type is \`"oauth"\`, the configs will include \`ConsumerKey\`, \`ConsumerSecret\`, \`TokenURL\`, and \`ServiceURL\` entries.
- If security type is \`"apikey"\`, the configs will include \`ChoreoAPIKey\` and \`ServiceURL\` entries.
- If security type is \`""\` (none), only \`ServiceURL\` is needed.
`.trim();
}
