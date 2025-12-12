// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

/**
 * Instruction guide for Ballerina Regular Expression (RegExp) Langlib.
 * Contains core types, functions, and examples for pattern matching and text manipulation.
 */
export const REGEXP_LANGLIB_INSTRUCTION = `
## Regular Expression Core Types

**RegExp**: The regular expression type. This is a tagged data basic type with tag \`re\`. Type: \`any\`
\`\`\`json
{
  "type": "RegExp - created using re \`pattern\` syntax or regexp:fromString()"
}
\`\`\`

**Span**: A matched substring object with these fields (readonly object):
\`\`\`json
{
  "startIndex": "int - starting position of the match",
  "endIndex": "int - ending position of the match (exclusive, length = endIndex - startIndex)",
  "substring": "function - method that returns the matched string"
}
\`\`\`

**Groups**: An array of Span objects for capture groups. Type: \`readonly & [Span, Span?...]\`. Index 0 is the full match, subsequent indices are capture groups (may be nil if not used).
\`\`\`json
[
  {
    "startIndex": "int - start of full match",
    "endIndex": "int - end of full match",
    "substring": "function - returns full match string"
  },
  {
    "startIndex": "int - start of first capture group",
    "endIndex": "int - end of first capture group",
    "substring": "function - returns first capture group string"
  },
  ...
]
\`\`\`

## Regular Expression Langlib Functions

**Important:** All examples below require: \`import ballerina/lang.regexp;\`

**Finding the first match**, use \`find()\`. Perfect for locating text.
\`\`\`ballerina
string wordPattern = "World";
regexp:RegExp pattern = re \`\${wordPattern}\`;
regexp:Span? match = pattern.find("Hello World");
\`\`\`

**Finding all matches**, use \`findAll()\`. Great for extracting everything that matches.
\`\`\`ballerina
string digitPattern = "[0-9]+";
regexp:RegExp pattern = re \`\${digitPattern}\`;
regexp:Span[] matches = pattern.findAll("a1b23c456");
\`\`\`

**Finding matches with capture groups**, use \`findGroups()\`. Use this to extract specific parts.
\`\`\`ballerina
string groupPattern = "([a-z]+)([0-9]+)";
regexp:RegExp pattern = re \`\${groupPattern}\`;
regexp:Groups? groups = pattern.findGroups("abc123");
\`\`\`

**Finding all matches with capture groups**, use \`findAllGroups()\`. Perfect for complex pattern extraction.
\`\`\`ballerina
string groupPattern = "([a-z]+)([0-9]+)";
regexp:RegExp pattern = re \`\${groupPattern}\`;
regexp:Groups[] allGroups = pattern.findAllGroups("abc123def456");
\`\`\`

**Building a regex from a string at runtime**, use \`fromString()\`. Handy for dynamic patterns.
\`\`\`ballerina
string pattern = "[0-9]+";
regexp:RegExp regex = check regexp:fromString(pattern);
\`\`\`

**Checking if text fully matches a pattern**, use \`isFullMatch()\`. Essential for validation.
\`\`\`ballerina
string digitPattern = "[0-9]+";
regexp:RegExp pattern = re \`\${digitPattern}\`;
boolean valid = pattern.isFullMatch("123");
boolean invalid = pattern.isFullMatch("12a3");
\`\`\`

**Matching at a specific position**, use \`matchAt()\`. For when position matters.
\`\`\`ballerina
string digitPattern = "[0-9]+";
regexp:RegExp pattern = re \`\${digitPattern}\`;
regexp:Span? match = pattern.matchAt("a123b", startIndex=1);
\`\`\`

**Replacing the first match**, use \`replace()\`. For single substitution. Accepts string or function replacement.
\`\`\`ballerina
string digitPattern = "[0-9]+";
regexp:RegExp pattern = re \`\${digitPattern}\`;
// Using string replacement
string result1 = pattern.replace("a1b2", replacement="X"); // "aXb2"
// Using ReplacerFunction for dynamic replacement
isolated function doubleDigits(regexp:Groups groups) returns string {
    int num = check int:fromString(groups[0].substring());
    return (num * 2).toString();
}
string result2 = pattern.replace("a1b2", replacement=doubleDigits); // "a2b2"
\`\`\`

**Replacing all matches**, use \`replaceAll()\`. For bulk substitution. Accepts string or function replacement.
\`\`\`ballerina
string digitPattern = "[0-9]+";
regexp:RegExp pattern = re \`\${digitPattern}\`;
// Using string replacement
string result1 = pattern.replaceAll("a1b2", replacement="X"); // "aXbX"
// Using ReplacerFunction for dynamic replacement
isolated function toLength(regexp:Groups groups) returns string {
    return groups[0].substring().length().toString();
}
string result2 = pattern.replaceAll("a1b23", replacement=toLength); // "a1b1"
\`\`\`

**Splitting text by a pattern**, use \`split()\`. Great for parsing delimited data.
\`\`\`ballerina
string delimiterPattern = ",\\s*";
regexp:RegExp pattern = re \`\${delimiterPattern}\`;
string[] parts = pattern.split("a, b, c");
\`\`\`
`;

