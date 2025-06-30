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
// tslint:disable: jsx-no-multiline-js

import React, { useEffect, useState } from 'react';

import { Param, TypeResolver } from './TypeResolver';
import { ParamField, Parameters, isFieldEnabled, getParamFieldLabelFromParamId } from './ParamManager';
import { ActionButtons, Drawer, Typography } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { SIDE_PANEL_WIDTH, VSCodeColors } from '../../../resources/constants';

export interface ParamProps {
    parameters: Parameters;
    paramFields: ParamField[];
    isTypeReadOnly?: boolean;
    openInDrawer?: boolean;
    errorMessage?: string;
    onChange: (param: Parameters) => void;
    onSave?: (param: Parameters) => void;
    onCancel?: (param?: Parameters) => void;
}

const EditorContainer = styled.div`
    display: flex;
    margin: 10px 0;
    flex-direction: column;
    border-radius: 5px;
    padding: 10px;
    border: 1px solid var(--vscode-dropdown-border);
`;

const EditorContent = styled.div`
    display: flex;
    flex-direction: column;
    padding: 10px 0;
`;

const DrawerContent = styled.div`
    padding: 20px;
    width: ${SIDE_PANEL_WIDTH - 40}px;
`;

const isRequiredFieldsFilled = (p: Param[]) => {
    return p.every(param => {
        if (param.isRequired) {
            return (param.value !== '' && param.value !== undefined && param.value !== null);
        }
        return true;
    });
}

// If atlease one field is filled, the save button should be enabled
const atLeaseOneFieldFilled = (p: Param[]) => {
    return p.some(param => {
        return (param.value !== '' && param.value !== undefined && param.value !== null);
    });
};

export function ParamEditor(props: ParamProps) {
    const { parameters, paramFields, openInDrawer, errorMessage, onChange, onSave, onCancel } = props;
    const [isDrawerCancelInProgress, setIsDrawerCancelInProgress] = useState(false);
    const [isSaveEnabled, setIsSaveEnabled] = useState(isRequiredFieldsFilled(parameters.parameters) && atLeaseOneFieldFilled(parameters.parameters) && !errorMessage);
    const [drawerTopOffset, setDrawerTopOffset] = useState(0);

    const getParamComponent = (p: Param) => {
        const handleTypeResolverChange = (newParam: Param) => {
            // update the params array base on the id of the param with the new param
            const updatedParams = parameters.parameters.map(param => {
                if (param.id === newParam.id) {
                    return newParam;
                }
                return param;
            });

            const paramEnabled = updatedParams.map(param => {
                if (param.enableCondition === null || param.enableCondition) {
                    const enableCondition = param.enableCondition;
                    const paramEnabled = isFieldEnabled(updatedParams, enableCondition);
                    return { ...param, isEnabled: paramEnabled };
                }
                return param;
            });
            setIsSaveEnabled(isRequiredFieldsFilled(paramEnabled) && atLeaseOneFieldFilled(paramEnabled));
            onChange({ ...parameters, parameters: paramEnabled });
        }
        return <TypeResolver param={p} onChange={handleTypeResolverChange} />;
    }

    const handleOnCancel = () => {
        if (openInDrawer) {
            setIsDrawerCancelInProgress(true);
            // 500ms delay to allow the drawer to close before calling the onCancel callback
            setTimeout(() => {
                onCancel(parameters);
                setIsDrawerCancelInProgress(false);
            }, 500);
        } else {
            onCancel(parameters);
        }
    };

    const handleOnSave = () => {
        onSave(parameters);
    };


    useEffect(() => {
        if (openInDrawer) {
            const drawer1 = document.getElementById("drawer1");
            if (drawer1) {
                const scrollPosition = drawer1.scrollTop;
                setDrawerTopOffset(scrollPosition);
                // Disable scrolling on the body when the drawer is open
                drawer1.style.overflow = "hidden";
            }
        }
    }, [openInDrawer]);

    // Enable drawer scrolling when this component is unmounted
    useEffect(() => {
        return () => {
            const drawer1 = document.getElementById("drawer1");
            if (drawer1) {
                drawer1.style.overflow = "auto";
            }
        }
    }, []);

    useEffect(() => {
        setIsSaveEnabled(isRequiredFieldsFilled(parameters.parameters) && atLeaseOneFieldFilled(parameters.parameters) && !errorMessage);
    }, [parameters, errorMessage]);

    return (
        <>
            {!openInDrawer && (
                <EditorContainer id='parameterManagerForm'>
                    <EditorContent>
                        {parameters?.parameters.map(param => getParamComponent({ ...param, label: getParamFieldLabelFromParamId(paramFields, param.id) }))}
                    </EditorContent>
                    {errorMessage && <Typography variant='body1' sx={{ color: VSCodeColors.ERROR }}>{errorMessage}</Typography>}
                    <ActionButtons
                        primaryButton={{ text: "Save", onClick: handleOnSave, disabled: !isSaveEnabled }}
                        secondaryButton={{ text: "Cancel", onClick: handleOnCancel }}
                        sx={{ justifyContent: "flex-end" }}
                    />
                </EditorContainer>
            )}
            <Drawer isOpen={isDrawerCancelInProgress ? false : openInDrawer} id="param-editor-drawer" isSelected={true} sx={{ top: drawerTopOffset, position: 'fixed' }}>
                {openInDrawer && (
                    <DrawerContent>
                        {parameters?.parameters.map(param => getParamComponent({
                            ...param,
                            label: getParamFieldLabelFromParamId(paramFields, param.id)
                        })
                        )}
                        {errorMessage && <Typography variant='body1' sx={{ color: VSCodeColors.ERROR }}>{errorMessage}</Typography>}
                        <ActionButtons
                            primaryButton={{ text: "Save", onClick: handleOnSave, disabled: !isSaveEnabled }}
                            secondaryButton={{ text: "Cancel", onClick: handleOnCancel }}
                            sx={{ justifyContent: "flex-end" }}
                        />
                    </DrawerContent>
                )}
            </Drawer>
        </>
    );
}
