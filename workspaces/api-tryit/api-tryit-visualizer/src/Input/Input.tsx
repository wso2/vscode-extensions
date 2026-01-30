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
import { Typography, LinkButton, Codicon } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { ParamItem } from './ParamItem';
import { QueryParameter, HeaderParameter, ApiRequest } from '@wso2/api-tryit-core';
import { CodeTextArea } from '../Components/CodeTextArea/CodeTextArea';
import { CodeInput } from './CodeInput/CodeInput';
import { InputEditor } from './InputEditor/InputEditor';
import { COMMON_HEADERS, COMMON_QUERY_KEYS, COMMON_BODY_SNIPPETS } from './InputEditor/SuggestionsConstants';

type InputMode = 'code' | 'form';
type BodyFormat = 'json' | 'xml' | 'text' | 'html' | 'javascript' | 'form-data' | 'form-urlencoded' | 'binary' | 'no-body';

interface InputProps {
    request: ApiRequest;
    onRequestChange?: (request: ApiRequest) => void;
    mode?: InputMode;
}

const Container = styled.div`
    width: 100%;
    height: calc(100vh - 215px);
    overflow: auto;
`;

const Section = styled.div`
    margin-bottom: 12px;
`;

const AddButtonWrapper = styled.div`
    margin-top: 4px;
    margin-left: 4px;
`;

const BodyHeaderContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 8px 0;
    gap: 12px;
`;

const BodyTitleWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
`;

const FormatSelectorWrapper = styled.div`
    position: relative;
    display: inline-block;
`;

const FormatButton = styled.button`
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: inherit;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: inherit;
    transition: all 0.2s ease;
    
    &:hover {
        background-color: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.3);
    }
    
    &:active {
        background-color: rgba(255, 255, 255, 0.15);
    }
`;

const FormatDropdown = styled.div<{ isOpen: boolean }>`
    position: absolute;
    max-height: 160px;
    overflow: auto;
    top: 100%;
    right: 0;
    margin-top: 4px;
    background: #3e3e42;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    min-width: 180px;
    z-index: 1000;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    display: ${props => props.isOpen ? 'block' : 'none'};
`;

const FormatOption = styled.div<{ isSelected: boolean }>`
    padding: 8px 12px;
    cursor: pointer;
    font-size: 13px;
    background-color: ${props => props.isSelected ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
    color: ${props => props.isSelected ? '#fff' : 'rgba(255, 255, 255, 0.8)'};
    
    &:hover {
        background-color: rgba(255, 255, 255, 0.15);
        color: #fff;
    }
    
    &:not(:last-child) {
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
`;

const FormatGroupTitle = styled.div`
    padding: 8px 10px;
    font-size: 12px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background-color: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    margin: 0;
`;

const ArrowIcon = styled.span<{ isOpen: boolean }>`
    display: inline-flex;
    align-items: center;
    transform: ${props => props.isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
    transition: transform 0.2s ease;
    font-size: 12px;
`;

const FormatOptions = styled.div`
    margin-left: 8px;
`;

