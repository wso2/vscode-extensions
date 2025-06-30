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
import React, { ComponentProps, ReactNode, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { VSCodeTextArea } from "@vscode/webview-ui-toolkit/react";
import { ErrorBanner } from "../Commons/ErrorBanner";
import { RequiredFormInput } from "../Commons/RequiredInput";
import styled from '@emotion/styled';
import { calculateTextAreaRows, getLineCount, getLineHeight, getRawScrollHeight, setTextAreaRows } from './utils';

interface IconProps {
    iconComponent: ReactNode;
    position?: "start" | "end";
    onClick?: () => void;
}


export interface TextAreaProps extends ComponentProps<"textarea"> {
    label?: string;
    labelAdornment?: ReactNode;
    id?: string;
    className?: string;
    autoFocus?: boolean;
    icon?: IconProps;
    required?: boolean;
    errorMsg?: string;
    placeholder?: string;
    cols?: number;
    rows?: number;
    resize?: string;
    validationMessage?: string;
    sx?: any;
    onTextChange?: (text: string) => void;
}

export interface AutoResizeTextAreaProps extends Omit<TextAreaProps, 'rows'> {
    growRange: {
        start: number;
        offset: number;
    }
}

interface ContainerProps {
    sx?: any;
}

const Container = styled.div<ContainerProps>`
    ${(props: TextAreaProps) => props.sx};
`;

const LabelContainer = styled.div<ContainerProps>`
    display: flex;
    flex-direction: row;
    margin-bottom: 4px;
`;

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
    function TextArea(props: TextAreaProps, ref: React.ForwardedRef<HTMLTextAreaElement>) {
        const { label, id, className, autoFocus, required, validationMessage, cols = 40,
            rows, resize, errorMsg, sx, onTextChange, labelAdornment, icon, "aria-label": ariaLabel, ...rest
        } = props;

        const { iconComponent, onClick: iconClick } = icon || {};

        const handleChange = (e: any) => {
            onTextChange && onTextChange(e.target.value);
            props.onChange && props.onChange(e);
        };
        return (
            <Container sx={sx}>
                {iconComponent && <div onClick={iconClick} style={{ display: "flex" }}>{iconComponent}</div>}
                <VSCodeTextArea
                    ref={ref}
                    autoFocus={autoFocus}
                    validationMessage={validationMessage}
                    cols={cols}
                    rows={rows}
                    resize={resize}
                    id={id}
                    className={className}
                    style={{ width: "100%" }}
                    {...rest}
                    { ...!props.name ? { value: props.value ? props.value : ""} : {} } // If name is not provided, then value should be empty (for react-hook-form)
                    onChange={handleChange}
                    onInput={handleChange}
                    aria-label={ariaLabel ? ariaLabel : `${label}`}
                >
                    <LabelContainer>
                        <div style={{ color: "var(--vscode-editor-foreground)" }}>
                            <label htmlFor={`${id}-label`}>{label}</label>
                        </div> {(required && label) && (<RequiredFormInput />)}
                        {labelAdornment && labelAdornment}
                    </LabelContainer>
                </VSCodeTextArea>
                {errorMsg && (
                    <ErrorBanner errorMsg={errorMsg} />
                )}
            </Container>
        );
    }
);

export const AutoResizeTextArea = React.forwardRef<HTMLTextAreaElement, AutoResizeTextAreaProps>(
    (props, ref) => {
        const { growRange, "aria-label": ariaLabel, ...rest } = props;
        const lineHeight = useRef<number | undefined>(undefined);
        const [rows, setRows] = useState<number>(growRange.start);

        const textAreaRef = useRef<HTMLTextAreaElement>(null);

        useImperativeHandle(ref, () => textAreaRef.current);

        const updateRows = useCallback(() => {
            const textAreaComponent = textAreaRef.current?.shadowRoot?.querySelector('textarea');
            if (!textAreaComponent) {
                return;
            }

            // set the number of rows based on the number of lines
            const lineCount = getLineCount(textAreaComponent.value);
            const tempRows = calculateTextAreaRows(lineCount, growRange);
            setTextAreaRows(textAreaComponent, tempRows);

            requestAnimationFrame(() => {
                // get the raw scroll height of the text area without paddings
                const scrollHeight = getRawScrollHeight(textAreaComponent);
    
                // calculate the number of rows
                const contentBasedRows = Math.ceil(scrollHeight / lineHeight.current);
                const newRows = calculateTextAreaRows(contentBasedRows, growRange);
    
                // set the rows for both HTML element and react element to avoid state mismatch
                setTextAreaRows(textAreaComponent, newRows);
                setRows(newRows);
            });

        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [textAreaRef.current, lineHeight.current, growRange]);

        /* Handle initial render */
        useEffect(() => {
            const textAreaComponent = textAreaRef.current?.shadowRoot?.querySelector('textarea');
            if (!textAreaComponent) {
                return;
            }

            if (lineHeight.current === undefined) {
                lineHeight.current = getLineHeight(textAreaComponent);
            }

            updateRows();

        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [props.value])

        return <TextArea aria-label={ariaLabel} {...rest} rows={rows} ref={textAreaRef} />
    }
)

AutoResizeTextArea.displayName = 'AutoResizeTextArea';
