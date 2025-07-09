/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import { AIMachineEventType, Configurable, ErrorCode, ExpandedDMModel, FormField, InlineDataMapperModelResponse, InputCategory, IOType, Mapping, MappingElement, ParameterDefinitions, ParameterField, ParameterMetadata, RecordDefinitonObject, TypeInfo, TypeKind } from "@wso2/ballerina-core";
import { fetchWithTimeout, filterResponse, generateBallerinaCode, isErrorCode, navigateTypeInfo, REQUEST_TIMEOUT } from "./utils";
import { getAccessToken, getRefreshedAccessToken } from "../../utils/ai/auth";
import { NOT_LOGGED_IN, TIMEOUT } from "../../views/ai-panel/errorCodes";
import { AIStateMachine } from "../../views/ai-panel/aiMachine";
import { BACKEND_URL } from "../../features/ai/utils";

const BACKEND_BASE_URL = BACKEND_URL.replace(/\/v2\.0$/, "");

let abortController = new AbortController();

export function handleStop() {
    abortController.abort();
}

function transformIOType(input: IOType): FormField {
    const name = input.variableName || extractNameFromId(input.id);

    let typeName: string;
    if (input.kind && input.typeName && input.kind !== input.typeName && input.category) {
        typeName = input.kind;
    } else if (!input.typeName) {
        typeName = input.kind || "unknown";
    } else {
        typeName = input.typeName;
    }

    const baseField = {
        id: input.id,
        name,
        typeName,
        optional: input.optional || false
    };

    // Handle arrays
    if (input.kind === "array" && input.member) {
        const memberTransformed = transformIOType(input.member) as FormField;
        const { name, ...memberWithoutName } = memberTransformed;

        return {
            ...baseField,
            typeName: "array",
            memberType: memberWithoutName as FormField
        } as FormField;
    }

    // Handle records
    if (input.kind === "record" && input.fields) {
        const recordField: FormField = {
            ...baseField,
            typeName: "record",
            fields: input.fields.map(transformIOType) as FormField[]
        };

        if (
            input.typeName &&
            input.kind !== input.typeName &&
            !input.category
        ) {
            recordField.typeInfo = {
                orgName: "",
                moduleName: "",
                name: input.typeName
            };
        }

        return recordField;
    }

    // Handle primitive types
    const primitiveField: FormField = { ...baseField };

    // Add typeInfo if conditions are met
    if (
        input.typeName &&
        input.kind !== input.typeName &&
        !input.category
    ) {
        primitiveField.typeInfo = {
            orgName: "",
            moduleName: "",
            name: input.typeName
        };
    }

    return primitiveField;
}

function extractNameFromId(id: string): string {
    const parts = id.split('.').filter(part => !/^\d+$/.test(part));
    return parts[parts.length - 1];
}

function transformInputs(inputs: IOType[]): {
    constants: FormField[];
    configurables: FormField[];
    variables: FormField[];
    parameters: ParameterField[];
    fields: FormField[];
} {
    const constants: FormField[] = [];
    const configurables: FormField[] = [];
    const variables: FormField[] = [];
    const parameters: ParameterField[] = [];
    const fields: FormField[] = [];

    inputs.forEach((input) => {
        // Helper function to create ParameterField
        const createParameterField = (input: IOType): ParameterField => {
            const name = input.id;
            let typeName: string;

            if (input.kind !== input.typeName) {
                typeName = input.typeName;
            } else if (!input.typeName) {
                typeName = input.kind || "unknown";
            } else {
                typeName = input.typeName;
            }

            // Determine if it's an array type
            const isArrayType = input.kind === TypeKind.Array;

            // Determine the type string
            let type: string;
            if (isArrayType) {
                // If it's an array, get the member type and append []
                if (input.member) {
                    const memberTypeName = input.member.typeName || input.member.kind || "unknown";
                    type = `${memberTypeName}[]`;
                } else {
                    type = `${typeName}[]`;
                }
            } else {
                type = input.kind;
            }

            return {
                isArrayType,
                parameterName: name,
                parameterType: typeName,
                type
            };
        };

        const createOtherField = (input: IOType): FormField => {
            if (!input.typeName) {
                throw new Error("TypeName is missing");
            }
            return {
                name: input.id,
                typeName: input.kind || "unknown"
            };
        };

        // Handle different categories
        if (input.category === InputCategory.Constant) {
            constants.push(createOtherField(input));
            return;
        }

        if (input.category === InputCategory.Configurable) {
            configurables.push(createOtherField(input));
            return;
        }

        if (input.category === InputCategory.Variable) {
            variables.push(createOtherField(input));
            return;
        }

        if (input.category === InputCategory.Parameter) {
            parameters.push(createParameterField(input));
            if (input.fields) {
                fields.push(...input.fields.map(transformIOType));
            } else {
                fields.push(transformIOType(input));
            }
        }
    });

    return { constants, configurables, variables, parameters, fields };
}

function transformOutput(output: IOType): FormField[] {
    if (output.fields) {
        return output.fields.map(transformIOType);
    }
    return [transformIOType(output)];
}

function transformCodeObjectToMappings(codeObject: any, request: InlineDataMapperModelResponse): Mapping[] {
    const mappings: Mapping[] = [];
    
    // Get the output variable name from the request
    const { output: mappingOutput } = request.mappingsModel as ExpandedDMModel;
    const outputVariableName = mappingOutput.variableName || extractNameFromId(mappingOutput.id);
    
    // Iterate through each property in codeObject
    Object.keys(codeObject).forEach(key => {
        const mapping: Mapping = {
            output: `${outputVariableName}.${key}`,
            expression: codeObject[key]
        };
        mappings.push(mapping);
    });
    
    return mappings;
}

