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

export const PROMPT_TEMPLATE = `
{{#if context}}
I give you access to my whole project below.

<PROJECT>

{{#each context}}

{{this}}

{{/each}}

</PROJECT>
{{/if}}

{{#if files}}
I provide you following files for additional reference.

<FILES>

{{#each files}}

<FILE>
{{this}}
</FILE>

{{/each}}
</FILES>
{{/if}}

{{#if connectors}}
You may need to use WSO2 Connectors. WSO2 EI connectors are components that enable integration between WSO2 EI and various third-party systems, services, and APIs. You can always use WSO2 Connectors whenever possible instead of directly calling third party APIs.
Following are the JSON signatures of the connectors you may need.

<CONNECTOR_JSON_SIGNATURES>

{{#each connectors}}
<CONNECTOR>
{{this}}
</CONNECTOR>
{{/each}}

</CONNECTOR_JSON_SIGNATURES>

Please follow these rules when using connectors:

1. ONLY use operations specified in the JSON signatures of the connectors.
2. There are two types of connectors: those with connectionBasedSupport and those without.
3. If the connectionBasedSupport parameter is set to true in the JSON signature of the connector, create a local entry with the init operation and pass the local entry name as the configKey parameter in the connector operation. 
Example: If the local entry key is CONNECTION_1, it should be passed into the operation as <conector.operation configKey="CONNECTION_1"/>
4. Always add name paramter to the init operation.
5. If the availableConnections parameter contains available connections, you MUST select one connection type and add it as a parameter in the init method as connectionType.
6. If an init operation is added as a local entry for a connector, DO NOT initialize the connector again anywhere else.
7. For connectors that require initialization, create a local entry first before using any operations.
8. Never use <class name="connector class name"/> in connectors. instead use connector
9. Always implement a complete solution. Do not leave placeholder comments for the user to implement. Ensure that all required connector operation parameters are explicitly specified.

Following is an example of how to define a local entry for a connector:

\`\`\`xml
<localEntry key="EMAIL_CONNECTION_1" xmlns="http://ws.apache.org/ns/synapse">
    <email.init>
        <connectionType>IMAP</connectionType>
        <host>gmail.com</host>
        <enableOAuth2>false</enableOAuth2>
        <port>8899</port>
        <name>EMAIL_CONNECTION_1</name>
        <username>joe</username>
    </email.init>
</localEntry>
\`\`\`
\`\`\`xml
<email.delete configKey="EMAIL_CONNECTION_1"/>
\`\`\`

If you are generating an integration use following order.
1. Define local entries if you are using connectors. Create seperate file for each local entry.
2. Then define rest of the artifacts
{{/if}}

{{#if images}}I have attached some images for your reference. {{/if}}Now first take your time to think through STEP BY STEP to get the right answer strictly adhering to given guidlines and then reply to the following user query accordingly.
<QUERY>
{{question}}
</QUERY>
`;
