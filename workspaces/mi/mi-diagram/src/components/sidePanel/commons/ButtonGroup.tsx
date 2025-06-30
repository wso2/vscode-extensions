
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

import { Button, Codicon, ComponentCard, Icon, IconLabel, Tooltip, Typography } from '@wso2/ui-toolkit';
import React, { useEffect, useState } from 'react';
import { FirstCharToUpperCase } from '../../../utils/commons';
import styled from '@emotion/styled';
import { Colors, DEFAULT_ICON } from '../../../resources/constants';
import { ConnectorDependency } from '@wso2/mi-core';


export const ButtonGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 5px 5px;
    padding: 10px 10px;
    border-radius: 10px;
`;

const VersionTag = styled.div`
    color: ${Colors.SECONDARY_TEXT};
    font-size: 10px;
`;

const CardContent = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    width: 100%;
`;

const CardLabel = styled.div`
    display: flex;
    flex-direction: row;
    align-self: flex-start;
    width: 100%;
    gap: 10px;
`;

const DeleteIconContainer = styled.div`
    width: 25px;
    height: 10px;
    cursor: pointer;
    border-radius: 2px;
    align-content: center;
    padding: 5px 5px 15px 12px;
    color: ${Colors.SECONDARY_TEXT};
    &:hover, &.active {
        background-color: ${Colors.BUTTON_HOVER};
        color: ${Colors.DELETE_ICON};
    }
    & img {
        width: 25px;
    }
`;

const RefreshIconContainer = styled.div`
    width: 25px;
    height: 10px;
    cursor: pointer;
    border-radius: 2px;
    align-content: center;
    padding: 5px 5px 15px 12px;
    color: ${Colors.SECONDARY_TEXT};
    &:hover, &.active {
        background-color: ${Colors.BUTTON_HOVER};
        color: ${Colors.PRIMARY};
    }
    & img {
        width: 25px;
    }
`;

const DownloadIconContainer = styled.div`
    width: 35px;
    height: 25px;
    cursor: pointer;
    border-radius: 2px;
    align-content: center;
    padding: 5px 5px 15px 12px;
    color: ${Colors.SECONDARY_TEXT};
    &:hover, &.active {
        background-color: ${Colors.BUTTON_HOVER};
        color: ${Colors.PRIMARY};
    }
    & img {
        width: 25px;
    }
`;

interface ButtonroupProps {
    title: string;
    children?: React.ReactNode;
    isCollapsed?: boolean;
    iconUri?: string;
    versionTag?: string;
    onDownload?: any;
    connectorDetails?: ConnectorDependency;
    onDelete?: (connectorName: string, artifactId: string, version: string, iconUrl: string, connectorPath: string) => void;
    onRefresh?: (connectorName: string, ballerinaModulePath: string) => void;
    disableGrid?: boolean;
}
export const ButtonGroup: React.FC<ButtonroupProps> = ({
    title,
    children,
    isCollapsed = true,
    iconUri,
    versionTag,
    onDownload,
    connectorDetails,
    onDelete,
    onRefresh,
    disableGrid
}) => {
    const [collapsed, setCollapsed] = useState(isCollapsed);

    useEffect(() => {
        setCollapsed(isCollapsed);
    }, [isCollapsed]);

    const toggleCollapse = () => setCollapsed(!collapsed);

    return (
        <div style={{
            backgroundColor: 'var(--vscode-editorWidget-background)',
            border: '0px',
            borderRadius: 2,
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'left',
            transition: '0.3s',
            flexDirection: 'column',
            marginBottom: '15px'
        }}>
            <ComponentCard
                id={title}
                key={title}
                onClick={toggleCollapse}
                sx={{
                    border: '0px',
                    borderRadius: 2,
                    padding: '6px 10px',
                    width: 'auto',
                    height: '32px'
                }}
            >
                <CardContent>
                    <CardLabel>
                        {iconUri && (
                            <IconContainer>
                                <img
                                    src={iconUri}
                                    alt="Icon"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = DEFAULT_ICON
                                    }}
                                />
                            </IconContainer>
                        )}
                        <div style={{
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                        }}>
                            <Typography sx={{ margin: '0px' }}>{title}</Typography>
                            <VersionTag>
                                {versionTag}
                            </VersionTag>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                            {connectorDetails &&
                            <>
                                <DeleteIconContainer
                                    onClick={() => onDelete(title, connectorDetails.artifactId, connectorDetails.version,
                                        iconUri, connectorDetails.connectorPath)}
                                    className="delete-icon">
                                    <Codicon name="trash" iconSx={{ fontSize: 20 }} />
                                </DeleteIconContainer>
                                {connectorDetails.isBallerinaModule &&
                                    <RefreshIconContainer
                                        onClick={() => onRefresh(title, connectorDetails.ballerinaModulePath)}
                                        className="refresh-icon">
                                        <Codicon name="refresh" iconSx={{fontSize: 20}}/>
                                    </RefreshIconContainer>
                                }
                            </>
                            }
                            {onDownload &&
                                <DownloadIconContainer onClick={onDownload} className="download-icon">
                                    <Icon iconSx={{ fontSize: 25 }} name="import" />
                                </DownloadIconContainer>
                            }
                            <Button appearance="icon" tooltip={collapsed ? 'Expand' : 'Collapse'}>
                                <Codicon name={collapsed ? 'chevron-down' : 'chevron-up'} />
                            </Button>
                        </div>
                    </CardLabel>
                </CardContent>
            </ComponentCard>
            {!collapsed && (
                !disableGrid ?
                    <ButtonGrid>
                        {children}
                    </ButtonGrid> :
                    <>
                        {children}
                    </>
            )}
        </div>
    );
};


const IconContainer = styled.div`
    width: 36px;
    display: flex;
    align-items: center;

    & img {
        width: 25px;
    }
`;

interface GridButtonProps {
    onClick: () => void;
    title: string;
    description: string;
    icon?: React.ReactNode;
    isClickable?: boolean
}
export const GridButton: React.FC<GridButtonProps> = ({ title, description, icon, onClick, isClickable = true }) => {
    return (
        <Tooltip content={description} position='bottom' sx={{ zIndex: 2010 }}>
            <ComponentCard
                id={title}
                key={description}
                onClick={isClickable ? onClick : undefined}
                sx={{
                    '&:hover, &.active': isClickable ? {
                        '.icon svg g': {
                            fill: 'var(--vscode-editor-foreground)'
                        },
                        backgroundColor: 'var(--vscode-pickerGroup-border)',
                        border: '0.5px solid var(--vscode-focusBorder)'
                    } : {},
                    alignItems: 'center',
                    border: '0.5px solid var(--vscode-editor-foreground)',
                    borderRadius: 2,
                    cursor: isClickable ? 'pointer' : 'default',
                    display: 'flex',
                    height: 20,
                    justifyContent: 'left',
                    marginBottom: 10,
                    padding: 10,
                    transition: '0.3s',
                    width: 164
                }}
            >
                <IconContainer>
                    {icon}
                </IconContainer>
                <div style={{ width: '120px', whiteSpace: 'nowrap' }}>
                    <IconLabel style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{FirstCharToUpperCase(title)}</IconLabel>
                </div>
            </ComponentCard>
        </Tooltip>
    );
}
