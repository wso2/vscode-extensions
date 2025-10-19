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


import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import debounce from "lodash/debounce";

import {
    AddArrayElementRequest,
    ConvertToQueryRequest,
    ExpandedDMModel,
    DMFormProps,
    DMModel,
    ModelState,
    AddClausesRequest,
    DMViewState,
    IntermediateClause,
    TriggerCharacter,
    TRIGGER_CHARACTERS,
    Mapping,
    CodeData,
    FnMetadata,
    NodePosition,
    EVENT_TYPE,
    LineRange,
    ResultClauseType,
    IOType,
    MACHINE_VIEW,
    VisualizerLocation,
    DeleteClauseRequest,
    IORoot
} from "@wso2/ballerina-core";
import { CompletionItem, ProgressIndicator } from "@wso2/ui-toolkit";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { DataMapper } from "@wso2/ballerina-data-mapper";

import { useDataMapperModel } from "../../Hooks";
import FormGeneratorNew from "../BI/Forms/FormGeneratorNew";
import { DataMapperProps } from ".";
import { EXPRESSION_EXTRACTION_REGEX } from "../../constants";
import { calculateExpressionOffsets, convertBalCompletion, updateLineRange } from "../../utils/bi";
import { createAddSubMappingRequest } from "./utils";
import { FunctionForm } from "../BI/FunctionForm";
import { UndoRedoGroup } from "../../components/UndoRedoGroup";

// Types for model comparison
interface ModelSignature {
    inputs: string[];
    output: string;
    subMappings: string[];
    refs: string;
}

