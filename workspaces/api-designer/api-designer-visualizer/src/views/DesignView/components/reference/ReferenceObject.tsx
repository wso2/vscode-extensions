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
import { Button, Codicon, Dropdown, TextField, Typography } from '@wso2/ui-toolkit';
import styled from "@emotion/styled";
import { ReferenceObject as R } from '../../../../Definitions/ServiceDefinitions';
import { useContext, useMemo } from 'react';
import { APIDesignerContext } from '../../../../contexts/APIDesignerContext';
import { getRefName } from '../../../../utils/schemaResolver';

import { postMessage as postVSCodeMessage } from '../../../../utils/vscode-api';
import { AIButton } from '../../../../components/ai/AIButton';

const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    border: 1px solid var(--vscode-panel-border);
    border-left: 3px solid var(--vscode-symbolIcon-classForeground);
    border-radius: 4px;
    background: var(--vscode-editor-background);
`;

const HorizontalFieldWrapper = styled.div`
    display: flex;
    flex-direction: row;
    gap: 10px;
`;

const ResolvedContentWrapper = styled.div`
    padding: 12px;
    border-radius: 4px;
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-input-border);
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const ResolvedRow = styled.div`
    display: flex;
    gap: 10px;
    align-items: center;
`;

const ResolvedLabel = styled.div`
    min-width: 100px;
    font-weight: 600;
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
`;

const ResolvedValue = styled.div`
    flex: 1;
    color: var(--vscode-editor-foreground);
    font-size: 12px;
`;

const ReferenceTag = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 3px;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    font-size: 11px;
    font-weight: 600;
`;

const ResolvedContentError = styled(ResolvedContentWrapper)`
    border-color: var(--vscode-inputValidation-errorBorder);
`;

const RefBlockHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
`;

const ErrorReferenceTag = styled(ReferenceTag)`
    background: var(--vscode-inputValidation-errorBackground);
    color: var(--vscode-inputValidation-errorForeground);
`;

const ExampleResolvedValue = styled(ResolvedValue)`
    font-family: monospace;
    background: var(--vscode-textCodeBlock-background);
    padding: 4px 6px;
    border-radius: 3px;
`;

const FieldGrow = styled.div`
    flex: 1;
    min-width: 0;
`;

const RefHeaderAIButton = styled(AIButton)`
    && {
        padding: 4px 8px;
    }
`;

interface ReferenceObjectsProps {
    id: number;
    referenceObject: R;
    type?: string;
    openAPI?: any;
    allReferences?: R[];
    onRemoveReferenceObject?: (id: number) => void;
    onRefernceObjectChange: (parameter: R) => void;
}
const ButtonWrapperParams = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    min-width: 40px;
    flex-shrink: 0;
    gap: 5px;
    justify-content: flex-end;
`;

const LabelContainer = styled.div`
    display: flex;
    align-items: center;
    width: 25%;
