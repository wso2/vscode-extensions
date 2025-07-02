/*
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import styled from "@emotion/styled";
import { Codicon,Button,Typography} from "@wso2-enterprise/ui-toolkit";

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
  gap: 15px;
`;

interface UploadWindowProps {
    handleFileSubmission: (file: File | null) => void;
}

export function UploadWindow({handleFileSubmission}:UploadWindowProps) {

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        handleFileSubmission(file);
    };

    return (
        <UploadContainer>
            <IconContainer>
                <Codicon name="arrow-circle-up" iconSx={{ fontSize: "70px" }} />
            </IconContainer>
            <Typography variant="h2" sx={{ margin: "0" }}>Upload Document</Typography>
            <Typography variant="body1" sx={{ margin: "0" }}>Click below to select a PDF or image file</Typography>
            <Button appearance="primary" onClick={() => document.getElementById('fileInput').click()} disabled={false}>
                Select File
            </Button>
            <input id="fileInput" type="file" style={{ display: "none" }} onChange={handleFileChange}/>
        </UploadContainer>
    );
}

