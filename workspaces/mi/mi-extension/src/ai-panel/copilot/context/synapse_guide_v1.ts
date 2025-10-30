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

export const SYNAPSE_GUIDE = `
### Latest Synapse integration development guidelines and best practices

#### Steps for developing integration solutions:
    - Make necessary assumptions to complete the solution.
    - Identify the necessary mediators from the following list of supported mediators
        - Core Mediators: call, call-template, drop, log, loopback, property(deprecated), propertyGroup(deprecated), respond, send, sequence, store
        - Routing & Conditional Processing: filter, switch, validate
        - Custom & External Service Invocation: class, script
        - Message Transformation: enrich, header, payloadFactory, smooks, rewrite, xquery, xslt, datamapper, fastXSLT, jsontransform
        - Data & Event Handling: cache, dblookup, dbreport, dataServiceCall
        - Performance & Security: throttle, transaction
        - Message Processing & Aggregation: foreach, scatter-gather
        - Security & Authorization: NTLM
        - Error Handling: throwError
    - There are other supported mediators but we do not encourage their use in latest versions of WSO2 Synapse.
    - DO NOT USE ANY MEDIATORS NOT LISTED ABOVE.
    - Identify necessary connector operations.
    - Then build the solution using mediators and connector operations following the guidelines given.
    - Separate the solution into different files as used in the WSO2 integration studio.
    - Provide only the Synapse artifacts and a short explanation if applicable.
    - Keep the answer as short as possible while still being complete.
    - Use placeholder values if required.

#### Guidelines for generating Synapse artifacts:
   - Adhere to Synapse best practices.
   - Create a separate file for each endpoint.
   - Split complex logic into separate sequences for clarity; create a separate file for each sequence and ensure all are called in the main logic using sequence keys.
   - Use the \`call\` mediator instead of the \`send\` mediator.
   - Do not use \`outSequence\` as it is deprecated.
   - Give meaningful names to Synapse artifacts.
   - Provide a meaningful path in the uri-template in APIs.
   - Use &amp; instead of & in XML.
   - Use the Redis connector instead of the cache mediator for Redis cache.
   - Do not change XML artifact names from the project or chat history.
   - When updating an XML artifact, provide the entire file with updated content.
   - Do not leave placeholders like "To be implemented". Always implement the complete solution.
   - Use WSO2 Connectors whenever possible instead of directly calling APIs.
   - Do not use new class mediators unless it is absolutely necessary.
   - Define driver, username, dburl, and passwords inside the dbreport or dblookup mediator <connection> tag instead of generating deployment toml file changes.
   - Do not use <> tags as placeholders.
   - To include an API key in uri-template, define:
    \`\`\`xml
    <variable name="username" value=your_api_key_here type="STRING"/>
    \`\`\`
   - The respond mediator should be empty; it does not support child elements.

#### WSO2 Synapse Connector Guidelines:
    - You can use WSO2 Synapse Connectors to integrate with WSO2 services and third-party services.
    - Always prefer using WSO2 connectors over direct API calls when applicable.

#### WSO2 Synapse Inbound Endpoints/Event Listeners Guidelines:
    - Inbound endpoints are also called event listeners in latest versions of WSO2 Micro Integrator.
    - You can use WSO2 Synapse Inbound Endpoints/Event Listeners to listen to events for triggering sequences.

#### Do not use outSequence as it is deprecated. Use the following sample API Template.
\`\`\`xml
<api xmlns="http://ws.apache.org/ns/synapse" name="name-here" context="context-here">
    <resource methods="GET" uri-template="">
        <inSequence>
        </inSequence>
    </resource>
</api>
\`\`\`

#### Correct syntax for dblookup mediator:
\`\`\`xml
<dblookup>
<connection>
  <pool>
    <driver/>
    <url/>
    <user/>
    <password/>
    <property name="name" value="value"/>*
  </pool>
</connection>
<statement>
  <sql>select something from table where something_else = ?</sql>
  <parameter [value="" | expression=""] type="CHAR|VARCHAR|LONGVARCHAR|NUMERIC|DECIMAL|BIT|TINYINT|SMALLINT|INTEGER|BIGINT|REAL|FLOAT|DOUBLE|DATE|TIME|TIMESTAMP"/>*
  <result name="string" column="int|string"/>*
</statement>+
</dblookup>
\`\`\`

#### How to do error handling in Synapse:
- There is no granular error handling like try-catch in Synapse.
<INCORRECT_SYNTAX>
    \`\`\`xml
    <try>
        Some mediators here
    </try>
    <catch>
        Some mediators here
    </catch>
    \`\`\`
</INCORRECT_SYNTAX>

1. Fault Sequences:
    - When an error occurs in a sequence, the immediate fault sequence is executed.
    - A fault sequence is a special sequence where you can define the error handling logic.
    - You can define fault sequencs for each API resource or each sequence.
    - Ex: fault sequence for an API resource:
    \`\`\`xml
    <api xmlns="http://ws.apache.org/ns/synapse" name="HelloWorldAPI" context="/hello">
        <resource methods="GET" uri-template="/world">
            <inSequence>
                <!-- Mediator logic here -->
            </inSequence>
            <faultSequence>
                <!-- Mediator logic here -->
                <!-- <respond/> or <drop/> mediator must be present here -->
            </faultSequence>
        </resource>
    </api>
    \`\`\`
    - Ex: A custom fault sequence for a sequence - This will trigger the custom fault sequence when an error occurs in the sequence.
    \`\`\`xml
    <sequence onError="CustomFaultSequence">
        <!-- Mediator logic here -->
        <!-- <respond/> or <drop/> mediator must be present here -->
    </sequence>
    \`\`\`
`;
