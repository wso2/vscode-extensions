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
import { Typography, Button } from "@wso2/ui-toolkit";
import { Codicon } from "@wso2/ui-toolkit";
import React from "react";

const HeaderContainer = styled.div`
    height: 35px;
    background-color: var(--vscode-editorWidget-background);
    padding-left: 20px;
    padding-right: 20px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
`;

const RightSection = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    height: 100%;
    gap: 10px;
`;

interface IdpHeaderSchemaGenerationProps {
    path: string;
    setTryOutPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
    handleClose: () => void;
    isLoading?: boolean;
    isSmallScreen: boolean;
    generateSchema: () => void;
    base64String:string;
}

export function IdpHeaderSchemaGeneration({
    path,
    handleClose,
    setTryOutPanelOpen,
    isLoading,
    isSmallScreen,
    generateSchema,
    base64String
}: IdpHeaderSchemaGenerationProps) {
    return (
        <HeaderContainer>
            <Typography variant="h3">
                {path.replace(/\\/g, "/").split("/").pop()?.replace(/\.json$/, "")}
            </Typography>
                <RightSection>
                    { base64String && (
                        <>
                            <Button
                                appearance="secondary"
                                onClick={generateSchema}
                                disabled={isLoading}
                            >
                                <Codicon name="wand" />
                                &nbsp; Extract Schema
                                </Button>
                            <Button
                                appearance="secondary"
                                onClick={() => { setTryOutPanelOpen(true); }}
                                disabled={isLoading}
                            >
                                <Codicon name="arrow-right" />
                                    {!isSmallScreen && <>&nbsp; Go to TryOut</>}
                                </Button>
                        </>
                        )}
                    <Button appearance="icon" onClick={handleClose}>
                        <Codicon name="chrome-close" />
                    </Button>
                </RightSection>
        </HeaderContainer>
    );
}

