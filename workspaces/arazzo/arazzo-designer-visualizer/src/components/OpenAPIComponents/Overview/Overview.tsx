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
import { Typography } from '@wso2/ui-toolkit';
import styled from "@emotion/styled";
import { ArazzoDefinition } from '@wso2/arazzo-designer-core';

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
    arazzoDefinition: ArazzoDefinition;
}

export function Overview(props: OverviewProps) {
    const { arazzoDefinition } = props;

    return (
        <PanelBody>
            <Typography sx={{ margin: 0 }} variant="h2">Overview</Typography>
            <ContentWrapper>
                <Typography variant="body1">Title: {arazzoDefinition.info.title}</Typography>
                <Typography variant="body1">Version: {arazzoDefinition.info.version}</Typography>
                {arazzoDefinition.info.summary && (
                    <Typography variant="body1">Summary: {arazzoDefinition.info.summary}</Typography>
                )}
                {arazzoDefinition.info.description && (
                    <Typography variant="body1">Description: {arazzoDefinition.info.description}</Typography>
                )}
            </ContentWrapper>
            <SubSectionWrapper>
                <Typography variant="h3">Source Descriptions</Typography>
                {arazzoDefinition.sourceDescriptions.map((source) => (
                    <Typography key={source.name} variant="body1">
                        {source.name} ({source.type}) — {source.url}
                    </Typography>
                ))}
            </SubSectionWrapper>
            <SubSectionWrapper>
                <Typography variant="h3">Workflows ({arazzoDefinition.workflows.length})</Typography>
                {arazzoDefinition.workflows.map((workflow) => (
                    <ContentWrapper key={workflow.workflowId}>
                        <Typography variant="body1">
                            {workflow.workflowId}
                            {workflow.summary && ` — ${workflow.summary}`}
                        </Typography>
                    </ContentWrapper>
                ))}
            </SubSectionWrapper>
        </PanelBody>
    );
}
