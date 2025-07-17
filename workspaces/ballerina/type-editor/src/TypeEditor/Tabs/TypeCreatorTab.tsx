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

import React, { useCallback, useEffect, useRef, useState } from "react";
import { TextField, Dropdown, Button, ProgressRing, Icon, Typography, ThemeColors } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Member, Type, TypeNodeKind } from "@wso2/ballerina-core";
import { RecordEditor } from "../RecordEditor";
import { EnumEditor } from "../EnumEditor";
import { UnionEditor } from "../UnionEditor";
import { ClassEditor } from "../ClassEditor";
import { AdvancedOptions } from "../AdvancedOptions";
import { ArrayEditor } from "../ArrayEditor";
import { debounce } from "lodash";
import { URI, Utils } from "vscode-uri";

const CategoryRow = styled.div<{ showBorder?: boolean }>`
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: flex-start;
    gap: 12px;
    width: 100%;
    margin-top: 8px;
    padding-bottom: 14px;
    border-bottom: ${({ showBorder }) => (showBorder ? `1px solid var(--vscode-welcomePage-tileBorder)` : "none")};
`;

const Footer = styled.div<{}>`
    display: flex;
    gap: 8px;
    flex-direction: row;
    justify-content: flex-end;
    align-items: center;
    margin-top: 8px;
    width: 100%;
`;

const InputWrapper = styled.div`
    position: relative;
    width: 100%;
    display: flex;
    gap: 8px;
    align-items: flex-start;
`;

const TextFieldWrapper = styled.div`
    flex: 1;
`;

const EditButton = styled(Button)`
    margin-top: 39px;
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: 8px;
    margin-bottom: 2px; 
    margin-top: 38px;
`;

const StyledButton = styled(Button)`
    font-size: 14px;
`;

const WarningText = styled(Typography)`
    color: var(--vscode-textLink-foreground);
    font-size: 12px;
    margin-top: 4px;
`;

const EditableRow = styled.div`
    display: flex;
    align-items: flex-start;
    width: 100%;
    flex-direction: column;
`;

const EditRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: flex-start;
    width: 100%;
