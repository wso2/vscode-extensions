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

export const PROMPT_CASE_GENERATE = `
{{#if full_context}}
<USER_PROJECT>
{{#each full_context}}
{{this}}
{{/each}}
</USER_PROJECT>
Add a new test case to the existing unit test suite for the WSO2 Synapse artifacts in the above project.
{{else}}
{{#if context}}
<USER_PROJECT>
{{#each context}}
{{this}}
{{/each}}
</USER_PROJECT>
Add a new test case to the existing unit test suite for the WSO2 Synapse artifacts in the above project.
{{/if}}
{{/if}}

<EXISTING_TEST_SUITE>
{{test_suite_file}}
</EXISTING_TEST_SUITE>

<TEST_CASE_DESCRIPTION>
{{test_case_description}}
</TEST_CASE_DESCRIPTION>

{{#if existing_mock_services}}
{{#if existing_mock_service_names}}
<EXISTING_MOCK_SERVICES>
{{#each existing_mock_services}}
### {{lookup ../existing_mock_service_names @index}}
{{this}}

{{/each}}
</EXISTING_MOCK_SERVICES>
The above mock services already exist in the project. Reuse them if the new test case requires the same external endpoints. Only create new mock services if the new test case needs external endpoints not covered by the existing ones.
{{/if}}
{{/if}}

{{#if pom_file}}
<POM_FILE>
{{pom_file}}
</POM_FILE>
Analyze the POM file to identify internal WSO2 connectors. Look for dependencies with groupId "org.wso2.integration.connector" and use format {artifactId}-{version} for connector-resources (e.g., mi-connector-http-0.1.11). Only add new connectors not already present in the existing test suite.
{{/if}}

{{#if external_connectors}}
<EXTERNAL_CONNECTORS>
The following external/custom connectors are used in this project:
{{#each external_connectors}}
- {{this}}
{{/each}}
</EXTERNAL_CONNECTORS>
These are custom connectors stored in src/main/wso2mi/resources/connectors/. Use full path format with .zip extension: src/main/wso2mi/resources/connectors/{connectorName}.zip when referencing them in connector-resources. Only add new connectors not already present in the existing test suite.
{{/if}}

{{#if test_file_name}}
<TEST_FILE_NAME>
{{test_file_name}}
</TEST_FILE_NAME>
Use the above file name for the updated unit test file.
{{/if}}

**CRITICAL INSTRUCTIONS - PRESERVE EXISTING CONTENT:**

1. **DO NOT MODIFY EXISTING CONTENT**: You must preserve ALL existing test cases, mock services references, connector resources, and any other existing content in the test suite file EXACTLY as they are.

2. **ONLY ADD THE NEW TEST CASE**: Based on the test case description provided, add ONLY the new test case to the existing \u003ctest-cases\u003e section.

3. **REUSE EXISTING MOCK SERVICES**: Check if any existing mock services can handle the external calls needed by the new test case. Only create new mock services if absolutely necessary.

4. **MAINTAIN EXACT STRUCTURE**: Preserve the exact XML structure, indentation, comments, and formatting of the existing test suite file.

5. **ADD TO APPROPRIATE SECTIONS**: 
   - Add the new test case in the existing \u003ctest-cases\u003e section
   - If new mock services are needed, add them to the existing \u003cmock-services\u003e section
   - If new connector resources are needed, add them to the existing \u003cconnector-resources\u003e section

6. **COMPLETE FILE OUTPUT**: Your response must contain the COMPLETE updated unit test file with ALL existing content preserved and the new test case added.

**EXAMPLE OF CORRECT BEHAVIOR:**
If the existing test suite has:
\`\`\`xml
<unit-test>
    <test-cases>
        <test-case name="existingTest1">...</test-case>
        <test-case name="existingTest2">...</test-case>
    </test-cases>
</unit-test>
\`\`\`

Your output should be:
\`\`\`xml
<unit-test>
    <test-cases>
        <test-case name="existingTest1">...</test-case>
        <test-case name="existingTest2">...</test-case>
        <test-case name="newTestCase">...NEW TEST CASE CONTENT...</test-case>
    </test-cases>
</unit-test>
\`\`\`

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
**REUSE EXISTING MOCK SERVICES FIRST:**
1. **ANALYZE EXISTING MOCK SERVICES**: Review the existing mock services to understand what endpoints are already mocked
2. **REUSE WHEN POSSIBLE**: If existing mock services cover the external endpoints needed by the new test case, reference them in the updated \u003cmock-services\u003e section
3. **CREATE ONLY NEW ONES**: Only create new mock services for external endpoints not covered by existing ones
4. **MANDATORY ENDPOINT CONFIGURATION ANALYSIS**: Before creating any new mock service, you MUST:
   - **READ THE ACTUAL ENDPOINT CONFIGURATION**: Analyze the endpoint definition to understand its real configuration
   - **EXTRACT HTTP METHOD**: Get the actual method (GET, POST, PUT, DELETE) from the endpoint's \`method\` attribute
   - **PARSE THE EXTERNAL URL**: Extract the full \`uri-template\` to understand the target service
   - **ALWAYS USE PORT 9090**: All mock services must use port 9090 regardless of original endpoint configuration
   - **EXTRACT CONTEXT PATH**: Parse the URL to get the base path (e.g., \`/v1\` from \`https://mocki.io/v1/resource\`)
   - **GET SUB-CONTEXT**: Extract the specific resource path (e.g., \`/a757849d-80b6...\` from the full URL)
   - **NEVER USE GENERIC DEFAULTS**: Do not use placeholder values like \`/api\` context without analyzing the real endpoint
5. **MANDATORY REQUIREMENT**: When you add new mock services to the \u003cmock-services\u003e section, you MUST provide BOTH:
   - **Mock service XML content**: Include complete mock service XML in the \`mock_services\` response array
   - **Mock service file names**: Include descriptive file names in the \`mock_service_names\` response array
   - **Mock service references**: Use full path format \`src/test/resources/mock-services/MockServiceName.xml\` in unit test \u003cmock-services\u003e section
6. **CRITICAL NAMING RULES**: 
   - Unit test \u003cmock-service\u003e should use full path format: \`src/test/resources/mock-services/MockServiceName.xml\`
   - Mock service XML \u003cservice-name\u003e must be the exact endpoint key reference from the API code
   - Mock service XML \u003cport\u003e must always be \`9090\`

**MANDATORY RESPONSE FORMAT:**
You MUST provide the complete updated unit test file that includes:
1. **ALL EXISTING CONTENT PRESERVED EXACTLY**: Every existing test case, mock service reference, connector resource, artifact definition, and any other element from the original test suite
2. **THE NEW TEST CASE ADDED**: The new test case added to the existing \u003ctest-cases\u003e section
3. **ANY NEW MOCK SERVICE REFERENCES**: Only if new mock services are needed, add them to the existing \u003cmock-services\u003e section
4. **ANY NEW CONNECTOR RESOURCES**: Only if new connector resources are needed, add them to the existing \u003cconnector-resources\u003e section

**CRITICAL**: Your response must start with the complete updated XML file wrapped in markdown code blocks:

\`\`\`markdown
## Updated Unit Test File: [filename]
\`\`\`xml
<!-- COMPLETE UPDATED UNIT TEST FILE WITH ALL EXISTING CONTENT + NEW TEST CASE -->
<unit-test>
    <!-- All existing content preserved exactly -->
    <!-- New test case added appropriately -->
</unit-test>
\`\`\`

## New Mock Service Files (only if new ones are created):
### NewMockService.xml
\`\`\`xml
<mock-service>
    <!-- New mock service content -->
</mock-service>
\`\`\`
\`\`\`

**DO NOT:**
- Create a completely new test file
- Remove or modify any existing test cases
- Change the structure of existing sections
- Generate only the new test case without the existing content
3. Any new mock service references added to the \u003cmock-services\u003e section (if needed)
4. Any new connector resources added to the \u003cconnector-resources\u003e section (if needed)

If you add new mock services, provide them in markdown format after the updated test file:

\`\`\`markdown
## Updated Unit Test File: [filename]
\`\`\`xml
<unit-test>
    <!-- Complete updated unit test file with all existing content preserved and new test case added -->
</unit-test>
\`\`\`

## New Mock Service Files (if any):
### NewMockService.xml
\`\`\`xml
<mock-service>
    <!-- New mock service content -->
</mock-service>
\`\`\`
\`\`\`

**CRITICAL**: Ensure the response includes the complete updated test file with all existing content preserved and only the new test case added.

Start creating your response now.
`;
