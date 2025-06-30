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
import { Button, Codicon, TextField, Typography } from '@wso2/ui-toolkit';
import styled from "@emotion/styled";
import { Operation as O } from '../../../Definitions/ServiceDefinitions';
import ResourceHeader from '../ResourceHeader/ResourceHeader';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { useEffect, useState } from 'react';
import { CodeTextArea } from '../../CodeTextArea/CodeTextArea';
import { Parameters } from '../Parameters/Parameters';
import { RequestBody } from '../RequestBody/RequestBody';
import { Responses } from '../Responses/Responses';

export const PanelBody = styled.div`
    height: calc(100% - 87px);
    overflow-y: auto;
    padding: 16px;
    gap: 15px;
    display: flex;
    flex-direction: column;
`;
export const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

export const SubSectionWrapper = styled.div`
    display: flex;
    flex-direction: column;
    padding-top: 5px;
    gap: 5px;
`;

const HorizontalFieldWrapper = styled.div`
    display: flex;
    flex-direction: row;
    gap: 10px;
`;

interface OperationProps {
    operation: O;
    method: string;
    path: string;
    onOperationChange: (operation: O) => void;
}

const moreOptions = ["Summary", "Description", "OperationId"];
export function Operation(props: OperationProps) {
    const { operation, method, path, onOperationChange } = props;
    const { rpcClient } = useVisualizerContext();
    let selOpt: string[] = [];
    if (operation.summary || operation.summary === "") {
        selOpt.push("Summary");
    }
    if (operation.description || operation.description === "") {
        selOpt.push("Description");
    }
    if (operation.operationId || operation.operationId === "") {
        selOpt.push("OperationId");
    }
    const [defaultOptions, setDefaultOptions] = useState<string[]>(selOpt);
    const [description, setDescription] = useState<string | undefined>(operation?.description);

    const handleOperationChange = (operation: O) => {
        onOperationChange(operation);
    };

    const handleOptionChange = (options: string[]) => {
        let op = operation;
        if (!options.includes("Summary") && defaultOptions.includes("Summary")) {
            op = { ...operation, summary: "" };
        } else if (!options.includes("Summary") && !defaultOptions.includes("Summary")) {
            delete operation.summary;
        }
        if (!options.includes("Description") && defaultOptions.includes("Description")) {
            op = { ...operation, description: "" };
        } else if (!options.includes("Description") && !defaultOptions.includes("Description")) {
            delete operation.description;
        }
        if (!options.includes("OperationId") && defaultOptions.includes("OperationId")) {
            op = { ...operation, operationId: "" };
        } else if (!options.includes("OperationId") && !defaultOptions.includes("OperationId")) {
            delete operation.operationId;
        }
        setDefaultOptions(options);
        handleOperationChange(op);
    };

    const onConfigureClick = () => {
        rpcClient.selectQuickPickItems({
            title: "Select sections",
            items: moreOptions.map(item => ({ label: item, picked: defaultOptions.includes(item) }))
        }).then(resp => {
            if (resp) {
                handleOptionChange(resp.map(item => item.label))
            }
        })
    };
    
    const handleDescriptionChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
        setDescription(evt.target.value);
        handleOperationChange({ ...operation, description: evt.target.value });
    };

    useEffect(() => {
        setDescription(operation?.description);
    }, [operation?.description]);

    return (
        <PanelBody>
            <ResourceHeader
                method={method}
                path={path}
                actionButtons={
                    <Button tooltip='Select sections' onClick={onConfigureClick} appearance='icon'>
                        <Codicon name='gear' sx={{ marginRight: "4px" }} /> Configure
                    </Button>
                }
            />
            { defaultOptions.includes("Summary") && (
                <TextField
                    id="summary"
                    label="Summary"
                    value={operation.summary}
                    onBlur={(evt) => handleOperationChange({ ...operation, summary: evt.target.value })}
                />
            )}
            { defaultOptions.includes("Description") && (
                <CodeTextArea
                    id="description"
                    label='Decription'
                    value={description}
                    onChange={handleDescriptionChange}
                    resize="vertical"
                    growRange={{ start: 5, offset: 10 }}
                />
            )}
            { defaultOptions.includes("OperationId") && (
                <TextField
                    id="operationId"
                    label="OperationId"
                    value={operation.operationId}
                    onBlur={(evt) => handleOperationChange({ ...operation, operationId: evt.target.value })}
                />
            )}
            <SubSectionWrapper>
                <Parameters
                    title="Path Parameters"
                    type="path"
                    parameters={operation?.parameters}
                    onParametersChange={(parameters) => handleOperationChange({ ...operation, parameters })}
                />
            </SubSectionWrapper>
            <SubSectionWrapper>
                <Parameters
                    title="Query Parameters"
                    type="query"
                    parameters={operation?.parameters}
                    onParametersChange={(parameters) => handleOperationChange({ ...operation, parameters })}
                />
            </SubSectionWrapper>
            <SubSectionWrapper>
                <Parameters
                    title="Header Parameters"
                    type="header"
                    parameters={operation?.parameters}
                    onParametersChange={(parameters) => handleOperationChange({ ...operation, parameters })}
                />
            </SubSectionWrapper>
            {method !== "get" &&
                <RequestBody
                    requestBody={operation.requestBody}
                    onRequestBodyChange={(requestBody) => handleOperationChange({ ...operation, requestBody })}
                />
            }
            <Responses
                responses={operation.responses}
                onResponsesChange={(responses) => handleOperationChange({ ...operation, responses })}
            />
        </PanelBody>
    )
}
