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

export const UNIT_TEST_EXAMPLES = `
# WSO2 Micro Integrator Unit Test Examples and Specifications

## XSD Schema for Unit Test Structure

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
			<xs:element name="property" minOccurs='0' maxOccurs='unbounded' />
		</xs:sequence>
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


## Complete Unit Test Examples

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

### Example 3: Mixed Internal and External Connector Usage

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
\`\`\`

## Connector Resource Guidelines

**STRICT USAGE RULE**: Only include connector resources that are actually used/referenced in the artifact being tested. Do not include connectors just because they exist in the project.

### Internal WSO2 Connectors (from POM dependencies)
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

### External/Custom Connectors (from resources folder)
Only include if the artifact being tested actually uses these custom connectors.
\`\`\`xml
<!-- Test file syntax for custom connectors - ONLY if artifact uses these connectors -->
<connector-resource>src/main/wso2mi/resources/connectors/ai-connector-0.1.8.zip</connector-resource>
<connector-resource>src/main/wso2mi/resources/connectors/custom-db-connector-1.0.0.zip</connector-resource>
\`\`\`

## Key Assertion Types and Usage

### assertEquals
Used for comparing actual values with expected values.
\`\`\`xml
<assertEquals>
    <actual>$body</actual>
    <expected><![CDATA[{"status":"success"}]]></expected>
    <message>Response body mismatch</message>
</assertEquals>
\`\`\`

### assertNotNull
Used to verify that a value is not null.
\`\`\`xml
<assertNotNull>
    <actual>\\\${payload}</actual>
    <message>Payload should not be null</message>
</assertNotNull>
\`\`\`

### Assertion Rules by Artifact Type

#### API Testing - Allowed Assertions Only
For API artifacts, **ONLY** these assertions are permitted:
- $body - Full response body
- $statusCode - HTTP status code (200, 404, 500, etc.)
- $trp:HeaderName - Transport headers (e.g., $trp:Content-Type, $trp:Authorization)
- $httpVersion - HTTP version (HTTP/1.1, HTTP/2.0)

**NOT ALLOWED for APIs:** Custom synapse expressions like \\\${payload}, \\\${vars.abc}, \\\${ctx:PropertyName}

#### Sequence Testing - Full Synapse Expression Support
For Sequence artifacts, these assertions are supported:
- $body - Full response body
- $trp:HeaderName - Transport headers (e.g., $trp:Content-Type)
- \\\${payload} - Full payload access
- \\\${payload.fieldName} - JSON payload field access
- \\\${vars.variableName} - Synapse variable access
- \\\${ctx:PropertyName} - Context property access
- Any other valid synapse expressions

## Best Practice Patterns

### 1. Multiple Test Cases for Different Aspects
Always test different aspects of the response:
- Status code validation
- Response body validation
- Header validation
- Null checks where appropriate

### 2. Proper CDATA Usage
Always wrap expected values in CDATA sections to handle special characters:
\`\`\`xml
<expected><![CDATA[{"message":"Hello World!"}]]></expected>
\`\`\`

### 3. Meaningful Error Messages
Provide descriptive error messages for failed assertions:
\`\`\`xml
<message>Expected status code 200 but got different value</message>
\`\`\`

## Mock Service Structure

When unit tests require mock services to simulate external dependencies, each mock service must follow this exact XML structure:

### Mock Service XML Format
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
                    <header name="Custom-Header" value="custom-value" />
                </headers>
                <payload>
                    <![CDATA[{"mock":"response"}]]>
                </payload>
            </response>
        </resource>
        <!-- Additional resources can be defined for multiple endpoints -->
        <resource>
            <sub-context>/another-endpoint</sub-context>
            <method>POST</method>
            <!-- ... resource configuration ... -->
        </resource>
    </resources>
</mock-service>
\`\`\`

### Mock Service Elements Explanation
- <service-name>: **CRITICAL** - This must be the exact endpoint key reference from the API code:
  - For <call><endpoint key="testEpSeq"/> → <service-name>testEpSeq</service-name>
  - For <call><endpoint key="resources:testregistry.xml"/> → <service-name>resources:testregistry.xml</service-name>
  - **NOT** a made-up name or the mock service file name
- <port>: Port number where the mock service will be accessible (e.g., 9090, 9091, etc.)
- <context>: The context path for the mock service endpoint
- <resources>: Container for mock service resources (can contain multiple <resource> elements)
- <resource>: Individual resource/endpoint configuration
- <sub-context>: Sub-path within the main context (e.g., "/", "/getStudent", "/addStudent")
- <method>: HTTP method (GET, POST, PUT, DELETE)
- <request>: Request configuration including headers and optional payload
  - <headers>: Request headers (can be empty or contain <header> elements with name/value attributes)
  - <payload>: Optional request payload wrapped in CDATA section (for POST/PUT methods)
- <response>: Response configuration including status code, headers, and payload
  - <status-code>: HTTP response status code (e.g., 200, 404, 500)
  - <headers>: Response headers (can be empty or contain <header> elements with name/value attributes)
  - <payload>: Response body wrapped in CDATA section

### Mock Service Best Practices
- **ONLY** create mock services for external endpoint calls or database calls - never mock internal artifacts
- **DO NOT HALLUCINATE**: Mock responses should reflect the actual expected behavior of the real endpoint being mocked
- **USE REALISTIC DATA**: Base mock responses on what the actual endpoint would realistically return, not fantasy data
- Use different ports for multiple mock services (9090, 9091, 9092, etc.)
- Define multiple <resource> elements for different endpoints within the same service
- Include appropriate request headers for content type validation
- Use meaningful response headers when testing header-based logic
- Wrap JSON payloads in CDATA sections to avoid XML parsing issues
- **CRITICAL**: The <service-name> must be the exact endpoint key reference from the API code being mocked
- **MANDATORY**: Mock service file names MUST be provided in the mock_service_names parameter when mock services are used
- **TWO SEPARATE THINGS**: 
  - mock_services array = actual mock service XML content
  - mock_service_names array = descriptive file names for those mock services
- **RULE**: 
  - Unit test <mock-service> = full path to mock service file (src/test/resources/mock-services/MockServiceName.xml)
  - Mock service XML <service-name> = exact endpoint key reference
  - Mock service XML <port> = always 9090
  - mock_service_names = descriptive file names (with .xml extension)

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
\`\`\`
`;
