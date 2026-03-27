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
        - Core Mediators: call, call-template, drop, log, loopback, property(deprecated), variable, propertyGroup(deprecated), respond, send, sequence, store
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

#### WSO2 has introduced Synapse Expressions, which should be used instead of JsonPath or XPath. Refer to the following documentation.

<SYNAPSE_EXPRESSIONS_DOCS>
    {{> synapse_expression_guide}}
</SYNAPSE_EXPRESSIONS_DOCS>

<SYNAPSE_EXPRESSION_EXAMPLES>
     {{> synapse_expression_examples}}
</SYNAPSE_EXPRESSION_EXAMPLES>

#### Use the new variable mediator instead of the deprecated property mediator:
    - Syntax
    \`\`\`xml
    <variable name="string" [type="STRING"|"BOOLEAN"|"INTEGER"|"DOUBLE"|"LONG"|"XML"|"JSON"] (value="string" | expression="expression") />
    \`\`\`

    - Examples
    \`\`\`xml
    <variable name="username" value="JohnDoe" type="STRING"/>
    <variable name="userDataObject" expression="\${payload.user.data}" type="JSON"/>
    <variable name="userId" expression="\${payload.user.id}" type="INTEGER"/>
    \`\`\`
    
    - Variables can only include name, type, and value/expression attributes.
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

#### Do not use \`level\` in log mediator. It is deprecated. Use \`category\` instead.

    - Incorrect syntax:
    \`\`\`xml
    <log level="custom">
       <message>Message</message>
    </log>
    \`\`\`

    - Correct syntax:
    \`\`\`xml
    <log [category="INFO|TRACE|DEBUG|WARN|ERROR|FATAL"] [separator="string"]>
       <message></message>
    </log>
    \`\`\`

    - Do not use properties inside log mediators. It is deprecated.  Use Synapse Expressions directly:
    - Deprecated syntax:
    \`\`\`xml
    <log level="custom">
        <property name="Message" value="Starting the sequence execution."/>
        <property name="RequestID" expression="get-property('RequestID')"/>
    </log>
    \`\`\`

    - Correct syntax:
    \`\`\`xml
    <log category="INFO">
       <message>\${payload.name}</message>
    </log>

    <log category="INFO">
       <message>Hello \${payload.name}, Welcome to the system</message>
    </log>
    \`\`\`

#### Do not use call or send mediators. Instead, use the new HTTP connector:
    - 	First, define a local entry using http.init:
       \`\`\`xml
       <localEntry key="HTTP_1" xmlns="http://ws.apache.org/ns/synapse">
          <http.init>
             <connectionType>http</connectionType> <!-- http or https -->
             <baseUrl>http://localhost:9090</baseUrl>
             <authType>Basic Auth</authType>
             <basicCredentialsUsername>user</basicCredentialsUsername>
             <basicCredentialsPassword>1234</basicCredentialsPassword>
             <timeoutDuration>10</timeoutDuration>
             <timeoutAction>Never</timeoutAction>
             <retryErrorCodes>500</retryErrorCodes>
             <retryCount>1</retryCount>
             <retryDelay>5</retryDelay>
             <suspendErrorCodes>406</suspendErrorCodes>
             <suspendInitialDuration>-1</suspendInitialDuration>
             <suspendProgressionFactor>1</suspendProgressionFactor>
             <suspendMaximumDuration>5000</suspendMaximumDuration>
             <name>balSampleConn</name>
          </http.init>
       </localEntry>
       \`\`\`
    - Always create a separate file for each local entry

    - Example GET:
       \`\`\`xml
       <http.get configKey="QueryDoctorConn">
          <relativePath>/\${params.uriParams.category}</relativePath>
          <headers>[[&quot;content-type&quot;,&quot;application/xml&quot;],]</headers>
          <forceScAccepted>false</forceScAccepted>
          <disableChunking>false</disableChunking>
          <forceHttp10>false</forceHttp10>
          <noKeepAlive>false</noKeepAlive>
          <forcePostPutNobody>false</forcePostPutNobody>
          <forceHttpContentLength>false</forceHttpContentLength>
       </http.get>
       \`\`\`

    - Example POST:
       \`\`\`xml
       <http.post configKey="SimpleStockQuoteService">
          <relativePath></relativePath>
          <headers>[]</headers>
          <requestBodyType>XML</requestBodyType>
          <requestBodyXml>{\${xpath('$body/node()')}}</requestBodyXml>
          <forceScAccepted>false</forceScAccepted>
          <disableChunking>false</disableChunking>
          <forceHttp10>false</forceHttp10>
          <noKeepAlive>false</noKeepAlive>
          <forcePostPutNobody>false</forcePostPutNobody>
          <forceHttpContentLength>false</forceHttpContentLength>
       </http.post>
       \`\`\`
    - How to add query parameters:
    \`\`\`xml
    <http.get configKey="SimpleStockQuoteService">
      <relativePath>/getQuote?userId=\${vars.userId}</relativePath>
      <headers>[]</headers>
      <requestBodyType>XML</requestBodyType>
      <requestBodyXml>{\${xpath('$body/node()')}}</requestBodyXml>
      <forceScAccepted>false</forceScAccepted>
      <disableChunking>false</disableChunking>
      <forceHttp10>false</forceHttp10>
      <noKeepAlive>false</noKeepAlive>
      <forcePostPutNobody>false</forcePostPutNobody>
      <forceHttpContentLength>false</forceHttpContentLength>
    </http.get>
    \`\`\`
    - Supported methods: GET, POST, PUT, DELETE, HEAD, PATCH, OPTIONS

#### For the new filter mediator, do not use source. Use only xpath:
\`\`\`xml
<filter xpath="[SynapseExpression]">
    <then>
     mediator+
    </then>
    <else>
     mediator+
    </else>
</filter>
\`\`\`

#### Prefer the Scatter-Gather Mediator Over the Deprecated Clone Mediator.
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

2. Throw Error Mediator:
    - Use the new **Throw Error Mediator** to Explicitly Trigger an Error and it should be handled in the immediate fault sequence.
    - Syntax:
    \`\`\`xml
    <!-- Error message as string -->
    <throwError type="string" errorMessage="string"></throwError>
    <!-- Dynamic error message -->
    <throwError type="string" errorMessage="{\${expression}}"></throwError>
    \`\`\`
    - Example:
    \`\`\`xml
    <api context="/testThrowError" name="TestThrowErrorMediatorAPI" xmlns="http://ws.apache.org/ns/synapse">
        <resource methods="POST">
            <inSequence>
                <filter xpath="\${exists(payload.required)}">
                    <then>
                        <log level="full"/>
                        <respond/>
                    </then>
                    <else>
                        <variable name="ERROR_MSG" value="Required field does not exist"/>
                        <throwError type="PAYLOAD_ERROR" errorMessage="{\${vars.ERROR_MSG}}"/>
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
`;
