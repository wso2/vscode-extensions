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
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("ts-morph");
var fs = require("fs");

var excludedSuffixes = [
    'Token',
    'Keyword',
    'Trivia',
    'WhiteSpaces',
    'Unknown',
    'Signature',
    'Type',
    'Operator',
    'Text',
    'Word',
    'Assignment',
    'Accessor'
];

var kinds = Object.keys(ts.SyntaxKind).filter(function (k) {
    return isNaN(Number(k))
        && !excludedSuffixes.some(function (suffix) { return k.endsWith(suffix); });
});

const visitorFunctions = kinds.map(kind => {
    return `
    beginVisit${kind}?(node: tsm.${kind}, parent?: tsm.Node): void;
    endVisit${kind}?(node: tsm.${kind}, parent?: tsm.Node): void;`;
}).join('\n');

const headerComment = `/**
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
 * 
 * THIS FILE INCLUDES AUTO GENERATED CODE
 * Run 'npm run generate' to regenerate this file
 */
`

var fileContent = `${headerComment}
import * as tsm from 'ts-morph';

export interface Visitor {
    beginVisit?(node: tsm.Node, parent?: tsm.Node): void;
    endVisit?(node: tsm.Node, parent?: tsm.Node): void;
    ${visitorFunctions}
}
`;

fs.writeFileSync('./base-visitor.ts', fileContent);
