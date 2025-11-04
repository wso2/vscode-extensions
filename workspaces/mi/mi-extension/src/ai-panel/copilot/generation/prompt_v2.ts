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
{{#if file}}
<CURRENTLY_EDITING_FILE>
{{file}}
</CURRENTLY_EDITING_FILE>
This is the file that the user is currently editing. User may refer it as "this". Give priority to this file when generating the solution.
{{/if}}

{{#if context}}
<USER_PROJECT>
{{#each context}}
{{this}}
{{/each}}
</USER_PROJECT>
{{#if file}}This is the rest of the user project context.{{else}}This is the user project.{{/if}}
{{/if}}

{{#if payloads}}
{{#if context}}
<USER_PRECONFIGURED>
{{payloads}}
</USER_PRECONFIGURED>
These are preconfigured values that should be accessed using Synapse expressions in the integration flow. Always use Synapse expressions when referring to these values.
{{/if}}
{{/if}}

{{#if connectors}}
<CONNECTORS_DOCUMENTATION>

WSO2 MI Connectors can be used to connect to various services and APIs.
Followings are the available WSO2 Connectors for this integration.
You may or may not need these connectors for this integration.
Always prefer using these connectors over direct API calls when applicable.

<CONNECTOR_JSON_SIGNATURES>
{{#each connectors}}
{{#unless (eq @key "ai")}}
<{{upper @key}}_CONNECTOR_DEFINITION>
{{this}}
</{{upper @key}}_CONNECTOR_DEFINITION>
{{/unless}}
{{/each}}
</CONNECTOR_JSON_SIGNATURES>

{{#each connectors}}
{{#if (eq @key "ai")}}
<AI_CONNECTOR_USAGE>
Also you may need to use the new AI connector for AI operations in this integration.
<{{upper @key}}_CONNECTOR_DEFINITION>
{{this}}
</{{upper @key}}_CONNECTOR_DEFINITION>

<AI_CONNECTOR_DOCUMENTATION>
{{> ai_module}}
</AI_CONNECTOR_DOCUMENTATION>
</AI_CONNECTOR_USAGE>
{{/if}}
{{/each}}

When using connectors, follow these rules:
1. Only use operations defined in the connector JSON signatures.
2. For connectors with \`connectionLocalEntryNeeded\`: true
   - You must define a local entry for each connection type.
   - Always include the name parameter in the init operation.
   - Pass the key of the local entry via configKey in the connector operation for using the connection.
   - If a connector connection has been initialized via a local entry, do not initialize it again elsewhere.
Example: Defining and using a connector with connectionBasedSupport
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
3. For connectors with \`connectionLocalEntryNeeded\`: false
   - You must initialize the connection via the init operation everytime you use a connector operation in the synaose seqence itself.

4. For connectors with \`noInitializationNeeded\`: true
  - You do not need to initialize the connection via the init operation or a local entry.
  - You can directly use the connector operation.
Example:
\`\`\`xml
  <CSV.csvToJson>
      <headerPresent>Absent</headerPresent>
      <valueSeparator></valueSeparator>
      <columnsToSkip></columnsToSkip>
      <dataRowsToSkip></dataRowsToSkip>
      <csvEmptyValues>Null</csvEmptyValues>
      <jsonKeys></jsonKeys>
      <dataTypes></dataTypes>
      <rootJsonKey></rootJsonKey>
  </CSV.csvToJson>
\`\`\`

5. Never use <class name="..."/> in connector definitions—use the proper connector syntax instead.
6. Implement a complete and functional solution without placeholder comments or partial implementations.
7. Ensure all required parameters for each operation are explicitly included.
8. Do not use the utility connector unless absolutely necessary.

##### Revamped Connector operation response handling:
With the latest updates to certain connectors, operations now support two additional parameters:
1. \`responseVariable\` – Use this to store the connector operation response into a named variable.
    - This variable can be referenced later using Synapse expressions. ( \${vars.variable_name_you_defined} )
    - For operations where the response is required later, prefer responseVariable.
2. \`overwriteBody\` – Use this to directly replace the message body/payload with the connector's response.
    - This is useful when you want to pass the response from one connector operation as the request payload for the next. ( \${payload} )
    - For flows where the response must be forwarded, use overwriteBody.

</CONNECTORS_DOCUMENTATION>
{{/if}}

{{#if inbound_endpoints}}
<INBOUND_ENDPOINTS_DOCUMENTATION>

Inbound endpoints ( event listners ) are used to listen to events from various sources.
These are the available WSO2 Inbound Endpoints for this integration.
You may or may not need these inbound endpoints for this integration.

<INBOUND_ENDPOINT_JSON_SIGNATURES>

{{#each inbound_endpoints}}
<{{upper @key}}_INBOUND_ENDPOINT_DEFINITION>
{{this}}
</{{upper @key}}_INBOUND_ENDPOINT_DEFINITION>
{{/each}}
</INBOUND_ENDPOINT_JSON_SIGNATURES>

###How to use the inbound endpoint in Synapse:
1. First define a sequence to be executed when the event is received.
2. Then define an error sequence to be executed when an error occurs.
3. Then define the inbound endpoint.

#### How to define an inbound endpoint in Synapse:
You must fill the following inline parameters when defining the inbound endpoint:
  - name: Give a name to the inbound endpoint.
  - sequence: The name of the sequence to be executed when the event is received. The inbound endpoint will call this sequence when the event is received with the event payload.
  - onError: The name of the sequence to be executed when an error occurs.

Then add either class or protocol as an inline parameter.
  - protocol: The protocol to be used for the inbound endpoint.
  - class: The class name of the inbound endpoint.

Then define define inboundendpoint with additional parameters.
  - Refer to the parameters section in the JSON signature for the supported parameters.
 
\`\`\`xml
<inboundEndpoint name="" sequence="" onError="" protocol="" class="">
    <parameters>
        <parameter name="parameter name">parameter value</parameter>
        <parameter name="parameter name">parameter value</parameter>
    </parameters>
</inboundEndpoint>
\`\`\`
</INBOUND_ENDPOINTS_DOCUMENTATION>
{{/if}}

Now, analyze the following user query:

<USER_QUERY>
{{question}}
</USER_QUERY>

{{#if thinking_enabled}}
Before you create a response:
- Please think about the USER_QUERY thoroughly and in great detail. Consider multiple approaches and show your complete reasoning. Try different methods if your first approach doesn't work.
{{/if}}

Your final response should:
- Only include the solution and explanations.
- Not repeat the input information or these instructions.
- Strictly follow all the provided rules and generate a complete and accurate response.
- Provide a short but concise response.
- Provide the most simple yet effective solution possible. Do not overcomplicate the solution. Do not forcefully use connectors or inbound endpoints if not needed.

{{#if inbound_endpoints}}
STEPS TO FOLLOW for inbound endpoints:
- Think about what inbound endpoints you need to use.
- Define event listners using inbound endpoints.
- DO NOT INITIALIZE INBOUND ENDPOINTS USING LOCAL ENTRIES. YOU DO NOT NEED TO INITIALIZE INBOUND ENDPOINTS.
{{/if}}

{{#if connectors}}
STEPS TO FOLLOW for connectors:
- Think about what connectors, connections and operations you need to use.
- Define local entries for each connection type. Each local entry must go into a separate file.
- Define the rest of the required artifacts.
- DO NOT CREATE LOCAL ENTRIES FOR CONNECTIONS/CONNECTORS YOU DON'T NEED.
{{/if}}

Begin your analysis and solution development now.
`;
