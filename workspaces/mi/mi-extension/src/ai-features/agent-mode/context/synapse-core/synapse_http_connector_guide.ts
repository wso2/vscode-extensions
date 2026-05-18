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
\`\`\`

### Transport-Level Faults (connection refused, timeout, DNS)
\`nonErrorHttpStatusCodes\` only suppresses **HTTP-level** 4xx/5xx faults — it does **not** prevent **transport-level** faults (TCP connection refused, TCP timeout, DNS lookup failure, TLS handshake error) from propagating.

\`faultsAsHttp200=true\` also does **not** prevent transport faults from bubbling up out of the enclosing sequence.

To handle transport errors gracefully you need two things:
1. **Fail fast with an explicit timeout** on the local entry connection — without it, a dead backend will block the thread for the OS TCP timeout (typically 20–120s) and the whole request will hang.
2. **Catch the fault** with an \`onError\` fault-handler sequence on the enclosing sequence/API resource.

\`\`\`xml
<!-- Local entry with connection-level timeout -->
<localEntry key="myConnection">
  <http.init>
    <baseUrl>https://backend.example.com</baseUrl>
    <timeoutDuration>5000</timeoutDuration>      <!-- ms: fail after 5s -->
    <timeoutAction>Fault</timeoutAction>          <!-- raise fault instead of hanging -->
  </http.init>
</localEntry>

<!-- Attach a fault sequence to catch transport errors -->
<sequence name="BackendCallSequence" onError="BackendFaultSequence">
  <http.post configKey="myConnection">
    <relativePath>/api/resource</relativePath>
    <requestBodyType>JSON</requestBodyType>
    <requestBodyJson>\${payload}</requestBodyJson>
    <nonErrorHttpStatusCodes>400,404,409,422</nonErrorHttpStatusCodes>
  </http.post>
</sequence>

<sequence name="BackendFaultSequence">
  <!-- Transport-level faults land here regardless of nonErrorHttpStatusCodes -->
  <log level="custom">
    <property name="FAULT_CODE" expression="get-property('ERROR_CODE')"/>
    <property name="FAULT_MESSAGE" expression="get-property('ERROR_MESSAGE')"/>
  </log>
  <payloadFactory media-type="json">
    <format>{"error": "backend_unavailable", "detail": "$1"}</format>
    <args>
      <arg expression="get-property('ERROR_MESSAGE')" evaluator="xml"/>
    </args>
  </payloadFactory>
  <property name="HTTP_SC" scope="axis2" value="503"/>
  <respond/>
</sequence>
\`\`\`

**Recommended baseline for any outbound HTTP call:**
- \`timeoutDuration\` set to a realistic upper bound (e.g. 5000 ms) on the local entry.
- \`timeoutAction="Fault"\` so timeouts surface as catchable faults rather than silent hangs.
- An \`onError\` sequence on the enclosing sequence/API resource that produces a deterministic response to the client.`,

