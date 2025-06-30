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


import { Button, FormActions, FormGroup } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { useForm } from 'react-hook-form';
import { EVENT_TYPE, MACHINE_VIEW } from '@wso2/mi-core';
import { TypeChip } from '../Commons';
import { useEffect, useState } from 'react';
import { ParamConfig, ParamManager, FormGenerator } from '@wso2/mi-diagram';

const ParamManagerContainer = styled.div`
    width: ; 100%;
`;

export interface AddInboundConnectorProps {
    changeConnector?: () => void;
    formData: any;
    model: any;
    path: string;
    setType: (type: string) => void;
    handleCreateInboundEP: (values: any) => void;
}

type InboundEndpoint = {
    parameters: {};
    attributes: {};
};

export function AddInboundConnector(props: AddInboundConnectorProps) {
    const { rpcClient } = useVisualizerContext();
    const { formData, handleCreateInboundEP, model } = props;
    const { control, handleSubmit, register, formState: { errors }, setValue, reset, watch, getValues } = useForm<any>();
    const [sequences, setSequences] = useState<string[]>([]);

    const paramConfigs: ParamConfig = {
        paramValues: [],
        paramFields: [
            {
                id: 0,
                type: "TextField",
                label: "Key",
                defaultValue: "",
                isRequired: true
            },
            {
                id: 1,
                type: "TextField",
                label: "Value",
                defaultValue: "",
                isRequired: true
            }]
    };

    const [params, setParams] = useState(paramConfigs);

    const fetchSequences = async () => {
        try {
            const sequenceList = await rpcClient.getMiDiagramRpcClient().getEndpointsAndSequences();
            const sequenceNames: string[] = sequenceList.data[1]?.length > 0
                ? sequenceList.data[1].map((seq: string) => seq.replace(".xml", ""))
                : [];

            setSequences(sequenceNames);
        } catch (error) {
            console.error('Error fetching sequences:', error);
        }
    };

    function generateSequenceName(inboundEPName: string, sequenceType: string) {
        let baseName = `${inboundEPName}-inbound${sequenceType}`;
        let uniqueName = baseName;
        let counter = 1;

        while (sequences.includes(uniqueName)) {
            uniqueName = baseName + counter;
            counter++;
        }

        return uniqueName;
    }

    useEffect(() => {
        setParams(paramConfigs);
        fetchSequences();

        if (model) {
            const attributeNames = getGenericAttributeNames(formData);
            const parameterNames = getParameterNames(formData);

            // Populate Attributes
            attributeNames.forEach((attributeName: string) => {
                if (model.hasOwnProperty(attributeName)) {
                    setValue(getNameForController(attributeName), model[attributeName]);
                }
            });

            let additionalParams: any[] = [];
            // Populate Paramters
            model.parameters[0]?.parameter?.forEach((param: any) => {
                if (parameterNames.includes(param.name)) {
                    setValue(getNameForController(param.name), param.content);
                } else {
                    additionalParams.push({
                        name: param.name,
                        value: param.content
                    });
                }
            });

            // Populate additional parameters to param manager
            if (additionalParams) {
                const modifiedParams = {
                    ...params, paramValues: generateParams(additionalParams)
                };
                setParams(modifiedParams);
            }
        }
    }, [model, formData]);

    function getNameForController(name: string | number) {
        return String(name).replace(/\./g, '__dot__');
    }

    function getOriginalName(name: string) {
        return name.replace(new RegExp("__dot__", 'g'), '.');
    }

    function getGenericAttributeNames(jsonData: any) {
        const genericGroup = jsonData.elements.find((element: any) =>
            element.type === "attributeGroup" && element.value.groupName === "Generic"
        );
        if (genericGroup) {
            return genericGroup.value.elements
                .filter((element: any) => element.type === "attribute" && element.value.name !== "generateSequences")
                .map((attribute: any) => attribute.value.name);
        }
        return [];
    }

    function getParameterNames(jsonData: any): string[] {
        const parameterNames: string[] = [];

        jsonData.elements.forEach((element: any) => {
            if (element.type === 'attributeGroup') {
                element?.value?.elements.forEach((element: any) => {
                    if (element.type === 'attribute') {
                        parameterNames.push(element.value.name);
                    }
                });
            }
        });

        return parameterNames;
    }

    function extractProperties(values: any, attributeNames: string[]) {
        const attrFields: any = {};
        const paramFields = { ...values };
        attributeNames.forEach(name => {
            if (paramFields.hasOwnProperty(name)) {
                if (name === "statistics" || name === "trace") {
                    // Pass statistics and trace as enable when true
                    if (paramFields[name] === true) {
                        attrFields[name] = "enable";
                    }
                } else {
                    attrFields[name] = paramFields[name];
                }
                delete paramFields[name];
            }
        });

        Object.keys(values).forEach((key: string) => {
            // Handle param manager input type
            if (Array.isArray(values[key])) {
                const value = values[key];
                let paramText = `[`;

                value.forEach((item: any) => {
                    const propertyName = item.propertyName;
                    const propertyValue = item.propertyValue?.value ?? item.propertyValue;
                    const text = `["${propertyName}","${propertyValue}"],`;
                    paramText = paramText + text;
                });
                paramText = paramText + `]`;
                paramFields[key] = paramText;
            }
        })
        return { attrFields, paramFields };
    }

    const handleOnChange = (params: any) => {
        const modifiedParams = {
            ...params, paramValues: params.paramValues.map((param: any) => {
                return {
                    ...param,
                    key: param.paramValues[0].value,
                    value: param.paramValues[1].value,
                    icon: "query"
                }
            })
        };
        setParams(modifiedParams);
    };

    function generateParams(parameters: any[]) {
        return parameters.map((param: any, id) => {
            return {
                id: id,
                key: param.name,
                value: param.value,
                icon: "query",
                paramValues: [
                    {
                        value: param.name,
                    },
                    {
                        value: param.value,
                    },
                ]
            }
        });
    }

    const handleCreateInboundConnector = async (values: any) => {
        const attributeNames = getGenericAttributeNames(formData);

        if (values.generateSequences) {
            if (props.model) {
                values.sequence = props.model.sequence;
                values.onError = props.model.onError;
            }
        } else {
            values.sequence = values.sequence.value;
            values.onError = values.onError.value;
        }

        const { attrFields, paramFields } = extractProperties(values, attributeNames);

        const finalParameters: any = {};

        // Add key-value pairs from param manager
        params.paramValues.forEach(param => {
            finalParameters[param.key] = param.value;
        });

        // Transform the keys of the rest object
        const transformedParameters = Object.fromEntries(
            Object.entries(paramFields).map(([key, value]) => [getOriginalName(key), value])
                .filter(([_, value]) => (value !== null && value !== undefined && value !== '') && typeof value !== 'object')
        );

        // Merge transformedParameters into finalParameters
        Object.assign(finalParameters, transformedParameters);

        // Generate unique sequence and onError names if not provided
        if (!values.sequence) {
            const sequenceName = generateSequenceName(values.name, "Sequence");
            attrFields['sequence'] = sequenceName;
        }

        if (!values.onError) {
            const onErrorName = generateSequenceName(values.name, "ErrorSequence");
            attrFields['onError'] = onErrorName;
        }

        const inboundConnector: InboundEndpoint = {
            attributes: attrFields,
            parameters: transformedParameters
        };

        handleCreateInboundEP(inboundConnector);
    };

    const openOverview = () => {
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });
    };

    const openInboundEPView = (documentUri: string) => {
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.InboundEPView, documentUri: documentUri } });
    };

    const handleOnClose = () => {
        const isNewTask = !props.model;
        if (isNewTask) {
            openOverview();
        } else {
            openInboundEPView(props.path);
        }
    }

    return (
        <>
            <TypeChip type={formData.title} onClick={() => props.setType("")} showButton={!props.model} />
            <FormGenerator
                formData={formData}
                sequences={sequences}
                onEdit={!!props.model}
                control={control}
                errors={errors}
                setValue={setValue}
                reset={reset}
                watch={watch}
                getValues={getValues} />
            {formData && formData.additionalParameters && (
                <FormGroup
                    key={"additionalParameters"}
                    title={`Additional Parameters`}
                    isCollapsed={true}
                >
                    <ParamManagerContainer>
                        <ParamManager
                            paramConfigs={params}
                            readonly={false}
                            onChange={handleOnChange} />
                    </ParamManagerContainer>
                </FormGroup>
            )}
            <FormActions>
                <Button
                    appearance="secondary"
                    onClick={handleOnClose}
                >
                    Cancel
                </Button>
                <Button
                    appearance="primary"
                    onClick={handleSubmit(handleCreateInboundConnector)}
                >
                    {props.model ? "Update" : "Create"}
                </Button>
            </FormActions>
        </>
    );
};

export default AddInboundConnector;
