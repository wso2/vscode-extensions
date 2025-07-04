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
import React, { useEffect } from "react";
import Prism from 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';

import styled from "@emotion/styled";
import { StyledCode, StyledPre } from "./Styles";

interface ContainerProps {
    sx?: any;
}

const Container = styled.div<ContainerProps>`
    ${(props: ContainerProps) => props.sx};
`;

export interface SyntaxHighlighterProps {
    id?: string;
    code: string;
    language?: string;
    className?: string;
    sx?: any;
}

export const SyntaxHighlighter: React.FC<SyntaxHighlighterProps> = (props: SyntaxHighlighterProps) => {
    const { id, className, sx, code, language } = props;

    useEffect(() => {
        Prism.highlightAll();
    }, [code]);
    
    return (
        <Container id={id} className={className} sx={sx}>
            <StyledPre>
                <StyledCode className={`language-${language}`}>
                    {code}
                </StyledCode>
            </StyledPre>
        </Container>
    );
};
