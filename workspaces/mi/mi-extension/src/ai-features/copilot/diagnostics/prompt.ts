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

export const DIAGNOSTICS_PROMPT = `
The user is trying to run a Synapse integration developed by an AI assistant and has encountered errors identified by the Synapse language server.
Analyze the diagnostics information, identify the root causes, and correct the Synapse configurations to make them work properly.

{{#if diagnostics}}
### Diagnostics Information:
{{#each diagnostics}}
#### File: {{fileName}}
{{#each diagnostics}}
- **Message**: {{message}}
- **Location**: Line {{range.start.line}}, Character {{range.start.character}} to Line {{range.end.line}}, Character {{range.end.character}}
{{#if severity}}
- **Severity**: {{severity}}
{{/if}}
{{#if source}}
- **Source**: {{source}}
{{/if}}

{{/each}}
{{/each}}
{{/if}}

{{#if xml_code_map}}
### XML Codes:
{{#each xml_code_map}}
#### File: {{@key}}
\`\`\`xml
{{this}}
\`\`\`

{{/each}}
{{/if}}

Analyze the issues carefully and provide the complete fixed configuration for ALL files.

Your response should be a BugFixResponse object with a fixed_config field containing a list of SynapseConfiguration objects, one for each file, with each object containing:
- name: The file name
- configuration: The complete corrected XML configuration
- id: The ID of the configuration (if provided)

Remember to preserve the original functionality and intent of the code while making your fixes.

Start creating your response now.
`;
