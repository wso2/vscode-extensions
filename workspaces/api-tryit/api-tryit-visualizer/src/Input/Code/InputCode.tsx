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
import { InputEditor } from '../InputEditor/InputEditor';
import { COMMON_HEADERS, COMMON_QUERY_KEYS, COMMON_BODY_SNIPPETS } from '../InputEditor/SuggestionsConstants';
import styled from '@emotion/styled';
import { QueryParameter, HeaderParameter, ApiRequest } from '@wso2/api-tryit-core';

type BodyFormat = 'json' | 'xml' | 'text' | 'html' | 'javascript' | 'form-data' | 'form-urlencoded' | 'binary' | 'no-body';
type InlineSeparator = ':' | '=';

const SEPARATOR_META_MARKER = '__sep__';

const withSeparatorMeta = (baseId: string, separator?: InlineSeparator): string => {
    if (!separator) {
        return baseId;
    }
    return `${baseId}${SEPARATOR_META_MARKER}${separator === ':' ? 'colon' : 'equals'}`;
};

const getSeparatorFromMeta = (id: string | undefined, fallback?: InlineSeparator): InlineSeparator | undefined => {
    if (!id) {
        return fallback;
    }
    if (id.includes(`${SEPARATOR_META_MARKER}equals`)) {
        return '=';
    }
    if (id.includes(`${SEPARATOR_META_MARKER}colon`)) {
        return ':';
    }
    return fallback;
};

const BodyHeaderContainer = styled.div`display:flex;align-items:center;justify-content:space-between;margin:8px 0;gap:12px;`;
const BodyTitleWrapper = styled.div`display:flex;align-items:center;gap:8px;flex:1;`;
const FormatSelectorWrapper = styled.div`position:relative;display:flex;justify-content:flex-end;padding-right:5px;`;
const FormatButton = styled.button`background:transparent;border:1px solid rgba(255,255,255,0.2);color:inherit;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:6px;font-family:inherit;transition:all .2s ease;`;
const FormatDropdown = styled.div<{ isOpen: boolean }>`position:absolute;max-height:160px;overflow:auto;top:100%;right:0;margin-top:4px;background:#3e3e42;border:1px solid rgba(255,255,255,0.2);border-radius:4px;min-width:180px;z-index:1000;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:${props => props.isOpen ? 'block' : 'none'};`;
const FormatGroupTitle = styled.div`padding:8px 10px;font-size:12px;font-weight:600;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.5px;background-color:rgba(0,0,0,0.2);border-bottom:1px solid rgba(255,255,255,0.1);margin:0;`;
const FormatOptions = styled.div`margin-left:8px;`;
const FormatOption = styled.div<{ isSelected: boolean }>`padding:8px 12px;cursor:pointer;font-size:13px;background-color:${p => p.isSelected ? 'rgba(255,255,255,0.1)' : 'transparent'};color:${p => p.isSelected ? '#fff' : 'rgba(255,255,255,0.8)'};&:hover{background-color:rgba(255,255,255,0.15);color:#fff}&:not(:last-child){border-bottom:1px solid rgba(255,255,255,0.1);}`;
const ArrowIcon = styled.span<{ isOpen: boolean }>`display:inline-flex;align-items:center;transform:${p => p.isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};transition:transform .2s ease;font-size:12px;`;

interface InputCodeProps {
    request: ApiRequest;
    onRequestChange?: (request: ApiRequest) => void;
}

const MIN_EDITOR_LINES = 3;
const PARSE_DEBOUNCE_MS = 220;

/** Pads `value` with empty lines at the bottom so the editor always shows at least MIN_EDITOR_LINES lines. */
const padToMinLines = (value: string): string => {
    if (!value) return '\n'.repeat(MIN_EDITOR_LINES - 1);
    const lineCount = value.split('\n').length;
    if (lineCount >= MIN_EDITOR_LINES) return value;
    return value + '\n'.repeat(MIN_EDITOR_LINES - lineCount);
};

/**
 * Inserts `newEntry` right after the last non-empty line in `currentValue`.
 * Always inserts a real new line (the editor grows by 1) and re-pads to
 * MIN_EDITOR_LINES if needed.
 * Returns the resulting string and the 1-based line number of the inserted entry.
 */
