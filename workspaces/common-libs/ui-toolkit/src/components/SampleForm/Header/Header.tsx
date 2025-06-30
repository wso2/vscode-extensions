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
import { Codicon } from '../../Codicon/Codicon';
import { Typography } from '../../Typography/Typography';
import { Icon } from '../../Icon/Icon';

export interface HeaderContainerProps {
    id?: string;
    className?: string;
    sx?: any;
}

const Container = styled.div<HeaderContainerProps>`
    display: flex;
    flex-direction: row;
    height: 50px;
    align-items: center;
    justify-content: flex-start;
    ${(props: HeaderContainerProps) => props.sx};
`;

export const Header = (props: HeaderContainerProps) => {
    const { id, className, sx } = props;
    return (
        <Container id={id} className={className} sx={sx}>
            <Codicon iconSx={{marginTop: -3, fontWeight: "bold", fontSize: 22}} name='arrow-left'/>
            <Icon sx={{marginLeft: 20, marginTop: -10, fontSize: 30, pointerEvents: "none"}} name='choreo'/>
            <div style={{marginLeft: 30}}>
                <Typography variant="h3">Project Choreo</Typography>
            </div>
        </Container>
    );
};
