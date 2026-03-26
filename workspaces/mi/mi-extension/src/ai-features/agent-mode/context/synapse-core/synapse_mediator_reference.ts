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

'for-each': `## ForEach Mediator (v2 — Collection-Based)

Iterates over a collection (JSON array or XML nodeset) and executes a sequence for each element.

### XML Schema
\`\`\`xml
<foreach collection="\${payload.items}" [parallel-execution="true|false"]
         [counter-variable="i"] [result-type="JSON|XML"]
         [result-target="body|variable"] [result-variable="varName"]
         [result-enclosing-element="rootElement"]>
  <sequence>
    <!-- mediators to execute per element -->
  </sequence>
</foreach>
\`\`\`

### Key Attributes
| Attribute | Required | Default | Notes |
|-----------|----------|---------|-------|
| \`collection\` | YES | -- | Synapse expression evaluating to array/nodeset |
| \`parallel-execution\` | No | \`false\` | Whether iterations run in parallel |
| \`counter-variable\` | No | -- | Variable name for iteration index (0-based) |
| \`result-type\` | No | -- | \`JSON\` or \`XML\` — aggregated result format |
| \`result-target\` | No | -- | \`body\` or \`variable\` — where aggregated result goes |
| \`result-variable\` | Conditional | -- | Required when \`result-target="variable"\` |
| \`result-enclosing-element\` | Conditional | -- | Required when \`result-type="XML"\` |

### Key Behaviors
- During iteration, \`\${payload}\` refers to the **current array element**, not the original payload
- Original payload is restored after forEach completes
- Sequences inside forEach **cannot contain call, send, or callout mediators**
- Counter variable is accessible as \`\${vars.i}\` (if \`counter-variable="i"\`)
`,

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
Stores a message in a message store for later processing.
\`\`\`xml
<store messageStore="MyMessageStore"/>
\`\`\`

### Variable
Sets a typed variable in the message context.
\`\`\`xml
<variable name="myVar" type="STRING" value="hello"/>
<variable name="myJson" type="JSON" expression="\${payload.data}"/>
<variable name="myBool" type="BOOLEAN" expression="\${payload.count > 0}"/>
\`\`\`
Variable types: \`STRING\`, \`INTEGER\`, \`BOOLEAN\`, \`DOUBLE\`, \`LONG\`, \`FLOAT\`, \`SHORT\`, \`JSON\`, \`XML\`, \`OM\`.

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