export function DataMapperView(props: DataMapperProps) {
    const { filePath, codedata, name, projectUri, position, reusable, onClose } = props;

    const [isFileUpdateError, setIsFileUpdateError] = useState(false);
    const [modelState, setModelState] = useState<ModelState>({
        model: null,
        hasInputsOutputsChanged: false
    });
    const [viewState, setViewState] = useState<DMViewState>({
        viewId: name,
        codedata: codedata
    });

    /* Completions related */
    const [completions, setCompletions] = useState<CompletionItem[]>([]);
    const prevCompletionFetchText = useRef<string>("");
    const [filteredCompletions, setFilteredCompletions] = useState<CompletionItem[]>([]);
    const expressionOffsetRef = useRef<number>(0); // To track the expression offset on adding import statements
    const [isUpdatingSource, setIsUpdatingSource] = useState<boolean>(false);

    // Keep track of previous inputs/outputs and sub mappings for comparison
    const prevSignatureRef = useRef<string>(null);

    const { rpcClient } = useRpcContext();
    const {
        model,
        isFetching,
        isError,
        refreshDMModel
    } = useDataMapperModel(filePath, viewState, position);

    const prevPositionRef = useRef(position);

    useEffect(() => {
        const positionChanged =
            prevPositionRef.current?.line !== position?.line ||
            prevPositionRef.current?.offset !== position?.offset;

        setViewState(prevState => ({
            viewId: positionChanged ? name : prevState.viewId || name,
            codedata: codedata,
            // Preserve subMappingName only if the position hasn't changed and there is an existing sub-mapping name.
            // This ensures that changing the position resets the sub-mapping context.
            subMappingName: !positionChanged && prevState.subMappingName
        }));

        prevPositionRef.current = position;
    }, [name, codedata, position]);

    useEffect(() => {
        if (!model) return;

        const currentSignature = JSON.stringify(getModelSignature(model));
        const prevSignature = prevSignatureRef.current;

        const triggerRefresh = model.triggerRefresh;

        const hasInputsChanged = triggerRefresh || hasSignatureChanged(currentSignature, prevSignature, 'inputs');
        const hasOutputChanged = triggerRefresh || hasSignatureChanged(currentSignature, prevSignature, 'output');
        const hasSubMappingsChanged = triggerRefresh || hasSignatureChanged(currentSignature, prevSignature, 'subMappings');
        const hasRefsChanged = triggerRefresh || hasSignatureChanged(currentSignature, prevSignature, 'refs');

        // Check if it's already an ExpandedDMModel
        const isExpandedModel = !('refs' in model);
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
        if (hasRefsChanged || hasInputsChanged || hasOutputChanged || hasSubMappingsChanged) {
            const processExpandedModel = async () => {
                try {
                    const expandedModelResponse = await rpcClient.getDataMapperRpcClient().getExpandedDMFromDMModel(
                        {
                            model: model as DMModel,
                            options: {
                                processInputs: hasInputsChanged || hasRefsChanged,
                                processOutput: hasOutputChanged || hasRefsChanged,
                                processSubMappings: hasSubMappingsChanged || hasRefsChanged,
                                previousModel: modelState.model as ExpandedDMModel
                            },
                            rootViewId: name
                        }
                    );
                    console.log(">>> [Data Mapper] processed expandedModel:", expandedModelResponse);
                    setModelState({
                        model: expandedModelResponse.expandedModel,
                        hasInputsOutputsChanged: hasInputsChanged || hasOutputChanged || hasRefsChanged,
                        hasSubMappingsChanged: hasSubMappingsChanged || hasRefsChanged
                    });
                } catch (error) {
                    console.error("Error processing expanded model:", error);
                    throw error;
                }
            };

            processExpandedModel();
        } else {
            setModelState(prev => ({
                model: {
                    ...prev.model!,
                    mappings: model.mappings,
                    query: model.query
                }
            }));
        }

        prevSignatureRef.current = currentSignature;

    }, [model]);

    const hasInputs = useMemo(
        () => modelState.model?.inputs?.length > 0,
        [modelState]
    );

    const hasOutputs = useMemo(
        () => !!modelState.model?.output,
        [modelState]
    );

    const updateExpression = async (outputId: string, expression: string, viewId: string, name: string) => {
        try {
            const resp = await rpcClient
                .getDataMapperRpcClient()
                .getDataMapperSource({
                    filePath,
                    codedata: viewState.codedata,
                    varName: name,
                    targetField: viewId,
                    mapping: {
                        output: outputId,
                        expression: expression
                    },
                    subMappingName: viewState.subMappingName
                });
            console.log(">>> [Data Mapper] getSource response:", resp);
        } catch (error) {
            console.error(error);
            setIsFileUpdateError(true);
        }
    };

    const updateExprFromExprBar = async (outputId: string, expression: string, viewId: string, name: string) => {
        setIsUpdatingSource(true);
        await updateExpression(outputId, expression, viewId, name);
        setIsUpdatingSource(false);
    }

    const addArrayElement = async (outputId: string, viewId: string, name: string) => {
        try {
            const addElementRequest: AddArrayElementRequest = {
                filePath,
                codedata: viewState.codedata,
                varName: name,
                outputId: outputId,
                targetField: viewId,
                propertyKey: "expression", // TODO: Remove this once the API is updated
                subMappingName: viewState.subMappingName
            };
            const resp = await rpcClient
                .getDataMapperRpcClient()
                .addNewArrayElement(addElementRequest);
            console.log(">>> [Data Mapper] addArrayElement response:", resp);
        } catch (error) {
            console.error(error);
            setIsFileUpdateError(true);
        }
    };

    const handleView = async (viewId: string, isSubMapping?: boolean) => {
        if (isSubMapping) {
            if (viewState.subMappingName) {
                // If the view is a sub mapping, we can reuse the codedata of the parent view
                setViewState({ viewId, codedata: viewState.codedata, subMappingName: viewState.subMappingName });
            } else {
                const resp = await rpcClient
                    .getDataMapperRpcClient()
                    .getSubMappingCodedata({
                        filePath,
                        codedata: viewState.codedata,
                        view: viewId
                    });
                console.log(">>> [Data Mapper] getSubMappingCodedata response:", resp);
                setViewState({ viewId, codedata: resp.codedata, subMappingName: viewId });
            }
        } else {
            if (viewState.subMappingName) {
                // If the view is a sub mapping, we need to get the codedata of the parent mapping
                const res = await rpcClient
                    .getDataMapperRpcClient()
                    .getDataMapperCodedata({
                        filePath,
                        codedata: viewState.codedata,
                        name: viewId
                    });
                setViewState({ viewId, codedata: res.codedata, subMappingName: undefined });
            } else {
                setViewState(prev => ({
                    ...prev,
                    viewId
                }));
            }
        }
    };

    const generateForm = (formProps: DMFormProps) => {
        return (
            <FormGeneratorNew
                fileName={filePath}
                preserveFieldOrder={true}
                helperPaneSide="left"
                {...formProps}
            />
        )
    }

    const convertToQuery = async (mapping: Mapping, clauseType: ResultClauseType, viewId: string, name: string) => {
        try {
            const convertToQueryRequest: ConvertToQueryRequest = {
                filePath,
                codedata: viewState.codedata,
                mapping,
                clauseType,
                varName: name,
                targetField: viewId,
                propertyKey: "expression", // TODO: Remove this once the API is updated
                subMappingName: viewState.subMappingName
            };
            const resp = await rpcClient
                .getDataMapperRpcClient()
                .convertToQuery(convertToQueryRequest);
            console.log(">>> [Data Mapper] convertToQuery response:", resp);
        } catch (error) {
            console.error(error);
            setIsFileUpdateError(true);
        }
    }

    const addClauses = async (clause: IntermediateClause, targetField: string, isNew: boolean, index: number) => {
        try {
            const addClausesRequest: AddClausesRequest = {
                filePath,
                codedata: {
                    ...viewState.codedata,
                    isNew
                },
                index,
                clause,
                targetField,
                varName: name,
                subMappingName: viewState.subMappingName
            };
            console.log(">>> [Data Mapper] addClauses request:", addClausesRequest);

            const resp = await rpcClient
                .getDataMapperRpcClient()
                .addClauses(addClausesRequest);
            console.log(">>> [Data Mapper] addClauses response:", resp);
        } catch (error) {
            console.error(error);
            setIsFileUpdateError(true);
        }
    }

    const deleteClause = async (targetField: string, index: number) => {
        try {
            const deleteClauseRequest: DeleteClauseRequest = {
                filePath,
                codedata: viewState.codedata,
                index,
                targetField,
                varName: name,
                subMappingName: viewState.subMappingName
            };
            console.log(">>> [Data Mapper] deleteClause request:", deleteClauseRequest);

            const resp = await rpcClient
                .getDataMapperRpcClient()
                .deleteClause(deleteClauseRequest);
            console.log(">>> [Data Mapper] deleteClause response:", resp);
        } catch (error) {
            console.error(error);
            setIsFileUpdateError(true);
        }
    }

    const addSubMapping = async (
        subMappingName: string,
        type: string,
        index: number,
        targetField: string,
        importsCodedata?: CodeData
    ) => {
        try {
            const visualizableResponse = await rpcClient
                .getDataMapperRpcClient()
                .getVisualizableFields({
                    filePath,
                    codedata: importsCodedata || { symbol: type }
                });
            console.log(">>> [Data Mapper] getVisualizableFields response:", visualizableResponse);

            const defaultValue = visualizableResponse.visualizableProperties.defaultValue;
            const request = createAddSubMappingRequest(
                filePath,
                viewState.codedata,
                index,
                targetField,
                subMappingName,
                type,
                name,
                defaultValue
            );

            console.log(">>> [Data Mapper] addSubMapping request:", request);

            const response = await rpcClient
                .getDataMapperRpcClient()
                .addSubMapping(request);
            console.log(">>> [Data Mapper] addSubMapping response:", response);
        } catch (error) {
            console.error(error);
            setIsFileUpdateError(true);
        }
    };

    const deleteMapping = async (mapping: Mapping, viewId: string) => {
        try {
            const resp = await rpcClient
                .getDataMapperRpcClient()
                .deleteMapping({
                    filePath,
                    codedata: viewState.codedata,
                    mapping,
                    varName: name,
                    targetField: viewId,
                    subMappingName: viewState.subMappingName
                });
            console.log(">>> [Data Mapper] deleteMapping response:", resp);
        } catch (error) {
            console.error(error);
            setIsFileUpdateError(true);
        }
    };

    const deleteSubMapping = async (index: number, viewId: string) => {
        try {
            const resp = await rpcClient
                .getDataMapperRpcClient()
                .deleteSubMapping({
                    filePath,
                    codedata: viewState.codedata,
                    index,
                    varName: name,
                    targetField: viewId,
                    subMappingName: viewState.subMappingName
                });
            console.log(">>> [Data Mapper] deleteSubMapping response:", resp);
        } catch (error) {
            console.error(error);
            setIsFileUpdateError(true);
        }
    };

    const mapWithCustomFn = async (mapping: Mapping, metadata: FnMetadata, viewId: string) => {
        try {
            const resp = await rpcClient
                .getDataMapperRpcClient()
                .mapWithCustomFn({
                    filePath,
                    codedata: viewState.codedata,
                    mapping,
                    functionMetadata: metadata,
                    varName: name,
                    targetField: viewId,
                    subMappingName: viewState.subMappingName
                });
            console.log(">>> [Data Mapper] mapWithCustomFn response:", resp);
        } catch (error) {
            console.error(error);
            setIsFileUpdateError(true);
        }
    };

    const mapWithTransformFn = async (mapping: Mapping, metadata: FnMetadata, viewId: string) => {
        try {
            const resp = await rpcClient
                .getDataMapperRpcClient()
                .mapWithTransformFn({
                    filePath,
                    codedata: viewState.codedata,
                    mapping,
                    functionMetadata: metadata,
                    varName: name,
                    targetField: viewId,
                    subMappingName: viewState.subMappingName
                });
            console.log(">>> [Data Mapper] mapWithTransformFn response:", resp);
        } catch (error) {
            console.error(error);
            setIsFileUpdateError(true);
        }
    };

    const goToFunction = async (functionRange: LineRange) => {
        const documentUri: string = await rpcClient.getVisualizerRpcClient().joinProjectPath(functionRange.fileName);
        const position: NodePosition = {
            startLine: functionRange.startLine.line,
            startColumn: functionRange.startLine.offset,
            endLine: functionRange.endLine.line,
            endColumn: functionRange.endLine.offset
        };
        rpcClient
            .getVisualizerRpcClient()
            .openView({ type: EVENT_TYPE.OPEN_VIEW, location: { documentUri, position } });
    };

    const goToSource = async (outputId: string, viewId: string) => {
        const { property } = await rpcClient.getDataMapperRpcClient().getProperty({
            filePath,
            codedata: viewState.codedata,
            propertyKey: "expression", // TODO: Remove this once the API is updated
            targetField: viewId,
            fieldId: outputId,
        })
        if (property.codedata) {
            const position: NodePosition = {
                startLine: property.codedata.lineRange?.startLine?.line,
                startColumn: property.codedata.lineRange?.startLine?.offset,
                endLine: property.codedata.lineRange?.endLine?.line,
                endColumn: property.codedata.lineRange?.endLine?.offset,
            };
            rpcClient.getCommonRpcClient().goToSource({ position, fileName: property.codedata.lineRange?.fileName });
        }
    }

    const enrichChildFields = async (parentField: IOType) => {
        if (!parentField.ref) return;

        const response = await rpcClient.getDataMapperRpcClient().getProcessTypeReference({
            ref: parentField.ref,
            fieldId: parentField.id,
            model: model as DMModel
        });

        if (!response.success || !response.result) {
            throw new Error(`Failed to get process type reference: ${response.error}`);
        }

        parentField.fields = response.result.fields;
        parentField.isDeepNested = false;
    }



    const onDMClose = () => {
        onClose ? onClose() : rpcClient.getVisualizerRpcClient()?.goBack();
    }

    const onDMRefresh = async () => {
        try {
            const resp = await rpcClient
                .getDataMapperRpcClient()
                .clearTypeCache();
            console.log(">>> [Data Mapper] clearTypeCache response:", resp);
        } catch (error) {
            console.error(error);
        }
        await refreshDMModel();
    };

    const onDMReset = async () => {
        await deleteMapping(
            { output: name, expression: undefined },
            name
        );
    };

    const onEdit = () => {
        const context: VisualizerLocation = {
            view: MACHINE_VIEW.BIDataMapperForm,
            identifier: modelState.model.output.name,
            documentUri: filePath,
        };

        rpcClient.getVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: context });
    }


    useEffect(() => {
        // Hack to hit the error boundary
        if (isError) {
            throw new Error("Error while fetching input/output types");
        } else if (isFileUpdateError) {
            throw new Error("Error while updating file content");
        }
    }, [isError]);

    const retrieveCompeletions = useCallback(
        debounce(async (outputId: string, viewId: string, value: string, cursorPosition?: number) => {
            let expressionCompletions: CompletionItem[] = [];
            const { parentContent, lastCompletionTrigger, currentContent } =
                value.slice(0, cursorPosition).match(EXPRESSION_EXTRACTION_REGEX)?.groups ?? {};
            const lastTriggerCharacter = TRIGGER_CHARACTERS.find(c => c === lastCompletionTrigger);
            const triggerCharacter = lastTriggerCharacter && parentContent !== prevCompletionFetchText.current ?
                lastTriggerCharacter : undefined;
            if (completions.length > 0 && parentContent === prevCompletionFetchText.current) {
                expressionCompletions = completions
                    .filter((completion) => {
                        const lowerCaseText = currentContent.toLowerCase();
                        const lowerCaseLabel = completion.value.toLowerCase();

                        return lowerCaseLabel.startsWith(lowerCaseText);
                    })
                    .sort((a, b) => a.sortText.localeCompare(b.sortText));
            } else {
                const { property } = await rpcClient.getDataMapperRpcClient().getProperty({
                    filePath,
                    codedata: viewState.codedata,
                    propertyKey: "expression", // TODO: Remove this once the API is updated
                    targetField: viewId,
                    fieldId: outputId,
                })
                const { lineOffset, charOffset } = calculateExpressionOffsets(value, cursorPosition);
                const startLine = updateLineRange(codedata.lineRange, expressionOffsetRef.current).startLine;
                let completions = await rpcClient.getBIDiagramRpcClient().getExpressionCompletions({
                    filePath,
                    context: {
                        expression: value,
                        startLine: startLine,
                        lineOffset: lineOffset,
                        offset: charOffset,
                        codedata: viewState.codedata,
                        property: property,
                    },
                    completionContext: {
                        triggerKind: triggerCharacter ? 2 : 1,
                        triggerCharacter: triggerCharacter as TriggerCharacter
                    }
                });

                // Convert completions to the ExpressionEditor format
                let convertedCompletions: CompletionItem[] = [];
                completions?.forEach((completion) => {
                    if (completion.detail) {
                        // HACK: Currently, completion with additional edits apart from imports are not supported
                        // Completions that modify the expression itself (ex: member access)
                        convertedCompletions.push(convertBalCompletion(completion));
                    }
                });
                setCompletions(convertedCompletions);

                if (triggerCharacter) {
                    expressionCompletions = convertedCompletions;
                } else {
                    expressionCompletions = convertedCompletions
                        .filter((completion) => {
                            const lowerCaseText = currentContent.toLowerCase();
                            const lowerCaseLabel = completion.value.toLowerCase();

                            return lowerCaseLabel.startsWith(lowerCaseText);
                        })
                        .sort((a, b) => a.sortText.localeCompare(b.sortText));
                }
                prevCompletionFetchText.current = parentContent ?? "";
            }
            setFilteredCompletions(expressionCompletions);
        }, 150),
        [filePath, codedata, name, completions]
    );

    const handleCompletionSelect = (value: string) => {
        // TODO: Implement handling imports
    };

    const handleExpressionCancel = () => {
        retrieveCompeletions.cancel();
        setCompletions([]);
        setFilteredCompletions([]);
    }

    const undoRedoGroup = () => {
        return <UndoRedoGroup key={Date.now()} />;
    }

    return (
        <>
            {isFetching && (
                <ProgressIndicator />
            )}
            {modelState.model && (
                <>
                    {reusable && (!hasInputs || !hasOutputs) ? (
                        <FunctionForm
                            projectPath={projectUri}
                            filePath={filePath}
                            functionName={modelState.model.output.name}
                            isDataMapper={true}
                        />
                    ) : (
                        <DataMapper
                            modelState={modelState}
                            name={name}
                            onClose={onDMClose}
                            onRefresh={onDMRefresh}
                            onReset={onDMReset}
                            onEdit={reusable ? onEdit : undefined}
                            applyModifications={updateExpression}
                            addArrayElement={addArrayElement}
                            handleView={handleView}
                            generateForm={generateForm}
                            convertToQuery={convertToQuery}
                            addClauses={addClauses}
                            deleteClause={deleteClause}
                            addSubMapping={addSubMapping}
                            deleteMapping={deleteMapping}
                            deleteSubMapping={deleteSubMapping}
                            mapWithCustomFn={mapWithCustomFn}
                            mapWithTransformFn={mapWithTransformFn}
                            goToFunction={goToFunction}
                            enrichChildFields={enrichChildFields}
                            undoRedoGroup={undoRedoGroup}
                            expressionBar={{
                                completions: filteredCompletions,
                                isUpdatingSource,
                                triggerCompletions: retrieveCompeletions,
                                onCompletionSelect: handleCompletionSelect,
                                onSave: updateExprFromExprBar,
                                onCancel: handleExpressionCancel,
                                goToSource: goToSource
                            }}
                        />
                    )}
                </>
            )}
        </>
    );
};

const getModelSignature = (model: DMModel | ExpandedDMModel): ModelSignature => ({
    inputs: model.inputs.map(i => i.name),
    output: model.output.name,
    subMappings: model.subMappings?.map(s => (s as IORoot | IOType).name) || [],
    refs: 'refs' in model ? JSON.stringify(model.refs) : ''
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
