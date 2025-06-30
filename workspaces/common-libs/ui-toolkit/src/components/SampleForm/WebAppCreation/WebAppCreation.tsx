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
import { VSCodeRadioGroup, VSCodeRadio, VSCodeCheckbox } from '@vscode/webview-ui-toolkit/react';
import { Button, FormContainer, TextField } from '../../..';
import { Header } from '../Header/Header';
import { VerticleIcons } from '../VerticleIcons/VerticleIcons';

export interface WebAppCreationProps {
    id?: string;
    className?: string;
    sx?: any;
}

const TopMarginTextWrapper = styled.div`
    font-size: 13px;
    margin-top: 10px;
`;

const BottomMarginTextWrapper = styled.div`
    font-size: 13px;
    margin-bottom: 10px;
`;

const ButtonWrapper = styled.div`
    margin-top: 20px;
    width: 50px;
`;

export const WebAppCreation = (props: WebAppCreationProps) => {
    const { id, className, sx } = props;

    const handleRadioButtonChange = (e: any) => {
        console.log(e.target.value);
    };

    const handleCheckboxChange = () => {
        console.log("checkbox changed");
    };

    return (
        <FormContainer id={id} className={className} sx={sx}>
            <Header/>
            <Typography variant="h1">New Web App</Typography>
            <Typography variant="h4" sx={{ marginTop: 0 }}>Build a web app using simple HTML/JS/CSS or the framework of your choice</Typography>
            <BottomMarginTextWrapper>Choose a tramework</BottomMarginTextWrapper>
            <VerticleIcons sx={{width: `100%`}} />
            <TopMarginTextWrapper>Language</TopMarginTextWrapper>
            <VSCodeRadioGroup value="typescript">
                <VSCodeRadio value="javascript" onClick={handleRadioButtonChange}>Javascript</VSCodeRadio>
                <VSCodeRadio value="typescript" onClick={handleRadioButtonChange}>Typescript</VSCodeRadio>
            </VSCodeRadioGroup>
            <TextField sx={{ marginTop: 10 }} value='' label="Project Name" placeholder="Enter a project name" />
            <TopMarginTextWrapper>Experiments</TopMarginTextWrapper>
            <VSCodeCheckbox checked={false} onChange={handleCheckboxChange}>
                Enable Nix for this workspace Learn
            </VSCodeCheckbox>
            <ButtonWrapper>
                <Button appearance="primary">Create</Button>
            </ButtonWrapper>
        </FormContainer>
    );
};
