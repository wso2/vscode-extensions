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

import { ParamConfig } from "@wso2/mi-diagram";

export type InputsFields = {
    endpointName: string;
    format: string;
    traceEnabled: string;
    statisticsEnabled: string;
    optimize: string;
    description: string;
    wsdlUri: string;
    wsdlService: string;
    wsdlPort: string;
    requireProperties: boolean;
    properties: any[];
    addressingEnabled: string;
    addressingVersion: string;
    addressListener: string;
    securityEnabled: string;
    seperatePolicies: boolean;
    policyKey?: string;
    inboundPolicyKey?: string;
    outboundPolicyKey?: string;
    suspendErrorCodes: string;
    initialDuration: number;
    maximumDuration: number;
    progressionFactor: number;
    retryErrorCodes: string;
    retryCount: number;
    retryDelay: number;
    timeoutDuration: number;
    timeoutAction: string;
    templateName: string;
    requireTemplateParameters: boolean;
    templateParameters: any[];
    saveInReg?: boolean;
    //reg form
    artifactName?: string;
    registryPath?: string
    registryType?: "gov" | "conf";
}

export const initialEndpoint: InputsFields = {
    endpointName: "",
    format: "LEAVE_AS_IS",
    traceEnabled: "disable",
    statisticsEnabled: "disable",
    optimize: "LEAVE_AS_IS",
    description: "",
    wsdlUri: "",
    wsdlService: "",
    wsdlPort: "",
    requireProperties: false,
    properties: [],
    addressingEnabled: "disable",
    addressingVersion: "",
    addressListener: "",
    securityEnabled: "disable",
    seperatePolicies: false,
    policyKey: "",
    inboundPolicyKey: "",
    outboundPolicyKey: "",
    suspendErrorCodes: "",
    initialDuration: -1,
    maximumDuration: Number.MAX_SAFE_INTEGER,
    progressionFactor: 1.0,
    retryErrorCodes: "",
    retryCount: 0,
    retryDelay: 0,
    timeoutDuration: Number.MAX_SAFE_INTEGER,
    timeoutAction: "Never",
    templateName: "",
    requireTemplateParameters: false,
    templateParameters: [],
    saveInReg: false,
    //reg form
    artifactName: "",
    registryPath: "/",
    registryType: "gov"

};

export const paramTemplateConfigs: ParamConfig = {
    paramValues: [],
    paramFields: [
        {
            id: 0,
            type: "TextField",
            label: "Parameter",
            defaultValue: "parameter_value",
            isRequired: true
        }
    ]
}

export const propertiesConfigs: ParamConfig = {
    paramValues: [],
    paramFields: [
        {
            id: 0,
            type: "TextField",
            label: "Name",
            placeholder: "parameter_key",
            defaultValue: "",
            isRequired: true
        },
        {
            id: 1,
            type: "TextField",
            label: "Value",
            placeholder: "parameter_value",
            defaultValue: "",
            isRequired: true
        },
        {
            id: 2,
            type: "Dropdown",
            label: "Scope",
            values: ["default", "transport", "axis2", "axis2-client"],
            defaultValue: "default",
            isRequired: true
        }
    ]
}
