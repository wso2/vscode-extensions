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
 * Complete Synapse Expression Function Reference
 * Extracted from: PredefinedFunctionNode.java and ExpressionConstants.java
 *
 * Section-based exports for granular context loading.
 */

export const SYNAPSE_FUNCTION_REFERENCE_SECTIONS: Record<string, string> = {

general_rules: `## General Rules
- All functions throw \`EvaluationException\` on null arguments (except \`exists()\`).
- Function names are case-sensitive and must match exactly.
- Functions can accept 0 to 3 arguments depending on the overload.
- Arguments are evaluated eagerly (left to right) before the function executes (except \`exists()\`).`,

string: `## String Functions

### length(source)
- **Accepts:** string → returns string length (int). array → returns array size (int).
- **Throws:** if argument is not a string or array.
\`\`\`xml
\${length("hello")}        <!-- 5 -->
\${length(payload.items)}  <!-- array size -->
\`\`\`

### toUpper(source)
- **Accepts:** string or JsonPrimitive(string) → returns uppercase string.
- **Throws:** if argument is not string-like.
\`\`\`xml
\${toUpper("hello")}         <!-- "HELLO" -->
\${toUpper(payload.name)}    <!-- uppercase of payload field -->
\`\`\`

### toLower(source)
- **Accepts:** string or JsonPrimitive(string) → returns lowercase string.
- **Throws:** if argument is not string-like.
\`\`\`xml
\${toLower("HELLO")}         <!-- "hello" -->
\`\`\`

### trim(source)
- **Accepts:** string only → returns trimmed string.
- **Throws:** if argument is not a string.
\`\`\`xml
\${trim("  hello  ")}       <!-- "hello" -->
\`\`\`

### subString(source, startIndex) — 2-arg
- **Accepts:** source=string, startIndex=integer → returns substring from startIndex to end.
- **Throws:** if startIndex < 0 or startIndex > string length, or if types are wrong.
\`\`\`xml
\${subString("hello", 2)}    <!-- "llo" -->
\`\`\`

### subString(source, startIndex, endIndex) — 3-arg
- **Accepts:** source=string, startIndex=integer, endIndex=integer → returns substring [startIndex, endIndex).
- **Throws:** if startIndex < 0, endIndex < 0, startIndex > endIndex, or endIndex > string length.
\`\`\`xml
\${subString("hello", 1, 4)}  <!-- "ell" -->
\`\`\`

### startsWith(source, prefix)
- **Accepts:** both must be strings → returns boolean.
- **Throws:** if either argument is not a string.
\`\`\`xml
\${startsWith("hello", "hel")}  <!-- true -->
\`\`\`

### endsWith(source, suffix)
- **Accepts:** both must be strings → returns boolean.
- **Throws:** if either argument is not a string.
\`\`\`xml
\${endsWith("hello", "llo")}   <!-- true -->
\`\`\`

### contains(source, search)
- **Accepts:** both must be strings → returns boolean.
- **Throws:** if either argument is not a string.
\`\`\`xml
\${contains("hello world", "world")}  <!-- true -->
\`\`\`

### replace(source, oldValue, newValue) — 3-arg only
- **Accepts:** all three must be strings → returns string with ALL occurrences replaced.
- **Throws:** if any argument is not a string.
- **Note:** Uses Java \`String.replace()\` (literal replacement, NOT regex).
\`\`\`xml
\${replace("hello world", "world", "WSO2")}  <!-- "hello WSO2" -->
\`\`\`

### split(source, delimiter)
- **Accepts:** both must be strings → returns JsonArray of strings.
- **Throws:** if either argument is not a string.
- **Note:** delimiter is a regex (Java \`String.split()\`).
\`\`\`xml
\${split("a,b,c", ",")}  <!-- ["a","b","c"] -->
\`\`\`

### indexOf(source, search) — 2-arg
- **Accepts:** both must be strings → returns integer (position of first occurrence, -1 if not found).
- **Throws:** if either argument is not a string.
\`\`\`xml
\${indexOf("hello", "ll")}  <!-- 2 -->
\`\`\`

### indexOf(source, search, fromIndex) — 3-arg
- **Accepts:** source=string, search=string, fromIndex=integer → returns integer.
- **Throws:** if types don't match.
- **Note:** Search begins AFTER fromIndex position.
\`\`\`xml
\${indexOf("hello hello", "hello", 1)}  <!-- 6 -->
\`\`\`

### charAt(source, index)
- **Accepts:** source=string, index=integer → returns single character as string.
- **Throws:** if index is out of bounds or types are wrong.
\`\`\`xml
\${charAt("hello", 1)}  <!-- "e" -->
\`\`\``,

math: `## Math Functions

### abs(source)
- **Accepts:** integer → returns int. double → returns double.
- **Throws:** if argument is not numeric.
\`\`\`xml
\${abs(-5)}     <!-- 5 -->
\${abs(-3.14)}  <!-- 3.14 -->
\`\`\`

### ceil(source)
- **Accepts:** integer → returns same int (no-op). double → returns double (Math.ceil).
- **Throws:** if argument is not numeric.
- **Note:** Returns double even when the result is a whole number (e.g., ceil(3.0) → 3.0).
\`\`\`xml
\${ceil(3.2)}  <!-- 4.0 -->
\${ceil(5)}    <!-- 5 -->
\`\`\`

### floor(source)
- **Accepts:** integer → returns same int (no-op). double → returns double (Math.floor).
- **Throws:** if argument is not numeric.
\`\`\`xml
\${floor(3.7)}  <!-- 3.0 -->
\`\`\`

### round(source) — 1-arg
- **Accepts:** double → returns int (Math.round). integer → returns same int.
- **Throws:** if argument is not numeric.
\`\`\`xml
\${round(2.5)}  <!-- 3 -->
\`\`\`

### round(source, decimalPlaces) — 2-arg
- **Accepts:** source=double, decimalPlaces=integer (must be > 0) → returns double rounded to N decimal places.
- **Throws:** if source is not double, or decimalPlaces is not a positive integer.
- **Note:** Integer/long inputs are returned as-is (no rounding needed).
\`\`\`xml
\${round(2.756, 2)}  <!-- 2.76 -->
\`\`\`

### sqrt(source)
- **Accepts:** integer or double → returns double.
- **Throws:** if argument is not numeric.
\`\`\`xml
\${sqrt(16)}    <!-- 4.0 -->
\${sqrt(2.0)}   <!-- 1.4142... -->
\`\`\`

### log(source) — 1-arg
- **Accepts:** integer or double → returns double.
- **IMPORTANT:** This is log base 10 (\`Math.log10\`), NOT natural log.
- **Throws:** if argument is not numeric.
\`\`\`xml
\${log(100)}   <!-- 2.0 -->
\${log(10)}    <!-- 1.0 -->
\`\`\`

### log(source, base) — 2-arg
- **Accepts:** both must be numeric (integer or double) → returns double (custom base logarithm).
- **Formula:** \`Math.log(source) / Math.log(base)\` (change of base formula).
- **Throws:** if either argument is not numeric.
\`\`\`xml
\${log(8, 2)}   <!-- 3.0 -->
\`\`\`

### pow(base, exponent)
- **Accepts:** both must be numeric (integer or double) → returns double.
- **Throws:** if either argument is not numeric.
\`\`\`xml
\${pow(2, 3)}   <!-- 8.0 -->
\`\`\``,

encoding: `## Encoding & Decoding Functions

### base64encode(source) — 1-arg
- **Accepts:** string → returns base64 encoded string (uses default charset).
- **Throws:** if argument is not a string.
\`\`\`xml
\${base64encode("Hello World")}
\`\`\`

### base64encode(source, charset) — 2-arg
- **Accepts:** source=string, charset=string → returns base64 encoded string with specified charset.
- **Throws:** if types are wrong or charset is unsupported.
\`\`\`xml
\${base64encode("Hello", "UTF-8")}
\`\`\`

### base64decode(source)
- **Accepts:** string → returns decoded string.
- **Throws:** if argument is not a string.
\`\`\`xml
\${base64decode("SGVsbG8gV29ybGQ=")}  <!-- "Hello World" -->
\`\`\`

### urlEncode(source) — 1-arg
- **Accepts:** string → returns URL-encoded string (UTF-8).
- **Note:** Replaces \`+\` with \`%20\` and \`*\` with \`%2A\` (RFC 3986 compliance).
- **Throws:** if argument is not a string.
\`\`\`xml
\${urlEncode("hello world")}  <!-- "hello%20world" -->
\`\`\`

### urlEncode(source, charset) — 2-arg
- **Accepts:** source=string, charset=string → returns URL-encoded string.
- **Note:** The \`+\` → \`%20\` and \`*\` → \`%2A\` replacement only happens when charset is "UTF-8".
- **Throws:** if types are wrong or charset is unsupported.

### urlDecode(source)
- **Accepts:** string → returns URL-decoded string (UTF-8).
- **Throws:** if argument is not a string.
\`\`\`xml
\${urlDecode("hello%20world")}  <!-- "hello world" -->
\`\`\``,

type_check: `## Type Checking Functions

### isString(source)
- Returns \`true\` if value is a Java String or JsonPrimitive string.

### isNumber(source)
- Returns \`true\` if value is integer OR double (\`isInteger() || isDouble()\`).
- **Note:** Does NOT separately check for long.

### isArray(source)
- Returns \`true\` if value is a JsonArray, or a string/JsonPrimitive that can be parsed as a JSON array.

### isObject(source)
- Returns \`true\` if value is a JsonObject, or a string/JsonPrimitive that can be parsed as a JSON object.`,

type_convert: `## Type Conversion Functions

### string(source)
- Converts any value to its string representation via \`asString()\`.
- **Note:** Removes surrounding quotes from already-quoted strings.

### integer(source)
- If already integer → returns as-is.
- Otherwise → calls \`Integer.parseInt(source.asString())\`.
- **Throws:** NumberFormatException if string cannot be parsed as integer.
\`\`\`xml
\${integer("42")}       <!-- 42 -->
\${integer(payload.id)} <!-- integer from payload -->
\`\`\`

### float(source)
- If already double → returns as-is.
- Otherwise → calls \`Double.parseDouble(source.asString())\`.
- **Throws:** NumberFormatException if string cannot be parsed as double.
\`\`\`xml
\${float("3.14")}  <!-- 3.14 -->
\`\`\`

### boolean(source)
- If already boolean → returns as-is.
- Otherwise → calls \`Boolean.parseBoolean(source.asString())\`.
- **Note:** Boolean.parseBoolean returns \`true\` only for string "true" (case-insensitive). Everything else returns \`false\`. It NEVER throws.
\`\`\`xml
\${boolean("true")}    <!-- true -->
\${boolean("false")}   <!-- false -->
\${boolean("yes")}     <!-- false (not "true") -->
\${boolean("1")}       <!-- false -->
\`\`\`

### object(source)
- If already a JsonObject → returns as-is.
- **Throws:** if value cannot be converted to a JSON object.

### array(source)
- If already a JsonArray → returns as-is.
- **Throws:** if value cannot be converted to a JSON array.`,

datetime: `## Date & Time Functions

### now()
- **No arguments** → returns current timestamp as long (milliseconds since epoch, \`System.currentTimeMillis()\`).
\`\`\`xml
\${now()}  <!-- e.g., 1709913600000 -->
\`\`\`

### formatDateTime(timestamp, pattern) — 2-arg
- **Accepts:** timestamp=numeric (long millis), pattern=string (Java DateTimeFormatter pattern).
- **Returns:** formatted date string using system default timezone.
- **Throws:** if pattern is invalid or types are wrong.
\`\`\`xml
\${formatDateTime(now(), "yyyy-MM-dd")}         <!-- "2024-03-08" -->
\${formatDateTime(now(), "yyyy-MM-dd HH:mm:ss")}  <!-- "2024-03-08 14:30:00" -->
\`\`\`

### formatDateTime(dateString, sourcePattern, targetPattern) — 3-arg
- **Accepts:** dateString=string, sourcePattern=string, targetPattern=string.
- **Returns:** date reformatted from source to target pattern.
- **Note:** Tries parsing as LocalDateTime first, then LocalDate, then LocalTime (graceful fallback).
- **Throws:** if the date string doesn't match the source pattern.
\`\`\`xml
\${formatDateTime("2024-03-08", "yyyy-MM-dd", "dd/MM/yyyy")}  <!-- "08/03/2024" -->
\${formatDateTime("14:30:00", "HH:mm:ss", "hh:mm a")}         <!-- "02:30 PM" -->
\`\`\``,

access: `## Access Functions

### exists(expression)
- **Special behavior:** This is the ONLY function that catches EvaluationExceptions.
- If the argument evaluates successfully and is non-null → returns \`true\`.
- If the argument throws any EvaluationException → returns \`false\`.
- **Use this for safe null/existence checks.**
\`\`\`xml
\${exists(payload.field)}
\${exists(vars.myVar)}
\`\`\`

### not(source)
- **Accepts:** boolean → returns negated boolean.
- **Throws:** if argument is not boolean (calls \`asBoolean()\` which throws on non-boolean).
- **GOTCHA:** \`not(0)\` THROWS. \`not("")\` THROWS. Only \`not(true)\` or \`not(false)\` works.
\`\`\`xml
\${not(true)}              <!-- false -->
\${not(exists(vars.x))}   <!-- true if vars.x doesn't exist -->
\`\`\`

### registry(key) — 1-arg
- **Accepts:** string (registry path) → returns registry resource content as string.
- OMText resources are Base64 decoded. OMElement resources are converted via toString().
- **Throws:** if resource not found or key is invalid.
\`\`\`xml
\${registry("gov:/config/service")}
\`\`\`

### registry(key, propKey) — 2-arg
- **Accepts:** key=string, propKey=string → returns specific property from registry resource.
- **Throws:** if property not found.
\`\`\`xml
\${registry("gov:/config/service", "endpoint.url")}
\`\`\`

### registry(key).property(propKey) — chained
- Same as 2-arg version but using method chaining syntax.
\`\`\`xml
\${registry("gov:/config/service").property("key")}
\`\`\`

### registry(key).jsonPath — chained with JSONPath
- Access JSON content stored in registry resources using JSONPath.
\`\`\`xml
\${registry("gov:/config/resource").student.name}
\`\`\`

### xpath(expression) — 1-arg
- **Accepts:** string (XPath expression) → evaluates against message context.
- **Throws:** if XPath is invalid.
\`\`\`xml
\${xpath("//student/text()")}
\${xpath("string($body//*[local-name()='CustomerId'])")}
\`\`\`

### xpath(expression, variableName) — 2-arg
- **Accepts:** expression=string, variableName=string → evaluates XPath on a specific variable.
- **Throws:** if variable name is empty or XPath is invalid.

### wso2-vault(alias)
- **Accepts:** string (secret alias) → returns secret value from WSO2 vault.
- **Throws:** if vault lookup fails.
\`\`\`xml
\${wso2-vault("mysqlpassword")}
\`\`\`

### hashicorp-vault(pathName, fieldName) — 2-arg
- **Accepts:** pathName=string, fieldName=string → returns secret from HashiCorp Vault.
\`\`\`xml
\${hashicorp-vault("secret/data/myapp", "password")}
\`\`\`

### hashicorp-vault(namespace, pathName, fieldName) — 3-arg
- **Accepts:** namespace=string, pathName=string, fieldName=string → returns secret with namespace.
\`\`\`xml
\${hashicorp-vault("ns1", "secret/data/myapp", "password")}
\`\`\``,

summary: `## Function Argument Count Summary

| Function | 0-arg | 1-arg | 2-arg | 3-arg |
|----------|-------|-------|-------|-------|
| now | Yes | — | — | — |
| length, toUpper, toLower, trim, abs, ceil, floor, sqrt, base64decode, urlDecode | — | Yes | — | — |
| isString, isNumber, isArray, isObject, string, integer, float, boolean, object, array | — | Yes | — | — |
| exists, not, wso2-vault | — | Yes | — | — |
| registry, xpath | — | Yes | Yes | — |
| round, log, base64encode, urlEncode | — | Yes | Yes | — |
| startsWith, endsWith, contains, split, pow, charAt | — | — | Yes | — |
| replace | — | — | — | Yes |
| subString, indexOf, formatDateTime | — | — | Yes | Yes |
| hashicorp-vault | — | — | Yes | Yes |`,

};

// Full content composed from all sections
export const SYNAPSE_FUNCTION_REFERENCE_FULL = Object.values(SYNAPSE_FUNCTION_REFERENCE_SECTIONS).join('\n\n---\n\n');
