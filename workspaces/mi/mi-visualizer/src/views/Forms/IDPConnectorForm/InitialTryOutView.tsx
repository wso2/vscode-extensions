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
import { Codicon,Button,Typography,AutoComplete} from "@wso2/ui-toolkit";

const IconContainer = styled.div`
  height: 70px;
  width: 70px;
`;

const UploadContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 10px;
`;

const RowContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
`;

interface InitialTryOutViewProps {
    idpConnectionNames: string[];
    selectedConnectionName: string;
    setSelectedConnectionName: React.Dispatch<React.SetStateAction<string>>;
    fillSchema: () => void;
}

export function InitialTryOutView({
    idpConnectionNames,
    selectedConnectionName,
    setSelectedConnectionName,
    fillSchema
}:InitialTryOutViewProps) {

    return (
        <UploadContainer>
            <Typography variant="h2" sx={{ margin: "0" }}>Select Connection</Typography>
            <Typography variant="body2" sx={{ margin: "0" }}>Select a connection to try out your schema with a document</Typography>
            <RowContainer>
                <AutoComplete
                    name="idp-connection"
                    items={idpConnectionNames}
                    value={selectedConnectionName}
                    onValueChange={(value) => setSelectedConnectionName(value)}
                    sx={{ width: "150px" }}
                />
                <Button
                    appearance="primary"
                    onClick={fillSchema}
                >
                    <Codicon name="wand" />
                    &nbsp; Tryout
                </Button>
            </RowContainer>
        </UploadContainer>
    );
}

