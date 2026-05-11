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

import { CREATE_DATA_MAPPER_TOOL_NAME, GENERATE_DATA_MAPPING_TOOL_NAME } from "../tools/types";
import { SYNAPSE_EXPRESSION_GUIDE } from "./synapse_expression_guide"

export const SYNAPSE_GUIDE = `
# Latest Synapse integration generation guidelines and best practices

## Steps for developing integration solutions:
    - Make necessary assumptions to complete the solution.
    - Identify the necessary mediators from the following list of supported mediators
        - Core Mediators: call, call-template, drop, log, loopback, property, variable, propertyGroup, respond, send, sequence, store
        - Routing & Conditional Processing: filter, switch, validate
        - Custom & External Service Invocation: class, script
        - Message Transformation: enrich, header, payloadFactory, smooks, rewrite, xquery, xslt, datamapper, fastXSLT, jsontransform
        - Data & Event Handling: cache, dblookup, dbreport, dataServiceCall
        - Performance & Security: throttle, transaction
        - Message Processing & Aggregation: foreach, scatter-gather
        - Security & Authorization: NTLM
        - Error Handling: throwError
    - Other mediators (clone, iterate, callout, etc.) are also valid. Use them when needed.
    - Identify necessary connector operations.
    - Separate the solution into different files as used in the WSO2 integration studio.

**IMPORTANT: All older patterns are fully supported by MI. Use newer alternatives for new code only. Never rewrite existing code to replace older patterns — they may be required for edge cases.**

## Newer alternatives for new code

| Older Pattern | Preferred for New Code |
|---------------|----------------------|
| \`outSequence\` | \`inSequence\`-only flow |
| \`property\` / \`propertyGroup\` | \`variable\` (except runtime props needing \`scope\`) |
| \`log level\` + \`<property>\` children | \`log category\` + \`<message>\` |
| \`clone\` | \`scatter-gather\` |
| \`iterate\` | \`foreach\` |
| \`call\`/\`send\` for REST | HTTP connector (keep \`call\` for SOAP) |
| \`filter source+regex\` | \`filter xpath\` |

## Guidelines for generating Synapse artifacts:
   - Create a separate file for each endpoint.
   - Split complex logic into separate sequences; create a separate file for each and call via sequence keys.
   - Give meaningful names to Synapse artifacts.
   - Provide a meaningful path in the uri-template in APIs.
   - Use &amp; instead of & in XML.
   - Use the Redis connector instead of the cache mediator for Redis cache.
   - Do not leave placeholders like "To be implemented". Always implement the complete solution.
   - Use WSO2 Connectors whenever possible instead of directly calling APIs.
   - Do not use new class mediators unless absolutely necessary.
   - Define driver, username, dburl, and passwords inside the dbreport or dblookup mediator <connection> tag instead of generating deployment toml file changes.
   - Do not use fake XML placeholders (e.g., <TODO>, <placeholder>, <...>).
   - The respond mediator should be empty; it does not support child elements.

## Connectors & Inbound Endpoints:
    - Prefer WSO2 connectors over direct API calls when applicable.
    - Inbound endpoints (also called event listeners) listen to events for triggering sequences.

## API Template (inSequence-only flow)
\`\`\`xml
<api xmlns="http://ws.apache.org/ns/synapse" name="name-here" context="context-here">
    <resource methods="GET" uri-template="">
        <inSequence>
        </inSequence>
    </resource>
</api>
\`\`\`

## WSO2 has introduced Synapse Expressions, which should be used instead of JsonPath or XPath.
    - For complex expression patterns, type coercion rules, function details, and edge cases, load deep reference contexts via load_context_reference.

<SYNAPSE_EXPRESSION_REFERENCE>
    ${SYNAPSE_EXPRESSION_GUIDE}
</SYNAPSE_EXPRESSION_REFERENCE>

## Variable mediator (preferred over property for new code):
    - Syntax
    \`\`\`xml
    <variable name="userName" type="STRING" value="JohnDoe"/>
    <variable name="userId" type="INTEGER" expression="\${payload.user.id}"/>
    \`\`\`
    - Supported types: \`STRING\`, \`BOOLEAN\`, \`INTEGER\`, \`DOUBLE\`, \`LONG\`, \`XML\`, \`JSON\`.
    - Use either \`value\` or \`expression\` in a single variable definition (not both).

    - Examples
    \`\`\`xml
    <variable name="username" value="JohnDoe" type="STRING"/>
    <variable name="userDataObject" expression="\${payload.user.data}" type="JSON"/>
    <variable name="userId" expression="\${payload.user.id}" type="INTEGER"/>
    \`\`\`
    
    - Generic variables use only name, type, and value/expression attributes.
    - **Exception:** Synapse runtime properties (e.g., \`HTTP_SC\`, \`messageType\`, \`REST_URL_POSTFIX\`, \`ERROR_CODE\`) require \`action\` and \`scope\` attributes. See the "Synapse Runtime Properties" section below.
    - Example of an incorrect usage:
    \`\`\`xml
    <variable name="username" value="JohnDoe" type="STRING">
       <![CDATA[{ "name": "JohnDoe" }]]>
    </variable>
    \`\`\`

    - How to set a JSON object to a variable:
    \`\`\`xml
    <variable name="userDataObject" type="STRING" value="{&quot;name&quot;: &quot;JohnDoe&quot;}"/>
    \`\`\`

    - To reference variables:
    \`\`\`xml
    <log category="INFO">
       <message>\${vars.username}</message>
    </log>
    \`\`\`

## Log mediator
    - New code syntax:
    \`\`\`xml
    <log [category="INFO|TRACE|DEBUG|WARN|ERROR|FATAL"] [separator="string"] logMessageID=(true | false) logFullPayload=(true | false)>
       <message>Hello \${payload.name}, RequestID=\${vars.requestId}</message>
    </log>
    \`\`\`
    - Older syntax (still valid):
    \`\`\`xml
    <log level="custom">
        <property name="Message" value="Starting the sequence execution."/>
        <property name="RequestID" expression="get-property('RequestID')"/>
    </log>
    \`\`\`

## HTTP connector (preferred for new REST integrations; use call/send for SOAP or when HTTP connector doesn't fit).
    - Resolve initialization mode from connector summary fields (\`connectionLocalEntryNeeded\`, \`noInitializationNeeded\`) and follow \`CONNECTOR_DEVELOPMENT_GUIDELINES\`.
    - Do not assume all HTTP usage requires local entry + \`configKey\`; that is required only when \`connectionLocalEntryNeeded=true\`.
    - If local entry is required, keep each local entry in a separate file.

    - Example GET:
       \`\`\`xml
       <http.get configKey="QueryDoctorConn">
          <relativePath>/\${params.pathParams.category}</relativePath>
          <headers>[[&quot;content-type&quot;,&quot;application/xml&quot;]]</headers>
       </http.get>
       \`\`\`

    - Example POST:
       \`\`\`xml
       <http.post configKey="SimpleStockQuoteService">
          <relativePath></relativePath>
          <headers>[]</headers>
          <requestBodyType>XML</requestBodyType>
          <requestBodyXml>{\${xpath('$body/node()')}}</requestBodyXml>
       </http.post>
       \`\`\`

    - How to add query parameters:
    \`\`\`xml
    <http.get configKey="SimpleStockQuoteService">
      <relativePath>/getQuote?userId=\${vars.userId}</relativePath>
      <headers>[]</headers>
    </http.get>
    \`\`\`
    - Supported methods: GET, POST, PUT, DELETE, HEAD, PATCH, OPTIONS
    - Optional boolean flags (all default to false): \`forceScAccepted\`, \`disableChunking\`, \`forceHttp10\`, \`noKeepAlive\`, \`forcePostPutNobody\`, \`forceHttpContentLength\`. Only include when needed.

## SOAP / XML Integration Recommendations
    - For SOAP, use the \`call\` mediator with a named endpoint. Avoid the HTTP connector as it does not support SOAP.
    - Never assume HTTP for external services. Prefer HTTPS unless the service is explicitly HTTP-only.

### SOAP response access after \`call\` (MI 4.x)
    - After a SOAP \`call\`, \`\${payload}\` is JSON. When using \`\${payload}\`, prefer JSON paths. The JSON key names match the XML element local names (namespace prefix is stripped):
    \`\`\`xml
    <!-- SOAP response: <m:NumberToWordsResponse><m:NumberToWordsResult>five hundred -->
    <variable name="result" expression="\${payload.NumberToWordsResponse.NumberToWordsResult}" type="STRING"/>
    \`\`\`
    - Storing \`\${payload}\` as \`type="XML"\` after a SOAP call can fail with \`WstxUnexpectedCharException: Unexpected character '{'\` because the value is JSON, not XML.
    - \`xpath()\` and \`\$body\` access are supported when the raw XML body is explicitly materialized and that usage is documented by the expression engine for the flow.
    - For \`\$body\`/\`xpath()\` syntax and quoting patterns, follow the Synapse Expression Guide examples in this document.

### SOAP namespace accuracy
    - Never infer SOAP operation namespace from service URL.
    - Always use WSDL \`targetNamespace\` when building SOAP bodies (especially in \`payloadFactory\`).
    - Wrong namespace can cause silent SOAP Fault behavior (empty results without explicit MI exception).

## Synapse Runtime Properties (axis2 & synapse scope)
Synapse has special properties set via the \`variable\` mediator (with axis2 or synapse scope) that control runtime HTTP/transport behavior. These are NOT regular application variables — they change how MI processes and sends messages. Common scenarios:
- **Custom HTTP status codes**: Return 202 Accepted, 204 No Content, etc. → set \`HTTP_SC\` in axis2 scope
- **Content-type control**: \`messageType\` (controls serialization format) vs \`ContentType\` (controls HTTP Content-Type header) — both in axis2 scope
- **Transport behavior**: Disable chunking, force HTTP 1.0, disable keep-alive, force Content-Length header
- **Fire-and-forget**: \`OUT_ONLY\` / \`FORCE_SC_ACCEPTED\` for async one-way messages
- **REST URL manipulation**: \`REST_URL_POSTFIX\` to dynamically append to endpoint URLs
- **Error info in fault sequences** (read-only): \`ERROR_CODE\`, \`ERROR_MESSAGE\`, \`ERROR_DETAIL\` — these are populated by the mediation engine in synapse scope and are available for reading inside fault sequences, but are NOT set via the variable mediator

The writable transport properties above are set using the variable mediator with scope:
\`\`\`xml
<variable name="HTTP_SC" type="INTEGER" value="202" action="set" scope="axis2"/>
<variable name="messageType" type="STRING" value="application/json" action="set" scope="axis2"/>
\`\`\`

For the full property reference (70+ properties with exact names, scopes, and usage patterns), load the \`synapse-property-reference\` context.

## Filter mediator (prefer xpath for new code):
    - The \`xpath\` attribute accepts Synapse Expressions (despite the attribute name). The expression must evaluate to a boolean.
\`\`\`xml
<filter xpath="\${payload.age &gt; 18}">
    <then>
        <!-- adult flow -->
    </then>
    <else>
        <!-- minor flow -->
    </else>
</filter>
\`\`\`

## Scatter-Gather mediator (preferred over clone for new code).
    - The Scatter Gather Mediator can be used to clone a message into several messages and aggregate the responses. It resembles the Scatter-Gather enterprise integration pattern.
    - Syntax:
    \`\`\`xml
    <scatter-gather parallel-execution=(true | false) target=(Body | Variable) target-variable=(string) result-content-type=(JSON | XML) result-enclosing-element=(string)>
        <aggregation expression="expression" condition="expression" timeout="long" min-messages="expression" max-messages="expression"/>
        <sequence>
        (mediator)+
        </sequence>+
    </scatter-gather>
    \`\`\`
    - Example: In this example, the Scatter Gather mediator execute the sequences parallel and replace the message body with the aggregated JSON result.
    \`\`\`xml
    <scatter-gather parallel-execution="true" target="Body" result-content-type="JSON">
        <aggregation expression="\${payload}" />

        <!-- First Execution Path -->
        <sequence>
            <log category="INFO">
                <message>Processing message in path 1</message>
            </log>
            <payloadFactory media-type="json">
                <format>
                    {
                        "requestId": \${payload.requestId},
                        "pet": {
                            "name": "pet2",
                            "type": "cat"
                        },
                        "status": true
                    }
                </format>
            </payloadFactory>
        </sequence>

        <!-- Second Execution Path -->
        <sequence>
            <log category="INFO">
                <message>Processing message in path 2</message>
            </log>
            <http.post configKey="PetServiceConn">
                <relativePath>/api/pet</relativePath>
                <headers>[]</headers>
                <requestBodyType>JSON</requestBodyType>
                <requestBodyJson>\${payload}</requestBodyJson>
            </http.post>
        </sequence>

    </scatter-gather>
    \`\`\`

## ForEach Mediator (v2 — collection-based iteration)
    - Use forEach to iterate over a JSON array.
    - Syntax:
    \`\`\`xml
    <foreach collection="\${expression}" parallel-execution=(true | false) counter-variable="string" update-original=(true | false) result-content-type=(JSON | XML) target-variable="string">
        <sequence>
            (mediator)+
        </sequence>
    </foreach>
    \`\`\`
    - During iteration, \`\${payload}\` refers to the current array element, not the original payload.
    - Use \`counter-variable\` to access the current index via \`\${vars.counterName}\`.
    - Sequences inside forEach cannot contain \`call\`, \`send\`, or \`callout\` mediators.
    - Example:
    \`\`\`xml
    <foreach collection="\${payload.orders}" parallel-execution="false" counter-variable="i">
        <sequence>
            <log category="INFO">
                <message>Order \${vars.i}: \${payload.orderId}</message>
            </log>
        </sequence>
    </foreach>
    \`\`\`

## Correct syntax for dblookup mediator:
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

## How to do error handling in Synapse:
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

2. Throw Error Mediator:
    - Use the new **Throw Error Mediator** to Explicitly Trigger an Error and it should be handled in the immediate fault sequence.
    - Syntax:
    \`\`\`xml
    <!-- Error message as string -->
    <throwError type="string" errorMessage="string"></throwError>
    <!-- Dynamic error message -->
    <throwError type="string" errorMessage="\${expression}"></throwError>
    \`\`\`
    - Example:
    \`\`\`xml
    <api context="/testThrowError" name="TestThrowErrorMediatorAPI" xmlns="http://ws.apache.org/ns/synapse">
        <resource methods="POST">
            <inSequence>
                <filter xpath="\${exists(payload.required)}">
                    <then>
                        <log category="INFO" logMessageID="false" logFullPayload="true">
                            <message>Required field exists: \${payload.required}</message>
                        </log>
                        <respond/>
                    </then>
                    <else>
                        <variable name="ERROR_MSG" value="Required field does not exist"/>
                        <throwError type="PAYLOAD_ERROR" errorMessage="\${vars.ERROR_MSG}"/>
                    </else>
                </filter>
            </inSequence>
            <faultSequence>
                <log category="INFO" logMessageID="false" logFullPayload="false">
                    <message>Error: \${props.synapse.ERROR_CODE} - \${props.synapse.ERROR_MESSAGE}</message>
                </log>
                <drop/>
            </faultSequence>
        </resource>
    </api> 
    \`\`\`

## Data Mappers
**Important runtime requirement:** Data mapper artifacts and the \`<datamapper>\` mediator require MI runtime \`4.4.0\` or newer. If runtime is below \`4.4.0\`, do not use data mapper generation.

Data mappers transform data between input and output schemas using TypeScript. They are used with the \`<datamapper>\` mediator in Synapse integrations.

**Tool routing (always prefer tools over hand-writing):**
- New mapper → use \`${CREATE_DATA_MAPPER_TOOL_NAME}\` (scaffolds folder, \`.ts\` file, and \`dm-utils.ts\`).
- Generate / fill the \`mapFunction\` body → use \`${GENERATE_DATA_MAPPING_TOOL_NAME}\`.
- Direct \`file_edit\` on the \`.ts\` file is only for targeted single-field tweaks, user-dictated formula changes, or fixing a TS2556 spread error.

**Before editing an existing \`.ts\` mapping file**, load \`data-mapper-reference\` via \`load_context_reference\` for the dmUtils API, the TS2556 dynamic-array spread rule (use \`arr.reduce(...)\`, never \`dmUtils.sum(...arr)\`), and the file format. Sections: \`overview\`, \`typescript_rules\`, \`dmutils_functions\`, \`dynamic_arrays\`, \`when_to_use_dmutils\`, \`array_handling\`, \`tool_usage\`.

**Using Data Mapper in Synapse XML:**
\`\`\`xml
<datamapper
    config="resources:/datamapper/{name}/{name}.dmc"
    inputSchema="resources:/datamapper/{name}/{name}_inputSchema.json"
    inputType="JSON"
    outputSchema="resources:/datamapper/{name}/{name}_outputSchema.json"
    outputType="JSON"/>
\`\`\`

## Registry Resources
When creating supportive resources that are needed for the Integration inside src/main/wso2mi/resources, an entry should be added to the src/main/wso2mi/resources/artifact.xml. If an artifact.xml doesn't exist, then create one and add the entry. The format should be as follows:
For data mappers this is automatically done by the ${CREATE_DATA_MAPPER_TOOL_NAME} tool. But for other resources, you need to add the entry manually.

\`\`\`xml
<?xml version="1.0" encoding="UTF-8"?>
<artifacts>
  <artifact name="resources_json_test_json" groupId="com.microintegrator.projects" version="1.0.0" type="registry/resource" serverRole="EnterpriseIntegrator">
    <item>
      <file>test.json</file>
      <path>/_system/governance/mi-resources/json</path>
      <mediaType>application/json</mediaType>
      <properties></properties>
    </item>
  </artifact>
</artifacts>
\`\`\`

Here the path artifact name should be unique and generally resembles the file path inside the resources folder. The file element should be the name of the file inside the resources folder. The path element should be the registry path where the resource will be added when the integration is deployed. Generally resources are added inside '/_system/governance/mi-resources'. The mediaType should be the media type of the resource. The properties element can be used to add any additional properties to the resource, but it can be left empty if there are no additional properties to add. 
For an example if an XSLT file is added inside src/main/wso2mi/resources/xslt/conversion.xslt, then the artifact entry can be as follows:

\`\`\`xml
<artifact name="resources_xslt_conversion_xslt" groupId="com.microintegrator.projects" version="1.0.0" type="registry/resource" serverRole="EnterpriseIntegrator">
    <item>
      <file>conversion.xslt</file>
      <path>/_system/governance/mi-resources/xslt</path>
      <mediaType>application/xslt+xml</mediaType>
      <properties></properties>
    </item>
  </artifact>
\`\`\`

Content under api-definitions, conf, connectors and metadata are not added as registry resources and hence do not require an entry in the artifact.xml. Only supportive resources that are needed for the integration and are added inside src/main/wso2mi/resources need to be added as registry resources and require an entry in the artifact.xml.
`;
