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
 * Synapse Property Reference — Runtime behavior-controlling properties
 * Extracted from SynapseConstants.java, NhttpConstants.java, PassThroughConstants.java,
 * BridgeConstants.java, and RESTConstants.java.
 *
 * Only includes properties that developers SET or READ via the property mediator.
 * Internal-only constants (timing metrics, thread IDs, connection pool state) are excluded.
 *
 * Section-based exports for granular context loading.
 */

export const SYNAPSE_PROPERTY_REFERENCE_SECTIONS: Record<string, string> = {

scope_guide: `## Property Scopes — Where to Set What

Synapse has two property scopes accessible via the property mediator and Synapse expressions:

### Synapse Scope (\`props.synapse.X\`)
Message-level properties that persist throughout the mediation flow. Set via:
\`\`\`xml
<!-- Old syntax (property mediator) -->
<property name="PROP_NAME" value="value" scope="default"/>

<!-- Read via Synapse expression -->
\${props.synapse.PROP_NAME}
\`\`\`

### Axis2 Scope (\`props.axis2.X\`)
Transport-level properties that control HTTP behavior, content types, and protocol settings. Set via:
\`\`\`xml
<!-- Old syntax (property mediator) -->
<property name="PROP_NAME" value="value" scope="axis2"/>

<!-- Read via Synapse expression -->
\${props.axis2.PROP_NAME}
\`\`\`

### Transport Headers (\`headers["X"]\`)
HTTP headers are NOT properties — they are accessed via the \`headers\` scope:
\`\`\`xml
<!-- Set via header mediator -->
<header name="Content-Type" value="application/json" scope="transport"/>

<!-- Read via Synapse expression -->
\${headers["Content-Type"]}
\`\`\`

### Scope Quick Reference
| Property | Scope | Notes |
|----------|-------|-------|
| HTTP_SC, DISABLE_CHUNKING, messageType, ContentType | \`axis2\` | Transport/protocol control |
| FORCE_SC_ACCEPTED, FAULTS_AS_HTTP_200 | \`axis2\` | Response behavior |
| REST_URL_POSTFIX, NO_ENTITY_BODY | \`axis2\` | REST/content control |
| non.error.http.status.codes | \`synapse\` | Suppress fault sequence for specific backend status codes |
| ERROR_CODE, ERROR_MESSAGE, ERROR_DETAIL | \`synapse\` | Error info (read-only typically) |
| OUT_ONLY, RESPONSE, PRESERVE_WS_ADDRESSING | \`synapse\` | Message flow control |
| SET_ROLLBACK_ONLY, SET_REQUEUE_ON_ROLLBACK | \`synapse\` | JMS transaction control |
| SYSTEM_DATE, SYSTEM_TIME, SERVER_IP | \`synapse\` | System info (read-only) |
| TRANSPORT_HEADERS, ClientApiNonBlocking | \`axis2\` | Transport control |
| Content-Type, Authorization, SOAPAction | transport headers | Use header mediator, not property |

### Critical Rule
**There is NO \`trp\` scope** in Synapse expressions. Use \`headers["X"]\` to access transport headers, NOT \`props.trp.X\`.`,

http_response: `## HTTP Response Control Properties

### HTTP_SC — Set/Read HTTP Status Code
| | |
|---|---|
| **Property** | \`HTTP_SC\` |
| **Scope** | \`axis2\` |
| **Type** | STRING |
| **Set** | Controls the HTTP status code sent back to the client |
| **Read** | Contains the HTTP status code received from the backend |

\`\`\`xml
<!-- Read backend response status code -->
<variable name="statusCode" type="STRING" expression="\${props.axis2.HTTP_SC}"/>

<!-- Set custom status code for client response -->
<property name="HTTP_SC" value="201" scope="axis2" type="STRING"/>
\`\`\`

### FORCE_SC_ACCEPTED — Force 202 Accepted
| | |
|---|---|
| **Property** | \`FORCE_SC_ACCEPTED\` |
| **Scope** | \`axis2\` |
| **Values** | \`true\` / \`false\` |
| **Effect** | Immediately returns HTTP 202 to the client. Backend processing continues asynchronously. |

\`\`\`xml
<!-- Accept the request and process asynchronously -->
<property name="FORCE_SC_ACCEPTED" value="true" scope="axis2"/>
\`\`\`
Use case: Long-running operations where you want to acknowledge receipt immediately.

### FAULTS_AS_HTTP_200 — SOAP Faults as 200
| | |
|---|---|
| **Property** | \`FAULTS_AS_HTTP_200\` |
| **Scope** | \`axis2\` |
| **Values** | \`true\` / \`false\` |
| **Effect** | SOAP faults return HTTP 200 instead of HTTP 500. Required by some legacy clients that can't handle non-200 responses with SOAP faults. |

\`\`\`xml
<property name="FAULTS_AS_HTTP_200" value="true" scope="axis2"/>
\`\`\`

### HTTP_SC_DESC — Custom Reason Phrase
| | |
|---|---|
| **Property** | \`HTTP_SC_DESC\` |
| **Scope** | \`axis2\` |
| **Type** | String |
| **Effect** | Overrides the default HTTP reason phrase (e.g., "OK", "Not Found"). |

\`\`\`xml
<!-- Custom status line: "HTTP/1.1 200 Request Processed" -->
<property name="HTTP_SC_DESC" value="Request Processed" scope="axis2"/>
\`\`\`

### NON_ERROR_HTTP_STATUS_CODES — Suppress Error Handling for Specific Status Codes
| | |
|---|---|
| **Property** | \`non.error.http.status.codes\` |
| **Scope** | \`synapse\` |
| **Type** | Comma-separated integers |
| **Effect** | Backend HTTP responses with these status codes will NOT trigger the fault sequence — they are treated as normal responses. Without this, 4xx/5xx codes from the backend trigger error handling. |

\`\`\`xml
<!-- Treat 401 and 404 from backend as normal responses, not errors -->
<property name="non.error.http.status.codes" value="401,404" scope="default"/>
\`\`\`
Use case: When the backend legitimately returns 4xx (e.g., 404 Not Found for a resource lookup) and you want to handle it in the normal mediation flow instead of the fault sequence.`,

http_protocol: `## HTTP Protocol Control Properties

### DISABLE_CHUNKING — Disable Chunked Transfer
| | |
|---|---|
| **Property** | \`DISABLE_CHUNKING\` |
| **Scope** | \`axis2\` |
| **Values** | \`true\` / \`false\` |
| **Effect** | Disables chunked transfer encoding. Message is sent with Content-Length header instead. |

\`\`\`xml
<!-- Backend requires Content-Length, doesn't support chunking -->
<property name="DISABLE_CHUNKING" value="true" scope="axis2"/>
\`\`\`

### FORCE_HTTP_CONTENT_LENGTH — Force Content-Length Header
| | |
|---|---|
| **Property** | \`FORCE_HTTP_CONTENT_LENGTH\` |
| **Scope** | \`axis2\` |
| **Values** | \`true\` / \`false\` |
| **Effect** | Forces Content-Length header on outgoing requests. Often used with COPY_CONTENT_LENGTH_FROM_INCOMING. |

### COPY_CONTENT_LENGTH_FROM_INCOMING — Preserve Original Length
| | |
|---|---|
| **Property** | \`COPY_CONTENT_LENGTH_FROM_INCOMING\` |
| **Scope** | \`axis2\` |
| **Values** | \`true\` / \`false\` |
| **Effect** | Copies Content-Length from the incoming request to the outgoing request. Only works when message body hasn't been modified. |

\`\`\`xml
<!-- Passthrough scenario: preserve original Content-Length -->
<property name="FORCE_HTTP_CONTENT_LENGTH" value="true" scope="axis2"/>
<property name="COPY_CONTENT_LENGTH_FROM_INCOMING" value="true" scope="axis2"/>
\`\`\`

### FORCE_HTTP_1.0 — Force HTTP/1.0
| | |
|---|---|
| **Property** | \`FORCE_HTTP_1.0\` |
| **Scope** | \`axis2\` |
| **Values** | \`true\` / \`false\` |
| **Effect** | Forces HTTP/1.0 protocol. Automatically disables chunked encoding and requires Content-Length. |

\`\`\`xml
<!-- Legacy backend requires HTTP/1.0 -->
<property name="FORCE_HTTP_1.0" value="true" scope="axis2"/>
\`\`\`

### NO_KEEPALIVE — Disable HTTP Keep-Alive
| | |
|---|---|
| **Property** | \`NO_KEEPALIVE\` |
| **Scope** | \`axis2\` |
| **Values** | \`true\` / \`false\` |
| **Effect** | Closes the connection after each request (no keep-alive). |

### POST_TO_URI — Full URI in Request Line
| | |
|---|---|
| **Property** | \`POST_TO_URI\` |
| **Scope** | \`axis2\` |
| **Values** | \`true\` / \`false\` |
| **Effect** | Sends the full URI (including host) in the HTTP request line. Required when communicating through certain proxy servers. |

### FORCE_POST_PUT_NOBODY — POST/PUT Without Body
| | |
|---|---|
| **Property** | \`FORCE_POST_PUT_NOBODY\` |
| **Scope** | \`axis2\` |
| **Values** | \`true\` / \`false\` |
| **Effect** | Sends POST or PUT request with an empty body. Useful for backends that accept POST for triggering actions without a request body. |

### REQUEST_HOST_HEADER — Override Host Header
| | |
|---|---|
| **Property** | \`REQUEST_HOST_HEADER\` |
| **Scope** | \`axis2\` |
| **Type** | String |
| **Effect** | Overrides the HTTP Host header sent to the backend. By default, the Host header is derived from the endpoint URL. Use this when the backend performs host-based routing or virtual hosting that differs from the endpoint address. |

\`\`\`xml
<!-- Override Host header for virtual-hosted backend -->
<property name="REQUEST_HOST_HEADER" value="api.example.com" scope="axis2"/>
\`\`\``,

content_type: `## Content Type & Message Format Properties

### messageType — Message Serialization Format
| | |
|---|---|
| **Property** | \`messageType\` |
| **Scope** | \`axis2\` |
| **Values** | MIME type string |
| **Effect** | Controls which MessageFormatter serializes the outgoing message. Changing this changes the wire format. |

\`\`\`xml
<!-- Force JSON output format -->
<property name="messageType" value="application/json" scope="axis2"/>

<!-- Force XML output format -->
<property name="messageType" value="application/xml" scope="axis2"/>

<!-- Force SOAP 1.1 format -->
<property name="messageType" value="text/xml" scope="axis2"/>

<!-- Force SOAP 1.2 format -->
<property name="messageType" value="application/soap+xml" scope="axis2"/>
\`\`\`

### ContentType — Content-Type Header Value
| | |
|---|---|
| **Property** | \`ContentType\` |
| **Scope** | \`axis2\` |
| **Values** | MIME type string |
| **Effect** | Sets the Content-Type HTTP header on the outgoing message. |

### messageType vs ContentType
| Property | Controls | Example |
|----------|---------|---------|
| \`messageType\` | How the message is **serialized** (which formatter is used) | \`application/json\` → JSON formatter |
| \`ContentType\` | The **Content-Type header** sent in the HTTP response/request | \`application/json; charset=UTF-8\` |

Usually you set both together:
\`\`\`xml
<property name="messageType" value="application/json" scope="axis2"/>
<property name="ContentType" value="application/json" scope="axis2"/>
\`\`\`

### NO_ENTITY_BODY — No Message Body
| | |
|---|---|
| **Property** | \`NO_ENTITY_BODY\` |
| **Scope** | \`axis2\` |
| **Values** | \`true\` / \`false\` |
| **Effect** | Signals no entity body in the response. Transport sets Content-Length: 0 and skips body serialization. |

\`\`\`xml
<!-- Return 204 No Content -->
<property name="HTTP_SC" value="204" scope="axis2"/>
<property name="NO_ENTITY_BODY" value="true" scope="axis2" type="BOOLEAN"/>
<respond/>
\`\`\`

### SET_CHARACTER_ENCODING — Character Encoding Control
| | |
|---|---|
| **Property** | \`setCharacterEncoding\` |
| **Scope** | \`axis2\` |
| **Values** | \`true\` / \`false\` |
| **Effect** | When false, prevents the transport from adding charset parameter to Content-Type header. |

### NoDefaultContentType — Suppress Default Content-Type
| | |
|---|---|
| **Property** | \`NoDefaultContentType\` |
| **Scope** | \`axis2\` |
| **Values** | \`true\` / \`false\` |
| **Effect** | Prevents adding a default Content-Type header when none is specified. |

### QUOTE_STRING_IN_PAYLOAD_FACTORY_JSON — Control JSON String Quoting
| | |
|---|---|
| **Property** | \`QUOTE_STRING_IN_PAYLOAD_FACTORY_JSON\` |
| **Scope** | \`synapse\` |
| **Values** | \`true\` (default) / \`false\` |
| **Effect** | When true (default), string values injected into JSON payloadFactory templates are automatically quoted. Set to false when the expression already produces a valid JSON fragment (object/array) that should NOT be double-quoted. |

\`\`\`xml
<!-- Expression returns a JSON object — don't wrap it in quotes -->
<property name="QUOTE_STRING_IN_PAYLOAD_FACTORY_JSON" value="false" scope="default"/>
<payloadFactory media-type="json">
  <format>{"data": \${vars.jsonFragment}}</format>
</payloadFactory>
\`\`\`

### MESSAGE_FORMAT — Override Message Format
| | |
|---|---|
| **Property** | \`MESSAGE_FORMAT\` |
| **Scope** | \`synapse\` |
| **Values** | \`pox\`, \`soap11\`, \`soap12\`, \`rest\`, \`get\` |
| **Effect** | Overrides the message format. Same effect as the \`format\` attribute on endpoints but set dynamically. |`,

message_flow: `## Message Flow Control Properties

### OUT_ONLY — One-Way (Fire-and-Forget)
| | |
|---|---|
| **Property** | \`OUT_ONLY\` |
| **Scope** | \`synapse\` |
| **Values** | \`true\` / \`false\` |
| **Effect** | Marks the message as one-way. No response is expected from the backend. The send mediator will fire-and-forget. |

\`\`\`xml
<!-- Fire-and-forget to backend -->
<property name="OUT_ONLY" value="true" scope="default"/>
<send>
  <endpoint key="EventReceiverEP"/>
</send>
\`\`\`

### RESPONSE — Mark as Response
| | |
|---|---|
| **Property** | \`RESPONSE\` |
| **Scope** | \`synapse\` |
| **Values** | \`true\` / \`false\` |
| **Effect** | Marks the current message as a response message. Used in proxy services to indicate the response path. |

\`\`\`xml
<property name="RESPONSE" value="true" scope="default"/>
\`\`\`

### FORCE_ERROR_ON_SOAP_FAULT — Trigger Fault Sequence on SOAP Fault
| | |
|---|---|
| **Property** | \`FORCE_ERROR_ON_SOAP_FAULT\` |
| **Scope** | \`synapse\` |
| **Values** | \`true\` / \`false\` |
| **Effect** | When the backend returns a SOAP fault, this forces the fault sequence to execute instead of normal mediation flow. |

### PRESERVE_ENVELOPE — Preserve Envelope Before Send
| | |
|---|---|
| **Property** | \`PRESERVE_ENVELOPE\` |
| **Scope** | \`synapse\` |
| **Values** | \`true\` / \`false\` |
| **Effect** | Preserves the SOAP envelope state before sending. Used in failover/loadbalance scenarios to retry with the original message. |

### FORCE_SOAP_FAULT — Force SOAP Fault
| | |
|---|---|
| **Property** | \`FORCE_SOAP_FAULT\` |
| **Scope** | \`axis2\` |
| **Values** | \`true\` / \`false\` |
| **Effect** | Forces the transport to treat the response as a SOAP fault. |

### TRANSPORT_HEADERS — Access/Remove All Transport Headers
| | |
|---|---|
| **Property** | \`TRANSPORT_HEADERS\` |
| **Scope** | \`axis2\` |
| **Type** | Map (java.util.Map) |
| **Effect** | Contains the full map of transport (HTTP) headers. Can be removed to strip all incoming headers before forwarding. |

\`\`\`xml
<!-- Remove all incoming transport headers before sending to backend -->
<property name="TRANSPORT_HEADERS" action="remove" scope="axis2"/>
\`\`\`
Use case: Prevent header leakage — strip all incoming headers (Authorization, cookies, etc.) before calling backend.

### ClientApiNonBlocking — Force Blocking/Non-Blocking Transport
| | |
|---|---|
| **Property** | \`ClientApiNonBlocking\` |
| **Scope** | \`axis2\` |
| **Values** | \`true\` / \`false\` |
| **Effect** | When false, forces the blocking transport sender. Needed for certain JMS, VFS, or local transport calls where the non-blocking (NIO) transport doesn't apply. |

\`\`\`xml
<!-- Force blocking transport for JMS send -->
<property name="ClientApiNonBlocking" value="false" scope="axis2"/>
\`\`\`

### SET_ROLLBACK_ONLY — Transaction Rollback
| | |
|---|---|
| **Property** | \`SET_ROLLBACK_ONLY\` |
| **Scope** | \`synapse\` |
| **Values** | \`true\` / \`false\` |
| **Effect** | Marks the current JMS transaction for rollback only. The message will not be acknowledged and will be redelivered according to the JMS broker's redelivery policy. |

### SET_REQUEUE_ON_ROLLBACK — Requeue on Rollback
| | |
|---|---|
| **Property** | \`SET_REQUEUE_ON_ROLLBACK\` |
| **Scope** | \`synapse\` |
| **Values** | \`true\` / \`false\` |
| **Effect** | When used with SET_ROLLBACK_ONLY, the message is requeued (sent back to the queue) instead of being dead-lettered. |

\`\`\`xml
<!-- Rollback JMS transaction and requeue message -->
<property name="SET_ROLLBACK_ONLY" value="true" scope="default"/>
<property name="SET_REQUEUE_ON_ROLLBACK" value="true" scope="default"/>
\`\`\``,

rest_properties: `## REST-Related Properties

### REST_URL_POSTFIX — URL Path Suffix
| | |
|---|---|
| **Property** | \`REST_URL_POSTFIX\` |
| **Scope** | \`axis2\` |
| **Type** | String |
| **Effect** | Appended to the endpoint URL. Contains path and query parameters. |

\`\`\`xml
<!-- Dynamically modify the backend URL path -->
<property name="REST_URL_POSTFIX" expression="\${'/users/' + vars.userId}" scope="axis2"/>

<!-- Remove URL postfix (send to base endpoint URL only) -->
<property name="REST_URL_POSTFIX" value="" scope="axis2"/>
\`\`\`

### REST_METHOD — HTTP Method (read-only)
| | |
|---|---|
| **Property** | \`REST_METHOD\` |
| **Scope** | \`synapse\` (read-only) |
| **Type** | String |
| **Effect** | Contains the HTTP method of the incoming request (GET, POST, PUT, DELETE, etc.). Read-only — set by the framework. |

\`\`\`xml
<!-- Read the incoming HTTP method -->
<variable name="method" type="STRING" expression="\${props.synapse.REST_METHOD}"/>
\`\`\`

### REST_FULL_REQUEST_PATH — Full Incoming Path
| | |
|---|---|
| **Property** | \`REST_FULL_REQUEST_PATH\` |
| **Scope** | \`synapse\` (read-only) |
| **Type** | String |
| **Effect** | Contains the full request path including context and resource. |

### REST_SUB_REQUEST_PATH — Sub-Resource Path
| | |
|---|---|
| **Property** | \`REST_SUB_REQUEST_PATH\` |
| **Scope** | \`synapse\` (read-only) |
| **Type** | String |
| **Effect** | Contains the sub-resource path portion (after the API context). |

### HTTP_METHOD — HTTP Method (Axis2)
| | |
|---|---|
| **Property** | \`HTTP_METHOD\` |
| **Scope** | \`axis2\` |
| **Type** | String |
| **Effect** | The HTTP method for the outgoing request. Can be set to override the method. |

\`\`\`xml
<!-- Change outgoing HTTP method to PATCH -->
<property name="HTTP_METHOD" value="PATCH" scope="axis2"/>
\`\`\`

### SERVICE_PREFIX — Service URL Prefix
| | |
|---|---|
| **Property** | \`SERVICE_PREFIX\` |
| **Scope** | \`axis2\` (read-only) |
| **Type** | String |
| **Effect** | The base URL prefix of the service. |`,

error_properties: `## Error Properties

These properties are set automatically when an error occurs. Read them in fault sequences to build error responses.

### ERROR_CODE
| | |
|---|---|
| **Property** | \`ERROR_CODE\` |
| **Scope** | \`synapse\` |
| **Type** | Integer |
| **Effect** | Error code for the last exception. Common codes listed below. |

### ERROR_MESSAGE
| | |
|---|---|
| **Property** | \`ERROR_MESSAGE\` |
| **Scope** | \`synapse\` |
| **Type** | String |
| **Effect** | Human-readable error message. |

### ERROR_DETAIL
| | |
|---|---|
| **Property** | \`ERROR_DETAIL\` |
| **Scope** | \`synapse\` |
| **Type** | String |
| **Effect** | Detailed error information / stack trace. |

### ERROR_EXCEPTION
| | |
|---|---|
| **Property** | \`ERROR_EXCEPTION\` |
| **Scope** | \`synapse\` |
| **Type** | Exception object |
| **Effect** | The Java exception object. Rarely used in expressions. |

### Reading Error Properties in Fault Sequence
\`\`\`xml
<faultSequence>
  <log category="ERROR">
    <message>Error: \${props.synapse.ERROR_MESSAGE} (code: \${props.synapse.ERROR_CODE})</message>
  </log>
  <payloadFactory media-type="json">
    <format>{
      "error": "\${props.synapse.ERROR_MESSAGE}",
      "code": \${props.synapse.ERROR_CODE}
    }</format>
  </payloadFactory>
  <property name="HTTP_SC" value="500" scope="axis2"/>
  <respond/>
</faultSequence>
\`\`\`

### Common Error Codes
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
| 101510 | Pending connections exceeded |`,

addressing: `## WS-Addressing Properties

### PRESERVE_WS_ADDRESSING
| | |
|---|---|
| **Property** | \`PRESERVE_WS_ADDRESSING\` |
| **Scope** | \`synapse\` |
| **Values** | \`true\` / \`false\` |
| **Effect** | Preserves existing WS-Addressing headers (MessageID, ReplyTo, etc.) from the incoming request in the outgoing request. Without this, Synapse generates new addressing headers. |

\`\`\`xml
<!-- Preserve original WS-Addressing headers for passthrough -->
<property name="PRESERVE_WS_ADDRESSING" value="true" scope="default"/>
\`\`\`

### disableAddressingForOutMessages — Disable WS-Addressing on Outgoing
| | |
|---|---|
| **Property** | \`disableAddressingForOutMessages\` |
| **Scope** | \`axis2\` |
| **Values** | \`true\` / \`false\` |
| **Effect** | Disables WS-Addressing headers (To, From, Action, MessageID, ReplyTo, etc.) on outgoing messages. Use when the backend doesn't understand WS-Addressing. |

\`\`\`xml
<!-- Strip all WS-Addressing headers from outgoing request -->
<property name="disableAddressingForOutMessages" value="true" scope="axis2"/>
\`\`\`

### Axis2 WS-Addressing Properties (read-only)
These are set by the framework and can be read from axis2 scope:
| Property | Contains |
|----------|---------|
| \`To\` | WS-Addressing To header |
| \`From\` | WS-Addressing From header |
| \`WSAction\` | WS-Addressing Action header |
| \`SOAPAction\` | SOAP Action header |
| \`ReplyTo\` | WS-Addressing ReplyTo header |
| \`FaultTo\` | WS-Addressing FaultTo header — where fault responses should be sent |
| \`RelatesTo\` | WS-Addressing RelatesTo header — correlates response to request MessageID |
| \`MessageID\` | WS-Addressing MessageID |`,

common_patterns: `## Common Property Patterns

### Return Custom HTTP Status Code
\`\`\`xml
<property name="HTTP_SC" value="404" scope="axis2"/>
<payloadFactory media-type="json">
  <format>{"error": "Resource not found"}</format>
</payloadFactory>
<respond/>
\`\`\`

### Accept Request and Process Asynchronously
\`\`\`xml
<property name="FORCE_SC_ACCEPTED" value="true" scope="axis2"/>
<!-- Processing continues after 202 is sent to client -->
<call>
  <endpoint key="SlowBackendEP"/>
</call>
\`\`\`

### Return 204 No Content
\`\`\`xml
<property name="HTTP_SC" value="204" scope="axis2"/>
<property name="NO_ENTITY_BODY" value="true" scope="axis2" type="BOOLEAN"/>
<respond/>
\`\`\`

### Change Outgoing Content Type to JSON
\`\`\`xml
<property name="messageType" value="application/json" scope="axis2"/>
<property name="ContentType" value="application/json" scope="axis2"/>
\`\`\`

### Disable Chunking for Backend That Requires Content-Length
\`\`\`xml
<property name="DISABLE_CHUNKING" value="true" scope="axis2"/>
\`\`\`

### Passthrough Content-Length Without Re-Calculation
\`\`\`xml
<property name="FORCE_HTTP_CONTENT_LENGTH" value="true" scope="axis2"/>
<property name="COPY_CONTENT_LENGTH_FROM_INCOMING" value="true" scope="axis2"/>
\`\`\`

### Dynamic Backend URL Modification
\`\`\`xml
<!-- Override the REST URL suffix sent to backend -->
<property name="REST_URL_POSTFIX" expression="\${'/api/v2/users/' + vars.userId + '?fields=name,email'}" scope="axis2"/>
\`\`\`

### Fire-and-Forget (One-Way Message)
\`\`\`xml
<property name="OUT_ONLY" value="true" scope="default"/>
<send>
  <endpoint key="EventSinkEP"/>
</send>
\`\`\`

### System Information Properties
These read-only synapse properties provide server/runtime information:
| Property | Scope | Contains |
|----------|-------|----------|
| \`SYSTEM_DATE\` | \`synapse\` | Current server date in \`yyyy-MM-dd'T'HH:mm:ss.SSSXXX\` format |
| \`SYSTEM_TIME\` | \`synapse\` | Current server time in milliseconds (epoch) |
| \`SERVER_IP\` | \`synapse\` | IP address of the MI server host |

\`\`\`xml
<!-- Add timestamp to outgoing message -->
<variable name="requestTime" type="STRING" expression="\${props.synapse.SYSTEM_DATE}"/>

<!-- Log server IP for debugging multi-node deployments -->
<log><message>Processed by server: \${props.synapse.SERVER_IP}</message></log>
\`\`\`

### Read Backend Response Status in Fault Sequence
\`\`\`xml
<faultSequence>
  <variable name="backendStatus" type="STRING" expression="\${props.axis2.HTTP_SC}"/>
  <filter xpath="\${props.axis2.HTTP_SC == 503}">
    <then>
      <payloadFactory media-type="json">
        <format>{"error": "Service temporarily unavailable"}</format>
      </payloadFactory>
      <property name="HTTP_SC" value="503" scope="axis2"/>
    </then>
    <else>
      <payloadFactory media-type="json">
        <format>{"error": "\${props.synapse.ERROR_MESSAGE}"}</format>
      </payloadFactory>
      <property name="HTTP_SC" value="500" scope="axis2"/>
    </else>
  </filter>
  <respond/>
</faultSequence>
\`\`\``,

};
  
  export const SYNAPSE_PROPERTY_REFERENCE_FULL = Object.values(SYNAPSE_PROPERTY_REFERENCE_SECTIONS).join('\n\n---\n\n');
  