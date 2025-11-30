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

export const PROMPT_SUITE_GENERATE = `
{{#if full_context}}
<USER_PROJECT>
{{#each full_context}}
{{this}}
{{/each}}
</USER_PROJECT>
Generate comprehensive unit tests for the WSO2 Synapse artifacts in the above project. Create multiple test cases when necessary to thoroughly cover the artifact's functionality, including different scenarios, edge cases, and execution paths. For simple artifacts where one test case adequately validates the functionality, a single comprehensive test case is sufficient.
{{else}}
{{#if context}}
<USER_PROJECT>
{{#each context}}
{{this}}
{{/each}}
</USER_PROJECT>
Generate comprehensive unit tests for the WSO2 Synapse artifacts in the above project. Create multiple test cases when necessary to thoroughly cover the artifact's functionality, including different scenarios, edge cases, and execution paths. For simple artifacts where one test case adequately validates the functionality, a single comprehensive test case is sufficient.
{{/if}}
{{/if}}

{{#if pom_file}}
<POM_FILE>
{{pom_file}}
</POM_FILE>
Analyze the POM file to identify internal WSO2 connectors. Look for dependencies with groupId "org.wso2.integration.connector" and use format {artifactId}-{version} for connector-resources (e.g., mi-connector-http-0.1.11).
{{/if}}

{{#if external_connectors}}
<EXTERNAL_CONNECTORS>
The following external/custom connectors are used in this project:
{{#each external_connectors}}
- {{this}}
{{/each}}
</EXTERNAL_CONNECTORS>
These are custom connectors stored in src/main/wso2mi/resources/connectors/. Use full path format with .zip extension: src/main/wso2mi/resources/connectors/{connectorName}.zip when referencing them in connector-resources.
{{/if}}

{{#if test_file_name}}
<TEST_FILE_NAME>
{{test_file_name}}
</TEST_FILE_NAME>
Use the above file name for the generated unit test file.
{{/if}}

**Important Instructions for Assertions:**
The assertions you can use depend on the artifact type being tested:

**For API Artifacts - ONLY these assertions are allowed:**
- \`$body\` - Full response body
- \`$statusCode\` - HTTP status code
- \`$trp:<Header-Name>\` - Transport headers (e.g., \`$trp:Content-Type\`)
- \`$httpVersion\` - HTTP version

**For Sequence Artifacts - Full synapse expression support:**
- \`$body\` - Full response body
- \`$trp:<Header-Name>\` - Transport headers
- \`\${payload}\` - Full payload access
- \`\${payload.fieldName}\` - Payload field access
- \`\${vars.variableName}\` - Variable access
- Any other valid synapse expressions

**Important Instructions for Mock Services:**
**CRITICAL: ALL MOCK SERVICES MUST USE PORT 9090 - NO EXCEPTIONS**
**STRICT MOCK SERVICE RULES WITH ENDPOINT ANALYSIS:**
1. **CAREFULLY ANALYZE CODE** for external calls that need mocking:
   - \u003ccall\u003e\u003cendpoint key="endpointName"/\u003e - use \u003cservice-name\u003eendpointName\u003c/service-name\u003e in mock service
   - \u003ccall\u003e\u003cendpoint key="resources:filename.xml"/\u003e - use \u003cservice-name\u003eresources:filename.xml\u003c/service-name\u003e in mock service
   - HTTP connector operations calling external services
2. **MANDATORY ENDPOINT CONFIGURATION ANALYSIS**: Before creating any mock service, you MUST:
   - **READ THE ACTUAL ENDPOINT CONFIGURATION**: Analyze the endpoint definition to understand its real configuration
   - **EXTRACT HTTP METHOD**: Get the actual method (GET, POST, PUT, DELETE) from the endpoint's \`method\` attribute
   - **PARSE THE EXTERNAL URL**: Extract the full \`uri-template\` to understand the target service
   - **ALWAYS USE PORT 9090**: All mock services must use port 9090 regardless of original endpoint configuration
   - **CRITICAL PORT RULE**: NEVER analyze or extract port from the original endpoint - ALWAYS use 9090
   - **FORBIDDEN**: Do NOT use ports like 443, 80, 8080, or any other ports - ONLY use 9090
   - **EXTRACT CONTEXT PATH**: Parse the URL to get the base path (e.g., \`/v1\` from \`https://mocki.io/v1/resource\`)
   - **GET SUB-CONTEXT**: Extract the specific resource path (e.g., \`/a757849d-80b6...\` from the full URL)
   - **NEVER USE GENERIC DEFAULTS**: Do not use placeholder values like \`/api\` context or \`/\` sub-context without analyzing the real endpoint
3. **EXAMPLE OF PROPER ENDPOINT ANALYSIS**:
   - Endpoint config: \u003chttp method="get" uri-template="https://mocki.io/v1/a757849d-80b6-4d00-a1be-1d517ede86fa"\u003e
   - **CORRECT** mock service: \u003cport\u003e9090\u003c/port\u003e, \u003ccontext\u003e/v1\u003c/context\u003e, \u003csub-context\u003e/a757849d-80b6-4d00-a1be-1d517ede86fa\u003c/sub-context\u003e, \u003cmethod\u003eGET\u003c/method\u003e
   - **WRONG** mock service: \u003ccontext\u003e/api\u003c/context\u003e, \u003csub-context\u003e/\u003c/sub-context\u003e
4. **ONLY** create mock services for external endpoint calls or database calls that are being used in the artifact being tested
5. **DO NOT** write mock services for everything - only for external calls like HTTP endpoints, database connections, web services
6. **DO NOT** mock internal sequences, local entries, or other internal artifacts unless they make external calls
7. **DO NOT HALLUCINATE RESPONSES**: Mock services must reflect the actual expected behavior and response structure of the real endpoint being mocked, not create fictional or fantasy responses
8. **MANDATORY REQUIREMENT**: When you declare mock services in the \u003cmock-services\u003e section, you MUST provide BOTH:
   - **Mock service XML content**: Include complete mock service XML in the \`mock_services\` response array
   - **Mock service file names**: Include descriptive file names in the \`mock_service_names\` response array
   - **Mock service references**: Use full path format \`src/test/resources/mock-services/MockServiceName.xml\` in unit test \u003cmock-services\u003e section
   - The \u003cservice-name\u003e inside mock service XML should be the exact endpoint key reference
   - The \u003cport\u003e inside mock service XML should always be \`9090\`
   - **ALWAYS** provide complete mock service implementations that support the test scenarios
   - **REALISTIC RESPONSES**: Use meaningful response data that matches what the actual endpoint would return
   - **DO NOT CREATE FANTASY DATA**: Base responses on realistic, expected behavior of the actual endpoint
   - Follow the correct WSO2 mock service XML structure as documented in the guidelines
9. **CRITICAL**: The \`service-name\` in mock service XML must be the exact endpoint key reference from the API code:
   - For \u003ccall\u003e\u003cendpoint key="testEpSeq"/\u003e → \u003cservice-name\u003etestEpSeq\u003c/service-name\u003e
   - For \u003ccall\u003e\u003cendpoint key="resources:testregistry.xml"/\u003e → \u003cservice-name\u003eresources:testregistry.xml\u003c/service-name\u003e
10. **CRITICAL MOCK SERVICE REFERENCE FORMAT**:
   - **ALWAYS use full path format** in unit test \u003cmock-services\u003e section
   - **MANDATORY FORMAT**: \`src/test/resources/mock-services/MockServiceName.xml\`
   - **WRONG**: \u003cmock-service\u003eExternalEndpointMock\u003c/mock-service\u003e
   - **CORRECT**: \u003cmock-service\u003esrc/test/resources/mock-services/ExternalEndpointMock.xml\u003c/mock-service\u003e
11. Mock service file names can be descriptive and different from the service-name they mock

**CRITICAL**: If you declare ANY mock services in the \u003cmock-services\u003e section, you MUST provide BOTH the mock service XML content AND the file names.

**MANDATORY RESPONSE FORMAT:**
If you declare mock services in the unit test XML, your response MUST provide the mock service files.

For API code: \u003ccall\u003e\u003cendpoint key="resources:testregistry.xml"/\u003e\u003c/call\u003e

**You MUST generate the mock service file in markdown format like this:**

\`\`\`markdown
## Unit Test File: testRegAPI_UnitTest.xml
\`\`\`xml
<unit-test>
    <!-- ... unit test content ... -->
    <mock-services>
        <mock-service>src/test/resources/mock-services/RegistryEndpointMock.xml</mock-service>
    </mock-services>
</unit-test>
\`\`\`

## Mock Service Files:
### RegistryEndpointMock.xml
\`\`\`xml
<mock-service>
    <service-name>resources:testregistry.xml</service-name>
    <port>9090</port>
    <context>/v1</context>
    <resources>
        <resource>
            <sub-context>/a757849d-80b6-4d00-a1be-1d517ede86fa</sub-context>
            <method>GET</method>
            <request>
                <headers></headers>
            </request>
            <response>
                <status-code>200</status-code>
                <headers>
                    <header name="Content-Type" value="application/json"/>
                </headers>
                <payload><![CDATA[{"message":"success","data":"mocked response"}]]></payload>
            </response>
        </resource>
    </resources>
</mock-service>
\`\`\`
\`\`\`

**IF YOU DON'T PROVIDE MOCK SERVICE FILES WHEN DECLARING MOCK SERVICES, THE RESPONSE IS INCOMPLETE AND INCORRECT.**

**KEY POINTS:**
- Unit test \u003cmock-service\u003e: \`src/test/resources/mock-services/RegistryEndpointMock.xml\` (full path to mock service file)
- Mock service XML \u003cservice-name\u003e: \`resources:testregistry.xml\` (exact endpoint key reference from API code)
- Mock service XML \u003cport\u003e: \`9090\` (always use port 9090)
- File name in \`mock_service_names\`: "RegistryEndpointMock.xml" (descriptive file name with .xml extension)

Start creating your response now.
`;