`;

export function ReferenceObject(props: ReferenceObjectsProps) {
    const { id, referenceObject, type, openAPI: openAPIProp, allReferences = [], onRemoveReferenceObject, onRefernceObjectChange } = props;
    const context = useContext(APIDesignerContext);
    
    // Use prop if provided, otherwise get from context
    const openAPI = openAPIProp || context?.props?.openAPI;

    // Get already referenced names (excluding current one)
    const alreadyReferencedNames = allReferences
        .filter(ref => ref !== referenceObject) // Exclude current reference
        .map(ref => {
            if (type === "response") {
                return ref.$ref.replace("#/components/responses/", "");
            } else if (type === "requestBody") {
                return ref.$ref.replace("#/components/requestBodies/", "");
            } else {
                return ref.$ref.replace("#/components/parameters/", "");
            }
        });

    const existingComponents: string[] = [];
    if (type === "query" && openAPI?.components?.parameters) {
        Object.keys(openAPI.components.parameters).forEach((key) => {
            if (openAPI.components.parameters[key].in === "query") {
                existingComponents.push(key as string);
            }
        });
    } else if (type === "header" && openAPI?.components?.parameters) {
        Object.keys(openAPI.components.parameters).forEach((key) => {
            if (openAPI.components.parameters[key].in === "header") {
                existingComponents.push(key as string);
            }
        });
    } else if (type === "path" && openAPI?.components?.parameters) {
        Object.keys(openAPI.components.parameters).forEach((key) => {
            if (openAPI.components.parameters[key].in === "path") {
                existingComponents.push(key as string);
            }
        });
    } else if (type === "response" && openAPI?.components.responses) {
        Object.keys(openAPI.components.responses).forEach((key) => {
            existingComponents.push(key as string);
        });
    } else if (type === "requestBody" && openAPI?.components.requestBodies) {
        Object.keys(openAPI.components.requestBodies).forEach((key) => {
            existingComponents.push(key as string);
        });
    }

    const handleParameterChange = (parameter: R) => {
        onRefernceObjectChange(parameter);
    };

    // Get current reference name
    const currentRefName = getRefName(referenceObject.$ref);

    // Filter out already used references, but keep the current one
    const availableComponents = existingComponents.filter(item => 
        item === currentRefName || !alreadyReferencedNames.includes(item)
    );

    const referenceObjectsList = availableComponents ? availableComponents?.map((item, idx) => ({ 
        id: `${item}-${idx}`,
        value: type === "response" 
            ? `#/components/responses/${item}` 
            : type === "requestBody"
                ? `#/components/requestBodies/${item}`
                : `#/components/parameters/${item}`,
        content: item
    })) : [];

    // Resolve the referenced component
    const resolvedContent = useMemo(() => {
        if (!referenceObject.$ref || !openAPI) {
            return null;
        }

        const refPath = referenceObject.$ref;
        const refName = refPath.split('/').pop();

        if (refPath.startsWith('#/components/parameters/')) {
            return openAPI.components?.parameters?.[refName];
        } else if (refPath.startsWith('#/components/responses/')) {
            return openAPI.components?.responses?.[refName];
        } else if (refPath.startsWith('#/components/requestBodies/')) {
            return openAPI.components?.requestBodies?.[refName];
        } else if (refPath.startsWith('#/components/schemas/')) {
            return openAPI.components?.schemas?.[refName];
        } else if (refPath.startsWith('#/components/headers/')) {
            return openAPI.components?.headers?.[refName];
        }

        return null;
    }, [referenceObject.$ref, openAPI]);

    // Get example from resolved content
    const resolvedExample = useMemo(() => {
        if (!resolvedContent) return '';
        
        // For parameters, check schema.example
        if (resolvedContent.schema?.example !== undefined) {
            const example = resolvedContent.schema.example;
            return typeof example === 'string' ? example : JSON.stringify(example);
        }
        
        // For other types, check direct example property
        if ((resolvedContent as any).example !== undefined) {
            const example = (resolvedContent as any).example;
            return typeof example === 'string' ? example : JSON.stringify(example);
        }
        
        return '';
    }, [resolvedContent]);

    const renderResolvedContent = () => {
        const refName = getRefName(referenceObject.$ref);
        
        // Show warning if component is missing
        if (!resolvedContent) {
            return (
                <ResolvedContentError>
                    <RefBlockHeader>
                        <ErrorReferenceTag>
                            <Codicon name="warning" />
                            Component Not Found: {refName}
                        </ErrorReferenceTag>
                    </RefBlockHeader>
                    <ResolvedRow>
                        <ResolvedLabel>Reference:</ResolvedLabel>
                        <ResolvedValue>{referenceObject.$ref}</ResolvedValue>
                    </ResolvedRow>
                    <ResolvedRow>
                        <ResolvedLabel>Issue:</ResolvedLabel>
                        <ResolvedValue>
                            This component is not defined in the Components section. 
                            Please add it to the Components section or remove this reference.
                        </ResolvedValue>
                    </ResolvedRow>
                </ResolvedContentError>
            );
        }

        // For parameters
        if (resolvedContent.in) {
            return (
                <ResolvedContentWrapper>
                    <RefBlockHeader>
                        <ReferenceTag>
                            <Codicon name="link" />
                            Referenced: {refName}
                        </ReferenceTag>
                    </RefBlockHeader>
                    <ResolvedRow>
                        <ResolvedLabel>Name:</ResolvedLabel>
                        <ResolvedValue>{resolvedContent.name || refName}</ResolvedValue>
                    </ResolvedRow>
                    <ResolvedRow>
                        <ResolvedLabel>In:</ResolvedLabel>
                        <ResolvedValue>{resolvedContent.in}</ResolvedValue>
                    </ResolvedRow>
                    {resolvedContent.schema?.type && (
                        <ResolvedRow>
                            <ResolvedLabel>Type:</ResolvedLabel>
                            <ResolvedValue>{resolvedContent.schema.type}</ResolvedValue>
                        </ResolvedRow>
                    )}
                    {resolvedContent.schema?.$ref && (
                        <ResolvedRow>
                            <ResolvedLabel>Schema:</ResolvedLabel>
                            <ResolvedValue>{resolvedContent.schema.$ref}</ResolvedValue>
                        </ResolvedRow>
                    )}
                    {resolvedContent.required && (
                        <ResolvedRow>
                            <ResolvedLabel>Required:</ResolvedLabel>
                            <ResolvedValue>Yes</ResolvedValue>
                        </ResolvedRow>
                    )}
                    {resolvedContent.description && (
                        <ResolvedRow>
                            <ResolvedLabel>Description:</ResolvedLabel>
                            <ResolvedValue>{resolvedContent.description}</ResolvedValue>
                        </ResolvedRow>
                    )}
                    {resolvedExample && (
                        <ResolvedRow>
                            <ResolvedLabel>Example:</ResolvedLabel>
                            <ExampleResolvedValue>{resolvedExample}</ExampleResolvedValue>
                        </ResolvedRow>
                    )}
                </ResolvedContentWrapper>
            );
        }

        // For headers (similar to parameters but without 'in' property)
        if (resolvedContent.schema && !resolvedContent.in) {
            return (
                <ResolvedContentWrapper>
                    <RefBlockHeader>
                        <ReferenceTag>
                            <Codicon name="link" />
                            Referenced: {refName}
                        </ReferenceTag>
                    </RefBlockHeader>
                    {resolvedContent.schema?.type && (
                        <ResolvedRow>
                            <ResolvedLabel>Type:</ResolvedLabel>
                            <ResolvedValue>{resolvedContent.schema.type}</ResolvedValue>
                        </ResolvedRow>
                    )}
                    {resolvedContent.schema?.$ref && (
                        <ResolvedRow>
                            <ResolvedLabel>Schema:</ResolvedLabel>
                            <ResolvedValue>{resolvedContent.schema.$ref}</ResolvedValue>
                        </ResolvedRow>
                    )}
                    {resolvedContent.required && (
                        <ResolvedRow>
                            <ResolvedLabel>Required:</ResolvedLabel>
                            <ResolvedValue>Yes</ResolvedValue>
                        </ResolvedRow>
                    )}
                    {resolvedContent.description && (
                        <ResolvedRow>
                            <ResolvedLabel>Description:</ResolvedLabel>
                            <ResolvedValue>{resolvedContent.description}</ResolvedValue>
                        </ResolvedRow>
                    )}
                    {resolvedExample && (
                        <ResolvedRow>
                            <ResolvedLabel>Example:</ResolvedLabel>
                            <ExampleResolvedValue>{resolvedExample}</ExampleResolvedValue>
                        </ResolvedRow>
                    )}
                </ResolvedContentWrapper>
            );
        }

        // For other types, show generic info
        return (
            <ResolvedContentWrapper>
                <RefBlockHeader>
                    <ReferenceTag>
                        <Codicon name="link" />
                        Referenced: {refName}
                    </ReferenceTag>
                </RefBlockHeader>
                {resolvedContent.description && (
                    <ResolvedRow>
                        <ResolvedLabel>Description:</ResolvedLabel>
                        <ResolvedValue>{resolvedContent.description}</ResolvedValue>
                    </ResolvedRow>
                )}
                {resolvedExample && (
                    <ResolvedRow>
                        <ResolvedLabel>Example:</ResolvedLabel>
                        <ExampleResolvedValue>{resolvedExample}</ExampleResolvedValue>
                    </ResolvedRow>
                )}
            </ResolvedContentWrapper>
        );
    };

    return (
        <Wrapper>
            <HorizontalFieldWrapper>
                <LabelContainer>
                    <Typography variant="caption">Reference</Typography>
                </LabelContainer>
                <FieldGrow />
                <Dropdown
                    id={`paramType-${referenceObject.$ref}`}
                    value={referenceObject.$ref}
                    containerSx={{ minWidth: '200px', flexShrink: 0 }}
                    items={referenceObjectsList}
                    onValueChange={(value) => handleParameterChange({ ...referenceObject, $ref: value })}
                    dropdownContainerSx={{ zIndex: 1000 }}
                />
                <ButtonWrapperParams>
                    <RefHeaderAIButton
                        onClick={() => {
                            if (!referenceObject) return;
                            postVSCodeMessage({
                                command: 'openCopilotChat',
                                data: { 
                                    context: JSON.stringify(referenceObject), 
                                    prompt: `Improve reference: ${referenceObject.$ref}` 
                                }
                            });
                        }}
                        title="Edit with AI"
                    />
                    {onRemoveReferenceObject && (
                    <Button appearance='icon' onClick={() => onRemoveReferenceObject(id)}>
                        <Codicon name="trash" />
                    </Button>
                    )}
                </ButtonWrapperParams>
            </HorizontalFieldWrapper>
            {renderResolvedContent()}
        </Wrapper>
    )
}
