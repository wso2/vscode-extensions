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
import { Button, Codicon, Dropdown, TextField, Tooltip, OptionProps } from '@wso2/ui-toolkit';
import styled from "@emotion/styled";
import { Parameter as P, OpenAPI } from '../../../../Definitions/ServiceDefinitions';
import { BaseTypes, ParameterSchemaTypes } from '../../../../constants';
import { useMemo } from 'react';

import { postMessage as postVSCodeMessage } from '../../../../utils/vscode-api';

const ParameterCard = styled.div`
    padding: 12px;
    border: 1px solid var(--vscode-panel-border);
    border-left: 3px solid var(--vscode-textLink-foreground);
    border-radius: 4px;
    background: var(--vscode-editor-background);
`;

const HorizontalFieldWrapper = styled.div`
    display: flex;
    flex-direction: row;
    gap: 10px;
`;

interface ParameterProps {
    id: number;
    parameter: P;
    paramTypes?: string[];
    showExample?: boolean;
    openAPI?: OpenAPI;
    parameterLocation?: "query" | "header" | "path" | "cookie";
    onRemoveParameter: (id: number) => void;
    onParameterChange: (parameter: P) => void;
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

interface RequiredFormInputProps {
    color?: string;
}
const RequiredElement = styled.div<RequiredFormInputProps>`
    font-size: 28px;
    color: ${(props: RequiredFormInputProps) => props.color || "var(--vscode-editor-foreground)"};
    font-weight: bold;
    line-height: 24px;
    cursor: pointer;
`;
const RequiredElementWrapper = styled.div`
    height: 15px;
    padding: 2px;
    border-radius: 4px;
    &:hover {
        background-color: var(--button-icon-hover-background)
    }
`;

export function Parameter(props: ParameterProps) {
    const { id, parameter, paramTypes = BaseTypes, showExample = true, openAPI, parameterLocation, onRemoveParameter, onParameterChange } = props;

    const paramTypeOptions = useMemo((): OptionProps[] => {
        const baseTypeOptions = paramTypes.map((type) => ({ id: type, content: type, value: type }));
        
        // Add schema references from components
        const componentSchemas = openAPI?.components?.schemas || {};
        const schemaOptions = Object.keys(componentSchemas).map(schemaName => ({
            id: `schema-${schemaName}`,
            content: `${schemaName} (schema)`,
            value: `#/components/schemas/${schemaName}`
        }));

        return [...baseTypeOptions, ...schemaOptions];
    }, [paramTypes, openAPI]);
    
    const handleParameterChange = (parameter: P) => {
        onParameterChange(parameter);
    };

    return (
        <ParameterCard>
            <HorizontalFieldWrapper>
                <TextField
                    id={`paramName-${parameter.name}`}
                    placeholder="Name"
                    value={parameter.name}
                    sx={{ width: "15%" }}
                    onBlur={(evt) => handleParameterChange({ ...parameter, name: evt.target.value })}
                />
                <Dropdown
                    id={`paramType-${parameter.name}`}
                    value={parameter.schema?.$ref || parameter.schema?.type}
                    containerSx={{ width: "15%" }}
                    items={paramTypeOptions}
                    onValueChange={(value) => {
                        if (value.startsWith('#/components/schemas/')) {
                            // Schema reference
                            handleParameterChange({ ...parameter, schema: { $ref: value } });
                        } else {
                            // Base type - remove $ref if it exists
                            const newSchema: any = { type: value as ParameterSchemaTypes };
                            if (parameter.schema?.example) newSchema.example = parameter.schema.example;
                            handleParameterChange({ ...parameter, schema: newSchema });
                        }
                    }}
                    dropdownContainerSx={{ zIndex: 1000 }}
                />
                <TextField
                    placeholder="Description"
                    value={parameter.description}
                    sx={{ width: "30%" }}
                    onBlur={(evt) => handleParameterChange({ ...parameter, description: evt.target.value })}
                />
                {showExample && (
                    <TextField
                        id={`paramExample-${parameter.name}`}
                        placeholder="Example"
                        value={parameter.schema?.example || ''}
                        sx={{ width: "30%" }}
                        onBlur={(evt) => handleParameterChange({ 
                            ...parameter, 
                            schema: { 
                                ...parameter.schema, 
                                example: evt.target.value || undefined 
                            } 
                        })}
                    />
                )}
                <ButtonWrapperParams>
                    <Tooltip content="Make this parameter optional/required">
                        <RequiredElementWrapper onClick={() => handleParameterChange({ ...parameter, required: !parameter.required })}>
                            <RequiredElement
                                color={parameter.required ? "var(--vscode-errorForeground)" : "var(--vscode-editor-foreground)"}
                            >
                                *
                            </RequiredElement>
                        </RequiredElementWrapper>
                    </Tooltip>
                    <Button appearance='icon' onClick={() => onRemoveParameter(id)}>
                        <Codicon name="trash" />
                    </Button>
                </ButtonWrapperParams>
            </HorizontalFieldWrapper>
        </ParameterCard>
    )
}
