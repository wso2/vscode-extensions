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
 * WSO2 MI HTTP Connector Guide
 * Comprehensive reference for the HTTP connector: error handling, transport properties,
 * authentication patterns, and payload/streaming configuration.
 *
 * Derived from the mi-connector-http source code.
 *
 * Section-based exports for granular context loading.
 * Usage: SYNAPSE_HTTP_CONNECTOR_GUIDE_SECTIONS["error_handling"] for error handling patterns.
 *        SYNAPSE_HTTP_CONNECTOR_GUIDE_FULL for entire reference.
 */

export const SYNAPSE_HTTP_CONNECTOR_GUIDE_SECTIONS: Record<string, string> = {

error_handling: `## HTTP Error Response Handling

### Default Behavior
When the HTTP connector receives a response from a backend:
- **2xx responses**: Continue normal mediation flow. Response body and status available.
- **3xx responses**: May trigger fault sequence if not handled (depends on redirect config).
- **4xx/5xx responses**: By default, **trigger the fault sequence**. The response body may not be available in the normal flow.

### \`non.error.http.status.codes\` — Prevent Fault on Specific Status Codes
Set this Axis2 property **before** the HTTP call to treat certain error codes as non-errors:

\`\`\`xml
<!-- Treat 400 and 404 as normal responses, not faults -->
<property name="non.error.http.status.codes" scope="axis2" type="STRING" value="400,404"/>
<http.post configKey="myConnection">
  <relativePath>/api/resource</relativePath>
  <requestBodyType>JSON</requestBodyType>
  <requestBodyJson>\${payload}</requestBodyJson>
</http.post>
\`\`\`

Or via the connector parameter (preferred — same effect):
\`\`\`xml
<http.post configKey="myConnection">
  <relativePath>/api/resource</relativePath>
  <requestBodyType>JSON</requestBodyType>
  <requestBodyJson>\${payload}</requestBodyJson>
  <nonErrorHttpStatusCodes>400,404,409,422</nonErrorHttpStatusCodes>
</http.post>
\`\`\`

When a status code is listed in \`nonErrorHttpStatusCodes\`, the response body and status code flow through the **normal sequence** instead of the fault sequence, allowing you to inspect and branch on the error.

### Reading the HTTP Status Code After a Call

After the HTTP connector call, the response status code is available via:
\`\`\`xml
<!-- Read the HTTP status code from the axis2 scope -->
<property name="statusCode" expression="$axis2:HTTP_SC" scope="default" type="STRING"/>

<!-- Branch on status code -->
<switch source="$axis2:HTTP_SC">
  <case regex="200">
    <!-- Success handling -->
  </case>
  <case regex="201">
    <!-- Created handling -->
  </case>
  <case regex="4\\d{2}">
    <!-- Client error handling -->
  </case>
  <case regex="5\\d{2}">
    <!-- Server error handling -->
  </case>
  <default>
    <!-- Unexpected status -->
  </default>
</switch>
\`\`\`

### Using Filter for Simple Status Checks
\`\`\`xml
<filter regex="200" source="$axis2:HTTP_SC">
  <then>
    <!-- Success -->
  </then>
  <else>
    <!-- Error: read response body for error details -->
    <log level="custom">
      <property name="ERROR_STATUS" expression="$axis2:HTTP_SC"/>
      <property name="ERROR_BODY" expression="\${payload}"/>
    </log>
  </else>
</filter>
\`\`\`

### \`FAULTS_AS_HTTP_200\` — Convert Faults to 200
When you want to always return HTTP 200 to the client, even for backend faults:
\`\`\`xml
<property name="FAULTS_AS_HTTP_200" scope="axis2" value="true"/>
\`\`\`
This is useful when the client expects 200 with error details in the body (e.g., SOAP-style error responses).

### Fault Sequence Error Properties
When the fault sequence **is** triggered (4xx/5xx without \`nonErrorHttpStatusCodes\`), these properties are available:

| Property | Scope | Description |
|----------|-------|-------------|
| \`ERROR_CODE\` | default | Numeric error code (e.g., transport error codes) |
| \`ERROR_MESSAGE\` | default | Human-readable error description |
| \`ERROR_DETAIL\` | default | Detailed error information |
| \`ERROR_EXCEPTION\` | default | Exception stack trace (if available) |
| \`HTTP_SC\` | axis2 | The HTTP status code that caused the fault |

**Fault sequence example:**
\`\`\`xml
<sequence name="myFaultSequence">
  <log level="custom">
    <property name="FAULT_CODE" expression="get-property('ERROR_CODE')"/>
    <property name="FAULT_MESSAGE" expression="get-property('ERROR_MESSAGE')"/>
    <property name="HTTP_STATUS" expression="$axis2:HTTP_SC"/>
  </log>
  <payloadFactory media-type="json">
    <format>{"error": "$1", "status": "$2"}</format>
    <args>
      <arg evaluator="xml" expression="get-property('ERROR_MESSAGE')"/>
      <arg evaluator="xml" expression="$axis2:HTTP_SC"/>
    </args>
  </payloadFactory>
  <respond/>
</sequence>
\`\`\`

### Best Practice: Handle All Expected Error Codes
\`\`\`xml
<!-- Allow all client and server errors through normal flow for custom handling -->
<http.post configKey="myConnection">
  <relativePath>/api/resource</relativePath>
  <requestBodyType>JSON</requestBodyType>
  <requestBodyJson>\${payload}</requestBodyJson>
  <nonErrorHttpStatusCodes>400,401,403,404,405,409,422,429,500,502,503</nonErrorHttpStatusCodes>
</http.post>

<!-- Now branch on the status -->
<property name="statusCode" expression="$axis2:HTTP_SC" scope="default" type="STRING"/>
<filter xpath="fn:starts-with(get-property('statusCode'), '2')">
  <then>
    <!-- Success path -->
  </then>
  <else>
    <!-- Error path: response body contains backend error details -->
    <log level="custom">
      <property name="BACKEND_ERROR" expression="$axis2:HTTP_SC"/>
      <property name="ERROR_RESPONSE" expression="\${payload}"/>
    </log>
  </else>
</filter>
\`\`\``,

authentication: `## Authentication Patterns

The HTTP connector does **not** have built-in authentication mechanisms. Authentication must be configured in the Synapse mediation flow using headers.

### Basic Authentication
\`\`\`xml
<!-- Option 1: Static credentials via headers parameter -->
<http.get configKey="myConnection">
  <relativePath>/api/resource</relativePath>
  <headers>[["Authorization", "Basic dXNlcm5hbWU6cGFzc3dvcmQ="]]</headers>
</http.get>

<!-- Option 2: Dynamic credentials using base64 encoding -->
<property name="credentials" expression="fn:concat(vars.username, ':', vars.password)"/>
<property name="authHeader" expression="fn:concat('Basic ', base64Encode(get-property('credentials')))"/>
<http.get configKey="myConnection">
  <relativePath>/api/resource</relativePath>
  <headers>[["Authorization", "\${get-property('authHeader')}"]]</headers>
</http.get>
\`\`\`

### Bearer Token / OAuth2
\`\`\`xml
<!-- Static token -->
<http.get configKey="myConnection">
  <relativePath>/api/resource</relativePath>
  <headers>[["Authorization", "Bearer my-access-token"]]</headers>
</http.get>

<!-- Dynamic token from a variable -->
<http.get configKey="myConnection">
  <relativePath>/api/resource</relativePath>
  <headers>[["Authorization", "Bearer \${vars.accessToken}"]]</headers>
</http.get>
\`\`\`

### OAuth2 Client Credentials Flow (Token Fetch + API Call)
\`\`\`xml
<!-- Step 1: Fetch access token -->
<http.post configKey="tokenEndpoint">
  <relativePath>/oauth2/token</relativePath>
  <requestBodyType>TEXT</requestBodyType>
  <requestBodyText>grant_type=client_credentials</requestBodyText>
  <headers>[["Authorization", "Basic \${base64Encode(fn:concat(vars.clientId, ':', vars.clientSecret))}"], ["Content-Type", "application/x-www-form-urlencoded"]]</headers>
</http.post>

<!-- Step 2: Extract token from response -->
<property name="accessToken" expression="json-eval($.access_token)" scope="default"/>

<!-- Step 3: Call target API with token -->
<http.get configKey="targetApi">
  <relativePath>/api/protected-resource</relativePath>
  <headers>[["Authorization", "Bearer \${get-property('accessToken')}"]]</headers>
</http.get>
\`\`\`

### API Key Authentication
\`\`\`xml
<!-- API key in header -->
<http.get configKey="myConnection">
  <relativePath>/api/resource</relativePath>
  <headers>[["X-API-Key", "\${vars.apiKey}"]]</headers>
</http.get>

<!-- API key in query parameter -->
<http.get configKey="myConnection">
  <relativePath>/api/resource?api_key=\${vars.apiKey}</relativePath>
</http.get>
\`\`\`

### Custom Headers Format
The \`headers\` parameter accepts JSON in two formats:

**Array of arrays (recommended):**
\`\`\`json
[["Authorization", "Bearer token"], ["Content-Type", "application/json"], ["X-Custom", "value"]]
\`\`\`

**Array of objects:**
\`\`\`json
[{"Authorization": "Bearer token"}, {"Content-Type": "application/json"}]
\`\`\``,

transport_properties: `## HTTP Transport Properties Reference

All properties are set in the \`axis2\` scope. They can be set either:
1. As connector operation parameters (camelCase names)
2. As Synapse properties before the call (UPPER_CASE names)

### Complete Property Table

| Connector Param | Axis2 Property | Type | Description |
|-----------------|----------------|------|-------------|
| \`postToUri\` | \`POST_TO_URI\` | string | Route messages directly to the URI endpoint |
| \`forceScAccepted\` | \`FORCE_SC_ACCEPTED\` | boolean | Force HTTP 202 Accepted response to client |
| \`disableChunking\` | \`DISABLE_CHUNKING\` | boolean | Disable HTTP chunked transfer encoding |
| \`noEntityBody\` | \`NO_ENTITY_BODY\` | BOOLEAN | Request has no body |
| \`forceHttp10\` | \`FORCE_HTTP_1.0\` | boolean | Force HTTP 1.0 protocol |
| \`httpSc\` | \`HTTP_SC\` | string | Set expected/override HTTP status code |
| \`nonErrorHttpStatusCodes\` | \`non.error.http.status.codes\` | STRING | Comma-separated codes to treat as non-errors |
| \`httpScDesc\` | \`HTTP_SC_DESC\` | string | HTTP status description override |
| \`faultsAsHttp200\` | \`FAULTS_AS_HTTP_200\` | boolean | Convert faults to HTTP 200 |
| \`noKeepAlive\` | \`NO_KEEPALIVE\` | boolean | Disable HTTP keep-alive |
| \`requestHostHeader\` | \`REQUEST_HOST_HEADER\` | string | Override Host header value |
| \`forcePostPutNobody\` | \`FORCE_POST_PUT_NOBODY\` | BOOLEAN | Send POST/PUT without body |
| \`forceHttpContentLength\` | \`FORCE_HTTP_CONTENT_LENGTH\` | boolean | Force Content-Length header |
| \`copyContentLengthFromIncoming\` | \`COPY_CONTENT_LENGTH_FROM_INCOMING\` | boolean | Copy Content-Length from incoming request |

**Note:** All these properties are automatically cleaned up (removed) after the HTTP call completes.

### Response Properties (available after call)

| Property | Scope | Description |
|----------|-------|-------------|
| \`HTTP_SC\` | axis2 | Response HTTP status code |
| \`HTTP_SC_DESC\` | axis2 | Response status description |
| \`TRANSPORT_HEADERS\` | axis2 | Map of response headers |`,

payload_and_streaming: `## Payload Types and Large Payload Handling

### Request Body Types
The HTTP connector supports three payload types via the \`requestBodyType\` parameter:

**JSON (\`requestBodyType=JSON\`):**
\`\`\`xml
<http.post configKey="myConnection">
  <relativePath>/api/resource</relativePath>
  <requestBodyType>JSON</requestBodyType>
  <requestBodyJson>{"name": "\${vars.name}", "value": 42}</requestBodyJson>
</http.post>
\`\`\`
- Sets Content-Type: \`application/json\`
- Supports inline Synapse expressions

**XML (\`requestBodyType=XML\`):**
\`\`\`xml
<http.post configKey="myConnection">
  <relativePath>/api/resource</relativePath>
  <requestBodyType>XML</requestBodyType>
  <requestBodyXml><root><name>\${vars.name}</name></root></requestBodyXml>
</http.post>
\`\`\`
- Sets Content-Type: \`application/xml\`
- If the XML is a valid SOAP envelope, it replaces the entire message envelope

**TEXT (\`requestBodyType=TEXT\`):**
\`\`\`xml
<http.post configKey="myConnection">
  <relativePath>/api/resource</relativePath>
  <requestBodyType>TEXT</requestBodyType>
  <requestBodyText>grant_type=client_credentials&amp;scope=read</requestBodyText>
</http.post>
\`\`\`
- Sets Content-Type: \`text/plain\`
- Useful for form-urlencoded data (set Content-Type header manually)

### Chunked Transfer vs Content-Length

By default, the HTTP connector uses **chunked transfer encoding** for requests with bodies.

**Disable chunking (use Content-Length instead):**
\`\`\`xml
<http.post configKey="myConnection">
  <relativePath>/api/resource</relativePath>
  <requestBodyType>JSON</requestBodyType>
  <requestBodyJson>\${payload}</requestBodyJson>
  <disableChunking>true</disableChunking>
</http.post>
\`\`\`

**Force Content-Length header explicitly:**
\`\`\`xml
<http.post configKey="myConnection">
  <relativePath>/api/resource</relativePath>
  <requestBodyType>JSON</requestBodyType>
  <requestBodyJson>\${payload}</requestBodyJson>
  <forceHttpContentLength>true</forceHttpContentLength>
</http.post>
\`\`\`

**Copy Content-Length from incoming request (proxy pattern):**
\`\`\`xml
<http.post configKey="myConnection">
  <relativePath>/api/resource</relativePath>
  <requestBodyType>JSON</requestBodyType>
  <requestBodyJson>\${payload}</requestBodyJson>
  <copyContentLengthFromIncoming>true</copyContentLengthFromIncoming>
</http.post>
\`\`\`

### When to Use Each Option
| Scenario | Setting |
|----------|---------|
| Default (most APIs) | No change needed (chunked) |
| Backend rejects chunked encoding | \`disableChunking=true\` |
| Backend requires Content-Length header | \`forceHttpContentLength=true\` |
| Proxying requests (preserve original) | \`copyContentLengthFromIncoming=true\` |
| GET/HEAD/DELETE with no body | \`noEntityBody=true\` |
| POST/PUT without body (rare) | \`forcePostPutNobody=true\` |

### Response Handling
The HTTP connector stores the response in the message context by default (replaces the current payload). Use:
- \`responseVariable\` parameter to store the response in a named variable instead
- \`overwriteBody\` parameter to control whether the response replaces the current message body`,

response_variable: `## Response Variable Pattern

The HTTP connector supports storing responses in named variables instead of replacing the message body. This is useful when you need to make multiple HTTP calls and preserve intermediate results.

### Using responseVariable
\`\`\`xml
<!-- Store response in a variable instead of overwriting message body -->
<http.get configKey="userService">
  <relativePath>/api/users/\${vars.userId}</relativePath>
  <responseVariable>userResponse</responseVariable>
  <overwriteBody>false</overwriteBody>
</http.get>

<!-- Original payload is preserved, response accessible via variable -->
<log level="custom">
  <property name="USER_NAME" expression="\${vars.userResponse.payload.name}"/>
  <property name="STATUS" expression="\${vars.userResponse.statusCode}"/>
</log>
\`\`\`

### Multiple Sequential Calls
\`\`\`xml
<!-- Call 1: Get user -->
<http.get configKey="userService">
  <relativePath>/api/users/\${vars.userId}</relativePath>
  <responseVariable>userResp</responseVariable>
  <overwriteBody>false</overwriteBody>
</http.get>

<!-- Call 2: Get user's orders (original payload preserved) -->
<http.get configKey="orderService">
  <relativePath>/api/orders?userId=\${vars.userId}</relativePath>
  <responseVariable>ordersResp</responseVariable>
  <overwriteBody>false</overwriteBody>
</http.get>

<!-- Use both responses -->
<payloadFactory media-type="json">
  <format>{"user": $1, "orders": $2}</format>
  <args>
    <arg expression="\${vars.userResp.payload}" evaluator="xml"/>
    <arg expression="\${vars.ordersResp.payload}" evaluator="xml"/>
  </args>
</payloadFactory>
\`\`\`

### Response Variable Properties
When using \`responseVariable\`, the variable contains:
- \`.payload\` — The response body
- \`.statusCode\` — The HTTP status code
- \`.headers\` — Response headers`,

};

// Build full reference by joining all sections
export const SYNAPSE_HTTP_CONNECTOR_GUIDE_FULL = `# WSO2 MI HTTP Connector Guide

${Object.values(SYNAPSE_HTTP_CONNECTOR_GUIDE_SECTIONS).join('\n\n')}`;
