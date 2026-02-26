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
 * Synapse Mediator-Expression Integration Matrix
 * Extracted from mediator factory classes and mediator implementations.
 *
 * Section-based exports for granular skill loading.
 */

export const SYNAPSE_MEDIATOR_EXPRESSION_MATRIX_SECTIONS: Record<string, string> = {

patterns: `## Expression Integration Patterns

There are two distinct ways mediators consume Synapse Expressions:

### Pattern A: Attribute-level Expression
The entire attribute value is a single expression, parsed by \`SynapsePathFactory.getSynapsePath()\`.
Returns a typed result (int, boolean, JsonObject, etc.).
\`\`\`xml
<variable name="x" expression="\${payload.value + 1}" type="INTEGER"/>
<filter xpath="\${payload.count > 0}">
\`\`\`

### Pattern B: Inline Template Expression
Multiple \${...} placeholders embedded in text content, processed by \`InlineExpressionUtil\`.
Each placeholder is resolved to a string and substituted into the template.
\`\`\`xml
<log><message>Hello \${payload.name}, you have \${payload.count} items</message></log>
<payloadFactory media-type="json"><format>{"name": \${payload.name}}</format></payloadFactory>
\`\`\`

**Key difference:** Pattern A returns typed results. Pattern B always stringifies.`,

variable: `## variable Mediator
**Element:** \`<variable>\`
**Expression attributes:**
- \`expression\` — Pattern A (SynapsePath). The expression result is stored as the variable value.
**Other attributes:**
- \`name\` (required) — variable name
- \`type\` (optional) — STRING, INTEGER, DOUBLE, LONG, BOOLEAN, XML, JSON. Controls type conversion of the result.
- \`value\` (alternative to expression) — literal value
- \`action\` (optional) — set (default) or remove
**Payload effect:** None. Only modifies MessageContext variables.
\`\`\`xml
<variable name="userId" expression="\${payload.user.id}" type="INTEGER"/>
<variable name="greeting" value="Hello World" type="STRING"/>
<variable name="data" expression="\${payload.data}" type="JSON"/>
\`\`\`
**Rules:**
- Use either \`value\` OR \`expression\`, never both.
- No child elements allowed — only attributes.
- When type=XML, the expression result must be valid XML (not JSON).`,

payloadFactory: `## payloadFactory Mediator
**Element:** \`<payloadFactory>\`
**Expression handling:**
- \`<format>\` content — Pattern B (inline expressions). \${...} placeholders in the format template.
- \`<args><arg expression="...">\` — Pattern A, but DEPRECATED. Only accepts XPath/JSONPath, NOT Synapse Expressions.
**Other attributes:**
- \`media-type\` (optional) — json (default), xml, text
- \`template-type\` (optional) — default (regex), freemarker
**Payload effect:** REPLACES the entire message payload with the formatted result.
\`\`\`xml
<!-- Correct: inline Synapse Expressions in format -->
<payloadFactory media-type="json">
    <format>{"name": \${payload.name}, "total": \${vars.total}}</format>
</payloadFactory>

<!-- DEPRECATED: args with $1/$2 placeholders -->
<!-- DO NOT USE with Synapse Expressions — args only accepts XPath -->
\`\`\`
**Rules:**
- NEVER use \`<args>\` with \`<arg expression="\${...}">\`. This fails at runtime.
- For JSON payloads, expressions producing strings should be in quotes: \`"name": "\${payload.name}"\`
- For JSON payloads, expressions producing numbers/booleans/objects/arrays should NOT be in quotes: \`"count": \${payload.count}\`
- FreeMarker template type uses \${...} as FreeMarker syntax — Synapse expressions are resolved first before FreeMarker.`,

filter: `## filter Mediator
**Element:** \`<filter>\`
**Expression attributes:**
- \`xpath\` — Pattern A (SynapsePath). Must evaluate to a boolean.
**Alternative mode (deprecated for new code):**
- \`source\` — Pattern A (SynapsePath). Evaluates to a string.
- \`regex\` — literal regex pattern matched against source result.
**Payload effect:** None. Routing only.
\`\`\`xml
<filter xpath="\${payload.age > 18}">
    <then>...</then>
    <else>...</else>
</filter>

<!-- Or with source + regex (older pattern but still supported) -->
<filter source="\${payload.category}" regex="fiction|science">
    <then>...</then>
    <else>...</else>
</filter>
\`\`\`
**Rules:**
- The \`xpath\` attribute accepts Synapse Expressions despite the attribute name.
- When using \`xpath\`, the expression must evaluate to a boolean.
- Do NOT use \`source\` attribute with the new filter mediator; use only \`xpath\`.`,

switch_mediator: `## switch Mediator
**Element:** \`<switch>\`
**Expression attributes:**
- \`source\` — Pattern A (SynapsePath). Evaluates to a string, matched against case regex patterns.
**Payload effect:** None. Routing only.
\`\`\`xml
<switch source="\${payload.category}">
    <case regex="fiction">...</case>
    <case regex="science|math">...</case>
    <default>...</default>
</switch>
\`\`\``,

log: `## log Mediator
**Element:** \`<log>\`
**Expression handling:**
- \`<message>\` content — Pattern B (inline expressions).
**Other attributes:**
- \`category\` (optional) — INFO, DEBUG, TRACE, WARN, ERROR, FATAL
- \`separator\` (optional) — separator between properties
- \`logFullPayload\` (optional) — true/false
- \`logMessageID\` (optional) — true/false
**Payload effect:** None. Read-only logging.
\`\`\`xml
<log category="INFO">
    <message>User \${payload.name} (ID: \${vars.userId}) made request</message>
</log>
\`\`\`
**Rules:**
- \`level\` attribute is DEPRECATED. Use \`category\`.
- \`<property>\` children inside log are DEPRECATED. Use \`<message>\` with inline expressions.`,

forEach: `## forEach Mediator (v2 — collection-based)
**Element:** \`<foreach>\`
**Expression attributes:**
- \`collection\` — Pattern A (SynapsePath). Must evaluate to a JSON array.
- \`expression\` (v1 legacy) — Pattern A (SynapsePath).
**Other attributes (v2):**
- \`parallel-execution\` — true/false
- \`counter-variable\` — name of counter variable
- \`update-original\` — true/false
- \`result-content-type\` — JSON or XML
- \`target-variable\` — variable to store aggregated result
**Payload effect:**
- v1: Temporarily replaces payload with each array element during iteration. Restores original after.
- v2: Can aggregate results into body or variable based on configuration.
\`\`\`xml
<foreach collection="\${payload.items}" parallel-execution="false" counter-variable="i">
    <sequence>
        <log><message>Processing item \${vars.i}: \${payload}</message></log>
    </sequence>
</foreach>
\`\`\`
**Rules:**
- Sequences inside forEach cannot contain call, send, or callout mediators.
- During iteration, \${payload} refers to the current array element, not the original payload.`,

scatter_gather: `## scatter-gather Mediator
**Element:** \`<scatter-gather>\`
**Expression attributes:**
- \`aggregation expression\` — Pattern A (SynapsePath). Expression to extract from each branch result for aggregation.
- \`aggregation condition\` — Pattern A (SynapsePath). Correlation condition.
- \`aggregation min-messages\` — can be a dynamic expression
- \`aggregation max-messages\` — can be a dynamic expression
**Other attributes:**
- \`parallel-execution\` — true/false
- \`target\` — Body or Variable
- \`result-content-type\` — JSON or XML
- \`root-element\` — required when XML
**Payload effect:** REPLACES payload with aggregated result (or stores in variable).
\`\`\`xml
<scatter-gather parallel-execution="true" target="Body" result-content-type="JSON">
    <aggregation expression="\${payload}" />
    <sequence><!-- branch 1 --></sequence>
    <sequence><!-- branch 2 --></sequence>
</scatter-gather>
\`\`\``,

enrich: `## enrich Mediator
**Element:** \`<enrich>\`
**Expression attributes:**
- \`source xpath\` — Pattern A (SynapsePath). Source of content to enrich with.
- \`target xpath\` — Pattern A (SynapsePath). Target location in message.
**Other attributes:**
- \`source type\` — envelope, body, property, custom, inline
- \`target type\` — envelope, body, property, custom, key
- \`target action\` — replace, child, sibling, remove
- \`source clone\` — true/false
**Payload effect:** MODIFIES payload (or property) based on source→target configuration.
\`\`\`xml
<enrich>
    <source type="custom" xpath="\${payload.user.name}"/>
    <target type="property" property="userName"/>
</enrich>
\`\`\``,

header: `## header Mediator
**Element:** \`<header>\`
**Expression attributes:**
- \`expression\` — Pattern A (SynapsePath). Dynamic header value.
**Other attributes:**
- \`name\` — header name (required)
- \`value\` — literal header value (alternative to expression)
- \`action\` — set (default) or remove
- \`scope\` — default (SOAP) or transport (HTTP)
**Payload effect:** Modifies headers only, not body.
\`\`\`xml
<header name="Authorization" expression="\${'Bearer ' + vars.token}" scope="transport"/>
\`\`\``,

throwError: `## throwError Mediator
**Element:** \`<throwError>\`
**Expression handling:**
- \`errorMessage\` — can contain inline expressions (Pattern B via Value/dynamic).
**Other attributes:**
- \`type\` — error type string
**Payload effect:** None. Throws error, triggers fault sequence.
\`\`\`xml
<throwError type="VALIDATION_ERROR" errorMessage="Field \${vars.fieldName} is invalid"/>
\`\`\``,

validate: `## validate Mediator
**Element:** \`<validate>\`
**Expression attributes:**
- \`source\` — Pattern A (SynapsePath). The content to validate against schema.
**Payload effect:** None. Validation only. Runs on-fail mediators if validation fails.
\`\`\`xml
<validate source="\${payload}">
    <schema key="conf:/schema/user.json"/>
    <on-fail>
        <throwError type="SCHEMA_ERROR" errorMessage="Validation failed"/>
    </on-fail>
</validate>
\`\`\``,

call: `## call Mediator
**Element:** \`<call>\`
**Expression handling:**
- Source/target elements can contain SynapsePath expressions.
**Payload effect:** REPLACES payload with the response from the called service.
\`\`\`xml
<call>
    <endpoint key="MyEndpoint"/>
</call>
<!-- After call, \${payload} contains the response -->
\`\`\`
**Rules:**
- After a SOAP call, \${payload} returns JSON (auto-converted). Use JSON paths, not XPath.
- For SOAP, prefer call with named endpoint. For REST, prefer HTTP connector.`,

db: `## Database Mediators

### dblookup
**Element:** \`<dblookup>\`
**Expression attributes:**
- \`statement/parameter expression\` — Pattern A (SynapsePath). Dynamic query parameter values.
**Payload effect:** None. Stores query results in synapse properties (accessed via \`\${props.synapse.resultName}\`).
\`\`\`xml
<dblookup>
    <connection>...</connection>
    <statement>
        <sql>SELECT name FROM users WHERE id = ?</sql>
        <parameter expression="\${payload.userId}" type="INTEGER"/>
        <result name="userName" column="name"/>
    </statement>
</dblookup>
<!-- Access result via: \${props.synapse.userName} -->
\`\`\`

### dbreport
**Element:** \`<dbreport>\`
**Expression attributes:** Same as dblookup for parameters.
**Payload effect:** None. Executes DML (INSERT/UPDATE/DELETE).

### dataServiceCall
**Element:** \`<dataServiceCall>\`
**Payload effect:** Calls a data service. Response replaces payload or is stored in target.`,

payload_state: `## Payload State Machine

Understanding what happens to \`\${payload}\` after each mediator:

| Mediator | Payload After Execution |
|----------|------------------------|
| variable | **Unchanged** |
| log | **Unchanged** (read-only) |
| filter | **Unchanged** (routing only) |
| switch | **Unchanged** (routing only) |
| validate | **Unchanged** (validation only) |
| throwError | **N/A** (error thrown) |
| header | **Unchanged** (headers only) |
| payloadFactory | **Replaced** with formatted content |
| call | **Replaced** with service response |
| http.get/post/... | **Replaced** with service response |
| send | **Unchanged** (async dispatch) |
| enrich | **Modified** (partial or full replacement based on config) |
| forEach | **Temporarily replaced** per iteration; aggregated or restored after |
| scatter-gather | **Replaced** with aggregated result |
| dblookup | **Unchanged** (results in properties) |
| dbreport | **Unchanged** |
| respond | **Unchanged** (sends current payload back to client) |
| drop | **N/A** (message dropped) |
| loopback | **Unchanged** (switches flow direction) |

### Practical implications:
\`\`\`xml
<!-- Save payload before call if you need it later -->
<variable name="originalPayload" expression="\${payload}" type="JSON"/>
<call><endpoint key="ExternalService"/></call>
<!-- \${payload} is now the response. Original is in \${vars.originalPayload} -->

<!-- After SOAP call, payload is JSON-ified -->
<call><endpoint key="SOAPService"/></call>
<variable name="result" expression="\${payload.ResponseElement.Result}" type="STRING"/>
\`\`\``,

connectors: `## Expression Usage in Connector Operations

Connector operations (http.get, http.post, redis.put, etc.) accept inline expressions in their child elements:
\`\`\`xml
<http.get configKey="MyConn">
    <relativePath>/users/\${vars.userId}</relativePath>
    <headers>[["Authorization","Bearer \${vars.token}"]]</headers>
</http.get>

<redis.put configKey="RedisConn">
    <key>\${vars.cacheKey}</key>
    <value>\${payload.data}</value>
</redis.put>
\`\`\`
These are processed as inline expressions (Pattern B).`,

};

// Full content composed from all sections
export const SYNAPSE_MEDIATOR_EXPRESSION_MATRIX_FULL = Object.values(SYNAPSE_MEDIATOR_EXPRESSION_MATRIX_SECTIONS).join('\n\n---\n\n');
