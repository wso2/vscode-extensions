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
import { Typography, LinkButton, Codicon } from '@wso2/ui-toolkit';
import { ParamItem } from '../ParamItem';
import { MultipartForm } from './MultipartForm';
import { QueryParameter, HeaderParameter, ApiRequest } from '@wso2/api-tryit-core';
import { CodeTextArea } from '../../Components/CodeTextArea/CodeTextArea';

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
    display: flex;
    justify-content: flex-end;
`;
const FormatButton = styled.button`
    background: transparent;
    border: 1px solid rgba(255,255,255,0.2);
    color: inherit;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: inherit;
    transition: all .2s ease;
`;
const ArrowIcon = styled.span<{ isOpen: boolean }>`
    display: inline-flex;
    align-items: center;
    transform: ${p => p.isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
    transition: transform .2s ease;
    font-size: 12px;
`;
const FormatDropdown = styled.div<{ isOpen: boolean }>`
    position: absolute;
    max-height: 160px;
    overflow: auto;
    top: 100%;
    right: 0;
    margin-top: 4px;
    background: #3e3e42;
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 4px;
    min-width: 180px;
    z-index: 1000;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    display: ${props => props.isOpen ? 'block' : 'none'};
`;
const FormatGroupTitle = styled.div`
    padding: 8px 10px;
    font-size: 12px;
    font-weight: 600;
    color: rgba(255,255,255,0.6);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background-color: rgba(0,0,0,0.2);
    border-bottom: 1px solid rgba(255,255,255,0.1);
    margin: 0;
`;
const FormatOptions = styled.div`
    margin-left: 8px;
`;
const FormatOption = styled.div<{ isSelected: boolean }>`
    padding: 8px 12px;
    cursor: pointer;
    font-size: 13px;
    background-color: ${p => p.isSelected ? 'rgba(255,255,255,0.1)' : 'transparent'};
    color: ${p => p.isSelected ? '#fff' : 'rgba(255,255,255,0.8)'};
    &:hover { background-color: rgba(255,255,255,0.15); color: #fff; }
    &:not(:last-child) { border-bottom: 1px solid rgba(255,255,255,0.1); }
`;
const Section = styled.div`
    margin-bottom: 16px;
    padding: 8px 0;
`;
const AddButtonWrapper = styled.div`
    margin-top: 8px;
    margin-left: 0;
`;
const ParamList = styled.div`
    display: flex;
    flex-direction: column;
    margin-bottom: 8px;
`;
const BinaryFileContainer = styled.div`
    display: flex;
    align-items: center;
    padding: 8px;
    background-color: var(--vscode-editor-background);
    border: 1px dashed var(--vscode-editorGroup-border);
    border-radius: 4px;
`;
const BinaryFileInput = styled.input`
    cursor: pointer;
`;
const NoBodyMessage = styled.div`
    padding: 12px;
    background-color: var(--vscode-editor-background);
    border: 1px solid var(--vscode-editorGroup-border);
    border-radius: 4px;
    color: var(--vscode-descriptionForeground);
    font-size: 13px;
    text-align: center;
`;

interface InputFormProps {
    request: ApiRequest;
    onRequestChange?: (request: ApiRequest) => void;
    bodyFormat: BodyFormat | string;
    updateFormDataParamContentType: (id: string, contentType: string) => void;
    handleFileSelect: (paramId: string) => void;
    onFormatChange?: (format: BodyFormat) => void;
}

type BodyFormat = 'json' | 'xml' | 'text' | 'html' | 'javascript' | 'form-data' | 'form-urlencoded' | 'binary' | 'no-body';

export const InputForm: React.FC<InputFormProps> = ({ request, onRequestChange, bodyFormat, updateFormDataParamContentType, handleFileSelect, onFormatChange }) => {
    const [formatOpen, setFormatOpen] = React.useState(false);
    const formatRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (formatRef.current && !formatRef.current.contains(event.target as Node)) {
                setFormatOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

    const onSelectFormat = (value: BodyFormat) => {
        setFormatOpen(false);
        onFormatChange?.(value);
    };

    const addQueryParam = () => {
        const newParam: QueryParameter = { id: Date.now().toString(), key: '', value: '' };
        onRequestChange?.({ ...request, queryParameters: [...(request.queryParameters || []), newParam] });
    };

    const updateQueryParam = (id: string, key: string, value: string) => {
        onRequestChange?.({ ...request, queryParameters: (request.queryParameters || []).map(param => param.id === id ? { ...param, key, value } : param) });
    };

    const deleteQueryParam = (id: string) => {
        onRequestChange?.({ ...request, queryParameters: (request.queryParameters || []).filter(param => param.id !== id) });
    };

    const addHeader = () => {
        const newHeader: HeaderParameter = { id: Date.now().toString(), key: '', value: '' };
        onRequestChange?.({ ...request, headers: [...(request.headers || []), newHeader] });
    };

    const updateHeader = (id: string, key: string, value: string) => {
        onRequestChange?.({ ...request, headers: (request.headers || []).map(header => header.id === id ? { ...header, key, value } : header) });
    };

    const deleteHeader = (id: string) => {
        onRequestChange?.({ ...request, headers: (request.headers || []).filter(header => header.id !== id) });
    };

    const addFormDataParam = () => {
        const newParam: any = { id: Date.now().toString(), key: '', filePath: '', contentType: '', value: '' };
        onRequestChange?.({ ...request, bodyFormData: [...(request.bodyFormData || []), newParam] });
    };

    const updateFormDataParam = (id: string, key: string, filePath: string, contentType: string, value?: string) => {
        onRequestChange?.({ ...request, bodyFormData: (request.bodyFormData || []).map(param => param.id === id ? { ...param, key, filePath, contentType, value } : param) });
    };

    const deleteFormDataParam = (id: string) => {
        onRequestChange?.({ ...request, bodyFormData: (request.bodyFormData || []).filter(param => param.id !== id) });
    };

    const addFormUrlEncodedParam = () => {
        const newParam = { id: Date.now().toString(), key: '', value: '' };
        onRequestChange?.({ ...request, bodyFormUrlEncoded: [...(request.bodyFormUrlEncoded || []), newParam] });
    };

    const updateFormUrlEncodedParam = (id: string, key: string, value: string) => {
        onRequestChange?.({ ...request, bodyFormUrlEncoded: (request.bodyFormUrlEncoded || []).map(param => param.id === id ? { ...param, key, value } : param) });
    };

    const deleteFormUrlEncodedParam = (id: string) => {
        onRequestChange?.({ ...request, bodyFormUrlEncoded: (request.bodyFormUrlEncoded || []).filter(param => param.id !== id) });
    };


    return (
        <>
            {/* Query Parameters Section */}
            <Section>
                <Typography variant="subtitle2" sx={{ margin: '0 0 12px 0' }}>Query Parameter</Typography>
                <ParamList>
                    {(request.queryParameters || []).map(param => (
                        <ParamItem key={param.id} keyValue={param.key} value={param.value} onKeyChange={(key) => updateQueryParam(param.id, key, param.value)} onValueChange={(value) => updateQueryParam(param.id, param.key, value)} onDelete={() => deleteQueryParam(param.id)} />
                    ))}
                </ParamList>
                <AddButtonWrapper>
                    <LinkButton onClick={addQueryParam}><Codicon name="add" />Query Parameter</LinkButton>
                </AddButtonWrapper>
            </Section>

            {/* Headers Section */}
            <Section>
                <Typography variant="subtitle2" sx={{ margin: '0 0 12px 0' }}>Header</Typography>
                <ParamList>
                    {(request.headers || []).map(header => (
                        <ParamItem key={header.id} keyValue={header.key} value={header.value} onKeyChange={(key) => updateHeader(header.id, key, header.value)} onValueChange={(value) => updateHeader(header.id, header.key, value)} onDelete={() => deleteHeader(header.id)} />
                    ))}
                </ParamList>
                <AddButtonWrapper>
                    <LinkButton onClick={addHeader}><Codicon name="add" />Header</LinkButton>
                </AddButtonWrapper>
            </Section>

            {/* Body Section: form-data, form-urlencoded, binary, and raw handled by parent */}
            <BodyHeaderContainer>
                <BodyTitleWrapper>
                    <Typography variant="subtitle2">Body</Typography>
                </BodyTitleWrapper>
                <FormatSelectorWrapper ref={formatRef}>
                    <FormatButton onClick={() => setFormatOpen(!formatOpen)}>
                        {(bodyFormat || '').toString().toUpperCase()}
                        <ArrowIcon isOpen={formatOpen}>▼</ArrowIcon>
                    </FormatButton>
                    <FormatDropdown isOpen={formatOpen}>
                        {formatOptions.map((group) => (
                            <div key={group.group}>
                                <FormatGroupTitle>{group.group}</FormatGroupTitle>
                                <FormatOptions>
                                    {group.options.map((option:any) => (
                                        <FormatOption key={option.value} isSelected={bodyFormat === option.value} onClick={() => onSelectFormat(option.value)}>
                                            {option.label}
                                        </FormatOption>
                                    ))}
                                </FormatOptions>
                            </div>
                        ))}
                    </FormatDropdown>
                </FormatSelectorWrapper>
            </BodyHeaderContainer>

            {bodyFormat === 'form-data' && (
                <>
                    <MultipartForm
                        items={request.bodyFormData}
                        onAddParam={addFormDataParam}
                        onAddFile={() => onRequestChange?.({ ...request, bodyFormData: [...(request.bodyFormData || []), ({ id: Date.now().toString(), key: '', filePath: '', contentType: 'application/octet-stream', value: '' } as any)] })}
                        onUpdate={updateFormDataParam}
                        onDelete={deleteFormDataParam}
                        onSelectFile={handleFileSelect}
                        onClearFile={(id) => {
                            const param = (request.bodyFormData || []).find(p => p.id === id);
                            if (param) updateFormDataParam(id, param.key, '', '', '');
                        }}
                        onContentTypeChange={updateFormDataParamContentType}
                    />
                </>
            )}

            {bodyFormat === 'form-urlencoded' && (
                <>
                    {(request.bodyFormUrlEncoded || []).map(param => (
                        <ParamItem key={param.id} keyValue={param.key} value={param.value} onKeyChange={(key) => updateFormUrlEncodedParam(param.id, key, param.value)} onValueChange={(value) => updateFormUrlEncodedParam(param.id, param.key, value)} onDelete={() => deleteFormUrlEncodedParam(param.id)} />
                    ))}
                    <AddButtonWrapper>
                        <LinkButton onClick={addFormUrlEncodedParam}><Codicon name="add" />Add Param</LinkButton>
                    </AddButtonWrapper>
                </>
            )}

            {bodyFormat === 'binary' && (
                <>
                    <BinaryFileContainer>
                        <BinaryFileInput type="file" id="binary-file" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) onRequestChange?.({ ...request, bodyBinaryFilePath: file.name });
                        }} />
                    </BinaryFileContainer>
                </>
            )}

            {['json','xml','text','html','javascript'].includes(bodyFormat) && (
                <>
                    <CodeTextArea
                        id="body-textarea"
                        resize="vertical"
                        growRange={{ start: 5, offset: 10 }}
                        sx={{ width: '100%', padding: '0 4px' }}
                        value={request.body || ''}
                        onChange={(e: any) => onRequestChange?.({ ...request, body: e.target.value })}
                        placeholder="Enter request body..."
                    />
                </>
            )}

            {bodyFormat === 'no-body' && (
                <NoBodyMessage>No body will be sent with this request</NoBodyMessage>
            )}
        </>
    );
};

export default InputForm;
