/*
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import styled from "@emotion/styled";
import { Codicon, Alert } from "@wso2/ui-toolkit";

interface ErrorAlertProps {
    errorMessage: string;
    onclear: () => void;
    variant: "error" | "warning";
    sx?: Object;
}

const ErrorContainer = styled.div`
    width: 100%;
`;

const ErrorContent = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
`;

const ErrorMessage = styled.div`
    flex: 1;
`;

const CloseIcon = styled(Codicon)`
    cursor: pointer;
    font-size: 14px;
    margin-left: 8px;
`;

export function ErrorAlert({ errorMessage, onclear, variant, sx }: ErrorAlertProps) {
    if (!errorMessage) return null;
    return (
        <ErrorContainer>
            <Alert variant={variant} sx={{ marginBottom: "0", ...sx }}>
                <ErrorContent>
                    <ErrorMessage>{errorMessage}</ErrorMessage>
                    <CloseIcon
                        name="chrome-close"
                        onClick={onclear}
                    />
                </ErrorContent>
            </Alert>
        </ErrorContainer>
    );
}

