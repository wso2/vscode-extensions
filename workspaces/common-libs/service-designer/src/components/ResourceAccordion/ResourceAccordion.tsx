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
import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { Button, Codicon, Confirm, ContextMenu, Icon, LinkButton, Typography } from '@wso2/ui-toolkit';
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { AccordionTable } from '../AccordionTable/AccordionTable';
import { Resource } from '../../definitions';

type MethodProp = {
    color: string;
    hasLeftMargin?: boolean;
};

type ContainerProps = {
    borderColor?: string;
    haveErrors?: boolean;
};

type ButtonSectionProps = {
    isExpanded?: boolean;
};

type HeaderProps = {
    expandable?: boolean;
}

const AccordionContainer = styled.div<ContainerProps>`
    margin-top: 10px;
    overflow: hidden;
    background-color: var(--vscode-editorHoverWidget-background);
    &:hover {
        background-color: var(--vscode-list-hoverBackground);
        cursor: pointer;
    }
    border: ${(p: ContainerProps) => p.haveErrors ? "1px solid red" : "none"};
`;

const AccordionHeader = styled.div<HeaderProps>`
    padding: 10px;
    cursor: pointer;
    display: grid;
    grid-template-columns: 3fr 1fr;
`;

const LinkButtonWrapper = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    padding: 0 16px;

    :hover {
        outline: 1px solid var(--vscode-inputOption-activeBorder);
    }
`;

const ButtonWrapper = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    font-size: 10px;
    width: 40px;
`;

const MethodBox = styled.div<MethodProp>`
    display: flex;
    justify-content: center;
    height: 25px;
    min-width: 70px;
    width: auto;
    margin-left: ${(p: MethodProp) => p.hasLeftMargin ? "10px" : "0px"};
    text-align: center;
    padding: 3px 5px 3px 5px;
    background-color: ${(p: MethodProp) => p.color};
    color: #FFF;
    align-items: center;
    font-weight: bold;
`;

const MethodSection = styled.div`
    display: flex;
    gap: 4px;
`;

const verticalIconStyles = {
    transform: "rotate(90deg)",
    ":hover": {
        backgroundColor: "var(--vscode-welcomePage-tileHoverBackground)",
    }
};

const ButtonSection = styled.div<ButtonSectionProps>`
    display: flex;
    align-items: center;
    margin-left: auto;
    gap: ${(p: ButtonSectionProps) => p.isExpanded ? "8px" : "6px"};
`;

const AccordionContent = styled.div`
    padding: 10px;
`;

const MethodPath = styled.span`
    align-self: center;
    margin-left: 10px;
`;

const colors = {
    "GET": '#3d7eff',
    "PUT": '#fca130',
    "POST": '#49cc90',
    "DELETE": '#f93e3e',
    "PATCH": '#986ee2',
    "OPTIONS": '#0d5aa7',
    "HEAD": '#9012fe'
}

export function getColorByMethod(method: string) {
    switch (method.toUpperCase()) {
        case "GET":
            return colors.GET;
        case "PUT":
            return colors.PUT;
        case "POST":
            return colors.POST;
        case "DELETE":
            return colors.DELETE;
        case "PATCH":
            return colors.PATCH;
        case "OPTIONS":
            return colors.OPTIONS;
        case "HEAD":
            return colors.HEAD;
        default:
            return '#876036'; // Default color
    }
}

export interface ResourceAccordionProps {
    resource: Resource;
    goToSource?: (resource: Resource) =>  void;
    onEditResource?: (resource: Resource) => void;
    onDeleteResource?: (resource: Resource) => void;
    onResourceImplement?: (resource: Resource) => void;
    onResourceClick?: (resource: Resource) => void;
}

