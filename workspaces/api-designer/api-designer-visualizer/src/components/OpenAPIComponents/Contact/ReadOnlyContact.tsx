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
import { Contact as C } from '../../../Definitions/ServiceDefinitions';
import { DataGrid } from '../../DataGrid/DataGrid';

export const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const HorizontalFieldWrapper = styled.div`
    display: flex;
    flex-direction: row;
    gap: 10px;
`;

interface ReadOnlyContactProps {
    contact: C;
}

export function ReadOnlyContact(props: ReadOnlyContactProps) {
    const { contact } = props;

    return (
        <ContentWrapper>
            <Typography sx={{ margin: 0 }} variant="h3">Contact</Typography>
            <DataGrid
                headers={["Property", "Value"]}
                content={[
                    ["Name", contact?.name],
                    ["URL", contact?.url],
                    ["Email", contact?.email],
                ]}
            />
        </ContentWrapper>
    )
}
