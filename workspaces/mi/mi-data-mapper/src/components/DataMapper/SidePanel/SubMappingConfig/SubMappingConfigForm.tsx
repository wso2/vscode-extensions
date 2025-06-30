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
import React, { useEffect, useState } from "react";
import {
    AutoComplete,
    Button,
    Codicon,
    Drawer,
    Icon,
    LinkButton,
    SidePanel,
    SidePanelBody,
    SidePanelTitleContainer,
    TextField
} from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { VSCodeCheckbox } from '@vscode/webview-ui-toolkit/react';
import { TypeKind } from "@wso2/mi-core";
import { Controller, useForm } from 'react-hook-form';

import { useDMSubMappingConfigPanelStore, SubMappingConfigFormData } from "../../../../store/store";
import { Block, FunctionDeclaration, Node, VariableStatement } from "ts-morph";
import { SourceNodeType, View } from "../../Views/DataMapperView";
import { getDefaultValue } from "../../../Diagram/utils/common-utils";
import { DataMapperNodeModel } from "../../../Diagram/Node/commons/DataMapperNode";
import { ImportCustomTypeForm } from "../ImportData/ImportCustomTypeForm";

const Field = styled.div`
   display: flex;
   flex-direction: column;
   margin-bottom: 12px;
`;

import { css } from "@emotion/css";
import { useShallow } from "zustand/react/shallow";

const ALLOWED_TYPES = ['string', 'number', 'boolean', 'object'];
const ADD_NEW_SUB_MAPPING_HEADER = "Add New Sub Mapping";
const EDIT_SUB_MAPPING_HEADER = "Edit Sub Mapping";

export type SubMappingConfigFormProps = {
    functionST: FunctionDeclaration;
    inputNode: DataMapperNodeModel;
    configName: string;
    documentUri: string;
    addView: (view: View) => void;
    updateView: (updatedView: View) => void;
    applyModifications: (fileContent: string) => Promise<void>;
};

