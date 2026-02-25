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
import { Alert, Button, ComponentCard, ProgressIndicator, Typography } from '@wso2/ui-toolkit';
import SidePanelContext from '../SidePanelContexProvider';
import { AddMediatorProps, getParamManagerFromValues, getParamManagerValues } from '../../Form/common';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { Controller, useForm } from 'react-hook-form';
import { ParamConfig, ParamManager, ParamValue } from '../../Form/ParamManager/ParamManager';
import { sidepanelGoBack } from '..';
import { getDssQueryXml, getDssResourceQueryParamsXml } from '../../../utils/template-engine/mustach-templates/dataservice/ds-templates';

const cardStyle = {
    display: "block",
    margin: "15px 0",
    padding: "0 15px 15px 15px",
    width: "auto",
    cursor: "auto"
};

const InputMappingsForm = (props: AddMediatorProps) => {
    const { rpcClient } = useVisualizerContext();
    const sidePanelContext = React.useContext(SidePanelContext);
    const [isLoading, setIsLoading] = React.useState(true);
    const handleOnCancelExprEditorRef = useRef(() => { });
    const [ showQueryError, setShowQueryError ] = React.useState(false);
    const [ showError, setShowError ] = React.useState(false);

    const { control, handleSubmit, reset } = useForm();

    const getParamFields = (paramValues: any) => {
        return [
            {
                "type": "TextField",
                "label": "Mapping Name",
                "defaultValue": "",
                "isRequired": false
            },
            {
                "type": "TextField",
                "label": "Query Parameter",
                "defaultValue": "",
                "isRequired": false
            },
            {
                "type": "Dropdown",
                "label": "Parameter Type",
                "defaultValue": "SCALAR",
                "isRequired": false,
                "values": [
                    "SCALAR",
                    "ARRAY"
                ]
            },
            {
                "type": "Dropdown",
                "label": "SQL Type",
                "defaultValue": "STRING",
                "isRequired": false,
                "values": [
                    "STRING",
                    "INTEGER",
                    "REAL",
                    "DOUBLE",
                    "NUMERIC",
                    "TINYINT",
                    "SMALLINT",
                    "BIGINT",
                    "DATE",
                    "TIME",
                    "TIMESTAMP",
                    "BIT",
                    "ORACLE REF CURSOR",
                    "BINARY",
                    "BLOB",
                    "CLOB",
                    "STRUCT",
                    "ARRAY",
                    "UUID",
                    "VARINT",
                    "INETADDRESS",
                    "QUERY_STRING"
                ]
            },
            {
                "type": "TextField",
                "label": "Default Value",
                "defaultValue": "",
                "isRequired": false
            },
            {
                "type": "Dropdown",
                "label": "IN/OUT Type",
                "defaultValue": "IN",
                "isRequired": false,
                "values": [
                    "IN",
                    "OUT",
                    "INOUT"
                ]
            },
            {
                "type": "TextField",
                "label": "Ordinal",
                "defaultValue": "",
                "isRequired": false
            },
            {
                "type": "ParamManager",
                "label": "Validators",
                "defaultValue": "",
                "isRequired": false,
                "paramManager": {
                    paramConfigs: {
                        paramValues: paramValues,
                        paramFields: [
                            {
                                "type": "Dropdown",
                                "label": "Validator Type",
                                "defaultValue": "Long Range Validator",
                                "isRequired": false,
                                "values": [
                                    "Long Range Validator",
                                    "Double Range Validator",
                                    "Length Validator",
                                    "Pattern Validator"
                                ]
                            },
                            {
                                "type": "TextField",
                                "label": "Minimum Value",
                                "defaultValue": "",
                                "isRequired": false,
                                "enableCondition": [
                                    "NOT",
                                    {
                                        "0": "Pattern Validator"
                                    }
                                ]
                            },
                            {
                                "type": "TextField",
                                "label": "Maximum Value",
                                "defaultValue": "",
                                "isRequired": false,
                                "enableCondition": [
                                    "NOT",
                                    {
                                        "0": "Pattern Validator"
                                    }
                                ]
                            },
                            {
                                "type": "TextField",
                                "label": "Pattern",
                                "defaultValue": "",
                                "isRequired": false,
                                "enableCondition": [
                                    {
                                        "0": "Pattern Validator"
                                    }
                                ]
                            }
                        ]
                    },
                    openInDrawer: true,
                    addParamText: "Add Validator"
                }
            }
        ];
    }

    const clearErrors = () => {
        setShowError(false);
        setShowQueryError(false);
    };

    useEffect(() => {
        (async () => {
            const queryParams: any[] = [];
            let isInResource = false;
            const st = await rpcClient.getMiDiagramRpcClient().getSyntaxTree({ documentUri: props.documentUri });
            if (st.syntaxTree.data.resources !== undefined && st.syntaxTree.data.resources !== null && st.syntaxTree.data.resources.length > 0) {
                st.syntaxTree.data.resources.forEach((resource: any) => {
                    if (resource.callQuery.href === sidePanelContext?.formValues?.queryObject.queryName) {
                        if (resource.callQuery.withParam !== undefined) {
                            resource.callQuery.withParam.forEach((param: any) => {
                                queryParams.push({ name: param.name, queryParam: param.queryParam });
                            });
                        }
                        isInResource = true;
                    }
                });
            }
            if (!isInResource) {
                if (st.syntaxTree.data.operations !== undefined && st.syntaxTree.data.operations !== null && st.syntaxTree.data.operations.length > 0) {
                    st.syntaxTree.data.operations.forEach((operation: any) => {
                        if (operation.callQuery.href === sidePanelContext?.formValues?.queryObject.queryName) {
                            if (operation.callQuery.withParam !== undefined) {
                                operation.callQuery.withParam.forEach((param: any) => {
                                    queryParams.push({ name: param.name, queryParam: param.queryParam });
                                });
                            }
                            isInResource = true;
                        }
                    });
                }
            }
            sidePanelContext?.formValues?.inputMappings.forEach((element: any) => {
                const matchingParam = queryParams.find(queryParam => queryParam.name === element[0]);
                if (matchingParam) {
                    element[1] = matchingParam.queryParam;
                }
            });
            reset({
                inputMappings: {
                    paramValues: sidePanelContext?.formValues?.inputMappings ? getParamManagerFromValues(sidePanelContext?.formValues?.inputMappings, 0) : [],
                    paramFields: getParamFields(sidePanelContext?.formValues?.paramElements ? getParamManagerFromValues(sidePanelContext?.formValues?.paramElements, 0) : [])
                },
            });
            setIsLoading(false);
        })();
    }, [sidePanelContext.formValues]);

    useEffect(() => {
        handleOnCancelExprEditorRef.current = () => {
            sidepanelGoBack(sidePanelContext);
        };
    }, [sidePanelContext.pageStack]);

    const getValidatorValue = (property: any) => {
        return property[0].value === 'Pattern Validator' ? "pattern: " + property[3].value :
            "min: " + property[1].value + "; max: " + property[2].value;
    }

    const generateMappings = async () => {
        setIsLoading(true);
        const query = sidePanelContext?.formValues?.queryObject.sqlQuery;
        if (query?.trim()) {
            const response = await rpcClient.getMiDiagramRpcClient().getInputOutputMappings({
                query: query,
                className: "",
                url: "",
                username: "",
                password: "",
                type: 'input'
            });
            if (response && response.length > 0) {
                reset({
                inputMappings: {
                    paramValues: getParamManagerFromValues(response, 0),
                    paramFields: getParamFields([])
                },
            });
            } else {
                setShowError(true);
            }
        } else {
            setShowError(true);
            setShowQueryError(true);
        }
        setIsLoading(false);
    }

    const onClick = async (values: any) => {

        values["inputMappings"] = getParamManagerValues(values.inputMappings);

        const queryParams: any[] = [];
        const queryParameters: any = values["inputMappings"].map((param: any) => {
            queryParams.push({ key: param[0], value: param[1] });
            const validators = param[7].map((paramElement: any) => {
                let paramEle;
                if (paramElement[0] !== "Pattern Validator") {
                    paramEle = {
                        validationType: paramElement[0],
                        minimum: paramElement[1],
                        maximum: paramElement[2]
                    };
                } else {
                    paramEle = {
                        validationType: paramElement[0],
                        pattern: paramElement[3]
                    };
                }
                return paramEle;
            }) ?? [];
            return {
                paramName: param[0],
                paramType: param[2],
                sqlType: param[3],
                defaultValue: param[4],
                type: param[5],
                ordinal: param[6],
                validators: validators,
                hasValidators: validators.length > 0
            };
        });
        const updatedQuery = sidePanelContext?.formValues?.queryObject;
        updatedQuery.queryParams = queryParameters;
        const queryType = sidePanelContext?.formValues.queryObject.expression ? "expression" : "sql";

        const resourceQuery = {
            query: sidePanelContext?.formValues?.queryObject.queryName,
            queryParams: queryParams,
            hasQueryParams: queryParams.length > 0
        };

        let xml = getDssQueryXml({ ...updatedQuery, queryType }).replace(/^\s*[\r\n]/gm, '');
        const range = sidePanelContext?.formValues?.queryObject.range;
        const edits = await rpcClient.getMiDiagramRpcClient().applyEdit({
            text: xml, documentUri: props.documentUri,
            range: { start: range.startTagRange.start, end: range.endTagRange.end },
            waitForEdits: true
        });

        if (edits.status) {
            const st = await rpcClient.getMiDiagramRpcClient().getSyntaxTree({ documentUri: props.documentUri });
            let isInResource = false;
            let resourceData: any = {};
            if (st.syntaxTree.data.resources !== undefined && st.syntaxTree.data.resources !== null && st.syntaxTree.data.resources.length > 0) {
                st.syntaxTree.data.resources.forEach((resource: any) => {
                    if (resource.callQuery.href === sidePanelContext?.formValues?.queryObject.queryName) {
                        resourceData.resourceRange = resource.callQuery.range;
                        resourceData.selfClosed = resource.callQuery.selfClosed;
                        isInResource = true;
                    }
                });
            }
            if (!isInResource) {
                if (st.syntaxTree.data.operations !== undefined && st.syntaxTree.data.operations !== null && st.syntaxTree.data.operations.length > 0) {
                    st.syntaxTree.data.operations.forEach((operation: any) => {
                        if (operation.callQuery.href === sidePanelContext?.formValues?.queryObject.queryName) {
                            resourceData.resourceRange = operation.callQuery.range;
                            resourceData.selfClosed = operation.callQuery.selfClosed;
                        }
                    });
                }
            }

            if (Object.keys(resourceData).length !== 0) {
                xml = getDssResourceQueryParamsXml(resourceQuery);
                const end = resourceData.selfClosed ? resourceData.resourceRange.startTagRange.end : resourceData.resourceRange.endTagRange.end;
                await rpcClient.getMiDiagramRpcClient().applyEdit({
                    text: xml, documentUri: props.documentUri,
                    range: { start: resourceData.resourceRange.startTagRange.start, end: end },
                    waitForEdits: true
                });
            }
        }

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
                {showError ? showQueryError ?
                    <Alert title="Error!" variant="error">
                        Please submit a query from the query section and then generate the input mappings.
                    </Alert>
                    :
                    <Alert title="Error!" variant="error">
                        Unable to generate input mappings to the given query. Please check the query and try again.
                    </Alert> :
                    <ComponentCard sx={cardStyle} disbaleHoverEffect>
                        <Typography variant="h3">Input Mappings</Typography>


                        <Controller
                            name="inputMappings"
                            control={control}
                            render={({ field: { onChange, value } }) => (
                                <ParamManager
                                    paramConfigs={value}
                                    readonly={false}
                                    onChange={(values) => {
                                        values.paramValues = values.paramValues.map((param: any) => {
                                            const property: ParamValue[] = param.paramValues;
                                            param.key = property[0].value;
                                            param.value = property[1].value;

                                            (property[7].value as ParamConfig).paramValues = (property[7].value as ParamConfig).paramValues.map((param: any) => {
                                                const property: ParamValue[] = param.paramValues;
                                                param.key = property[0].value;
                                                param.value = getValidatorValue(property);
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


                <div style={{ marginTop: "10px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                    {showError ?

                        <Button
                            appearance="secondary"
                            onClick={handleSubmit(clearErrors)}
                        >
                            Cancel
                        </Button> :
                        <>
                            <Button
                                appearance="secondary"
                                onClick={handleSubmit(generateMappings)}
                            >
                                Generate Mappings
                            </Button>
                            <Button
                                appearance="primary"
                                onClick={handleSubmit(onClick)}
                            >
                                Submit
                            </Button>
                        </>
                    }
                </div>

            </div>
        </>
    );
};

export default InputMappingsForm; 
