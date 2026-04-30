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
 * Synapse Artifact Reference (APIs, Proxies, Inbound Endpoints, Tasks, Local Entries).
 * Focuses on attribute names and wiring conventions — not tutorial material.
 *
 * Section-based exports for granular context loading.
 */

export const SYNAPSE_ARTIFACT_REFERENCE_SECTIONS: Record<string, string> = {

api_resource: `## REST API (\`<api>\`) and \`<resource>\`

### \`<api>\` attributes
| Attribute | Notes |
|-----------|-------|
| \`name\` (required) | Unique API name |
| \`context\` (required) | Base path — must start with \`/\` |
| \`hostname\`, \`port\` | Optional inbound binding filter |
| \`version\`, \`version-type\` | \`version-type\` ∈ \`url\` \\| \`context\` \\| \`header\`. Combined with \`version\` to route \`/ctx/v1/...\` (\`url\`/\`context\`) or a version header (\`header\`) |
| \`publishSwagger\` | Registry key or file path to a Swagger/OpenAPI doc exposed at \`/services/<api>?swagger.json\` |
| \`trace\`, \`statistics\` | \`enable\` \\| \`disable\` |

Children: one or more \`<resource>\` elements + optional \`<handlers>\`.

### \`<resource>\` attributes
| Attribute | Notes |
|-----------|-------|
| \`methods\` | Space-separated HTTP methods (\`GET POST PUT DELETE OPTIONS ...\`) |
| \`uri-template\` | RFC-6570 template with \`{var}\` path segments. Extract via \`\${params.pathParams.var}\` (v2) or \`\${props.synapse['uri.var.var']}\` / \`get-property('uri.var.var')\` (v1) |
| \`url-mapping\` | Legacy exact-match routing (e.g. \`/users/*\`). Mutually exclusive with \`uri-template\` |
| \`protocol\` | \`http\` \\| \`https\` |
| \`inSequence\`, \`outSequence\`, \`faultSequence\` | Named-sequence references; OR use inline \`<inSequence>\`, \`<outSequence>\`, \`<faultSequence>\` child elements |

### Critical Rule — every \`<resource>\` must declare \`uri-template\` or \`url-mapping\`
A bare \`<resource methods="POST">\` is invalid; the validator rejects it. Every resource must include exactly one routing attribute (mutually exclusive):
\`\`\`xml
<resource methods="POST" uri-template="/"/>           <!-- catches the root path -->
<resource methods="POST" url-mapping="/process"/>     <!-- legacy exact-match -->
\`\`\`

### Working example
\`\`\`xml
<api xmlns="http://ws.apache.org/ns/synapse" name="OrdersAPI"
     context="/orders" version="v1" version-type="url">
  <resource methods="GET" uri-template="/{id}" faultSequence="OrdersFault">
    <inSequence>
      <variable name="orderId" type="STRING" expression="\${params.pathParams.id}"/>
      <!-- ... -->
      <respond/>
    </inSequence>
  </resource>
  <resource methods="POST" uri-template="/">
    <inSequence>
      <!-- payload already in \${payload} -->
      <respond/>
    </inSequence>
  </resource>
  <handlers>
    <handler class="org.wso2.carbon.mediation.cors.handler.CORSRequestHandler">
      <property name="AllowedOrigins" value="*"/>
      <property name="AllowedHeaders" value="Authorization,Content-Type"/>
      <property name="AllowedMethods" value="GET,POST,OPTIONS"/>
    </handler>
  </handlers>
</api>
\`\`\`

### Query-parameter extraction
\`/orders?status=OPEN&limit=10\`:
- v2: \`\${params.queryParams.status}\`, \`\${params.queryParams.limit}\`
- v1: \`get-property('query.param.status')\`, \`\$ctx:query.param.limit\`

### Dispatch rules (order of matching)
1. Exact \`url-mapping\` match
2. \`uri-template\` match (most specific first)
3. Method list must include the request method, else 405

### Path layout
APIs live at \`src/main/wso2mi/artifacts/apis/<Name>.xml\`. One API per file. \`artifact.xml\` entry uses \`type="synapse/api"\`.`,

proxy_service: `## Proxy Service (\`<proxy>\`) — Legacy but Common in Existing Projects

Prefer \`<api>\` for new work. Proxies are SOAP-oriented wrappers that still appear in many production projects.

### Attributes
| Attribute | Notes |
|-----------|-------|
| \`name\` (required) | Exposes service at \`/services/<name>\` |
| \`transports\` | Space-separated: \`http https jms local\`. Default: all configured transports |
| \`startOnLoad\` | \`true\` (default) / \`false\` |
| \`trace\`, \`statistics\` | \`enable\` \\| \`disable\` |

### Children
- \`<target>\` — mediation logic. Contains one of:
  - \`<inSequence>\`/\`<outSequence>\`/\`<faultSequence>\` (inline) OR
  - \`inSequence="..."\` / \`outSequence="..."\` / \`faultSequence="..."\` attributes
  - \`<endpoint>\` (inline) OR \`endpoint="..."\` attribute
- \`<publishWSDL>\` — \`uri="..."\` or \`key="gov:/..."\` or inline \`<wsdl:definitions>\`
- \`<parameter name="...">value</parameter>\` — transport-specific (\`transport.jms.ContentType\`, etc.)
- \`<policy key="..."/>\` — WS-Security / QoS policies

### Working example
\`\`\`xml
<proxy xmlns="http://ws.apache.org/ns/synapse" name="StockQuoteProxy"
       transports="http https" startOnLoad="true">
  <target>
    <inSequence>
      <log level="full"/>
      <send>
        <endpoint>
          <address uri="http://backend.example.com/stockquote"/>
        </endpoint>
      </send>
    </inSequence>
    <outSequence>
      <send/>
    </outSequence>
    <faultSequence>
      <log level="custom" category="ERROR">
        <property name="ERROR" expression="\${props.synapse.ERROR_MESSAGE}"/>
      </log>
    </faultSequence>
  </target>
  <publishWSDL uri="file:resources/wsdl/stock.wsdl"/>
</proxy>
\`\`\`

### Proxy-only mediators
\`<loopback/>\` works in proxies (transitions \`inSequence\` → \`outSequence\`). It is a no-op inside an API \`<resource>\`.

### Path layout
\`src/main/wso2mi/artifacts/proxy-services/<Name>.xml\`, \`artifact.xml\` type \`synapse/proxy-service\`.`,

inbound_endpoint: `## Inbound Endpoint (\`<inboundEndpoint>\`)

Message-driven entry point (JMS/File/Kafka/MQTT/RabbitMQ/HTTP listener/custom). Reads messages from a source and injects them into a sequence.

### Attributes
| Attribute | Notes |
|-----------|-------|
| \`name\` (required) | Unique |
| \`protocol\` | One of: \`http\`, \`https\`, \`jms\`, \`file\`, \`mqtt\`, \`wss\`, \`cxf_ws_rm\`, \`kafka\`, \`rabbitmq\`. Mutually exclusive with \`class\` |
| \`class\` | FQCN of custom inbound processor (for protocols not in the list above) |
| \`sequence\` (required) | Named sequence to inject messages into |
| \`onError\` (required) | Named fault sequence (NOT \`faultSequence\`) |
| \`suspend\` | \`true\` \\| \`false\` (default). If \`true\`, the endpoint is deployed but does not start polling/listening |
| \`coordination\` | \`true\` \\| \`false\` (default \`true\` for most protocols). When \`true\` in a clustered deployment, only ONE node actively polls/consumes — prevents duplicate processing. Set \`false\` for listener-type inbounds where every node must bind (e.g. custom HTTP listeners) |

Children: \`<parameters><parameter name="...">value</parameter></parameters>\`

### HTTP inbound (custom listener, distinct from API/proxy)
\`\`\`xml
<inboundEndpoint xmlns="http://ws.apache.org/ns/synapse"
                 name="HttpInEP" protocol="http"
                 sequence="HttpInSeq" onError="HttpFaultSeq" suspend="false">
  <parameters>
    <parameter name="inbound.http.port">8085</parameter>
    <parameter name="inbound.worker.pool.size.core">400</parameter>
    <parameter name="inbound.worker.pool.size.max">500</parameter>
    <parameter name="dispatch.filter.pattern">/.*</parameter>
  </parameters>
</inboundEndpoint>
\`\`\`

### JMS inbound
\`\`\`xml
<inboundEndpoint name="JmsInEP" protocol="jms"
                 sequence="JmsInSeq" onError="JmsFaultSeq"
                 suspend="false" coordination="true">
  <parameters>
    <parameter name="interval">1000</parameter>
    <parameter name="sequential">true</parameter>
    <parameter name="coordination">true</parameter>
    <parameter name="transport.jms.ConnectionFactoryJNDIName">QueueConnectionFactory</parameter>
    <parameter name="java.naming.factory.initial">org.apache.activemq.jndi.ActiveMQInitialContextFactory</parameter>
    <parameter name="java.naming.provider.url">tcp://localhost:61616</parameter>
    <parameter name="transport.jms.ConnectionFactoryType">queue</parameter>
    <parameter name="transport.jms.Destination">OrdersQueue</parameter>
    <parameter name="transport.jms.SessionAcknowledgement">AUTO_ACKNOWLEDGE</parameter>
    <parameter name="transport.jms.ContentType">application/json</parameter>
    <parameter name="transport.jms.CacheLevel">1</parameter>
  </parameters>
</inboundEndpoint>
\`\`\`

### File (VFS) inbound
\`\`\`xml
<inboundEndpoint name="FileInEP" protocol="file"
                 sequence="FileInSeq" onError="FileFaultSeq"
                 suspend="false" coordination="true">
  <parameters>
    <parameter name="interval">5000</parameter>
    <parameter name="sequential">true</parameter>
    <parameter name="transport.vfs.FileURI">file:///var/spool/in</parameter>
    <parameter name="transport.vfs.ContentType">application/xml</parameter>
    <parameter name="transport.vfs.FileNamePattern">.*\\.xml</parameter>
    <parameter name="transport.vfs.ActionAfterProcess">MOVE</parameter>
    <parameter name="transport.vfs.MoveAfterProcess">file:///var/spool/processed</parameter>
    <parameter name="transport.vfs.ActionAfterFailure">MOVE</parameter>
    <parameter name="transport.vfs.MoveAfterFailure">file:///var/spool/error</parameter>
    <parameter name="transport.vfs.Locking">enable</parameter>
  </parameters>
</inboundEndpoint>
\`\`\`

### Key pitfalls
- The fault-handler attribute is \`onError\`, **not** \`faultSequence\` (as on APIs/proxies).
- \`coordination="true"\` is NOT a guarantee on its own — the underlying protocol must support singleton consumption (JMS single consumer, file lock, etc.).
- Inbound sequences see a payload **without** the HTTP request-line properties (\`SYNAPSE_REST_API\`, \`REST_URL_POSTFIX\`, etc.) that API resources have. Don't rely on them.
- Changing parameters requires a redeploy (the inbound is re-initialized).

### Path layout
\`src/main/wso2mi/artifacts/inbound-endpoints/<Name>.xml\`, \`artifact.xml\` type \`synapse/inbound-endpoint\`.`,

scheduled_task: `## Scheduled Task (\`<task>\`)

Triggers a sequence/proxy on a schedule. Default implementation: \`MessageInjector\`.

### XML shape
\`\`\`xml
<task xmlns="http://ws.apache.org/ns/synapse"
      name="PollOrders"
      class="org.apache.synapse.startup.tasks.MessageInjector"
      group="synapse.simple.quartz"
      pinnedServers="">
  <!-- Either simple trigger ... (count="-1" means "run forever"; omit for one-shot) -->
  <trigger interval="30" count="-1"/>
  <!-- ... or cron trigger -->
  <!-- <trigger cron="0 0/5 * * * ?"/> -->

  <property name="injectTo" value="sequence"/>
  <property name="sequenceName" value="PollOrdersSeq"/>
  <property name="format" value="soap11"/>
  <property name="message">
    <payload xmlns="">
      <trigger>scheduled</trigger>
    </payload>
  </property>
</task>
\`\`\`

### Task attributes
| Attribute | Notes |
|-----------|-------|
| \`name\` (required) | Unique task name |
| \`class\` (required) | Usually \`org.apache.synapse.startup.tasks.MessageInjector\` |
| \`group\` | Quartz group; default \`synapse.simple.quartz\` |
| \`pinnedServers\` | Comma-separated server names if task should run only on specific nodes (clustered deployments) |

### Trigger forms
- Simple: \`<trigger interval="<seconds>" [count="N"]/>\` — \`count=-1\` means infinite. Default count is -1 when omitted with non-zero interval.
- Cron: \`<trigger cron="<quartz cron expression>"/>\` — Quartz 7-field syntax (\`sec min hour dom mon dow [year]\`).

### MessageInjector properties
| Property | Values | Purpose |
|----------|--------|---------|
| \`injectTo\` | \`sequence\` \\| \`proxy\` \\| \`main\` | Injection target |
| \`sequenceName\` | sequence name | Required when \`injectTo=sequence\` |
| \`proxyName\` | proxy name | Required when \`injectTo=proxy\` |
| \`format\` | \`soap11\` \\| \`soap12\` \\| \`pox\` \\| \`get\` | Message format sent to target |
| \`message\` | inline XML | The payload to inject. Use \`<payload xmlns=""><...></payload>\` wrapper |
| \`to\` | URL | For direct endpoint injection: sends to this address |
| \`soapAction\` | string | Optional SOAP action header |

### Pitfalls
- Cron seconds field is required (Quartz cron has 6+ fields, not the 5-field Unix cron).
- \`pinnedServers=""\` (empty) runs on all nodes; \`pinnedServers\` with a value restricts to those nodes — common source of "task not running" bugs in clusters.
- The injected message inherits no HTTP request context; the target sequence sees an empty headers map.

### Path layout
\`src/main/wso2mi/artifacts/tasks/<Name>.xml\`, \`artifact.xml\` type \`synapse/task\`.`,

local_entry: `## Local Entry (\`<localEntry>\`) — Inline Config & Connection Bindings

Local entries are named static artifacts referenced by Synapse configs. Three forms:

### 1. Inline value (string/XML)
\`\`\`xml
<localEntry key="greeting">Hello, world!</localEntry>

<localEntry key="errorSchema">
  <schema xmlns="http://json-schema.org/draft-07/schema#">
    <type>object</type>
  </schema>
</localEntry>
\`\`\`
Access: \`get-property('greeting')\` or \`\${props.synapse.greeting}\` returns the string/XML.

### 2. URI-referenced resource
\`\`\`xml
<localEntry key="orderSchema" src="file:resources/json/order-schema.json"/>
<localEntry key="transformXslt" src="file:resources/xslt/order-transform.xslt"/>
<localEntry key="wsdlPolicy" src="gov:/mi-resources/policies/security-policy.xml"/>
\`\`\`

### 3. Connection configuration (init-operation form)
Most connectors (\`http\`, \`salesforce\`, \`db\`, \`kafka\`, \`jms\` etc.) expose an \`<xxx.init>\` element that defines a reusable connection. The init element IS the content of the local entry; the mediator then references it via \`configKey="..."\`.

\`\`\`xml
<localEntry key="myHttpConnection">
  <http.init>
    <baseUrl>https://api.example.com</baseUrl>
    <authType>None</authType>
    <timeoutDuration>5000</timeoutDuration>
    <timeoutAction>Fault</timeoutAction>
  </http.init>
</localEntry>

<!-- Referenced from a mediator -->
<http.get configKey="myHttpConnection">
  <relativePath>/v1/ping</relativePath>
</http.get>
\`\`\`

### Path layout
\`src/main/wso2mi/artifacts/local-entries/<key>.xml\`. \`artifact.xml\` type \`synapse/local-entry\`.

### Pitfalls
- Connection local entries cannot contain two init elements — one connection per local entry key.
- The local-entry \`key\` is the identifier used by \`configKey=\`; the filename is not.
- Dynamic values inside a connection init (e.g. reading \`\${vars.x}\`) are resolved at **init time** — they effectively freeze at deploy. For per-request credentials, use connector-call parameters instead of init fields. Exception: the HTTP connector evaluates \`\${vars.*}\` / secure-vault aliases at call time for specific fields (see http-connector-guide:connection_config).`,

};

export const SYNAPSE_ARTIFACT_REFERENCE_FULL =
    `# WSO2 MI Synapse Artifact Reference\n\n` +
    Object.values(SYNAPSE_ARTIFACT_REFERENCE_SECTIONS).join('\n\n---\n\n');