const insertAfterLastContent = (currentValue: string, newEntry: string): { value: string; lineNumber: number } => {
    const lines = currentValue.split('\n');
    let lastContentIndex = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].trim().length > 0) {
            lastContentIndex = i;
            break;
        }
    }

    if (lastContentIndex < 0) {
        // Editor is empty: insert a new entry line at the top, then MIN padding below
        const newLines = [newEntry, ...Array(MIN_EDITOR_LINES).fill('')];
        return { value: newLines.join('\n'), lineNumber: 1 };
    }

    // Has content: insert new entry right after last content line
    const newEntryIndex = lastContentIndex + 1;
    const newLines: string[] = [
        ...lines.slice(0, newEntryIndex),
        newEntry,
        ...lines.slice(newEntryIndex),
    ];

    // Trim trailing empty lines that come AFTER the newly inserted slot,
    // preserving the slot itself so it's a visible new line
    while (newLines.length > newEntryIndex + 1 && newLines[newLines.length - 1].trim() === '') {
        newLines.pop();
    }
    while (newLines.length < MIN_EDITOR_LINES) {
        newLines.push('');
    }

    return {
        value: newLines.join('\n'),
        lineNumber: newEntryIndex + 1,
    };
};

/**
 * Shows `ghostText` as a faded italic overlay at the start of `lineNumber`.
 * Uses a Monaco content widget so it renders reliably across all Monaco versions.
 * Automatically removed when the user types on that line or moves to another.
 */
