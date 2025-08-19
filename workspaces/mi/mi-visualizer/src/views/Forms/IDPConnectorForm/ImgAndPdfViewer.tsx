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
import { Button, Codicon } from "@wso2/ui-toolkit";
import { PdfViewer } from "./PdfViewer"; 

const ViewerWrapper = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const ViewerHeader = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
`;

const ViewerContent = styled.div`
  overflow: auto;
  flex: 1;
  max-height: calc(100vh - 100px);
`;

interface ImgAndPdfViewerProps {
  base64String: string;
  handleClose: () => void;
}

export function ImgAndPdfViewer({ base64String, handleClose }: ImgAndPdfViewerProps) {
    return (
        <ViewerWrapper>
            <ViewerHeader>
                <Button appearance="icon" onClick={handleClose} >
                    <Codicon name="chrome-close" />
                </Button>
            </ViewerHeader>
            <ViewerContent>
                {base64String.startsWith("data:image") && (
                      <img 
                      src={base64String} 
                      alt="Uploaded file" 
                      style={{
                        width: "auto",
                        height: "auto",
                        maxWidth: "none",
                        minHeight: "800px",
                        minWidth: "400px",
                        objectFit: "contain", 
                        display: "block"
                    }} 
                  />
                )}
                {base64String.startsWith("data:application/pdf") && (
                    <div style={{ height: "100%" }}>
                        <PdfViewer base64String={base64String} />
                    </div>
                )}
            </ViewerContent>
        </ViewerWrapper>
    );
}

