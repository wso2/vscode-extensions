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

import { RefObject, useCallback, useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from "react";
import {
    EVENT_TYPE,
    FlowNode,
    LineRange,
    NodePosition,
    SubPanel,
    VisualizerLocation,
    TRIGGER_CHARACTERS,
    TriggerCharacter,
    FormDiagnostics,
    TextEdit,
    SubPanelView,
    LinePosition,
    ExpressionProperty,
    Type,
    RecordTypeField,
    Imports,
    CodeData,
    VisualizableField,
    Member,
    TypeNodeKind,
    NodeKind
} from "@wso2/ballerina-core";
import {
    FormField,
    FormValues,
    Form,
    ExpressionFormField,
    FormExpressionEditorProps,
    PanelContainer,
    FormImports,
} from "@wso2/ballerina-side-panel";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import {
    Button,
    CompletionItem,
    FormExpressionEditorRef,
    HelperPaneHeight,
    ThemeColors,
} from "@wso2/ui-toolkit";
import styled from "@emotion/styled";

import {
    convertBalCompletion,
    convertNodePropertiesToFormFields,
    convertToFnSignature,
    convertToVisibleTypes,
    enrichFormTemplatePropertiesWithValues,
    filterUnsupportedDiagnostics,
    getFormProperties,
    getImportsForFormFields,
    calculateExpressionOffsets,
    injectHighlightTheme,
    removeDuplicateDiagnostics,
    updateLineRange,
} from "../../../../utils/bi";
import IfForm from "../IfForm";
import { cloneDeep, debounce, set } from "lodash";
import {
    createNodeWithUpdatedLineRange,
    processFormData,
    removeEmptyNodes,
    updateNodeWithProperties,
} from "../form-utils";
import ForkForm from "../ForkForm";
import { FormTypeEditor } from "../../TypeEditor";
import { getTypeHelper } from "../../TypeHelper";
import { EXPRESSION_EXTRACTION_REGEX } from "../../../../constants";
import MatchForm from "../MatchForm";
import { FormSubmitOptions } from "../../FlowDiagram";
import { getHelperPaneNew } from "../../HelperPaneNew";
import { VariableForm } from "../DeclareVariableForm";
import VectorKnowledgeBaseForm from "../VectorKnowledgeBaseForm";
import { EditorContext, StackItem, TypeHelperItem } from "@wso2/type-editor";
import DynamicModal from "../../../../components/Modal";
import React from "react";
import { SidePanelView } from "../../FlowDiagram/PanelManager";
import { ConnectionKind } from "../../../../components/ConnectionSelector";
import { getImportedTypes } from "../../TypeEditor/utils";

interface TypeEditorState {
    isOpen: boolean;
    fieldKey?: string; // Optional, to store the key of the field being edited
    newTypeValue?: string;
}

interface FormProps {
    fileName: string;
    node: FlowNode;
    nodeFormTemplate?: FlowNode; // used in edit forms
    connections?: FlowNode[];
    clientName?: string;
    targetLineRange: LineRange;
    projectPath?: string;
    editForm?: boolean;
    isGraphql?: boolean;
    submitText?: string;
    onSubmit: (node?: FlowNode, openInDataMapper?: boolean, formImports?: FormImports, rawFormValues?: FormValues) => void;
    showProgressIndicator?: boolean;
    subPanelView?: SubPanelView;
    openSubPanel?: (subPanel: SubPanel) => void;
    updatedExpressionField?: ExpressionFormField;
    resetUpdatedExpressionField?: () => void;
    disableSaveButton?: boolean;
    actionButtonConfig?: {
        actionLabel: string;
        description?: string; // Optional description explaining what the action button does
        callback: () => void;
    };
    handleOnFormSubmit?: (updatedNode?: FlowNode, openInDataMapper?: boolean, options?: FormSubmitOptions) => void;
    isInModal?: boolean;
    scopeFieldAddon?: React.ReactNode;
    newServerUrl?: string;
    onChange?: (fieldKey: string, value: any, allValues: FormValues) => void;
    mcpTools?: { name: string; description?: string }[];
    onToolsChange?: (selectedTools: string[]) => void;
    navigateToPanel?: (panel: SidePanelView, connectionKind?: ConnectionKind) => void;
}

// Styled component for the action button description
const ActionButtonDescription = styled.div`
    font-size: var(--vscode-font-size);
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    margin-bottom: 8px;
    line-height: 1.4;
`;

// Styled component for the action button container
const ActionButtonContainer = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
`;

// Styled component for the action button
const StyledActionButton = styled(Button)`
    width: 100%;
    & > vscode-button {
        width: 100%;
    }
`;

export const BreadcrumbContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 20px;
    background: ${ThemeColors.SURFACE_CONTAINER};
    border-bottom: 1px solid ${ThemeColors.OUTLINE_VARIANT};
`;

export const BreadcrumbItem = styled.span`
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    font-size: var(--vscode-font-size);
    
    &:last-child {
        color: ${ThemeColors.ON_SURFACE};
        font-weight: 500;
    }
`;

export const BreadcrumbSeparator = styled.span`
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    font-size: var(--vscode-font-size);
`;

export const FormGenerator = forwardRef<FormExpressionEditorRef, FormProps>(function FormGenerator(props: FormProps, ref: React.ForwardedRef<FormExpressionEditorRef>) {
    const {
        fileName,
        node,
        nodeFormTemplate,
        connections,
        clientName,
        targetLineRange,
        projectPath,
        showProgressIndicator,
        isGraphql,
        onSubmit,
        subPanelView,
        openSubPanel,
        updatedExpressionField,
        resetUpdatedExpressionField,
        disableSaveButton,
        actionButtonConfig,
        submitText,
        handleOnFormSubmit,
        isInModal,
        scopeFieldAddon,
        newServerUrl,
        onChange,
        mcpTools,
    } = props;

    const { rpcClient } = useRpcContext();
    const [fields, setFields] = useState<FormField[]>([]);
    const [formImports, setFormImports] = useState<FormImports>({});
    const [typeEditorState, setTypeEditorState] = useState<TypeEditorState>({ isOpen: false, newTypeValue: "" });
    const [visualizableField, setVisualizableField] = useState<VisualizableField>();
    const [recordTypeFields, setRecordTypeFields] = useState<RecordTypeField[]>([]);
    const [valueTypeConstraints, setValueTypeConstraints] = useState<string>();

    /* Expression editor related state and ref variables */
    const prevCompletionFetchText = useRef<string>("");
    const [completions, setCompletions] = useState<CompletionItem[]>([]);
    const [filteredCompletions, setFilteredCompletions] = useState<CompletionItem[]>([]);
    const [types, setTypes] = useState<CompletionItem[]>([]);
    const [filteredTypes, setFilteredTypes] = useState<CompletionItem[]>([]);
    const expressionOffsetRef = useRef<number>(0); // To track the expression offset on adding import statements

    const [selectedType, setSelectedType] = useState<CompletionItem | null>(null);

    const importsCodedataRef = useRef<any>(null); // To store codeData for getVisualizableFields

    //stack for recursive type creation
    const [stack, setStack] = useState<StackItem[]>([{
        isDirty: false,
        type: undefined
    }]);
    const [refetchStates, setRefetchStates] = useState<boolean[]>([false]);

    const pushTypeStack = (item: StackItem) => {
        setStack((prev) => [...prev, item]);
        setRefetchStates((prev) => [...prev, false]);
    };

    const popTypeStack = () => {
        setStack((prev) => {
            const newStack = prev.slice(0, -1);
            // If stack becomes empty, reset to initial state
            if (newStack.length === 0) {
                return [{
                    isDirty: false,
                    type: undefined
                }];
            }
            return newStack;
        });
        setRefetchStates((prev) => {
            const newStates = [...prev];
            const currentState = newStates.pop();
            if (currentState && newStates.length > 0) {
                newStates[newStates.length - 1] = true;
            }
            // If no states left, add initial state
            if (newStates.length === 0) {
                newStates.push(false);
            }
            return newStates;
        });
    };

    const peekTypeStack = (): StackItem | null => {
        return stack.length > 0 ? stack[stack.length - 1] : null;
    };

    const replaceTop = (item: StackItem) => {
        if (stack.length === 0) return;
        setStack((prev) => {
            const newStack = [...prev];
            newStack[newStack.length - 1] = item;
            return newStack;
        });
    }

    const resetStack = () => {
        setStack([getDefaultValue()]);
    }

    const setRefetchForCurrentModal = (shouldRefetch: boolean) => {
        setRefetchStates((prev) => {
            const newStates = [...prev];
            if (newStates.length > 0) {
                newStates[newStates.length - 1] = shouldRefetch;
            }
            return newStates;
        });
    };

    useEffect(() => {
        if (rpcClient) {
            // Set current theme
            rpcClient
                .getVisualizerRpcClient()
                .getThemeKind()
                .then((theme) => {
                    injectHighlightTheme(theme);
                });

            // Update highlight theme when theme changes
            rpcClient.onThemeChanged((theme) => {
                injectHighlightTheme(theme);
            });
        }
    }, [rpcClient]);

    useEffect(() => {
        if (!node) {
            return;
        }
        if (node.codedata.node === "VARIABLE" && 
            node.properties?.type?.value &&
            (node.properties.type.value as string).length > 0) {
            handleValueTypeConstChange(node.properties.type.value as string);
        }
        if (node.codedata.node === "IF") {
            return;
        }
        initForm();
        handleFormOpen();

        return () => {
            handleFormClose();
        };
    }, [node]);

    const handleFormOpen = () => {
        rpcClient
            .getBIDiagramRpcClient()
            .formDidOpen({ filePath: fileName })
            .then(() => {
                console.log(">>> Form opened");
            });
    };

    const handleFormClose = () => {
        rpcClient
            .getBIDiagramRpcClient()
            .formDidClose({ filePath: fileName })
            .then(() => {
                console.log(">>> Form closed");
            });
    };

    const initForm = () => {
        const formProperties = getFormProperties(node);
        let enrichedNodeProperties;
        if (nodeFormTemplate) {
            const formTemplateProperties = getFormProperties(nodeFormTemplate);
            enrichedNodeProperties = enrichFormTemplatePropertiesWithValues(formProperties, formTemplateProperties);
            console.log(">>> Form properties", { formProperties, formTemplateProperties, enrichedNodeProperties });
        }
        if (Object.keys(formProperties).length === 0) {
            // update node position
            node.codedata.lineRange = {
                ...targetLineRange,
                fileName: fileName,
            };
            // add node to source code
            onSubmit();
            return;
        }

        // hide connection property if node is a REMOTE_ACTION_CALL or RESOURCE_ACTION_CALL node
        if (node.codedata.node === "REMOTE_ACTION_CALL" || node.codedata.node === "RESOURCE_ACTION_CALL") {
            if (enrichedNodeProperties?.connection) {
                enrichedNodeProperties.connection.optional = true;
            } else if (formProperties?.connection) {
                formProperties.connection.optional = true;
            }
        }

        if (node.codedata.node === "VARIABLE") {
            const codedata = importsCodedataRef.current || { symbol: formProperties?.type.value };
            rpcClient
                .getDataMapperRpcClient()
                .getVisualizableFields({ filePath: fileName, codedata })
                .then((res) => {
                    setVisualizableField(res.visualizableProperties);
                });
        }

        // Extract fields with typeMembers where kind is RECORD_TYPE
        const recordTypeFields = Object.entries(formProperties)
            .filter(([_, property]) =>
                property.typeMembers &&
                property.typeMembers.some(member => member.kind === "RECORD_TYPE")
            )
            .map(([key, property]) => ({
                key,
                property,
                recordTypeMembers: property.typeMembers.filter(member => member.kind === "RECORD_TYPE")
            }));

        setRecordTypeFields(recordTypeFields);
        console.log(">>> Fields with RECORD_TYPE:", recordTypeFields);

        // get node properties
        const fields = convertNodePropertiesToFormFields(enrichedNodeProperties || formProperties, connections, clientName);
        setFields(fields);
        setFormImports(getImportsForFormFields(fields));
    };

    const handleOnSubmit = (data: FormValues, dirtyFields: any) => {
        console.log(">>> on form generator submit", data);
        if (node && targetLineRange) {
            const updatedNode = mergeFormDataWithFlowNode(data, targetLineRange, dirtyFields);
            console.log(">>> Updated node", updatedNode);

            const openInDataMapper = data["openInDataMapper"];
            onSubmit(updatedNode, openInDataMapper, formImports);
        }
    };

    const mergeFormDataWithFlowNode = (data: FormValues, targetLineRange: LineRange, dirtyFields?: any): FlowNode => {
        const clonedNode = cloneDeep(node);
        // Create updated node with new line range
        const updatedNode = createNodeWithUpdatedLineRange(clonedNode, targetLineRange);

        // assign to a existing variable
        const processedData = processFormData(data);

        // Update node properties
        const nodeWithUpdatedProps = updateNodeWithProperties(clonedNode, updatedNode, processedData, formImports, dirtyFields);

        // check all nodes and remove empty nodes
        return removeEmptyNodes(nodeWithUpdatedProps);
    };

    const handleOpenView = async (filePath: string, position: NodePosition) => {
        console.log(">>> open view: ", { filePath, position });
        const context: VisualizerLocation = {
            documentUri: filePath,
            position: position,
        };
        await rpcClient.getVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: context });
    };

    const handleOpenTypeEditor = (isOpen: boolean, f: FormValues, editingField?: FormField) => {
        // Get f.value and assign that value to field value
        const updatedFields = fields.map((field) => {
            const updatedField = { ...field };
            if (f[field.key]) {
                updatedField.value = f[field.key];
            }
            return updatedField;
        });
        setFields(updatedFields);
        setTypeEditorState({ isOpen, fieldKey: editingField?.key, newTypeValue: f[editingField?.key] });
    };

    const handleTypeEditorStateChange = (state: boolean) => {
        if (!state) {
            if (stack.length > 1) {
                popTypeStack();
                return;
            }
            resetStack();
        }
        setTypeEditorState({ ...typeEditorState, isOpen: state });
    }

    const handleUpdateImports = (key: string, imports: Imports, codedata?: CodeData) => {
        importsCodedataRef.current = codedata;
        const importKey = Object.keys(imports)?.[0];

        if (Object.keys(formImports).includes(key)) {
            if (importKey && !Object.keys(formImports[key]).includes(importKey)) {
                const updatedImports = { ...formImports, [key]: { ...formImports[key], ...imports } };
                setFormImports(updatedImports);
            }
        } else {
            const updatedImports = { ...formImports, [key]: imports };
            setFormImports(updatedImports);
        }
    }

    /* Expression editor related functions */
    const handleExpressionEditorCancel = () => {
        setFilteredCompletions([]);
        setCompletions([]);
        setFilteredTypes([]);
    };

    const debouncedRetrieveCompletions = useCallback(
        debounce(
            async (
                value: string,
                property: ExpressionProperty,
                offset: number,
                triggerCharacter?: string
            ) => {
                let expressionCompletions: CompletionItem[] = [];
                const { parentContent, currentContent } = value
                    .slice(0, offset)
                    .match(EXPRESSION_EXTRACTION_REGEX)?.groups ?? {};
                if (
                    completions.length > 0 &&
                    !triggerCharacter &&
                    parentContent === prevCompletionFetchText.current
                ) {
                    expressionCompletions = completions
                        .filter((completion) => {
                            const lowerCaseText = currentContent.toLowerCase();
                            const lowerCaseLabel = completion.label.toLowerCase();

                            return lowerCaseLabel.includes(lowerCaseText);
                        })
                        .sort((a, b) => a.sortText.localeCompare(b.sortText));
                } else {
                    const { lineOffset, charOffset } = calculateExpressionOffsets(value, offset);
                    let completions = await rpcClient.getBIDiagramRpcClient().getExpressionCompletions({
                        filePath: fileName,
                        context: {
                            expression: value,
                            startLine: updateLineRange(targetLineRange, expressionOffsetRef.current).startLine,
                            lineOffset: lineOffset,
                            offset: charOffset,
                            codedata: node.codedata,
                            property: property
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
                                const lowerCaseLabel = completion.label.toLowerCase();

                                return lowerCaseLabel.includes(lowerCaseText);
                            })
                            .sort((a, b) => a.sortText.localeCompare(b.sortText));
                    }
                }

                prevCompletionFetchText.current = parentContent ?? "";
                setFilteredCompletions(expressionCompletions);
            },
            250
        ),
        [rpcClient, completions, fileName, targetLineRange, node]
    );

    const handleRetrieveCompletions = useCallback(
        async (
            value: string,
            property: ExpressionProperty,
            offset: number,
            triggerCharacter?: string
        ) => {
            await debouncedRetrieveCompletions(value, property, offset, triggerCharacter);

            if (triggerCharacter) {
                await debouncedRetrieveCompletions.flush();
            }
        },
        [debouncedRetrieveCompletions]
    );

    const debouncedGetVisibleTypes = useCallback(
        debounce(
            async (
                value: string,
                cursorPosition: number,
                fetchReferenceTypes: boolean,
                valueTypeConstraint?: string
            ) => {
                let visibleTypes: CompletionItem[] = types;
                if (!types.length) {
                    const types = await rpcClient.getBIDiagramRpcClient().getVisibleTypes({
                        filePath: fileName,
                        position: updateLineRange(targetLineRange, expressionOffsetRef.current).startLine,
                        ...(valueTypeConstraint && { typeConstraint: valueTypeConstraint })
                    });

                    const isFetchingTypesForDM = valueTypeConstraint === "json";
                    visibleTypes = convertToVisibleTypes(types, isFetchingTypesForDM);
                    setTypes(visibleTypes);
                }

                if (!fetchReferenceTypes) {
                    const effectiveText = value.slice(0, cursorPosition);
                    let filteredTypes = visibleTypes.filter((type) => {
                        const lowerCaseText = effectiveText.toLowerCase();
                        const lowerCaseLabel = type.label.toLowerCase();

                        return lowerCaseLabel.includes(lowerCaseText);
                    });
                    setFilteredTypes(filteredTypes);
                }
            },
            250
        ),
        [rpcClient, types, fileName, targetLineRange]
    );

    const handleGetVisibleTypes = useCallback(
        async (value: string, cursorPosition: number, fetchReferenceTypes?: boolean, valueTypeConstraint?: string) => {
            await debouncedGetVisibleTypes(value, cursorPosition, fetchReferenceTypes, valueTypeConstraint);
        },
        [debouncedGetVisibleTypes]
    );

    const extractArgsFromFunction = async (value: string, property: ExpressionProperty, cursorPosition: number) => {
        const { lineOffset, charOffset } = calculateExpressionOffsets(value, cursorPosition);
        const signatureHelp = await rpcClient.getBIDiagramRpcClient().getSignatureHelp({
            filePath: fileName,
            context: {
                expression: value,
                startLine: updateLineRange(targetLineRange, expressionOffsetRef.current).startLine,
                lineOffset: lineOffset,
                offset: charOffset,
                codedata: node.codedata,
                property: property,
            },
            signatureHelpContext: {
                isRetrigger: false,
                triggerKind: 1,
            },
        });

        return await convertToFnSignature(signatureHelp);
    };

    const handleExpressionFormDiagnostics = useCallback(
        debounce(
            async (
                showDiagnostics: boolean,
                expression: string,
                key: string,
                property: ExpressionProperty,
                setDiagnosticsInfo: (diagnostics: FormDiagnostics) => void,
                shouldUpdateNode?: boolean,
                variableType?: string
            ) => {
                if (!showDiagnostics) {
                    setDiagnosticsInfo({ key, diagnostics: [] });
                    return;
                }

                // HACK: For variable nodes, update the type value in the node
                if (shouldUpdateNode) {
                    node.properties["type"].value = variableType || "any";
                }

                try {
                    const response = await rpcClient.getBIDiagramRpcClient().getExpressionDiagnostics({
                        filePath: fileName,
                        context: {
                            expression: expression,
                            startLine: updateLineRange(targetLineRange, expressionOffsetRef.current).startLine,
                            lineOffset: 0,
                            offset: 0,
                            codedata: node.codedata,
                            property: property,
                        },
                    });

                    let uniqueDiagnostics = removeDuplicateDiagnostics(response.diagnostics);

                    // HACK: filter unknown module and undefined type diagnostics for local connections
                    uniqueDiagnostics = filterUnsupportedDiagnostics(uniqueDiagnostics);

                    setDiagnosticsInfo({ key, diagnostics: uniqueDiagnostics });
                } catch (error) {
                    // Remove diagnostics if LS crashes
                    console.error(">>> Error getting expression diagnostics", error);
                    setDiagnosticsInfo({ key, diagnostics: [] });
                }

            },
            250
        ),
        [rpcClient, fileName, targetLineRange, node]
    );

    const handleCompletionItemSelect = async (
        value: string,
        fieldKey: string,
        additionalTextEdits?: TextEdit[]
    ) => {
        if (additionalTextEdits?.[0]?.newText) {
            const response = await rpcClient.getBIDiagramRpcClient().updateImports({
                filePath: fileName,
                importStatement: additionalTextEdits[0].newText,
            });
            expressionOffsetRef.current += response.importStatementOffset;

            if (response.prefix && response.moduleId) {
                const importStatement = {
                    [response.prefix]: response.moduleId
                }
                handleUpdateImports(fieldKey, importStatement);
            }
        }
        debouncedRetrieveCompletions.cancel();
        debouncedGetVisibleTypes.cancel();
        handleExpressionEditorCancel();
    };

    const handleExpressionEditorBlur = () => {
        handleExpressionEditorCancel();
    };

    const onTypeChange = async (type: Type) => {
        const updatedFields = fields.map((field) => {
            if (field.key === typeEditorState.fieldKey) {
                return { ...field, value: type.name };
            }
            return field;
        });
        handleSelectedTypeByName(type.name);
        setFields(updatedFields);
    };

    const handleValueTypeConstChange = async (valueTypeConstraint: string) => {
        const newTypes = await rpcClient.getBIDiagramRpcClient().getVisibleTypes({
            filePath: fileName,
            position: updateLineRange(targetLineRange, expressionOffsetRef.current).startLine
        });
        const matchedReferenceType = newTypes.find(t => t.label === valueTypeConstraint);
        if (matchedReferenceType) {
            updateRecordTypeFields(matchedReferenceType)
            setValueTypeConstraints(valueTypeConstraint);
        }
        else {
            const type = await searchImportedTypeByName(valueTypeConstraint);
            if (!type) {
                setValueTypeConstraints(valueTypeConstraint);
                return;
            };

            setValueTypeConstraints(type.insertText);
            // Create the record type field for expression
            const expressionEntry = Object.entries(getFormProperties(node))
                .find(([_, property]) => property.metadata?.label === "Expression");

            if (!expressionEntry) return;

            const [key, property] = expressionEntry;
            const typeForRecord = { label: type.insertText, labelDetails: type.labelDetails };
            const recordTypeField = createExpressionRecordTypeField(key, property, `${type.codedata.org}:${type.codedata.module}:${type.codedata.version}`, typeForRecord);
            if (!recordTypeField) return;

            setRecordTypeFields(prevFields => {
                const prevIndex = prevFields.findIndex(f => f.key === recordTypeField.key);
                if (prevIndex !== -1) {
                    const updated = [...prevFields];
                    updated[prevIndex] = recordTypeField;
                    return updated;
                } else {
                    return [...prevFields, recordTypeField];
                }
            });
        }
    }

    const handleGetHelperPane = (
        fieldKey: string,
        exprRef: RefObject<FormExpressionEditorRef>,
        anchorRef: RefObject<HTMLDivElement>,
        defaultValue: string,
        value: string,
        onChange: (value: string, updatedCursorPosition: number) => void,
        changeHelperPaneState: (isOpen: boolean) => void,
        helperPaneHeight: HelperPaneHeight,
        recordTypeField?: RecordTypeField,
        isAssignIdentifier?: boolean,
        defaultValueTypeConstraint?: string,
    ) => {
        const handleHelperPaneClose = () => {
            debouncedRetrieveCompletions.cancel();
            changeHelperPaneState(false);
            handleExpressionEditorCancel();
        }

        return getHelperPaneNew({
            fieldKey: fieldKey,
            fileName: fileName,
            targetLineRange: updateLineRange(targetLineRange, expressionOffsetRef.current),
            exprRef: exprRef,
            anchorRef: anchorRef,
            onClose: handleHelperPaneClose,
            defaultValue: defaultValue,
            currentValue: value,
            onChange: onChange,
            helperPaneHeight: helperPaneHeight,
            recordTypeField: recordTypeField,
            isAssignIdentifier: isAssignIdentifier,
            updateImports: handleUpdateImports,
            completions: completions,
            projectPath: projectPath,
            handleOnFormSubmit: handleOnFormSubmit,
            selectedType: selectedType,
            filteredCompletions: filteredCompletions,
            isInModal: isInModal,
            valueTypeConstraint: defaultValueTypeConstraint,
            handleRetrieveCompletions: handleRetrieveCompletions,
            forcedValueTypeConstraint: valueTypeConstraints,
            handleValueTypeConstChange: handleValueTypeConstChange
        });
    };

    const handleGetTypeHelper = (
        fieldKey: string,
        valueTypeConstraint: string,
        typeBrowserRef: RefObject<HTMLDivElement>,
        currentType: string,
        currentCursorPosition: number,
        typeHelperState: boolean,
        onChange: (newType: string, newCursorPosition: number) => void,
        changeHelperPaneState: (isOpen: boolean) => void,
        typeHelperHeight: HelperPaneHeight,
        onTypeCreate: () => void,
        exprRef?: RefObject<FormExpressionEditorRef>,
    ) => {
        const handleCreateNewType = (typeName: string) => {
            onTypeCreate();
            setTypeEditorState({ isOpen: true, newTypeValue: typeName, fieldKey: fieldKey });
        }

        const handleCloseCompletions = () => {
            debouncedGetVisibleTypes.cancel();
            handleExpressionEditorCancel();
        }

        return getTypeHelper({
            fieldKey: fieldKey,
            valueTypeConstraint: valueTypeConstraint,
            typeBrowserRef: typeBrowserRef,
            filePath: fileName,
            targetLineRange: updateLineRange(targetLineRange, expressionOffsetRef.current),
            currentType: currentType,
            currentCursorPosition: currentCursorPosition,
            helperPaneHeight: typeHelperHeight,
            typeHelperState: typeHelperState,
            onChange: onChange,
            changeTypeHelperState: changeHelperPaneState,
            updateImports: handleUpdateImports,
            onTypeCreate: handleCreateNewType,
            onCloseCompletions: handleCloseCompletions,
            exprRef: exprRef,
        });
    }

    const expressionEditor = useMemo(() => {
        return {
            completions: filteredCompletions,
            triggerCharacters: TRIGGER_CHARACTERS,
            retrieveCompletions: handleRetrieveCompletions,
            extractArgsFromFunction: extractArgsFromFunction,
            types: filteredTypes,
            referenceTypes: types,
            retrieveVisibleTypes: handleGetVisibleTypes,
            getHelperPane: handleGetHelperPane,
            getTypeHelper: handleGetTypeHelper,
            getExpressionFormDiagnostics: handleExpressionFormDiagnostics,
            onCompletionItemSelect: handleCompletionItemSelect,
            onBlur: handleExpressionEditorBlur,
            onCancel: handleExpressionEditorCancel,
            helperPaneOrigin: "vertical",
            helperPaneHeight: "default",
            helperPaneZIndex: isInModal ? 40001 : undefined,
        } as FormExpressionEditorProps;
    }, [
        filteredCompletions,
        types,
        filteredTypes,
        handleRetrieveCompletions,
        extractArgsFromFunction,
        handleGetVisibleTypes,
        handleGetHelperPane,
        handleExpressionFormDiagnostics,
        handleCompletionItemSelect,
        handleExpressionEditorBlur,
        handleExpressionEditorCancel,
    ]);

    const fetchVisualizableFields = async (filePath: string, typeName?: string) => {
        const codedata = importsCodedataRef.current || { symbol: typeName };
        const res = await rpcClient
            .getDataMapperRpcClient()
            .getVisualizableFields({ filePath, codedata });
        setVisualizableField(res.visualizableProperties);
        importsCodedataRef.current = null;
    };

    const onSaveType = (type: Type) => {
        if (stack.length > 0) {
            setRefetchForCurrentModal(true);
            popTypeStack();
        }
        setTypeEditorState({ ...typeEditorState, isOpen: stack.length !== 1 });
    }

    /**
     * Creates a record type field for the expression property
     */
    const createExpressionRecordTypeField = (
        key: string,
        property: any,
        packageInfo: string,
        type: { label: string; labelDetails?: { description?: string } }
    ) => {
        return {
            key,
            property,
            recordTypeMembers: [{
                kind: "RECORD_TYPE",
                type: type.label || "",
                packageInfo: packageInfo,
                selected: false
            }]
        };
    };

    const isTypeExcludedFromValueTypeConstraint = (typeLabel: string) => {
        return ["()"].includes(typeLabel);
    }

    /**
     * Updates record type fields and value type constraints when a type is selected.
     * This is used in variable declaration forms where the variable type dynamically changes.
     */
    const updateRecordTypeFields = (type?: { label: string; labelDetails?: { description?: string, detail?: string } }) => {
        if (!type) {
            setValueTypeConstraints('');
            return;
        }

        // If not a Record, remove the 'expression' entry from recordTypeFields and return
        if (type?.labelDetails?.description !== "Record") {
            if (type.labelDetails.detail === "Structural Types" || type.labelDetails.detail === "Behaviour Types" || isTypeExcludedFromValueTypeConstraint(type.label)) {
                setValueTypeConstraints('');
            }
            else {
                setValueTypeConstraints(type.label);
            }
            setRecordTypeFields(prevFields => prevFields.filter(f => f.key !== "expression"));
            return;
        }
        else {
            setValueTypeConstraints(type.label);
        }

        // Create the record type field for expression
        const expressionEntry = Object.entries(getFormProperties(node))
            .find(([_, property]) => property.metadata?.label === "Expression");

        if (!expressionEntry) return;

        const [key, property] = expressionEntry;
        const recordTypeField = createExpressionRecordTypeField(key, property, '', type);
        if (!recordTypeField) return;

        setRecordTypeFields(prevFields => {
            const prevIndex = prevFields.findIndex(f => f.key === recordTypeField.key);
            if (prevIndex !== -1) {
                const updated = [...prevFields];
                updated[prevIndex] = recordTypeField;
                return updated;
            } else {
                return [...prevFields, recordTypeField];
            }
        });
    };


    /**
     * Handles type selection from completion items (used in type editor)
     */
    const handleSelectedTypeChange = (type: CompletionItem | string) => {
        if (typeof type === "string") {
            handleSelectedTypeByName(type);
            return;
        }
        setSelectedType(type);
        updateRecordTypeFields(type);
    };

    const findMatchedType = (items: TypeHelperItem[], typeName: string) => {
        return items?.find(item => `${item.codedata.module}:${item.insertText}` === typeName);
    }

    /**
     * Searches for a type by name from the available types
     */
    const searchImportedTypeByName = async (typeName: string): Promise<TypeHelperItem | undefined> => {
        // Return early if required data is not available
        if (!fileName || !typeName) {
            return undefined;
        }

        const newTypes = await rpcClient
            .getBIDiagramRpcClient()
            .search({
                filePath: fileName,
                position: targetLineRange,
                queryMap: {
                    q: '',
                    offset: 0,
                    limit: 60
                },
                searchKind: 'TYPE'
            })
            .then((response) => {
                return getImportedTypes(response.categories);
            })
            .finally(() => {

            });

        let type: TypeHelperItem | undefined;
        for (const category of newTypes[0].subCategory) {
            const matchedType = findMatchedType(category.items, typeName);
            if (matchedType) {
                type = matchedType;
                break;
            }
        }
        return type;
    };

    /**
     * Handles type selection by type name (used when type is created/changed)
     */
    const handleSelectedTypeByName = async (typeName: string) => {
        // Early return for invalid input
        if (!typeName || typeName.length === 0) {
            setValueTypeConstraints('');
            return;
        }

        const type = await searchImportedTypeByName(typeName);
        if (!type) {
            setValueTypeConstraints('');
            return;
        }

        setValueTypeConstraints(type.insertText);
        // Create the record type field for expression
        const expressionEntry = Object.entries(getFormProperties(node))
            .find(([_, property]) => property.metadata?.label === "Expression");

        if (!expressionEntry) return;

        const [key, property] = expressionEntry;
        const typeForRecord = { label: type.insertText, labelDetails: type.labelDetails };
        const recordTypeField = createExpressionRecordTypeField(key, property, `${type.codedata.org}:${type.codedata.module}:${type.codedata.version}`, typeForRecord);
        if (!recordTypeField) return;

        setRecordTypeFields(prevFields => {
            const prevIndex = prevFields.findIndex(f => f.key === recordTypeField.key);
            if (prevIndex !== -1) {
                const updated = [...prevFields];
                updated[prevIndex] = recordTypeField;
                return updated;
            } else {
                return [...prevFields, recordTypeField];
            }
        });
    };

    const getDefaultValue = () => {
        return ({
            type: {
                name: "MyType",
                members: [] as Member[],
                editable: true,
                metadata: {
                    description: "",
                    label: ""
                },
                properties: {},
                codedata: {
                    node: "RECORD" as TypeNodeKind
                },
                includes: [] as string[],
                allowAdditionalFields: false
            },
            isDirty: false
        })
    }

    const getNewTypeCreateForm = () => {
        pushTypeStack(getDefaultValue());
    }

    // handle if node form
    if (node?.codedata.node === "IF") {
        return (
            <IfForm
                fileName={fileName}
                node={node}
                targetLineRange={targetLineRange}
                expressionEditor={expressionEditor}
                showProgressIndicator={showProgressIndicator}
                onSubmit={onSubmit}
                openSubPanel={openSubPanel}
                updatedExpressionField={updatedExpressionField}
                subPanelView={subPanelView}
                resetUpdatedExpressionField={resetUpdatedExpressionField}
            />
        );
    }

    // handle match node form
    if (node?.codedata.node === "MATCH") {
        return (
            <MatchForm
                fileName={fileName}
                node={node}
                targetLineRange={targetLineRange}
                expressionEditor={expressionEditor}
                onSubmit={onSubmit}
                showProgressIndicator={showProgressIndicator}
                openSubPanel={openSubPanel}
                updatedExpressionField={updatedExpressionField}
                subPanelView={subPanelView}
                resetUpdatedExpressionField={resetUpdatedExpressionField}
            />
        );
    }

    // handle fork node form
    if (node?.codedata.node === "FORK") {
        return (
            <ForkForm
                fileName={fileName}
                node={node}
                targetLineRange={targetLineRange}
                expressionEditor={expressionEditor}
                showProgressIndicator={showProgressIndicator}
                onSubmit={onSubmit}
                openSubPanel={openSubPanel}
                updatedExpressionField={updatedExpressionField}
                resetUpdatedExpressionField={resetUpdatedExpressionField}
                subPanelView={subPanelView}
            />
        );
    }

    // handle vector knowledge base form
    if (node?.codedata.node === "VECTOR_KNOWLEDGE_BASE") {
        return (
            <VectorKnowledgeBaseForm
                fileName={fileName}
                node={node}
                targetLineRange={targetLineRange}
                expressionEditor={expressionEditor}
                showProgressIndicator={showProgressIndicator}
                onSubmit={onSubmit}
                openSubPanel={openSubPanel}
                updatedExpressionField={updatedExpressionField}
                resetUpdatedExpressionField={resetUpdatedExpressionField}
                subPanelView={subPanelView}
                disableSaveButton={disableSaveButton}
                navigateToPanel={props.navigateToPanel}
            />
        );
    }

    if (!node) {
        console.log(">>> Node is undefined");
        return null;
    }

    // customize info label based on the node type
    const notSupportedLabel =
        "This statement is not supported in low-code yet. Please use the Ballerina source code to modify it accordingly.";
    const infoLabel = node.codedata.node === "EXPRESSION" ? notSupportedLabel : node.metadata.description;

    // Create action button from config if provided
    const actionButton = actionButtonConfig ? (
        <ActionButtonContainer>
            {actionButtonConfig.description && (
                <ActionButtonDescription>{actionButtonConfig.description}</ActionButtonDescription>
            )}
            <StyledActionButton appearance="secondary" onClick={actionButtonConfig.callback}>
                {actionButtonConfig.actionLabel}
            </StyledActionButton>
        </ActionButtonContainer>
    ) : undefined;

    // handle declare variable node form
    if (node?.codedata.node === "VARIABLE") {
        return (
            <EditorContext.Provider value={{ stack, push: pushTypeStack, pop: popTypeStack, peek: peekTypeStack, replaceTop: replaceTop }}>
                <VariableForm
                    formFields={fields}
                    projectPath={projectPath}
                    selectedNode={node.codedata.node}
                    openRecordEditor={handleOpenTypeEditor}
                    onSubmit={handleOnSubmit}
                    openView={handleOpenView}
                    openSubPanel={openSubPanel}
                    subPanelView={subPanelView}
                    expressionEditor={expressionEditor}
                    targetLineRange={targetLineRange}
                    fileName={fileName}
                    isSaving={showProgressIndicator}
                    submitText={submitText}
                    updatedExpressionField={updatedExpressionField}
                    resetUpdatedExpressionField={resetUpdatedExpressionField}
                    mergeFormDataWithFlowNode={mergeFormDataWithFlowNode}
                    handleVisualizableFields={fetchVisualizableFields}
                    visualizableField={visualizableField}
                    infoLabel={infoLabel}
                    disableSaveButton={disableSaveButton}
                    actionButton={actionButton}
                    recordTypeFields={recordTypeFields}
                    isInferredReturnType={!!node.codedata?.inferredReturnType}
                    formImports={formImports}
                    handleSelectedTypeChange={handleSelectedTypeChange}
                    preserveOrder={node.codedata.node === "VARIABLE" as NodeKind || node.codedata.node === "CONFIG_VARIABLE" as NodeKind}
                />
                {
                    stack.map((item, i) => <DynamicModal
                        key={i}
                        width={420}
                        height={600}
                        anchorRef={undefined}
                        title="Create New Type"
                        openState={typeEditorState.isOpen}
                        setOpenState={handleTypeEditorStateChange}>
                        <div style={{ padding: '0px 15px' }}>
                            {stack.slice(0, i + 1).length > 1 && (
                                <BreadcrumbContainer>
                                    {stack.slice(0, i + 1).map((stackItem, index) => (
                                        <React.Fragment key={index}>
                                            {index > 0 && <BreadcrumbSeparator>/</BreadcrumbSeparator>}
                                            <BreadcrumbItem>
                                                {stackItem?.type?.name || "New Type"}
                                            </BreadcrumbItem>
                                        </React.Fragment>
                                    ))}
                                </BreadcrumbContainer>
                            )}
                            <FormTypeEditor
                                type={peekTypeStack()?.type}
                                newType={peekTypeStack() ? peekTypeStack().isDirty : false}
                                newTypeValue={typeEditorState.newTypeValue}
                                isGraphql={isGraphql}
                                onTypeChange={onTypeChange}
                                onSaveType={onSaveType}
                                onTypeCreate={() => { }}
                                isPopupTypeForm={true}
                                getNewTypeCreateForm={getNewTypeCreateForm}
                                refetchTypes={refetchStates[i]}
                            />
                        </div>
                    </DynamicModal>)
                }
            </EditorContext.Provider>
        );
    }

    // default form
    return (
        <EditorContext.Provider value={{ stack, push: pushTypeStack, pop: popTypeStack, peek: peekTypeStack, replaceTop: replaceTop }}>
            {fields && fields.length > 0 && (
                <Form
                    ref={ref}
                    formFields={fields}
                    projectPath={projectPath}
                    selectedNode={node.codedata.node}
                    openRecordEditor={handleOpenTypeEditor}
                    onSubmit={handleOnSubmit}
                    openView={handleOpenView}
                    openSubPanel={openSubPanel}
                    subPanelView={subPanelView}
                    expressionEditor={expressionEditor}
                    targetLineRange={targetLineRange}
                    fileName={fileName}
                    isSaving={showProgressIndicator}
                    submitText={submitText}
                    updatedExpressionField={updatedExpressionField}
                    resetUpdatedExpressionField={resetUpdatedExpressionField}
                    mergeFormDataWithFlowNode={mergeFormDataWithFlowNode}
                    handleVisualizableFields={fetchVisualizableFields}
                    visualizableField={visualizableField}
                    infoLabel={infoLabel}
                    disableSaveButton={disableSaveButton}
                    actionButton={actionButton}
                    recordTypeFields={recordTypeFields}
                    isInferredReturnType={!!node.codedata?.inferredReturnType}
                    formImports={formImports}
                    handleSelectedTypeChange={handleSelectedTypeChange}
                    preserveOrder={node.codedata.node === "VARIABLE" as NodeKind || node.codedata.node === "CONFIG_VARIABLE" as NodeKind}
                    scopeFieldAddon={scopeFieldAddon}
                    newServerUrl={newServerUrl}
                    onChange={onChange}
                    mcpTools={mcpTools}
                    onToolsChange={props.onToolsChange}
                />
            )}
            {
                stack.map((item, i) => <DynamicModal
                    key={i}
                    width={420}
                    height={600}
                    anchorRef={undefined}
                    title="Create New Type"
                    openState={typeEditorState.isOpen}
                    setOpenState={handleTypeEditorStateChange}>
                    <div style={{ padding: '0px 20px' }}>
                        {stack.slice(0, i + 1).length > 2 && (
                            <BreadcrumbContainer>
                                {stack.slice(0, i + 1).map((stackItem, index) => (
                                    <React.Fragment key={index}>
                                        {index > 0 && <BreadcrumbSeparator>/</BreadcrumbSeparator>}
                                        <BreadcrumbItem>
                                            {stackItem?.type?.name || "NewType"}
                                        </BreadcrumbItem>
                                    </React.Fragment>
                                ))}
                            </BreadcrumbContainer>
                        )}
                        <FormTypeEditor
                            type={peekTypeStack()?.type}
                            newType={peekTypeStack() ? peekTypeStack().isDirty : false}
                            newTypeValue={typeEditorState.newTypeValue}
                            isPopupTypeForm={true}
                            isGraphql={isGraphql}
                            onTypeChange={onTypeChange}
                            onSaveType={onSaveType}
                            onTypeCreate={() => { }}
                            getNewTypeCreateForm={getNewTypeCreateForm}
                            refetchTypes={refetchStates[i]}
                        />
                    </div>
                </DynamicModal>)
            }
        </EditorContext.Provider>
    );
});

export default FormGenerator;
