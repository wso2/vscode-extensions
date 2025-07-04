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
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { OpenAPI } from '../../../Definitions/ServiceDefinitions';
import { getSelectedOverviewComponent, getChangedOverviewOperationOpenAPI } from '../Utils/OpenAPIUtils';
import { useState } from 'react';
import { Info } from '../Info/Info';

const HorizontalFieldWrapper = styled.div`
    display: flex;
    flex-direction: row;
    gap: 10px;
`;

export const PanelBody = styled.div`
    height: calc(100% - 87px);
    overflow-y: auto;
    padding: 16px;
    gap: 15px;
    display: flex;
    flex-direction: column;
`;
export const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

export const SubSectionWrapper = styled.div`
    display: flex;
    flex-direction: column;
    padding-top: 5px;
    gap: 5px;
`;

interface OverviewProps {
    openAPIDefinition: OpenAPI;
    isNewFile?: boolean;
    onOpenApiDefinitionChange: (openAPIDefinition: OpenAPI) => void;
}

const moreOptions = ["Summary", "Description", "Contact", "License"];

// Title, Version are mandatory fields
export function Overview(props: OverviewProps) {
    const { openAPIDefinition, isNewFile, onOpenApiDefinitionChange } = props;
    const { rpcClient } = useVisualizerContext();

    const selectedOptions: string[] = getSelectedOverviewComponent(openAPIDefinition);
    const handleOptionChange = (options: string[]) => {
        const newOpenAPI =  getChangedOverviewOperationOpenAPI(openAPIDefinition, options);
        props.onOpenApiDefinitionChange(newOpenAPI);
    };
    const onConfigureClick = () => {
        rpcClient.selectQuickPickItems({
            title: "Select sections",
            items: moreOptions.map(item => ({ label: item, picked: selectedOptions.includes(item) }))
        }).then(resp => {
            if (resp) {
                handleOptionChange(resp.map(item => item.label))
            }
        })
    };

    return (
        <>
            <PanelBody>
                <HorizontalFieldWrapper>
                    <Typography sx={{ margin: 0, marginTop: 0, flex: 1 }} variant="h2">Overview</Typography>
                    <Button tooltip='Select sections' onClick={onConfigureClick} appearance='icon'>
                        <Codicon name='gear' sx={{ marginRight: "4px" }} />
                        Configure
                    </Button>
                </HorizontalFieldWrapper>
                <Info
                    info={openAPIDefinition.info}
                    isNewFile={isNewFile}
                    selectedOptions={selectedOptions}
                    onInfoChange={(info) => {
                        openAPIDefinition.info = info;
                        props.onOpenApiDefinitionChange(openAPIDefinition);
                    }}
                />
            </PanelBody>
        </>
    )
}
