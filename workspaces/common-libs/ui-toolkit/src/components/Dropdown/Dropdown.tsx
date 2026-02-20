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
import React, { ComponentProps, ReactNode } from "react";
import {
    VSCodeDropdown,
    VSCodeOption,
    VSCodeProgressRing,
} from "@vscode/webview-ui-toolkit/react";
import styled from "@emotion/styled";
import { ErrorBanner } from "../Commons/ErrorBanner";
import { RequiredFormInput } from "../Commons/RequiredInput";
import { Codicon } from "../Codicon/Codicon";

export interface OptionProps {
    id?: string;
    content?: string | ReactNode;
    value: any;
    disabled?: boolean;
}

export interface DropdownProps extends ComponentProps<"select"> {
    id: string;
    isLoading?: boolean;
    isRequired?: boolean;
    label?: string;
    labelAdornment?: ReactNode;
    items?: OptionProps[];
    errorMsg?: string;
    sx?: any;
    containerSx?: any;
    dropdownContainerSx?: any;
    description?: string | ReactNode;
    descriptionSx?: any;
    onValueChange?: (value: string) => void;
    addNewBtnLabel?: string;
    addNewBtnClick?: () => void;
}

const SmallProgressRing = styled(VSCodeProgressRing)`
    height: calc(var(--design-unit) * 3px);
    width: calc(var(--design-unit) * 3px);
    margin-top: auto;
    padding: 4px;
`;

interface ContainerProps {
    sx?: any;
}

const DropDownContainer = styled.div<ContainerProps>`
    display: flex;
    flex-direction: column;
    gap : 2px;
    color: var(--vscode-editor-foreground);
    ${(props: ContainerProps) => props.sx};
`;

const Container = styled.div<ContainerProps>`
    ${(props: ContainerProps) => props.sx};
`;

const Label = styled.div<ContainerProps>`
    display: flex;
    flex-direction: row;
    margin-bottom: 2px;
`;

const Description = styled.div<ContainerProps>`
    color: var(--vscode-list-deemphasizedForeground);
    margin-bottom: 4px;
    text-align: left;
    ${(props: ContainerProps) => props.sx};
`;
const LabelContainer = styled.div<ContainerProps>`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
`;

export const Dropdown = React.forwardRef<HTMLSelectElement, DropdownProps>((props, ref) => {
    const { isLoading, isRequired, id, items, label, errorMsg, sx, containerSx, addNewBtnLabel, addNewBtnClick, description, descriptionSx, dropdownContainerSx, labelAdornment, "aria-label": ariaLabel, ...rest } = props;

    const handleValueChange = (e: any) => {
        props.onValueChange && props.onValueChange(e.target.value);
        props.onChange && props.onChange(e);
    };

    return (
        <Container sx={containerSx}>
            {isLoading ? (
                <SmallProgressRing />
            ) : (
                <DropDownContainer sx={dropdownContainerSx} className="dropdown-container">
                    {label && (
                        <LabelContainer>
                            <Label>
                                <label htmlFor={id}>{label}</label>
                                {(isRequired) && (<RequiredFormInput />)}
                                {labelAdornment && labelAdornment}
                            </Label>
                        </LabelContainer>
                    )}
                    {description && (
                        <Description sx={descriptionSx}>
                            {description}
                        </Description>
                    )}
                    <VSCodeDropdown ref={ref} id={id} aria-label={ariaLabel ? ariaLabel : `${label}${isRequired ? "*" : ""}`} style={sx} {...rest} onChange={handleValueChange}>
                        {items?.map((item: OptionProps) => (
                            <VSCodeOption key={item?.id} value={item.value} disabled={item.disabled}>
                                {item?.content || item.value}
                            </VSCodeOption>
                        ))}
                        {addNewBtnClick &&
                            <VSCodeOption
                                key={"NEW"}
                                onClick={() => addNewBtnClick()}
                                value={undefined}
                            >
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <Codicon name="add" />
                                    {addNewBtnLabel}
                                </div>
                            </VSCodeOption>
                        }
                    </VSCodeDropdown>
                    {errorMsg && (
                        <ErrorBanner errorMsg={errorMsg} />
                    )}
                </DropDownContainer>
            )}
        </Container>
    );
});
Dropdown.displayName = "Dropdown";
