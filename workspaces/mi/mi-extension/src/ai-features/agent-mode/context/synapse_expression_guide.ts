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

export const SYNAPSE_EXPRESSION_GUIDE = `
### **Introduction to Synapse Expressions**
Synapse Expressions is a powerful, **single-line expression language** designed for WSO2 Synapse to replace JSONPath. Unlike JSONPath, which is limited to extracting JSON data, Synapse Expressions allows arithmetic, logical, and comparison operations while providing access to various system elements such as payloads, headers, properties, registry content, and secrets.

#### **Syntax & Basic Structure**
- Synapse Expressions are enclosed within **\`\${}\`**.
- In attribute-level contexts (e.g., \`expression="..."\`), Synapse Expressions return typed results (int, boolean, JsonObject, etc.). In inline template contexts (e.g., inside \`<message>\` or \`<format>\`), expressions are stringified automatically.
- When working with XML payloads, use the \`xpath()\` function which evaluates an XPath expression against the message context. Node selections return XML/node sets, while wrapping with \`string()\`, \`number()\`, or \`boolean()\` returns scalar values (e.g., \`xpath(string(...))\`).
- Literals are supported in Synapse expressions: 
  - String literals: \`"Hello World"\`
  - Number literals: \`123.4\`
  - Boolean literals: \`true\` or \`false\`
  - Null literal: \`null\`
  - Array literal: \`[1, 2, 3]\`, \`["a", "b"]\`, \`[]\`
- Basic Example:
  \`\`\`xml
  <log category="INFO">
      <message>Hello \${payload.user.name}</message>
  </log>
  \`\`\`
  
---
#### Key Concepts
Now every synapse mediation has 6 global variables ( payload, vars, headers, properties, params, configs).

- payload : This is the message payload. It is always a valid JSON element. ( Object, array, string, number, boolean, null). Example of accessing payload using Synapse expressions.
  \`\`\`xml
  \${payload.students}
  \${$.orders}
  \${payload.user["first name"]}  <!-- Bracket notation for special keys -->
  \`\`\`
- vars: These are variables defined using the new variable mediator or outputs of connector operations. Example of accessing variables using Synapse expressions.
  \`\`\`xml
  \${vars.name}
  \${vars["last name"]} <!-- If you have special characters in the key. Ex: spaces, . -->
  \${vars["last.name"]}
  \`\`\`
- params: These are query parameters, path parameters and function parameters.

  - Example of accessing query and path parameters using Synapse expressions.
    \`\`\`xml
    \${params.queryParams.userId}
    \${params.pathParams.userId}
    \`\`\`

  - Example of accessing function parameters within a  sequence template.
    \`\`\`xml
      <template name="WelcomeTemplate" xmlns="http://ws.apache.org/ns/synapse">
          <parameter isMandatory="true" name="firstName"/>
          <parameter isMandatory="true" name="lastName"/>
          <sequence>
              <log><message>
                  Welcome \${params.functionParams.firstName}  \${params.functionParams.lastName}
              </message></log>
          </sequence>
      </template>
    \`\`\`

- headers : These are transport headers. Example of accessing headers using Synapse expressions.
  \`\`\`xml
  \${headers["Content-Type"]}
  \`\`\`

- properties: We can access synapse and axis2 properties using Synapse expressions. \`properties\` and \`props\` are interchangeable aliases:
  \`\`\`xml
  \${properties.synapse.propName}
  \${properties.axis2.propName}
  \`\`\`
    - Example of getting REST method from synapse properties.
    \`\`\`xml
    \${properties.synapse.REST_METHOD}
    \`\`\`
- configs: We can access the configurations defined in the synapse.properties file using Synapse expressions as follows.
  \`\`\`xml
  \${configs.configName}
  \`\`\`
---

You can do the following operations with Synapse Expressions
#### **Arithmetic Operations**
\`\`\`xml
\${vars.num1 + vars.num2}
\${vars.num1 - vars.num2}
\${vars.num1 * vars.num2}
\${vars.num1 / vars.num2}
\${vars.num1 % vars.num2}
\`\`\`
#### **Boolean Operations**
\`\`\`xml
\${vars.age > 18}
\${vars.age < 18}
\${vars.age >= 18}
\${vars.age <= 18}
\${vars.age != 18}
\${vars.score == 100}
\`\`\`
#### **Logical Operations**
\`\`\`xml
\${vars.active and vars.verified}
\${vars.isAdmin or vars.isModerator}
\${not(vars.isAdmin)}  <!-- Negation function. Argument MUST be boolean; throws otherwise. -->
\`\`\`
- When using operators, it's possible to use brackets to group expressions and enforce precedence.
\`\`\`xml
\${(vars.num1 + 5) > vars.num2 && (vars.num3 - 3) < vars.num4}
\`\`\`
#### **Conditional (Ternary Operator)**
\`\`\`xml
\${vars.age > 18 ? "Adult" : "Child"}
\`\`\`

#### **Accessing Arrays**
\`\`\`xml
\${payload.students[0].name}
\`\`\`
#### **String Operations**
- String concatenation
\`\`\`xml
\${payload.string1 + payload.string2}
\`\`\`
---

#### You can use following functions in Synapse Expressions
##### **String Manipulation**
- All string operations available: length, toUpper, toLower, subString, startsWith, endsWith, contains, trim, replace, split, charAt, indexOf
\`\`\`xml
\${length("text")} <!-- Returns string length. Also works on arrays: length(payload.items) -->
\${contains("hello world", "world")} <!-- Returns true if string contains the substring -->
\${toUpper(payload.name)} <!-- Converts the provided string to uppercase. -->
\${toLower("TEXT")} <!-- Converts the provided string to lowercase. -->
\${replace("hello world", "world", "WSO2")} <!-- Replaces all occurrences of the specified old value with the new value in the string. -->
\${subString(payload.value, 2)} <!-- Extracts a substring from the input string starting from the specified index. Specify an end index as third parameter to extract up to that position. -->
\${startsWith("text", "te")} <!-- Checks if the string starts with the specified prefix. -->
\${endsWith("text", "xt")} <!-- Checks if the string ends with the specified suffix. -->
\${trim("  text  ")} <!-- Removes leading and trailing whitespace from the string. -->
\${split("a,b,c", ",")} <!-- Splits the string into an array using the specified delimiter. -->
\${charAt("text", 1)} <!-- Returns the character at the specified index. -->

\${indexOf("text", "e")} <!-- Returns the position of the first occurrence of the specified input in the string. Specify a starting index as the third parameter (indexOf search begins after this position). -->
\${indexOf(payload.value, "text", 5)}
\`\`\`

##### **Math Functions**
- All math functions available: abs, floor, ceil, sqrt, log, pow, round
\`\`\`xml
\${abs(-5)} <!-- Returns the absolute value of the input. -->
\${floor(3.7)} <!-- Returns the largest integer less than or equal to the input value. -->
\${ceil(3.2)} <!-- Returns the smallest integer greater than or equal to the input value. -->
\${sqrt(16)} <!-- Returns 4 -->
\${log(10)} <!-- Returns log base 10. log(x, base) for custom base. -->
\${pow(2, 3)} <!-- Returns the result of raising the base to the power of the exponent. -->
\${round(2.756, 2)} <!-- Returns 2.76 -->
\`\`\`

##### Encoding & Decoding
- All encoding and decoding functions available: base64Encode, base64Decode, urlEncode, urlDecode
\`\`\`xml
\${base64Encode("Hello World")}
\${urlEncode("Hello World")}
\`\`\`

##### **Type checking**
- All type checking functions available: isString, isNumber, isArray, isObject, isBoolean
\`\`\`xml
\${isNumber(vars.amount) ? vars.amount * 2 : 0}
\`\`\`

##### **Type Conversion**
- All type conversion functions available: integer, float, boolean, string, object, array
\`\`\`xml
\${integer(payload.value)}
\${boolean(payload.status)}
\`\`\`

##### **Registry functions**
- Accesses the registry value at the specified path
\`\`\`xml
\${registry("gov:/config/service")}
\${registry(payload.path)}
\`\`\`

- Accesses the registry property at the specified path with the provided key.
\`\`\`xml
\${registry("gov:/config/service").property("key")}
\${registry(payload.path).property("key")}
\`\`\`

- Accesses the JSON payload inside the registry resource at the specified path. Supported only for JSON resources in registry.
\`\`\`xml
\${registry("gov:/config/resource").student.name}
\${registry(payload.path).student.name}
\`\`\`

##### **Date & Time Functions**
- All date functions available: now, formatDateTime
\`\`\`xml
\${now()} <!-- Returns timestamp -->
\${formatDateTime(now(), "yyyy-MM-dd")}
\`\`\`

##### **Check exists**
\`\`\`xml
\${exists(payload.value)}
\`\`\`

##### **Accessing Secrets**
\`\`\`xml
\${wso2-vault("mysqlpassword")}
\${hashicorp-vault("pathName","fieldName")}
\`\`\`

---

#### Synapse Expressions support JSONPath-style filtering:
\`\`\`xml
\${payload.users[?(@.age >= 18)]}
\${payload.users[?(@.age >= vars.minAge)]}
\`\`\`

---

#### When you need to work with xpath expressions, you can use the xpath function. It outputs the result of the xpath expression.
\`\`\`xml
\${xpath("//student/text()")}
\${xpath("//a:parent/b:child/a:value/text()")}
\`\`\`

---

#### **Critical Expression Gotchas**
These rules frequently cause runtime errors. Always apply them:
1. **No implicit type coercion for \`+\`**: \`"Count: " + 5\` THROWS. Both sides must be the same type (both numeric or both string). Use \`string()\` to convert, or use inline template expressions (e.g., \`<message>\`) where everything is auto-stringified.
2. **\`==\` compares string representations**: \`1 == 1.0\` → false (\`"1"\` vs \`"1.0"\`). \`true == "true"\` → true. Use \`float()\` conversion for cross-type numeric comparison.
3. **Logical operators require strict boolean**: \`1 and true\` THROWS. \`"text" or false\` THROWS. No truthy/falsy. Both sides must evaluate to actual booleans.
4. **Comparison operators (\`>\`, \`<\`, \`>=\`, \`<=\`) are numeric-only**: \`"abc" > "abd"\` THROWS. Convert strings to numbers first: \`integer(payload.value) > 10\`.
5. **\`exists()\` is the ONLY safe null guard**: It catches all evaluation exceptions. Use \`\${exists(payload.field) ? payload.field : "default"}\` for safe access. \`not(exists(x))\` is safer than \`x == null\`.
6. **Ternary condition must be boolean**: \`null ? "a" : "b"\` THROWS. \`1 ? "a" : "b"\` THROWS. The condition must be a comparison or boolean variable.
7. **After SOAP \`call\`, payload is JSON**: \`\${payload}\` returns JSON (auto-converted). Use JSON paths, not XPath. Storing as \`type="XML"\` throws \`WstxUnexpectedCharException\`.
8. **PayloadFactory: NEVER use \`<args>\` with Synapse Expressions**: \`<arg expression="\${...}"/>\` fails at runtime. Embed expressions directly in \`<format>\`.

#### **Best Practices**
1. **Check for Nulls**: \`\${exists(vars.x) ? vars.x : "default"}\`
2. **Use Brackets for Clarity**: \`\${(vars.num1 + vars.num2) * vars.num3}\`
3. **Validate Data Types**: \`\${isNumber(vars.amount) ? vars.amount * 2 : 0}\`

#### XPath in Synapse Expressions — Rules

1. **Do not escape single quotes as \`\\'\`** in XML attributes. In a double-quoted XML attribute, plain single quotes are valid.

2. **Use opposite quote types in \`xpath()\`**:
   - Use \`&quot;...&quot;\` as the outer xpath string and single quotes inside XPath literals.
   - Correct example:
   \`\`\`xml
   <variable name="customerId" expression="\${xpath(&quot;string($body//*[local-name()='CustomerId'])&quot;)}" type="STRING"/>
   \`\`\`

3. **Avoid nested function calls around \`xpath()\`**. Extract first, then transform:
   \`\`\`xml
   <variable name="rawValue" expression="\${xpath(&quot;string($body//*[local-name()='Element'])&quot;)}" type="STRING"/>
   <variable name="cleanValue" expression="\${trim(vars.rawValue)}" type="STRING"/>
   \`\`\`

4. **SOAP response XPath**: use \`$body\` context with \`string()\` for reliable text extraction.

5. **Null checks in filter**: prefer \`\${not(exists(vars.x))}\` over \`\${vars.x == null or vars.x == ''}\` to avoid WARNs on truly null values.

#### Where can you use Synapse Expressions?
- You can use synapse expressions literally anywhere in the synapse configuration to provide dynamic inputs.
- Example with redis connector
\`\`\`xml
<redis.put configKey="RedisConfig">
    <key>\${vars.key}</key>
    <value>\${payload.value}</value>
</redis.put>
\`\`\`

#### What can't you do with Synapse Expressions?
- Synapse expressions are single line expressions and do not support multi-line expressions.
- Therefore, never add multiple lines of code inside \${}.
`;
