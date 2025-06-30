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
import { Button, ComponentCard, ProgressIndicator, Typography, TextArea } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import SidePanelContext from '../SidePanelContexProvider';
import { AddMediatorProps, getParamManagerFromValues, getParamManagerValues } from '../../Form/common';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { Controller, useForm } from 'react-hook-form';
import { ParamConfig, ParamManager, ParamValue } from '../../Form/ParamManager/ParamManager';
import { sidepanelGoBack } from '..';
import { getDssQueryXml } from '../../../utils/template-engine/mustach-templates/dataservice/ds-templates';

const cardStyle = {
    display: "block",
    margin: "15px 0",
    padding: "0 15px 15px 15px",
    width: "auto",
    cursor: "auto"
};

const Error = styled.span`
   color: var(--vscode-errorForeground);
   font-size: 12px;
`;

const Field = styled.div`
   margin-bottom: 12px;
`;

const OutputMappingsForm = (props: AddMediatorProps) => {
    const { rpcClient } = useVisualizerContext();
    const sidePanelContext = React.useContext(SidePanelContext);
    const [isLoading, setIsLoading] = React.useState(true);
    const handleOnCancelExprEditorRef = useRef(() => { });

    const { control, formState: { errors }, handleSubmit, reset } = useForm();

    useEffect(() => {
        reset({
            outputMappings: {
                paramValues: sidePanelContext?.formValues?.outputMappings ? getParamManagerFromValues(sidePanelContext?.formValues?.outputMappings, 0, 4) : [],
                paramFields: [
                    {
                        "type": "Dropdown",
                        "label": "Mapping Type",
                        "defaultValue": "Element",
                        "isRequired": false,
                        "values": [
                            "Element",
                            "Attribute",
                            "Query",
                            "Complex Element"
                        ]
                    },
                    {
                        "type": "KeyLookup",
                        "label": "Query ID",
                        "filterType": "dssQuery",
                        "defaultValue": "",
                        "isRequired": false,
                        "enableCondition": [
                            {
                                "0": "Query"
                            }
                        ]
                    },
                    {
                        "type": "ParamManager",
                        "label": "Query Parameters",
                        "defaultValue": "",
                        "isRequired": false,
                        "paramManager": {
                            paramConfigs: {
                                paramValues: sidePanelContext?.formValues?.queryParams ? getParamManagerFromValues(sidePanelContext?.formValues?.queryParams, 0) : [],
                                paramFields: [
                                    {
                                        "type": "TextField",
                                        "label": "Query Parameter Name",
                                        "defaultValue": "",
                                        "isRequired": false,
                                    },
                                    {
                                        "type": "TextField",
                                        "label": "Mapping Name",
                                        "defaultValue": "",
                                        "isRequired": false,
                                    },
                                    {
                                        "type": "Dropdown",
                                        "label": "Mapping Type",
                                        "defaultValue": "Column",
                                        "isRequired": false,
                                        "values": [
                                            "Column",
                                            "Query Param"
                                        ]
                                    }
                                ]
                            },
                            openInDrawer: true,
                            addParamText: "Add Query Parameter"
                        },
                        "enableCondition": [
                            {
                                "0": "Query"
                            }
                        ]
                    },
                    {
                        "type": "Dropdown",
                        "label": "Datasource Type",
                        "defaultValue": "Column",
                        "isRequired": false,
                        "values": [
                            "Column",
                            "Query Param"
                        ],
                        "enableCondition": [
                            "OR",
                            {
                                "0": "Element"
                            },
                            {
                                "0": "Attribute"
                            }
                        ]
                    },
                    {
                        "type": "TextField",
                        "label": "Output Field Name",
                        "defaultValue": "",
                        "isRequired": false,
                        "enableCondition": [
                            "OR",
                            {
                                "0": "Element"
                            },
                            {
                                "0": "Attribute"
                            }
                        ]
                    },
                    {
                        "type": "TextField",
                        "label": "Element Name",
                        "defaultValue": "",
                        "isRequired": false,
                        "enableCondition": [
                            {
                                "0": "Complex Element"
                            }
                        ]
                    },
                    {
                        "type": "TextField",
                        "label": "Element Namespace",
                        "defaultValue": "",
                        "isRequired": false,
                        "enableCondition": [
                            "OR",
                            {
                                "0": "Element"
                            },
                            {
                                "0": "Complex Element"
                            }
                        ]
                    },
                    {
                        "type": "TextField",
                        "label": "Datasource Column Name",
                        "defaultValue": "",
                        "isRequired": false,
                        "enableCondition": [
                            "AND",
                            [
                                "OR",
                                {
                                    "0": "Element"
                                },
                                {
                                    "0": "Attribute"
                                }
                            ],
                            {
                                "3": "Column"
                            }
                        ]
                    },
                    {
                        "type": "TextField",
                        "label": "Datasource Query Param Name",
                        "defaultValue": "",
                        "isRequired": false,
                        "enableCondition": [
                            "AND",
                            [
                                "OR",
                                {
                                    "0": "Element"
                                },
                                {
                                    "0": "Attribute"
                                }
                            ],
                            {
                                "3": "Query Param"
                            }
                        ]
                    },
                    {
                        "type": "Dropdown",
                        "label": "Parameter Type",
                        "defaultValue": "Scalar",
                        "isRequired": false,
                        "values": [
                            "Scalar",
                            "Array"
                        ],
                        "enableCondition": [
                            "NOT",
                            {
                                "0": "Query"
                            }
                        ]
                    },
                    {
                        "type": "TextField",
                        "label": "Array Name",
                        "defaultValue": "",
                        "isRequired": false,
                        "enableCondition": [
                            "AND",
                            [
                                "NOT",
                                {
                                    "0": "Query"
                                }
                            ],
                            {
                                "8": "Array"
                            }
                        ]
                    },
                    {
                        "type": "Dropdown",
                        "label": "Schema Type",
                        "defaultValue": "string",
                        "isRequired": false,
                        "values": [
                            "string",
                            "integer",
                            "boolean",
                            "float",
                            "double",
                            "decimal",
                            "dateTime",
                            "time",
                            "date",
                            "long",
                            "base64Binary"
                        ],
                        "enableCondition": [
                            "OR",
                            {
                                "0": "Element"
                            },
                            {
                                "0": "Attribute"
                            }
                        ]
                    },
                    {
                        "type": "Checkbox",
                        "label": "Optional",
                        "defaultValue": false,
                        "isRequired": false,
                        "enableCondition": [
                            "OR",
                            {
                                "0": "Element"
                            },
                            {
                                "0": "Attribute"
                            }
                        ]
                    },
                    {
                        "type": "TextArea",
                        "label": "Child Elements",
                        "defaultValue": "",
                        "isRequired": false,
                        "enableCondition": [
                            {
                                "0": "Complex Element"
                            }
                        ]
                    },
                    {
                        "type": "TextField",
                        "label": "Export Name",
                        "defaultValue": "",
                        "isRequired": false,
                        "enableCondition": [
                            "OR",
                            {
                                "0": "Element"
                            },
                            {
                                "0": "Attribute"
                            }
                        ]
                    },
                    {
                        "type": "Dropdown",
                        "label": "Export Type",
                        "defaultValue": "Scalar",
                        "isRequired": false,
                        "values": [
                            "Scalar",
                            "Array"
                        ],
                        "enableCondition": [
                            "OR",
                            {
                                "0": "Element"
                            },
                            {
                                "0": "Attribute"
                            }
                        ]
                    },
                    {
                        "type": "Checkbox",
                        "label": "admin",
                        "defaultValue": "",
                        "isRequired": false,
                    },
                    {
                        "type": "Checkbox",
                        "label": "Internal/everyone",
                        "defaultValue": "",
                        "isRequired": false
                    },
                ]
            },
            jsonPayload: sidePanelContext?.formValues?.jsonPayload?.replace(/\s+/g, " ").trim() || ''
        });
        setIsLoading(false);
    }, [sidePanelContext.formValues]);

    useEffect(() => {
        handleOnCancelExprEditorRef.current = () => {
            sidepanelGoBack(sidePanelContext);
        };
    }, [sidePanelContext.pageStack]);

    const getValue = (property: any) => {
        return property[0].value === 'Query' ? property[1].value :
            property[0].value === 'Complex Element' ? property[5].value : property[4].value;
    }

    const onClick = async (values: any) => {

        values["outputMappings"] = getParamManagerValues(values.outputMappings);
        const updatedResult = sidePanelContext?.formValues?.queryObject.result;
        if (!sidePanelContext?.formValues?.outputJson) {
            let elements: any[] = [];
            let attributes: any[] = [];
            let queries: any[] = [];
            let complexElements: any[] = [];

            values["outputMappings"].map((param: any) => {
                const requiredRoles = [];
                if (param[16]) {
                    requiredRoles.push("admin");
                }
                if (param[17]) {
                    requiredRoles.push("Internal/everyone");
                }
                if (param[0] === "Element") {
                    const newElement = {
                        elementName: param[4],
                        elementNamespace: param[6],
                        datasourceColumn: param[7],
                        queryParam: param[8],
                        arrayName: param[10],
                        xsdType: param[11],
                        optional: param[12],
                        exportName: param[14],
                        exportType: param[15],
                        requiredRoles: requiredRoles.join(",")
                    }
                    elements.push(newElement);
                } else if (param[0] === "Attribute") {
                    const newAttribute = {
                        attributeName: param[4],
                        datasourceColumn: param[7],
                        queryParam: param[8],
                        xsdType: param[11],
                        optional: param[12],
                        exportName: param[14],
                        exportType: param[15],
                        requiredRoles: requiredRoles.join(",")
                    }
                    attributes.push(newAttribute);
                } else if (param[0] === "Query") {
                    const newQuery: any = {
                        query: param[1],
                        requiredRoles: requiredRoles.join(","),
                        queryParams: param[2].map((param: any) => {
                            let queryParam = {
                                paramName: param[0],
                                column: param[2] === "Column" ? param[1] : "",
                                queryParam: param[2] === "Query Param" ? param[1] : "",
                                mappingType: param[2]
                            };
                            return queryParam;
                        }) ?? []
                    }
                    newQuery.hasQueryParams = newQuery.queryParams.length > 0;
                    queries.push(newQuery);
                } else {
                    const newComplexElement = {
                        elementName: param[5],
                        elementNamespace: param[6],
                        arrayName: param[10],
                        requiredRoles: requiredRoles.join(","),
                        childElements: param[13]
                    }
                    complexElements.push(newComplexElement);
                }
            });

            updatedResult.elements = elements;
            updatedResult.attributes = attributes;
            updatedResult.queries = queries;
            updatedResult.complexElements = complexElements;
        } else {
            updatedResult.jsonPayload = values.jsonPayload;
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
                {sidePanelContext?.formValues?.outputJson ?
                    <Field>
                        <Controller
                            name="jsonPayload"
                            control={control}
                            render={({ field }) => (
                                <TextArea {...field} label="JSON Payload" placeholder="" rows={15} resize="vertical" />
                            )}
                        />
                        {errors.jsonPayload && <Error>{errors.jsonPayload.message.toString()}</Error>}
                    </Field>
                    :
                    <ComponentCard sx={cardStyle} disbaleHoverEffect>
                        <Typography variant="h3">Output Mappings</Typography>
                        <Controller
                            name="outputMappings"
                            control={control}
                            render={({ field: { onChange, value } }) => (
                                <ParamManager
                                    paramConfigs={value}
                                    readonly={false}
                                    onChange={(values) => {
                                        values.paramValues = values.paramValues.map((param: any) => {
                                            const property: ParamValue[] = param.paramValues;
                                            param.key = property[0].value;
                                            param.value = getValue(property);

                                            (property[2].value as ParamConfig).paramValues = (property[2].value as ParamConfig).paramValues.map((param: any) => {
                                                const property: ParamValue[] = param.paramValues;
                                                param.key = property[0].value;
                                                param.value = property[1].value;
                                                return param;
                                            });

                                            return param;
                                        });
                                        onChange(values);
                                    }}
                                />
                            )}
                        />
                    </ComponentCard>
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

export default OutputMappingsForm; 
