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
import React from "react";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import Typography from "../Typography/Typography";

interface ButtonProps {
    text: string;
    tooltip?: string;
    disabled?: boolean;
    loading?: boolean;
    onClick?: () => void;
}

interface ButtonContainerProps {
    sx: any;
}

export interface ActionButtonsProps {
    id?: string;
    className?: string;
    primaryButton: ButtonProps;
    secondaryButton: ButtonProps;
    sx?: any;
}

const ButtonContainer = styled.div<ButtonContainerProps>`
    display: flex;
    flex-direction: row;
    ${(props: ButtonContainerProps) => props.sx};
`;

const ButtonWrapper = styled.div`
    min-width: 50px;
`;

export const ActionButtons = (props: ActionButtonsProps) => {
    const { id, className, primaryButton, secondaryButton, sx } = props;
    const { tooltip: pTooltip, text: pText, onClick: pOnClick, disabled: pDisabled, loading: pLoading } = primaryButton;
    const { tooltip: sTooltip, text: sText, onClick: sOnClick, disabled: sDisabled, loading: sLoading } = secondaryButton;

    return (
        <ButtonContainer id={id} className={className} sx={sx}>
            <VSCodeButton appearance="secondary" onClick={sOnClick} title={sTooltip} disabled={(sDisabled ? true : undefined)} style={{ marginRight: 8 }}>
                <ButtonWrapper style={{ minWidth: "50px" }}>{sLoading ? <Typography variant="progress">{sText}</Typography> : sText}</ButtonWrapper>
            </VSCodeButton>
            <VSCodeButton appearance="primary" onClick={pOnClick} title={pTooltip} disabled={(pDisabled ? true : undefined)}>
                <ButtonWrapper style={{ minWidth: "50px" }}>{pLoading ? <Typography variant="progress">{pText}</Typography> : pText}</ButtonWrapper>
            </VSCodeButton>
        </ButtonContainer>
    );
};
