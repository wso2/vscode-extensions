/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * WSO2 MI Unit Test Reference - Guide, Schema, and Examples
 * Combined from unit test guide and examples for agent context loading.
 *
 * Section-based exports for granular context loading.
 * Usage: UNIT_TEST_REFERENCE_SECTIONS["mock_services"] for mock service rules.
 *        UNIT_TEST_REFERENCE_FULL for entire reference.
 */

export const UNIT_TEST_REFERENCE_SECTIONS: Record<string, string> = {

guidelines: `## Unit Test Development Guidelines for WSO2 Micro Integrator

### Core Principles
- Generate test for ONLY the given artifacts
- Strictly follow the response type when doing assertions
- Use placeholder values if required
- Always respond in markdown and provide the unit tests in xml
- Do not include the xmlns attribute
- **CRITICAL**: Only generate mock service XML files for services explicitly listed in the \`<mock-services>\` section of your unit test - NO EXTRA mock services allowed

### Artifact Path Guidelines
- **For APIs**: Add the suffix \`src/main/wso2mi/artifacts/apis\` to the \`<artifact>\`.
  Example: \`<artifact>src/main/wso2mi/artifacts/apis/apiName.xml</artifact>\`
- **For Sequences**: Add the suffix \`src/main/wso2mi/artifacts/sequences\` to the \`<artifact>\`.
  Example: \`<artifact>src/main/wso2mi/artifacts/sequences/sequenceName.xml</artifact>\`

### API Testing Best Practices
- Do not include the context path defined in the API inside the request-path in the test case
- The context path is already defined in the API
- If only the context path is there in the request path, use '/' as the path`,

supporting_artifacts: `## Supporting Artifacts and Registry Resources

### Supporting Artifacts
Supporting artifacts are dependencies required by the main artifact being tested. These include endpoints, sequences, local entries, or other synapse artifacts that the test artifact references.

**STRICT Usage Guidelines - ANALYZE CODE CAREFULLY:**
- **ONLY** include artifacts that are directly referenced, called, or used in the artifact for which the unit test is generated
- **CAREFULLY ANALYZE** the artifact code to identify actual dependencies:
  - Look for \`<call><endpoint key="endpointName"/>\` - include the endpoint
  - Look for \`<sequence key="sequenceName"/>\` - include the sequence
  - Look for \`configKey="localEntryName"\` in connectors - include the local entry
  - Look for \`key="resources:filename.xml"\` - include as registry resource, NOT as supportive artifact
- This includes transitive dependencies: if artifact 'A' is referenced in your artifact and 'A' references artifact 'B', then both 'A' and 'B' should be included as supportive artifacts
- **DO NOT** include artifacts that have no relevance to the test artifact just because they exist in the integration project
- **DO NOT** include artifacts just because they have similar names or are in the same project
- Use the correct artifact path based on the type (endpoints, sequences, local-entries, etc.)
- Keep supporting artifacts minimal - only include what's necessary for the test to function

**Syntax:**
\`\`\`xml
<supportive-artifacts>
    <artifact>src/main/wso2mi/artifacts/endpoints/endpointName.xml</artifact>
    <artifact>src/main/wso2mi/artifacts/sequences/sequenceName.xml</artifact>
    <artifact>src/main/wso2mi/artifacts/local-entries/localEntryName.xml</artifact>
</supportive-artifacts>
\`\`\`

**Example Analysis - API with Registry Resource:**
\`\`\`xml
<api context="/test" name="TestAPI">
    <resource methods="GET" uri-template="/">
        <inSequence>
            <variable name="test" type="STRING" value="test"/>
            <http.get configKey="httpConfig">
                <responseVariable>response</responseVariable>
            </http.get>
            <call>
                <endpoint key="resources:myEndpoint.xml"/>
            </call>
            <sequence key="processSequence"/>
        </inSequence>
    </resource>
</api>
\`\`\`

**Correct Analysis:**
- **Supportive Artifacts**:
  - \`src/main/wso2mi/artifacts/local-entries/httpConfig.xml\` (used in http.get configKey)
  - \`src/main/wso2mi/artifacts/sequences/processSequence.xml\` (called via sequence key)
- **Registry Resources**:
  - \`myEndpoint.xml\` (referenced as \`resources:myEndpoint.xml\`)
- **Mock Services**:
  - Mock the actual endpoint name defined in \`myEndpoint.xml\` (e.g., if endpoint is named "ExternalAPI")
- **NOT Included**: Any other endpoints, sequences, or artifacts not directly referenced

### Registry Resources
Registry resources are external files (sequences, templates, endpoints, configurations) stored in the WSO2 registry that can be referenced by synapse artifacts during runtime.

**STRICT Usage Guidelines:**
- Include registry resources that are referenced in the test artifact using \`key="resources:filename.xml"\` pattern
- **IMPORTANT**: When an endpoint is referenced as \`<endpoint key="resources:filename.xml"/>\`, include it as a registry resource, NOT as a supportive artifact
- Specify the correct registry path where the resource would be stored
- Use appropriate media types based on the resource type
- **If a registry resource contains an endpoint definition that makes external calls, that endpoint should be mocked**

**Syntax:**
\`\`\`xml
<registry-resources>
    <registry-resource>
        <file-name>resourceFileName.xml</file-name>
        <artifact>src/main/wso2mi/resources/resourceFileName.xml</artifact>
        <registry-path>/_system/governance/mi-resources</registry-path>
        <media-type>application/vnd.wso2.sequence</media-type>
    </registry-resource>
</registry-resources>
\`\`\`

**Common Media Types:**
- \`application/vnd.wso2.sequence\` - For sequence resources
- \`application/vnd.wso2.endpoint\` - For endpoint resources
- \`application/vnd.wso2.template\` - For template resources
- \`application/xml\` - For generic XML resources
- \`text/plain\` - For text-based configurations`,

connector_resources: `## Connector Resources
Connector resources specify connectors that are used within the artifacts being tested. There are two types of connectors that require different handling in unit tests.

### Internal WSO2 Connectors
Internal connectors are official WSO2 connectors downloaded from the WSO2 Connector Store and declared in the project's \`pom.xml\` file.

**Identification:**
- Listed as dependencies in \`pom.xml\` with groupId \`org.wso2.integration.connector\`
- Example pom dependency:
\`\`\`xml
<dependency>
    <groupId>org.wso2.integration.connector</groupId>
    <artifactId>mi-connector-http</artifactId>
    <version>0.1.11</version>
    <type>zip</type>
</dependency>
\`\`\`

**Test Syntax for Internal Connectors:**
\`\`\`xml
<connector-resources>
    <connector-resource>mi-connector-http-0.1.11</connector-resource>
</connector-resources>
\`\`\`
**Format:** \`{artifactId}-{version}\`

### External/Custom Connectors
External connectors are custom or third-party connectors manually downloaded and placed in the project's resources folder.

**Identification:**
- NOT listed in \`pom.xml\` dependencies
- Physically present in \`src/main/wso2mi/resources/connectors/\` directory
- Provided in the external_connectors list in the request

**Test Syntax for External Connectors:**
\`\`\`xml
<connector-resources>
    <connector-resource>src/main/wso2mi/resources/connectors/ai-connector-0.1.8.zip</connector-resource>
</connector-resources>
\`\`\`
**Format:** Full path to the connector zip file - **MUST include .zip extension**

### STRICT Usage Guidelines:
- **From POM file**: Extract internal connectors and use \`{artifactId}-{version}\` format
- **From external_connectors list**: Use full path format \`src/main/wso2mi/resources/connectors/{connectorName}.zip\` (always include .zip extension)
- **CRITICAL**: External connectors must ALWAYS have .zip extension in the connector-resource path
- **ONLY** include connectors that are actually used or referenced in the artifact for which the unit test is generated
- **DO NOT** include unused connectors just because they are available in the project
- Both types can be present in the same test file if needed, but only if they are actually used`,

assertions: `## Assertion Guidelines by Artifact Type

### API Testing Assertions
For API artifacts, only the following assertions are allowed:

**Allowed Assertions:**
1. **Payload** - using \`$body\`
   \`\`\`xml
   <assertEquals>
       <actual>$body</actual>
       <expected><![CDATA[{"message":"success"}]]></expected>
       <message>Response body validation</message>
   </assertEquals>
   \`\`\`

2. **Status Code** - using \`$statusCode\`
   \`\`\`xml
   <assertEquals>
       <actual>$statusCode</actual>
       <expected><![CDATA[200]]></expected>
       <message>Status code validation</message>
   </assertEquals>
   \`\`\`

3. **Transport Header** - using \`$trp:<Header-Name>\`
   \`\`\`xml
   <assertEquals>
       <actual>$trp:Content-Type</actual>
       <expected><![CDATA[application/json]]></expected>
       <message>Content-Type header validation</message>
   </assertEquals>
   \`\`\`

4. **HTTP Version** - using \`$httpVersion\`
   \`\`\`xml
   <assertEquals>
       <actual>$httpVersion</actual>
       <expected><![CDATA[HTTP/1.1]]></expected>
       <message>HTTP version validation</message>
   </assertEquals>
   \`\`\`

**Important:** No other custom assertions or synapse expressions are allowed for API testing. Stick strictly to these four types.

### Sequence Testing Assertions
For Sequence artifacts, the following assertions are supported:

**Allowed Assertions:**
1. **Payload** - using \`$body\`
   \`\`\`xml
   <assertEquals>
       <actual>$body</actual>
       <expected><![CDATA[{"result":"processed"}]]></expected>
       <message>Sequence output validation</message>
   </assertEquals>
   \`\`\`

2. **Transport Headers** - using \`$trp:<Header-Name>\`
   \`\`\`xml
   <assertEquals>
       <actual>$trp:Content-Type</actual>
       <expected><![CDATA[application/xml]]></expected>
       <message>Transport header validation</message>
   </assertEquals>
   \`\`\`

3. **Custom Synapse Expressions** - Full synapse expression support
   \`\`\`xml
   <assertEquals>
       <actual>\\\${payload}</actual>
       <expected><![CDATA[{"data":"value"}]]></expected>
       <message>Payload expression validation</message>
   </assertEquals>

   <assertEquals>
       <actual>\\\${payload.abc}</actual>
       <expected><![CDATA[expectedValue]]></expected>
       <message>Payload field validation</message>
   </assertEquals>

   <assertEquals>
       <actual>\\\${vars.abc}</actual>
       <expected><![CDATA[variableValue]]></expected>
       <message>Variable validation</message>
   </assertEquals>
   \`\`\`

### XML and CDATA Handling
- Ensure that all \`<expected>\` values in assertions are enclosed within \`<![CDATA[]]>\` sections to avoid XML parsing issues
- Do not enclose the actual values or $body with CDATA
- Add proper error messages when necessary`,

mock_services: `## Mock Services

### STRICT Mock Service Guidelines:
- **ONLY** create mock services for external endpoint calls or external service interactions (e.g: external APIs, databases, web services)
- **DO NOT** write mock services for everything in the project
- **DO NOT** mock internal sequences, local entries, or other internal artifacts unless they make external calls
- **DO NOT HALLUCINATE**: Mock services should reflect the actual expected behavior of the real endpoint being mocked, not create fictional responses
- **USE REALISTIC DATA**: Base mock responses on what the actual endpoint would return, using placeholder data that matches the expected structure
- Mock services are **ONLY** needed when the artifact being tested makes calls to external services through:
  - Direct endpoint calls: \`<call><endpoint key="endpointName"/></call>\`
  - Registry-based endpoint calls: \`<call><endpoint key="resources:filename.xml"/></call>\`
  - HTTP connector operations that call external services
  - Database calls or other external service interactions
- **CRITICAL SERVICE NAME RULES**: The \`service-name\` in mock service XML must exactly match the endpoint reference in the code:
  - For direct endpoint calls \`<call><endpoint key="endpointName"/>\` → use \`<service-name>endpointName</service-name>\`
  - For registry resource calls \`<call><endpoint key="resources:filename.xml"/>\` → use \`<service-name>resources:filename.xml</service-name>\`
  - **DO NOT** create fictional service names - use the exact key reference from the code
- **ALWAYS PROVIDE MOCK SERVICE FILES**: If you declare mock services in the \`<mock-services>\` section, you MUST provide the corresponding mock service XML files
- **REALISTIC MOCKING**: Mock responses should simulate the actual behavior and response structure of the real endpoint, not create fantasy responses

### CRITICAL RULE - Mock Service Consistency:
- You must ONLY generate mock service XML files for the services that are explicitly listed in the \`<mock-services>\` section of your unit test
- The number of mock service XML files generated must EXACTLY match the number of \`<mock-service>\` entries in the unit test
- Every \`<mock-service>ServiceName</mock-service>\` entry in the unit test must have a corresponding mock service XML
- **IMPORTANT**: Mock service files do not contain a name attribute in the syntax. The \`service-name\` is the name of the endpoint or external service being mocked (something that already exists in the project), **NOT** the name of the mock service itself
- Do NOT generate extra mock services that are not referenced in the \`<mock-services>\` section
- Do NOT generate mock services for supporting artifacts unless they make external calls and are explicitly listed in \`<mock-services>\`

### Example of Correct Consistency:
**Example for API with registry resource call:**
\`\`\`xml
<call>
    <endpoint key="resources:testregistry.xml"/>
</call>
\`\`\`

Unit test should have:
\`\`\`xml
<mock-services>
    <mock-service>src/test/resources/mock-services/RegistryEndpointMock.xml</mock-service>
</mock-services>
\`\`\`

Mock service file should have:
\`\`\`xml
<mock-service>
    <service-name>resources:testregistry.xml</service-name>
    <port>9090</port>
    <!-- ... rest of mock service -->
</mock-service>
\`\`\`

**Example for direct endpoint call:**
\`\`\`xml
<call>
    <endpoint key="testEpSeq"/>
</call>
\`\`\`

Unit test should have:
\`\`\`xml
<mock-services>
    <mock-service>src/test/resources/mock-services/TestEndpointMock.xml</mock-service>
</mock-services>
\`\`\`

Mock service file should have:
\`\`\`xml
<mock-service>
    <service-name>testEpSeq</service-name>
    <port>9090</port>
    <!-- ... rest of mock service -->
</mock-service>
\`\`\`

### CRITICAL MOCK SERVICE REFERENCE RULES:
- **ALWAYS use full path format** in the unit test \`<mock-services>\` section
- **MANDATORY FORMAT**: \`src/test/resources/mock-services/MockServiceName.xml\`
- **DO NOT use just the service name** - the full path is required
- **WRONG**: \`<mock-service>ExternalEndpointMock</mock-service>\`
- **CORRECT**: \`<mock-service>src/test/resources/mock-services/ExternalEndpointMock.xml</mock-service>\`

Never generate a third mock service file unless it's also listed in the \`<mock-services>\` section.

### COMPLETE EXAMPLE:

For API code: \`<call><endpoint key="resources:testregistry.xml"/></call>\`

**1. Unit Test XML:**
\`\`\`xml
<mock-services>
    <mock-service>src/test/resources/mock-services/RegistryEndpointMock.xml</mock-service>
</mock-services>
\`\`\`

**2. Response should include:**
\`\`\`json
{
    "mock_services": ["<mock-service><service-name>resources:testregistry.xml</service-name><port>9090</port>...</mock-service>"],
    "mock_service_names": ["RegistryEndpointMock.xml"]
}
\`\`\`

**3. Mock Service XML content (in mock_services array):**
\`\`\`xml
<mock-service>
    <service-name>resources:testregistry.xml</service-name>
    <port>9090</port>
    <context>/v1</context>
    <resources>
        <resource>
            <sub-context>/a757849d-80b6-4d00-a1be-1d517ede86fa</sub-context>
            <method>GET</method>
            <request><headers></headers></request>
            <response>
                <status-code>200</status-code>
                <headers>
                    <header name="Content-Type" value="application/json"/>
                </headers>
                <payload><![CDATA[{"message":"success","data":"registry endpoint response"}]]></payload>
            </response>
        </resource>
    </resources>
</mock-service>
\`\`\`

### CRITICAL MOCK SERVICE CONFIGURATION RULES:
When generating mock services, you MUST analyze the actual endpoint configuration to determine the correct mock service parameters:

**For Registry Resource Endpoints (\`<endpoint key="resources:filename.xml"/>\`)**:
1. **READ THE ENDPOINT FILE CONTENT**: Analyze the actual endpoint configuration in the registry resource file
2. **EXTRACT THE REAL ENDPOINT DETAILS**: Parse the HTTP endpoint configuration to get:
   - **Method**: Extract from \`method="get"\` attribute
   - **URI Template**: Extract the actual external URL from \`uri-template\` attribute
   - **Host/Domain**: Parse the domain from the URI (e.g., \`mocki.io\` from \`https://mocki.io/v1/...\`)
   - **Port**: ALWAYS use \`9090\` for all mock services
   - **Context Path**: Extract the path portion (e.g., \`/v1\` from \`https://mocki.io/v1/a757849d-80b6-4d00-a1be-1d517ede86fa\`)
   - **Sub-context**: Extract the remaining path (e.g., \`/a757849d-80b6-4d00-a1be-1d517ede86fa\`)

**Example Analysis:**
For endpoint configuration:
\`\`\`xml
<endpoint name="eptestreg" xmlns="http://ws.apache.org/ns/synapse">
    <http method="get" uri-template="https://mocki.io/v1/a757849d-80b6-4d00-a1be-1d517ede86fa">
        <!-- ... other config ... -->
    </http>
</endpoint>
\`\`\`

**CORRECT Mock Service Configuration:**
\`\`\`xml
<mock-service>
    <service-name>resources:testregistry.xml</service-name>
    <port>9090</port>
    <context>/v1</context>
    <resources>
        <resource>
            <sub-context>/a757849d-80b6-4d00-a1be-1d517ede86fa</sub-context>
            <method>GET</method>
            <request><headers></headers></request>
            <response>
                <status-code>200</status-code>
                <headers>
                    <header name="Content-Type" value="application/json"/>
                </headers>
                <payload><![CDATA[{"message":"success","data":"realistic endpoint response"}]]></payload>
            </response>
        </resource>
    </resources>
</mock-service>
\`\`\`

**For Direct Endpoint References (\`<endpoint key="endpointName"/>\`)**:
1. **FIND THE ENDPOINT DEFINITION**: Look for the endpoint definition in the supporting artifacts
2. **PARSE THE ENDPOINT CONFIGURATION**: Extract the same details (method, URI, host, context, sub-context)
3. **CONFIGURE MOCK SERVICE**: Use the extracted details to properly configure the mock service with port 9090

**MANDATORY CONFIGURATION STEPS:**
1. **ALWAYS analyze the endpoint configuration** before creating mock services
2. **MANDATORY: ALWAYS use port 9090** for all mock services - NO EXCEPTIONS
3. **FORBIDDEN**: Do NOT use ports like 443, 80, 8080 - ONLY port 9090 is allowed
4. **EXTRACT real HTTP method** from the endpoint configuration (GET, POST, PUT, DELETE)
5. **PARSE the external URL** to determine correct context and sub-context structure
6. **USE REALISTIC RESPONSES** based on what the actual external service would return

**PORT RULE:**
- **MANDATORY: ALL mock services must use port 9090** - NO EXCEPTIONS
- **FORBIDDEN**: Do NOT analyze or extract ports from original endpoints
- **FORBIDDEN**: Do NOT use ports like 443, 80, 8080, or any other ports

**CONTEXT AND SUB-CONTEXT EXTRACTION:**
- For URL \`https://mocki.io/v1/a757849d-80b6/data\` → context=\`/v1\`, sub-context=\`/a757849d-80b6/data\`
- For URL \`https://api.example.com/users/123\` → context=\`/users\`, sub-context=\`/123\`
- For URL \`https://service.com/api/v2/resource\` → context=\`/api/v2\`, sub-context=\`/resource\`

**Mock Service Names - CRITICAL CLARIFICATION:**
- **Mock service FILE names** should be provided in the \`mock_service_names\` parameter (array of strings) in the response
- **\`<service-name>\` tag** inside the mock service XML should be the exact endpoint reference from the API code
- **Mock service references in unit test** should use full path format \`src/test/resources/mock-services/MockServiceName.xml\`
- **MANDATORY**: When you declare mock services in \`<mock-services>\`, you MUST provide both:
  1. The actual mock service XML files in the \`mock_services\` array
  2. The mock service file names in the \`mock_service_names\` array
- **RULE**:
  - Unit test \`<mock-service>\` = full path to mock service file (\`src/test/resources/mock-services/MockServiceName.xml\`)
  - Mock service XML \`<service-name>\` = exact endpoint key reference from API code
  - Mock service XML \`<port>\` = always \`9090\`
  - \`mock_service_names\` = descriptive file names for the mock service files (with .xml extension)`,

xsd_schema: `## XSD Schema for Unit Test Structure

Strictly follow the below XSD when writing the unit tests:

\`\`\`xsd
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
	<xs:element name='unit-test'>
		<xs:complexType>
			<xs:all>
				<xs:element name='artifacts' type='Artifacts'
					minOccurs='1' maxOccurs='1' />
				<xs:element name='test-cases' type='TestCases'
					minOccurs='0' maxOccurs='1' />
				<xs:element name='mock-services' type='MockServices'
					minOccurs='1' maxOccurs='1' />
			</xs:all>
		</xs:complexType>
	</xs:element>

	<xs:complexType name="Artifacts">
		<xs:all>
			<xs:element name="test-artifact" type="TestArtifact"
				minOccurs='1' maxOccurs='1' />
			<xs:element name="supportive-artifacts"
				type="SupportiveArtifacts" minOccurs='0' maxOccurs='1' />
			<xs:element name="registry-resources"
				type="RegistryResources" minOccurs='0' maxOccurs='1' />
			<xs:element name="connector-resources"
				type="ConnectorResources" minOccurs='0' maxOccurs='1' />
		</xs:all>
	</xs:complexType>

	<xs:complexType name="TestArtifact">
		<xs:sequence>
			<xs:element name="artifact" type="xs:string" minOccurs='1'
				maxOccurs='1' />
		</xs:sequence>
	</xs:complexType>

	<xs:complexType name="SupportiveArtifacts">
		<xs:sequence>
			<xs:element name="artifact" type="xs:string" minOccurs='0'
				maxOccurs='unbounded' />
		</xs:sequence>
	</xs:complexType>

	<xs:complexType name="RegistryResources">
		<xs:sequence>
			<xs:element name="registry-resource" type="RegistryResource" minOccurs='0'
				maxOccurs='unbounded' />
		</xs:sequence>
	</xs:complexType>

	<xs:complexType name="ConnectorResources">
		<xs:sequence>
			<xs:element name="connector-resource" type="xs:string" minOccurs='0'
				maxOccurs='unbounded' />
		</xs:sequence>
	</xs:complexType>

	<xs:complexType name="RegistryResource">
		<xs:sequence>
			<xs:element name="file-name" type="xs:string" minOccurs='1'
				maxOccurs='1' />
			<xs:element name="artifact" type="xs:string" minOccurs='1'
				maxOccurs='1' />
			<xs:element name="registry-path" type="xs:string" minOccurs='1'
				maxOccurs='1' />
			<xs:element name="media-type" type="xs:string" minOccurs='1'
				maxOccurs='1' />
		</xs:sequence>
	</xs:complexType>

	<xs:complexType name="TestCases">
		<xs:sequence>
			<xs:element name="test-case" type="TestCase" minOccurs='0'
				maxOccurs='unbounded' />
		</xs:sequence>
	</xs:complexType>

	<xs:complexType name="TestCase">
		<xs:all>
			<xs:element name="input" type="Inputs" minOccurs='0'
				maxOccurs='1' />
			<xs:element name="assertions" type="Assertions"
				minOccurs='1' maxOccurs='1' />
		</xs:all>
		<xs:attribute name='name' type='xs:string' />
	</xs:complexType>

	<xs:complexType name="Inputs">
		<xs:all>
			<xs:element name="request-path" type="xs:string"
				minOccurs='0' maxOccurs='1' />
			<xs:element name="request-method" type="xs:string"
				minOccurs='0' maxOccurs='1' />
			<xs:element name="request-protocol" type="xs:string"
						minOccurs='0' maxOccurs='1' />
			<xs:element name="payload" type="xs:string" minOccurs='0'
				maxOccurs='1' />
			<xs:element name="properties" type="Properties"
				minOccurs='0' maxOccurs='1' />
		</xs:all>
	</xs:complexType>

	<xs:complexType name="Properties">
		<xs:sequence>
			<xs:element name="property" type="Property" minOccurs='0' maxOccurs='unbounded' />
		</xs:sequence>
	</xs:complexType>

	<xs:complexType name="Property">
		<xs:attribute name='name' type='xs:string' />
		<xs:attribute name='value' type='xs:string' />
		<xs:attribute name='scope' type='xs:string' />
	</xs:complexType>

	<xs:complexType name="Assertions">
		<xs:sequence>
			<xs:element name="assertEquals" type="AssertEquals"
				minOccurs='0' maxOccurs='unbounded' />
			<xs:element name="assertNotNull" type="AssertNotNull"
				minOccurs='0' maxOccurs='unbounded' />
		</xs:sequence>
	</xs:complexType>

	<xs:complexType name="AssertEquals">
		<xs:sequence>
			<xs:element name="actual" type="xs:string" minOccurs='1'
				maxOccurs='1' />
			<xs:element name="expected" type="xs:string" minOccurs='1'
				maxOccurs='1' />
			<xs:element name="message" type="xs:string" minOccurs='1'
				maxOccurs='1' />
		</xs:sequence>
	</xs:complexType>

	<xs:complexType name="AssertNotNull">
		<xs:sequence>
			<xs:element name="actual" type="xs:string" minOccurs='1'
				maxOccurs='1' />
			<xs:element name="message" type="xs:string" minOccurs='1'
				maxOccurs='1' />
		</xs:sequence>
	</xs:complexType>

	<xs:complexType name="MockServices">
		<xs:sequence>
			<xs:element name="mock-service" type="xs:string"
				minOccurs='0' maxOccurs='unbounded' />
		</xs:sequence>
	</xs:complexType>
</xs:schema>
\`\`\`

### Test Structure Organization
The complete test structure follows this hierarchy:
\`\`\`xml
<unit-test>
    <artifacts>
        <test-artifact>
            <!-- Main artifact being tested -->
        </test-artifact>
        <supportive-artifacts>
            <!-- Dependencies needed by the test artifact -->
        </supportive-artifacts>
        <registry-resources>
            <!-- External registry resources referenced -->
        </registry-resources>
        <connector-resources>
            <!-- External connectors used -->
        </connector-resources>
    </artifacts>
    <test-cases>
        <!-- Individual test cases with inputs and assertions -->
    </test-cases>
    <mock-services>
        <!-- Mock services for external dependencies -->
    </mock-services>
</unit-test>
\`\`\``,

examples: `## Complete Unit Test Examples

### Example 1: API Test with Registry Resources

This example demonstrates testing an API that uses registry resources. The test includes registry resources that are referenced by the API during execution.

\`\`\`xml
<unit-test>
    <artifacts>
        <test-artifact>
            <artifact>src/main/wso2mi/artifacts/apis/testRegAPI.xml</artifact>
        </test-artifact>
        <supportive-artifacts>
        </supportive-artifacts>
        <registry-resources>
            <registry-resource>
                <file-name>testregistry.xml</file-name>
                <artifact>src/main/wso2mi/resources/testregistry.xml</artifact>
                <registry-path>/_system/governance/mi-resources</registry-path>
                <media-type>application/vnd.wso2.sequence</media-type>
            </registry-resource>
        </registry-resources>
        <connector-resources>
        </connector-resources>
    </artifacts>
    <test-cases>
        <test-case name="testcasereg">
            <input>
                <request-path>/</request-path>
                <request-method>GET</request-method>
                <request-protocol>http</request-protocol>
            </input>
            <assertions>
                <assertEquals>
                    <actual>$body</actual>
                    <expected><![CDATA[{"hello":"world"}]]></expected>
                    <message>Error Match</message>
                </assertEquals>
            </assertions>
        </test-case>
        <test-case name="testStatusCode">
            <input>
                <request-path>/</request-path>
                <request-method>GET</request-method>
                <request-protocol>http</request-protocol>
            </input>
            <assertions>
                <assertEquals>
                    <actual>$statusCode</actual>
                    <expected><![CDATA[200]]></expected>
                    <message>Error Match</message>
                </assertEquals>
            </assertions>
        </test-case>
        <test-case name="testHeader">
            <input>
                <request-path>/</request-path>
                <request-method>GET</request-method>
                <request-protocol>http</request-protocol>
            </input>
            <assertions>
                <assertEquals>
                    <actual>$trp:Content-Type</actual>
                    <expected><![CDATA[application/json]]></expected>
                    <message>Error Match</message>
                </assertEquals>
            </assertions>
        </test-case>
    </test-cases>
    <mock-services>
    </mock-services>
</unit-test>
\`\`\`

### Example 2: API with Registry Resource Endpoint (Correct Analysis)

**API Code:**
\`\`\`xml
<api context="/testregapi" name="testRegAPI" xmlns="http://ws.apache.org/ns/synapse">
    <resource methods="GET" uri-template="/">
        <inSequence>
            <variable name="test" type="STRING" value="test"/>
            <http.get configKey="sad">
                <responseVariable>http_get_1</responseVariable>
                <overwriteBody>true</overwriteBody>
            </http.get>
            <call>
                <endpoint key="resources:testregistry.xml"/>
            </call>
            <sequence key="vfvf"/>
            <respond/>
        </inSequence>
    </resource>
</api>
\`\`\`

**Correct Unit Test:**
\`\`\`xml
<unit-test>
    <artifacts>
        <test-artifact>
            <artifact>src/main/wso2mi/artifacts/apis/testRegAPI.xml</artifact>
        </test-artifact>
        <supportive-artifacts>
            <artifact>src/main/wso2mi/artifacts/local-entries/sad.xml</artifact>
            <artifact>src/main/wso2mi/artifacts/sequences/vfvf.xml</artifact>
        </supportive-artifacts>
        <registry-resources>
            <registry-resource>
                <file-name>testregistry.xml</file-name>
                <artifact>src/main/wso2mi/resources/testregistry.xml</artifact>
                <registry-path>/_system/governance/mi-resources</registry-path>
                <media-type>application/vnd.wso2.endpoint</media-type>
            </registry-resource>
        </registry-resources>
        <connector-resources>
            <connector-resource>mi-connector-http-0.1.11</connector-resource>
        </connector-resources>
    </artifacts>
    <test-cases>
        <test-case name="testAPIBasicFlow">
            <input>
                <request-path>/</request-path>
                <request-method>GET</request-method>
                <request-protocol>http</request-protocol>
            </input>
            <assertions>
                <assertEquals>
                    <actual>$statusCode</actual>
                    <expected><![CDATA[200]]></expected>
                    <message>Expected successful response</message>
                </assertEquals>
            </assertions>
        </test-case>
    </test-cases>
    <mock-services>
        <mock-service>src/test/resources/mock-services/RegistryEndpointMock.xml</mock-service>
    </mock-services>
</unit-test>
\`\`\`

**Analysis:**
- sad.xml - local entry used in configKey="sad"
- vfvf.xml - sequence called via <sequence key="vfvf"/>
- testregistry.xml - registry resource referenced as key="resources:testregistry.xml"
- mi-connector-http-0.1.11 - HTTP connector used in http.get
- Mock service named "RegistryEndpointMock" for the endpoint call
- **NOT** testEpSeq.xml - not referenced anywhere in the code

**Mock Service File Example:**
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
                <payload><![CDATA[{"message":"success","data":"registry endpoint response"}]]></payload>
            </response>
        </resource>
    </resources>
</mock-service>
\`\`\`

### WRONG: Hallucinated Mock Response Example
\`\`\`xml
<!-- DO NOT DO THIS - This creates fantasy responses -->
<mock-service>
    <service-name>resources:userapi.xml</service-name>
    <port>9090</port>
    <context>/fantasy</context>
    <resources>
        <resource>
            <sub-context>/dragons</sub-context>
            <method>GET</method>
            <request><headers></headers></request>
            <response>
                <status-code>200</status-code>
                <headers>
                    <header name="Content-Type" value="application/json"/>
                </headers>
                <payload><![CDATA[{"dragons":["fire","ice","water"],"magic":true}]]></payload>
            </response>
        </resource>
    </resources>
</mock-service>
\`\`\`

### CORRECT: Realistic Mock Response Example
\`\`\`xml
<!-- DO THIS - Mock realistic behavior based on actual endpoint -->
<mock-service>
    <service-name>resources:userapi.xml</service-name>
    <port>9090</port>
    <context>/api/v1</context>
    <resources>
        <resource>
            <sub-context>/users</sub-context>
            <method>GET</method>
            <request><headers></headers></request>
            <response>
                <status-code>200</status-code>
                <headers>
                    <header name="Content-Type" value="application/json"/>
                </headers>
                <payload><![CDATA[{"users":[{"id":"123","name":"John Doe","email":"john@example.com"}],"total":1}]]></payload>
            </response>
        </resource>
    </resources>
</mock-service>
\`\`\`

### Example 3: Sequence Test with Supporting Artifacts

This example demonstrates testing a sequence that depends on external endpoints. The endpoint is included as a supporting artifact.

\`\`\`xml
<unit-test>
    <artifacts>
        <test-artifact>
            <artifact>src/main/wso2mi/artifacts/sequences/testSequence.xml</artifact>
        </test-artifact>
        <supportive-artifacts>
            <artifact>src/main/wso2mi/artifacts/endpoints/testEpSeq.xml</artifact>
        </supportive-artifacts>
        <registry-resources>
        </registry-resources>
        <connector-resources>
        </connector-resources>
    </artifacts>
    <test-cases>
        <test-case name="testcase1">
            <input>
                <request-method>GET</request-method>
                <request-protocol>http</request-protocol>
            </input>
            <assertions>
                <assertEquals>
                    <actual>\\\${payload.hello}</actual>
                    <expected><![CDATA[world]]></expected>
                    <message>Error Match</message>
                </assertEquals>
            </assertions>
        </test-case>
        <test-case name="testcase2">
            <input>
                <request-method>GET</request-method>
                <request-protocol>http</request-protocol>
            </input>
            <assertions>
                <assertEquals>
                    <actual>\\\${vars.test}</actual>
                    <expected><![CDATA[5]]></expected>
                    <message>Error Match</message>
                </assertEquals>
            </assertions>
        </test-case>
        <test-case name="testbody">
            <input>
                <request-method>GET</request-method>
                <request-protocol>http</request-protocol>
            </input>
            <assertions>
                <assertEquals>
                    <actual>$body</actual>
                    <expected><![CDATA[{"hello":"world"}]]></expected>
                    <message>Error Match</message>
                </assertEquals>
            </assertions>
        </test-case>
        <test-case name="testNotNull">
            <input>
                <request-method>GET</request-method>
                <request-protocol>http</request-protocol>
            </input>
            <assertions>
                <assertNotNull>
                    <actual>\\\${payload}</actual>
                    <message>Error</message>
                </assertNotNull>
            </assertions>
        </test-case>
    </test-cases>
    <mock-services>
    </mock-services>
</unit-test>
\`\`\`

### Example 4: Mixed Internal and External Connector Usage

This example shows how to handle both internal WSO2 connectors (from POM) and external/custom connectors together.

\`\`\`xml
<unit-test>
    <artifacts>
        <test-artifact>
            <artifact>src/main/wso2mi/artifacts/apis/mixedConnectorAPI.xml</artifact>
        </test-artifact>
        <supportive-artifacts>
        </supportive-artifacts>
        <registry-resources>
        </registry-resources>
        <connector-resources>
            <connector-resource>mi-connector-http-0.1.11</connector-resource>
            <connector-resource>mi-connector-salesforce-2.3.4</connector-resource>
            <connector-resource>src/main/wso2mi/resources/connectors/ai-connector-0.1.8.zip</connector-resource>
            <connector-resource>src/main/wso2mi/resources/connectors/custom-db-connector-1.0.0.zip</connector-resource>
        </connector-resources>
    </artifacts>
    <test-cases>
        <test-case name="testMixedConnectors">
            <input>
                <request-path>/mixed-test</request-path>
                <request-method>POST</request-method>
                <request-protocol>http</request-protocol>
                <payload><![CDATA[{"action":"process"}]]></payload>
            </input>
            <assertions>
                <assertEquals>
                    <actual>$statusCode</actual>
                    <expected><![CDATA[200]]></expected>
                    <message>Expected successful response with mixed connectors</message>
                </assertEquals>
            </assertions>
        </test-case>
    </test-cases>
    <mock-services>
    </mock-services>
</unit-test>
\`\`\``,

best_practices: `## Best Practice Patterns and Additional References

### Connector Resource Guidelines

**STRICT USAGE RULE**: Only include connector resources that are actually used/referenced in the artifact being tested. Do not include connectors just because they exist in the project.

#### Internal WSO2 Connectors (from POM dependencies)
Only include if the artifact being tested actually uses these connectors.
\`\`\`xml
<!-- POM dependency example -->
<dependency>
    <groupId>org.wso2.integration.connector</groupId>
    <artifactId>mi-connector-salesforce</artifactId>
    <version>2.3.4</version>
    <type>zip</type>
</dependency>

<!-- Test file syntax - ONLY if artifact uses this connector -->
<connector-resource>mi-connector-salesforce-2.3.4</connector-resource>
\`\`\`

#### External/Custom Connectors (from resources folder)
Only include if the artifact being tested actually uses these custom connectors.
\`\`\`xml
<!-- Test file syntax for custom connectors - ONLY if artifact uses these connectors -->
<connector-resource>src/main/wso2mi/resources/connectors/ai-connector-0.1.8.zip</connector-resource>
<connector-resource>src/main/wso2mi/resources/connectors/custom-db-connector-1.0.0.zip</connector-resource>
\`\`\`

### Key Assertion Types and Usage

#### assertEquals
Used for comparing actual values with expected values.
\`\`\`xml
<assertEquals>
    <actual>$body</actual>
    <expected><![CDATA[{"status":"success"}]]></expected>
    <message>Response body mismatch</message>
</assertEquals>
\`\`\`

#### assertNotNull
Used to verify that a value is not null.
\`\`\`xml
<assertNotNull>
    <actual>\\\${payload}</actual>
    <message>Payload should not be null</message>
</assertNotNull>
\`\`\`

#### Assertion Rules by Artifact Type

**API Testing - Allowed Assertions Only:**
- $body - Full response body
- $statusCode - HTTP status code (200, 404, 500, etc.)
- $trp:HeaderName - Transport headers (e.g., $trp:Content-Type, $trp:Authorization)
- $httpVersion - HTTP version (HTTP/1.1, HTTP/2.0)

**NOT ALLOWED for APIs:** Custom synapse expressions like \\\${payload}, \\\${vars.abc}, \\\${ctx:PropertyName}

**Sequence Testing - Full Synapse Expression Support:**
- $body - Full response body
- $trp:HeaderName - Transport headers (e.g., $trp:Content-Type)
- \\\${payload} - Full payload access
- \\\${payload.fieldName} - JSON payload field access
- \\\${vars.variableName} - Synapse variable access
- \\\${ctx:PropertyName} - Context property access
- Any other valid synapse expressions

### General Best Practices

#### 1. Multiple Test Cases for Different Aspects
Always test different aspects of the response:
- Status code validation
- Response body validation
- Header validation
- Null checks where appropriate

#### 2. Proper CDATA Usage
Always wrap expected values in CDATA sections to handle special characters:
\`\`\`xml
<expected><![CDATA[{"message":"Hello World!"}]]></expected>
\`\`\`

#### 3. Meaningful Error Messages
Provide descriptive error messages for failed assertions:
\`\`\`xml
<message>Expected status code 200 but got different value</message>
\`\`\`

### Connector Analysis and Integration
- **POM Analysis**: Parse the POM file to identify internal WSO2 connectors from dependencies
- **External Connector Integration**: Use the provided external_connectors list to identify custom connectors
- **Usage Detection**: Only include connectors that are actually referenced in the test artifacts
- **Proper Formatting**: Use correct syntax format based on connector type (internal vs external)
- **Mock Considerations**: Consider mocking connector responses for isolated unit testing when necessary

### Project Context Priority
- When both full project context and current file context are available, prioritize the full project context
- Use the full project context to understand dependencies and relationships between artifacts
- The current file context serves as a fallback for backward compatibility

### Mock Service Structure

When unit tests require mock services to simulate external dependencies, each mock service must follow this exact XML structure:

\`\`\`xml
<mock-service>
    <service-name>ServiceName</service-name>
    <port>9090</port>
    <context>/service-context</context>
    <resources>
        <resource>
            <sub-context>/endpoint-path</sub-context>
            <method>GET|POST|PUT|DELETE</method>
            <request>
                <headers>
                    <!-- Optional request headers -->
                    <header name="Content-Type" value="application/json" />
                    <header name="Authorization" value="Bearer token" />
                </headers>
                <!-- Optional request payload for POST/PUT -->
                <payload>
                    <![CDATA[{"request":"data"}]]>
                </payload>
            </request>
            <response>
                <status-code>200</status-code>
                <headers>
                    <!-- Optional response headers -->
                    <header name="Content-Type" value="application/json" />
                </headers>
                <payload>
                    <![CDATA[{"mock":"response"}]]>
                </payload>
            </response>
        </resource>
    </resources>
</mock-service>
\`\`\`

### Mock Service Elements Explanation
- <service-name>: **CRITICAL** - This must be the exact endpoint key reference from the API code:
  - For <call><endpoint key="testEpSeq"/> → <service-name>testEpSeq</service-name>
  - For <call><endpoint key="resources:testregistry.xml"/> → <service-name>resources:testregistry.xml</service-name>
  - **NOT** a made-up name or the mock service file name
- <port>: ALWAYS use 9090 - NO EXCEPTIONS
- <context>: The context path for the mock service endpoint
- <resources>: Container for mock service resources (can contain multiple <resource> elements)
- <resource>: Individual resource/endpoint configuration
- <sub-context>: Sub-path within the main context (e.g., "/", "/getStudent", "/addStudent")
- <method>: HTTP method (GET, POST, PUT, DELETE)
- <request>: Request configuration including headers and optional payload
- <response>: Response configuration including status code, headers, and payload

### Mock Service Best Practices
- **ONLY** create mock services for external endpoint calls or database calls - never mock internal artifacts
- **DO NOT HALLUCINATE**: Mock responses should reflect the actual expected behavior of the real endpoint being mocked
- **USE REALISTIC DATA**: Base mock responses on what the actual endpoint would realistically return, not fantasy data
- Define multiple <resource> elements for different endpoints within the same service
- Include appropriate request headers for content type validation
- Use meaningful response headers when testing header-based logic
- Wrap JSON payloads in CDATA sections to avoid XML parsing issues
- **CRITICAL**: The <service-name> must be the exact endpoint key reference from the API code being mocked

### Mock Service Examples

#### Simple Mock Service Example (Direct Endpoint)
For API code: <call><endpoint key="UserEndpoint"/></call>
\`\`\`xml
<mock-service>
    <service-name>UserEndpoint</service-name>
    <port>9090</port>
    <context>/users</context>
    <resources>
        <resource>
            <sub-context>/</sub-context>
            <method>GET</method>
            <request>
                <headers>
                </headers>
            </request>
            <response>
                <status-code>200</status-code>
                <headers>
                </headers>
                <payload>
                    <![CDATA[{"id": 1, "name": "John Doe", "email": "john@example.com"}]]>
                </payload>
            </response>
        </resource>
    </resources>
</mock-service>
\`\`\`

#### Registry Resource Mock Service Example
For API code: <call><endpoint key="resources:studentapi.xml"/></call>
\`\`\`xml
<mock-service>
    <service-name>resources:studentapi.xml</service-name>
    <port>9090</port>
    <context>/</context>
    <resources>
        <resource>
            <sub-context>/getStudent</sub-context>
            <method>GET</method>
            <request>
                <headers>
                    <header name="Content-Type" value="application/json" />
                </headers>
            </request>
            <response>
                <status-code>200</status-code>
                <headers>
                    <header name="test-header-name" value="test-header-value" />
                </headers>
                <payload>
                    <![CDATA[{"name":"ravindu"}]]>
                </payload>
            </response>
        </resource>
        <resource>
            <sub-context>/addStudent</sub-context>
            <method>POST</method>
            <request>
                <headers>
                    <header name="Content-Type" value="application/json" />
                </headers>
                <payload>
                    <![CDATA[{"name":"supun"}]]>
                </payload>
            </request>
            <response>
                <status-code>200</status-code>
                <headers>
                    <header name="test-header-name-2" value="test-header-value-2" />
                </headers>
                <payload>
                    <![CDATA[{"success": true}]]>
                </payload>
            </response>
        </resource>
    </resources>
</mock-service>
\`\`\``,

};

export const UNIT_TEST_REFERENCE_FULL = Object.values(UNIT_TEST_REFERENCE_SECTIONS).join('\n\n');
