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
import { License as L } from '../../../Definitions/ServiceDefinitions';
import { DataGrid } from '../../DataGrid/DataGrid';

export const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

interface ReadOnlyLicenseProps {
    license: L;
}

export function ReadOnlyLicense(props: ReadOnlyLicenseProps) {
    const { license } = props;

    return (
        <ContentWrapper>
            <Typography sx={{ margin: 0 }} variant="h3">License</Typography>
            <DataGrid
                headers={["Property", "Value"]}
                content={[
                    ["Name", license?.name],
                    license?.url ?
                        ["URL",
                            license?.url
                        ] :
                        [
                            "Identifier",
                            license?.identifier,
                        ],
                ]}
            />
        </ContentWrapper>
    )
}