connection_config: `## \`<http.init>\` — Connection Configuration (Native Auth)

Create one \`<localEntry key="...">\` per backend. The local entry wraps \`<http.init>\` and becomes the \`configKey\` for every \`http.get\`/\`http.post\`/etc. call. The init element is the preferred place to declare auth — the connector handles token fetching, refresh, and caching for you.

### Core parameters
| Parameter | Required | Notes |
|-----------|----------|-------|
| \`baseUrl\` | yes | e.g. \`https://api.example.com\`. Operation \`relativePath\` is resolved against it |
| \`authType\` | no (default \`None\`) | \`None\` \\| \`Basic\` \\| \`OAuth\` |
| \`timeoutDuration\` | no | ms; fail-fast on hanging backends. Pair with \`timeoutAction\` |
| \`timeoutAction\` | no | \`Fault\` (recommended) \\| \`Discard\` |
| \`suspendErrorCodes\`, \`suspendInitialDuration\`, \`suspendMaximumDuration\`, \`suspendProgressionFactor\` | no | Endpoint-level circuit breaker |
| \`retryErrorCodes\`, \`retryCount\`, \`retryDelay\` | no | Transport-level retry |

### Basic auth
\`\`\`xml
<localEntry key="BackendConn">
  <http.init>
    <baseUrl>https://api.example.com</baseUrl>
    <authType>Basic</authType>
    <basicCredentialsUsername>{wso2:vault-lookup('backend.user')}</basicCredentialsUsername>
    <basicCredentialsPassword>{wso2:vault-lookup('backend.password')}</basicCredentialsPassword>
    <timeoutDuration>5000</timeoutDuration>
    <timeoutAction>Fault</timeoutAction>
  </http.init>
</localEntry>
\`\`\`

### OAuth2 — Client Credentials
\`\`\`xml
<localEntry key="BackendConn">
  <http.init>
    <baseUrl>https://api.example.com</baseUrl>
    <authType>OAuth</authType>
    <oauthGrantType>CLIENT_CREDENTIALS</oauthGrantType>
    <oauthClientId>{wso2:vault-lookup('backend.clientId')}</oauthClientId>
    <oauthClientSecret>{wso2:vault-lookup('backend.clientSecret')}</oauthClientSecret>
    <oauthTokenEndpoint>https://auth.example.com/oauth2/token</oauthTokenEndpoint>
    <oauthScope>read write</oauthScope>
    <oauthAdditionalProperties>audience=api.example.com</oauthAdditionalProperties>
    <timeoutDuration>5000</timeoutDuration>
    <timeoutAction>Fault</timeoutAction>
  </http.init>
</localEntry>
\`\`\`

### OAuth2 — Password (Resource Owner)
\`\`\`xml
<http.init>
  <baseUrl>https://api.example.com</baseUrl>
  <authType>OAuth</authType>
  <oauthGrantType>PASSWORD</oauthGrantType>
  <oauthClientId>...</oauthClientId>
  <oauthClientSecret>...</oauthClientSecret>
  <oauthTokenEndpoint>https://auth.example.com/oauth2/token</oauthTokenEndpoint>
  <oauthUsername>{wso2:vault-lookup('api.username')}</oauthUsername>
  <oauthPassword>{wso2:vault-lookup('api.password')}</oauthPassword>
  <oauthScope>read</oauthScope>
</http.init>
\`\`\`

### OAuth2 — Authorization Code / Refresh Token
Use when you already have a long-lived refresh token (interactive authorization happens outside MI):
\`\`\`xml
<http.init>
  <baseUrl>https://api.example.com</baseUrl>
  <authType>OAuth</authType>
  <oauthGrantType>AUTHORIZATION_CODE</oauthGrantType>
  <oauthClientId>...</oauthClientId>
  <oauthClientSecret>...</oauthClientSecret>
  <oauthTokenEndpoint>https://auth.example.com/oauth2/token</oauthTokenEndpoint>
  <oauthRefreshToken>{wso2:vault-lookup('api.refreshToken')}</oauthRefreshToken>
</http.init>
\`\`\`

### Token caching & refresh
The connector caches the bearer token per connection. When the token expires or the backend returns 401, the connector transparently re-acquires using the configured grant and retries the original request once. You should NOT manually \`<http.post>\` to the token endpoint and stash the token in a property — that bypasses the connector's cache, retry, and concurrency controls.

### Key rules
- Wrap secrets with \`{wso2:vault-lookup('alias')}\` (see registry-resource-guide:secure_vault). Do not check raw client secrets into the repo.
- One connection per local entry — do not nest multiple \`<http.init>\` elements.
- \`\${vars.*}\` references inside \`<http.init>\` fields resolve at deploy-time, not per-request. For rotating credentials that change per-request, fall back to the manual header pattern in \`authentication\`.`,

authentication: `## Authentication Patterns (Legacy / Per-Request Overrides)

**Prefer \`<http.init>\` native auth** (see connection_config above) — it handles token caching, refresh, and concurrency. Use the patterns below only when you need per-request credentials that can't be baked into a connection, or when maintaining legacy configs.

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
