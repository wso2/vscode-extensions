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

