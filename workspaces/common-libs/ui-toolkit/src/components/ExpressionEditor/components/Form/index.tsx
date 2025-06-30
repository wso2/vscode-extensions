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

import React, { forwardRef, useImperativeHandle, useRef } from 'react';

import styled from '@emotion/styled';

import { ExpressionEditor } from './ExpressionEditor';
import { FormExpressionEditorRef, FormExpressionEditorProps } from '../../types';

import { Button } from '../../../Button/Button';
import { Codicon } from '../../../Codicon/Codicon';
import { Icon } from '../../../Icon/Icon';

import { ThemeColors } from '../../../../styles';

// Styled Components
namespace Ex {
    export const Container = styled.div`
        width: 100%;
        display: flex;
        flex-direction: column;
        color: ${ThemeColors.ON_SURFACE};
        min-height: 32px;
        gap: 4px;
        box-sizing: border-box;

        *,
        *::before,
        *::after {
            box-sizing: border-box;
        }
    `;

    export const CodeActionsContainer = styled.div`
        display: flex;
        gap: 8px;
        align-items: center;
    `;

    export const EditorContainer = styled.div`
        width: 100%;
        display: flex;
        align-items: center;
        gap: 8px;
    `;

    export const ExpressionBox = styled.div`
        display: flex;
        flex: 1 1 auto;
    `;
}

// Styles
const State = {
    Selected: {
        Button: {
            border: '1px solid var(--focus-border)',
            backgroundColor: 'var(--vscode-list-activeSelectionBackground)',
            borderRadius: 'var(--button-icon-corner-radius)',
        },
        Icon: {
            color: 'var(--vscode-list-activeSelectionForeground)',
        },
    }
} as const;

export const FormExpressionEditorWrapper = forwardRef<FormExpressionEditorRef, FormExpressionEditorProps>((props, ref) => {
    const {
        id,
        getExpressionEditorIcon,
        onRemove,
        codeActions,
        startAdornment,
        endAdornment,
        expressionEditorIconName = 'function-icon',
        enableExIcon = true,
        ...rest
    } = props;
    const expressionEditorRef = useRef<FormExpressionEditorRef>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => expressionEditorRef.current);

    const handleHelperPaneToggle = () => {
        if (!props.isHelperPaneOpen) {
            expressionEditorRef.current?.focus();
        } else {
            props.changeHelperPaneState?.(false);
        }
    };

    return (
        <Ex.Container ref={containerRef} id={id}>
            {codeActions && codeActions.length > 0 && (
                <Ex.CodeActionsContainer>
                    {codeActions.map((button, index) => (
                        <React.Fragment key={index}>
                            {button}
                        </React.Fragment>
                    ))}
                </Ex.CodeActionsContainer>
            )}
            <Ex.EditorContainer>
                <Ex.ExpressionBox>
                    {startAdornment}
                    <ExpressionEditor
                        ref={expressionEditorRef}
                        containerRef={containerRef}
                        {...rest}
                    />
                    {endAdornment}
                </Ex.ExpressionBox>
                {enableExIcon && (
                    getExpressionEditorIcon
                        ? getExpressionEditorIcon()
                        : props.changeHelperPaneState && (
                            <Button
                                appearance="icon"
                                onClick={handleHelperPaneToggle}
                                tooltip="Open Helper View"
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    width: "26px",
                                    height: "26px",
                                    ...(props.isHelperPaneOpen && State.Selected.Button),
                                }}
                                buttonSx={{ width: "26px", height: "26px" }}
                            >
                                <Icon
                                    name={expressionEditorIconName}
                                    sx={{ height: "20px", width: "18px" }}
                                    iconSx={{
                                        fontSize: "16px",
                                        ...(props.isHelperPaneOpen && State.Selected.Icon),
                                    }}
                                />
                            </Button>
                        ))}
                {onRemove && (
                    <Button appearance="icon" onClick={onRemove} tooltip="Remove Expression">
                        <Codicon name="trash" sx={{ color: ThemeColors.ERROR }} />
                    </Button>
                )}
            </Ex.EditorContainer>
        </Ex.Container>
    );
});
FormExpressionEditorWrapper.displayName = 'FormExpressionEditorWrapper';
