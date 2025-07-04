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
import { Button, Codicon, Typography } from '@wso2/ui-toolkit';
import styled from "@emotion/styled";
import { Parameter as P, ReferenceObject as R } from '../../../Definitions/ServiceDefinitions';
import { BaseTypes } from '../../../constants';
import SectionHeader from '../SectionHeader/SectionHeader';
import { Parameter } from '../Parameter/Parameter';
import { ReferenceObject } from '../ReferenceObject/ReferenceObject';
import { getUpdatedObjects } from '../Utils/OpenAPIUtils';
import { useContext } from 'react';
import { APIDesignerContext } from '../../../APIDesignerContext';
import { RefComponent } from '../RefComponent/RefComponent';
import { VSCodeDataGridCell, VSCodeDataGridRow } from '@vscode/webview-ui-toolkit/react';

export const PanelBody = styled.div`
    padding: 16px;
    gap: 15px;
    display: flex;
    flex-direction: column;
`;

export const ParameterGridCell = styled(VSCodeDataGridCell)`
    padding-left: 0px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    &:is(:active, :focus, :focus-visible) {
        background-color: var(--vscode-background);
        color: var(--vscode-foreground);
        border-color: transparent;
    }
`;

export const ParamGridRow = styled(VSCodeDataGridRow)`
    &:hover {
        background-color: var(--vscode-background);
        color: var(--vscode-foreground);
    }
`;

interface ParameterProps {
    parameters: (P | R)[];
    paramTypes?: string[];
    currentReferences?: R[];
    title?: string;
    type: "query" | "header" | "path" | "cookie";
    onParametersChange: (parameter: (P | R)[]) => void;
}

enum ParameterTypes {
    DEFAULT_PARAM = "Default Parameter",
    REFERENCE_OBJECT = "Reference Object"
}

function isReferenceObject(obj: (P | R)): obj is R {
    return obj && typeof obj === 'object' && '$ref' in obj;
}

export function Parameters(props: ParameterProps) {
    const { parameters, paramTypes = BaseTypes, title, type, currentReferences, onParametersChange } = props;
    const {
        props: { openAPI },
    } = useContext(APIDesignerContext);

    const componentParameterNames = openAPI?.components?.parameters ? Object.keys(openAPI?.components?.parameters) : [];
    const componentQueryParamNames = componentParameterNames.filter((name) => openAPI?.components?.parameters[name].in === "query");
    const componentHeaderParamNames = componentParameterNames.filter((name) => openAPI?.components?.parameters[name].in === "header");
    const componentPathParamNames = componentParameterNames.filter((name) => openAPI?.components?.parameters[name].in === "path");

    const handleParameterChange = (parameters: (P | R)[]) => {
        onParametersChange(parameters);
    };

    const addNewReferenceObject = () => {
        const newParam: R = {
            $ref: `#/components/parameters/${type === "query" ? componentQueryParamNames[0] : type === "header" ? componentHeaderParamNames[0] : type === "path" ? componentPathParamNames[0] : ""}`,
            summary: "",
            description: ""
        };
        const newParameters = getUpdatedObjects<P | R>(parameters, newParam);
        handleParameterChange([...newParameters]);
    };

    const addReferenceParamButton = () => {
        return (
            <RefComponent
                onChange={addNewReferenceObject}
                dropdownWidth={157}
                componnetHeight={32}
            />
        );
    };

    const addNewParam = () => {
        const newParam: P = {
            name: parameters?.length > 0 ? `param${parameters.length}` : "param1",
            in: type,
            required: true,
            description: "",
            schema: {
                type: "string"
            }
        };
        const newParameters = getUpdatedObjects<P | R>(parameters, newParam);
        handleParameterChange([...newParameters]);
    };
    const getAddParamButton = () => (
        <Button appearance="icon" onClick={() => addNewParam()}>
            <Codicon sx={{ marginRight: 5 }} name="add" />
            Add
        </Button>
    );

    const actionButtons = [
        getAddParamButton()
    ];
    if (type === "query" && componentQueryParamNames.length > 0 || (type === "header" && componentHeaderParamNames.length > 0) || (type === "path" && componentPathParamNames.length > 0)) {
        actionButtons.push(addReferenceParamButton());
    }

    const paramsToGivenType = parameters?.filter((param) => {
        if (isReferenceObject(param)) {
            const paramName = param.$ref.replace("#/components/parameters/", "");
            const parameterType = openAPI?.components?.parameters[paramName].in;
            return parameterType === type;
        } else {
            return param.in === type;
        }
    });

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <SectionHeader title={title} actionButtons={actionButtons} />
            {paramsToGivenType?.length > 0 ? (
                <>
                    {parameters?.map((parameter, index) => {
                        if (type === parameter.in || isReferenceObject(parameter)) {
                            if (isReferenceObject(parameter) && (type === "query" ? componentQueryParamNames.includes(parameter.$ref.replace("#/components/parameters/", "")) : type === "header" ? componentHeaderParamNames.includes(parameter.$ref.replace("#/components/parameters/", "")) : type === "path" ? componentPathParamNames.includes(parameter.$ref.replace("#/components/parameters/", "")) : false)) {
                                return (
                                    <ReferenceObject
                                        key={index}
                                        id={index}
                                        type={type}
                                        referenceObject={parameter}
                                        onRemoveReferenceObject={(id) => {
                                            const parametersCopy = [...parameters];
                                            parametersCopy.splice(id, 1);
                                            handleParameterChange(parametersCopy as P[]);
                                        }}
                                        onRefernceObjectChange={(parameter) => {
                                            const parametersCopy = [...parameters];
                                            parametersCopy[index] = parameter;
                                            handleParameterChange(parametersCopy as P[]);
                                        }}
                                    />
                                );
                            } else if (!isReferenceObject(parameter)) {
                                return (
                                    <Parameter
                                        key={index}
                                        id={index}
                                        parameter={parameter as P}
                                        paramTypes={paramTypes}
                                        onRemoveParameter={(id) => {
                                            const parametersCopy = [...parameters];
                                            parametersCopy.splice(id, 1);
                                            handleParameterChange(parametersCopy as P[]);
                                        }}
                                        onParameterChange={(parameter) => {
                                            const parametersCopy = [...parameters];
                                            parametersCopy[index] = parameter;
                                            handleParameterChange(parametersCopy as P[]);
                                        }}
                                    />
                                );
                            }
                        }
                    })}
                </>
            ) : (
                <Typography sx={{ margin: 0, fontWeight: "lighter" }} variant='body3'>No {title}.</Typography>
            )}
        </div>
    )
}