const ResourceAccordion = (params: ResourceAccordionProps) => {
    const { resource, goToSource, onEditResource, onDeleteResource, onResourceImplement, onResourceClick } = params;
    const { expandable = true, additionalActions } = resource;
    const [isOpen, setIsOpen] = useState(resource.isOpen || false);
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [confirmEl, setConfirmEl] = React.useState(null);

    const toggleAccordion = () => {
        setIsOpen(!isOpen);
    };

    const handleShowDiagram = (e: Event) => {
        e.stopPropagation(); // Stop the event propagation
        goToSource(resource);
    };

    const handleEditResource = (e: Event) => {
        e.stopPropagation(); // Stop the event propagation
        onEditResource(resource);
    };

    const handleOpenConfirm = () => {
        setConfirmOpen(true);
    };

    const handleDeleteResource = (e: React.MouseEvent<HTMLElement | SVGSVGElement>) => {
        e.stopPropagation(); // Stop the event propagation
        setConfirmEl(e.currentTarget);
        handleOpenConfirm();
    };

    const resourceParams: string[][] = [];
    resource?.advancedParams?.forEach(param => {
        resourceParams.push([param.type, `${param.name}${param?.defaultValue ? ` = ${param.defaultValue}` : ""}`]);
    });
    resource?.params?.forEach(param => {
        resourceParams.push([param.type, `${param.name}${param?.defaultValue ? ` = ${param.defaultValue}` : ""}`]);
    });

    const payloadInfo: string[][] = [];
    if (resource?.payloadConfig) {
        payloadInfo.push([`@http:Payload ${resource?.payloadConfig.type} ${resource?.payloadConfig.name}`]);
    }

    const responses: string[][] = [];
    resource?.responses?.forEach(response => {
        responses.push([`${response.code}`, response.type]);
    });

    const handleConfirm = (status: boolean) => {
        if (status) {
            onDeleteResource && onDeleteResource(resource);
        }
        setConfirmOpen(false);
        setConfirmEl(null);
    };

    const handleResourceImplement = () => {
        onResourceImplement(resource)
    }

    const handleResourceClick = (e: React.SyntheticEvent) => {
        e.stopPropagation();
        onResourceClick && onResourceClick(resource);
        toggleAccordion();
    }

    useEffect(() => {
        if (resource.isOpen !== undefined) {
            setIsOpen(resource.isOpen);
        }
    }, [resource.isOpen]);

    return (
        <AccordionContainer data-testid="service-design-view-resource">
            <AccordionHeader onClick={handleResourceClick}>
                <MethodSection>
                    {resource?.methods?.map((method, index) => {
                        return (
                            <MethodBox key={index} color={getColorByMethod(method)} hasLeftMargin={index >= 1}>
                                {method}
                            </MethodBox>
                        );
                    })}
                    <MethodPath>{resource?.path}</MethodPath>
                </MethodSection>
                <ButtonSection isExpanded={expandable && isOpen}>
                    {onResourceImplement && (
                        <LinkButtonWrapper>
                            <LinkButton sx={{ gap: "4px" }} onClick={handleResourceImplement}>
                                <Typography variant="h4">Implement</Typography>
                                <Codicon name="arrow-right" />
                            </LinkButton>
                        </LinkButtonWrapper>
                    )}
                    {expandable && isOpen ? (
                        <>
                            {goToSource && (
                                <ButtonWrapper>
                                    <VSCodeButton appearance="icon" title="Show Diagram" onClick={handleShowDiagram}>
                                        <Icon name='design-view' />
                                    </VSCodeButton>
                                    <>
                                        Diagram
                                    </>
                                </ButtonWrapper>
                            )}
                            {onEditResource && (
                                <ButtonWrapper>
                                    <VSCodeButton appearance="icon" title="Edit Resource" onClick={handleEditResource}>
                                        <Icon name="editIcon" />
                                    </VSCodeButton>
                                    <>
                                        Edit
                                    </>
                                </ButtonWrapper>
                            )}
                            {onDeleteResource && (
                                <ButtonWrapper>
                                    <VSCodeButton appearance="icon" title="Delete Resource" onClick={handleDeleteResource}>
                                        <Codicon name="trash" />
                                    </VSCodeButton>
                                    <>
                                        Delete
                                    </>
                                </ButtonWrapper>
                            )}
                            {additionalActions && (
                                <ButtonWrapper>
                                    <ContextMenu
                                        sx={{ transform: "translateX(-50%)" }}
                                        iconSx={verticalIconStyles}
                                        menuItems={additionalActions}
                                        position='bottom-left'
                                    />
                                    <>
                                        More Actions
                                    </>
                                </ButtonWrapper> 
                            )}
                        </>
                    ) : (
                        <>
                            {goToSource && (
                                <VSCodeButton appearance="icon" title="Show Diagram" onClick={handleShowDiagram}>
                                    <Icon name='design-view' />
                                </VSCodeButton>
                            )}
                            {onEditResource && (
                                <VSCodeButton appearance="icon" title="Edit Resource" onClick={handleEditResource}>
                                    <Icon name="editIcon" />
                                </VSCodeButton>
                            )}
                            {onDeleteResource && (
                                <VSCodeButton appearance="icon" title="Delete Resource" onClick={handleDeleteResource}>
                                    <Codicon name="trash" />
                                </VSCodeButton>
                            )}
                            {additionalActions && (
                                <ContextMenu
                                    menuSx={{ transform: "translateX(-50%)" }}
                                    iconSx={verticalIconStyles}
                                    menuItems={additionalActions}
                                />
                            )}
                        </>
                    )}

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
                    {resourceParams?.length > 0 &&
                        <AccordionTable key="params" titile="Parameters" headers={["Type", "Description"]} content={resourceParams} />
                    }
                    {payloadInfo.length > 0 &&
                        <AccordionTable key="body" titile="Body" headers={["Description"]} content={payloadInfo} />
                    }
                    {responses.length > 0 &&
                        <AccordionTable key="responses" titile="Responses" headers={["Code", "Description"]} content={responses} />
                    }
                    {resource?.addtionalInfo && resource?.addtionalInfo}
                </AccordionContent>
            )}
            <Confirm
                isOpen={isConfirmOpen}
                onConfirm={handleConfirm}
                confirmText="Okay"
                message="Are you sure want to delete this resource?"
                anchorEl={confirmEl}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
            />
        </AccordionContainer>
    );
};

export default ResourceAccordion;
