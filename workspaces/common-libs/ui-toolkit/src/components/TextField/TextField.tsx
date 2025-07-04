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
import React, { ComponentProps, ReactNode, useEffect, useRef } from 'react';
import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import { ErrorBanner } from "../Commons/ErrorBanner";
import { RequiredFormInput } from "../Commons/RequiredInput";
import styled from "@emotion/styled";
import { Typography } from "../Typography/Typography";

interface IconProps {
    iconComponent: ReactNode;
    position?: "start" | "end";
    onClick?: () => void;
}

export interface InputProps {
    startAdornment?: string | ReactNode;
    endAdornment?: string | ReactNode;
}

export interface TextFieldProps extends ComponentProps<"input"> {
    label?: string;
    labelAdornment?: ReactNode;
    id?: string;
    autoFocus?: boolean;
    forceAutoFocus?: boolean;
    icon?: IconProps;
    size?: number;
    readonly?: boolean;
    required?: boolean;
    errorMsg?: string;
    description?: string | ReactNode;
    validationMessage?: string;
    sx?: any;
    textFieldSx?: any;
    descriptionSx?: any;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    onTextChange?: (text: string) => void;
    inputProps?: InputProps;
}

interface ContainerProps {
    sx?: any;
}

const Container = styled.div<ContainerProps>`
    ${(props: ContainerProps) => props.sx};
`;

const LabelContainer = styled.div<ContainerProps>`
    display: flex;
    flex-direction: row;
    margin-bottom: 4px;
`;

const Description = styled.div<ContainerProps>`
    color: var(--vscode-list-deemphasizedForeground);
    margin-bottom: 4px;
    text-align: left;
    ${(props: ContainerProps) => props.sx};
`;

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>((props, ref) => {
    const { label, type = "text", size = 20, disabled, icon, readonly, id, autoFocus, required,
        placeholder, description, validationMessage, errorMsg, sx, textFieldSx, descriptionSx, inputProps, onTextChange,
        labelAdornment, onKeyDown, forceAutoFocus, ...rest
    } = props;

    const [, setIsFocused] = React.useState(false);
    const textFieldRef = useRef<HTMLInputElement | null>(null);
    // Assign the forwarded ref to the textFieldRef
    React.useImperativeHandle(ref, () => textFieldRef.current);

    const { iconComponent, position = "start", onClick: iconClick } = icon || {};

    const handleInput = (e: any) => {
        onTextChange && onTextChange(e.target.value);
        props.onChange && props.onChange(e);
    };

    const startAdornment = inputProps?.startAdornment ? (
        typeof inputProps.startAdornment === "string" ? (
            <Typography variant="body1">{inputProps.startAdornment}</Typography>
        ) : (
            inputProps.startAdornment
        )
    ) : undefined;

    const endAdornment = inputProps?.endAdornment ? (
        typeof inputProps.endAdornment === "string" ? (
            <Typography variant="body1">{inputProps.endAdornment}</Typography>
        ) : (
            inputProps.endAdornment
        )
    ) : undefined;

    useEffect(() => {
        if (autoFocus && textFieldRef.current && !props.value) {
            setIsFocused(true);
            textFieldRef.current?.focus()
        }
    }, [autoFocus, props.value]);

    useEffect(() => {
        if (forceAutoFocus && textFieldRef.current) {
            setIsFocused(true);
            textFieldRef.current?.focus()
        }
    }, [forceAutoFocus]);

    return (
        <Container sx={sx}>
            <VSCodeTextField
                ref={textFieldRef}
                style={{ width: "100%", ...textFieldSx }}
                autoFocus={autoFocus}
                type={type}
                size={size}
                disabled={disabled}
                readonly={readonly}
                validationMessage={validationMessage}
                placeholder={placeholder}
                id={id}
                {...rest}
                {...!props.name ? { value: props.value ? props.value : "" } : {}} // If name is not provided, then value should be empty (for react-hook-form)
                onInput={handleInput}
                onKeyDown={onKeyDown}
            >
                {startAdornment && <div slot="start">{startAdornment}</div>}
                {iconComponent && <div onClick={iconClick} slot={position} style={{ display: "flex", alignItems: "center" }}>{iconComponent}</div>}
                {label && (
                    <LabelContainer>
                        <div style={{ color: "var(--vscode-editor-foreground)" }}>
                            <label htmlFor={`${id}-label`}>{label}</label>
                        </div>
                        {(required && label) && (<RequiredFormInput />)}
                        {labelAdornment && labelAdornment}
                    </LabelContainer>
                )}
                {description && (
                    <Description sx={descriptionSx}>
                        {description}
                    </Description>
                )}
                {endAdornment && <div slot="end">{endAdornment}</div>}
            </VSCodeTextField>
            {errorMsg && (
                <ErrorBanner errorMsg={errorMsg} />
            )}
        </Container>
    );
});
TextField.displayName = "TextField";