`;

enum TypeKind {
    RECORD = "Record",
    ENUM = "Enum",
    CLASS = "Service Class",
    UNION = "Union",
    ARRAY = "Array"
}

interface TypeCreatorTabProps {
    editingType: Type;
    newType: boolean;
    isGraphql: boolean;
    initialTypeKind: TypeNodeKind;
    onTypeSave: (type: Type) => Promise<void>;
    isSaving: boolean;
    setIsSaving: (isSaving: boolean) => void;
    onTypeChange: (type: Type, rename?: boolean) => void;
}

export function TypeCreatorTab(props: TypeCreatorTabProps) {
    const {
        editingType,
        isGraphql,
        newType,
        initialTypeKind,
        onTypeSave,
        isSaving,
        setIsSaving,
        onTypeChange
    } = props;

    const [type, setType] = useState<Type>(editingType);
    const [selectedTypeKind, setSelectedTypeKind] = useState<TypeKind>(() => {
        if (type) {
            // Map the type's node kind to TypeKind enum
            const nodeKind = type.codedata.node;
            switch (nodeKind) {
                case "RECORD":
                    return TypeKind.RECORD;
                case "ENUM":
                    return TypeKind.ENUM;
                case "CLASS":
                    return TypeKind.CLASS;
                case "UNION":
                    return TypeKind.UNION;
                case "ARRAY":
                    return TypeKind.ARRAY;
                default:
                    return TypeKind.RECORD;
            }
        }
        return TypeKind.RECORD;
    });

    const [isNewType, setIsNewType] = useState<boolean>(newType);
    const [isTypeNameValid, setIsTypeNameValid] = useState<boolean>(true);
    const [onValidationError, setOnValidationError] = useState<boolean>(false);
    const [nameError, setNameError] = useState<string>("");
    const [isEditing, setIsEditing] = useState(false);
    const [tempName, setTempName] = useState("");
    const saveButtonClicked = useRef(false);

    const { rpcClient } = useRpcContext();

    const nameInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (editingType) {
            setType(editingType);
            validateTypeName(editingType.name);

            const nodeKind = editingType.codedata.node;
            switch (nodeKind) {
                case "RECORD":
                    setSelectedTypeKind(TypeKind.RECORD);
                    break;
                case "ENUM":
                    setSelectedTypeKind(TypeKind.ENUM);
                    break;
                case "CLASS":
                    setSelectedTypeKind(TypeKind.CLASS);
                    break;
                case "UNION":
                    setSelectedTypeKind(TypeKind.UNION);
                    break;
                case "ARRAY":
                    setSelectedTypeKind(TypeKind.ARRAY);
                    break;
                default:
                    setSelectedTypeKind(TypeKind.RECORD);
            }
        }

        setIsNewType(newType);
    }, [editingType?.name, newType]);


    const handleTypeKindChange = (value: string) => {
        // Convert display name back to internal TypeKind
        let selectedKind: TypeKind;
        if (isGraphql) {
            switch (value) {
                case "Input Object":
                    selectedKind = TypeKind.RECORD;
                    break;
                case "Object":
                    selectedKind = TypeKind.CLASS;
                    break;
                default:
                    selectedKind = value as TypeKind;
            }
        } else {
            selectedKind = value as TypeKind;
        }
        setSelectedTypeKind(selectedKind);

        // Reset validation error state when changing type kinds
        setOnValidationError(false);

        const typeValue = selectedKind === TypeKind.CLASS ? "CLASS" : selectedKind.toUpperCase();

        // Always create a new type with the selected kind
        setType((currentType) => ({
            ...currentType!,
            kind: typeValue,
            members: [] as Member[],
            codedata: {
                ...currentType!.codedata, // Check the location of the type
                node: typeValue.toUpperCase() as TypeNodeKind
            }
        }));
    };

    // Add a helper function to get the display label
    const getTypeKindLabel = (kind: TypeKind, isGraphql?: boolean): string => {
        if (isGraphql) {
            switch (kind) {
                case TypeKind.RECORD:
                    return "Input Object";
                case TypeKind.CLASS:
                    return "Object";
                default:
                    return kind;
            }
        }
        return kind;
    };

    const getAvailableTypeKinds = (isGraphql: boolean | undefined, currentType?: TypeKind): TypeKind[] => {
        if (isGraphql) {
            // For GraphQL mode, filter options based on current type
            if (initialTypeKind === "RECORD") {
                return [TypeKind.RECORD, TypeKind.ENUM, TypeKind.UNION];
            } else if (initialTypeKind === "CLASS") {
                return [TypeKind.CLASS, TypeKind.ENUM, TypeKind.UNION];
            }
        }
        // Return all options for non-GraphQL mode
        return Object.values(TypeKind);
    };

    const handleValidationError = (isError: boolean) => {
        setOnValidationError(isError);
    }

    const startEditing = () => {
        setTempName(type.name);
        saveButtonClicked.current = false;
        setIsEditing(true);
    };

    const cancelEditing = () => {
        validateTypeName(type.name);

        setIsEditing(false);
        setTempName("");
    };

    const editTypeName = async () => {
        saveButtonClicked.current = true;
        if (!tempName || tempName === type.name) {
            cancelEditing();
            return;
        }

        setIsSaving(true);
        try {
            await rpcClient.getBIDiagramRpcClient().renameIdentifier({
                fileName: type.codedata.lineRange.fileName,
                position: {
                    line: type.codedata.lineRange.startLine.line,
                    character: type.codedata.lineRange.startLine.offset
                },
                newName: tempName
            });

            const renamedType = {
                ...type,
                name: tempName,
                properties: {
                    ...type.properties,
                    name: {
                        ...type.properties["name"],
                        value: tempName
                    }
                }
            };

            setType(renamedType);
            onTypeChange(renamedType, true);
            cancelEditing();
        } catch (error) {
            console.error('Error renaming service class:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleOnBlur = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!saveButtonClicked.current) {
            await validateTypeName(e.target.value);
        }
    };

    const handleOnFieldFocus = async (e: React.ChangeEvent<HTMLInputElement>) => {
        await validateTypeName(e.target.value);
    }

    const validateTypeName = useCallback(debounce(async (value: string) => {
        if (saveButtonClicked.current) {
            return;
        }

        const projectUri = await rpcClient.getVisualizerLocation().then((res) => res.projectUri);

        const endPosition = await rpcClient.getBIDiagramRpcClient().getEndOfFile({
            filePath: Utils.joinPath(URI.file(projectUri), 'types.bal').fsPath
        });

        const response = await rpcClient.getBIDiagramRpcClient().getExpressionDiagnostics({
            filePath: type?.codedata?.lineRange?.fileName || "types.bal",
            context: {
                expression: value,
                startLine: {
                    line: type?.codedata?.lineRange?.startLine?.line ?? endPosition.line,
                    offset: type?.codedata?.lineRange?.startLine?.offset ?? endPosition.offset
                },
                offset: 0,
                lineOffset: 0,
                codedata: {
                    node: "VARIABLE",
                    lineRange: {
                        startLine: {
                            line: type?.codedata?.lineRange?.startLine?.line ?? endPosition.line,
                            offset: type?.codedata?.lineRange?.startLine?.offset ?? endPosition.offset
                        },
                        endLine: {
                            line: type?.codedata?.lineRange?.endLine?.line ?? endPosition.line,
                            offset: type?.codedata?.lineRange?.endLine?.offset ?? endPosition.offset
                        },
                        fileName: type?.codedata?.lineRange?.fileName
                    },
                },
                property: type?.properties["name"] ?
                    {
                        ...type.properties["name"],
                        valueTypeConstraint: "Global"
                    } :
                    {
                        metadata: {
                            label: "",
                            description: "",
                        },
                        valueType: "IDENTIFIER",
                        value: "",
                        valueTypeConstraint: "Global",
                        optional: false,
                        editable: true
                    }
            }
        });


        if (response && response.diagnostics && response.diagnostics.length > 0) {
            setNameError(response.diagnostics[0].message);
            setIsTypeNameValid(false);
        } else {
            setNameError("");
            setIsTypeNameValid(true);
        }
    }, 250), [rpcClient, type]);

    const handleOnTypeNameUpdate = (value: string) => {
        setTempName(value);
        validateTypeName(value);
    }

    const handleOnTypeNameChange = (value: string) => {
        setType({ ...type, name: value });
        validateTypeName(value);
    }

    const renderEditor = () => {
        if (!type) {
            return <ProgressRing />;
        }
        switch (selectedTypeKind) {
            case TypeKind.RECORD:
                return (
                    <>
                        <RecordEditor
                            type={type}
                            isAnonymous={false}
                            onChange={setType}
                            isGraphql={isGraphql}
                            onValidationError={handleValidationError}
                        />
                        <AdvancedOptions type={type} onChange={setType} />
                    </>
                );
            case TypeKind.ENUM:
                return (
                    <EnumEditor
                        type={type}
                        onChange={setType}
                        onValidationError={handleValidationError}
                    />
                );
            case TypeKind.UNION:
                return (
                    <UnionEditor
                        type={type}
                        onChange={setType}
                        rpcClient={rpcClient}
                        onValidationError={handleValidationError}
                    />
                );
            case TypeKind.CLASS:
                return (
                    <ClassEditor
                        type={type}
                        isGraphql={isGraphql}
                        onChange={setType}
                        onValidationError={handleValidationError}
                    />
                );
            case TypeKind.ARRAY:
                return (
                    <ArrayEditor
                        type={type}
                        onChange={setType}
                    />
                );
            default:
                return <div>Editor for {selectedTypeKind} type is not implemented yet</div>;
        }
    };

    return (
        <>
            <CategoryRow>
                {isNewType && (
                    <Dropdown
                        id="type-selector"
                        data-testid="type-kind-dropdown"
                        label="Kind"
                        value={getTypeKindLabel(selectedTypeKind, isGraphql)}
                        items={getAvailableTypeKinds(isGraphql, selectedTypeKind).map((kind) => ({
                            label: getTypeKindLabel(kind, isGraphql),
                            value: getTypeKindLabel(kind, isGraphql)
                        }))}
                        onChange={(e) => handleTypeKindChange(e.target.value)}
                    />
                )}
                {!isNewType && !isEditing && !type.properties["name"].editable && (
                    <InputWrapper>
                        <TextFieldWrapper>
                            <TextField
                                id={type.name}
                                data-testid="type-name-display"
                                name={type.name}
                                value={type.name}
                                label={type?.properties["name"]?.metadata?.label}
                                required={!type?.properties["name"]?.optional}
                                description={type?.properties["name"]?.metadata?.description}
                                readOnly={!type.properties["name"].editable}
                            />
                        </TextFieldWrapper>
                        <EditButton appearance="icon" onClick={startEditing} tooltip="Rename">
                            <Icon name="bi-edit" sx={{ width: 18, height: 18, fontSize: 18 }} />
                        </EditButton>
                    </InputWrapper>
                )}
                {isEditing && (
                    <>
                        <EditableRow>
                            <EditRow>
                                <TextFieldWrapper>
                                    <TextField
                                        id={type.name}
                                        label={type.properties["name"]?.metadata.label}
                                        value={tempName}
                                        errorMsg={nameError}
                                        onBlur={handleOnBlur}
                                        onFocus={handleOnFieldFocus}
                                        onChange={(e) => handleOnTypeNameUpdate(e.target.value)}
                                        description={type.properties["name"]?.metadata.description}
                                        required={!type.properties["name"]?.optional}
                                        autoFocus
                                    />
                                </TextFieldWrapper>
                                <ButtonGroup>
                                    <StyledButton
                                        appearance="secondary"
                                        onClick={cancelEditing}
                                        disabled={isSaving}
                                    >
                                        Cancel
                                    </StyledButton>
                                    <StyledButton
                                        appearance="primary"
                                        onClick={editTypeName}
                                        disabled={!isTypeNameValid || !tempName || isSaving}
                                    >
                                        {isSaving ? <Typography variant="progress">Saving...</Typography> : "Save"}
                                    </StyledButton>
                                </ButtonGroup>
                            </EditRow>

                            <WarningText variant="body3">
                                Note: Renaming will update all references across the project
                            </WarningText>
                        </EditableRow>
                    </>
                )}
                {isNewType && (
                    <TextFieldWrapper>
                        <TextField
                            label="Name"
                            value={type.name}
                            errorMsg={nameError}
                            onBlur={handleOnBlur}
                            onChange={(e) => handleOnTypeNameChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleOnTypeNameChange((e.target as HTMLInputElement).value);
                                }
                            }}
                            onFocus={(e) => { e.target.select(); validateTypeName(e.target.value) }}
                            ref={nameInputRef}
                        />
                    </TextFieldWrapper>
                )}
            </CategoryRow>

            {renderEditor()}
            <Footer>
                <Button
                    data-testid="type-create-save"
                    onClick={() => onTypeSave(type)}
                    disabled={onValidationError || !isTypeNameValid || isEditing || isSaving}>
                    {isSaving ? <Typography variant="progress">Saving...</Typography> : "Save"}
                </Button>
            </Footer>
        </>
    );
}

