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

export interface ArazzoDefinition {
    arazzo: '1.0.0' | '1.0.1';

    //Metadata about the API workflows
    info: ArazzoInfo;

    //List of external API specifications
    sourceDescriptions: SourceDescription[];

    //The core workflows defined
    workflows: ArazzoWorkflow[];

    // Reusable components (inputs, steps, criteria, etc.)
    components?: ComponentsObject;

    //any Extensions
    [key: string]: any;
}

export interface ArazzoInfo {
    title: string;
    version: string;    // (version for the document)
    summary?: string;
    description?: string;
}

export interface SourceDescription {
    name: string;
    url: string;
    type: 'openapi' | 'arazzo'; //should this include any other types? need to verify

    // Optional headers required to fetch the source spec(auth)
    'x-headers'?: Record<string, string>;
}


export interface ArazzoWorkflow {
    workflowId: string;
    summary?: string;
    description?: string;

    //The data required to start the workflow.
    //JSON Schema object

    inputs?: JSONSchema;

    // Global parameters applied to all steps in this workflow
    parameters?: (Parameter | ReusableObject)[];

    dependsOn?: string[];       //any other workflowIds that needs to be done before this one

    // The sequence of steps. 
    // Maps to React Flow Nodes and Edges.
    steps: StepObject[];

    // Assertions to validate overall workflow success.
    successActions?: (SuccessActionObject | ReusableObject)[];

    // Assertions that indicate workflow failure
    failureActions?: (FailureActionObject | ReusableObject)[];

    // Data exposed after the workflow finishes.
    // Maps internal step data to external output variables.
    // Example: { "finalizedPaymentPlan": "$steps.retrieveFinalizedPaymentPlan.finalizedPaymentPlan" }
    outputs?: Record<string, string | any>;

}


export interface StepObject {
    /** Unique ID for this step (used in 'dependsOn' and runtime expressions) */
    stepId: string;

    description?: string;

    /** * Links the step to a specific API endpoint.
     * Example: "findEligibleProducts"
     */
    operationId?: string;

    /** Alternative to operationId using JSONPointer/XPath */
    operationPath?: string;

    /** If this step calls another nested Arazzo workflow */
    workflowId?: string;

    /** * Parameters passed to the operation (query, path, header, cookie).
     * Example: loanTransactionId in path
     */
    parameters?: (Parameter | ReusableObject)[];

    /** * The body sent with the request.
     * Can contain Runtime Expressions like "{$inputs.customer}"
     */
    requestBody?: RequestBody;

    /** * Immediate assertions to validate this specific step.
     * Example: "$statusCode == 200"
     */
    successCriteria?: Criterion[];

    /** * Branching Logic: What to do when the step succeeds.
     * Used for "If eligible -> goto createCustomer, Else -> end"
     */
    onSuccess?: (SuccessActionObject | ReusableObject)[];


    /** * Branching Logic: What to do when the step fails.
     */
    onFailure?: (FailureActionObject | ReusableObject)[];
    /** * Output mapping.
     * Stores parts of the response into variables for later steps.
     */
    outputs?: Record<string, string>;
}

export interface SuccessActionObject {
    name: string;
    type: 'goto' | 'end'; // Possible action types
    workflowId?: string; // For 'goto' actions
    stepId?: string; // For 'goto' actions
    criteria?: Criterion[]; // Optional criteria to evaluate before action
}

export interface FailureActionObject {
    name: string;
    type: 'goto' | 'end' | 'retry'; // Possible action types
    workflowId?: string; // For 'goto' or 'retry' actions
    stepId?: string; // For 'goto' or 'retry' actions
    retryAfter?: number; // for 'retry' actions
    retryLimit?: number; // for 'retry' actions
    criteria?: Criterion[]; // Optional criteria to evaluate before action
}

export interface Criterion {
    //The logic to evaluate. (runtime expressions)

    condition: string;

    context?: string;       //must be provided if type is specified as jsonpath

    //Defaults to 'simple' if not specified
    type?: 'regex' | 'jsonpath' | 'simple' | 'xpath' | CriterionExpressionObject;
}

export interface CriterionExpressionObject {
    type: 'jsonpath' | 'xpath';
    expression: 'draft-goessner-dispatch-jsonpath-00' | 'xpath-10' | 'xpath-20' | 'xpath-30';
}

export interface Parameter {
    name: string;
    in: 'header' | 'query' | 'path' | 'cookie';
    //description?: string;
    //required?: boolean;
    value: any;  //can be a runtime expression or a raw value
    //schema?: JSONSchema;
}

export interface RequestBody {
    contentType?: string; // e.g., "application/json"
    // The payload can be a raw object or a stringified JSON with injected variables.
    payload: any;
    replacements?: PayloadReplacementObject[];
}

export interface PayloadReplacementObject {
    // JSONPath to locate the field in the payload 
    target: string;
    // The value or runtime expression to inject
    value: string | any;
}

// Reusable Components (For complex specs)

export interface ComponentsObject {
    inputs?: Record<string, JSONSchema>;
    parameters?: Record<string, Parameter>;
    successActions?: Record<string, SuccessActionObject | ReusableObject>;
    failureActions?: Record<string, FailureActionObject | ReusableObject>;
}

export interface ReusableObject {
    reference: string; // e.g., "#/components/parameters/param1"
    value?: string; // Optional overrides
}

// JSON Schema Helper (For complex Inputs)

// Simplified JSON Schema interface for Workflow Inputs.
// This matches the "inputs" section

export interface JSONSchema {
    type?: string; // "object", "string", "array", etc.
    required?: string[];
    properties?: Record<string, JSONSchema>;
    items?: JSONSchema; // For arrays
    oneOf?: JSONSchema[];
    anyOf?: JSONSchema[];
    description?: string;
    format?: string;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    [key: string]: any;
}