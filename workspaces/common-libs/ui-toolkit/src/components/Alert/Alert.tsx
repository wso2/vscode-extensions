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

import styled from "@emotion/styled";
import React, { PropsWithChildren } from "react";
import { Codicon } from "../Codicon/Codicon";

type Variant = "primary" | "secondary" | "error" | "warning";
export interface AlertProps {
    title?: string;
    subTitle?: string;
    variant?: Variant;
    onClose?: () => void;
    sx?: React.CSSProperties;
    closeButtonSx?: React.CSSProperties;
}

interface ContainerProps {
    variant: Variant;
    sx?: React.CSSProperties;
}

// Helper functions
const getBorderColor = (variant: Variant) => {
    switch (variant) {
        case "primary":
            return "var(--vscode-focusBorder)";
        case "secondary":
            return "var(--vscode-editorWidget-border)";
        case "error":
            return "var(--vscode-errorForeground)";
        case "warning":
            return "var(--vscode-editorWarning-foreground)";
    }
}

const getBackgroundColor = (variant: Variant) => {
    switch (variant) {
        case "primary":
            return "var(--vscode-inputValidation-infoBackground)";
        case "secondary":
            return "transparent";
        case "error":
            return "var(--vscode-inputValidation-errorBackground)";
        case "warning":
            return "var(--vscode-inputValidation-warningBackground)";
    }
}

const Container = styled.div<ContainerProps>`
    position: relative;
    border-left: 0.3rem solid ${(props: ContainerProps) => getBorderColor(props.variant)};
    background: ${(props: ContainerProps) => getBackgroundColor(props.variant)};
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 1rem;
    gap: 12px;
    margin-bottom: 15px;
    ${(props: ContainerProps) => props.sx};
`;

const Title = styled.div`
    color: var(--vscode-foreground);
    font-weight: 500;
`;

const SubTitle = styled.div`
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
    font-weight: 400;
    line-height: 1.5;
`;


export const Alert: React.FC<PropsWithChildren<AlertProps>> = props => {
    const { title, subTitle, variant = "primary", children, sx, onClose, closeButtonSx } = props;

    return (
        <Container variant={variant} sx={sx}>
            {onClose && (
                <Codicon
                    name="close"
                    onClick={onClose}
                    sx={{
                        margin: '8px',
                        cursor: 'pointer',
                        position: 'absolute',
                        right: '0',
                        top: '0',
                        ...closeButtonSx
                    }}
                />
            )}
            {title && <Title>{title}</Title>}
            {subTitle && <SubTitle>{subTitle}</SubTitle>}
            {children}
        </Container>
    );
};

