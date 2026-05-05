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

/* eslint-disable @typescript-eslint/no-explicit-any */

import styled from "@emotion/styled";
import { Button, Codicon } from "@wso2/ui-toolkit";
import { WorkflowInputField } from "../../utils/inputUtils";

// ---------------------------------------------------------------------------
// Styled components
// ---------------------------------------------------------------------------

const PanelRoot = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    font-family: var(--vscode-font-family);
`;

const PanelHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    border-bottom: 1px solid var(--vscode-editorWidget-border, rgba(128,128,128,0.2));
    flex-shrink: 0;
`;

const PanelTitle = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: var(--vscode-foreground);
`;

const PanelBody = styled.div`
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px;
    gap: 12px;
`;

const PanelFooter = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 10px 16px;
    border-top: 1px solid var(--vscode-editorWidget-border, rgba(128,128,128,0.2));
    flex-shrink: 0;
`;

const FieldGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const FieldLabel = styled.label`
    font-size: 12px;
    font-weight: 500;
    color: var(--vscode-foreground);
    display: flex;
    align-items: center;
    gap: 2px;
`;

const RequiredMark = styled.span`
    color: var(--vscode-editorError-foreground, #f44747);
    font-weight: 600;
`;

const FieldDescription = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 2px;
`;

const baseInputStyles = `
    width: 100%;
    box-sizing: border-box;
    background-color: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, rgba(128,128,128,0.4));
    border-radius: 3px;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 12px;
    padding: 5px 8px;
    outline: none;
    transition: border-color 0.1s ease;
    &:focus {
        border-color: var(--vscode-focusBorder);
    }
    &::placeholder {
        color: var(--vscode-input-placeholderForeground, rgba(128,128,128,0.6));
        opacity: 1;
    }
`;

const FieldInput = styled.input`
    ${baseInputStyles}
`;

const FieldTextarea = styled.textarea`
    ${baseInputStyles}
    resize: vertical;
    min-height: 72px;
    line-height: 1.4;
`;

const FieldSelect = styled.select`
    ${baseInputStyles}
    cursor: pointer;
