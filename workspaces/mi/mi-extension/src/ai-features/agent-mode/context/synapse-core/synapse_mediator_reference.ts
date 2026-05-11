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
 * Deep Mediator Reference for WSO2 Synapse
 * Full attribute specifications, semantic behavior, and validated patterns.
 * Extracted from mediator factory and implementation classes.
 *
 * Section-based exports for granular context loading.
 */

export const SYNAPSE_MEDIATOR_REFERENCE_SECTIONS: Record<string, string> = {

enrich: `## Enrich Mediator — Deep Reference

Copies content from a source to a target within the message context.

### XML Schema
\`\`\`xml
<enrich>
  <source [clone="true|false"] [type="custom|body|envelope|property|inline|variable"]
          [xpath="expression"] [property="name"] [key="registryKey"]>
    [inline XML or text]
  </source>
  <target [action="replace|child|sibling|remove"]
          [type="custom|body|envelope|property|variable|key"]
          [xpath="expression"] [property="name"]/>
</enrich>
\`\`\`

### Source Types
| Type | Required Attrs | Behavior |
|------|---------------|----------|
| \`custom\` (default) | \`xpath\` | Evaluates XPath/JSONPath against current message |
| \`body\` | none | Returns first child element of SOAP body |
| \`envelope\` | none | Returns entire SOAP envelope |
| \`property\` | \`property\` | Reads from a Synapse property (supports OMElement, String, ArrayList, JsonElement) |
| \`inline\` | child XML/text or \`key\` | Uses inline content. If child root is \`Envelope\`, parsed as SOAPEnvelope |
| \`variable\` | -- | Reads from a Synapse variable |

### Target Types
| Type | Required Attrs | Behavior |
|------|---------------|----------|
| \`custom\` (default) | \`xpath\` | Writes to the XPath/JSONPath match location |
| \`body\` | none | Replaces SOAP body content |
| \`envelope\` | none | Replaces entire SOAP envelope (action must be \`replace\`) |
| \`property\` | \`property\` | Sets a Synapse property |
| \`variable\` | -- | Sets a Synapse variable (action must be \`replace\`) |
| \`key\` | \`xpath\` | Renames a JSON key (action must be \`replace\`, xpath must be JSONPath) |

**Target type \`inline\` is explicitly rejected** — will throw an exception.

### Actions
| Action | Behavior | JSON Notes |
|--------|----------|-----------|
| \`replace\` (default) | Replaces target with source | JSON body: only objects/arrays accepted (no primitives) |
| \`child\` | Adds source as child of target | JSON: target must be array (or object for merge) |
| \`sibling\` | Adds source as sibling after target | **Not supported for JSON custom target** |
| \`remove\` | Removes source-matching elements from target | Only works with JSON paths currently |

### Clone Attribute
- Default: \`true\` — source is copied, original untouched
- \`false\` — for JSON custom source, the source element is **deleted** from the payload after extraction

### Invalid Combinations (throw SynapseException)
| Source | Target | Why |
|--------|--------|-----|
| envelope | custom, envelope, body | Invalid combination |
| body | envelope, body | Invalid combination |
| custom | envelope | Invalid combination |
| any | inline | Inline not supported for target |
| non-custom | (with action=remove) | Remove requires source type=custom |
| body | key | Invalid combination |
| \`custom\` xpath=\`$\` or \`$.\` | (with action=replace) | Use type=body action=replace instead |

### Common Patterns
\`\`\`xml
<!-- Add child element to JSON array in payload -->
<enrich>
  <source type="inline" clone="true">{"newItem": "value"}</source>
  <target type="custom" action="child" xpath="$.items"/>
</enrich>

<!-- Replace body with variable content -->
<enrich>
  <source type="variable">myResponse</source>
  <target type="body"/>
</enrich>

<!-- Extract field to property -->
<enrich>
  <source type="custom" xpath="\${payload.user.id}"/>
  <target type="property" property="userId"/>
</enrich>

<!-- Remove a field from JSON payload -->
<enrich>
  <source type="custom" xpath="$.unwantedField"/>
  <target type="body" action="remove"/>
</enrich>
\`\`\`
`,

call: `## Call Mediator — Deep Reference

Invokes an endpoint and (in non-blocking mode) waits for the response before continuing mediation.

### XML Schema
\`\`\`xml
<call [blocking="true|false"] [initAxis2ClientOptions="true|false"]>
  [<endpoint>...</endpoint> | <endpoint key="name"/>]
  [<source type="custom|body|property|inline" contentType="mime/type">expression</source>]
  [<target type="body|property|variable">name</target>]
</call>
\`\`\`

### Attributes
| Attribute | Default | Notes |
|-----------|---------|-------|
| \`blocking\` | \`false\` | \`true\` = synchronous call in same thread. \`false\` = async continuation-based |
| \`initAxis2ClientOptions\` | \`true\` | Only for blocking mode. Controls transport option initialization |

### Source Element (optional)
Controls what payload is sent to the endpoint.

| Attribute | Values | Notes |
|-----------|--------|-------|
| \`type\` | \`custom\`, \`body\`, \`property\`, \`inline\` | Default: \`custom\` |
| \`contentType\` | MIME type string | Sets outbound content type |

- \`custom\`: text content = XPath/JSONPath expression
- \`property\`: text content = property name
- \`inline\`: child XML or text
- \`body\`: uses current body (no transformation)
- Clone is always \`false\` for call source

### Target Element (optional)
Controls where the response is stored. When no target is configured, the response replaces the current message body.

| Attribute | Values | Notes |
|-----------|--------|-------|
| \`type\` | \`body\`, \`property\`, \`variable\` | Default: \`body\` |

- \`body\`: response replaces current body (default)
- \`property\`: text content = property name
- \`variable\`: text content = variable name
- Action is always \`replace\`

### Source + Target Interaction
When both source and target are specified:
1. **Pre-send:** Original body saved to \`_INTERMEDIATE_ORIGINAL_BODY\`. Source content enriched into body.
2. **Send:** Modified body sent to endpoint.
3. **Post-send:** Response enriched into target. Original body restored.

This allows calling a backend with a transformed payload while preserving the original body.

### Blocking vs Non-Blocking
| Mode | Behavior | Returns |
|------|----------|---------|
| Non-blocking (default) | Async. Pushes to continuation stack. Response triggers next mediator. | \`false\` (halts flow until response) |
| Blocking | Synchronous. Same thread waits for response. | \`true\` (continues immediately with response in context) |

### Example: Call with Response in Variable
\`\`\`xml
<call>
  <endpoint key="BackendEP"/>
  <source type="custom" contentType="application/json">\${vars.requestPayload}</source>
  <target type="variable">backendResponse</target>
</call>
<!-- Original body preserved, response in vars.backendResponse -->
\`\`\`
`,

send: `## Send Mediator

Legacy pattern for sending messages to endpoints. **Prefer \`call\` mediator for most use cases.**

### XML Schema
\`\`\`xml
<send [receive="sequenceNameOrExpression"] [buildmessage="true"]>
  [<endpoint>...</endpoint>]
</send>
\`\`\`

### Attributes
| Attribute | Default | Notes |
|-----------|---------|-------|
| \`receive\` | none | Sequence for handling response. Supports dynamic key: \`receive="{xpath}"\` |
| \`buildmessage\` | \`false\` | Forces message building before send |

### Key Differences from Call
- Does NOT wait for response in the same flow
- Response (if any) is routed to the \`receive\` sequence
- No source/target manipulation
- Use \`send\` for fire-and-forget or when response handling must be in a separate sequence
`,

header: `## Header Mediator — Deep Reference

Sets or removes HTTP transport headers or SOAP headers.

### XML Schemas

**Set/remove by name:**
\`\`\`xml
<!-- Transport (HTTP) header -->
<header name="Content-Type" value="application/json" scope="transport"/>

<!-- SOAP header with namespace -->
<header name="ns:CustomHeader" value="value" scope="default"
        xmlns:ns="http://example.com/ns"/>

<!-- Remove a header -->
<header name="Authorization" action="remove" scope="transport"/>

<!-- Expression-based value -->
<header name="X-Correlation-ID" expression="\${vars.correlationId}" scope="transport"/>

<!-- Value parsed as XML (type="OM") — store XML in a property, then reference it -->
<property name="complexHeaderXml" scope="default" type="OM">
  <data xmlns="">value</data>
</property>
<header name="ns:ComplexHeader" expression="\${get-property('complexHeaderXml')}" scope="default"
        xmlns:ns="http://example.com/ns"/>
\`\`\`

**Inline XML SOAP headers (name omitted):**
\`\`\`xml
<header>
  <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/...">
    <wsse:UsernameToken>...</wsse:UsernameToken>
  </wsse:Security>
</header>
\`\`\`

### Attributes
| Attribute | Required | Default | Notes |
|-----------|----------|---------|-------|
| \`name\` | Conditional | -- | Required unless using inline XML headers |
| \`value\` | Conditional | -- | Literal value. Mutually exclusive with \`expression\` |
| \`expression\` | Conditional | -- | XPath/JSONPath/Synapse expression |
| \`action\` | No | set | Only \`remove\` is explicit. Absence = set |
| \`scope\` | No | \`default\` (SOAP) | \`transport\` for HTTP headers, \`default\` for SOAP headers |
| \`type\` | No | null | \`OM\` to parse value as XML child element |

### Scope Rules
**scope="transport" (HTTP headers):**
- Name is used as-is (no namespace required)
- Stored in Axis2 \`TRANSPORT_HEADERS\` map
- Creates case-insensitive TreeMap if no headers exist

**scope="default" (SOAP headers):**
- If name has a namespace prefix (\`prefix:localpart\`), prefix is resolved to namespace URI
- If name has NO prefix, it MUST be a well-known WS-Addressing header:
  \`To\`, \`From\`, \`Action\`, \`FaultTo\`, \`ReplyTo\`, \`RelatesTo\`
- Any other unprefixed name throws: "All SOAP headers must be namespace qualified."

### Well-Known WSA Header Behaviors
| Header | Set Action | Remove Action |
|--------|-----------|---------------|
| \`To\` | \`synCtx.setTo(new EndpointReference(value))\` | Sets to null |
| \`From\` | \`synCtx.setFrom(new EndpointReference(value))\` | Sets to null |
| \`Action\` | \`synCtx.setWSAAction(value)\` | Sets to null |
| \`FaultTo\` | \`synCtx.setFaultTo(new EndpointReference(value))\` | Sets to null |
| \`ReplyTo\` | \`synCtx.setReplyTo(new EndpointReference(value))\` | Sets to null |
| \`RelatesTo\` | Sets RelatesTo array | Sets to null |

### Common Patterns
\`\`\`xml
<!-- Set SOAPAction for SOAP 1.1 call -->
<header name="Action" value="urn:getCustomer" scope="default"/>

<!-- Set HTTP Authorization -->
<header name="Authorization" expression="\${'Bearer ' + vars.token}" scope="transport"/>

<!-- Remove Content-Type before transformation -->
<header name="Content-Type" action="remove" scope="transport"/>
\`\`\`
`,

'payload-factory': `## PayloadFactory Mediator — Deep Reference

Constructs a new message payload using a template with embedded expressions.

### XML Schema
\`\`\`xml
<payloadFactory [media-type="xml|json|text"] [template-type="DEFAULT|FREEMARKER"]>
  <format [key="registryKey"]>
    <!-- Template content with \${expression} placeholders -->
  </format>
</payloadFactory>
\`\`\`

### Attributes
| Attribute | Default | Values | Notes |
|-----------|---------|--------|-------|
| \`media-type\` | \`xml\` | \`xml\`, \`json\`, \`text\` | Determines output format and content-type |
| \`template-type\` | \`DEFAULT\` | \`DEFAULT\`, \`FREEMARKER\` | DEFAULT = inline Synapse expressions. FREEMARKER = Apache FreeMarker |

### Media-Type Behavior
| Type | Content-Type Set | Behavior |
|------|-----------------|----------|
| \`json\` | \`application/json\` | Creates new JSON payload |
| \`xml\` | \`application/xml\` (unless already \`text/xml\` or \`application/soap+xml\`) | Parses as XML, adds as SOAP body child. Detects full SOAP envelopes |
| \`text\` | \`text/plain\` | Wraps in \`<text xmlns="http://ws.apache.org/commons/ns/payload">\` element |

### SOAP Envelope Detection
When \`media-type="xml"\` and the generated XML's root element is \`Envelope\` with a SOAP 1.1 or 1.2 namespace, the **entire message envelope is replaced** instead of just the body. This enables constructing full SOAP envelopes in payloadFactory.

### Format Source
- **Inline:** Template content directly in \`<format>\` element
- **Registry:** \`<format key="conf:/templates/myTemplate.xml"/>\` loads from registry at runtime. Supports dynamic keys.

### NEVER Use \`<args>\` with Synapse Expressions
The deprecated \`<args>\` element only accepts XPath, NOT Synapse expressions. Always embed \`\${...}\` directly in \`<format>\`:

\`\`\`xml
<!-- WRONG — throws XPath parse error at runtime -->
<payloadFactory media-type="json">
  <format>{"name": "$1"}</format>
  <args><arg expression="\${payload.name}"/></args>
</payloadFactory>

<!-- CORRECT -->
<payloadFactory media-type="json">
  <format>{"name": "\${payload.name}"}</format>
</payloadFactory>
\`\`\`

### FreeMarker Templates
Use CDATA to wrap FreeMarker templates. Available variables in FreeMarker context:
- \`payload\` — current message payload
- \`ctx\` — Synapse (default scope) properties
- \`axis2\` — Axis2 scope properties
- \`trp\` — Transport scope properties
- \`vars\` — Variables

\`\`\`xml
<payloadFactory media-type="json" template-type="FREEMARKER">
  <format><![CDATA[{
    "name": "\${payload.customer_name}",
    "id": "\${vars.customer_id}",
    "host": "\${headers["Host"]}"
  }]]></format>
</payloadFactory>
\`\`\`

### JSON Quoting Rules in Default Templates
When \`media-type="json"\`:
- **Strings** must be quoted: \`"name": "\${payload.name}"\`
- **Numbers/booleans** must NOT be quoted: \`"count": \${payload.count}\`, \`"active": \${payload.active}\`
- **Null** must NOT be quoted: \`"value": \${exists(payload.x) ? payload.x : null}\`
- **Nested objects/arrays** must NOT be quoted: \`"items": \${payload.items}\`
`,

validate: `## Validate Mediator

Validates XML payloads against XSD schemas.

### XML Schema
\`\`\`xml
<validate [source="xpathExpression"]>
  <schema key="registryKeyToXSD"/>
  <resource location="externalSchemaURI" key="registryKey"/>
  <feature name="validationFeature" value="true|false"/>
  <on-fail>
    <!-- mediators to execute on validation failure -->
    <log category="ERROR"><message>Validation failed</message></log>
    <respond/>
  </on-fail>
</validate>
\`\`\`

### Attributes
| Attribute | Required | Default | Notes |
|-----------|----------|---------|-------|
| \`source\` | No | first child of SOAP body | XPath to the element to validate |

### Child Elements
| Element | Required | Notes |
|---------|----------|-------|
| \`<schema key="...">\` | YES (1+) | At least one schema required. Supports dynamic keys |
| \`<resource>\` | No | External schema for imports/includes. \`location\` = URI in schema, \`key\` = registry key |
| \`<feature>\` | No | XML validation features. Value must be exactly "true" or "false" |
| \`<on-fail>\` | YES | Must contain at least one mediator. Executes when validation fails |
`,

// NOTE: the old `for-each` section (with result-type / result-target / result-variable
// attributes) has been removed because it conflicts with the current `foreach` section
// below, which documents the verified attribute names (result-content-type /
// target-variable). See the `foreach` entry for the authoritative reference.

scatter_gather: `## Scatter-Gather Mediator

Sends the message to multiple sequences (in parallel or sequentially) and aggregates the results.

### XML Schema
\`\`\`xml
<scatter-gather parallel-execution="true|false"
                result-content-type="JSON|XML"
                target="body|variable" [target-variable="varName"]
                [result-enclosing-element="rootElement"]>
  <aggregation expression="jsonpath-or-xpath"
               [condition="expression"]
               [timeout="ms"]
               [min-messages="expr"] [max-messages="expr"]/>
  <sequence><!-- branch 1 --></sequence>
  <sequence><!-- branch 2 --></sequence>
</scatter-gather>
\`\`\`

### Required Attributes
| Attribute | Required | Values | Notes |
|-----------|----------|--------|-------|
| \`parallel-execution\` | No | \`true\`/\`false\` | Default: true |
| \`result-content-type\` | **YES** | \`JSON\`, \`XML\` | Aggregation output format |
| \`target\` | **YES** | \`body\`, \`variable\` | Where aggregated result is stored |
| \`target-variable\` | Conditional | variable name | Required when \`target="variable"\` |
| \`result-enclosing-element\` | Conditional | XML element name | Required when \`result-content-type="XML"\` |

### Aggregation Element (required)
| Attribute | Required | Notes |
|-----------|----------|-------|
| \`expression\` | **YES** | Expression to extract content from each response |
| \`condition\` | No | Correlation expression to match responses |
| \`timeout\` | No | Milliseconds before completion |
| \`min-messages\` | No | Minimum messages before completing (supports dynamic expression) |
| \`max-messages\` | No | Maximum messages to wait for (supports dynamic expression) |

### Rules
- At least one \`<sequence>\` element is required
- Each sequence becomes a separate execution branch
`,

db: `## Database Mediators (DBLookup / DBReport)

### DBLookup — Query database and store results as properties
\`\`\`xml
<dblookup>
  <connection>
    <pool>
      <driver>com.mysql.cj.jdbc.Driver</driver>
      <url>jdbc:mysql://localhost:3306/mydb</url>
      <user>admin</user>
      <password>secret</password>
      <!-- Optional pool properties -->
      <property name="maxactive" value="50"/>
      <property name="maxidle" value="10"/>
    </pool>
  </connection>
  <statement>
    <sql>SELECT name, email FROM users WHERE id = ?</sql>
    <parameter expression="\${payload.userId}" type="INTEGER"/>
    <result name="userName" column="name"/>
    <result name="userEmail" column="email"/>
  </statement>
</dblookup>
\`\`\`

### Connection Options
1. **JDBC Direct:** \`<driver>\`, \`<url>\`, \`<user>\`, \`<password>\`
2. **JNDI:** \`<dsName>\` (optionally with \`<icClass>\`, \`<url>\`, \`<user>\`, \`<password>\` for InitialContext)

All connection elements support registry key resolution via \`key\` attribute.

### Pool Properties
\`autocommit\`, \`isolation\`, \`initialsize\`, \`maxactive\`, \`maxidle\`, \`maxopenstatements\`, \`maxwait\`, \`minidle\`, \`poolstatements\`, \`testonborrow\`, \`testonreturn\`, \`testwhileidle\`, \`validationquery\`

### Statement Elements
| Element | Notes |
|---------|-------|
| \`<sql>\` | SQL with \`?\` placeholders |
| \`<parameter>\` | \`value="literal"\` or \`expression="xpath"\`. Optional \`type\` (INTEGER, VARCHAR, etc.) |
| \`<result>\` | \`name\` = property name, \`column\` = column name or number. Both required |

### DBReport — Execute DML (INSERT, UPDATE, DELETE)
Same structure as DBLookup but without \`<result>\` elements. Used for write operations.
`,

call_template: `## Call-Template Mediator

Invokes a sequence template with parameters.

### XML Schema
\`\`\`xml
<call-template target="templateName">
  <with-param name="paramName" value="literalValue"/>
  <with-param name="paramName" value="\${expression}"/>
</call-template>
\`\`\`

### Template Definition
\`\`\`xml
<template name="MyTemplate" xmlns="http://ws.apache.org/ns/synapse">
  <parameter isMandatory="true" name="firstName"/>
  <parameter isMandatory="false" name="lastName" defaultValue="Unknown"/>
  <sequence>
    <log><message>Hello \${params.functionParams.firstName} \${params.functionParams.lastName}</message></log>
  </sequence>
</template>
\`\`\`

### Parameter Access
Inside templates, parameters are accessed via \`\${params.functionParams.paramName}\`.
`,

script: `## Script Mediator — Deep Reference (GraalJS)

The Script mediator runs inline code against the message context. The **GraalVM JS** engine (\`language="js"\`) is the default and ships with the runtime; the Nashorn engine is not bundled. Groovy (\`language="groovy"\`) and Ruby (\`language="rb"\`) are also supported, but **only when their optional runtime jars are present** on the MI classpath — drop \`groovy-all-2.4.4.jar\` or \`jruby-complete-*.jar\` (both are OSGi bundles) into \`<MI_HOME>/dropins\` to enable them. Stick with \`language="js"\` unless there's a specific reason to pull in another runtime.

### MI 4.5+ class-access sandbox
GraalJS scripts run under a class-access policy. On MI 4.5+ access to \`java.lang\`, \`java.io\`, \`java.nio\`, and \`java.net\` is **blocked by default** — \`java.lang.Thread.sleep(ms)\`, \`java.lang.System.currentTimeMillis()\`, and similar calls will throw \`SynapseException\` unless the policy is adjusted via \`deployment.toml\`:

\`\`\`toml
[synapse_properties]
'limit_java_class_access_in_scripts.enable' = true
'limit_java_class_access_in_scripts.list_type' = "BLOCK_LIST"   # or "ALLOW_LIST"
'limit_java_class_access_in_scripts.class_prefixes' = "java.lang,java.io,java.nio,java.net"
\`\`\`

A parallel \`limit_java_native_object_access_in_scripts.*\` set of keys restricts native object/method access. Prefer mediator-level patterns (e.g. the Iterate mediator for delays between retries) and avoid direct Java calls from scripts unless the deployment has been configured to permit them.

### XML Schema
\`\`\`xml
<!-- Inline script -->
<script language="js"><![CDATA[
  // script body
]]></script>

<!-- External script from registry -->
<script language="js" key="gov:/mi-resources/scripts/validate.js" function="main"/>
\`\`\`

### \`mc\` (MessageContext) API — payload & variables
GraalJS exposes Synapse types as **proxy objects**, not as JSON strings. Do NOT round-trip through \`JSON.parse\`/\`JSON.stringify\` unless you explicitly need a plain JS value.

| Call | Returns | Correct Usage |
|------|---------|---------------|
| \`mc.getPayloadJSON()\` | GraalJS proxy wrapping the JSON payload | \`var obj = mc.getPayloadJSON(); var id = obj.id;\` |
| \`mc.setPayloadJSON(value)\` | — | Pass a **plain JS object**: \`mc.setPayloadJSON({ id: "x", status: "ok" })\` |
| \`mc.getPayloadXML()\` | XML element (OMElement) | \`var xml = mc.getPayloadXML(); /* DOM-like access */\` |
| \`mc.setPayloadXML(xml)\` | — | Pass an OMElement or XML literal |
| \`mc.getProperty(name)\` | Java object (String, Integer, etc.) | Call \`.toString()\` before \`JSON.parse\` |
| \`mc.setProperty(name, value)\` | — | Stored as Java String unless value is a supported type |
| \`mc.getVariable(name)\` | Java String/Integer/... or proxy object | \`JSON.parse(mc.getVariable("myJsonStr").toString())\` if stored as STRING |
| \`mc.setVariable(name, value)\` | — | Stores as Java String for primitives; to use as JSON later, caller must re-parse |
| \`mc.getEnvelope()\` / \`mc.setEnvelope(env)\` | SOAP envelope | — |

### Critical pitfalls
- **Do NOT** call \`JSON.parse(mc.getPayloadJSON())\` — the result is already a JS-accessible proxy, not a string.
- **Do NOT** call \`mc.setPayloadJSON(JSON.stringify(result))\` — pass the object directly.
- \`mc.getVariable(name)\` returns a **Java String/Integer/etc.** Call \`.toString()\` before \`JSON.parse()\` when the variable stored a JSON string.
- \`mc.setVariable(name, jsObj)\` stores primitives as **Java String**. To consume later as JSON, the downstream reader must \`JSON.parse\` the string (or use the variable mediator with \`type="JSON"\` and \`object(...)\`/\`array(...)\` — see the \`other\` section).
- GraalJS proxy objects (returned by \`getPayloadJSON\`, or by \`getVariable\` for a JSON-typed variable) may not serialize cleanly with \`JSON.stringify\`. If you hit proxy serialization issues, round-trip through a plain object first: \`JSON.parse(JSON.stringify(proxy))\`.
- \`responseVariable\` values produced by the HTTP connector are **Java \`LinkedHashMap\`** instances. From JS use \`.get("attributes")\`, \`.get("payload")\`, \`.get("headers")\` — dot notation does **not** work on Java maps.
- \`java.lang.Thread.sleep(ms)\` and other \`java.lang\` calls are **blocked by default on MI 4.5+** (see "MI 4.5+ class-access sandbox" above). Prefer mediator-level patterns; only call into Java if the deployment explicitly allows the package via \`deployment.toml\`.

### Validated patterns
\`\`\`xml
<!-- Read a field, mutate, write back as plain object -->
<script language="js"><![CDATA[
  var p = mc.getPayloadJSON();        // proxy
  p.total = (p.items || []).length;   // direct access
  mc.setPayloadJSON(p);                // pass object, not string
]]></script>

<!-- Parse a JSON string stored in a variable -->
<script language="js"><![CDATA[
  var raw = mc.getVariable("rawJsonStr");   // Java String
  var obj = JSON.parse(raw.toString());     // .toString() first
  mc.setProperty("ORDER_ID", obj.orderId);
]]></script>

<!-- Consume HTTP connector responseVariable (LinkedHashMap) -->
<script language="js"><![CDATA[
  var resp = mc.getVariable("userResp");          // Java LinkedHashMap
  var status = resp.get("attributes").get("statusCode");
  var body = resp.get("payload");                  // proxy for payload
  mc.setPayloadJSON({ status: status, user: body });
]]></script>
\`\`\`

### Anti-patterns (common failure modes)
\`\`\`xml
<!-- WRONG: getPayloadJSON is NOT a string -->
<script language="js"><![CDATA[
  var obj = JSON.parse(mc.getPayloadJSON());   // TypeError / garbled data
]]></script>

<!-- WRONG: setPayloadJSON expects an object, not a string -->
<script language="js"><![CDATA[
  mc.setPayloadJSON(JSON.stringify(result));   // payload becomes a quoted string
]]></script>

<!-- WRONG: dot access on Java LinkedHashMap -->
<script language="js"><![CDATA[
  var body = mc.getVariable("userResp").payload;  // undefined — use .get("payload")
]]></script>
\`\`\``,

foreach: `## ForEach Mediator (V2) — Deep Reference

ForEach V2 iterates over a JSON array or XML nodes. **Both the parallel and sequential modes clone the \`MessageContext\` per iteration** — iteration-local mutations do NOT propagate to the parent context or to other iterations.

### XML Schema
\`\`\`xml
<foreach
    collection="\${payload.items}"
    parallel-execution="false|true"
    [counter-variable="i"]
    update-original="true|false"
    [result-content-type="JSON|XML"]
    [target-variable="aggregatedVar"]>
  <sequence>
    <!-- mediators operating on each iteration's local payload -->
  </sequence>
</foreach>
\`\`\`

Sequential vs parallel execution is controlled entirely by \`parallel-execution\` (default \`true\` = parallel). Set \`parallel-execution="false"\` only when you need ordered iteration or \`counter-variable\` semantics. There is no separate \`sequential\` attribute; don't emit one.

### MessageContext isolation (critical)
- Variables set via \`<variable>\` mediator or \`mc.setVariable(...)\` **inside an iteration do NOT persist** to the next iteration (sequential) or to the parent context (parallel).
- Parent-scope variables are visible read-only from iterations (via the cloned context), but writes are discarded on iteration exit.
- The **only** supported way to surface iteration results to the parent context is the aggregation attributes (\`update-original="false"\` + \`target-variable=...\`).

### Aggregation (verified attribute names)
| Attribute | Purpose |
|-----------|---------|
| \`update-original="false"\` | Do NOT rewrite the original collection in-place; aggregate into a separate variable instead. |
| \`result-content-type="JSON"\` | Type of the aggregated result. (Use \`"XML"\` for XML payloads.) **Not** \`result-type\`. |
| \`target-variable="myVar"\` | Name of the variable on the **parent** context that receives the aggregated array. **Not** \`result-variable\` or \`variableName\`. |

Each iteration's **final payload** (the payload at the end of the iteration's sequence) is appended to the target variable as the next element.

### Parallel vs sequential constraints
- \`parallel-execution="true"\` disallows \`counter-variable\` — the counter only has a well-defined value in sequential mode.
- Parallel iterations run on separate threads against separate cloned contexts; shared in-memory JS objects across iterations are NOT safe.

### Validated patterns
\`\`\`xml
<!-- Aggregate transformed items back into a parent variable -->
<foreach collection="\${payload.orders}"
         parallel-execution="false"
         update-original="false"
         result-content-type="JSON"
         target-variable="enrichedOrders">
  <sequence>
    <!-- iteration-local payload is one order -->
    <payloadFactory media-type="json">
      <format>{"id": "\${payload.id}", "total": \${payload.qty * payload.price}}</format>
    </payloadFactory>
    <!-- this payload becomes one element of vars.enrichedOrders -->
  </sequence>
</foreach>

<!-- After the foreach -->
<log category="INFO">
  <message>Aggregated: \${vars.enrichedOrders}</message>
</log>
\`\`\`

### Anti-patterns
\`\`\`xml
<!-- WRONG: trying to accumulate via a variable inside the iteration -->
<foreach collection="\${payload.items}" parallel-execution="false" update-original="true">
  <sequence>
    <!-- set inside iteration — discarded on iteration exit -->
    <variable name="acc" type="JSON" expression="\${array(concat(vars.acc, payload))}"/>
  </sequence>
</foreach>
<!-- vars.acc is unchanged in the parent context -->

<!-- WRONG: counter-variable with parallel execution -->
<foreach collection="\${payload.items}" parallel-execution="true" counter-variable="i">
  <!-- runtime rejects this combination -->
</foreach>

<!-- WRONG: misnamed aggregation attributes -->
<foreach collection="\${payload.items}"
         update-original="false"
         result-type="JSON"          <!-- should be result-content-type -->
         result-variable="out">       <!-- should be target-variable -->
  <sequence>...</sequence>
</foreach>
\`\`\``,

cache: `## Cache Mediator — Deep Reference

Response caching for outbound calls. Paired request/response: one \`<cache>\` in-flight (no \`collector\`) caches the lookup and short-circuits on hit; a second \`<cache collector="true"/>\` on the response path stores it.

### Attributes (root \`<cache>\`)
| Attribute | Values | Notes |
|-----------|--------|-------|
| \`id\` | string | Cache identifier — must match across paired request/response mediators |
| \`timeout\` | seconds | TTL for a cached entry |
| \`collector\` | \`true\` \\| \`false\` | \`false\` (default) = request-path (check cache, maybe short-circuit). \`true\` = response-path (store in cache) |
| \`maxMessageSize\` | bytes | Responses above this size are not cached |
| \`scope\` | \`per-host\` \\| \`per-mediator\` | Cache-key scope |
| \`hashGenerator\` | FQCN | Defaults to \`org.wso2.caching.digest.DOMHASHGenerator\` |

### Child elements
- \`<implementation type="memory" maxSize="N"/>\` — LRU cache of up to N entries.
- \`<onCacheHit [sequence="..."]>...</onCacheHit>\` — inline mediators OR \`sequence="name"\`. Run on hit instead of backend call. Typically ends with \`<respond/>\`.
- \`<protocol type="HTTP">\`
  - \`<methods>GET POST</methods>\` — methods eligible for caching
  - \`<headersToExcludeInHash>Date</headersToExcludeInHash>\` — request headers ignored when computing the hash. List only volatile headers (Date, X-Request-Id) here; **never** identity headers (Authorization, Cookie, X-User-*) or responses will collide across users.
  - \`<responseCodes>2\\d\\d</responseCodes>\` — regex of response codes to cache
  - \`<enableCacheControl>true</enableCacheControl>\` — honor \`Cache-Control: no-cache/max-age\`
  - \`<includeAgeHeader>true</includeAgeHeader>\` — add \`Age\` header on cached responses
  - \`<hashGenerator>org.wso2.caching.digest.DOMHASHGenerator</hashGenerator>\`

### Paired request/response pattern
\`\`\`xml
<resource methods="GET" uri-template="/products/{id}">
  <inSequence>
    <!-- Request-path cache: short-circuits on hit -->
    <cache id="productCache" timeout="60" maxMessageSize="10000" collector="false">
      <onCacheHit>
        <respond/>
      </onCacheHit>
      <protocol type="HTTP">
        <methods>GET</methods>
        <!-- Only exclude volatile headers (Date). Identity headers (Authorization,
             Cookie, X-User-*) MUST stay in the hash so per-user responses don't
             collide in the cache. -->
        <headersToExcludeInHash>Date</headersToExcludeInHash>
        <responseCodes>2\\d\\d</responseCodes>
      </protocol>
    </cache>

    <http.get configKey="ProductsConn">
      <relativePath>/products/\${params.pathParams.id}</relativePath>
    </http.get>

    <!-- Response-path cache: same id, collector=true -->
    <cache id="productCache" collector="true"/>
    <respond/>
  </inSequence>
</resource>
\`\`\`

### Pitfalls
- The two \`<cache>\` mediators **must share \`id\`** and appear on the same flow (before and after the backend call).
- \`collector="true"\` has no other attributes — don't repeat \`timeout\`/\`maxMessageSize\` there.
- Caching personalized responses: identity headers (Authorization, Cookie, X-User-*, X-Tenant-*, etc.) must be **included** in the hash so per-user bodies don't collide. \`headersToExcludeInHash\` should list only volatile headers like \`Date\` — never auth/session headers.`,

call_send_loopback: `## \`<call>\` vs \`<send>\` vs \`<loopback/>\` — Flow Semantics

### \`<send>\` — one-way dispatch (default for async integrations)
\`\`\`xml
<send>
  <endpoint key="BackendEP"/>
</send>
\`\`\`
- Fire-and-forget at the mediator level. When the endpoint is 2-way (most HTTP), the response flows into the **outSequence** of the enclosing API \`<resource>\` / \`<proxy>\` \`<target>\`. Inside a sequence with no out-sequence wiring, the response is effectively dropped.
- \`<send/>\` (no endpoint child) — sends to the endpoint implied by \`To\` header / WS-Addressing. Used in out-sequences to forward the response back to the client.
- **Send terminates sequence execution**: mediators placed after \`<send>\` in the same sequence are NOT processed. Responses for 2-way endpoints still flow into the enclosing API/proxy/resource \`outSequence\` as described above.

### \`<call [blocking="false"]>\` — synchronous request/reply
\`\`\`xml
<call>
  <endpoint key="BackendEP"/>
</call>
<!-- After <call>: payload is the response body -->
\`\`\`
- Mediators after \`<call>\` see the backend response as \`\${payload}\` (or nothing if the endpoint is one-way).
- \`blocking="true"\` switches to a blocking IO path — required only for legacy transports. Only when \`blocking="true"\` is \`initAxis2ClientOptions="false"\` meaningful (it suppresses re-initialization of the Axis2 client options for the blocking call). Do NOT set \`initAxis2ClientOptions\` on a non-blocking \`<call>\`; it has no effect there.
- Connector operations (\`http.get\`, etc.) are internally \`<call>\`-shaped; after the connector the response is in \`\${payload}\` or \`\${vars.<responseVariable>}\`.

### \`<loopback/>\` — proxy-only out-sequence transition
- **Inside a proxy service**: moves from \`inSequence\` to \`outSequence\` without sending anything. The current message becomes the response.
- **Inside an API resource**: runs but is effectively a no-op for dispatch; the out-sequence of the resource is chosen automatically after \`<call>\` or \`<send>\` completes.
- Not needed in modern API flows — use \`<respond/>\` to send the current payload back.

### \`<respond/>\` — send current message back to client
- Terminates mediation for the current flow.
- Uses the current payload, the current \`HTTP_SC\` (axis2), and the current transport headers.
- Works identically in APIs, proxies, and inbound-driven sequences (where the "client" is the inbound connector).

### Decision matrix
| Goal | Mediator |
|------|----------|
| Synchronous backend call, need the response | \`<call>\` (or connector operation) |
| Fire message at backend, don't care about reply | \`<send>\` + one-way endpoint |
| Forward the response back to the API caller | \`<respond/>\` (or an empty \`<send/>\` inside a proxy out-sequence) |
| Return early from proxy inSequence with the current payload | \`<loopback/>\` + outSequence that contains \`<send/>\` |`,

fault_handling: `## Fault Handling — Hierarchy and \`ERROR_*\` Lifecycle

### Fault-handler resolution order (first match wins)
1. The enclosing resource/proxy's \`faultSequence\` attribute or inline \`<faultSequence>\`
2. The enclosing named \`<sequence onError="...">\` attribute
3. The endpoint's \`onFailure\` or inline fault handler
4. The Synapse \`_main\` fault sequence (\`fault\`)
5. Uncaught → logged and dropped

\`<inboundEndpoint>\` uses \`onError="..."\` in place of \`faultSequence\`.

### \`ERROR_*\` properties (synapse scope)
Set by the runtime when a fault is raised. Read them inside a fault sequence:

| Property | Contents |
|----------|----------|
| \`ERROR_CODE\` | Numeric error code (e.g. \`101504\` transport timeout, \`303001\` timeout on call, \`9000101\` connector op fault) |
| \`ERROR_MESSAGE\` | Short human-readable error |
| \`ERROR_DETAIL\` | Extended details |
| \`ERROR_EXCEPTION\` | Exception class name + stack when available |

Access:
\`\`\`xml
<log level="custom" category="ERROR">
  <property name="CODE" expression="\${props.synapse.ERROR_CODE}"/>
  <property name="MSG"  expression="\${props.synapse.ERROR_MESSAGE}"/>
  <property name="EX"   expression="\${props.synapse.ERROR_EXCEPTION}"/>
</log>
\`\`\`
Legacy XPath form: \`get-property('ERROR_MESSAGE')\`.

### Fault sequence template
\`\`\`xml
<sequence name="BackendFault">
  <log level="custom" category="ERROR">
    <property name="FAULT" expression="\${props.synapse.ERROR_MESSAGE}"/>
  </log>
  <!-- Shape a deterministic response. <args> only accepts XPath/JSONPath,
       so embed the Synapse v2 expression directly in <format> instead. -->
  <property name="HTTP_SC" value="502" scope="axis2" type="STRING"/>
  <payloadFactory media-type="json">
    <format>{"error": "upstream_error", "detail": "\${props.synapse.ERROR_MESSAGE}"}</format>
  </payloadFactory>
  <!-- Clear error state so downstream work doesn't re-trigger -->
  <property name="ERROR_CODE" action="remove" scope="default"/>
  <property name="ERROR_MESSAGE" action="remove" scope="default"/>
  <!-- Terminate with a deliberate response -->
  <respond/>
</sequence>
\`\`\`

### Key rules
- A fault sequence must end with \`<respond/>\`, \`<drop/>\`, \`<send/>\` (one-way), or \`<loopback/>\`. Otherwise the fault can bubble back up to \`_main\` and result in a second fault.
- \`<send>\` / \`<call>\` inside a fault sequence is risky — if that call itself faults, you get a fault loop. Prefer logging + \`<respond/>\` unless you have a well-tested alerting endpoint.
- After \`<drop/>\` inside a fault sequence, the client sees a default 202 Accepted unless you set \`HTTP_SC\` first — usually not what you want for a client-facing fault.
- \`ERROR_*\` properties are not automatically cleared across mediation boundaries. If a subsequent \`<call>\` starts a new flow, the previous error properties are still readable — explicitly \`<property ... action="remove"/>\` them if that matters.
- Setting \`nonErrorHttpStatusCodes\` on the HTTP connector short-circuits fault-handler invocation for listed HTTP status codes (see http-connector-guide:error_handling). Transport-level faults bypass it.`,

other: `## Other Mediators — Quick Reference

### Drop
Drops the current message (stops mediation, no response sent).
\`\`\`xml
<drop/>
\`\`\`

### Respond
Sends the current message back to the client (ends mediation).
\`\`\`xml
<respond/>
\`\`\`

### Loopback
Moves message from inSequence to outSequence (used in proxy services).
\`\`\`xml
<loopback/>
\`\`\`

### Sequence (reference)
Invokes a named sequence.
\`\`\`xml
<sequence key="MySequence"/>
\`\`\`

### ThrowError
Throws a custom error that triggers the fault sequence.
\`\`\`xml
<throwError type="VALIDATION_ERROR" errorMessage="Missing required field: \${vars.fieldName}"/>
\`\`\`

### Store
Stores the current message in a named message store for asynchronous processing. **Terminates mediation** — mediators after \`<store>\` do not run. \`<respond/>\` must precede it if you want a synchronous client reply. See synapse-async-reference:store_mediator.
\`\`\`xml
<store messageStore="OrdersJMS"/>
\`\`\`

### Variable
Sets a typed variable in the message context.
\`\`\`xml
<variable name="myVar" type="STRING" value="hello"/>
<variable name="myJson" type="JSON" expression="\${payload.data}"/>
<variable name="myBool" type="BOOLEAN" expression="\${payload.count > 0}"/>
\`\`\`
Variable types: \`STRING\`, \`INTEGER\`, \`BOOLEAN\`, \`DOUBLE\`, \`LONG\`, \`FLOAT\`, \`SHORT\`, \`JSON\`, \`XML\`, \`OM\`.

**type="JSON" from a String variable** — If a variable already holds a JSON *string* (for example one set via \`mc.setVariable\` in a script mediator, or populated from a TEXT response), assigning it directly with \`type="JSON"\` fails with:
\`result does not match the expected data type 'JSON'\`

Wrap the source with \`array(...)\` or \`object(...)\` to parse the string into a JSON-typed value:
\`\`\`xml
<!-- vars.myJsonStr is the JSON string "[1,2,3]" -->
<variable name="myArr" type="JSON" expression="\${array(vars.myJsonStr)}"/>

<!-- vars.myJsonStr is the JSON string '{"a":1}' -->
<variable name="myObj" type="JSON" expression="\${object(vars.myJsonStr)}"/>
\`\`\`

### Log
Logs message details. Does not modify the payload.
\`\`\`xml
<log category="INFO|DEBUG|WARN|ERROR|TRACE|FATAL" [level="simple|full|headers|custom"]>
  <message>Log message with \${payload.id}</message>
  <property name="customProp" expression="\${vars.value}"/>
</log>
\`\`\`

### Filter
Conditional branching (XPath/expression must evaluate to boolean).
\`\`\`xml
<filter xpath="\${payload.age > 18}">
  <then><!-- mediators --></then>
  <else><!-- mediators --></else>
</filter>
\`\`\`
Alternative: regex-based filtering on a source expression.
\`\`\`xml
<filter source="\${payload.status}" regex="active|pending">
  <then><!-- matched --></then>
</filter>
\`\`\`

### Switch
Multi-branch routing based on regex matching.
\`\`\`xml
<switch source="\${payload.category}">
  <case regex="electronics"><!-- mediators --></case>
  <case regex="clothing"><!-- mediators --></case>
  <default><!-- mediators --></default>
</switch>
\`\`\`
`,

};

export const SYNAPSE_MEDIATOR_REFERENCE_FULL = Object.values(SYNAPSE_MEDIATOR_REFERENCE_SECTIONS).join('\n\n---\n\n');
