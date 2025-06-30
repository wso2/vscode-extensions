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
import { Button, Codicon, Dropdown, TextField, Typography } from '@wso2/ui-toolkit';
import styled from "@emotion/styled";
import { ReferenceObject as R } from '../../../Definitions/ServiceDefinitions';
import { useContext } from 'react';
import { APIDesignerContext } from '../../../APIDesignerContext';

const HorizontalFieldWrapper = styled.div`
    display: flex;
    flex-direction: row;
    gap: 10px;
`;

interface ReferenceObjectsProps {
    id: number;
    referenceObject: R;
    type?: string;
    onRemoveReferenceObject?: (id: number) => void;
    onRefernceObjectChange: (parameter: R) => void;
}
const ButtonWrapperParams = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    min-width: 40px;
    flex-grow: 1;
    gap: 5px;
    justify-content: flex-end;
`;

const LabelContainer = styled.div`
    display: flex;
    align-items: center;
    width: 25%;
`;

export function ReferenceObject(props: ReferenceObjectsProps) {
    const { id, referenceObject, type, onRemoveReferenceObject, onRefernceObjectChange } = props;
    const { 
        props: { openAPI },
    } = useContext(APIDesignerContext);

    const existingComponents: string[] = [];
    if (type === "query" && openAPI?.components?.parameters) {
        Object.keys(openAPI.components.parameters).forEach((key) => {
            if (openAPI.components.parameters[key].in === "query") {
                existingComponents.push(key as string);
            }
        });
    } else if (type === "header" && openAPI?.components?.parameters) {
        Object.keys(openAPI.components.parameters).forEach((key) => {
            if (openAPI.components.parameters[key].in === "header") {
                existingComponents.push(key as string);
            }
        });
    } else if (type === "path" && openAPI?.components?.parameters) {
        Object.keys(openAPI.components.parameters).forEach((key) => {
            if (openAPI.components.parameters[key].in === "path") {
                existingComponents.push(key as string);
            }
        });
    } else if (type === "response" && openAPI?.components.responses) {
        Object.keys(openAPI.components.responses).forEach((key) => {
            existingComponents.push(key as string);
        });
    } else if (type === "requestBody" && openAPI?.components.requestBodies) {
        Object.keys(openAPI.components.requestBodies).forEach((key) => {
            existingComponents.push(key as string);
        });
    }

    const handleParameterChange = (parameter: R) => {
        onRefernceObjectChange(parameter);
    };

    const referenceObjectsList = existingComponents ? existingComponents?.map((item) => ({ 
        value: type === "response" 
            ? `#/components/responses/${item}` 
            : type === "requestBody"
                ? `#/components/requestBodies/${item}`
                : `#/components/parameters/${item}`,
        content: item
    })) : [];

    return (
        <HorizontalFieldWrapper>
            <LabelContainer>
                <Typography variant="caption">Reference</Typography>
            </LabelContainer>
            <Dropdown
                id={`paramType-${referenceObject.$ref}`}
                value={referenceObject.$ref}
                containerSx={{ width: "30%" }}
                items={referenceObjectsList}
                onValueChange={(value) => handleParameterChange({ ...referenceObject, $ref: value })}
            />
            <TextField
                id={`paramName-${referenceObject.description}`}
                placeholder="Description"
                value={referenceObject.description}
                sx={{ width: "45%" }}
                onBlur={(evt) => handleParameterChange({ ...referenceObject, description: evt.target.value })}
            />
                <ButtonWrapperParams>
                    <Button appearance='icon' onClick={() => onRemoveReferenceObject(id)}>
                        <Codicon name="trash" />
                    </Button>
                </ButtonWrapperParams>
            </HorizontalFieldWrapper>
    )
}
