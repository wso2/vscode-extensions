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
 * Synapse Expression Language Formal Specification
 * Extracted from ANTLR grammar and evaluator source.
 *
 * Section-based exports for granular skill loading.
 * Usage: SYNAPSE_EXPRESSION_SPEC_SECTIONS["type_system"] for just type info.
 *        SYNAPSE_EXPRESSION_SPEC_FULL for entire spec.
 */

export const SYNAPSE_EXPRESSION_SPEC_SECTIONS: Record<string, string> = {

operators: `## Operator Precedence (highest to lowest)

Extracted from the ANTLR parser grammar. Higher precedence binds tighter.

| Precedence | Category       | Operators                        | Associativity |
|------------|----------------|----------------------------------|---------------|
| 1 (highest)| Grouping       | \`( )\`                          | —             |
| 2          | Unary          | \`-\` (signed)                   | Right         |
| 3          | Multiplicative | \`*\`, \`/\`, \`%\`                  | Left          |
| 4          | Additive       | \`+\`, \`-\`                       | Left          |
| 5          | Logical        | \`and\`/\`&&\`, \`or\`/\`||\`          | Right         |
| 6          | Comparison     | \`>\`, \`<\`, \`>=\`, \`<=\`, \`==\`, \`!=\` | Left          |
| 7 (lowest) | Conditional    | \`? :\` (ternary)                | Right         |

**Key implication:** Arithmetic is evaluated before comparisons, which are evaluated before logical operators.
\`\`\`
\${vars.a + 5 > vars.b * 2 and vars.c == true}
\`\`\`
Evaluates as: \`((vars.a + 5) > (vars.b * 2)) and (vars.c == true)\``,

type_system: `## Type System

The expression engine supports 9 internal types, tracked by \`ExpressionResult\`:

| Type          | Java Type                  | From Payload | From Variable | From Literal |
|---------------|----------------------------|--------------|---------------|--------------|
| Integer       | \`int\` / \`JsonPrimitive(int)\` | Yes          | Yes           | Yes          |
| Long          | \`long\` / \`JsonPrimitive(long)\` | Yes         | Yes           | No           |
| Double        | \`double\` / \`JsonPrimitive(double)\` | Yes      | Yes           | Yes          |
| Boolean       | \`boolean\` / \`JsonPrimitive(bool)\` | Yes       | Yes           | Yes          |
| String        | \`String\` / \`JsonPrimitive(string)\` | Yes      | Yes           | Yes          |
| JsonObject    | \`com.google.gson.JsonObject\` | Yes          | Yes           | No           |
| JsonArray     | \`com.google.gson.JsonArray\`  | Yes          | Yes           | Yes (literal) |
| OMElement     | \`org.apache.axiom.om.OMElement\` | Via XPath  | Yes (type=XML)| No           |
| Null          | Java \`null\` or \`JsonNull\`   | Yes          | Yes           | Yes          |

### Type detection rules:
- \`isNumeric()\` = \`isInteger() || isDouble() || isLong()\`
- \`isNumber()\` in type-check function = \`isInteger() || isDouble()\` (does NOT include Long separately)
- Integer vs Long: JsonPrimitive numbers are classified by whether they fit in Integer.MAX_VALUE
- Double: any JsonPrimitive number containing a decimal point, or Float/Double Java type`,

type_coercion: `## Type Coercion Rules by Operator

### Addition (\`+\`)
| Left Type | Right Type | Result | Notes |
|-----------|------------|--------|-------|
| int       | int        | int    | Auto-promotes to long on overflow via \`Math.addExact\` |
| int       | long       | long   | |
| int       | double     | double | Uses BigDecimal for precision |
| long      | long       | long   | |
| long      | double     | double | |
| double    | double     | double | Uses BigDecimal internally |
| string    | string     | string | String concatenation |
| **any other combination** | | **THROWS** | "Addition between non-numeric values" |

**CRITICAL:** There is NO implicit toString for concatenation. \`\${payload.name + 5}\` will THROW if name is a string and 5 is numeric. Both sides must be the same general type (both numeric or both string).

### Subtraction, Multiplication, Modulo (\`-\`, \`*\`, \`%\`)
| Left Type | Right Type | Result | Notes |
|-----------|------------|--------|-------|
| int       | int        | int    | Multiplication auto-promotes to long on overflow |
| int/long  | long/int   | long   | |
| any numeric | double   | double | BigDecimal precision |
| **non-numeric** | **any** | **THROWS** | "Arithmetic operation between non-numeric values" |

### Division (\`/\`)
| Left Type | Right Type | Result | Notes |
|-----------|------------|--------|-------|
| int       | int        | int IF exact (\`left % right == 0\`), else double | \`7 / 2\` → \`3.5\`, \`6 / 2\` → \`3\` |
| long      | long       | double (always) | Division of longs always returns double |
| any numeric | double   | double | |
| any       | 0          | **THROWS** | "Division by zero" |

### Equality (\`==\`, \`!=\`)
- **Null-safe**: \`null == null\` → true, \`null != null\` → false
- **If both non-null**: compares via \`asString()\` on both sides
- **GOTCHA**: This means \`1 == 1.0\` → **false** (string "1" vs "1.0")
- **GOTCHA**: \`"true" == true\` → **true** (both asString() → "true")
- **GOTCHA**: String-vs-number comparison like \`"abc" == payload.age\` → returns empty string (evaluation exception caught)

### Comparison (\`>\`, \`<\`, \`>=\`, \`<=\`)
- Both sides MUST be numeric (\`isDouble() || isInteger()\`). If either side is non-numeric, it **THROWS** "Comparison between non-numeric values"
- Internally compares as \`double\`
- **GOTCHA**: Cannot compare strings lexicographically. \`\${"abc" > "abd"}\` will THROW.

### Logical (\`and\`/\`&&\`, \`or\`/\`||\`)
- Both sides MUST be boolean. If either side is not boolean, it **THROWS** "Logical operation between non-boolean values"
- **GOTCHA**: No truthy/falsy. \`\${1 and true}\` will THROW. \`\${"text" or false}\` will THROW.
- \`and\` is equivalent to \`&&\`, \`or\` is equivalent to \`||\`

### Conditional/Ternary (\`? :\`)
- Condition MUST evaluate to boolean. If null → THROWS "Condition is null". If non-boolean → THROWS "Condition is not a boolean"
- Only the selected branch is evaluated (short-circuit)
- The two branches can return different types`,

null_handling: `## Null Handling

### Sources of null
- JSON \`null\` in payload → \`JsonNull\` → unboxed to Java \`null\` in PayloadAccessNode
- Undefined variable → throws EvaluationException (NOT null)
- Missing header/property → throws EvaluationException (NOT null)

### Null in operators
| Operation | Behavior |
|-----------|----------|
| \`null == null\` | true |
| \`null != null\` | false |
| \`null == "anything"\` | false |
| \`null + anything\` | THROWS "Null inputs for ADD operation" |
| \`null > 0\` | THROWS "Null inputs for GREATER_THAN operation" |
| \`null and true\` | THROWS "Null inputs for AND operation" |

### Safe null patterns
\`\`\`xml
<!-- Safe: exists() catches all EvaluationExceptions -->
\${exists(payload.field)}
\${not(exists(payload.field))}

<!-- Safe: null equality checks -->
\${payload.field == null}
\${payload.field != null}

<!-- Safe: ternary with exists check -->
\${exists(payload.field) ? payload.field : "default"}

<!-- UNSAFE: will throw if payload.field is null -->
\${payload.field + " suffix"}
\${payload.field > 0}
\`\`\``,

overflow: `## Integer Overflow Protection

- \`int + int\`: uses \`Math.addExact()\` — on overflow, auto-promotes to \`long\`
- \`int * int\`: uses \`Math.multiplyExact()\` — on overflow, auto-promotes to \`long\`
- \`int - int\`: NO overflow protection (uses raw \`int\` subtraction)
- \`long\` operations: NO overflow protection`,

literals: `## Literal Syntax

| Literal Type | Syntax | Examples |
|-------------|--------|----------|
| String      | Double or single quotes | \`"hello"\`, \`'world'\` |
| Number      | Optional \`-\`, digits, optional decimal | \`123\`, \`-5.3\`, \`0.5\` |
| Boolean     | Keywords | \`true\`, \`false\` |
| Null        | Keyword | \`null\` |
| Array       | Bracket notation | \`[1, 2, 3]\`, \`["a", "b"]\`, \`[]\` |

### String escape sequences:
- \`\\b\`, \`\\t\`, \`\\n\`, \`\\f\`, \`\\r\`, \`\\"\`, \`\\'\`, \`\\\\\`, \`\\/\`
- Unicode: \`\\uXXXX\`
- Octal: \`\\NNN\``,

identifiers: `## Identifier Rules

Valid identifiers (for property names, variable names after dot access):
\`[a-zA-Z_][a-zA-Z_0-9-]*\`

**Note:** Hyphens are allowed in identifiers. This means \`vars.my-var\` is valid.
For keys with dots, spaces, or other special characters, use bracket notation: \`vars["my.var"]\`, \`headers["Content-Type"]\`.`,

jsonpath: `## JSONPath Support

Synapse Expressions use jayway JsonPath internally for payload and variable access. Supported JSONPath features:

| Feature | Syntax | Example |
|---------|--------|---------|
| Dot notation | \`$.field\` | \`payload.name\` |
| Bracket notation | \`$["field"]\` | \`payload["first name"]\` |
| Array index | \`$[0]\` | \`payload.items[0]\` |
| Array slice | \`$[start:end:step]\` | \`payload.items[0:3]\` |
| Wildcard | \`$.*\`, \`$[*]\` | \`payload.items[*].name\` |
| Recursive descent | \`$..\` | \`payload..name\` |
| Filter | \`$[?(@.field op value)]\` | \`payload.users[?(@.age >= 18)]\` |
| Multiple indices | \`$[0,2,4]\` | \`payload.items[0,2]\` |

### JSONPath functions (appended to path):
\`length()\`, \`size()\`, \`min()\`, \`max()\`, \`avg()\`, \`sum()\`, \`stddev()\`, \`keys()\`, \`first()\`, \`last()\`

### JSONPath filter operators:
\`in\`, \`nin\`, \`subsetof\`, \`anyof\`, \`noneof\`, \`size\`, \`empty\`, \`=~\` (regex)

### Filter expressions can reference external variables:
\`\`\`xml
\${payload.users[?(@.age >= vars.minAge)]}
\${payload.orders[?(@.customerID == vars.customerId && @.total > params.queryParams.minAmount)]}
\`\`\``,

contexts: `## Expression Contexts

Synapse Expressions can appear in two contexts within XML:

### Attribute-level expressions
Parsed by \`SynapsePathFactory.getSynapsePath()\`. The entire attribute value is a single expression.
\`\`\`xml
<variable name="x" expression="\${payload.value + 1}" type="INTEGER"/>
<filter xpath="\${payload.count > 0}">
<switch source="\${payload.category}">
\`\`\`

### Inline template expressions
Parsed by \`InlineExpressionUtil\`. Multiple expressions can be embedded in text using \`\${...}\` placeholders.
\`\`\`xml
<log><message>User \${payload.name} has \${payload.count} items</message></log>
<throwError type="VALIDATION" errorMessage="Invalid value: \${vars.value}"/>
<payloadFactory media-type="json">
    <format>{"name": \${payload.name}, "total": \${vars.total}}</format>
</payloadFactory>
\`\`\`

**Key difference:** Attribute-level returns a typed result (int, boolean, object, etc.). Inline always converts to string via \`stringValueOf()\`.`,

};

// Full content composed from all sections
export const SYNAPSE_EXPRESSION_SPEC_FULL = Object.values(SYNAPSE_EXPRESSION_SPEC_SECTIONS).join('\n\n---\n\n');
