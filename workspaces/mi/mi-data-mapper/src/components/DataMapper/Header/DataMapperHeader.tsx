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
import React from "react";
import styled from "@emotion/styled";
import HeaderSearchBox from "./HeaderSearchBox";
import HeaderBreadcrumb from "./HeaderBreadcrumb";
import ExpressionBarWrapper from "./ExpressionBar";
import { View } from "../Views/DataMapperView";
import { DataMapperNodeModel } from "../../Diagram/Node/commons/DataMapperNode";
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { Button } from "@wso2/ui-toolkit";
import AIMapButton from './AIMapButton';
import { DataMapWriteRequest } from "@wso2/mi-core";
import { FunctionDeclaration } from "ts-morph";
import { DMType } from "@wso2/mi-core";
import { doesMappingExist } from "../../../index";

export interface DataMapperHeaderProps {
    fnST: FunctionDeclaration;
    inputTrees: DMType[];
    outputTree: DMType;
    filePath: string;
    views: View[];
    switchView: (index: number) => void;
    hasEditDisabled: boolean;
    onClose?: () => void;
    applyModifications: (fileContent: string) => Promise<void>;
    onDataMapButtonClick?: () => void;
    onDataMapClearClick?: () => void;
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    isMapping: boolean;
    setIsMapping: (mapping: boolean) => void;
}

export function DataMapperHeader(props: DataMapperHeaderProps) {
    const { filePath, views, switchView, hasEditDisabled, onClose, applyModifications, onDataMapButtonClick: onDataMapClick, onDataMapClearClick: onClear, setIsLoading, isLoading, setIsMapping, isMapping, fnST, inputTrees, outputTree } = props;
    const { rpcClient } = useVisualizerContext();

    const handleDataMapButtonClick = async () => {
        try {
            let mappingExist = doesMappingExist(fnST, inputTrees, outputTree), choice;
            if (mappingExist) {
                choice = await rpcClient.getMiDataMapperRpcClient().confirmMappingAction();
            }
            if (!mappingExist || choice) {
                props.setIsLoading(true);
                let authstatus = await rpcClient.getMiDataMapperRpcClient().authenticateUser();
                if (authstatus === false) {
                    return;
                }
                props.setIsMapping(true);
                await rpcClient.getMiDataMapperRpcClient().getMappingFromAI();
            }
            else {
                return;
            }
        } catch (error) {
            console.error(error);
        } finally {
            props.setIsMapping(false);
            props.setIsLoading(false);
        }
    };

    const handleDataMapClearButtonClick = async () => {
        await rpcClient.getMiDataMapperRpcClient().writeDataMapping({ dataMapping: '' });
    };

    return (
        <HeaderContainer>
            <HeaderContent>
                <BreadCrumb>
                    <Title> DATA MAPPER </Title>
                    {!hasEditDisabled && (
                        <HeaderBreadcrumb
                            views={views}
                            switchView={switchView}
                        />
                    )}
                </BreadCrumb>
                {!hasEditDisabled && !onClose && (
                    <>
                        <IOFilterBar>
                            <HeaderSearchBox />
                            <AIMapButton
                                onClick={handleDataMapButtonClick}
                                isLoading={isLoading}
                            />

                            <DeleteButton
                                appearance="secondary"
                                onClick={handleDataMapClearButtonClick}
                                tooltip='Clear All Mapping'
                            >
                                <div style={{ display: "flex", alignItems: "center" }}>
                                    <span>Clear</span>
                                </div>
                            </DeleteButton>
                        </IOFilterBar>
                    </>
                )}
            </HeaderContent>
            <ExpressionContainer>
                <ExpressionBarWrapper views={views} filePath={filePath} applyModifications={applyModifications} />
            </ExpressionContainer>
        </HeaderContainer>
    );
}

const HeaderContainer = styled.div`
    height: 76px;
    width: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--vscode-editorWidget-background);
`;

const HeaderContent = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 15px;
`;

const ExpressionContainer = styled.div`
    width: 100%;
    display: flex;
    border-bottom: 1px solid var(--vscode-menu-separatorBackground);
`;

const Title = styled.h3`
    width: 18%;
    margin: 0 10px 0 0;
    color: var(--vscode-sideBarSectionHeader-foreground);
    font-size: var(--vscode-font-size);
`;

const BreadCrumb = styled.div`
    width: 70%;
    display: flex;
`;

const IOFilterBar = styled.div`
    flex: 3;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    margin-bottom: 3px;
`;

const DeleteButton = styled(Button)`
    color: var(--vscode-errorForeground);
    border: none;
    box-sizing: border-box;
    border-radius: 3px;
    margin: 0; 
    display: inline-flex;
    align-items: center;
    justify-content: center;
`;
