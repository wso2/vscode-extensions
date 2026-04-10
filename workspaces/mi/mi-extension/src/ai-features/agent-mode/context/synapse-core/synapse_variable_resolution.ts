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
 * Synapse Expression Variable Resolution Reference
 * Extracted from: PayloadAccessNode.java, EvaluationContext.java,
 * HeadersAndPropertiesAccessNode.java, ExpressionConstants.java
 *
 * Section-based exports for granular context loading.
 */

export const SYNAPSE_VARIABLE_RESOLUTION_SECTIONS: Record<string, string> = {

overview: `## Global Variables

Every Synapse mediation flow has 6 global variable scopes accessible in expressions:

| Scope | Keyword(s) | Access Pattern | Source |
|-------|-----------|----------------|--------|
| Payload | \`payload\`, \`$\` | \`payload.field\`, \`$.field\` | Message body (JSON) |
| Variables | \`vars\` | \`vars.name\` | MessageContext variables |
| Headers | \`headers\` | \`headers["Name"]\` | HTTP transport headers |
| Properties | \`props\`, \`properties\` | \`props.synapse.name\` | Synapse/Axis2 properties |
| Parameters | \`params\` | \`params.queryParams.name\` | Query/path/function params |
| Configs | \`configs\` | \`configs.name\` | synapse.properties file |`,

payload: `## Payload Access

### How it works internally
1. Expression like \`payload.user.name\` → prefix \`payload\` is replaced with \`$\` → becomes \`$.user.name\`
2. The JSON payload is read from the Axis2 MessageContext via \`JsonUtil.getJsonPayload()\`
3. The jayway JsonPath library evaluates the expression against the JSON string
4. If the payload is not JSON, it falls back to \`SynapseJsonPath("$.")\` which attempts XML-to-JSON conversion

### Syntax variations
\`\`\`xml
\${payload}                    <!-- Entire payload -->
\${payload.user.name}          <!-- Dot notation -->
\${$}                          <!-- Entire payload ($ alias) -->
\${$.user.name}                <!-- $ alias with dot notation -->
\${payload["first name"]}      <!-- Bracket notation for special keys -->
\${payload.items[0]}           <!-- Array index -->
\${payload.items[0].name}      <!-- Chained access -->
\${payload.items[*].name}      <!-- Wildcard -->
\${payload..name}              <!-- Recursive descent -->
\${payload.users[?(@.age > 18)]}  <!-- Filter expression -->
\`\`\`

### Return types from payload access
| JSON Type | Returned As |
|-----------|-------------|
| string    | JsonPrimitive (string) |
| number (int-range) | JsonPrimitive (integer) |
| number (long-range) | JsonPrimitive (long) |
| number (decimal) | JsonPrimitive (double) |
| boolean   | JsonPrimitive (boolean) |
| null      | Java null (JsonNull is unboxed) |
| object    | JsonObject |
| array     | JsonArray |

### Payload errors
- Empty payload → throws "Payload is empty"
- Path not found → throws with jayway PathNotFoundException message
- Non-JSON payload without fallback → may throw or return unexpected results`,

variables: `## Variable Access (vars)

### How it works internally
1. \`vars.name\` → calls \`MessageContext.getVariable("name")\`
2. If the variable is a simple value (String, Number, etc.), it's returned directly
3. If the variable is a \`Map\`, first-level access uses \`Map.get(key)\`, NOT JSONPath
4. For nested access on Map variables, subsequent levels use JSONPath
5. If the variable is XML (\`OMElement\`), JSONPath access throws "Could not evaluate JSONPath expression on non-JSON variable value"

### Syntax variations
\`\`\`xml
\${vars.userName}               <!-- Simple variable access -->
\${vars["user name"]}           <!-- Bracket notation for special chars -->
\${vars["user.name"]}           <!-- Bracket notation for dots in key -->
\${vars.data.field}             <!-- Nested access (JSON variable) -->
\${vars.data[0]}                <!-- Array index on JSON variable -->
\${vars.data.items[?(@.active == true)]}  <!-- Filter on JSON variable -->
\`\`\`

### Variable types (set via variable mediator)
| Type | Stored As | JSONPath Access |
|------|-----------|-----------------|
| STRING | String | Only direct access, no nested paths |
| INTEGER | Integer | Only direct access |
| DOUBLE | Double | Only direct access |
| LONG | Long | Only direct access |
| BOOLEAN | Boolean | Only direct access |
| JSON | JsonElement | Full JSONPath support |
| XML | OMElement | THROWS on JSONPath — use xpath() instead |

### Map variables (from connectors or complex operations)
When a variable holds a Map (common with connector outputs):
\`\`\`xml
<!-- If vars.response is a Map with keys: headers, attributes, payload -->
\${vars.response.headers}       <!-- Map.get("headers") - first level uses Map API -->
\${vars.response.payload.name}  <!-- Map.get("payload") then JSONPath $.name on the value -->
\${vars.response.attributes.statusCode}  <!-- Map.get("attributes") then JSONPath -->
\`\`\`

### Variable errors
- Undefined variable → throws "Variable {name} is not defined"
- JSONPath on XML variable → throws "Could not evaluate JSONPath expression on non-JSON variable value"
- Key not found in Map → throws "Could not find key: {key} in the variable"`,

headers: `## Header Access

### How it works internally
1. \`headers["Content-Type"]\` → reads from Axis2 MessageContext \`TRANSPORT_HEADERS\` map
2. The header map stores values as Object (usually String)
3. After retrieval, the value goes through \`tryParseNumber()\`:
   - Tries \`Integer.parseInt()\` first
   - Then \`Long.parseLong()\`
   - Then \`Double.parseDouble()\`
   - Falls back to returning as String

### Syntax
\`\`\`xml
\${headers["Content-Type"]}     <!-- Most headers need bracket notation (contain hyphens) -->
\${headers.Host}                <!-- Dot notation works if no special chars -->
\${headers["Authorization"]}
\`\`\`

### Header errors
- Missing header → throws "Could not fetch the value of the key: {name}"
- Null header map → returns null → throws`,

properties: `## Property Access

### How it works internally
Properties have two scopes, resolved differently:
1. \`props.synapse.name\` → \`MessageContext.getProperty(name)\` (Synapse scope)
2. \`props.axis2.name\` → \`Axis2MessageContext.getAxis2MessageContext().getProperty(name)\` (Axis2 scope)

After retrieval, the value goes through \`tryParseNumber()\` (same as headers).

### Syntax
\`\`\`xml
\${props.synapse.REST_METHOD}       <!-- Synapse property -->
\${properties.synapse.REST_METHOD}  <!-- Full keyword variant -->
\${props.axis2.REST_URL_POSTFIX}    <!-- Axis2 property -->
\`\`\`

### Common Synapse properties
| Property | Description |
|----------|-------------|
| \`REST_METHOD\` | HTTP method (GET, POST, etc.) |
| \`ERROR_CODE\` | Error code when in fault sequence |
| \`ERROR_MESSAGE\` | Error message when in fault sequence |
| \`ERROR_DETAIL\` | Error detail when in fault sequence |
| \`TRANSPORT_IN_NAME\` | Transport protocol |
| \`RESPONSE\` | Whether message is a response |

### Property errors
- Missing property → throws "Could not fetch the value of the key: {name}"`,

parameters: `## Parameter Access

### How it works internally

Three parameter types, each resolved differently:

**Query Parameters:** \`params.queryParams.userId\`
→ Resolved as \`context.getProperty("query.param.userId", "synapse")\`
The MI runtime stores query parameters as synapse properties with \`query.param.\` prefix.

**Path Parameters:** \`params.pathParams.userId\`
→ Resolved as \`context.getProperty("uri.var.userId", "synapse")\`
The MI runtime stores path parameters as synapse properties with \`uri.var.\` prefix.

**Function Parameters:** \`params.functionParams.firstName\`
→ Resolved from the template context stack via \`context.getFunctionParam("firstName")\`
Used inside sequence templates (\`<template>\`). The function stack is a Stack<TemplateContext>.

### Syntax
\`\`\`xml
<!-- Query parameters (from URL: ?userId=123) -->
\${params.queryParams.userId}

<!-- Path parameters (from URI template: /users/{userId}) -->
\${params.pathParams.userId}

<!-- Function parameters (inside template sequences) -->
\${params.functionParams.firstName}
\`\`\`

### Parameter errors
- Missing query/path param → throws "Could not fetch the value of the key: {name}"
- Missing function param → returns null from stack → may throw downstream`,

configs: `## Config Access

### How it works internally
\`configs.name\` → resolved via \`PropertyHolder.getInstance().getPropertyValue(name)\`
This reads from the \`synapse.properties\` file (or deployment.toml resolved properties).

After retrieval, the value goes through \`tryParseNumber()\` (same as headers/properties).

### Syntax
\`\`\`xml
\${configs.db.host}
\${configs.retry_count}
\`\`\`

### Config errors
- Missing config → throws "The value of the key:[{name}] is null"`,

auto_numeric: `## Auto-Numeric Parsing

Headers, properties, parameters, and configs all pass through \`tryParseNumber()\` after retrieval:

1. Try \`Integer.parseInt(value)\` — if succeeds, return as integer
2. Try \`Long.parseLong(value)\` — if succeeds, return as long
3. Try \`Double.parseDouble(value)\` — if succeeds, return as double
4. Fall back to returning as String

**This means:** If a header value is "200", it will be returned as integer 200, not string "200". This affects comparison and equality behavior. Be aware of this auto-parsing when working with headers, properties, params, and configs.`,

registry: `## Registry Access

### How it works internally
1. \`registry("gov:/config/service")\` → looks up in Synapse Configuration Registry
2. If resource is \`OMText\` → Base64 decodes the text content and returns as UTF-8 string
3. If resource is \`OMElement\` → returns XML via \`toString()\`
4. Property access: \`registry("key").property("prop")\` → reads from registry resource properties

### Chaining patterns
\`\`\`xml
<!-- Get entire registry resource as string -->
\${registry("gov:/config/service")}

<!-- Get a property from the registry resource -->
\${registry("gov:/config/service").property("endpoint.url")}

<!-- Access JSON content inside a registry resource via JSONPath -->
\${registry("gov:/config/resource").student.name}
\${registry("gov:/config/resource").items[0].id}
\`\`\`

### Registry errors
- Resource not found → throws "Could not find the registry resource: {key}"
- Property not found → throws "Could not find the property: {prop} in the registry resource: {key}"`,

};

// Full content composed from all sections
export const SYNAPSE_VARIABLE_RESOLUTION_FULL = Object.values(SYNAPSE_VARIABLE_RESOLUTION_SECTIONS).join('\n\n---\n\n');
