/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
import { ApiRequest } from '@wso2/api-tryit-core';
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
    // A counter that increments when parent requests scroll to top (Request tab clicked)
    scrollToTopCounter?: number;
    // Called when scroll position crosses the response boundary
    onActiveTabChange?: (tab: 'input' | 'response') => void;
}

const Container = styled.div`
    width: 100%;
    height: calc(100vh - 215px);
    overflow-y: auto;
    overflow-x: hidden;
`;

export const Input: React.FC<InputProps> = ({
    request,
    onRequestChange,
    mode = 'code',
    response,
    bringOutputCounter,
    scrollToTopCounter,
    onActiveTabChange
}) => {
    // Attach ref to the scrollable container so we can control scroll position precisely
    const [bodyFormat, setBodyFormat] = React.useState<BodyFormat>('json');
    const formatMenuRef = React.useRef<HTMLDivElement>(null);
    const outputRef = React.useRef<HTMLDivElement>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const lastRequestIdRef = React.useRef<string | undefined>(undefined);
    // Tracks whether the user explicitly chose a format for the current request.
    // While true, auto-detection is suppressed so typing doesn't override the selection.
    const userSetFormatRef = React.useRef(false);
    const lastScrollTopCounterRef = React.useRef<number>(scrollToTopCounter ?? 0);
    // Keep a ref to the callback so the scroll listener doesn't need to be re-attached on every render
    const onActiveTabChangeRef = React.useRef(onActiveTabChange);
    React.useEffect(() => { onActiveTabChangeRef.current = onActiveTabChange; });

    // Scroll to top when Request tab is clicked
    React.useEffect(() => {
        if (typeof scrollToTopCounter !== 'number') return;
        if (lastScrollTopCounterRef.current === scrollToTopCounter) return;
        lastScrollTopCounterRef.current = scrollToTopCounter;
        containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [scrollToTopCounter]);

    // Update active tab based on scroll position relative to the response section
    React.useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const handleScroll = () => {
            if (!outputRef.current || !onActiveTabChangeRef.current) return;
            const outputTop = outputRef.current.offsetTop - container.scrollTop;
            const switchLine = Math.max(80, container.clientHeight * 0.45);
            if (outputTop <= switchLine) {
                onActiveTabChangeRef.current('response');
            } else {
                onActiveTabChangeRef.current('input');
            }
        };
        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, []); // empty deps — uses refs to stay stable

    // Fallback: if a selected request has [Multipart] body text but missing structured params,
    // parse and hydrate `bodyFormData` so Form view can populate rows.
    React.useEffect(() => {
        if (!onRequestChange) return;
        if (request.bodyFormData && request.bodyFormData.length > 0) return;
        if (!request.body || !/^\[(?:FormData|Multipart)\]/im.test(request.body)) return;

        const lines = request.body.split('\n');
        let inFormSection = false;
        const parsed: any[] = [];

        for (const raw of lines) {
            const line = raw.trim();
            if (!line || line.startsWith('#')) continue;

            if (/^\[(?:FormData|Multipart)\]/i.test(line)) {
                inFormSection = true;
                continue;
            }
            if (/^\[/.test(line) && inFormSection) {
                break;
            }
            if (!inFormSection) continue;

            const fileMatch = line.match(/^([^:]+):\s*file,([^;]+);(?:\s*(.+))?$/i);
            if (fileMatch) {
                parsed.push({
                    id: `form-${Math.random().toString(36).substring(2, 9)}`,
                    key: fileMatch[1].trim(),
                    filePath: fileMatch[2].trim(),
                    contentType: fileMatch[3]?.trim() || 'application/octet-stream'
                });
                continue;
            }

            const kv = line.match(/^([^:]+):\s*(.+)$/);
            if (kv) {
                parsed.push({
                    id: `form-${Math.random().toString(36).substring(2, 9)}`,
                    key: kv[1].trim(),
                    value: kv[2].trim(),
                    contentType: ''
                });
            }
        }

        if (parsed.length > 0) {
            onRequestChange({
                ...request,
                bodyFormData: parsed
            });
        }
    }, [request, onRequestChange]);

    // Auto-detect body format from request
    React.useEffect(() => {
        const isNewRequest = lastRequestIdRef.current !== request.id;
        if (isNewRequest) {
            lastRequestIdRef.current = request.id;
            userSetFormatRef.current = false; // Reset explicit-format flag for new request
        }

        // If the user manually picked a format for this request, don't override it.
        if (!isNewRequest && userSetFormatRef.current) {
            return;
        }

        if (request.bodyFormData && request.bodyFormData.length > 0) {
            setBodyFormat('form-data');
        } else if (request.bodyFormUrlEncoded && request.bodyFormUrlEncoded.length > 0) {
            setBodyFormat('form-urlencoded');
        } else if (request.bodyBinaryFiles && request.bodyBinaryFiles.length > 0) {
            setBodyFormat('binary');
        } else if (!request.body) {
            // Keep user's manual raw-format selection while editing the same request.
            // Reset to no-body only when a different request is selected.
            setBodyFormat(prev => (isNewRequest || prev === 'no-body') ? 'no-body' : prev);
        } else if (request.body.trim().startsWith('{') || request.body.trim().startsWith('[')) {
            setBodyFormat('json');
        } else if (request.body.trim().startsWith('<')) {
            setBodyFormat('xml');
        } else {
            setBodyFormat('text');
        }
    }, [request.id, request.bodyFormData, request.bodyFormUrlEncoded, request.bodyBinaryFiles, request.body]);

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
        userSetFormatRef.current = true;
        setBodyFormat(format);
        const isRawFormat = (value: BodyFormat) => ['json', 'xml', 'text', 'html', 'javascript'].includes(value);
        const keepRawBody = isRawFormat(format) && isRawFormat(bodyFormat);

        const updatedRequest = {
            ...request,
            body: keepRawBody ? (request.body || '') : (isRawFormat(format) ? '' : ''),
            bodyFormData: format === 'form-data' ? (request.bodyFormData || []) : [],
            bodyFormUrlEncoded: format === 'form-urlencoded' ? (request.bodyFormUrlEncoded || []) : [],
            bodyBinaryFiles: format === 'binary' ? (request.bodyBinaryFiles || []) : []
        };
        onRequestChange?.(updatedRequest);
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
