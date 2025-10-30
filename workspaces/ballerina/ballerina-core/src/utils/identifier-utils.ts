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
/* eslint-disable @typescript-eslint/no-explicit-any */

import { ComponentInfo } from "../interfaces/ballerina";
import { BallerinaProjectComponents } from "../interfaces/extended-lang-client";
import { SCOPE } from "../state-machine-types";

const INTEGRATION_API_MODULES = ["http", "graphql", "tcp"];
const EVENT_INTEGRATION_MODULES = ["kafka", "rabbitmq", "salesforce", "trigger.github", "mqtt", "asb"];
const FILE_INTEGRATION_MODULES = ["ftp", "file"];
const AI_AGENT_MODULE = "ai";

export function findScopeByModule(moduleName: string): SCOPE {
    if (AI_AGENT_MODULE === moduleName) {
        return SCOPE.AI_AGENT;
    } else if (INTEGRATION_API_MODULES.includes(moduleName)) {
        return SCOPE.INTEGRATION_AS_API;
    } else if (EVENT_INTEGRATION_MODULES.includes(moduleName)) {
        return SCOPE.EVENT_INTEGRATION;
    } else if (FILE_INTEGRATION_MODULES.includes(moduleName)) {
        return SCOPE.FILE_INTEGRATION;
    }
}

export function getAllVariablesForAiFrmProjectComponents(projectComponents: BallerinaProjectComponents): { [key: string]: any } {
    const variableCollection: { [key: string]: any } = {};
    projectComponents.packages?.forEach((packageSummary) => {
        packageSummary.modules.forEach((moduleSummary) => {
            moduleSummary.moduleVariables.forEach(({ name }: ComponentInfo) => {
                if (!variableCollection[name]) {
                    variableCollection[name] = {
                        type: name,
                        position: 0,
                        isUsed: 0,
                    };
                }
            });
            moduleSummary.enums.forEach(({ name }: ComponentInfo) => {
                if (!variableCollection[name]) {
                    variableCollection[name] = {
                        type: name,
                        position: 0,
                        isUsed: 0,
                    };
                }
            });
            moduleSummary.records.forEach(({ name }: ComponentInfo) => {
                if (!variableCollection[name]) {
                    variableCollection[name] = {
                        type: name,
                        position: 0,
                        isUsed: 0,
                    };
                }
            });
        })
    });
    return variableCollection;
}

export function getAllVariablesByProjectComponents(projectComponents: BallerinaProjectComponents): string[] {
    const variableCollection: string[] = [];
    const variableInfo = getAllVariablesForAiFrmProjectComponents(projectComponents);
    Object.keys(variableInfo).map((variable) => {
        variableCollection.push(variable);
    });
    return variableCollection;
}
