/* eslint-disable @typescript-eslint/no-explicit-any */
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

/**
 * The Root Object sent from Language Server -> Properties Panel
 */
export interface StepNodeProperties {
    // 1. General Info
    general: StepGeneralInfo;

    // 2. Parameters (Inputs)
    parameters: StepParameter[];

    // 3. Request Body (Input)
    requestBody?: StepRequestBody;

    // 4. Outputs
    outputs: StepOutput[];

    // 5. Success Criteria
    successCriteria: StepCriterion[];

    // 6. Language Server Metadata (Critical for "Go to Definition")
    sourceMap: SourceLocation;
}

// ---------------------------------------------------------
// Sub-Interfaces
// ---------------------------------------------------------

export interface StepGeneralInfo {
    stepId: string;           // e.g., "create-user"
    description?: string;     // e.g., "Registers a new user"

    // Arazzo allows EITHER operationId OR operationPath
    operationId?: string;     // e.g., "createUser"
    operationPath?: string;   // e.g., "post /users" (Alternative to ID)

    method?: string;          // e.g., "POST" (Derived from the OpenAPI spec if available)
}

export interface StepParameter {
    name: string;             // e.g., "userId"
    in: 'query' | 'header' | 'path' | 'cookie';
    value: string | any;      // e.g., "$inputs.id" or "12345"

    // UI Helpers
    required?: boolean;       // Used to show a red asterisk (*) in the UI
    description?: string;     // Tooltip text from the OpenAPI spec
}

export interface StepRequestBody {
    contentType: string;      // e.g., "application/json"
    payload: string | any;    // The actual body content. Can be a raw object or a reference string.
}

export interface StepOutput {
    name: string;             // e.g., "redirectUrl"
    value: string;            // e.g., "$response.header.Location"
}

export interface StepCriterion {
    condition: string;        // e.g., "$statusCode == 200"
    type?: 'simple' | 'regex' | 'jsonpath' | 'xpath';
}

// ---------------------------------------------------------
// Language Server Specific
// ---------------------------------------------------------

export interface SourceLocation {
    filePath: string;         // Absolute path to the arazzo.yaml

    // The precise range of the YAML block for this step.
    // Used so when you edit a property, the LS knows exactly what lines to replace.
    range: {
        startLine: number;
        endLine: number;
        startChar: number;
        endChar: number;
    };
}