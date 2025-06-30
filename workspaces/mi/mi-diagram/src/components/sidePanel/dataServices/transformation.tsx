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

import React, { useEffect, useRef } from 'react';
import { AutoComplete, Button, ProgressIndicator, TextField, Typography } from '@wso2/ui-toolkit';
import { VSCodeCheckbox } from '@vscode/webview-ui-toolkit/react';
import styled from '@emotion/styled';
import SidePanelContext from '../SidePanelContexProvider';
import { AddMediatorProps } from '../../Form/common';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { Controller, useForm } from 'react-hook-form';
import { sidepanelGoBack } from '..';
import { getDssQueryXml } from '../../../utils/template-engine/mustach-templates/dataservice/ds-templates';

const Error = styled.span`
   color: var(--vscode-errorForeground);
   font-size: 12px;
`;

const Field = styled.div`
   margin-bottom: 12px;
`;

const TransformationForm = (props: AddMediatorProps) => {
    const { rpcClient } = useVisualizerContext();
    const sidePanelContext = React.useContext(SidePanelContext);
    const [isLoading, setIsLoading] = React.useState(true);
    const handleOnCancelExprEditorRef = useRef(() => { });

    const { control, formState: { errors }, handleSubmit, watch, reset } = useForm();

    useEffect(() => {
        reset({
            outputType: sidePanelContext?.formValues?.outputType || "XML",
            useColumnNumbers: sidePanelContext?.formValues?.useColumnNumbers || false,
            escapeNonPrintableCharacters: sidePanelContext?.formValues?.escapeNonPrintableCharacters || false,
            rdfBaseUri: sidePanelContext?.formValues?.rdfBaseUri || "",
            groupedElement: sidePanelContext?.formValues?.groupedElement || "",
            rowName: sidePanelContext?.formValues?.rowName || "",
            rowNamespace: sidePanelContext?.formValues?.rowNamespace || "",
            xsltPath: sidePanelContext?.formValues?.xsltPath || "",
        });
        setIsLoading(false);
    }, [sidePanelContext.formValues]);

    useEffect(() => {
        handleOnCancelExprEditorRef.current = () => {
            sidepanelGoBack(sidePanelContext);
        };
    }, [sidePanelContext.pageStack]);

    const onClick = async (values: any) => {

        const existingResult = sidePanelContext?.formValues.queryObject.result;
        const updatedResult: any = {
            outputType: values.outputType,
            useColumnNumbers: values.useColumnNumbers,
            escapeNonPrintableChar: values.escapeNonPrintableCharacters,
            defaultNamespace: values.outputType === "JSON" ? "" : values.rowNamespace,
            xsltPath: values.outputType === "JSON" ? "" : values.xsltPath,
            rdfBaseURI: values.outputType === "RDF" ? values.rdfBaseUri : "",
            element: values.outputType === "XML" ? values.groupedElement : "",
            rowName: values.outputType === "XML" ? values.rowName : "",
            elements: values.outputType === "JSON" ? [] : existingResult?.elements ?? [],
            attributes: values.outputType === "JSON" ? [] : existingResult?.attributes ?? [],
            queries: values.outputType === "JSON" ? [] : existingResult?.queries ?? [],
            complexElements: values.outputType === "JSON" ? [] : existingResult?.complexElements ?? []
        }
        const updatedQuery = sidePanelContext?.formValues.queryObject;
        updatedQuery.result = updatedResult;
        const queryType = sidePanelContext?.formValues.queryObject.expression ? "expression" : "sql";

        let xml = getDssQueryXml({ ...updatedQuery, queryType }).replace(/^\s*[\r\n]/gm, '');
        const range = sidePanelContext?.formValues?.queryObject.range;
        await rpcClient.getMiDiagramRpcClient().applyEdit({
            text: xml, documentUri: props.documentUri,
            range: { start: range.startTagRange.start, end: range.endTagRange.end }
        });

        sidePanelContext.setSidePanelState({
            ...sidePanelContext,
            isOpen: false,
            isEditing: false,
            formValues: undefined,
            nodeRange: undefined,
            operationName: undefined
        });
    };

    if (isLoading) {
        return <ProgressIndicator />;
    }
    return (
        <>
            <Typography sx={{ padding: "10px 20px", borderBottom: "1px solid var(--vscode-editorWidget-border)" }} variant="body3"></Typography>
            <div style={{ padding: "20px" }}>

                <Field>
                    <Controller
                        name="outputType"
                        control={control}
                        render={({ field }) => (
                            <AutoComplete label="Output Type" name="outputType" items={["XML", "RDF", "JSON"]} value={field.value} onValueChange={(e: any) => {
                                field.onChange(e);
                            }} />
                        )}
                    />
                    {errors.outputType && <Error>{errors.outputType.message.toString()}</Error>}
                </Field>

                <Field>
                    <Controller
                        name="useColumnNumbers"
                        control={control}
                        render={({ field }) => (
                            <VSCodeCheckbox {...field} type="checkbox" checked={field.value} onChange={(e: any) => { field.onChange(e.target.checked) }}>Use Column Numbers</VSCodeCheckbox>
                        )}
                    />
                    {errors.useColumnNumbers && <Error>{errors.useColumnNumbers.message.toString()}</Error>}
                </Field>

                <Field>
                    <Controller
                        name="escapeNonPrintableCharacters"
                        control={control}
                        render={({ field }) => (
                            <VSCodeCheckbox {...field} type="checkbox" checked={field.value} onChange={(e: any) => { field.onChange(e.target.checked) }}>Escape Non-printable Characters</VSCodeCheckbox>
                        )}
                    />
                    {errors.escapeNonPrintableCharacters && <Error>{errors.escapeNonPrintableCharacters.message.toString()}</Error>}
                </Field>

                {watch("outputType") == "RDF" &&
                    <Field>
                        <Controller
                            name="rdfBaseUri"
                            control={control}
                            render={({ field }) => (
                                <TextField {...field} label="RDF Base URI" size={50} placeholder="" />
                            )}
                        />
                        {errors.rdfBaseUri && <Error>{errors.rdfBaseUri.message.toString()}</Error>}
                    </Field>
                }

                {watch("outputType") == "XML" &&
                    <Field>
                        <Controller
                            name="groupedElement"
                            control={control}
                            render={({ field }) => (
                                <TextField {...field} label="Grouped by Element" size={50} placeholder="" />
                            )}
                        />
                        {errors.groupedElement && <Error>{errors.groupedElement.message.toString()}</Error>}
                    </Field>
                }

                {watch("outputType") == "XML" &&
                    <Field>
                        <Controller
                            name="rowName"
                            control={control}
                            render={({ field }) => (
                                <TextField {...field} label="Row Name" size={50} placeholder="" />
                            )}
                        />
                        {errors.rowName && <Error>{errors.rowName.message.toString()}</Error>}
                    </Field>
                }

                {!((watch("outputType") == "JSON")) &&
                    <Field>
                        <Controller
                            name="rowNamespace"
                            control={control}
                            render={({ field }) => (
                                <TextField {...field} label="Row Namespace" size={50} placeholder="" />
                            )}
                        />
                        {errors.rowNamespace && <Error>{errors.rowNamespace.message.toString()}</Error>}
                    </Field>
                }

                {!((watch("outputType") == "JSON")) &&
                    <Field>
                        <Controller
                            name="xsltPath"
                            control={control}
                            render={({ field }) => (
                                <TextField {...field} label="XSLT Path" size={50} placeholder="" />
                            )}
                        />
                        {errors.xsltPath && <Error>{errors.xsltPath.message.toString()}</Error>}
                    </Field>
                }


                <div style={{ textAlign: "right", marginTop: "10px", float: "right" }}>
                    <Button
                        appearance="primary"
                        onClick={handleSubmit(onClick)}
                    >
                        Submit
                    </Button>
                </div>

            </div>
        </>
    );
};

export default TransformationForm; 
