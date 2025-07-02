/*
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import styled from "@emotion/styled";
import { RpcClient } from "@wso2-enterprise/mi-rpc-client";
import { Typography, Button, AutoComplete } from "@wso2-enterprise/ui-toolkit";
import { Codicon } from "@wso2-enterprise/ui-toolkit";

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

const IdpConnectionContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

interface IdpHeaderTryoutProps {
    path: string;
    handleClose: () => void;
    setTryOutPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isLoading: boolean;
    isSmallScreen: boolean;
    fillSchema: () => void;
    rpcClient:RpcClient;
    idpConnectionNames: string[];
    selectedConnectionName: string;
    setSelectedConnectionName: React.Dispatch<React.SetStateAction<string>>;
    tryoutOutput: string;
    tryOutBase64String: string | null;
}

export function IdpHeaderTryout({
    path,
    handleClose,
    setTryOutPanelOpen,
    isLoading,
    isSmallScreen,
    fillSchema,
    idpConnectionNames,
    selectedConnectionName,
    setSelectedConnectionName,
    tryoutOutput,
    tryOutBase64String
}: IdpHeaderTryoutProps) {

    return (
        <HeaderContainer>
            <Typography variant="h3">
                {path.split("/").pop()?.replace(/\.json$/, "")}
            </Typography>
            <RightSection>
                {tryoutOutput !== "" && tryOutBase64String && (
                    <>
                        <IdpConnectionContainer>
                            <Typography variant="body2">
                                IDP Connection:
                            </Typography>
                            <AutoComplete
                                name="idp-connection"
                                items={idpConnectionNames}
                                sx={{ width: "150px" }}
                                value={selectedConnectionName}
                                onValueChange={(e) => setSelectedConnectionName(e)}
                            />
                        </IdpConnectionContainer>
                        <Button
                            appearance="secondary"
                            onClick={fillSchema}
                            disabled={isLoading}
                        >
                            <Codicon name="wand" />
                            &nbsp; Tryout
                        </Button>
                    </>
                )}

                <Button
                    appearance="secondary"
                    onClick={() => setTryOutPanelOpen(false)}
                    disabled={isLoading}
                >
                    <Codicon name="arrow-left" />
                    {!isSmallScreen && <>&nbsp; Back to Editor</>}
                </Button>
                <Button appearance="icon" onClick={handleClose}>
                    <Codicon name="chrome-close" />
                </Button>
            </RightSection>
        </HeaderContainer>
    );
}

