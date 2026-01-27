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
import { Button, Codicon, Dropdown, TextField, Tooltip } from '@wso2/ui-toolkit';
import styled from "@emotion/styled";
import { HeaderDefinition } from '../../../Definitions/ServiceDefinitions';
import { BaseTypes, ParameterSchemaTypes } from '../../../constants';

const HorizontalFieldWrapper = styled.div`
    display: flex;
    flex-direction: row;
    gap: 10px;
`;

interface HeaderProps {
    id: number;
    name: string;
    header: HeaderDefinition;
    headerTypes?: string[];
    onRemoveHeader: (id: number) => void;
    onHeaderChange: (header: HeaderDefinition, name: string) => void;
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
    line-height: 24px; // Reduced line height to lower the asterisk
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

export function Header(props: HeaderProps) {
    const { id, header, name, headerTypes = BaseTypes, onRemoveHeader: onRemoveParameter, onHeaderChange: onHeaderChange } = props;

    const paramTypeOptions = headerTypes.map((type) => ({ id: type, content: type, value: type }));
    const handleHeaderChange = (header: HeaderDefinition, name: string) => {
        const newHeader: HeaderDefinition = {
            schema: {
                type: header.schema.type,
            },
            description: header.description,
            required: header.required,
        };
        onHeaderChange(newHeader, name);
    };

    return (
        <HorizontalFieldWrapper>
            <TextField
                id={`headerName-${name}`}
                placeholder="Name"
                value={name}
                sx={{ width: "25%" }}
                onBlur={(evt) => handleHeaderChange({ ...header }, evt.target.value)}
            />
            <Dropdown
                id={`header-${header.schema.type}`}
                value={header.schema.type}
                containerSx={{ width: "30%" }}
                items={paramTypeOptions}
                onValueChange={(value) => handleHeaderChange({ ...header, schema: { type: value as ParameterSchemaTypes } }, name)}
            />
            <TextField
                placeholder="Description"
                value={header.description}
                sx={{ width: "45%" }}
                onBlur={(evt) => handleHeaderChange({ ...header, description: evt.target.value }, name)}
            />
                <ButtonWrapperParams>
                    <Tooltip content="Make this heaader optional/required">
                        <RequiredElementWrapper onClick={() => handleHeaderChange({ ...header, required: !header.required }, name)}>
                            <RequiredElement
                                color={header.required ? "var(--vscode-errorForeground)" : "var(--vscode-editor-foreground)"}
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
    )
}
