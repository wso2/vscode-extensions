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

export const DEFAULT_VALUE_MAP: Record<string, string> = {
    "struct": "{}",
    "array": "[]",
    "map": "{}",
    "int": "0",
    "float": "0.0",
    "boolean": "false",
    "any": "null",
    "decimal": "0.0",
    "byte": "0"
}

export const isRowType = (type: string | string[]) => {
    return type && type === "struct";
}

export const isUnionType = (type: string) => {
    return type && type === "enum";
}

export const getDefaultValue = (type: string) => {
    //TODO: handle this using API
     return DEFAULT_VALUE_MAP[type] || "";
}
