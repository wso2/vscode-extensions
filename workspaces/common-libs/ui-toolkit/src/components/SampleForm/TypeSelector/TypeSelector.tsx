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
import { Typography } from '../../Typography/Typography';
import { Header } from '../Header/Header';
import { HorizontalIcons } from '../HorizontalIcons/HorizontalIcons';
import {
    VSCodePanels,
    VSCodePanelTab,
    VSCodePanelView
} from "@vscode/webview-ui-toolkit/react";
import { HorizontalIconsWithSeparator } from '../HorizontalIconsWithSeparator/HorizontalIconsWithSeparator';
import { FormContainer } from '../../../styles';

export interface TypeSelectorProps {
    id?: string;
    className?: string;
    sx?: any;
    onTypeSelected?: (type: string) => void;
}

export const PanelContent = styled(VSCodePanelView)`
    color: inherit;
    background-color: transparent;
    border: solid calc(var(--border-width) * 1px) transparent;
    box-sizing: border-box;
    font-size: var(--type-ramp-base-font-size);
    line-height: var(--type-ramp-base-line-height);
    padding: 10px 0px 10px 3px;
`;

const PanelWrapper = styled.div`
    margin-top: 10px;
    margin-left: -6px;
    width: "calc(100% + 6px)";
`;

export const TypeSelector = (props: TypeSelectorProps) => {
    const { id, className, sx, onTypeSelected } = props;

    const handleSelection = (type?: string) => {
        if (onTypeSelected) {
            onTypeSelected(type);
        }
    };

    return (
        <FormContainer id={id} className={className} width={700} sx={sx}>
            <Header/>
            <Typography variant="h6" sx={{ marginTop: 0 }}>Welcome to Project Choreo, an experimental web-based development workspace from WSO2.</Typography>
            <Typography variant="h5" sx={{ marginTop: 0, marginBottom: 16 }}> Create a new workspace </Typography>

            <HorizontalIcons onClick={() => handleSelection("New Web app")} sx={{marginBottom: 5}} leftIconName='globe' isLeftIconCodicon  rightIconName='plus' title='New Web app' description='Write an app using a web framework or simple HTML/JS/CSS'/>
            <HorizontalIcons onClick={() => handleSelection("New Flutter app")} sx={{marginBottom: 5}} leftIconName='flutter' rightIconName='plus' title='New Flutter app' description='Write a cross-platform Flutter app in Dart'/>
            <HorizontalIcons onClick={() => handleSelection("New Blank workspace")} sx={{marginBottom: 5}} leftIconName='empty' rightIconName='plus' title='New Blank workspace' description='Get started with a completely blank setup'/>
            <HorizontalIcons onClick={() => handleSelection("Import a repo")} sx={{marginBottom: 5}} leftIconName='import' rightIconName='plus' title='Import a repo' description='Start from an existing GitHub repository'/>
            <HorizontalIcons onClick={() => handleSelection("Coming soon")} sx={{marginBottom: 5}} leftIconName='soon' rightIconName='plus' title='Python, Go, Al and more coming soon' description="Share your feedback on which templates you'd like to see"/>

            <PanelWrapper>
                <VSCodePanels>
                    <VSCodePanelTab label="your-workspaces"> Your workspaces </VSCodePanelTab>
                    <VSCodePanelTab label="shared-workspaces"> Shared with you </VSCodePanelTab>

                    <PanelContent>
                        <HorizontalIconsWithSeparator onClick={() => handleSelection("sample 1")} sx={{marginBottom: 5, flexGrow: 1}} leftIconName='react' rightIconName='ellipsis' title='sample 1' description="sample-1 • Accessed 3 hours ago"/>
                    </PanelContent>
                    <PanelContent>
                        <HorizontalIconsWithSeparator onClick={() => handleSelection("sample 2")} sx={{marginBottom: 5, flexGrow: 1}} leftIconName='nextjs' rightIconName='ellipsis' title='sample 2' description="sample-2 • Accessed 4 hours ago"/>
                    </PanelContent>
                </VSCodePanels>
            </PanelWrapper>
        </FormContainer>
    );
};
