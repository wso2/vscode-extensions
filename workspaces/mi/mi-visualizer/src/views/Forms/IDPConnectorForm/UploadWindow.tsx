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
import { Codicon,Button,Typography} from "@wso2/ui-toolkit";

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