const addGhostTextDecoration = (editor: any, model: any, lineNumber: number, ghostText: string): void => {
    const widgetId = `ghost-text-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const domNode = document.createElement('span');
    domNode.textContent = ghostText;
    domNode.style.cssText = [
        'opacity:0.38',
        'font-style:italic',
        'pointer-events:none',
        'user-select:none',
        'white-space:nowrap',
        'font-family:inherit',
        'font-size:inherit',
        'letter-spacing:inherit',
        'line-height:inherit',
    ].join(';');

    const widget = {
        getId: () => widgetId,
        getDomNode: () => domNode,
        getPosition: () => ({
            position: { lineNumber, column: 1 },
            preference: [0], // ContentWidgetPositionPreference.EXACT
        }),
    };

    editor.addContentWidget(widget);

    const remove = () => {
        editor.removeContentWidget(widget);
        contentListener.dispose();
        cursorListener.dispose();
    };

    const contentListener = model.onDidChangeContent(() => remove());
    const cursorListener = editor.onDidChangeCursorPosition((e: any) => {
        if (e.position.lineNumber !== lineNumber) remove();
    });
};

const NoBodyMessage = styled.div`
    padding-left: 4px;
    background-color: var(--vscode-editor-background);
    color: var(--vscode-descriptionForeground);
    font-size: 13px;
`;

export const InputCode: React.FC<InputCodeProps & { bodyFormat: BodyFormat; onFormatChange: (format: BodyFormat) => void }> = ({ request, onRequestChange, bodyFormat, onFormatChange }) => {
    const [bodyFormatOpen, setBodyFormatOpen] = React.useState(false);
    const formatMenuRef = React.useRef<HTMLDivElement>(null);
    const methodSupportsBody = !['GET', 'HEAD', 'OPTIONS', 'DELETE'].includes((request.method || '').toUpperCase());
    const requestRef = React.useRef(request);
    const queryDebounceRef = React.useRef<number | null>(null);
    const headersDebounceRef = React.useRef<number | null>(null);
    const bodyDebounceRef = React.useRef<number | null>(null);

    React.useEffect(() => {
        requestRef.current = request;
    }, [request]);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (formatMenuRef.current && !formatMenuRef.current.contains(event.target as Node)) {
                setBodyFormatOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatQueryParameters = (params: QueryParameter[] | undefined): string => {
        if (!Array.isArray(params)) return '';
        return params
            .filter(p => p.key || p.value)
            .map(p => {
                const key = (p.key || '').trim();
                const value = p.value ?? '';
                const separator = getSeparatorFromMeta(p.id, value.length > 0 ? ':' : undefined);

                if (!key) {
                    return value;
                }

                if (value.length > 0) {
                    return separator === '=' ? `${key}=${value}` : `${key}: ${value}`;
                }

                return separator ? `${key}${separator}` : key;
            })
            .join('\n');
    };

    const formatHeaders = (headers: HeaderParameter[] | undefined): string => {
        if (!Array.isArray(headers)) return '';
        return headers
            .filter(h => h.key || h.value)
            .map(h => {
                const key = (h.key || '').trim();
                const value = h.value ?? '';
                const hasExplicitSeparator = getSeparatorFromMeta(h.id, undefined) === ':';
                if (!key) {
                    return value;
                }
                if (value.length > 0) {
                    return `${key}: ${value}`;
                }
                return hasExplicitSeparator ? `${key}:` : key;
            })
            .join('\n');
    };

    const [queryEditorValue, setQueryEditorValue] = React.useState(() =>
        padToMinLines(formatQueryParameters(request.queryParameters))
    );
    const [headersEditorValue, setHeadersEditorValue] = React.useState(() =>
        padToMinLines(formatHeaders(request.headers))
    );
    const [bodyEditorValue, setBodyEditorValue] = React.useState(() =>
        padToMinLines(request.body || '')
    );

    const clearPendingCommits = React.useCallback(() => {
        if (queryDebounceRef.current) {
            window.clearTimeout(queryDebounceRef.current);
            queryDebounceRef.current = null;
        }
        if (headersDebounceRef.current) {
            window.clearTimeout(headersDebounceRef.current);
            headersDebounceRef.current = null;
        }
        if (bodyDebounceRef.current) {
            window.clearTimeout(bodyDebounceRef.current);
            bodyDebounceRef.current = null;
        }
    }, []);

    React.useEffect(() => {
        return () => clearPendingCommits();
    }, [clearPendingCommits]);

    const requestIdentity = `${request.id}|${request.method}|${request.url}|${request.name}`;

    const parseQueryParameters = React.useCallback((text: string): QueryParameter[] => {
        if (!text.trim()) return [];
        return text.split('\n').filter(line => line.trim()).map((line, index) => {
            const colonIndex = line.indexOf(':');
            const equalsIndex = line.indexOf('=');
            const hasColon = colonIndex >= 0;
            const hasEquals = equalsIndex >= 0;

            let separatorIndex = -1;
            if (hasColon && hasEquals) {
                separatorIndex = Math.min(colonIndex, equalsIndex);
            } else if (hasColon) {
                separatorIndex = colonIndex;
            } else if (hasEquals) {
                separatorIndex = equalsIndex;
            }

            if (separatorIndex < 0) {
                return { id: Date.now().toString() + index, key: line.trim(), value: '' };
            }
            const key = line.slice(0, separatorIndex).trim();
            const paramValue = line.slice(separatorIndex + 1).trim();
            const separator: InlineSeparator = line[separatorIndex] === '=' ? '=' : ':';
            return {
                id: withSeparatorMeta(Date.now().toString() + index, separator),
                key: key || '',
                value: paramValue || ''
            };
        });
    }, []);

    const parseHeaders = React.useCallback((text: string): HeaderParameter[] => {
        if (!text.trim()) return [];
        return text.split('\n').filter(line => line.trim()).map((line, index) => {
            const separatorIndex = line.indexOf(':');
            if (separatorIndex < 0) {
                return { id: Date.now().toString() + index, key: line.trim(), value: '' };
            }
            const key = line.slice(0, separatorIndex).trim();
            const headerValue = line.slice(separatorIndex + 1).trim();
            return {
                id: withSeparatorMeta(Date.now().toString() + index, ':'),
                key: key || '',
                value: headerValue || ''
            };
        });
    }, []);

    const handleQueryParametersChange = (value: string | undefined) => {
        const nextText = value || '';
        setQueryEditorValue(nextText);

        if (queryDebounceRef.current) {
            window.clearTimeout(queryDebounceRef.current);
        }
        queryDebounceRef.current = window.setTimeout(() => {
            onRequestChange?.({ ...requestRef.current, queryParameters: parseQueryParameters(nextText) });
        }, PARSE_DEBOUNCE_MS);
    };

    const handleHeadersChange = (value: string | undefined) => {
        const nextText = value || '';
        setHeadersEditorValue(nextText);

        if (headersDebounceRef.current) {
            window.clearTimeout(headersDebounceRef.current);
        }
        headersDebounceRef.current = window.setTimeout(() => {
            onRequestChange?.({ ...requestRef.current, headers: parseHeaders(nextText) });
        }, PARSE_DEBOUNCE_MS);
    };

    const handleBodyChange = (value: string | undefined) => {
        const text = value || '';
        setBodyEditorValue(text);

        // Helper to parse simple editor-format form-data lines into structured params
        const parseFormDataFromText = (txt: string) => {
            const lines = txt.split('\n').map(l => l.trim()).filter(Boolean);
            const params: any[] = [];
            for (const line of lines) {
                // Ignore section markers if user pastes raw Hurl sections
                if (/^\[(?:FormData|Multipart|MultipartFormData|FormUrlEncoded|Form|FormParams)\]/i.test(line)) {
                    continue;
                }

                // key: file,filepath; contentType (Hurl multipart file syntax)
                const hurlFile = line.match(/^([^:]+):\s*file,([^;]+);(?:\s*(.+))?$/i);
                if (hurlFile) {
                    params.push({
                        id: `f-${Date.now().toString(36)}`,
                        key: hurlFile[1].trim(),
                        filePath: hurlFile[2].trim(),
                        contentType: hurlFile[3]?.trim() || 'application/octet-stream'
                    });
                    continue;
                }

                // key: @file: contentType
                const fileAt = line.match(/^([^:]+):\s*@file:\s*(.+)$/i);
                if (fileAt) {
                    params.push({ id: `f-${Date.now().toString(36)}`, key: fileAt[1].trim(), filePath: undefined, contentType: fileAt[2].trim() });
                    continue;
                }

                // key: filename: contentType  (file with content type)
                // Detect files by checking if value contains a dot (file extension)
                // [^:{["]+  prevents matching when the middle part starts with JSON characters ({ [ ")
                const kvct = line.match(/^([^:]+):\s*([^:{["]+):\s*(.+)$/);
                if (kvct) {
                    const filename = kvct[2].trim();
                    const contentType = kvct[3].trim();
                    // If it looks like a filename (contains dot), treat as file
                    if (filename.includes('.')) {
                        params.push({ id: `f-${Date.now().toString(36)}`, key: kvct[1].trim(), filePath: filename, contentType });
                    } else {
                        // Otherwise treat as value with content type
                        params.push({ id: `f-${Date.now().toString(36)}`, key: kvct[1].trim(), value: filename, contentType });
                    }
                    continue;
                }

                // key: value
                const kv = line.match(/^([^:]+):\s*(.+)$/);
                if (kv) {
                    params.push({ id: `f-${Date.now().toString(36)}`, key: kv[1].trim(), value: kv[2].trim() });
                    continue;
                }
            }
            return params;
        };

        const parseFormUrlEncodedFromText = (txt: string) => {
            const lines = txt.split('\n').map(l => l.trim()).filter(Boolean);
            const params: any[] = [];
            for (const line of lines) {
                // Ignore section marker if user pastes raw Hurl sections
                if (/^\[(?:FormUrlEncoded|Form|FormParams|FormData|Multipart|MultipartFormData)\]/i.test(line)) {
                    continue;
                }
                // key: value  OR key=value
                const m = line.match(/^([^:=]+)[:=]\s*(.*)$/);
                if (m) {
                    params.push({ id: `fue-${Date.now().toString(36)}`, key: m[1].trim(), value: m[2].trim() });
                }
            }
            return params;
        };

        const parseBinaryFromText = (txt: string) => {
            const lines = txt.split('\n').map(l => l.trim()).filter(Boolean);
            const files: any[] = [];
            for (const line of lines) {
                // Ignore section markers if user pastes raw Hurl sections
                if (/^\[(?:Binary|FormData|Multipart|MultipartFormData|FormUrlEncoded|Form|FormParams)\]/i.test(line)) {
                    continue;
                }

                // Editor shorthand for binary file: @file: contentType
                const atFile = line.match(/^@file:\s*(.+)$/i);
                if (atFile) {
                    files.push({
                        id: `bf-${Date.now().toString(36)}`,
                        filePath: '',
                        contentType: atFile[1].trim()
                    });
                    continue;
                }

                // Native Hurl file-body syntax: file,<path>;
                const hurlFileBody = line.match(/^file,([^;]+);(?:\s*(.+))?$/i);
                if (hurlFileBody) {
                    files.push({
                        id: `bf-${Date.now().toString(36)}`,
                        filePath: hurlFileBody[1].trim(),
                        contentType: hurlFileBody[2]?.trim() || 'application/octet-stream'
                    });
                    continue;
                }

                // After selecting a file in code mode, line becomes:
                // /absolute/path/file.ext: application/octet-stream
                const selectedFileLine = line.match(/^(.*):\s*([A-Za-z0-9.+-]+\/[A-Za-z0-9.+-]+(?:\s*;.*)?)$/);
                if (selectedFileLine) {
                    files.push({
                        id: `bf-${Date.now().toString(36)}`,
                        filePath: selectedFileLine[1].trim(),
                        contentType: selectedFileLine[2].trim() || 'application/octet-stream'
                    });
                    continue;
                }

                // Backward compatibility for commented binary metadata
                const commentFile = line.match(/^#\s*filePath:\s*([^,]+),\s*contentType:\s*(.+)$/i);
                if (commentFile) {
                    files.push({
                        id: `bf-${Date.now().toString(36)}`,
                        filePath: commentFile[1].trim(),
                        contentType: commentFile[2].trim()
                    });
                }
            }
            return files;
        };

        if (bodyFormat === 'form-data') {
            const parsed = parseFormDataFromText(text);
            if (bodyDebounceRef.current) {
                window.clearTimeout(bodyDebounceRef.current);
            }
            bodyDebounceRef.current = window.setTimeout(() => {
                onRequestChange?.({
                    ...requestRef.current,
                    body: text,
                    bodyFormData: parsed,
                    bodyFormUrlEncoded: [],
                    bodyBinaryFiles: []
                });
            }, PARSE_DEBOUNCE_MS);
            return;
        }

        if (bodyFormat === 'form-urlencoded') {
            const parsed = parseFormUrlEncodedFromText(text);
            if (bodyDebounceRef.current) {
                window.clearTimeout(bodyDebounceRef.current);
            }
            bodyDebounceRef.current = window.setTimeout(() => {
                onRequestChange?.({
                    ...requestRef.current,
                    body: text,
                    bodyFormUrlEncoded: parsed,
                    bodyFormData: [],
                    bodyBinaryFiles: []
                });
            }, PARSE_DEBOUNCE_MS);
            return;
        }

        if (bodyFormat === 'binary') {
            const parsed = parseBinaryFromText(text);
            if (bodyDebounceRef.current) {
                window.clearTimeout(bodyDebounceRef.current);
            }
            bodyDebounceRef.current = window.setTimeout(() => {
                onRequestChange?.({
                    ...requestRef.current,
                    body: text,
                    bodyBinaryFiles: parsed,
                    bodyFormData: [],
                    bodyFormUrlEncoded: []
                });
            }, PARSE_DEBOUNCE_MS);
            return;
        }

        if (bodyDebounceRef.current) {
            window.clearTimeout(bodyDebounceRef.current);
        }
        bodyDebounceRef.current = window.setTimeout(() => {
            onRequestChange?.({ ...requestRef.current, body: text });
        }, PARSE_DEBOUNCE_MS);
    };

    const handleFormatChange = (format: BodyFormat) => {
        onFormatChange(format);
        setBodyFormatOpen(false);
    };

    const getBodyEditorValue = (targetRequest: ApiRequest): string => {
        const body = targetRequest.body || '';
        if (bodyFormat === 'form-data') {
            const filtered = body
                .split('\n')
                .filter(line => !/^\s*\[(?:FormData|Multipart|MultipartFormData)\]\s*$/i.test(line))
                .join('\n');
            // If body text is empty but structured entries exist, reconstruct from bodyFormData
            if (!filtered.trim() && targetRequest.bodyFormData && targetRequest.bodyFormData.length > 0) {
                return targetRequest.bodyFormData.map(param => {
                    if (param.filePath) {
                        return `${param.key}: file,${param.filePath};${param.contentType ? ' ' + param.contentType : ''}`;
                    }
                    return `${param.key}: ${param.value || ''}`;
                }).join('\n');
            }
            return filtered;
        }
        if (bodyFormat === 'form-urlencoded') {
            const filtered = body
                .split('\n')
                .filter(line => !/^\s*\[(?:FormUrlEncoded|Form|FormParams)\]\s*$/i.test(line))
                .join('\n');
            // If body text is empty but structured entries exist, reconstruct from bodyFormUrlEncoded
            if (!filtered.trim() && targetRequest.bodyFormUrlEncoded && targetRequest.bodyFormUrlEncoded.length > 0) {
                return targetRequest.bodyFormUrlEncoded.map(param => `${param.key}: ${param.value || ''}`).join('\n');
            }
            return filtered;
        }
        return body;
    };

    React.useEffect(() => {
        clearPendingCommits();
        setQueryEditorValue(padToMinLines(formatQueryParameters(request.queryParameters)));
        setHeadersEditorValue(padToMinLines(formatHeaders(request.headers)));
        setBodyEditorValue(padToMinLines(getBodyEditorValue(request)));
        // We only resync editor text when changing the active request.
        // Per-keystroke request updates are handled by local state + debounce.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestIdentity, clearPendingCommits]);

    React.useEffect(() => {
        if (queryDebounceRef.current) {
            return;
        }
        const next = padToMinLines(formatQueryParameters(request.queryParameters));
        setQueryEditorValue(prev => (prev === next ? prev : next));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [request.queryParameters]);

    React.useEffect(() => {
        if (headersDebounceRef.current) {
            return;
        }
        const next = padToMinLines(formatHeaders(request.headers));
        setHeadersEditorValue(prev => (prev === next ? prev : next));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [request.headers]);

    React.useEffect(() => {
        if (bodyDebounceRef.current) {
            return;
        }
        const next = padToMinLines(getBodyEditorValue(request));
        setBodyEditorValue(prev => (prev === next ? prev : next));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [request.body, request.bodyFormData, request.bodyFormUrlEncoded, request.bodyBinaryFiles, bodyFormat]);

    React.useEffect(() => {
        if (bodyDebounceRef.current) {
            window.clearTimeout(bodyDebounceRef.current);
            bodyDebounceRef.current = null;
        }
        setBodyEditorValue(padToMinLines(getBodyEditorValue(requestRef.current)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bodyFormat]);

    // Code lenses (ported from `Input.tsx`)
    const queryParamsCodeLenses = React.useMemo(() => [
        {
            id: 'add-query-param',
            title: '$(add) Add Query Parameter',
            shouldShow: (model: any) => true,
            getLineNumber: (model: any) => 1,
            onExecute: (editor: any, model: any) => {
                const { value: newValue, lineNumber } = insertAfterLastContent(model.getValue(), '');
                editor.executeEdits('add-query-param', [{ range: model.getFullModelRange(), text: newValue }]);
                setTimeout(() => {
                    editor.setPosition({ lineNumber, column: 1 });
                    editor.focus();
                    addGhostTextDecoration(editor, model, lineNumber, 'key: value');
                }, 0);
            }
        },
        // TODO: Add AI generation for query parameters
        // {
        //     id: 'generate-query-params',
        //     title: '$(wand) Generate',
        //     shouldShow: (model: any) => true,
        //     getLineNumber: (model: any) => 1,
        //     onExecute: (editor: any, model: any) => {
        //         console.log('Generate query parameters');
        //         // Placeholder for AI generation
        //     }
        // }
    ], []);

    const headersCodeLenses = React.useMemo(() => [
        {
            id: 'add-header',
            title: '$(add) Add Header',
            shouldShow: (model: any) => true,
            getLineNumber: (model: any) => 1,
            onExecute: (editor: any, model: any) => {
                const { value: newValue, lineNumber } = insertAfterLastContent(model.getValue(), '');
                editor.executeEdits('add-header', [{ range: model.getFullModelRange(), text: newValue }]);
                setTimeout(() => {
                    editor.setPosition({ lineNumber, column: 1 });
                    editor.focus();
                    addGhostTextDecoration(editor, model, lineNumber, 'Content-Type: application/json');
                }, 0);
            }
        },
        // TODO: Add AI generation for headers
        // {
        //     id: 'generate-headers',
        //     title: '$(wand) Generate',
        //     shouldShow: (model: any) => true,
        //     getLineNumber: (model: any) => 1,
        //     onExecute: (editor: any, model: any) => {
        //         console.log('Generate headers');
        //         // Placeholder for AI generation
        //     }
        // }
    ], []);

    const bodyCodeLenses = React.useMemo(() => {
        const lenses: any[] = [
            {
                id: (bodyFormat === 'form-data' || bodyFormat === 'form-urlencoded') ? 'add-parameter' : 'add-body',
                title: (bodyFormat === 'form-data' || bodyFormat === 'form-urlencoded') ? '$(add) Add Parameter' : '$(add) Add Body',
                shouldShow: (model: any) => {
                    if (bodyFormat === 'form-data' || bodyFormat === 'form-urlencoded') {
                        return true;
                    }
                    if (bodyFormat === 'binary' || bodyFormat === 'no-body') {
                        return false;
                    }
                    return !model.getValue().trim();
                },
                getLineNumber: (model: any) => 1,
                onExecute: (editor: any, model: any) => {
                    if (bodyFormat === 'form-urlencoded') {
                        const { value: newValue, lineNumber } = insertAfterLastContent(model.getValue(), '');
                        editor.executeEdits('add-parameter', [{ range: model.getFullModelRange(), text: newValue }]);
                        setTimeout(() => {
                            editor.setPosition({ lineNumber, column: 1 });
                            editor.focus();
                            addGhostTextDecoration(editor, model, lineNumber, 'key: value');
                        }, 0);
                    } else if (bodyFormat === 'form-data') {
                        const { value: newValue, lineNumber } = insertAfterLastContent(model.getValue(), '');
                        editor.executeEdits('add-parameter', [{ range: model.getFullModelRange(), text: newValue }]);
                        setTimeout(() => {
                            editor.setPosition({ lineNumber, column: 1 });
                            editor.focus();
                            addGhostTextDecoration(editor, model, lineNumber, 'key: value');
                        }, 0);
                    } else {
                        const sampleBody = '{\n  "key": "value"\n}';

                        editor.executeEdits('add-body', [{
                            range: model.getFullModelRange(),
                            text: sampleBody
                        }]);

                        setTimeout(() => {
                            editor.setPosition({ lineNumber: 2, column: 3 });
                            editor.focus();
                        }, 0);
                    }
                }
            }
        ];

        // Add "Add File" lens for form-data and binary
        if (bodyFormat === 'form-data' || bodyFormat === 'binary') {
            lenses.push({
                id: 'add-file',
                title: '$(add) Add File',
                shouldShow: (model: any) => true,
                getLineNumber: (model: any) => 1,
                onExecute: (editor: any, model: any) => {
                    if (bodyFormat === 'binary') {
                        const { value: newValue, lineNumber } = insertAfterLastContent(model.getValue(), '');
                        editor.executeEdits('add-file', [{ range: model.getFullModelRange(), text: newValue }]);
                        setTimeout(() => {
                            editor.setPosition({ lineNumber, column: 1 });
                            editor.focus();
                            addGhostTextDecoration(editor, model, lineNumber, '@file: application/octet-stream');
                        }, 0);
                    } else {
                        // For form-data, add as a new parameter line
                        const { value: newValue, lineNumber } = insertAfterLastContent(model.getValue(), '');
                        editor.executeEdits('add-file', [{ range: model.getFullModelRange(), text: newValue }]);
                        setTimeout(() => {
                            editor.setPosition({ lineNumber, column: 1 });
                            editor.focus();
                            addGhostTextDecoration(editor, model, lineNumber, 'key: @file: application/octet-stream');
                        }, 0);
                    }
                }
            });
        }

        // Add format lens for non-form formats
        if (bodyFormat !== 'form-data' && bodyFormat !== 'form-urlencoded') {
            lenses.push({
                id: 'format-body',
                title: '$(symbol-keyword) Format',
                shouldShow: (model: any) => {
                    const value = model.getValue().trim();
                    if (!value) return false;
                    try {
                        JSON.parse(value);
                        return true;
                    } catch {
                        return false;
                    }
                },
                getLineNumber: (model: any) => 1,
                onExecute: (editor: any, model: any) => {
                    try {
                        const value = model.getValue();
                        const formatted = JSON.stringify(JSON.parse(value), null, 2);

                        editor.executeEdits('format-body', [{
                            range: model.getFullModelRange(),
                            text: formatted
                        }]);
                    } catch (error) {
                        console.error('Failed to format JSON:', error);
                    }
                }
            });
        }

        // TODO: Add AI generation for body content
        // // Always add generate lens
        // lenses.push({
        //     id: 'generate-body',
        //     title: '$(wand) Generate',
        //     shouldShow: (model: any) => true,
        //     getLineNumber: (model: any) => 1,
        //     onExecute: (editor: any, model: any) => {
        //         console.log('Generate body');
        //         // Placeholder for AI generation
        //     }
        // });

        return lenses;
    }, [bodyFormat]);


    return (
        <>
            <Typography variant="h3" sx={{ margin: '4px 0 10px 0', fontWeight: 'lighter' }}> Query Parameters  </Typography>
            <InputEditor
                minHeight='calc((100vh - 420px) / 3)'
                onChange={handleQueryParametersChange}
                value={queryEditorValue}
                codeLenses={queryParamsCodeLenses}
                suggestions={{ queryKeys: COMMON_QUERY_KEYS }}
            />

            <Typography variant="h3" sx={{ margin: '10px 0', fontWeight: 'lighter' }}> Headers </Typography>
            <InputEditor
                minHeight='calc((100vh - 420px) / 3)'
                onChange={handleHeadersChange}
                value={headersEditorValue}
                codeLenses={headersCodeLenses}
                suggestions={{ headers: COMMON_HEADERS }}
            />

            {methodSupportsBody && bodyFormat !== 'no-body' && (
                <>
                    <BodyHeaderContainer>
                        <BodyTitleWrapper>
                            <Typography variant="h3" sx={{ margin: 0, fontWeight: 'lighter' }}> Body </Typography>
                        </BodyTitleWrapper>
                        <FormatSelectorWrapper ref={formatMenuRef}>
                            <FormatButton onClick={() => setBodyFormatOpen(!bodyFormatOpen)}>
                                {bodyFormat.toUpperCase()}
                                <ArrowIcon isOpen={bodyFormatOpen}>▼</ArrowIcon>
                            </FormatButton>
                            <FormatDropdown isOpen={bodyFormatOpen}>
                                {[{group:'Form', options:[{label:'Multipart Form', value:'form-data'},{label:'Form URL Encoded', value:'form-urlencoded'}]},{group:'Raw', options:[{label:'JSON', value:'json'},{label:'XML', value:'xml'},{label:'TEXT', value:'text'},{label:'JavaScript', value:'javascript'},{label:'HTML', value:'html'}]},{group:'Other', options:[{label:'File / Binary', value:'binary'},{label:'No Body', value:'no-body'}]}].map((group)=> (
                                    <div key={group.group}>
                                        <FormatGroupTitle>{group.group}</FormatGroupTitle>
                                        <FormatOptions>
                                            {group.options.map((option:any) => (
                                                <FormatOption key={option.value} isSelected={bodyFormat === option.value} onClick={() => handleFormatChange(option.value)}>
                                                    {option.label}
                                                </FormatOption>
                                            ))}
                                        </FormatOptions>
                                    </div>
                                ))}
                            </FormatDropdown>
                        </FormatSelectorWrapper>
                    </BodyHeaderContainer>
                    <InputEditor
                        key={`body-editor-${bodyFormat}`}
                        minHeight='calc((100vh - 420px) / 3)'
                        onChange={handleBodyChange}
                        value={bodyEditorValue}
                        codeLenses={bodyCodeLenses}
                        suggestions={{ bodySnippets: COMMON_BODY_SNIPPETS }}
                        bodyFormat={bodyFormat}
                    />
                </>
            )}

            {methodSupportsBody && bodyFormat === 'no-body' && (
                <BodyHeaderContainer>
                    <BodyTitleWrapper>
                        <Typography variant="h3" sx={{ fontWeight: 'lighter' }}>Body</Typography>
                    </BodyTitleWrapper>
                    <FormatSelectorWrapper ref={formatMenuRef}>
                        <FormatButton onClick={() => setBodyFormatOpen(!bodyFormatOpen)}>
                            {bodyFormat.toUpperCase()}
                            <ArrowIcon isOpen={bodyFormatOpen}>▼</ArrowIcon>
                        </FormatButton>
                        <FormatDropdown isOpen={bodyFormatOpen}>
                            {[{group:'Form', options:[{label:'Multipart Form', value:'form-data'},{label:'Form URL Encoded', value:'form-urlencoded'}]},{group:'Raw', options:[{label:'JSON', value:'json'},{label:'XML', value:'xml'},{label:'TEXT', value:'text'},{label:'JavaScript', value:'javascript'},{label:'HTML', value:'html'}]},{group:'Other', options:[{label:'File / Binary', value:'binary'},{label:'No Body', value:'no-body'}]}].map((group)=> (
                                <div key={group.group}>
                                    <FormatGroupTitle>{group.group}</FormatGroupTitle>
                                    <FormatOptions>
                                        {group.options.map((option:any) => (
                                            <FormatOption key={option.value} isSelected={bodyFormat === option.value} onClick={() => handleFormatChange(option.value)}>
                                                {option.label}
                                            </FormatOption>
                                        ))}
                                    </FormatOptions>
                                </div>
                            ))}
                        </FormatDropdown>
                    </FormatSelectorWrapper>
                </BodyHeaderContainer>
            )}

            {methodSupportsBody && bodyFormat === 'no-body' && (
                <NoBodyMessage>No body will be sent with this request</NoBodyMessage>
            )}
        </>
    );
};

export default InputCode;
