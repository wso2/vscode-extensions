/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import { FunctionDeclarationStructure, StructureKind } from "ts-morph";

const AUTO_GEN_MSG = "#### AUTO-GENERATED FUNCTION, DO NOT MODIFY ####";

export const operators: Record<string, FunctionDeclarationStructure> = {
    // ########################### Arithmetic Operators ###########################
    "sum": {
        kind: StructureKind.Function,
        name: "sum",
        parameters: [{name: "...numbers", type: "number[]"}],
        returnType: "number",
        statements: "return numbers.reduce((acc, curr) => acc + curr, 0);",
        docs: [{description:
`${AUTO_GEN_MSG}
Calculates the sum of multiple numbers.
@parameter numbers - The numbers to sum.
@returns The sum of the numbers.`
        }],
    },
    "max": {
        kind: StructureKind.Function,
        name: "max",
        parameters: [{name: "...numbers", type: "number[]"}],
        returnType: "number",
        statements: "return Math.max(...numbers);",
        docs: [{description:
`${AUTO_GEN_MSG}
Finds the maximum number from a list of numbers.
@param numbers - The numbers to find the maximum from.
@returns The maximum number.`
        }],
    },
    "min": {
        kind: StructureKind.Function,
        name: "min",
        parameters: [{name: "...numbers", type: "number[]"}],
        returnType: "number",
        statements: "return Math.min(...numbers);",
        docs: [{description:
`${AUTO_GEN_MSG}
Finds the minimum number from a list of numbers.
@param numbers - The numbers to find the minimum from.
@returns The minimum number.`
        }]
    },
    "average": {
        kind: StructureKind.Function,
        name: "average",
        parameters: [{name: "...numbers", type: "number[]"}],
        returnType: "number",
        statements: "return numbers.reduce((acc, curr) => acc + curr, 0) / numbers.length;",
        docs: [{description:
`${AUTO_GEN_MSG}
Calculates the average of multiple numbers.
@param numbers - The numbers to average.
@returns The average of the numbers.`
        }]
    },
    "ceiling": {
        kind: StructureKind.Function,
        name: "ceiling",
        parameters: [{name: "num", type: "number"}],
        returnType: "number",
        statements: "return Math.ceil(num);",
        docs: [{description:
`${AUTO_GEN_MSG}
Finds the ceiling of a number.
@param num - The number to find the ceiling of.
@returns The ceiling of the number.`
        }]
    },
    "floor": {
        kind: StructureKind.Function,
        name: "floor",
        parameters: [{name: "num", type: "number"}],
        returnType: "number",
        statements: "return Math.floor(num);",
        docs: [{description:
`${AUTO_GEN_MSG}
Finds the floor of a number.
* @param num - The number to find the floor of.
* @returns The floor of the number.`
        }]
    },
    "round": {
        kind: StructureKind.Function,
        name: "round",
        parameters: [{name: "num", type: "number"}],
        returnType: "number",
        statements: "return Math.round(num);",
        docs: [{description:
`${AUTO_GEN_MSG}
Rounds a number to the nearest integer.
* @param num - The number to round.
* @returns The rounded number.`
        }]
    },
    // ########################### Type Conversion Operators ###########################
    "toNumber": {
        kind: StructureKind.Function,
        name: "toNumber",
        parameters: [{name: "str", type: "string"}],
        returnType: "number",
        statements: "return Number(str);",
        docs: [{description:
`${AUTO_GEN_MSG}
Converts a string to a number.
@param str - The string to convert.
@returns The number.`
        }]
    },
    "toBoolean": {
        kind: StructureKind.Function,
        name: "toBoolean",
        parameters: [{name: "str", type: "string"}],
        returnType: "boolean",
        statements: "return str.toLowerCase() === 'true';",
        docs: [{description:
`${AUTO_GEN_MSG}
Converts a string to a boolean.
@param str - The string to convert.
@returns The boolean value.`
        }]
    },
    "numberToString": {
        kind: StructureKind.Function,
        name: "numberToString",
        parameters: [{name: "num", type: "number"}],
        returnType: "string",
        statements: "return num.toString();",
        docs: [{description:
`${AUTO_GEN_MSG}
Converts a number to a string.
@param num - The number to convert.
@returns The string representation of the number.`
        }]
    },
    "booleanToString": {
        kind: StructureKind.Function,
        name: "booleanToString",
        parameters: [{name: "bool", type: "boolean"}],
        returnType: "string",
        statements: "return bool.toString();",
        docs: [{description:
`${AUTO_GEN_MSG}
Converts a boolean to a string.
@param bool - The boolean to convert.
@returns The string representation of the boolean.`
        }]
    },
    // ########################### String Operators ###########################
    "concat": {
        kind: StructureKind.Function,
        name: "concat",
        parameters: [{name: "...strings", type: "string[]"}],
        returnType: "string",
        statements: "return strings.join('');",
        docs: [{description:
`${AUTO_GEN_MSG}
Concatenates two or more strings.
@param strings - The strings to concatenate.
@returns The concatenated string.`
        }]
    },
    "split": {
        kind: StructureKind.Function,
        name: "split",
        parameters: [
            {name: "str", type: "string"},
            {name: "separator", type: "string"}
        ],
        returnType: "string[]",
        statements: "return str.split(separator);",
        docs: [{description:
`${AUTO_GEN_MSG}
Splits a string into an array of substrings based on a specified separator.
@param str - The string to split.
@param separator - The separator to use for splitting.
@returns An array of substrings.`
        }]
    },
    "toUppercase": {
        kind: StructureKind.Function,
        name: "toUppercase",
        parameters: [{name: "str", type: "string"}],
        returnType: "string",
        statements: "return str.toUpperCase();",
        docs: [{description:
`${AUTO_GEN_MSG}
Converts a string to uppercase.
@param str - The string to convert.
@returns The uppercase string.`
        }]
    },
    "toLowercase": {
        kind: StructureKind.Function,
        name: "toLowercase",
        parameters: [{name: "str", type: "string"}],
        returnType: "string",
        statements: "return str.toLowerCase();",
        docs: [{description:
`${AUTO_GEN_MSG}
Converts a string to lowercase.
@param str - The string to convert.
@returns The lowercase string.`
        }]
    },
    "stringLength": {
        kind: StructureKind.Function,
        name: "stringLength",
        parameters: [{name: "str", type: "string"}],
        returnType: "number",
        statements: "return str.length;",
        docs: [{description:
`${AUTO_GEN_MSG}
Returns the length of a string.
@param str - The string to get the length of.
@returns The length of the string.`
        }]
    },
    "startsWith": {
        kind: StructureKind.Function,
        name: "startsWith",
        parameters: [
            {name: "str", type: "string"},
            {name: "searchString", type: "string"}
        ],
        returnType: "boolean",
        statements: "return str.startsWith(searchString);",
        docs: [{description:
`${AUTO_GEN_MSG}
Checks if a string starts with a specified prefix.
@param str - The string to check.
@param searchString - The prefix to check for.
@returns True if the string starts with the prefix, false otherwise.`
        }]
    },
    "endsWith": {
        kind: StructureKind.Function,
        name: "endsWith",
        parameters: [
            {name: "str", type: "string"},
            {name: "searchString", type: "string"}
        ],
        returnType: "boolean",
        statements: "return str.endsWith(searchString);",
        docs: [{description:
`${AUTO_GEN_MSG}
Checks if a string ends with a specified suffix.
@param str - The string to check.
@param searchString - The suffix to check for.
@returns True if the string ends with the suffix, false otherwise.`
        }]
    },
    "substring": {
        kind: StructureKind.Function,
        name: "substring",
        parameters: [
            {name: "str", type: "string"},
            {name: "start", type: "number"},
            {name: "end", type: "number"}
        ],
        returnType: "string",
        statements: "return str.substring(start, end);",
        docs: [{description:
`${AUTO_GEN_MSG}
Extracts a substring from a string based on the specified start and end indices.
@param str - The string to extract the substring from.
@param start - The index to start extracting from.
@param end - The index to end extracting at.
@returns The extracted substring.`
        }]
    },
    "trim": {
        kind: StructureKind.Function,
        name: "trim",
        parameters: [{name: "str", type: "string"}],
        returnType: "string",
        statements: "return str.trim();",
        docs: [{description:
`${AUTO_GEN_MSG}
Trims whitespace from both ends of a string.
@param str - The string to trim.
@returns The trimmed string.`
        }]
    },
    "replaceFirst": {
        kind: StructureKind.Function,
        name: "replaceFirst",
        parameters: [
            {name: "str", type: "string"},
            {name: "searchString", type: "string"},
            {name: "replaceString", type: "string"}
        ],
        returnType: "string",
        statements: "return str.replace(searchString, replaceString);",
        docs: [{description:
`${AUTO_GEN_MSG}
Replaces the first occurrence of a target string with another string.
@param str - The original string.
@param searchString - The target string to replace.
@param replacement - The string to replace the target with.
@returns The string with the first occurrence of the target replaced by the replacement.`
        }]
    },
    "match": {
        kind: StructureKind.Function,
        name: "match",
        parameters: [
            {name: "str", type: "string"},
            {name: "regex", type: "string"}
        ],
        returnType: "string[]",
        statements: "return str.match(new RegExp(regex));",
        docs: [{description:
`${AUTO_GEN_MSG}
Checks if a string matches a specified regular expression.
@param str - The string to check.
@param regex - The regular expression to match against.
@returns True if the string matches the regular expression, false otherwise.`
        }]
    },
};

export function getFnDeclStructure(functionName: string): FunctionDeclarationStructure {
    return operators[functionName];
}
