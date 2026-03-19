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
 * Compact Synapse Expression Reference Card.
 *
 * This is always-loaded context — kept dense to minimize token usage.
 * Models already know the basics (operators, concept of globals, ${} syntax)
 * from training data. This card focuses on what they get WRONG under context
 * pressure: exact attribute names, function call style, access paths, gotchas.
 *
 * For full details, the agent can load deep contexts on demand:
 *   synapse-expression-spec, synapse-function-reference,
 *   synapse-variable-resolution, synapse-edge-cases
 */
export const SYNAPSE_EXPRESSION_GUIDE = `
### Synapse Expressions — Quick Reference

Synapse Expressions use \`\${}\` syntax. In attributes: typed results. In inline templates (\`<message>\`, \`<format>\`): auto-stringified.
Literals: \`"hello"\`, \`123.4\`, \`true\`, \`false\`, \`null\`

#### 6 Global Variables
| Global | Access | Example |
|--------|--------|---------|
| payload | \`payload.field\` or \`$.field\` | \`\${payload.user.name}\`, \`\${$.orders[0]}\` |
| vars | \`vars.name\` | \`\${vars.userId}\`, \`\${vars["last.name"]}\` |
| params | \`params.queryParams.x\`, \`params.pathParams.x\`, \`params.functionParams.x\` | \`\${params.queryParams.page}\` |
| headers | \`headers["Name"]\` | \`\${headers["Content-Type"]}\` |
| properties | \`properties.synapse.X\` or \`properties.axis2.X\` (\`props\` is an alias for \`properties\`) | \`\${properties.synapse.REST_METHOD}\` |
| configs | \`configs.key\` | \`\${configs.db.url}\` (from deployment.toml) |

Bracket notation for special keys: \`\${vars["last.name"]}\`, \`\${payload.user["first name"]}\`
Array index: \`\${payload.items[0].name}\`. Array literals: \`\${[1, 2, 3]}\`, \`\${["a", "b"]}\`, \`\${[]}\`

#### Registry Access (function, not a global)
\`\`\`
\${registry("gov:/config/service")}
\${registry("gov:/config/resource").student.name}
\${registry("gov:/path").property("key")}
\`\`\`

#### Connector Response Access
When a connector uses \`responseVariable="varName"\`:
\`\`\`
\${vars.varName.payload}              — response body
\${vars.varName.payload.field}        — nested field
\${vars.varName.headers.ContentType}  — response header
\${vars.varName.attributes.statusCode} — HTTP status code
\`\`\`

#### Functions — Call Style: \`fn(arg)\`, NOT \`arg.fn()\`
| Category | Functions |
|----------|-----------|
| String | \`length(s)\`, \`toUpper(s)\`, \`toLower(s)\`, \`subString(s, start[, end])\`, \`contains(s, sub)\`, \`startsWith(s, prefix)\`, \`endsWith(s, suffix)\`, \`trim(s)\`, \`replace(s, old, new)\`, \`split(s, delim)\`, \`charAt(s, i)\`, \`indexOf(s, sub[, from])\` |
| Math | \`abs(n)\`, \`floor(n)\`, \`ceil(n)\`, \`sqrt(n)\`, \`log(n)\`, \`pow(base, exp)\`, \`round(n, places)\` |
| Type check | \`isString(x)\`, \`isNumber(x)\`, \`isArray(x)\`, \`isObject(x)\`, \`isBoolean(x)\` |
| Type convert | \`integer(x)\`, \`float(x)\`, \`boolean(x)\`, \`string(x)\`, \`object(x)\`, \`array(x)\` |
| Encoding | \`base64Encode(s)\`, \`base64Decode(s)\`, \`urlEncode(s)\`, \`urlDecode(s)\` |
| Date | \`now()\`, \`formatDateTime(ts, pattern)\` |
| Null guard | \`exists(expr)\` — the ONLY safe null check |
| XPath | \`xpath("expr")\` — for XML payloads |
| Secrets | \`wso2-vault("alias")\`, \`hashicorp-vault("path","field")\` |

\`length()\` works on both strings and arrays: \`\${length(payload.items)}\`

#### JSONPath Filtering
\`\`\`
\${payload.users[?(@.age >= 18)]}
\${payload.orders[?(@.total > vars.minAmount)]}
\${length(payload.items[?(@.price &lt; 10)])}
\`\`\`

#### XML Escaping in Attributes
| Write | Instead of | Use keyword |
|-------|-----------|-------------|
| \`&lt;\` | \`<\` | — |
| \`&gt;\` | \`>\` | — |
| \`and\` | \`&&\` / \`&amp;&amp;\` | preferred |
| \`or\` | \`\\|\\|\` | preferred |
| \`not(x)\` | \`!\` | preferred |

#### XPath in Synapse Expressions
\`\`\`xml
<variable name="val" expression="\${xpath(&quot;string($body//*[local-name()='Element'])&quot;)}" type="STRING"/>
\`\`\`
- Use \`&quot;\` as outer xpath string delimiter, single quotes inside XPath. Do not escape single quotes as \`\\'\` — plain single quotes are valid in double-quoted XML attributes.
- Avoid nesting functions around \`xpath()\`. Extract first, then transform.
- After SOAP \`call\`, payload auto-converts to JSON — use JSON paths, not XPath.

#### PayloadFactory JSON Quoting
String values need explicit quotes, numbers/booleans do not:
\`\`\`xml
<format>{"name": "\${payload.name}", "count": \${payload.count}, "active": \${vars.isActive}}</format>
\`\`\`

#### Null Safety
\`null\` THROWS on all operators EXCEPT \`==\` and \`!=\`:
\`\`\`
null + 5       → THROWS
null > 0       → THROWS
null and true  → THROWS
null == null   → true  (safe)
null == "x"    → false (safe)
\`\`\`
Always guard: \`\${exists(payload.field) ? payload.field : "default"}\`

#### Auto-Numeric Parsing
Headers, properties, params, and configs auto-parse string values: \`"200"\` → integer 200, \`"3.14"\` → double 3.14. Use \`string()\` to force string type if needed.

#### Critical Gotchas
1. **No implicit coercion for \`+\`**: \`"Count: " + 5\` THROWS. Use \`string()\` or inline template.
2. **\`==\` compares string representations**: \`1 == 1.0\` → false. Use \`float()\` for numeric comparison.
3. **Logical ops need strict boolean**: \`1 and true\` THROWS. No truthy/falsy. \`not()\` argument MUST be boolean.
4. **Comparison ops are numeric-only**: \`"abc" > "abd"\` THROWS. Convert to numbers first.
5. **Ternary condition must be boolean**: \`null ? "a" : "b"\` THROWS.
6. **PayloadFactory: NEVER use \`<args>\` with Synapse Expressions** — embed directly in \`<format>\`.
7. **Single-line only**: no multi-line code inside \`\${}\`.
8. **Hyphens in identifiers**: \`vars.my-var\` is valid (hyphens allowed in variable names).

For deeper reference (operator precedence, type coercion rules, edge cases, full function signatures), load deep contexts via load_context_reference.
`;