export function SubMappingConfigForm(props: SubMappingConfigFormProps) {
    const { functionST, inputNode, configName, documentUri, addView, updateView, applyModifications } = props;
    const { focusedST, views } = inputNode?.context ?? {};
    const lastView = views && views[views.length - 1];

    const [isImportCustomTypeFormOpen, setIsImportCustomTypeFormOpen] = useState<boolean>(false);

    const interfaces = functionST.getSourceFile().getInterfaces().map(iface => iface.getName());
    const allowedTypes = [...ALLOWED_TYPES, ...interfaces];

    const {
        subMappingConfig: { isSMConfigPanelOpen, nextSubMappingIndex, suggestedNextSubMappingName },
        resetSubMappingConfig,
        subMappingConfigFormData,
        setSubMappingConfigFormData
    } = useDMSubMappingConfigPanelStore(
            useShallow(
                    state => ({
                    subMappingConfig: state.subMappingConfig,
                    resetSubMappingConfig: state.resetSubMappingConfig,
                    subMappingConfigFormData: state.subMappingConfigFormData,
                    setSubMappingConfigFormData: state.setSubMappingConfigFormData
                })
            )
    );

    let defaultValues: { mappingName: string; mappingType: string | null; isArray: boolean };
    if (subMappingConfigFormData) {
        defaultValues = {
            mappingName: subMappingConfigFormData.mappingName,
            mappingType: subMappingConfigFormData.mappingType,
            isArray: subMappingConfigFormData.isArray
        }
    } else {
        defaultValues = {
            mappingName: suggestedNextSubMappingName,
            mappingType: null,
            isArray: false
        }
    }

    const { control, handleSubmit, setValue, watch, reset, getValues } = useForm<SubMappingConfigFormData>({ defaultValues });

    const isEdit = isSMConfigPanelOpen && nextSubMappingIndex === -1 && !suggestedNextSubMappingName;

    const getIsArray = (mappingType: string) => {
        return mappingType.includes('[]');
    };

    const getBaseType = (mappingType: string) => {
        return mappingType.replaceAll('[]', '');
    };

    useEffect(() => {
        if (isEdit) {
            const { mappingName, mappingType } = lastView.subMappingInfo;
            setValue('mappingName', mappingName);
            setValue('mappingType', getBaseType(mappingType));
            setValue('isArray', getIsArray(mappingType));
        } else {
            setValue('mappingName', defaultValues.mappingName);
            setValue('mappingType', defaultValues.mappingType);
            setValue('isArray', defaultValues.isArray);
        }
    }, [isEdit, defaultValues.mappingName, defaultValues.mappingType, defaultValues.isArray, setValue]);

    const onAdd = async (data: SubMappingConfigFormData) => {
        const { mappingName, mappingType, isArray } = data;

        const typeKind = isArray ? TypeKind.Array : mappingType ? mappingType as TypeKind : TypeKind.Object;
        const defaultValue = getDefaultValue({ kind: typeKind });
        const typeDesc = mappingType && (isArray ? `${mappingType}[]` : mappingType !== "object" && mappingType);
        const varStmt = `const ${mappingName}${typeDesc ? `: ${typeDesc}` : ''} = ${defaultValue};`;
        (functionST.getBody() as Block).insertStatements(nextSubMappingIndex, varStmt);

        resetSubMappingConfig();
        reset();

        await applyModifications(functionST.getSourceFile().getFullText());
    };


    const onEdit = async (data: SubMappingConfigFormData) => {

        const { mappingName, mappingType, isArray } = data;
        let { mappingName: prevMappingName, mappingType: prevMappingType } = lastView.subMappingInfo;

        const prevIsArray = getIsArray(prevMappingType);
        prevMappingType = getBaseType(prevMappingType);

        let updatedName: string;
        let updatedType: string;

        const varDecl = focusedST && (focusedST as VariableStatement).getDeclarations()[0];
        const typeNode = varDecl.getTypeNode();

        if (mappingName !== prevMappingName && varDecl) {
            varDecl.rename(mappingName);
            updatedName = mappingName;
        }

        let updatedNode: Node;
        if ((mappingName !== prevMappingName || mappingType !== prevMappingType || isArray !== prevIsArray) && mappingType !== "object" && varDecl) {
            const typeKind = isArray ? TypeKind.Array : mappingType ? mappingType as TypeKind : TypeKind.Object;
            const typeDesc = mappingType && (isArray ? `${mappingType}[]` : mappingType);
            const defaultValue = getDefaultValue({ kind: typeKind });
            if (typeNode) {
                updatedNode = typeNode.replaceWithText(typeDesc);
                await applyModifications(updatedNode.getSourceFile().getFullText());
            } else {
                varDecl.setType(typeDesc);
            }
            updatedNode = varDecl.getInitializer().replaceWithText(defaultValue);
            await applyModifications(updatedNode.getSourceFile().getFullText());
            updatedType = typeDesc;
        }

        updateView({
            ...lastView,
            label: updatedName ? updatedName : prevMappingName,
            subMappingInfo: {
                ...lastView.subMappingInfo,
                mappingName: updatedName ? updatedName : prevMappingName,
                mappingType: updatedType ? updatedType : prevMappingType
            }
        });

        await applyModifications(updatedNode.getSourceFile().getFullText());
        resetSubMappingConfig();
        reset();
    };

    const onClose = () => {
        resetSubMappingConfig();
    };

    const openImportCustomTypeForm = () => {
        setSubMappingConfigFormData(getValues());
        setIsImportCustomTypeFormOpen(true);
    }

    return (
        <SidePanel
            isOpen={isSMConfigPanelOpen}
            alignment="right"
            width={312}
            overlay={true}
        >
            <SidePanelTitleContainer>
                <span>{isEdit ? EDIT_SUB_MAPPING_HEADER : ADD_NEW_SUB_MAPPING_HEADER}</span>
                <Button
                    sx={{ marginLeft: "auto" }}
                    onClick={onClose}
                    appearance="icon"
                >
                    <Codicon name="close" />
                </Button>
            </SidePanelTitleContainer>
            <SidePanelBody>
                <Field>
                    <Controller
                        name="mappingName"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Sub Mapping Name"
                                size={50}
                                placeholder={defaultValues.mappingName}
                            />
                        )}
                    />
                </Field>
                <Field>
                    <Controller
                        name="mappingType"
                        control={control}
                        render={({ field }) => (
                            <>
                                <AutoComplete
                                    label="Type (Optional)"
                                    name="mappingType"
                                    items={allowedTypes}
                                    nullable={true}
                                    value={field.value}
                                    onValueChange={(e) => { field.onChange(e); }}
                                    borderBox
                                />
                            </>
                        )}
                    />

                    <LinkButton
                        onClick={openImportCustomTypeForm}
                        sx={{ padding: "5px", gap: "2px", marginTop: "5px" }}
                    >
                        <Codicon
                            iconSx={{ fontSize: "12px" }}
                            name="add"
                        />
                        <p style={{ fontSize: "12px" }}>Add new type</p>
                    </LinkButton>

                </Field>
                <Field>
                    <Controller
                        name="isArray"
                        control={control}
                        render={({ field }) => (
                            <VSCodeCheckbox
                                checked={field.value}
                                onClick={(e: any) => field.onChange(e.target.checked)}
                                onBlur={field.onBlur}
                                name={field.name}
                                ref={field.ref}
                            >
                                Is Array
                            </VSCodeCheckbox>
                        )}
                    />
                </Field>
                {!isEdit && (
                    <div style={{ textAlign: "right", marginTop: "10px", float: "right" }}>
                        <Button
                            appearance="primary"
                            onClick={handleSubmit(onAdd)}
                            disabled={watch("mappingName") === ""}
                        >
                            Add
                        </Button>
                    </div>
                )}
                {isEdit && (
                    <div style={{ textAlign: "right", marginTop: "10px", float: "right" }}>
                        <Button
                            appearance="primary"
                            onClick={handleSubmit(onEdit)}
                            disabled={watch("mappingName") === ""}
                        >
                            Save
                        </Button>
                    </div>
                )}

                <Drawer
                    isOpen={isImportCustomTypeFormOpen}
                    id="drawerImportCustomTypeForm"
                    isSelected={true}
                    sx={{ width: 312 }}
                >
                    <ImportCustomTypeForm
                        functionST={functionST}
                        configName={configName}
                        documentUri={documentUri}
                        setIsImportCustomTypeFormOpen={setIsImportCustomTypeFormOpen} />
                </Drawer>

            </SidePanelBody>
        </SidePanel>
    );
}