`;

const FieldError = styled.div`
    font-size: 11px;
    color: var(--vscode-editorError-foreground, #f44747);
`;

const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: var(--vscode-descriptionForeground);
    font-size: 13px;
    text-align: center;
    padding: 24px;
    gap: 8px;
`;

const PendingNotice = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 8px 10px;
    border-radius: 4px;
    background-color: var(--vscode-inputValidation-warningBackground, rgba(255,200,0,0.12));
    border: 1px solid var(--vscode-inputValidation-warningBorder, rgba(255,200,0,0.6));
    font-size: 12px;
    color: var(--vscode-foreground);
    flex-shrink: 0;
`;

const BooleanRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 3px 0;
`;

const CloseBtn = styled(Button)`
    border-radius: 4px;
`;

const ApplyBtn = styled(Button)`
    border-radius: 4px;
`;

const DirtyNotice = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 8px 10px;
    border-radius: 4px;
    background-color: var(--vscode-inputValidation-infoBackground, rgba(0,122,204,0.1));
    border: 1px solid var(--vscode-inputValidation-infoBorder, rgba(0,122,204,0.5));
    font-size: 12px;
    color: var(--vscode-foreground);
    flex-shrink: 0;
    margin: 0 16px 0 16px;
`;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface WorkflowInputConfigPanelProps {
    fields: WorkflowInputField[];
    values: Record<string, string>;
    errors: Record<string, string>;
    pendingCurl?: boolean;
    isDirty?: boolean;
    onChange: (name: string, value: string) => void;
    onApply: () => void;
    onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WorkflowInputConfigPanel({
    fields,
    values,
    errors,
    pendingCurl,
    isDirty,
    onChange,
    onApply,
    onClose,
}: WorkflowInputConfigPanelProps) {
    const hasErrors = Object.values(errors).some(e => !!e);
    const missingRequired = fields.filter(
        f => f.required && (values[f.name] ?? '').trim() === ''
    );
    const hasMissing = missingRequired.length > 0;
    const applyDisabled = hasErrors || hasMissing;

    return (
        <PanelRoot>
            <PanelHeader>
                <PanelTitle>Configure Inputs</PanelTitle>
                <span title="Close"><CloseBtn appearance="icon" onClick={onClose}>
                    <Codicon name="close" />
                </CloseBtn></span>
            </PanelHeader>

            <PanelBody>
                {pendingCurl && (
                    <PendingNotice>
                        <Codicon name="warning" />
                        <span>
                            {hasMissing
                                ? <>Required field{missingRequired.length > 1 ? 's' : ''} missing: <strong>{missingRequired.map(f => f.name).join(', ')}</strong>. Fill {missingRequired.length > 1 ? 'them' : 'it'} in and click <strong>Apply &amp; Run</strong>.</>
                                : <>All required inputs are filled. Click <strong>Apply &amp; Run</strong> to execute the workflow.</>
                            }
                        </span>
                    </PendingNotice>
                )}

                {fields.length === 0 ? (
                    <EmptyState>
                        <Codicon name="symbol-field" />
                        <span>This workflow has no input fields defined.</span>
                    </EmptyState>
                ) : (
                    fields.map(field => (
                        <FieldGroup key={field.name}>
                            <FieldLabel htmlFor={`input-${field.name}`}>
                                {field.name}
                                {field.required && <RequiredMark title="Required">*</RequiredMark>}
                                {field.type !== 'string' && (
                                    <span style={{ marginLeft: 4, opacity: 0.6, fontWeight: 400, fontSize: 11 }}>
                                        ({field.type})
                                    </span>
                                )}
                            </FieldLabel>

                            {field.description && (
                                <FieldDescription>{field.description}</FieldDescription>
                            )}

                            {field.type === 'boolean' ? (
                                <BooleanRow>
                                    <input
                                        type="checkbox"
                                        id={`input-${field.name}`}
                                        checked={values[field.name] === 'true'}
                                        onChange={e => onChange(field.name, e.target.checked ? 'true' : 'false')}
                                        style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--vscode-focusBorder)' }}
                                    />
                                    <label
                                        htmlFor={`input-${field.name}`}
                                        style={{ fontSize: 12, color: 'var(--vscode-foreground)', cursor: 'pointer' }}
                                    >
                                        {field.name}
                                    </label>
                                </BooleanRow>
                            ) : field.type === 'object' || field.type === 'array' ? (
                                <FieldTextarea
                                    id={`input-${field.name}`}
                                    value={values[field.name] ?? ''}
                                    placeholder={field.type === 'object' ? '{"key": "value"}' : '[1, 2, 3]'}
                                    onChange={e => onChange(field.name, e.target.value)}
                                />
                            ) : (
                                <FieldInput
                                    id={`input-${field.name}`}
                                    type={field.type === 'integer' ? 'number' : 'text'}
                                    step={field.type === 'integer' ? 1 : undefined}
                                    value={values[field.name] ?? ''}
                                    placeholder='Enter value…'
                                    onChange={e => onChange(field.name, e.target.value)}
                                />
                            )}

                            {errors[field.name] && (
                                <FieldError>{errors[field.name]}</FieldError>
                            )}
                        </FieldGroup>
                    ))
                )}
            </PanelBody>

            {isDirty && !pendingCurl && (
                <DirtyNotice>
                    <Codicon name="info" />
                    <span>Input values changed. Hit <strong>Apply</strong> to confirm before running.</span>
                </DirtyNotice>
            )}

            <PanelFooter>
                <ApplyBtn
                    appearance="primary"
                    buttonSx={{ opacity: applyDisabled ? 0.5 : 1 }}
                    onClick={applyDisabled ? undefined : onApply}
                >
                    {pendingCurl ? 'Apply & Run' : 'Apply'}
                </ApplyBtn>
            </PanelFooter>
        </PanelRoot>
    );
}
