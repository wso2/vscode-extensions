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
import React, { useState } from 'react';
import styled from '@emotion/styled';
import { Button } from '../Button/Button';
import { Codicon } from '../Codicon/Codicon';
import { Typography } from '../Typography/Typography';

type ContainerProps = {
    borderColor?: string;
};

type ButtonSectionProps = {
    isExpanded?: boolean;
};

type HeaderProps = {
    expandable?: boolean;
}

const AccordionContainer = styled.div<ContainerProps>`
    margin-top: 10px;
    background-color: var(--vscode-editorHoverWidget-background);
    &:hover {
        background-color: var(--vscode-list-hoverBackground);
        cursor: pointer;
    }
`;

const AccordionHeader = styled.div<HeaderProps>`
    padding: 10px;
    cursor: pointer;
    display: grid;
    grid-template-columns: 3fr 1fr;
`;

const ButtonSection = styled.div<ButtonSectionProps>`
    display: flex;
    align-items: center;
    margin-left: auto;
    gap: ${(p: ButtonSectionProps) => p.isExpanded ? "8px" : "6px"};
`;

const AccordionContent = styled.div`
    padding: 10px;
`;

export interface AccordionProps {
    children?: React.ReactNode;
    header: string;
    isExpanded?: boolean;
}

export const Accordion = (params: AccordionProps) => {
    const expandable = true;
    const [isOpen, setIsOpen] = useState(params.isExpanded || false);

    const toggleAccordion = () => {
        setIsOpen(!isOpen);
    };

    const handleHeaderClick = (e: React.SyntheticEvent) => {
        e.stopPropagation();
        toggleAccordion();
    }

    return (
        <AccordionContainer>
            <AccordionHeader onClick={handleHeaderClick}>
                <Typography variant="h4">{params.header}</Typography>
                <ButtonSection isExpanded={expandable && isOpen}>
                    {expandable ?
                        isOpen ? (
                            <Button appearance='icon' onClick={toggleAccordion}>
                                <Codicon iconSx={{ marginTop: -3 }} name="chevron-up" />
                            </Button>
                        ) : (
                            <Button appearance='icon' onClick={toggleAccordion}>
                                <Codicon iconSx={{ marginTop: -3 }} name="chevron-down" />
                            </Button>
                        )
                        : undefined
                    }
                </ButtonSection>
            </AccordionHeader>
            {expandable && isOpen && (
                <AccordionContent>
                    {params.children}
                </AccordionContent>
            )}
        </AccordionContainer>
    );
};

