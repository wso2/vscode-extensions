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
import React from 'react';
import styled from '@emotion/styled';
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react';
import { RequiredFormInput } from '../Commons/RequiredInput';
import { FieldValues, useController, UseControllerProps } from 'react-hook-form';

type FileSelectorBaseProps = {
    id?: string;
    name?: string;
	label: string;
	selectionText?: string;
    btnText?: string;
	required?: boolean;
	sx?: any;
    onSelect: () => void;
}

export type FileSelectorProps = FileSelectorBaseProps & {
    selectedFile?: string;
}

export type FormFileSelectorProps<T extends FieldValues> = FileSelectorBaseProps & UseControllerProps<T>;

const BrowseBtn = styled(VSCodeButton)`
    width: fit-content;
`;

interface ContainerProps {
	sx?: any;
}

const Container = styled.div<ContainerProps>`
	display: flex;
    flex-direction: column;
	${(props: ContainerProps) => props.sx};
`;

const LabelContainer = styled.div<ContainerProps>`
    display: flex;
    flex-direction: row;
    margin-bottom: 4px;
`;

const PathText = styled.div`
    font-family: var(--vscode-editor-font-family);
    padding: 4px 0;
    opacity: 0.8;
`;

export const LocationSelector: React.FC<FileSelectorProps> = (props: FileSelectorProps) => {
    const { id, label, required, selectionText, sx, btnText, onSelect, selectedFile } = props;

    return (
        <Container id={id} sx={sx}>
            <LabelContainer>
                <div style={{color: "var(--vscode-editor-foreground)"}}> 
                    <label htmlFor={`${id}-label`}>{label}</label> 
                </div>
                {(required && label) && (<RequiredFormInput />)}
            </LabelContainer>
            <PathText>
                {selectedFile ? <span>{selectedFile}</span> : <div style={{color: "var(--vscode-editor-foreground)"}}>{selectionText}</div>}
            </PathText>
            <BrowseBtn appearance="secondary" id="file-selector-btn" onClick={onSelect}>
                {btnText || "Select Location"}
            </BrowseBtn>
        </Container>
    );
};

export const FormLocationSelector = <T extends FieldValues>(props: FormFileSelectorProps<T>) => {
    const { id, name, control, label, selectionText, btnText, required, onSelect, sx } = props;
    const {
        field: { value, ...rest },
    } = useController<T>({ name, control });

    return (
        <LocationSelector
            id={id}
            name={name}
            label={label}
            selectedFile={value}
            onSelect={onSelect}
            selectionText={selectionText}
            btnText={btnText}
            required={required}
            sx={sx}
            {...rest}
        />
    );
};

