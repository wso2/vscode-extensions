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
 * Synapse Expression Edge Cases, Anti-Patterns, and Error Catalog
 * Extracted from test files, source code error paths, and evaluator behavior.
 *
 * Section-based exports for granular context loading.
 */

export const SYNAPSE_EDGE_CASES_SECTIONS: Record<string, string> = {

type_gotchas: `## Type-Related Gotchas

### Equality uses string comparison
The \`==\` operator compares via \`asString()\` on both sides:
\`\`\`
1 == 1.0       → false  (string "1" vs "1.0")
true == "true"  → true   (both asString() → "true")
30 == 30        → true   (both asString() → "30")
null == null    → true   (special-cased)
\`\`\`
**Workaround:** When comparing numbers that might be int vs double, convert first:
\`\`\`xml
\${float(vars.intValue) == float(vars.doubleValue)}
\`\`\`

### No implicit type coercion for concatenation
The \`+\` operator only works for numeric+numeric or string+string:
\`\`\`
"Hello " + "World"      → "Hello World"  OK
5 + 3                   → 8              OK
"Count: " + 5           → THROWS         (string + number)
payload.name + 5        → THROWS         (if name is string)
\`\`\`
**Workaround:** Convert to string first:
\`\`\`xml
\${string(payload.name) + string(payload.count)}
\`\`\`
Or use inline template expressions where everything is stringified:
\`\`\`xml
<log><message>Count: \${payload.count}</message></log>
\`\`\`

### Logical operators require strict boolean
No truthy/falsy values. Both sides must be actual boolean.
Both keyword (\`and\`/\`or\`) and symbolic (\`&&\`/\`||\`) forms are valid:
\`\`\`
true and true           → true   OK
true && true            → true   OK
false or true           → true   OK
false || true           → true   OK
1 and true              → THROWS ("Logical operation between non-boolean values")
"text" or false         → THROWS
0 and false             → THROWS
\`\`\`
**Workaround:** Use comparison to produce boolean:
\`\`\`xml
\${payload.count > 0 and payload.active == "true"}
\`\`\`

### Comparison operators are numeric-only
\`>\`, \`<\`, \`>=\`, \`<=\` only work with numeric values:
\`\`\`
5 > 3                   → true   OK
5.0 > 3                 → true   OK
"abc" > "abd"           → THROWS (no string comparison)
"5" > 3                 → THROWS (string vs number)
\`\`\`
**Workaround:** Convert strings to numbers:
\`\`\`xml
\${integer(payload.value) > 10}
\`\`\`

### Ternary condition must be boolean
The condition in \`? :\` must evaluate to an actual boolean, not just truthy:
\`\`\`
true ? "yes" : "no"                          → "yes"  OK
payload.count > 0 ? "has items" : "empty"    → OK
null ? "a" : "b"                             → THROWS ("Condition is null")
1 ? "a" : "b"                                → THROWS ("Condition is not a boolean")
"true" ? "a" : "b"                           → THROWS ("Condition is not a boolean")
\`\`\`

### Integer division behavior
\`\`\`
6 / 2    → 3     (int, exact division)
7 / 2    → 3.5   (double, has remainder)
7.0 / 2  → 3.5   (double, promoted)
1 / 0    → THROWS ("Division by zero")
\`\`\`

### Integer overflow auto-promotion
\`\`\`
2147483647 + 1    → 2147483648 (auto-promoted to long)
2147483647 * 2    → 4294967294 (auto-promoted to long)
2147483647 - 1    → 2147483646 (NO overflow protection for subtraction)
\`\`\``,

null_gotchas: `## Null-Related Gotchas

### JsonNull from payload is unboxed to Java null
When a JSON payload field is \`null\`, the expression engine returns Java \`null\`:
\`\`\`json
{"name": "John", "middle": null}
\`\`\`
\`\`\`
payload.middle          → null (Java null, not the string "null")
payload.middle + "x"    → THROWS ("Null inputs for ADD operation")
payload.middle > 0      → THROWS
length(payload.middle)  → THROWS ("Null source value")
\`\`\`

### Safe null check patterns
\`\`\`xml
<!-- BEST: exists() catches all evaluation exceptions -->
\${exists(payload.field) ? payload.field : "default"}

<!-- SAFE: null equality -->
\${payload.field == null}
\${payload.field != null}

<!-- SAFE: not(exists()) for negation -->
\${not(exists(payload.field))}

<!-- UNSAFE: will throw WARN if field is truly null -->
\${payload.field == null or payload.field == ""}
<!-- Use instead: -->
\${not(exists(payload.field))}
\`\`\`

### Undefined vs null
- Accessing an undefined JSON field → throws PathNotFoundException → evaluation fails
- Accessing a null JSON field → returns null → downstream operations throw
- Accessing an undefined variable → throws "Variable X is not defined"
- Missing header/property → throws "Could not fetch the value"

### exists() is the only safe guard
\`exists()\` is unique — it wraps the entire evaluation in a try-catch:
\`\`\`java
try {
    result = expression.evaluate(context, isObjectValue);
    return result != null ? true : false;
} catch (EvaluationException e) {
    return false;  // ANY error → false
}
\`\`\`
This means \`exists()\` returns false for:
- Null values
- Undefined fields
- Undefined variables
- Type errors
- Any other evaluation failure`,

xml_escaping: `## XML Escaping Gotchas

### XML attribute escaping
Inside XML attribute values, these characters MUST be escaped:
\`\`\`
&   → &amp;
<   → &lt;
>   → &gt;
"   → &quot;   (inside double-quoted attributes)
\`\`\`

### Synapse expressions in XML attributes
\`\`\`xml
<!-- Comparison operators need XML escaping in attributes -->
<variable name="isAdult" expression="\${payload.age &gt; 18}" type="BOOLEAN"/>
<variable name="check" expression="\${payload.a &gt;= 5 &amp;&amp; payload.b &lt; 10}" type="BOOLEAN"/>

<!-- In text nodes (like log message), no escaping needed -->
<log><message>\${payload.age > 18}</message></log>
\`\`\`

### XPath inside Synapse Expressions
When using \`xpath()\` function inside XML:
- Use \`&quot;\` as the outer xpath string delimiter
- Use single quotes \`'\` inside XPath string literals
- Do NOT escape single quotes as \`\\'\`
\`\`\`xml
<!-- Correct -->
<variable name="val" expression="\${xpath(&quot;string($body//*[local-name()='Element'])&quot;)}" type="STRING"/>

<!-- WRONG: nested quotes -->
<variable name="val" expression="\${xpath("string($body//*[local-name()='Element'])")}" type="STRING"/>

<!-- WRONG: escaped single quotes -->
<variable name="val" expression="\${xpath(&quot;string($body//*[local-name()=\\'Element\\'])&quot;)}" type="STRING"/>
\`\`\`

### Do NOT nest functions around xpath()
Complex transformations should be split into separate steps:
\`\`\`xml
<!-- WRONG: nested function around xpath -->
<variable name="val" expression="\${trim(xpath(&quot;string($body//Element)&quot;))}" type="STRING"/>

<!-- CORRECT: extract first, then transform -->
<variable name="raw" expression="\${xpath(&quot;string($body//Element)&quot;)}" type="STRING"/>
<variable name="val" expression="\${trim(vars.raw)}" type="STRING"/>
\`\`\``,

expression_context: `## Expression Context Gotchas

### Payload after SOAP call is JSON
After a \`call\` mediator to a SOAP service, \`\${payload}\` returns JSON (auto-converted by the runtime):
\`\`\`xml
<!-- SOAP response: <m:Response><m:Result>value</m:Result></m:Response> -->
<!-- After call, payload is JSON: {"Response":{"Result":"value"}} -->

<!-- CORRECT: use JSON paths -->
<variable name="result" expression="\${payload.Response.Result}" type="STRING"/>

<!-- WRONG: will fail because payload is JSON, not XML -->
<variable name="result" expression="\${xpath(&quot;//Result/text()&quot;)}" type="STRING"/>
\`\`\`

### Don't store JSON payload as XML variable type
\`\`\`xml
<!-- WRONG: payload after call is JSON. type="XML" will throw WstxUnexpectedCharException -->
<variable name="resp" expression="\${payload}" type="XML"/>

<!-- CORRECT: store as JSON -->
<variable name="resp" expression="\${payload}" type="JSON"/>
\`\`\`

### Filter expressions reference current element with @
In JSONPath filter expressions, \`@\` refers to the current array element:
\`\`\`xml
\${payload.users[?(@.age >= 18)]}                <!-- Filter by age -->
\${payload.users[?(@.active == true)]}            <!-- Filter by boolean field -->
\${payload.orders[?(@.total > vars.minAmount)]}   <!-- Reference external variable -->
\`\`\`

### Map variables use Map.get() for first level
When a variable holds a Map (common with connector outputs), the first level access uses Java Map API, not JSONPath:
\`\`\`xml
<!-- If vars.result = Map{headers=..., payload=..., attributes=Map{statusCode=201}} -->
\${vars.result.attributes.statusCode}
<!-- Resolves as: Map.get("attributes") → then JSONPath $.statusCode on that value -->

<!-- If the key doesn't exist in the Map, throws: -->
<!-- "Could not find key: {key} in the variable" -->
\`\`\`

### Headers and properties auto-parse to numbers
If a header value is "200", \`\${headers["Content-Length"]}\` returns integer 200, not string "200". This auto-parsing happens for all headers, properties, params, and configs. The engine tries int → long → double → string.

### Variable bracket notation for special characters
\`\`\`xml
<!-- Dots, spaces, and special chars in keys need bracket notation -->
\${vars["my.variable"]}        <!-- Key contains dot -->
\${vars["first name"]}          <!-- Key contains space -->
\${headers["Content-Type"]}     <!-- Hyphen in header name -->
\${payload["field-name"]}       <!-- Hyphen in JSON key -->
\`\`\``,

payload_factory_gotchas: `## PayloadFactory-Specific Gotchas

### NEVER use args with Synapse Expressions
\`\`\`xml
<!-- WRONG: args only accepts XPath, not \${...} expressions -->
<payloadFactory media-type="json">
    <format>{"value": $1}</format>
    <args>
        <arg expression="\${payload.value}"/>  <!-- FAILS at runtime -->
    </args>
</payloadFactory>

<!-- CORRECT: embed expressions directly in format -->
<payloadFactory media-type="json">
    <format>{"value": \${payload.value}}</format>
</payloadFactory>
\`\`\`

### JSON string values need quotes in format
\`\`\`xml
<payloadFactory media-type="json">
    <format>
    {
        "name": "\${payload.name}",
        "count": \${payload.count},
        "active": \${payload.active},
        "items": \${payload.items}
    }
    </format>
</payloadFactory>
\`\`\`
- String values: wrap expression in quotes: \`"\${expr}"\`
- Number/boolean/null values: no quotes: \`\${expr}\`
- Object/array values: no quotes: \`\${expr}\`

### XML payload factory
For XML payloads containing special characters or dynamic content:
\`\`\`xml
<payloadFactory media-type="xml">
    <format>
        <root>
            <name>\${payload.name}</name>
            <value>\${vars.computed}</value>
        </root>
    </format>
</payloadFactory>
\`\`\``,

error_catalog: `## Common Error Messages → Causes

| Error Message | Cause | Fix |
|--------------|-------|-----|
| "Addition between non-numeric values" | Using \`+\` with string and number | Convert both to same type, or use inline template |
| "Comparison between non-numeric values" | Using \`>\`/\`<\` with strings | Convert to numeric first: \`integer(x) > 5\` |
| "Logical operation between non-boolean values" | Using \`and\`/\`or\` with non-boolean | Ensure both sides are boolean expressions |
| "Condition is not a boolean" | Ternary \`?\` with non-boolean condition | Condition must be a comparison or boolean variable |
| "Condition is null" | Ternary \`?\` where condition evaluates to null | Add \`exists()\` check |
| "Null inputs for X operation" | Using arithmetic/comparison with null | Check with \`exists()\` first |
| "Variable X is not defined" | Accessing unset variable | Set variable first or use \`exists()\` |
| "Payload is empty" | Accessing payload when there's no body | Check payload exists before access |
| "Could not fetch the value of the key" | Missing header/property/param | Verify the header/property is set |
| "Invalid index for subString" | subString index out of bounds | Validate string length before calling |
| "Division by zero" | Dividing by zero | Check divisor before division |
| "Could not evaluate JSONPath expression on non-JSON variable value" | Using JSONPath on XML variable | Use \`xpath()\` instead, or store as JSON |
| "Value : X cannot be converted to int/double/boolean" | Type conversion failure | Verify value type before conversion |
| "Invalid function: X with N arguments" | Wrong number of arguments | Check function signature in reference |`,

validated_patterns: `## Validated Complex Patterns (from test suite)

These patterns are confirmed to work correctly:

### Arithmetic with payload and variables
\`\`\`xml
\${payload.age + vars.num1}                <!-- int + int -->
\${payload.age - vars.num2}                <!-- int - int -->
\${payload.age * vars.num2}                <!-- int * int -->
\${payload.age / vars.num2}                <!-- int / int → may return double -->
\${payload.age + vars.num1 * vars.num2}    <!-- Precedence: * before + -->
\${(payload.age + vars.num1) * vars.num2}  <!-- Override precedence with parens -->
\`\`\`

### Complex filter expressions
\`\`\`xml
\${payload.store.book[?(@.price < 10)]}
\${payload.store.book[?(@.isbn)]}                           <!-- Filter by existence -->
\${payload.store.book[?(@.price < 10 && @.category == "fiction")]}
\${length(payload.store.book[?(@.price < 10)])}             <!-- Count filtered results -->
\`\`\`

### Array operations
\`\`\`xml
\${payload.cars[0]}                       <!-- First element -->
\${payload.cars[payload.index]}           <!-- Dynamic index -->
\${payload.cars[vars.num1 - vars.num2]}   <!-- Computed index -->
\${payload.store.book[0:2]}               <!-- Array slice -->
\${payload.store.book[-1:]}               <!-- Last element -->
\`\`\`

### Nested ternary
\`\`\`xml
\${payload.age > 18 ? "adult" : payload.age > 12 ? "teen" : "child"}
\`\`\`

### Variable with JSONPath
\`\`\`xml
\${vars.data.store.book[0].title}          <!-- JSON variable with deep access -->
\${vars.response.payload.items[?(@.active == true)]}  <!-- Map variable with filter -->
\`\`\`

### String operations chained with payload
\`\`\`xml
\${toUpper(payload.name)}
\${length(payload.string)}
\${trim(payload.string)}
\${replace(payload.name, "John", "Jane")}
\${subString(payload.name, 0, 3)}
\`\`\`

### Combining exists with ternary
\`\`\`xml
\${exists(payload.optional) ? payload.optional : "default"}
\${exists(vars.cached) ? vars.cached : payload.computed}
\${not(exists(vars.error)) ? "success" : vars.error}
\`\`\`

### Encoding/decoding
\`\`\`xml
\${base64encode(payload.data)}
\${base64decode(vars.encoded)}
\${urlEncode(payload.query)}
\${urlDecode(params.queryParams.search)}
\`\`\``,

anti_patterns: `## Anti-Patterns to Avoid

### Don't use outSequence
\`\`\`xml
<!-- WRONG: deprecated -->
<api><resource><outSequence>...</outSequence></resource></api>

<!-- CORRECT: use inSequence with call + respond -->
<api><resource><inSequence>
    <call>...</call>
    <respond/>
</inSequence></resource></api>
\`\`\`

### Don't use property mediator for new code
\`\`\`xml
<!-- WRONG: deprecated -->
<property name="x" expression="..." scope="default"/>

<!-- CORRECT: use variable -->
<variable name="x" expression="\${...}" type="STRING"/>
\`\`\`

### Don't use log level/property children
\`\`\`xml
<!-- WRONG: deprecated -->
<log level="custom">
    <property name="msg" expression="get-property('name')"/>
</log>

<!-- CORRECT: use category + message -->
<log category="INFO">
    <message>Name: \${vars.name}</message>
</log>
\`\`\`

### Don't use clone mediator
\`\`\`xml
<!-- WRONG: deprecated -->
<clone>...</clone>

<!-- CORRECT: use scatter-gather -->
<scatter-gather parallel-execution="true" target="Body" result-content-type="JSON">
    <aggregation expression="\${payload}"/>
    <sequence>...</sequence>
    <sequence>...</sequence>
</scatter-gather>
\`\`\`

### Don't use try-catch pattern (doesn't exist)
\`\`\`xml
<!-- WRONG: no try-catch in Synapse -->
<try>...</try><catch>...</catch>

<!-- CORRECT: use faultSequence for error handling -->
<resource methods="POST">
    <inSequence>...</inSequence>
    <faultSequence>
        <log category="ERROR"><message>Error: \${props.synapse.ERROR_MESSAGE}</message></log>
        <payloadFactory media-type="json">
            <format>{"error": "\${props.synapse.ERROR_MESSAGE}"}</format>
        </payloadFactory>
        <respond/>
    </faultSequence>
</resource>
\`\`\`

### Don't use multi-line expressions
Synapse expressions are strictly single-line:
\`\`\`xml
<!-- WRONG: multi-line expression -->
<variable name="x" expression="\${
    payload.value > 0 ?
    payload.value :
    0
}" type="INTEGER"/>

<!-- CORRECT: single line -->
<variable name="x" expression="\${payload.value > 0 ? payload.value : 0}" type="INTEGER"/>
\`\`\``,

};

// Full content composed from all sections
export const SYNAPSE_EDGE_CASES_FULL = Object.values(SYNAPSE_EDGE_CASES_SECTIONS).join('\n\n---\n\n');
