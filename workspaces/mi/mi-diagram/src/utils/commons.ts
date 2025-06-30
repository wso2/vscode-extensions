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

import { ParamConfig, ParamValueConfig } from "../components/Form/ParamManager/ParamManager";

export const FirstCharToUpperCase = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Checks if the given dirty keys exist in the attributes
export function checkAttributesExist(dirtyKeys: string[], attributes: string[]) {
    return dirtyKeys.some(key => attributes.includes(key));
}

export function generateSpaceSeperatedStringFromParamValues(paramConfig: ParamConfig) {
    let result = "";
    paramConfig.paramValues?.forEach(param => {
        // if param.value is an object
        if (typeof param.value === "string") {
            result += param.value + " ";
        } else {
            const pc = param?.value as ParamConfig;
            pc?.paramValues?.forEach(p => {
                result += p.key + " ";
            });
        }
    });
    return result.trim();
};

// Transofrm the namespace object from syntax tree to the format supported by forms
export function transformNamespaces(namespaces: { [key: string]: string }) {
    if (namespaces && Object.keys(namespaces).length > 0) {
        return Object.keys(namespaces).map((key) => ({
            prefix: key.split(':')[1],
            uri: namespaces[key]
        }));
    }
    return [];
}

export function escapeXml(text: string) {

    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
};

export function filterNamespaces(namespaces: any[]) {
    let filteredNamespaces: any[] = [];
    let prefixes: string[] = [];
    let uris: string[] = [];
    namespaces.forEach((namespace) => {
        if (!(prefixes.includes(namespace.prefix) || uris.includes(namespace.uri))) {
            prefixes.push(namespace.prefix);
            uris.push(namespace.uri);
            filteredNamespaces.push(namespace);
        }
    });
    return filteredNamespaces;
}

/**
 * Compares two semantic version strings (v1 and v2) and returns:
 * - `1` if v1 > v2
 * - `-1` if v1 < v2
 * - `0` if v1 == v2
 *
 * @param v1 - First semantic version string.
 * @param v2 - Second semantic version string.
 * @returns A number indicating the comparison result.
 * 
 * @throws Error if either version is invalid.
 */
export function compareVersions(v1: string, v2: string): number {
    const extractSemverParts = (version: string): [number, number, number] => {
        const semverRegex = /(\d+)\.(\d+)\.(\d+)/;
        const match = version.match(semverRegex);

        if (!match) {
            throw new Error(`Version: '${version}' is not valid.`);
        }

        const [, major, minor, patch] = match.map(Number);
        return [major, minor, patch];
    };

    const [major1, minor1, patch1] = extractSemverParts(v1);
    const [major2, minor2, patch2] = extractSemverParts(v2);

    if (major1 !== major2) return major1 > major2 ? 1 : -1;
    if (minor1 !== minor2) return minor1 > minor2 ? 1 : -1;
    if (patch1 !== patch2) return patch1 > patch2 ? 1 : -1;

    return 0;
}
