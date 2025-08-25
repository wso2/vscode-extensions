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
import { RpcClient } from "@wso2/mi-rpc-client";
import { Typography, Button, AutoComplete } from "@wso2/ui-toolkit";
import { Codicon } from "@wso2/ui-toolkit";

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
                {path.replace(/\\/g, "/").split("/").pop()?.replace(/\.json$/, "")}
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