/**
 * Instruction-based usage guide for Ballerina Langlibs (Language Libraries).
 * These instructions are included in the system prompt to guide code generation.
 */
export const LANGLIB_USAGE_INSTRUCTIONS = `
# Using Ballerina's Built-in Language Libraries

Ballerina comes with built-in language libraries (langlibs) that make working with basic types easier. Most of these are available automatically without imports (like \`lang.value\`, \`lang.array\`, \`lang.string\`, \`lang.map\`, \`lang.int\`, \`lang.float\`, \`lang.boolean\`, \`lang.xml\`, \`lang.error\`). You'll only need to explicitly import \`lang.regexp\` and \`lang.runtime\`.

## Understanding Core Types in Ballerina

**any**: Includes all values except errors. Great when you don't know the exact type.
\`\`\`ballerina
any value1 = 42;              // int
any value2 = {name: "Alice"}; // record/map
// But NOT errors: any value5 = error("fail"); // Compile error
\`\`\`

**anydata**: Data that can be serialized (nil, boolean, int, float, decimal, string, xml, arrays, maps, tables, records). Excludes: error, function, object, typedesc, handle.
\`\`\`ballerina
// anydata holds serializable values - perfect for JSON, databases, etc.
anydata data1 = 100;                   // int 
anydata data2 = {id: 1, name: "Bob"};  // map/record 
// These won't work:
// anydata data3 = function() {};      // function 
// anydata data4 = error("err");       // error 
\`\`\`

**readonly**: Values that can't be changed (have the read-only bit set). Use \`readonly & Type\` to make something immutable.
\`\`\`ballerina
readonly & int[] immutableArray = [1, 2, 3];
// immutableArray.push(4); // Compile error: can't modify

readonly & map<string> config = {host: "localhost", port: "8080"};
// config.host = "remote"; // Compile error: can't modify

// Some types are always readonly:
int x = 42;                    // Always immutable
// Some can be made readonly:
int[] nums = [1, 2, 3];       // Mutable
readonly & int[] fixed = nums.cloneReadOnly(); // Now immutable
\`\`\`
- Always immutable: nil, boolean, int, float, decimal, string, error, function, typedesc, handle
- Can be made immutable: xml, arrays, maps, tables, objects

**Cloneable**: \`readonly|xml|Cloneable[]|map<Cloneable>|table<map<Cloneable>>\`. Values you can deep-copy.
\`\`\`ballerina
// Cloneable values can be deep-copied with .clone()
int[] original = [1, 2, 3];
int[] copy = original.clone();
copy.push(4);  // original stays [1, 2, 3], copy is [1, 2, 3, 4]

map<string> data = {name: "Alice", role: "admin"};
map<string> dataCopy = data.clone();
dataCopy.role = "user";  // data.role is still "admin"
\`\`\`

## How Dependent Types Work

**The Idea:** The return type changes based on what \`typedesc\` parameter you pass at runtime. The type checker figures out the exact return type from your type descriptor argument.

**In Practice:**
When you call a function with a type descriptor (like \`int[]\`), the compiler knows exactly what type you'll get back. No casting needed!

**Where You'll See This:** These \`lang.value\` functions use dependent types: \`cloneWithType()\`, \`ensureType()\`, \`fromJsonWithType()\`, \`fromJsonStringWithType()\`

## Making Copies and Converting Data

**Making a deep copy you can modify**, use \`clone()\`. Perfect when you need to change data without affecting the original.
\`\`\`ballerina
int[] original = [1, 2, 3];
int[] copy = original.clone();
copy.push(4);  // original stays [1, 2, 3]
\`\`\`

**Making a copy that can't be changed**, use \`cloneReadOnly()\`. Use this when you want to lock down your data.
\`\`\`ballerina
int[] data = [1, 2, 3];
int[] & readonly immutable = data.cloneReadOnly();
immutable.push(4);  // Compile error: can't modify readonly
\`\`\`

**Converting between types with default values**, use \`cloneWithType()\`. Uses **dependent types**.
\`\`\`ballerina
json cfg = {port: 8080};
type Config record {| int port; int timeout = 60; |};
Config c = check cfg.cloneWithType();

anydata[] arr = [1, 2, 3];
int[] nums = check arr.cloneWithType(int[]);
\`\`\`

**Checking if a value matches a specific type**, use \`ensureType()\`. Uses **dependent types** - validates without copying, and the return type matches your \`typedesc\` parameter.
\`\`\`ballerina
json student = {name: "Jo", subjects: ["CS1212"]};
json[] subs = check student.subjects.ensureType();

anydata data = "hello";
string s = check data.ensureType(string); 
\`\`\`

**Turning any value into a readable string**, use \`toString()\`. Great for logging and showing users.
\`\`\`ballerina
map<int> scores = {Alice: 90, Bob: 85};
string output = scores.toString();
\`\`\`

**Converting data to JSON format**, use \`toJson()\`. Perfect for API responses and saving data.
\`\`\`ballerina
record {string name; int age;} person = {name: "Alice", age: 30};
json result = person.toJson(); 
\`\`\`

**Turning data into a JSON string**, use \`toJsonString()\`. Use this when you need to store or send JSON as text.
\`\`\`ballerina
map<int> scores = {Alice: 90, Bob: 85};
string jsonText = scores.toJsonString();
\`\`\`

**Parsing JSON text into a json value**, use \`fromJsonString()\`. Great for reading JSON from files or APIs.
\`\`\`ballerina
string jsonText = "{\"id\":12,\"name\":\"Alice\"}";
json data = check jsonText.fromJsonString();
\`\`\`

**Converting JSON into a specific type**, use \`fromJsonWithType()\`. Uses **dependent types** - return type matches your \`typedesc\` parameter.
\`\`\`ballerina
json jsonArr = [1, 2, 3];
int[] nums = check jsonArr.fromJsonWithType();

json cfg = {port: 8080, timeout: 60};
type Config record {| int port; int timeout; |};
Config config = check cfg.fromJsonWithType(Config);
\`\`\`

**Parsing JSON text directly into a typed value**, use \`fromJsonStringWithType()\`. Uses **dependent types** - return type matches your \`typedesc\` parameter.
\`\`\`ballerina
string jsonText = "[1, 2, 3]";
int[] nums = check jsonText.fromJsonStringWithType();

string configText = "{\"port\":8080,\"timeout\":60}";
type Config record {| int port; int timeout; |};
Config config = check configText.fromJsonStringWithType(Config); 
\`\`\`

## What You Can Do with Arrays

- **Counting elements**, use \`length()\`.
- **Transforming each element**, use \`map()\` with your transformation function. Returns a fresh array.
- **Picking elements that match criteria**, use \`filter()\` with a predicate function. Returns a fresh array.
- **Running an operation on each element**, use \`forEach()\` with an iterator function for side effects. Returns ().
- **Reducing all elements into one value**, use \`reduce()\` with a combiner function and starting value.
- **Finding where an element is**, use \`indexOf()\` with the value you're looking for and optional start index. Returns index or ().
- **Adding elements to the end**, use \`push()\`. Changes the array directly.
- **Taking off the last element**, use \`pop()\`. Panics if empty.
- **Taking off the first element**, use \`shift()\`. Panics if empty.
- **Adding elements to the front**, use \`unshift()\`.
- **Sorting elements**, use \`sort()\` with optional direction ("ascending"|"descending") and key function. Returns a fresh array.
- **Converting Base64 to bytes**, use \`fromBase64()\`.

## What You Can Do with Strings

- **Counting code points**, use \`length()\`.
- **Joining strings with a separator**, use \`join()\`.
- **Comparing strings alphabetically**, use \`codePointCompare()\`. Returns int (<0, 0, >0).
- **Sticking strings together**, use \`concat()\`.
- **Checking how a string starts or ends**, use \`endsWith()\` or \`startsWith()\`.
- **Converting between bytes and text**, use \`fromBytes()\` or \`toBytes()\` for UTF-8.
- **Converting between code points and characters**, use \`fromCodePointInt()\` or \`toCodePointInt()\`.
- **Converting between code point arrays and strings**, use \`fromCodePointInts()\` or \`toCodePointInts()\`.
- **Getting a code point at a position**, use \`getCodePoint()\`.
- **Checking if text contains something**, use \`includes()\` with optional start index.
- **Finding where a substring is**, use \`indexOf()\` with optional start index. Returns index or ().
- **Testing if text fully matches a pattern**, use \`matches()\`. Returns boolean.
- **Extracting part of a string**, use \`substring()\` with start and optional end index.
- **Changing ASCII case**, use \`toLowerAscii()\` or \`toUpperAscii()\`.
- **Trimming whitespace from the edges**, use \`trim()\`.

## What You Can Do with Maps

- **Counting entries**, use \`length()\`.
- **Getting a value by key**, use \`get()\`. Panics if key doesn't exist.
- **Checking if a key exists**, use \`hasKey()\`.
- **Getting all keys**, use \`keys()\`. Returns string[].
- **Getting key-value pairs**, use \`entries()\`. Returns [key, value] pairs as map.
- **Getting all values**, use \`toArray()\`. Returns values as array.
- **Removing everything**, use \`removeAll()\`.
- **Safely removing an entry**, use \`removeIfHasKey()\`. Returns value or ().

## What You Can Do with Numbers

### Working with Integers
- **Parsing decimal strings to int**, use \`fromString()\`. Allows +/-, no hex support.
- **Converting int to hex string**, use \`toHexString()\`. Lowercase, no 0x prefix.
- **Parsing hex strings to int**, use \`fromHexString()\`. Allows +/-, no 0x prefix.

### Working with Floats
- **Parsing strings to float**, use \`fromString()\`. Allows NaN, Infinity, +/-.
- **Calculating exponentials**, use \`exp()\` for e raised to a power.
- **Converting to/from hex format**, use \`toHexString()\` or \`fromHexString()\` for IEEE 754.

### Working with Decimals
- **Parsing strings to decimal**, use \`fromString()\`. Best for precision and money calculations.
- **Finding the biggest or smallest value**, use \`max()\` or \`min()\`.
- **Adding up multiple values**, use \`sum()\`.

## What You Can Do with Booleans

- **Parsing strings to boolean**, use \`fromString()\`. Accepts "true"|"false" (case-sensitive).

## What You Can Do with Errors

- **Getting the error message**, use \`message()\`. Returns string.
- **Getting the linked error**, use \`cause()\`. Returns error or ().
- **Getting the error details**, use \`detail()\`. Returns readonly detail record.

${REGEXP_LANGLIB_INSTRUCTION}

## Controlling Program Execution (lang.runtime)

- **Pausing your program**, use \`sleep()\` with duration in seconds (decimal).
\`\`\`ballerina
import ballerina/lang.runtime;
runtime:sleep(2.5); // Pauses for 2.5 seconds
\`\`\`

## Working with Streams

- **Releasing stream resources**, use \`close()\`. Returns error or ().
- **Processing each stream element**, use \`forEach()\` with an iterator function. Returns error or ().
- **Getting the next element from a stream**, use \`next()\`. Returns record{value} or ().

## What You Can Do with XML

- **Combining xml values**, use \`concat()\`.
- **Processing each xml item**, use \`forEach()\` with an iterator function.
- **Parsing XML text**, use \`fromString()\`.
- **Counting xml items**, use \`length()\`.
`;

/**
 * Get the langlib usage instructions to include in prompts
 */
export function getLanglibInstructions(): string {
    return LANGLIB_USAGE_INSTRUCTIONS;
}
