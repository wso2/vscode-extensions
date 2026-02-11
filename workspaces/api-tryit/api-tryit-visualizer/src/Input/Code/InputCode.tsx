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
import { InputEditor } from '../InputEditor/InputEditor';
import { COMMON_HEADERS, COMMON_QUERY_KEYS, COMMON_BODY_SNIPPETS } from '../InputEditor/SuggestionsConstants';
import styled from '@emotion/styled';
import { QueryParameter, HeaderParameter, ApiRequest } from '@wso2/api-tryit-core';

type BodyFormat = 'json' | 'xml' | 'text' | 'html' | 'javascript' | 'form-data' | 'form-urlencoded' | 'binary' | 'no-body';

const BodyHeaderContainer = styled.div`display:flex;align-items:center;justify-content:space-between;margin:8px 0;gap:12px;`;
const BodyTitleWrapper = styled.div`display:flex;align-items:center;gap:8px;flex:1;`;
const FormatSelectorWrapper = styled.div`position:relative;display:flex;justify-content:flex-end;`;
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

const NoBodyMessage = styled.div`
    padding-left: 4px;
    background-color: var(--vscode-editor-background);
    color: var(--vscode-descriptionForeground);
    font-size: 13px;
`;

export const InputCode: React.FC<InputCodeProps & { bodyFormat: BodyFormat; onFormatChange: (format: BodyFormat) => void }> = ({ request, onRequestChange, bodyFormat, onFormatChange }) => {
    const [bodyFormatOpen, setBodyFormatOpen] = React.useState(false);
    const formatMenuRef = React.useRef<HTMLDivElement>(null);

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
        return params.filter(p => p.key || p.value).map(p => p.value ? `${p.key}: ${p.value}` : p.key).join('\n');
    };

    const formatHeaders = (headers: HeaderParameter[] | undefined): string => {
        if (!Array.isArray(headers)) return '';
        return headers.filter(h => h.key || h.value).map(h => h.value ? `${h.key}: ${h.value}` : h.key).join('\n');
    };

    const handleQueryParametersChange = (value: string | undefined) => {
        const parseQueryParameters = (text: string) => {
            if (!text.trim()) return [] as QueryParameter[];
            return text.split('\n').filter(line => line.trim()).map((line, index) => {
                const [key, value] = line.split(':').map(s => s.trim());
                return { id: Date.now().toString() + index, key: key || '', value: value || '' };
            });
        };
        onRequestChange?.({ ...request, queryParameters: parseQueryParameters(value || '') });
    };

    const handleHeadersChange = (value: string | undefined) => {
        const parseHeaders = (text: string) => {
            if (!text.trim()) return [] as HeaderParameter[];
            return text.split('\n').filter(line => line.trim()).map((line, index) => {
                const [key, value] = line.split(':').map(s => s.trim());
                return { id: Date.now().toString() + index, key: key || '', value: value || '' };
            });
        };
        onRequestChange?.({ ...request, headers: parseHeaders(value || '') });
    };

    const handleBodyChange = (value: string | undefined) => {
        onRequestChange?.({ ...request, body: value || '' });
    };

    const handleFormatChange = (format: BodyFormat) => {
        onFormatChange(format);
        setBodyFormatOpen(false);
    };

    // Code lenses (ported from `Input.tsx`)
    const queryParamsCodeLenses = React.useMemo(() => [
        {
            id: 'add-query-param',
            title: '$(add) Add Query Parameter',
            shouldShow: (model: any) => true,
            getLineNumber: (model: any) => 1,
            onExecute: (editor: any, model: any) => {
                const lineCount = model.getLineCount();
                const lastLineLength = model.getLineLength(lineCount);
                const textToInsert = model.getValue() ? '\nkey: value' : 'key: value';

                editor.executeEdits('add-query-param', [{
                    range: {
                        startLineNumber: lineCount,
                        startColumn: lastLineLength + 1,
                        endLineNumber: lineCount,
                        endColumn: lastLineLength + 1
                    },
                    text: textToInsert
                }]);

                // Move cursor to the new line
                setTimeout(() => {
                    editor.setPosition({ lineNumber: model.getLineCount(), column: 1 });
                    editor.focus();
                }, 0);
            }
        },
        {
            id: 'generate-query-params',
            title: '$(wand) Generate',
            shouldShow: (model: any) => true,
            getLineNumber: (model: any) => 1,
            onExecute: (editor: any, model: any) => {
                console.log('Generate query parameters');
                // Placeholder for AI generation
            }
        }
    ], []);

    const headersCodeLenses = React.useMemo(() => [
        {
            id: 'add-header',
            title: '$(add) Add Header',
            shouldShow: (model: any) => true,
            getLineNumber: (model: any) => 1,
            onExecute: (editor: any, model: any) => {
                const lineCount = model.getLineCount();
                const lastLineLength = model.getLineLength(lineCount);
                const textToInsert = model.getValue() ? '\nContent-Type: application/json' : 'Content-Type: application/json';

                editor.executeEdits('add-header', [{
                    range: {
                        startLineNumber: lineCount,
                        startColumn: lastLineLength + 1,
                        endLineNumber: lineCount,
                        endColumn: lastLineLength + 1
                    },
                    text: textToInsert
                }]);

                // Move cursor to the new line
                setTimeout(() => {
                    editor.setPosition({ lineNumber: model.getLineCount(), column: 1 });
                    editor.focus();
                }, 0);
            }
        },
        {
            id: 'generate-headers',
            title: '$(wand) Generate',
            shouldShow: (model: any) => true,
            getLineNumber: (model: any) => 1,
            onExecute: (editor: any, model: any) => {
                console.log('Generate headers');
                // Placeholder for AI generation
            }
        }
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
                        const currentValue = model.getValue();
                        const newValue = currentValue ? currentValue + '\nkey: value: application/json' : 'key: value: application/json';

                        editor.executeEdits('add-parameter', [{
                            range: model.getFullModelRange(),
                            text: newValue
                        }]);

                        // Move cursor to the new line
                        setTimeout(() => {
                            editor.setPosition({ lineNumber: model.getLineCount(), column: 1 });
                            editor.focus();
                        }, 0);
                    } else if (bodyFormat === 'form-data') {
                        const currentValue = model.getValue();
                        const newValue = currentValue ? currentValue + '\nkey: value: application/octet-stream' : 'key: value: application/octet-stream';

                        editor.executeEdits('add-parameter', [{
                            range: model.getFullModelRange(),
                            text: newValue
                        }]);

                        // Move cursor to the new line
                        setTimeout(() => {
                            editor.setPosition({ lineNumber: model.getLineCount(), column: 1 });
                            editor.focus();
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
                        // For binary format, add as a new line (allows multiple files)
                        const currentValue = model.getValue();
                        const newValue = currentValue ? currentValue + '\n@file: application/octet-stream' : '@file: application/octet-stream';
                        editor.executeEdits('add-file', [{
                            range: model.getFullModelRange(),
                            text: newValue
                        }]);
                    } else {
                        // For form-data, add as a new parameter line
                        const currentValue = model.getValue();
                        const newValue = currentValue ? currentValue + '\nkey: @file: application/octet-stream' : 'key: @file: application/octet-stream';

                        editor.executeEdits('add-file', [{
                            range: model.getFullModelRange(),
                            text: newValue
                        }]);
                    }

                    // Move cursor to the new line
                    setTimeout(() => {
                        editor.setPosition({ lineNumber: model.getLineCount(), column: 1 });
                        editor.focus();
                    }, 0);
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

        // Always add generate lens
        lenses.push({
            id: 'generate-body',
            title: '$(wand) Generate',
            shouldShow: (model: any) => true,
            getLineNumber: (model: any) => 1,
            onExecute: (editor: any, model: any) => {
                console.log('Generate body');
                // Placeholder for AI generation
            }
        });

        return lenses;
    }, [bodyFormat]);


    return (
        <>
            <Typography variant="subtitle2" sx={{ margin: '4px 0 10px 0' }}> Query Parameters  </Typography>
            <InputEditor
                minHeight='calc((100vh - 420px) / 3)'
                onChange={handleQueryParametersChange}
                value={formatQueryParameters(request.queryParameters)}
                codeLenses={queryParamsCodeLenses}
                suggestions={{ queryKeys: COMMON_QUERY_KEYS }}
            />

            <Typography variant="subtitle2" sx={{ margin: '10px 0' }}> Headers </Typography>
            <InputEditor
                minHeight='calc((100vh - 420px) / 3)'
                onChange={handleHeadersChange}
                value={formatHeaders(request.headers)}
                codeLenses={headersCodeLenses}
                suggestions={{ headers: COMMON_HEADERS }}
            />

            {bodyFormat !== 'no-body' && request.method !== 'GET' && (
                <>
                    <BodyHeaderContainer>
                        <BodyTitleWrapper>
                            <Typography variant="subtitle2" sx={{ margin: 0 }}> Body </Typography>
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
                        value={request.body || ''}
                        codeLenses={bodyCodeLenses}
                        suggestions={{ bodySnippets: COMMON_BODY_SNIPPETS }}
                        bodyFormat={bodyFormat}
                    />
                </>
            )}

            {bodyFormat === 'no-body' && (
                <BodyHeaderContainer>
                    <BodyTitleWrapper>
                        <Typography variant="h3">Body</Typography>
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

            {bodyFormat === 'no-body' && (
                <NoBodyMessage>No body will be sent with this request</NoBodyMessage>
            )}
        </>
    );
};

export default InputCode;
