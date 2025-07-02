/*
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
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

