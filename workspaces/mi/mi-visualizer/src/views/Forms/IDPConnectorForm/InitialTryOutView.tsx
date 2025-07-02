/*
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import styled from "@emotion/styled";
import { Codicon,Button,Typography,AutoComplete} from "@wso2-enterprise/ui-toolkit";

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

