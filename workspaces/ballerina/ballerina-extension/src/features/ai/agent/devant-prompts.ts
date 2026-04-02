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
    DEVANT_GET_SELECTED_INTEGRATION_TOOL,
} from './tools/devant/devant-get-selected-integration';
import { CONNECTOR_GENERATOR_TOOL } from './tools/connector-generator';
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
3. Write \`connections.bal\` yourself using the library module and the \`configEntries\` from Step 2. Use \`os:getEnv(envVariableName)\` for each config entry.

**If \`isRest: false\`** → fall back to Ballerina Central:
1. Call **${LIBRARY_SEARCH_TOOL}** with keywords derived from the service name
2. Call **${LIBRARY_GET_TOOL}** to get full API details for the best matching library
3. Write \`connections.bal\` yourself using the library module and the \`configEntries\` from Step 2. Use \`os:getEnv(envVariableName)\` for each config entry.

## Quick Reference: Tool Sequence

\`\`\`
${DEVANT_GET_SELECTED_INTEGRATION_TOOL}() → orgId, orgUuid, projectId, componentId, componentType, connectionScope
  ↓ (inform user of connection scope)
${DEVANT_LIST_MARKETPLACE_SERVICES_TOOL}(orgId, projectId, query) → serviceId
  ↓
${DEVANT_CREATE_CONNECTION_TOOL}(serviceId, connectionName, orgId, orgUuid, projectId, componentId, componentType)
  → creates platform connection, writes config.bal + connections.bal (for REST)
  → isRest, specFilePath?, moduleName?, connectionCode?, configEntries
  ↓
[if REST + specFilePath] ${CONNECTOR_GENERATOR_TOOL}(serviceName, specFilePath, moduleName)
  → generates connector module → connection is fully ready
[if non-REST or no specFilePath] ${LIBRARY_SEARCH_TOOL} + ${LIBRARY_GET_TOOL}
  → find library → write connections.bal using configEntries and os:getEnv()
\`\`\`

## Important Rules

- **Always call DevantGetSelectedIntegrationTool first** — it provides all context (org, project, component) needed for the rest of the workflow. Never call DevantListMarketplaceServicesTool or DevantCreateConnectionTool without first obtaining these values.
- **Always communicate the connection scope** to the user before creating the connection (integration-level or project-level).
- **Pass context as parameters** — do not read org/project/component from internal state; pass the values returned by DevantGetSelectedIntegrationTool explicitly.
- **Always use marketplace services via Devant connections** — do not hardcode API keys or construct HTTP clients manually when the service is in the marketplace.
- **connections.bal** holds all Devant connection client initializations. It is auto-imported by Ballerina. For REST services, this file is written automatically by ${DEVANT_CREATE_CONNECTION_TOOL}. For non-REST services (library fallback), write it yourself using the library module and \`configEntries\` — use \`os:getEnv(envVariableName)\` for each config value.
- **config.bal** holds all \`configurable\` declarations for environment-specific values (URLs, tokens, keys). It is written automatically by ${DEVANT_CREATE_CONNECTION_TOOL} — do not write it manually.
- **Do not duplicate** imports or configurable declarations that already exist in the file.
`.trim();
}
