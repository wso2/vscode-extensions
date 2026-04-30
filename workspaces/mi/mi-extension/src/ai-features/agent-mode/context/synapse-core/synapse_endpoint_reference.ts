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

/**
 * Complete Endpoint Type Reference for WSO2 Synapse
 * Extracted from endpoint factory classes in the Synapse source code.
 *
 * Section-based exports for granular context loading.
 */

export const SYNAPSE_ENDPOINT_REFERENCE_SECTIONS: Record<string, string> = {

address: `## Address Endpoint

The most common endpoint type for calling external SOAP or REST services at a fixed URL.

### XML Schema
\`\`\`xml
<endpoint [name="name"] [onError="faultSequenceKey"]>
  <address uri="http://example.com/service"
           [format="soap11|soap12|pox|get|rest"]
           [optimize="mtom|swa"]
           [encoding="charset"]
           [statistics="enable|disable"]
           [trace="enable|disable"]>
    <!-- Common config: timeout, suspend, retry (see common_config section) -->
  </address>
</endpoint>
\`\`\`

### Attributes
| Attribute | Required | Values | Default | Notes |
|-----------|----------|--------|---------|-------|
| \`uri\` | **YES** | Any URL | -- | Throws if missing. Trimmed and resolved. |
| \`format\` | No | \`soap11\`, \`soap12\`, \`pox\`, \`get\`, \`rest\` | passthrough | Controls message format sent to backend |
| \`optimize\` | No | \`mtom\`, \`swa\` | none | Binary optimization |
| \`encoding\` | No | charset name | null | Character encoding |
| \`statistics\` | No | \`enable\`, \`disable\` | disable | Statistics collection |
| \`trace\` | No | \`enable\`, \`disable\` | disable | Message tracing |

### Format Values Explained
| Format | Content-Type | Use Case |
|--------|-------------|----------|
| \`soap11\` | \`text/xml\` | SOAP 1.1 backend |
| \`soap12\` | \`application/soap+xml\` | SOAP 1.2 backend |
| \`pox\` | \`application/xml\` | Plain Old XML (no SOAP envelope) |
| \`rest\` | \`application/xml\` | Same as pox (alias) |
| \`get\` | -- | Forces HTTP GET method |
| (none) | passthrough | Preserves original message format |

### Example: SOAP 1.1 Backend
\`\`\`xml
<endpoint name="LegacySoapEP">
  <address uri="http://backend:8080/services/Calculator" format="soap11"/>
</endpoint>
\`\`\`
`,

http: `## HTTP Endpoint

The preferred endpoint type for REST services. Supports URI templates, HTTP methods, HTTP/2, and OAuth authentication.

### XML Schema
\`\`\`xml
<endpoint [name="name"] [onError="faultSequenceKey"]>
  <http [uri-template="http://example.com/api/{resource}"]
        [method="GET|POST|PUT|DELETE|HEAD|PATCH|OPTIONS"]
        [version="1.1|2.0"]
        [format="soap11|soap12|pox|get|rest"]
        [statistics="enable|disable"]
        [trace="enable|disable"]>

    <!-- Optional: Authentication -->
    <authentication>
      <!-- Basic Auth -->
      <basicAuth>
        <username>user</username>
        <password>pass</password>
      </basicAuth>
      <!-- OR OAuth -->
      <oauth>
        <clientCredentials>
          <tokenUrl>https://auth.example.com/token</tokenUrl>
          <clientId>id</clientId>
          <clientSecret>secret</clientSecret>
          <authMode>header|payload</authMode>
        </clientCredentials>
      </oauth>
    </authentication>

    <!-- Common config: timeout, suspend, retry (see common_config section) -->
  </http>
</endpoint>
\`\`\`

### Attributes
| Attribute | Required | Values | Default | Notes |
|-----------|----------|--------|---------|-------|
| \`uri-template\` | Typical | RFC 6570 URI template | null | Supports \`{var}\` placeholders. Prefix with \`legacy-encoding:\` for old-style encoding |
| \`method\` | No | GET, POST, PUT, DELETE, HEAD, PATCH, OPTIONS | from incoming message | Case-insensitive. Invalid values silently fall back to incoming method |
| \`version\` | No | \`1.1\`, \`2.0\` | \`1.1\` | Invalid values throw exception |
| \`format\` | No | \`soap11\`, \`soap12\`, \`pox\`, \`get\`, \`rest\` | passthrough | Usually not needed for REST |
| \`statistics\` | No | \`enable\`, \`disable\` | disable | |
| \`trace\` | No | \`enable\`, \`disable\` | disable | |

### Authentication Options

**Basic Auth:**
\`\`\`xml
<authentication>
  <basicAuth>
    <username>admin</username>
    <password>secret</password>
  </basicAuth>
</authentication>
\`\`\`

**OAuth Client Credentials:**
\`\`\`xml
<authentication>
  <oauth>
    <clientCredentials>
      <tokenUrl>https://auth.example.com/oauth2/token</tokenUrl>
      <clientId>myClientId</clientId>
      <clientSecret>myClientSecret</clientSecret>
      <authMode>header</authMode>
    </clientCredentials>
  </oauth>
</authentication>
\`\`\`

**OAuth Authorization Code (with refresh token):**
\`\`\`xml
<authentication>
  <oauth>
    <authorizationCode>
      <tokenUrl>https://auth.example.com/oauth2/token</tokenUrl>
      <clientId>myClientId</clientId>
      <clientSecret>myClientSecret</clientSecret>
      <refreshToken>myRefreshToken</refreshToken>
      <authMode>header</authMode>
    </authorizationCode>
  </oauth>
</authentication>
\`\`\`

**OAuth Password Credentials:**
\`\`\`xml
<authentication>
  <oauth>
    <passwordCredentials>
      <tokenUrl>https://auth.example.com/oauth2/token</tokenUrl>
      <clientId>myClientId</clientId>
      <clientSecret>myClientSecret</clientSecret>
      <username>resourceOwner</username>
      <password>resourcePass</password>
      <authMode>header</authMode>
    </passwordCredentials>
  </oauth>
</authentication>
\`\`\`

### Example: REST API with OAuth
\`\`\`xml
<endpoint name="SecureApiEP">
  <http uri-template="https://api.example.com/v2/orders/{orderId}" method="GET">
    <authentication>
      <oauth>
        <clientCredentials>
          <tokenUrl>https://auth.example.com/token</tokenUrl>
          <clientId>app123</clientId>
          <clientSecret>secret456</clientSecret>
          <authMode>header</authMode>
        </clientCredentials>
      </oauth>
    </authentication>
    <timeout><duration>30000</duration></timeout>
  </http>
</endpoint>
\`\`\`
`,

wsdl: `## WSDL Endpoint

Creates an endpoint from a WSDL document. The address is extracted from the WSDL \`service\` and \`port\` definitions.

### XML Schema
\`\`\`xml
<endpoint [name="name"]>
  <wsdl [uri="http://example.com/service?wsdl"]
        service="QualifiedServiceName"
        port="QualifiedPortName"
        [format="soap11|soap12|pox|get|rest"]
        [statistics="enable|disable"]
        [trace="enable|disable"]>
    <!-- Common config: timeout, suspend, retry -->
  </wsdl>
</endpoint>
\`\`\`

### Attributes
| Attribute | Required | Notes |
|-----------|----------|-------|
| \`uri\` | Conditional | URL to fetch WSDL. Required unless inline WSDL is embedded |
| \`service\` | YES | Qualified service name from the WSDL |
| \`port\` | YES | Qualified port name from the WSDL |

### WSDL Source Priority
1. \`uri\` attribute — fetches WSDL from URL
2. Inline \`<wsdl:definitions>\` child element (WSDL 1.1 only)
3. WSDL 2.0 is NOT supported (throws exception)

### Example
\`\`\`xml
<endpoint name="CalculatorEP">
  <wsdl uri="http://backend:8080/services/Calculator?wsdl"
        service="Calculator"
        port="CalculatorPort"
        format="soap11">
    <timeout><duration>30000</duration></timeout>
  </wsdl>
</endpoint>
\`\`\`
`,

default_ep: `## Default Endpoint

An endpoint with **no URI**. Uses the \`To\` header from the incoming message as the backend address. Common in proxy services for passthrough scenarios.

### XML Schema
\`\`\`xml
<endpoint [name="name"]>
  <default [format="soap11|soap12|pox|get|rest"]
           [statistics="enable|disable"]
           [trace="enable|disable"]>
    <!-- Common config: timeout, suspend, retry -->
  </default>
</endpoint>
\`\`\`

### Key Behavior
- No \`uri\` attribute — the destination is determined at runtime from the message context \`To\` header
- Suitable for proxy services that forward to whatever address the client specified
- Supports all common EndpointDefinition config (timeout, suspend, retry)

### Example: Proxy Service Passthrough
\`\`\`xml
<proxy name="PassthroughProxy" transports="http https" startOnLoad="true">
  <target>
    <endpoint>
      <default format="pox">
        <timeout><duration>60000</duration></timeout>
      </default>
    </endpoint>
  </target>
</proxy>
\`\`\`
`,

failover: `## Failover Endpoint

Tries child endpoints in order. If the first fails, tries the second, and so on.

### XML Schema
\`\`\`xml
<endpoint [name="name"]>
  <failover [dynamic="true|false"] [buildMessage="true|false"]>
    <endpoint>...</endpoint>
    <endpoint>...</endpoint>
    <!-- 1 or more child endpoints (any type) -->
  </failover>
</endpoint>
\`\`\`

### Attributes
| Attribute | Required | Default | Notes |
|-----------|----------|---------|-------|
| \`dynamic\` | No | \`true\` | When true, retries previously failed endpoints after recovery |
| \`buildMessage\` | No | false | When true, fully builds/buffers message before sending. Important for streaming |

### Rules
- Must have at least 1 child endpoint (throws if empty)
- Child endpoints can be any type (address, http, loadbalance, etc.)
- No duplicate indirect endpoint keys within siblings
- **No timeout/suspend/retry config on failover itself** — configure these on each child endpoint

### Example
\`\`\`xml
<endpoint name="FailoverEP">
  <failover>
    <endpoint name="Primary">
      <http uri-template="https://primary.example.com/api" method="POST">
        <timeout><duration>5000</duration></timeout>
        <suspendOnFailure>
          <initialDuration>30000</initialDuration>
          <progressionFactor>2.0</progressionFactor>
          <maximumDuration>120000</maximumDuration>
        </suspendOnFailure>
      </http>
    </endpoint>
    <endpoint name="Secondary">
      <http uri-template="https://secondary.example.com/api" method="POST">
        <timeout><duration>5000</duration></timeout>
      </http>
    </endpoint>
  </failover>
</endpoint>
\`\`\`
`,

loadbalance: `## Load-Balance Endpoint

Distributes requests across child endpoints using a configurable algorithm.

### XML Schema (Endpoint Mode)
\`\`\`xml
<endpoint [name="name"]>
  <loadbalance [policy="roundRobin"]
               [algorithm="com.example.CustomAlgorithm"]
               [failover="true|false"]
               [buildMessage="true|false"]>
    <endpoint>...</endpoint>
    <endpoint>...</endpoint>
  </loadbalance>
</endpoint>
\`\`\`

### XML Schema (Member Mode)
\`\`\`xml
<endpoint [name="name"]>
  <loadbalance algorithm="org.apache.synapse.endpoints.algorithms.RoundRobin">
    <member hostName="host1.example.com" httpPort="8080" httpsPort="8443"/>
    <member hostName="host2.example.com" httpPort="8080" httpsPort="8443"/>
  </loadbalance>
</endpoint>
\`\`\`

### Attributes
| Attribute | Required | Default | Notes |
|-----------|----------|---------|-------|
| \`policy\` | No | \`roundRobin\` | Only \`roundRobin\` supported. **Cannot combine with \`algorithm\`** |
| \`algorithm\` | No | RoundRobin | Fully qualified class name. **Cannot combine with \`policy\`** |
| \`failover\` | No | \`true\` | When true, fails over to next endpoint on error |
| \`buildMessage\` | No | false | Buffers message before sending |

### Rules
- Must have \`<endpoint>\` children OR \`<member>\` children — **not both** (throws exception)
- Must have at least 1 child
- No timeout/suspend/retry on loadbalance itself — configure on child endpoints

### Session-Affinity Load Balance
To maintain session stickiness, add a \`<session>\` element as a sibling to \`<loadbalance>\`:

\`\`\`xml
<endpoint name="SessionLB">
  <session type="http">
    <sessionTimeout>120000</sessionTimeout>
  </session>
  <loadbalance policy="roundRobin">
    <endpoint><http uri-template="http://host1:8080/api" method="POST"/></endpoint>
    <endpoint><http uri-template="http://host2:8080/api" method="POST"/></endpoint>
  </loadbalance>
</endpoint>
\`\`\`

Session types: \`http\` (HTTP cookies), \`soap\` (SOAP sessions), \`simpleClientSession\` (client IP-based).
\`<sessionTimeout>\` is in milliseconds. The \`<session>\` element is required for session-affinity.
`,

template: `## Template Endpoint

References a reusable endpoint template, injecting parameter values at runtime.

### XML Schema
\`\`\`xml
<endpoint name="name" template="templateKey" [uri="http://example.com/api"]>
  <parameter name="paramName" value="paramValue"/>
  <parameter name="anotherParam" value="anotherValue"/>
</endpoint>
\`\`\`

### Key Points
- Detected by the \`template\` attribute on the \`<endpoint>\` element itself (no child element like \`<address>\`)
- \`template\` attribute is **required** — throws if missing
- \`uri\` is optional — stored as parameter \`"uri"\` and injected into the template
- Each \`<parameter>\` must have both \`name\` and \`value\` attributes (throws if either is missing)
- **No EndpointDefinition config** (timeout, suspend, retry) — these are defined in the template itself

### Defining an Endpoint Template
\`\`\`xml
<template name="HTTPServiceTemplate" xmlns="http://ws.apache.org/ns/synapse">
  <endpoint name="$name">
    <http uri-template="$uri" method="POST">
      <timeout><duration>$timeout</duration></timeout>
    </http>
  </endpoint>
</template>
\`\`\`

### Using the Template
\`\`\`xml
<endpoint name="OrderServiceEP" template="HTTPServiceTemplate">
  <parameter name="uri" value="http://backend:8080/orders"/>
  <parameter name="timeout" value="30000"/>
</endpoint>
\`\`\`
`,

common_config: `## Common Endpoint Configuration (EndpointDefinition)

All leaf endpoints (Address, HTTP, WSDL, Default) share these child elements for QoS configuration. Composite endpoints (Failover, Loadbalance) do NOT have these — configure them on each child endpoint instead.

### Timeout
\`\`\`xml
<timeout>
  <duration>30000</duration>                <!-- milliseconds, or {xpath} for dynamic -->
  <responseAction>discard|fault</responseAction>  <!-- what to do on timeout -->
</timeout>
\`\`\`

| Element | Default | Notes |
|---------|---------|-------|
| \`<duration>\` | 0 (no timeout; effective timeout is 24h from global config) | Supports dynamic XPath: \`<duration>{$ctx:timeout}</duration>\` |
| \`<responseAction>\` | none (log and continue) | \`discard\` = drop late response. \`fault\` = trigger fault sequence |

### Suspend on Failure
Controls when the endpoint is taken **completely out of service**.

\`\`\`xml
<suspendOnFailure>
  <errorCodes>101504, 101505</errorCodes>       <!-- comma-separated error codes -->
  <initialDuration>30000</initialDuration>       <!-- ms before first retry -->
  <progressionFactor>2.0</progressionFactor>     <!-- exponential backoff multiplier -->
  <maximumDuration>120000</maximumDuration>       <!-- max suspension duration ms -->
</suspendOnFailure>
\`\`\`

| Element | Default | Notes |
|---------|---------|-------|
| \`<errorCodes>\` | empty | Comma or space-separated. These errors trigger suspension |
| \`<initialDuration>\` | -1 (global config) | Duration = initial * factor^(failures-1) |
| \`<progressionFactor>\` | 1.0 | Exponential backoff factor |
| \`<maximumDuration>\` | Long.MAX_VALUE | Cap on suspension duration |

### Mark for Suspension (Timeout State)
An intermediate state before full suspension. Allows retries before suspending.

\`\`\`xml
<markForSuspension>
  <errorCodes>101503, 101504</errorCodes>
  <retriesBeforeSuspension>3</retriesBeforeSuspension>
  <retryDelay>1000</retryDelay>
</markForSuspension>
\`\`\`

| Element | Default | Notes |
|---------|---------|-------|
| \`<errorCodes>\` | empty | These errors put endpoint in timeout state (not immediate suspension) |
| \`<retriesBeforeSuspension>\` | 0 | Number of retries before moving to suspended state |
| \`<retryDelay>\` | 0 ms | Delay between retries |

### Retry Config
\`\`\`xml
<retryConfig>
  <disabledErrorCodes>101507, 101508</disabledErrorCodes>
  <enabledErrorCodes>101503</enabledErrorCodes>
</retryConfig>
\`\`\`

| Element | Notes |
|---------|-------|
| \`<disabledErrorCodes>\` | Error codes for which retries are disabled |
| \`<enabledErrorCodes>\` | Error codes for which retries are explicitly enabled |

### WS-Addressing
\`\`\`xml
<enableAddressing [version="final|submission"] [separateListener="true|false"]/>
\`\`\`

### WS-Security
\`\`\`xml
<enableSec [policy="secPolicyKey"] [inboundPolicy="key"] [outboundPolicy="key"]/>
\`\`\`
- \`policy\` supports dynamic XPath: \`policy="{$ctx:policyKey}"\`
- \`policy\` is mutually exclusive with \`inboundPolicy\`/\`outboundPolicy\`

### Common Error Codes Reference
| Code | Meaning |
|------|---------|
| 101000 | Receiver I/O error sending |
| 101001 | Sender I/O error sending |
| 101500 | Sender timeout |
| 101501 | Receiver timeout |
| 101503 | Connection failed |
| 101504 | Connection timed out |
| 101505 | Connection closed |
| 101507 | Protocol violation |
| 101508 | Connect cancel |
| 101509 | Connect timeout |
| 101510 | Pending connections |
`,

patterns: `## Common Endpoint Patterns

### Named Endpoint File (recommended)
Define endpoints as named XML files and reference by key:

**File: \`endpoints/OrderServiceEP.xml\`**
\`\`\`xml
<?xml version="1.0" encoding="UTF-8"?>
<endpoint name="OrderServiceEP" xmlns="http://ws.apache.org/ns/synapse">
  <http uri-template="http://backend:8080/api/orders" method="POST">
    <timeout><duration>30000</duration></timeout>
    <suspendOnFailure>
      <initialDuration>5000</initialDuration>
      <progressionFactor>2.0</progressionFactor>
      <maximumDuration>60000</maximumDuration>
    </suspendOnFailure>
  </http>
</endpoint>
\`\`\`

**Reference in API:**
\`\`\`xml
<call>
  <endpoint key="OrderServiceEP"/>
</call>
\`\`\`

### Inline Endpoint in Call
\`\`\`xml
<call>
  <endpoint>
    <http uri-template="http://backend:8080/api/users/\${vars.userId}" method="GET"/>
  </endpoint>
</call>
\`\`\`

### Dynamic Endpoint (key resolved at runtime)
\`\`\`xml
<call>
  <endpoint key-expression="\${vars.endpointKey}"/>
</call>
\`\`\`

### Endpoint in Call vs Send
| Pattern | Behavior |
|---------|----------|
| \`<call><endpoint>...\` | Synchronous (blocking mode) or async continuation. Response available for next mediator |
| \`<send><endpoint>...\` | Fire-and-forget or out-only. Response routed to \`receive\` sequence |

**Prefer \`call\` over \`send\`** for most use cases. \`send\` is legacy and harder to reason about in mediation flows.
`,

};

export const SYNAPSE_ENDPOINT_REFERENCE_FULL = Object.values(SYNAPSE_ENDPOINT_REFERENCE_SECTIONS).join('\n\n---\n\n');
