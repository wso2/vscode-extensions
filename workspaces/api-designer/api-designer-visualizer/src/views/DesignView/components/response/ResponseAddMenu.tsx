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

import React from 'react';
import styled from '@emotion/styled';
import { Responses as Rs } from '../../../../definitions/ServiceDefinitions';

const MenuRoot = styled.div`
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 4px;
    background: var(--vscode-dropdown-background);
    border: 1px solid var(--vscode-dropdown-border);
    border-radius: 4px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    z-index: 1000;
    min-width: 200px;
    padding: 4px;
`;

const MenuSectionTitle = styled.div<{ $dividerTop?: boolean }>`
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 500;
    color: var(--vscode-foreground);
    border-bottom: 1px solid var(--vscode-panel-border);
    margin-bottom: 4px;
    ${(p: { $dividerTop?: boolean }) =>
        p.$dividerTop
            ? `
        border-top: 1px solid var(--vscode-panel-border);
        margin-top: 4px;
    `
            : ''}
`;

const MenuScroll = styled.div`
    max-height: 200px;
    overflow-y: auto;
`;

const StatusMenuItem = styled.div<{ $disabled: boolean }>`
    padding: 8px 12px;
    cursor: ${(p: { $disabled: boolean }) => (p.$disabled ? 'not-allowed' : 'pointer')};
    border-radius: 3px;
    font-size: 12px;
    color: ${(p: { $disabled: boolean }) =>
        p.$disabled ? 'var(--vscode-descriptionForeground)' : 'var(--vscode-foreground)'};
    background: transparent;
    opacity: ${(p: { $disabled: boolean }) => (p.$disabled ? 0.5 : 1)};

    &:hover {
        background: ${(p: { $disabled: boolean }) =>
            p.$disabled ? 'transparent' : 'var(--vscode-list-hoverBackground)'};
    }
`;

const ReferenceMenuItem = styled.div`
    padding: 8px 12px;
    cursor: pointer;
    border-radius: 3px;
    font-size: 12px;
    color: var(--vscode-foreground);
    background: transparent;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &:hover {
        background: var(--vscode-list-hoverBackground);
    }
`;

const ReferenceMenuEmpty = styled.div`
    padding: 8px 12px;
    opacity: 0.5;
    cursor: not-allowed;
    font-size: 12px;
    color: var(--vscode-foreground);
`;

const COMMON_STATUS_CODES = [
    { code: '200', description: 'OK - Success' },
    { code: '201', description: 'Created' },
    { code: '204', description: 'No Content' },
    { code: '301', description: 'Moved Permanently' },
    { code: '304', description: 'Not Modified' },
    { code: '400', description: 'Bad Request' },
    { code: '401', description: 'Unauthorized' },
    { code: '403', description: 'Forbidden' },
    { code: '404', description: 'Not Found' },
    { code: '409', description: 'Conflict' },
    { code: '429', description: 'Too Many Requests' },
    { code: '500', description: 'Internal Server Error' },
    { code: '502', description: 'Bad Gateway' },
    { code: '503', description: 'Service Unavailable' }
];

export interface ResponseAddMenuProps {
    isOpen: boolean;
    responses: Rs;
    componentResponseNames: string[];
    unusedReferences: string[];
    onAddRegularResponse: (statusCode: string) => void;
    onAddReferenceResponse: (refName: string) => void;
    onClose: () => void;
    onAIPrompt: (context: string, path: string, defaultPrompt: string, title: string, placeholder: string, event: React.MouseEvent) => void;
    operationPath?: string;
    operationMethod?: string;
    showReferenceOptions?: boolean;
}

export const ResponseAddMenu: React.FC<ResponseAddMenuProps> = ({
    isOpen,
    responses,
    componentResponseNames,
    unusedReferences,
    onAddRegularResponse,
    onAddReferenceResponse,
    onClose,
    onAIPrompt,
    operationPath,
    operationMethod,
    showReferenceOptions = true
}) => {
    if (!isOpen) return null;

    return (
        <MenuRoot>
            <MenuSectionTitle>Select Status Code</MenuSectionTitle>
            <MenuScroll>
                {COMMON_STATUS_CODES.map((item) => {
                    const disabled = responses[item.code] !== undefined;
                    return (
                        <StatusMenuItem
                            key={item.code}
                            $disabled={disabled}
                            onClick={() => {
                                if (!disabled) {
                                    onAddRegularResponse(item.code);
                                    onClose();
                                }
                            }}
                        >
                            {item.code} - {item.description}
                        </StatusMenuItem>
                    );
                })}
            </MenuScroll>
            {showReferenceOptions && componentResponseNames.length > 0 && (
                <>
                    <MenuSectionTitle $dividerTop>Reference</MenuSectionTitle>
                    {unusedReferences.length > 0 ? (
                        unusedReferences.map((refName, idx) => (
                            <ReferenceMenuItem
                                key={idx}
                                title={refName}
                                onClick={() => {
                                    onAddReferenceResponse(refName);
                                    onClose();
                                }}
                            >
                                {refName}
                            </ReferenceMenuItem>
                        ))
                    ) : (
                        <ReferenceMenuEmpty>All references already used</ReferenceMenuEmpty>
                    )}
                </>
            )}
        </MenuRoot>
    );
};
