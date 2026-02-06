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
import { Typography } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { InputForm } from './Form/InputForm';
import { InputCode } from './Code/InputCode';
import { QueryParameter, HeaderParameter, ApiRequest } from '@wso2/api-tryit-core';
import { getVSCodeAPI } from '../utils/vscode-api';
import { Output } from '../Output';

type InputMode = 'code' | 'form';
type BodyFormat = 'json' | 'xml' | 'text' | 'html' | 'javascript' | 'form-data' | 'form-urlencoded' | 'binary' | 'no-body';

interface InputProps {
    request: ApiRequest;
    onRequestChange?: (request: ApiRequest) => void;
    mode?: InputMode;
    response?: React.ComponentProps<typeof Output>['response'];
    // A counter that increments when parent requests the Output be scrolled into view
    bringOutputCounter?: number;
}

const Container = styled.div`
    width: 100%;
    height: calc(100vh - 215px);
    overflow: auto;
`;

export const Input: React.FC<InputProps> = ({ 
    request,
    onRequestChange,
    mode = 'code',
    response,
    bringOutputCounter
}) => {
    // Attach ref to the scrollable container so we can control scroll position precisely
    const [bodyFormat, setBodyFormat] = React.useState<BodyFormat>('json');
    const formatMenuRef = React.useRef<HTMLDivElement>(null);
    const outputRef = React.useRef<HTMLDivElement>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Only scroll when parent explicitly requests it (bringOutputCounter increments).
    // Use a pending mechanism so if the trigger happens before the response arrives we still scroll when it does.
    const lastBringCounterRef = React.useRef<number>(bringOutputCounter ?? 0);
    const pendingBringRef = React.useRef<number | null>(null);

    React.useEffect(() => {
        if (typeof bringOutputCounter !== 'number') return;
        if (lastBringCounterRef.current === bringOutputCounter) return; // no change

        // Record the new bring counter value
        lastBringCounterRef.current = bringOutputCounter;

        if (response && outputRef.current && containerRef.current) {
            // Response already present — perform scroll immediately
            setTimeout(() => {
                try {
                    const container = containerRef.current!;
                    const outputEl = outputRef.current!;
                    const containerRect = container.getBoundingClientRect();
                    const outputRect = outputEl.getBoundingClientRect();
                    const offset = 16; // small padding from top

                    // Align the top of the output with a small offset
                    const targetScrollTop = container.scrollTop + (outputRect.top - containerRect.top) - offset;
                    container.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
                    setTimeout(() => outputEl.focus(), 300);
                } catch (e) {
                    outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    outputRef.current?.focus();
                }
            }, 150);

            pendingBringRef.current = null;
        } else {
            // Response not yet available — remember we need to scroll when it arrives
            pendingBringRef.current = bringOutputCounter;
        }
    }, [bringOutputCounter]);

    // When response arrives, if there's a pending bring request for the current counter, scroll now
    React.useEffect(() => {
        if (!response) return;
        if (pendingBringRef.current === null) return;
        if (pendingBringRef.current !== lastBringCounterRef.current) return; // stale pending

        if (outputRef.current && containerRef.current) {
            setTimeout(() => {
                try {
                    const container = containerRef.current!;
                    const outputEl = outputRef.current!;
                    const containerRect = container.getBoundingClientRect();
                    const outputRect = outputEl.getBoundingClientRect();
                    const offset = 16;
                    const targetScrollTop = container.scrollTop + (outputRect.top - containerRect.top) - offset;
                    container.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
                    setTimeout(() => outputEl.focus(), 300);
                } catch (e) {
                    outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    outputRef.current?.focus();
                }
            }, 150);
        }

        pendingBringRef.current = null;
    }, [response]);

    const handleFormatChange = (format: BodyFormat) => {
        setBodyFormat(format);
        // Clear body immediately when format changes
        handleBodyChange('');
    };

    // Get VS Code API
    const vscode = getVSCodeAPI();

    // Note: File selection is now handled directly via HTML5 File Input API in handleFileSelect

    // Safety check to ensure request object exists with required properties
    if (!request) {
        return <Container><Typography>Loading...</Typography></Container>;
    }

    const handleBodyChange = (value: string | undefined) => {
        const updatedRequest = {
            ...request,
            body: value || ''
        };
        onRequestChange?.(updatedRequest);
    };

    const updateFormDataParam = (
        id: string,
        key: string,
        filePath: string | undefined,
        contentType: string,
        value?: string
    ) => {
        const updatedRequest = {
            ...request,
            bodyFormData: (request.bodyFormData || []).map(param => {
                if (param.id !== id) {
                    return param;
                }

                const updatedParam: any = { ...param, key, contentType };

                if (filePath !== undefined) {
                    updatedParam.filePath = filePath;
                } else {
                    delete updatedParam.filePath;
                }

                if (value !== undefined) {
                    updatedParam.value = value;
                } else {
                    delete updatedParam.value;
                }

                return updatedParam;
            })
        };
        onRequestChange?.(updatedRequest);
    };

    const updateFormDataParamContentType = (id: string, contentType: string) => {
        const updatedRequest = {
            ...request,
            bodyFormData: (request.bodyFormData || []).map(param =>
                param.id === id ? { ...param, contentType } : param
            )
        };
        onRequestChange?.(updatedRequest);
    };

    // Listen for file selection response from extension
    React.useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            if (message.type === 'fileSelected') {
                const { paramId, filePath } = message.data;
                const param = (request.bodyFormData || []).find(p => p.id === paramId);
                if (param) {
                    updateFormDataParam(
                        paramId,
                        param.key,
                        filePath,
                        param.contentType || 'application/octet-stream'
                    );
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [request.bodyFormData, updateFormDataParam]);

    const handleFileSelect = (paramId: string) => {
        // Request file selection from VS Code extension
        if (vscode) {
            vscode.postMessage({
                command: 'selectFile',
                data: { paramId }
            });
        }
    };

    return (
        <Container ref={containerRef}>
            {mode === 'code' ? (
                <InputCode request={request} onRequestChange={onRequestChange} bodyFormat={bodyFormat} onFormatChange={handleFormatChange} />
            ) : (
                <InputForm
                    request={request}
                    onRequestChange={onRequestChange}
                    bodyFormat={bodyFormat}
                    updateFormDataParamContentType={updateFormDataParamContentType}
                    handleFileSelect={handleFileSelect}
                    onFormatChange={handleFormatChange}
                />
            )}

            {response && (
                
                <div ref={outputRef} tabIndex={-1} role="region" aria-label="Response output" style={{ marginTop: '24px', borderTop: '1px solid var(--vscode-panel-border)', paddingTop: '16px' }}>
                    <Typography variant='h3' sx={{ margin: 0 }}>
                        Response
                    </Typography>
                    <Output response={response} embedded />
                </div>
            )}


        
        </Container>
    );
};
