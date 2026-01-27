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
import { HeaderDefinition } from '../../../Definitions/ServiceDefinitions';

interface ReadOnlyHeaderProps {
    id: number;
    name: string;
    header: HeaderDefinition;
    headerTypes?: string[];
}

const HeaderWrapper = styled.div`
    display: flex;
    flex-direction: row;
    gap: 10px;
`;

const HeaderContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

export function ReadOnlyHeader(props: ReadOnlyHeaderProps) {
    const { header, name } = props;

    return (
        <>
            <HeaderContainer>
                <HeaderWrapper>
                    <Typography sx={{ margin: 0, fontWeight: "bold" }} variant='body2'> {name} </Typography>
                    <Typography
                        sx={{ margin: 0, fontWeight: "lighter" }}
                        variant='body2'>
                        {header.schema.type}
                    </Typography>
                </HeaderWrapper>
                <Typography sx={{ margin: 0, fontWeight: "lighter" }} variant='body2'> {(header as HeaderDefinition).description} </Typography>
            </HeaderContainer>
        </>
    )
}
