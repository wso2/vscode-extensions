/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import React, { ReactNode } from 'react';
import styled from "@emotion/styled";

const ViewContentWrapper = styled.div({
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    overflowY: 'auto',
});

type ViewContentProps = {
    children: ReactNode;
    padding?: boolean;
};

const ViewContent: React.FC<ViewContentProps> = ({ children, padding = false }) => {
    return (
        <ViewContentWrapper style={{ padding: padding ? '20px' : '0px' }}>
            {children}
        </ViewContentWrapper>
    );
};

export default ViewContent;