export const Input: React.FC<InputProps> = ({ 
    request,
    onRequestChange,
    mode = 'code'
}) => {
    const [bodyFormatOpen, setBodyFormatOpen] = React.useState(false);
    const [bodyFormat, setBodyFormat] = React.useState<BodyFormat>('json');
    const formatMenuRef = React.useRef<HTMLDivElement>(null);

    // Format to Content-Type mapping
    const formatContentTypeMap: Record<BodyFormat, string> = {
        'json': 'application/json',
        'xml': 'application/xml',
        'text': 'text/plain',
        'html': 'text/html',
        'javascript': 'application/javascript',
        'form-data': 'multipart/form-data',
        'form-urlencoded': 'application/x-www-form-urlencoded',
        'binary': 'application/octet-stream',
        'no-body': ''
    };

    const formatOptions = [
        {
            group: 'Form',
            options: [
                { label: 'Multipart Form', value: 'form-data' as BodyFormat },
                { label: 'Form URL Encoded', value: 'form-urlencoded' as BodyFormat }
            ]
        },
        {
            group: 'Raw',
            options: [
                { label: 'JSON', value: 'json' as BodyFormat },
                { label: 'XML', value: 'xml' as BodyFormat },
                { label: 'TEXT', value: 'text' as BodyFormat },
                { label: 'JavaScript', value: 'javascript' as BodyFormat },
                { label: 'HTML', value: 'html' as BodyFormat }
            ]
        },
        {
            group: 'Other',
            options: [
                { label: 'File / Binary', value: 'binary' as BodyFormat },
                { label: 'No Body', value: 'no-body' as BodyFormat }
            ]
        }
    ];

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (formatMenuRef.current && !formatMenuRef.current.contains(event.target as Node)) {
                setBodyFormatOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleFormatChange = (format: BodyFormat) => {
        setBodyFormat(format);
    };

    // Safety check to ensure request object exists with required properties
    if (!request) {
        return <Container><Typography>Loading...</Typography></Container>;
    }

    // Code lenses for Query Parameters editor
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

    // Code lenses for Headers editor
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

    // Code lenses for Body editor
    const bodyCodeLenses = React.useMemo(() => {
        const lenses = [
            {
                id: (bodyFormat === 'form-data' || bodyFormat === 'form-urlencoded') ? 'add-parameter' : 'add-body',
                title: (bodyFormat === 'form-data' || bodyFormat === 'form-urlencoded') ? '$(add) Add Parameter' : '$(add) Add Body',
                shouldShow: (model: any) => (bodyFormat === 'form-data' || bodyFormat === 'form-urlencoded') ? true : !model.getValue().trim(),
                getLineNumber: (model: any) => 1,
                onExecute: (editor: any, model: any) => {
                    if (bodyFormat === 'form-data' || bodyFormat === 'form-urlencoded') {
                        const currentValue = model.getValue();
                        const newValue = currentValue ? currentValue + '\nkey: value' : 'key: value';
                        
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

        // Add "Add File" lens for form-data only
        if (bodyFormat === 'form-data') {
            lenses.push({
                id: 'add-file',
                title: '$(add) Add File',
                shouldShow: (model: any) => true,
                getLineNumber: (model: any) => 1,
                onExecute: (editor: any, model: any) => {
                    const currentValue = model.getValue();
                    const newValue = currentValue ? currentValue + '\nkey=@filename' : 'key=@filename';
                    
                    editor.executeEdits('add-file', [{
                        range: model.getFullModelRange(),
                        text: newValue
                    }]);
                    
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

        // Add delete lens for form formats
        if (bodyFormat === 'form-data' || bodyFormat === 'form-urlencoded') {
            lenses.push({
                id: 'delete-parameter',
                title: '$(trash) Delete',
                shouldShow: (model: any) => {
                    const lines = model.getLinesContent();
                    return lines.some((line: string) => line.trim() && line.includes(':'));
                },
                getLineNumber: (model: any) => {
                    const lines = model.getLinesContent();
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].trim() && lines[i].includes(':')) {
                            return i + 1;
                        }
                    }
                    return 1;
                },
                onExecute: (editor: any, model: any, ...args: any[]) => {
                    const lineNumber = args[0] || editor.getPosition().lineNumber;
                    const lineContent = model.getLineContent(lineNumber);
                    
                    if (lineContent.trim() && lineContent.includes(':')) {
                        // Delete the line
                        editor.executeEdits('delete-parameter', [{
                            range: {
                                startLineNumber: lineNumber,
                                startColumn: 1,
                                endLineNumber: lineNumber,
                                endColumn: model.getLineLength(lineNumber) + 1
                            },
                            text: ''
                        }]);
                        
                        // Adjust cursor if necessary
                        if (lineNumber > model.getLineCount()) {
                            editor.setPosition({ lineNumber: model.getLineCount(), column: 1 });
                        }
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

    const addQueryParam = () => {
        const newParam: QueryParameter = {
            id: Date.now().toString(),
            key: '',
            value: ''
        };
        const updatedRequest = {
            ...request,
            queryParameters: [...(request.queryParameters || []), newParam]
        };
        onRequestChange?.(updatedRequest);
    };

    const updateQueryParam = (id: string, key: string, value: string) => {
        const updatedRequest = {
            ...request,
            queryParameters: (request.queryParameters || []).map(param =>
                param.id === id ? { ...param, key, value } : param
            )
        };
        onRequestChange?.(updatedRequest);
    };

    const deleteQueryParam = (id: string) => {
        const updatedRequest = {
            ...request,
            queryParameters: (request.queryParameters || []).filter(param => param.id !== id)
        };
        onRequestChange?.(updatedRequest);
    };

    const addHeader = () => {
        const newHeader: HeaderParameter = {
            id: Date.now().toString(),
            key: '',
            value: ''
        };
        const updatedRequest = {
            ...request,
            headers: [...(request.headers || []), newHeader]
        };
        onRequestChange?.(updatedRequest);
    };

    const updateHeader = (id: string, key: string, value: string) => {
        const updatedRequest = {
            ...request,
            headers: (request.headers || []).map(header =>
                header.id === id ? { ...header, key, value } : header
            )
        };
        onRequestChange?.(updatedRequest);
    };

    const deleteHeader = (id: string) => {
        const updatedRequest = {
            ...request,
            headers: (request.headers || []).filter(header => header.id !== id)
        };
        onRequestChange?.(updatedRequest);
    };

    const handleBodyChange = (value: string | undefined) => {
        const updatedRequest = {
            ...request,
            body: value || ''
        };
        onRequestChange?.(updatedRequest);
    };

    const formatQueryParameters = (params: QueryParameter[] | undefined): string => {
        if (!Array.isArray(params)) return '';
        return params
            .filter(p => p.key || p.value)
            .map(p => p.value ? `${p.key}: ${p.value}` : p.key)
            .join('\n');
    };

    const formatHeaders = (headers: HeaderParameter[] | undefined): string => {
        if (!Array.isArray(headers)) return '';
        return headers
            .filter(h => h.key || h.value)
            .map(h => h.value ? `${h.key}: ${h.value}` : h.key)
            .join('\n');
    };

    const parseQueryParameters = (text: string): QueryParameter[] => {
        if (!text.trim()) return [];
        return text.split('\n')
            .filter(line => line.trim())
            .map((line, index) => {
                const [key, value] = line.split(':').map(s => s.trim());
                return {
                    id: Date.now().toString() + index,
                    key: key || '',
                    value: value || ''
                };
            });
    };

    const parseHeaders = (text: string): HeaderParameter[] => {
        if (!text.trim()) return [];
        return text.split('\n')
            .filter(line => line.trim())
            .map((line, index) => {
                const [key, value] = line.split(':').map(s => s.trim());
                return {
                    id: Date.now().toString() + index,
                    key: key || '',
                    value: value || ''
                };
            });
    };

    const handleQueryParametersChange = (value: string | undefined) => {
        const updatedRequest = {
            ...request,
            queryParameters: parseQueryParameters(value || '')
        };
        onRequestChange?.(updatedRequest);
    };

    const handleHeadersChange = (value: string | undefined) => {
        const updatedRequest = {
            ...request,
            headers: parseHeaders(value || '')
        };
        onRequestChange?.(updatedRequest);
    };

    return (
        <Container>
            {mode === 'code' ? (
                <>
                    <Typography variant="h3" sx={{ marginBottom: '8px' }}>
                        Query Parameters
                    </Typography>
                    <InputEditor
                        minHeight='calc((100vh - 420px) / 3)'
                        onChange={handleQueryParametersChange}
                        value={formatQueryParameters(request.queryParameters)}
                        codeLenses={queryParamsCodeLenses}
                        suggestions={{ queryKeys: COMMON_QUERY_KEYS }}
                    />
                    <Typography variant="h3" sx={{ margin: '8px 0' }}>
                        Headers
                    </Typography>
                    <InputEditor
                        minHeight='calc((100vh - 420px) / 3)'
                        onChange={handleHeadersChange}
                        value={formatHeaders(request.headers)}
                        codeLenses={headersCodeLenses}
                        suggestions={{ headers: COMMON_HEADERS }}
                    />
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
                                {formatOptions.map((group) => (
                                    <div key={group.group}>
                                        <FormatGroupTitle>{group.group}</FormatGroupTitle>
                                        <FormatOptions>
                                            {group.options.map((option) => (
                                                <FormatOption
                                                    key={option.value}
                                                    isSelected={bodyFormat === option.value}
                                                    onClick={() => handleFormatChange(option.value)}
                                                >
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
                        minHeight='calc((100vh - 420px) / 3)'
                        onChange={handleBodyChange}
                        value={request.body || ''}
                        codeLenses={bodyCodeLenses}
                        suggestions={{ bodySnippets: COMMON_BODY_SNIPPETS }}
                    />
                </>
            ) : (
                <>
                    {/* Query Parameters Section */}
                    <Section>
                        <Typography variant="subtitle2" sx={{ margin: '0 0 12px 0' }}>
                            Query Parameter
                        </Typography>
                        {(request.queryParameters || []).map(param => (
                            <ParamItem
                                key={param.id}
                                keyValue={param.key}
                                value={param.value}
                                onKeyChange={(key) => updateQueryParam(param.id, key, param.value)}
                                onValueChange={(value) => updateQueryParam(param.id, param.key, value)}
                                onDelete={() => deleteQueryParam(param.id)}
                            />
                        ))}
                        <AddButtonWrapper>
                            <LinkButton onClick={addQueryParam}>
                                <Codicon name="add" />
                                Query Parameter
                            </LinkButton>
                        </AddButtonWrapper>
                    </Section>

                    {/* Headers Section */}
                    <Section>
                        <Typography variant="subtitle2" sx={{ margin: '0 0 12px 0' }}>
                            Header
                        </Typography>
                        {(request.headers || []).map(header => (
                            <ParamItem
                                key={header.id}
                                keyValue={header.key}
                                value={header.value}
                                onKeyChange={(key) => updateHeader(header.id, key, header.value)}
                                onValueChange={(value) => updateHeader(header.id, header.key, value)}
                                onDelete={() => deleteHeader(header.id)}
                            />
                        ))}
                        <AddButtonWrapper>
                            <LinkButton onClick={addHeader}>
                                <Codicon name="add" />
                                Header
                            </LinkButton>
                        </AddButtonWrapper>
                    </Section>

                    {/* Body Section */}
                    <Section>
                        <Typography variant="subtitle2" sx={{ margin: '0 0 12px 0' }}>
                            Body
                        </Typography>
                        <CodeTextArea
                            id="body-textarea"
                            resize="vertical"
                            growRange={{ start: 5, offset: 10 }}
                            sx={{ width: '100%', padding: '0 4px' }}
                            value={request.body || ''}
                            onChange={(e: any) => handleBodyChange(e.target.value)}
                            placeholder="Enter request body..."
                        />
                    </Section>
                </>
            )}
        </Container>
    );
};
