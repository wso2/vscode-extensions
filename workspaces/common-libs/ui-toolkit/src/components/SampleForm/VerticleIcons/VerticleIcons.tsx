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
import { ComponentCard } from '../../ComponentCard/ComponentCard';
import { Icon } from '../../Icon/Icon';
import styled from '@emotion/styled';

const IconWrapper = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
`;

const HorizontalCardContainer = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    flex-grow: 1;
`;

export interface Props {
    id?: string;
    className?: string;
    sx?: any;
    onClick?: (selecteType: string) => void;
}

const Container = styled.div<Props>`
    ${(props: Props) => props.sx};
`;

export const VerticleIcons = (props: Props) => {
    const { id, className, sx, onClick } = props;

    const handleSelection = (type: string) => {
        if (onClick) {
            onClick(type);
        }
    };

    return (
        <Container id={id} className={className} sx={sx}>
            <HorizontalCardContainer>
                <ComponentCard onClick={() => handleSelection("Blank")} sx={{height: 100, width: "calc(25% - 30px)"}}>
                    <IconWrapper>
                        <Icon iconSx={{display: "flex", alignItem: "center", justifyContent: "center", fontSize: 40, height: "fix-content"}} name="class-icon" />
                        <div style={{ marginTop: 30 }}>Blank</div>
                    </IconWrapper>     
                </ComponentCard>
                <ComponentCard onClick={() => handleSelection("Angular")}  sx={{height: 100, width: "calc(25% - 30px)"}}>
                    <IconWrapper>
                        <Icon iconSx={{display: "flex", alignItem: "center", justifyContent: "center", fontSize: 50, height: "fix-content"}} name="angular" />
                        <div style={{ marginTop: 30 }}>Angular</div>
                    </IconWrapper>     
                </ComponentCard>
                <ComponentCard onClick={() => handleSelection("React")} sx={{height: 100, width: "calc(25% - 30px)"}}>
                    <IconWrapper>
                        <Icon iconSx={{display: "flex", alignItem: "center", justifyContent: "center", fontSize: 50, height: "fix-content"}} name="react" />
                        <div style={{ marginTop: 30 }}>React</div>
                    </IconWrapper>     
                </ComponentCard>
                <ComponentCard onClick={() => handleSelection("NextJS")} sx={{height: 100, width: "calc(25% - 30px)"}}>
                    <IconWrapper>
                        <Icon iconSx={{display: "flex", alignItem: "center", justifyContent: "center", fontSize: 40, height: "fix-content"}} name="nextjs" />
                        <div style={{ marginTop: 25 }}>NextJS</div>
                    </IconWrapper>     
                </ComponentCard>
            </HorizontalCardContainer>
            <HorizontalCardContainer>
                <ComponentCard onClick={() => handleSelection("Vue")} sx={{height: 40, width: "calc(50% - 25px)", marginTop: 15}}>
                    <IconWrapper>
                        <div>Vue</div>
                    </IconWrapper>     
                </ComponentCard>
                <ComponentCard onClick={() => handleSelection("Svelte")} sx={{height: 40, width: "calc(50% - 25px)", marginTop: 15}}>
                    <IconWrapper>
                        <div>Svelte</div>
                    </IconWrapper>     
                </ComponentCard>
            </HorizontalCardContainer>
        </Container>
    );
};