export async function getInlineParamDefinitions(
    modelResponse: InlineDataMapperModelResponse
): Promise<ParameterDefinitions | ErrorCode> {
    let inputs: { [key: string]: any } = {};
    let inputMetadata: { [key: string]: any } = {};
    let output: { [key: string]: any } = {};
    let outputMetadata: { [key: string]: any } = {};
    let isErrorExists = false;

    let { inputs: mappingInputs, output: mappingOutput } = modelResponse.mappingsModel as ExpandedDMModel;
    let transformedInputs = transformInputs(mappingInputs);
    let transformedOutputs = transformOutput(mappingOutput);

    let inputDefinition: ErrorCode | RecordDefinitonObject = {
        recordFields: {},
        recordFieldsMetadata: {}
    } as RecordDefinitonObject;
    if (transformedInputs.hasOwnProperty('fields')) {
        inputDefinition = navigateTypeInfo(transformedInputs.fields, false);
    }

    if (isErrorCode(inputDefinition)) {
        return inputDefinition as ErrorCode;
    }

    inputs = { ...inputs, [transformedInputs.parameters[0].parameterName]: (inputDefinition as RecordDefinitonObject).recordFields };
    inputMetadata = {
        ...inputMetadata,
        [transformedInputs.parameters[0].parameterName]: {
            "isArrayType": transformedInputs.parameters[0].isArrayType,
            "parameterName": transformedInputs.parameters[0].parameterName,
            "parameterType": transformedInputs.parameters[0].parameterType,
            "type": transformedInputs.parameters[0].type,
            "fields": (inputDefinition as RecordDefinitonObject).recordFieldsMetadata
        }
    };

    const outputDefinition = navigateTypeInfo(transformedOutputs, false);

    if (isErrorCode(outputDefinition)) {
        return outputDefinition as ErrorCode;
    }

    output = { ...(outputDefinition as RecordDefinitonObject).recordFields };
    outputMetadata = { ...(outputDefinition as RecordDefinitonObject).recordFieldsMetadata };

    const response = {
        inputs,
        output,
        inputMetadata,
        outputMetadata,
        constants: transformedInputs.constants,
        configurables: transformedInputs.configurables,
        variables: transformedInputs.variables
    };

    return {
        parameterMetadata: response,
        errorStatus: isErrorExists
    };
}

async function sendInlineDatamapperRequest(parameterDefinitions: InlineDataMapperModelResponse | ErrorCode, accessToken: string | ErrorCode): Promise<Response | ErrorCode> {
    const response = await fetchWithTimeout(BACKEND_URL + "/inline/datamapper", {
        method: "POST",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Ballerina-VSCode-Plugin',
            'Authorization': 'Bearer ' + accessToken
        },
        body: JSON.stringify(parameterDefinitions)
    }, REQUEST_TIMEOUT);

    return response;
}

async function getInlineDatamapperCode(InlineDataMapperRequest: InlineDataMapperModelResponse | ErrorCode, parameterDefinitions: ParameterMetadata | ErrorCode): Promise<object | ErrorCode> {
    let nestedKeyArray: string[] = [];
    try {
        const accessToken = await getAccessToken().catch((error) => {
            console.error(error);
            return NOT_LOGGED_IN;
        });
        let response = await sendInlineDatamapperRequest(InlineDataMapperRequest, accessToken);
        if (isErrorCode(response)) {
            return (response as ErrorCode);
        }

        response = (response as Response);

        // Refresh
        if (response.status === 401) {
            const newAccessToken = await getRefreshedAccessToken();
            if (!newAccessToken) {
                AIStateMachine.service().send(AIMachineEventType.LOGOUT);
                return;
            }
            let retryResponse: Response | ErrorCode = await sendInlineDatamapperRequest(InlineDataMapperRequest, newAccessToken);

            if (isErrorCode(retryResponse)) {
                return (retryResponse as ErrorCode);
            }

            retryResponse = (retryResponse as Response);
            let intermediateMapping = await filterResponse(retryResponse); 
            let finalCode = await generateBallerinaCode(intermediateMapping, parameterDefinitions, "", nestedKeyArray);
            return finalCode;
        }
        let intermediateMapping = await filterResponse(response);
        let finalCode = await generateBallerinaCode(intermediateMapping, parameterDefinitions, "", nestedKeyArray);
        return finalCode;
    } catch (error) {
        console.error(error);
        return TIMEOUT;
    }
}

export async function processInlineMappings(
    request: InlineDataMapperModelResponse
): Promise<MappingElement | ErrorCode> {
    const modelResponse = request as InlineDataMapperModelResponse;
    let result = await getInlineParamDefinitions(modelResponse);
    if (isErrorCode(result)) {
        return result as ErrorCode;
    }
    let parameterDefinitions = (result as ParameterDefinitions).parameterMetadata;

    const codeObject = await getInlineDatamapperCode(request, parameterDefinitions);
    if (isErrorCode(codeObject) || Object.keys(codeObject).length === 0) {
        return codeObject as ErrorCode;
    }

    const mappings: Mapping[] = transformCodeObjectToMappings(codeObject, request);
    return {mappings};
}
