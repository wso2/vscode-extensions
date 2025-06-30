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
import { Button, CheckBox, CheckBoxGroup, Codicon, TextField } from '@wso2/ui-toolkit';
import styled from "@emotion/styled";
import { PathItem as P, Parameter, ReferenceObject } from '../../../Definitions/ServiceDefinitions';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { useContext } from 'react';
import { getColorByMethod } from '../../Utils/OpenAPIUtils';
import { Parameters } from '../Parameters/Parameters';
import { APIDesignerContext } from '../../../APIDesignerContext';

const PanelBody = styled.div`
    height: calc(100% - 87px);
    overflow-y: auto;
    padding: 16px;
    gap: 15px;
    display: flex;
    flex-direction: column;
`;

const ButtonWrapper = styled.div`
    display: flex;
    flex-direction: flex-grow;
    justify-content: flex-end;
`;

interface PathItemProps {
    pathItem: P;
    path: string;
    onPathItemChange: (pathItem: P, path: string) => void;
}

const httpMethods = ["get", "post", "put", "delete", "options", "head", "patch", "trace"];
const moreOptions = ["Summary", "Description"];

const getAllOperationsFromPathItem = (pathItem: P) => {
    return Object.keys(pathItem).filter(key => httpMethods.includes(key));
}

export function PathItem(props: PathItemProps) {
    const { pathItem, path, onPathItemChange } = props;
    const { rpcClient } = useVisualizerContext();
    const { 
        props: { pathInitiated },
        api: { onPathInitiatedChange }
    } = useContext(APIDesignerContext);
    let selectedOptions: string[] = [];
    if (pathItem && pathItem.summary === "" || pathItem.summary) {
        selectedOptions.push("Summary");
    }
    if (pathItem && pathItem.description === "" || pathItem.description) {
        selectedOptions.push("Description");
    }

    const handlePathItemChange = (pathItem: P, path: string) => {
        onPathItemChange(pathItem, path);
    };
    const handlePathFieldChange = (e: any) => {
        const matches = e.target.value.match(/{(.*?)}/g); // Match all segments within curly braces
        const pathSegments = matches ? matches.map((match: string) => match.replace(/[{}]/g, '')) : [];
        // Update the path item with the new path parameters if it is not included
        let updatedPathItem = { ...pathItem };
        updatedPathItem.parameters = pathSegments.map((segment: string) => {
            return {
                name: segment,
                in: "path",
                required: true,
                description: "",
                schema: {
                    type: "string",
                },
            };
        });
        onPathInitiatedChange(false);
        handlePathItemChange({ ...updatedPathItem }, e.target.value ? e.target.value : '/');
    };
    const handlePathParametersChange = (parameters: (Parameter | ReferenceObject)[]) => {
        // Construct the new path item with the updated path parameters
        const newPathParamString = parameters
            .filter((param) => param.in === 'path')
            .map((param) => `{${param.name}}`)
            .join('/');
        const pathWithoutParams = path.replace(/{(.*?)}/g, '').replace(/\/+$/, ''); // Remove existing path parameters and trailing slashes
        const newPath = `${pathWithoutParams}/${newPathParamString}`;
        handlePathItemChange({ ...pathItem, parameters }, newPath);
    };

    const handleOptionChange = (options: string[]) => {
        // Update the path item with the selected options
        let updatedPathItem = { ...pathItem };
        if (options.includes("Summary")) {
            updatedPathItem.summary = "";
        } else {
            delete updatedPathItem.summary;
        }
        if (options.includes("Description")) {
            updatedPathItem.description = "";
        } else {
            delete updatedPathItem.description;
        }
        handlePathItemChange(updatedPathItem, path);
    }
    const onConfigureClick = () => {
        rpcClient.selectQuickPickItems({
            title: "Select sections",
            items: moreOptions.map(item => ({ label: item, picked: selectedOptions.includes(item) }))
        }).then(resp => {
            if (resp) {
                handleOptionChange(resp.map(item => item.label))
            }
        })
    };
    const handleDescriptionChange = (e: any) => {
        handlePathItemChange({ ...pathItem, description: e.target.value }, path);
    };
    const handleOperationChange = (isChecked: boolean, method: string) => {
        let updatedPathItem = { ...pathItem };
        if (isChecked) {
            updatedPathItem[method] = {
                parameters: [],
                responses: {
                    200: {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "string",
                                },
                            },
                        },
                    },
                },
            };
            // If the method is post, put or patch, add a request body
            if (method === 'post' || method === 'put' || method === 'patch') {
                updatedPathItem[method].requestBody = {
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                            },
                        },
                    },
                };
            }
        } else {
            delete updatedPathItem[method];
        }
        handlePathItemChange(updatedPathItem, path);
    };
    
    const operations = getAllOperationsFromPathItem(pathItem);

    return (
        <PanelBody>
            <ButtonWrapper>
                <Button tooltip='Select sections' onClick={onConfigureClick} appearance='icon'>
                    <Codicon name='gear' sx={{ marginRight: "4px" }} />
                    Configure
                </Button>
            </ButtonWrapper>
            <TextField
                label="Path"
                id="path"
                sx={{ width: "100%" }}
                value={path}
                autoFocus
                forceAutoFocus={pathInitiated}
                onBlur={handlePathFieldChange}
            />
            {selectedOptions.includes("Summary") && (
                <TextField
                    label="Summary"
                    id="summary"
                    sx={{ width: "100%" }}
                    value={pathItem.summary}
                    onBlur={(e) => handlePathItemChange({ ...pathItem, summary: e.target.value }, path)}
                />
            )}
            {selectedOptions.includes("Description") && (
                <TextField
                    label="Description"
                    id="description"
                    sx={{ width: "100%" }}
                    value={pathItem?.description || ""}
                    onBlur={handleDescriptionChange}
                />
            )}
            <label>Operations</label>
            <CheckBoxGroup
                    direction="vertical"
                    columns={2}
                >
                    {httpMethods && httpMethods.map((method: string) => (
                        <CheckBox
                            label={method?.toLocaleUpperCase()}
                            value={method} checked={operations.includes(method)}
                            onChange={(isChecked: boolean) => handleOperationChange(isChecked, method)}
                            sx={{ "--foreground": getColorByMethod(method) }}
                        />
                    ))}
            </CheckBoxGroup>
            <Parameters
                title='Path Parameters'
                type='path'
                parameters={pathItem.parameters}
                onParametersChange={(parameters) => handlePathParametersChange(parameters)}
            />
            <Parameters
                title='Query Parameters'
                type='query'
                parameters={pathItem.parameters}
                onParametersChange={(parameters) => handlePathItemChange({ ...pathItem, parameters }, path)}
            />
            <Parameters
                title='Header Parameters'
                type='header'
                parameters={pathItem.parameters}
                onParametersChange={(parameters) => handlePathItemChange({ ...pathItem, parameters }, path)}
            />
        </PanelBody>
    )
}
