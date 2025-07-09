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


import React, { useEffect, useState, useRef } from "react";

import {
    AddArrayElementRequest,
    ConvertToQueryRequest,
    ExpandedDMModel,
    IDMFormProps,
    DMModel,
    ModelState,
    AddClausesRequest,
    IDMViewState,
    IntermediateClause,
    InlineDataMapperModelRequest,
    InlineDataMapperBase
} from "@wso2/ballerina-core";
import { ProgressIndicator } from "@wso2/ui-toolkit";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { DataMapperView } from "@wso2/ballerina-inline-data-mapper";

import { useInlineDataMapperModel } from "../../Hooks";
import { expandDMModel } from "./modelProcessor";
import FormGeneratorNew from "../BI/Forms/FormGeneratorNew";
import { InlineDataMapperProps } from ".";

// Types for model comparison
interface ModelSignature {
    inputs: string[];
    output: string;
    subMappings: string[];
    types: string;
}

export function InlineDataMapperView(props: InlineDataMapperProps) {
    const { filePath, codedata, varName } = props;

    const [isFileUpdateError, setIsFileUpdateError] = useState(false);
    const [modelState, setModelState] = useState<ModelState>({
        model: null,
        hasInputsOutputsChanged: false
    });
    const [viewState, setViewState] = useState<IDMViewState>({
        viewId: varName,
        codedata: codedata
    });
    
    // Keep track of previous inputs/outputs and sub mappings for comparison
    const prevSignatureRef = useRef<string>(null);

    const { rpcClient } = useRpcContext();
    const {
        model,
        isFetching,
        isError
    } = useInlineDataMapperModel(filePath, viewState);

    const modelParams: InlineDataMapperModelRequest = {
        filePath,
        codedata,
        position: {
            line: codedata.lineRange.startLine.line,
            offset: codedata.lineRange.startLine.offset
        }
    };

    const sourceParams: InlineDataMapperBase = {
        filePath,
        codedata,
        varName
    };

    useEffect(() => {
        setViewState(prev => ({
            ...prev,
            codedata
        }));
    }, [varName, codedata]);

    useEffect(() => {
        if (!model) return;

        const currentSignature = JSON.stringify(getModelSignature(model));
        const prevSignature = prevSignatureRef.current;

        const hasInputsChanged = hasSignatureChanged(currentSignature, prevSignature, 'inputs');
        const hasOutputChanged = hasSignatureChanged(currentSignature, prevSignature, 'output');
        const hasSubMappingsChanged = hasSignatureChanged(currentSignature, prevSignature, 'subMappings');
        const hasTypesChanged = hasSignatureChanged(currentSignature, prevSignature, 'types');

        // Check if it's already an ExpandedDMModel
        const isExpandedModel = !('types' in model);
        if (isExpandedModel) {
            setModelState({
                model: model as ExpandedDMModel,
                hasInputsOutputsChanged: hasInputsChanged || hasOutputChanged,
                hasSubMappingsChanged: hasSubMappingsChanged
            });
            prevSignatureRef.current = currentSignature;
            return;
        }

        // If types changed, we need to reprocess everything
        if (hasTypesChanged || hasInputsChanged || hasOutputChanged || hasSubMappingsChanged) {
            const expandedModel = expandDMModel(model as DMModel, {
                processInputs: hasInputsChanged || hasTypesChanged,
                processOutput: hasOutputChanged || hasTypesChanged,
                processSubMappings: hasSubMappingsChanged || hasTypesChanged,
                previousModel: modelState.model as ExpandedDMModel
            });
            setModelState({
                model: expandedModel,
                hasInputsOutputsChanged: hasInputsChanged || hasOutputChanged || hasTypesChanged,
                hasSubMappingsChanged: hasSubMappingsChanged || hasTypesChanged
            });
        } else {
            setModelState(prev => ({
                model: {
                    ...prev.model!,
                   mappings: (model as DMModel).mappings
                }
            }));
        }

        prevSignatureRef.current = currentSignature;
    }, [model]);

    const onClose = () => {
        rpcClient.getVisualizerRpcClient()?.goBack();
    }

    const updateExpression = async (outputId: string, expression: string, viewId: string, name: string) => {
        try {
            const resp = await rpcClient
                .getInlineDataMapperRpcClient()
                .getDataMapperSource({
                    filePath,
                    codedata,
                    varName: name,
                    targetField: viewId,
                    mapping: {
                        output: outputId,
                        expression: expression
                    }
                });
            console.log(">>> [Inline Data Mapper] getSource response:", resp);
        } catch (error) {
            console.error(error);
            setIsFileUpdateError(true);
        }
    };

    const addArrayElement = async (outputId: string, viewId: string, name: string) => {
        try {
            const addElementRequest: AddArrayElementRequest = {
                filePath,
                codedata,
                varName: name,
                targetField: outputId,
                propertyKey: "expression" // TODO: Remove this once the API is updated
            };
            const resp = await rpcClient
                .getInlineDataMapperRpcClient()
                .addNewArrayElement(addElementRequest);
            console.log(">>> [Inline Data Mapper] addArrayElement response:", resp);
        } catch (error) {
            console.error(error);
            setIsFileUpdateError(true);
        }
    };

    const handleView = async (viewId: string, isSubMapping?: boolean) => {
        if (isSubMapping) {
            const resp = await rpcClient
                .getInlineDataMapperRpcClient()
                .getSubMappingCodedata({
                    filePath,
                    codedata,
                    view: viewId
                });
            console.log(">>> [Inline Data Mapper] getSubMappingCodedata response:", resp);
            setViewState({viewId, codedata: resp.codedata});
        } else {
            setViewState(prev => ({
                ...prev,
                viewId
            }));
        }
    };

    const generateForm = (formProps: IDMFormProps) => {
        return (
            <FormGeneratorNew
                fileName={filePath}
                {...formProps}
            />
        )
    }

    const convertToQuery = async (outputId: string, viewId: string, name: string) => {
        try {
            const convertToQueryRequest: ConvertToQueryRequest = {
                filePath,
                codedata,
                varName: name,
                targetField: outputId,
                propertyKey: "expression" // TODO: Remove this once the API is updated
            };
            const resp = await rpcClient
                .getInlineDataMapperRpcClient()
                .convertToQuery(convertToQueryRequest);
            console.log(">>> [Inline Data Mapper] convertToQuery response:", resp);
        } catch (error) {
            console.error(error);
            setIsFileUpdateError(true);
        }
    }

    const addClauses = async (clause: IntermediateClause, targetField: string, isNew: boolean, index?:number) => {
        try {
            const addClausesRequest: AddClausesRequest = {
                filePath,
                codedata: {
                    ...codedata,
                    isNew: true
                },
                index,
                clause,
                targetField
            };
            console.log(">>> [Inline Data Mapper] addClauses request:", addClausesRequest);

            const resp = await rpcClient
                .getInlineDataMapperRpcClient()
                .addClauses(addClausesRequest);
            console.log(">>> [Inline Data Mapper] addClauses response:", resp);
        } catch (error) {
            console.error(error);
            setIsFileUpdateError(true);
        }
    }

    useEffect(() => {
        // Hack to hit the error boundary
        if (isError) {
            throw new Error("Error while fetching input/output types");
        } else if (isFileUpdateError) {
            throw new Error("Error while updating file content");
        } 
    }, [isError]);

    return (
        <>
            {isFetching && (
                 <ProgressIndicator /> 
            )}
            {modelState.model && (
                <DataMapperView 
                    modelState={modelState}
                    name={varName}
                    onClose={onClose} 
                    applyModifications={updateExpression}
                    addArrayElement={addArrayElement}
                    handleView={handleView}
                    generateForm={generateForm}
                    convertToQuery={convertToQuery}
                    addClauses={addClauses}
                    modelParams={modelParams}
                    sourceParams={sourceParams}
                />
            )}
        </>
    );
};

const getModelSignature = (model: DMModel | ExpandedDMModel): ModelSignature => ({
    inputs: model.inputs.map(i => i.id),
    output: model.output.id,
    subMappings: model.subMappings?.map(s => s.id) || [],
    types: 'types' in model ? JSON.stringify(model.types) : ''
});

const hasSignatureChanged = (
    current: string,
    previous: string | null,
    field: keyof ModelSignature
): boolean => {
    if (!previous) return true;
    const currentObj = JSON.parse(current);
    const previousObj = JSON.parse(previous);
    return JSON.stringify(currentObj[field]) !== JSON.stringify(previousObj[field]);
};
