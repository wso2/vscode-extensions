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

import { useEffect, useState } from "react";
import styled from "@emotion/styled";
import { Typography, ProgressRing } from "@wso2/ui-toolkit";
import { FormField, FormImports, FormValues } from "@wso2/ballerina-side-panel";
import { ListenerModel, LineRange, RecordTypeField, PropertyModel, PropertyTypeMemberInfo, Property } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { URI, Utils } from "vscode-uri";
import FormGeneratorNew from "../../Forms/FormGeneratorNew";
import { FormHeader } from "../../../../components/FormHeader";
import { getImportsForProperty } from "../../../../utils/bi";

const Container = styled.div`
    /* padding: 0 20px 20px; */
    max-width: 600px;
    > div:last-child {
        /* padding: 20px 0; */
        > div:last-child {
            justify-content: flex-start;
        }
    }
`;

const FormContainer = styled.div`
    /* padding-top: 15px; */
    padding-bottom: 15px;
`;

const LoadingContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 80vh;
    flex-direction: column;
`;

interface ListenerConfigFormProps {
    listenerModel: ListenerModel;
    onSubmit?: (data: ListenerModel) => void;
    isSaving?: boolean;
    onBack?: () => void;
    formSubmitText?: string;
}

export function ListenerConfigForm(props: ListenerConfigFormProps) {
    const { rpcClient } = useRpcContext();

    const [listenerFields, setListenerFields] = useState<FormField[]>([]);
    const { listenerModel, onSubmit, onBack, formSubmitText = "Next", isSaving } = props;
    const [filePath, setFilePath] = useState<string>('');
    const [targetLineRange, setTargetLineRange] = useState<LineRange>();
    const [recordTypeFields, setRecordTypeFields] = useState<RecordTypeField[]>([]);

    useEffect(() => {
        const recordTypeFields: RecordTypeField[] = Object.entries(listenerModel.properties)
            .filter(([_, property]) =>
                property.typeMembers &&
                property.typeMembers.some(member => member.kind === "RECORD_TYPE")
            )
            .map(([key, property]) => ({
                key,
                property: {
                    ...property,
                    metadata: {
                        label: property.metadata?.label || key,
                        description: property.metadata?.description || ''
                    },
                    valueType: property?.valueType || 'string',
                    diagnostics: {
                        hasDiagnostics: property.diagnostics && property.diagnostics.length > 0,
                        diagnostics: property.diagnostics
                    }
                } as Property,
                recordTypeMembers: property.typeMembers.filter(member => member.kind === "RECORD_TYPE")
            }));
        console.log(">>> recordTypeFields", recordTypeFields);
        setRecordTypeFields(recordTypeFields);

        listenerModel && setListenerFields(convertConfig(listenerModel));
        rpcClient.getVisualizerLocation().then(res => { setFilePath(Utils.joinPath(URI.file(res.projectUri), 'main.bal').fsPath) });
    }, [listenerModel]);

    const handleListenerSubmit = async (data: FormValues, formImports: FormImports) => {
        listenerFields.forEach(val => {
            if (data[val.key]) {
                val.value = data[val.key]
            }
            val.imports = getImportsForProperty(val.key, formImports);
        })
        const response = updateConfig(listenerFields, listenerModel);
        onSubmit(response);
    };

    const createTitle = `Provide the necessary configuration details for the ${listenerModel.displayAnnotation.label} to complete the setup.`;
    const editTitle = `Update the configuration details for the ${listenerModel.displayAnnotation.label} as needed.`

    useEffect(() => {
        if (filePath && rpcClient) {
            rpcClient
                .getBIDiagramRpcClient()
                .getEndOfFile({ filePath })
                .then((res) => {
                    setTargetLineRange({
                        startLine: res,
                        endLine: res,
                    });
                });
        }
    }, [filePath, rpcClient]);

    return (
        <Container>

            {!listenerModel &&
                <LoadingContainer>
                    <ProgressRing />
                    <Typography variant="h3" sx={{ marginTop: '16px' }}>Loading Listener Configurations...</Typography>
                </LoadingContainer>
            }

            {listenerModel &&
                <>
                    {listenerFields.length > 0 &&
                        <FormContainer>
                            {/* <Typography variant="h2" sx={{ marginTop: '16px' }}>{listenerModel.displayAnnotation.label.charAt(0).toUpperCase() + listenerModel.displayAnnotation.label.slice(1)} Configuration</Typography>
                            <BodyText>
                                {formSubmitText === "Save" ? editTitle : createTitle}
                            </BodyText> */}
                            <FormHeader title={`${listenerModel.displayAnnotation.label.charAt(0).toUpperCase() + listenerModel.displayAnnotation.label.slice(1)} Configuration`} />
                            {filePath && targetLineRange &&
                                <FormGeneratorNew
                                    fileName={filePath}
                                    targetLineRange={targetLineRange}
                                    fields={listenerFields}
                                    onSubmit={handleListenerSubmit}
                                    onBack={onBack}
                                    isSaving={isSaving}
                                    submitText={formSubmitText}
                                    recordTypeFields={recordTypeFields}
                                />
                            }
                        </FormContainer>
                    }
                </>
            }
        </Container>
    );
}

export default ListenerConfigForm;

function convertConfig(listener: ListenerModel): FormField[] {
    const formFields: FormField[] = [];
    for (const key in listener.properties) {
        const expression = listener.properties[key];
        const formField: FormField = {
            key: key,
            label: expression?.metadata.label || key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, str => str.toUpperCase()),
            type: expression.valueType,
            documentation: expression?.metadata.description || "",
            valueType: expression.valueTypeConstraint,
            editable: expression.editable,
            enabled: expression.enabled ?? true,
            optional: expression.optional,
            value: expression.value,
            valueTypeConstraint: expression.valueTypeConstraint,
            advanced: expression.advanced,
            diagnostics: [],
            items: expression.items,
            placeholder: expression.placeholder,
            lineRange: expression?.codedata?.lineRange
        }
        formFields.push(formField);
    }
    return formFields;
}

function updateConfig(formFields: FormField[], listener: ListenerModel): ListenerModel {
    formFields.forEach(field => {
        const value = field.value;
        if (field.type === "MULTIPLE_SELECT" || field.type === "EXPRESSION_SET") {
            listener.properties[field.key].values = value as string[];
        } else {
            listener.properties[field.key].value = value as string;
        }
        if (value && value.length > 0) {
            listener.properties[field.key].enabled = true;
        }
    })
    return listener;
}
