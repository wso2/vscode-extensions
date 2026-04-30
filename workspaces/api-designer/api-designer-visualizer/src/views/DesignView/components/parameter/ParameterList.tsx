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
import { Button, Codicon, Typography } from '@wso2/ui-toolkit';
import styled from "@emotion/styled";
import { Parameter as P, ReferenceObject as R } from '../../../../Definitions/ServiceDefinitions';
import { BaseTypes } from '../../../../constants';
import SectionHeader from '../shared/SpecSectionHeader';
import { Parameter } from './Parameter';
import { ReferenceObject } from '../reference/ReferenceObject';
import { getUpdatedObjects } from '../../../../utils/openapi-utils';
import { useContext, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { APIDesignerContext } from '../../../../contexts/APIDesignerContext';
import { RefComponent } from '../reference/RefComponent';
import { VSCodeDataGridCell, VSCodeDataGridRow } from '@vscode/webview-ui-toolkit/react';
import { useAIPrompt } from '../../../../hooks/useAIPrompt';
import { AIButton } from '../../../../components/ai/AIButton';
import { postMessage as postVSCodeMessage } from '../../../../utils/vscode-api';

export const PanelBody = styled.div`
    padding: 16px;
    gap: 15px;
    display: flex;
    flex-direction: column;
`;

export const ParameterGridCell = styled(VSCodeDataGridCell)`
    padding-left: 0px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    &:is(:active, :focus, :focus-visible) {
        background-color: var(--vscode-background);
        color: var(--vscode-foreground);
        border-color: transparent;
    }
`;

export const ParamGridRow = styled(VSCodeDataGridRow)`
    &:hover {
        background-color: var(--vscode-background);
        color: var(--vscode-foreground);
    }
`;

const AddMenu = styled.div`
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 4px;
    background: var(--vscode-dropdown-background);
    border: 1px solid var(--vscode-dropdown-border);
    border-radius: 4px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    z-index: 1000;
    min-width: 180px;
    padding: 4px;
`;

const MenuItem = styled.div`
    padding: 8px 12px;
    cursor: pointer;
    border-radius: 3px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--vscode-foreground);
    background: transparent;
    
    &:hover {
        background: var(--vscode-list-hoverBackground);
    }
`;

const SubMenuItem = styled.div`
    padding: 6px 12px 6px 28px;
    cursor: pointer;
    border-radius: 3px;
    font-size: 11px;
    color: var(--vscode-foreground);
    background: transparent;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    
    &:hover {
        background: var(--vscode-list-hoverBackground);
    }
    
    &.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        
        &:hover {
            background: transparent;
        }
    }
`;

const ParametersContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const HeaderWrapper = styled.div`
    padding-bottom: 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
    margin-bottom: 8px;
`;

const ParametersRoot = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    overflow: visible;
`;

const AddMenuAnchor = styled.div`
    position: relative;
`;

const ReferenceMenuItem = styled(MenuItem)`
    display: flex;
    justify-content: space-between;
`;

const ReferenceMenuLabel = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

interface ParametersProps {
    parameters: (P | R)[];
    paramTypes?: string[];
    currentReferences?: R[];
    title?: string;
    type: "query" | "header" | "path" | "cookie";
    openAPI?: any;
    onParametersChange: (parameter: (P | R)[]) => void;
    operationPath?: string;
    operationMethod?: string;
}

enum ParameterTypes {
    DEFAULT_PARAM = "Default Parameter",
    REFERENCE_OBJECT = "Reference Object"
}

function isReferenceObject(obj: (P | R)): obj is R {
    return obj && typeof obj === 'object' && '$ref' in obj;
}

export function ParameterList(props: ParametersProps) {
    const { parameters = [], paramTypes = BaseTypes, title, type, currentReferences, openAPI: openAPIProp, onParametersChange, operationPath, operationMethod } = props;
    const context = useContext(APIDesignerContext);
    
    // Use prop if provided, otherwise get from context
    const openAPI = openAPIProp || context?.props?.openAPI;

    // AI Prompt hook
    const { showPrompt, InlineChat } = useAIPrompt((context, prompt) => {
        postVSCodeMessage({
            command: 'openAIChat',
            data: { context, prompt }
        });
    });

    const [showAddMenu, setShowAddMenu] = useState(false);
    const [showReferenceSubmenu, setShowReferenceSubmenu] = useState(false);
    const addButtonRef = useRef<HTMLDivElement>(null);

    const componentParameterNames = openAPI?.components?.parameters ? Object.keys(openAPI?.components?.parameters) : [];
    const componentQueryParamNames = componentParameterNames.filter((name) => openAPI?.components?.parameters[name].in === "query");
    const componentHeaderParamNames = componentParameterNames.filter((name) => openAPI?.components?.parameters[name].in === "header");
    const componentPathParamNames = componentParameterNames.filter((name) => openAPI?.components?.parameters[name].in === "path");

    // Close menu when clicking outside
    useEffect(() => {
        if (!showAddMenu) return;
        
        const handleClickOutside = (event: MouseEvent) => {
            if (addButtonRef.current && !addButtonRef.current.contains(event.target as Node)) {
                setShowAddMenu(false);
                setShowReferenceSubmenu(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showAddMenu]);

    const handleParameterChange = (parameters: (P | R)[]) => {
        onParametersChange(parameters);
    };

    // Get already referenced parameter names to prevent duplicates
    const alreadyReferencedNames = parameters
        ?.filter(isReferenceObject)
        .map(ref => ref.$ref.replace("#/components/parameters/", ""));

    const addNewParam = () => {
        const newParam: P = {
            name: parameters?.length > 0 ? `param${parameters.length}` : "param1",
            in: type,
            required: true,
            description: "",
            schema: {
                type: "string"
            }
        };
        const newParameters = getUpdatedObjects<P | R>(parameters, newParam);
        handleParameterChange([...newParameters]);
        setShowAddMenu(false);
        setShowReferenceSubmenu(false);
    };

    const addNewReferenceObject = (paramName: string) => {
        const newParam: R = {
            $ref: `#/components/parameters/${paramName}`
        };
        const newParameters = getUpdatedObjects<P | R>(parameters, newParam);
        handleParameterChange([...newParameters]);
        setShowAddMenu(false);
        setShowReferenceSubmenu(false);
    };

    const availableReferences = type === "query" ? componentQueryParamNames 
        : type === "header" ? componentHeaderParamNames 
        : type === "path" ? componentPathParamNames 
        : [];
    
    // Filter out already referenced parameters
    const unusedReferences = availableReferences.filter(name => !alreadyReferencedNames.includes(name));

    const actionButtons = [
        <AIButton
            key="ai-button"
            
            onClick={(e: React.MouseEvent) => {
                const path = operationPath && operationMethod 
                    ? `/paths/${operationPath}/${operationMethod}/parameters`
                    : `/paths/${type}-parameters`;
                showPrompt(
                    JSON.stringify(parameters.filter(p => {
                        if (isReferenceObject(p)) {
                            const paramName = p.$ref.replace("#/components/parameters/", "");
                            const referencedParam = openAPI?.components?.parameters?.[paramName];
                            return referencedParam?.in === type;
                        }
                        return p.in === type;
                    })),
                    path,
                    `Improve ${title || type} parameters`,
                    `Improve ${title || type} Parameters`,
                    `Describe how you want to improve the ${title || type} parameters...`,
                    e
                );
            }}
            title={`Improve ${title || type} Parameters with AI`}
        />,
        <AddMenuAnchor key="add-button" ref={addButtonRef}>
            <Button appearance="icon" onClick={() => {
                setShowAddMenu(!showAddMenu);
                setShowReferenceSubmenu(false);
            }}>
                <Codicon sx={{ marginRight: 5 }} name="add" />
                Add
            </Button>
            {showAddMenu && (
                <AddMenu>
                    <MenuItem onClick={addNewParam}>
                        <Codicon name="file" />
                        New Parameter
                    </MenuItem>
                    {availableReferences.length > 0 && (
                        <>
                            <ReferenceMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowReferenceSubmenu(!showReferenceSubmenu);
                                }}
                            >
                                <ReferenceMenuLabel>
                                    <Codicon name="link" />
                                    Reference
                                </ReferenceMenuLabel>
                                <Codicon name={showReferenceSubmenu ? "chevron-down" : "chevron-right"} />
                            </ReferenceMenuItem>
                            {showReferenceSubmenu && (
                                <>
                                    {unusedReferences.length > 0 ? (
                                        unusedReferences.map((refName, idx) => (
                                            <SubMenuItem 
                                                key={idx}
                                                onClick={() => addNewReferenceObject(refName)}
                                                title={refName}
                                            >
                                                {refName}
                                            </SubMenuItem>
                                        ))
                                    ) : (
                                        <SubMenuItem className="disabled">
                                            All references already used
                                        </SubMenuItem>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </AddMenu>
            )}
        </AddMenuAnchor>
    ];

    const paramsToGivenType = parameters?.filter((param) => {
        if (isReferenceObject(param)) {
            const paramName = param.$ref.replace("#/components/parameters/", "");
            const referencedParam = openAPI?.components?.parameters?.[paramName];
            
            // If component is missing, show it only in path parameters section
            // This way users can see broken references and fix them
            if (!referencedParam) {
                return type === "path";
            }
            
            // If component exists, filter by type
            return referencedParam.in === type;
        } else {
            return param.in === type;
        }
    });

    return (
        <ParametersRoot>
            <HeaderWrapper>
                <SectionHeader title={title ?? ''} actionButtons={actionButtons} />
            </HeaderWrapper>
            {paramsToGivenType?.length > 0 ? (
                <ParametersContainer>
                    {paramsToGivenType?.map((parameter, index) => {
                        if (isReferenceObject(parameter)) {
                            const paramName = parameter.$ref.replace("#/components/parameters/", "");
                            const referencedParam = openAPI?.components?.parameters?.[paramName];
                            
                            // Render if: component is missing OR component matches the type
                            // This allows users to see and fix broken references
                            if (!referencedParam || referencedParam.in === type) {
                                return (
                                    <ReferenceObject
                                        key={index}
                                        id={index}
                                        type={type}
                                        referenceObject={parameter}
                                        openAPI={openAPI}
                                        allReferences={parameters.filter(isReferenceObject)}
                                        onRemoveReferenceObject={(id) => {
                                            const parametersCopy = [...parameters];
                                            const actualIndex = parameters.indexOf(parameter);
                                            parametersCopy.splice(actualIndex, 1);
                                            handleParameterChange(parametersCopy as P[]);
                                        }}
                                        onRefernceObjectChange={(updatedParam) => {
                                            const parametersCopy = [...parameters];
                                            const actualIndex = parameters.indexOf(parameter);
                                            parametersCopy[actualIndex] = updatedParam;
                                            handleParameterChange(parametersCopy as P[]);
                                        }}
                                    />
                                );
                            }
                        } else if (parameter.in === type) {
                            return (
                                <Parameter
                                    key={index}
                                    id={index}
                                    parameter={parameter as P}
                                    paramTypes={paramTypes}
                                    openAPI={openAPI}
                                    parameterLocation={type}
                                    onRemoveParameter={(id) => {
                                        const parametersCopy = [...parameters];
                                        const actualIndex = parameters.indexOf(parameter);
                                        parametersCopy.splice(actualIndex, 1);
                                        handleParameterChange(parametersCopy as P[]);
                                    }}
                                    onParameterChange={(updatedParam) => {
                                        const parametersCopy = [...parameters];
                                        const actualIndex = parameters.indexOf(parameter);
                                        parametersCopy[actualIndex] = updatedParam;
                                        handleParameterChange(parametersCopy as P[]);
                                    }}
                                />
                            );
                        }
                        return null;
                    })}
                </ParametersContainer>
            ) : (
                <Typography sx={{ margin: 0, fontWeight: "lighter" }} variant='body3'>No {title}.</Typography>
            )}
            {typeof document !== 'undefined' && createPortal(<InlineChat />, document.body)}
        </ParametersRoot>
    )
}
