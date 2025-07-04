/*
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
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
                {path.split("/").pop()?.replace(/\.json$/, "")}
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

