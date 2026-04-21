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
import { Button, Codicon, Dropdown, Typography, TextArea } from '@wso2/ui-toolkit';
import { ReferenceObject as RO } from '../../../../definitions/ServiceDefinitions';
import SectionHeader from '../shared/SpecSectionHeader';
import { logger } from '../../../../utils/logger';

const ReferenceBadge = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    margin-bottom: 12px;
`;

const ReferenceInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const InvalidRefBanner = styled.div`
    padding: 12px;
    background: var(--vscode-inputValidation-errorBackground);
    border: 1px solid var(--vscode-inputValidation-errorBorder);
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 6px;
`;

const ReferenceHeaderRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const ResolvedPreviewWrap = styled.div`
    margin-top: 12px;
`;

const MissingRefPanel = styled.div`
    padding: 12px;
    background: var(--vscode-inputValidation-errorBackground);
    border: 1px solid var(--vscode-inputValidation-errorBorder);
    border-radius: 4px;
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const WarningTitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;

export interface RequestBodyReferenceProps {
    requestBody: RO;
    openAPI?: any;
    componentRequestBodyNames: string[];
    onRequestBodyChange: (requestBody: RO) => void;
    onAIPrompt: (context: string, path: string, defaultPrompt: string, title: string, placeholder: string, event: React.MouseEvent) => void;
    operationPath?: string;
    operationMethod?: string;
    conversionOptions: Array<{ id: string; value: string; content: string }>;
    currentState: string;
    onConversionChange: (value: string) => void;
}

export const RequestBodyReference: React.FC<RequestBodyReferenceProps> = ({
    requestBody,
    openAPI,
    componentRequestBodyNames,
    onRequestBodyChange,
    onAIPrompt,
    operationPath,
    operationMethod,
    conversionOptions,
    currentState,
    onConversionChange
}) => {
    try {
        const refPath = requestBody.$ref || '';
        const refName = refPath.split('/').pop();
        const refPathParts = refPath.split('/');
        
        // Check if the reference path is valid
        const isValidPath = refPath.startsWith('#/components/requestBodies/') || 
                            refPath.startsWith('#/components/requestBody/');
        
        if (!isValidPath && refPath) {
            return (
                <InvalidRefBanner>
                    <Codicon name="warning" />
                    <Typography variant="body2" sx={{ color: 'var(--vscode-errorForeground)', margin: 0 }}>
                        Invalid request body reference path: {refPath}. Must start with #/components/requestBodies/
                    </Typography>
                </InvalidRefBanner>
            );
        }
        
        // Resolve the request body (try both plural and singular for compatibility)
        let resolvedRequestBody = refName && openAPI?.components?.requestBodies?.[refName];
        if (!resolvedRequestBody && refName) {
            // Try singular form (non-standard, but handle gracefully)
            resolvedRequestBody = openAPI?.components?.requestBody?.[refName];
        }
        
        return (
            <>
                <ReferenceBadge>
                    <Codicon name="link" sx={{ fontSize: '12px' }} />
                    Reference: {refName}
                </ReferenceBadge>
                <ReferenceInfo>
                    <ReferenceHeaderRow>
                        <Typography variant="body2" sx={{ fontWeight: 600, margin: 0, flex: 1 }}>
                            Select Request Body Reference
                        </Typography>
                    </ReferenceHeaderRow>
                    <Dropdown
                        id="requestbody-reference"
                        label="Request Body"
                        value={refName || (componentRequestBodyNames.length > 0 ? componentRequestBodyNames[0] : '')}
                        items={componentRequestBodyNames.map(name => ({ id: name, value: name, content: name }))}
                        onValueChange={(value) => {
                            const ref: RO = {
                                $ref: `#/components/requestBodies/${value}`
                            };
                            onRequestBodyChange(ref);
                        }}
                        containerSx={{ width: '100%' }}
                        dropdownContainerSx={{ zIndex: 1000 }}
                    />
                    {resolvedRequestBody ? (
                        <ResolvedPreviewWrap>
                            <Typography variant="body2" sx={{ fontSize: '11px', opacity: 0.7, margin: '0 0 8px 0' }}>
                                Referenced Request Body (read-only):
                            </Typography>
                            <TextArea
                                label=""
                                value={JSON.stringify(resolvedRequestBody, null, 2)}
                                disabled
                                rows={10}
                                sx={{ width: '100%', fontFamily: 'monospace', fontSize: '11px' }}
                            />
                        </ResolvedPreviewWrap>
                    ) : (
                        <MissingRefPanel>
                            <WarningTitleRow>
                                <Codicon name="warning" />
                                <Typography variant="body2" sx={{ color: 'var(--vscode-errorForeground)', margin: 0 }}>
                                    Request Body "{refName}" not found in components
                                </Typography>
                            </WarningTitleRow>
                            {componentRequestBodyNames.length > 0 && (
                                <Typography variant="caption" sx={{ opacity: 0.7, margin: 0 }}>
                                    Available request bodies: {componentRequestBodyNames.join(', ')}
                                </Typography>
                            )}
                            {refPath && !refPath.startsWith('#/components/requestBodies/') && (
                                <Typography variant="caption" sx={{ opacity: 0.7, margin: 0 }}>
                                    Note: Reference path should be #/components/requestBodies/ (plural)
                                </Typography>
                            )}
                        </MissingRefPanel>
                    )}
                </ReferenceInfo>
            </>
        );
    } catch (error) {
        logger.error('[RequestBodyReference] Error rendering request body reference:', error, { requestBody, openAPI });
        return (
            <InvalidRefBanner>
                <Codicon name="warning" />
                <Typography variant="body2" sx={{ color: 'var(--vscode-errorForeground)', margin: 0 }}>
                    Error rendering reference: {error instanceof Error ? error.message : String(error)}
                </Typography>
            </InvalidRefBanner>
        );
    }
};

