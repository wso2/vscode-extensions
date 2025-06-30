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
import { Response as R } from '../../../Definitions/ServiceDefinitions';
import { useState } from 'react';

import SectionHeader from '../SectionHeader/SectionHeader';
import { Dropdown, Typography } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { ReadOnlyMediaType } from '../MediaType/ReadOnlyMediaType';
import { ReadOnlyHeaders } from '../Headers/ReadOnlyHeaders';

const SubSectionWrapper = styled.div`
    display: flex;
    flex-direction: column;
    padding-top: 5px;
    gap: 5px;
`;
export const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;
const ResponseTabContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 15px;
`;

interface ResponseProps {
    response: R;
}

export function ReadOnlyResponse(props: ResponseProps) {
    const { response } = props;
    const [selectedMediaType, setSelectedMediaType] = useState<string | undefined>(response?.content && Object.keys(response?.content)[0]);

    const allMediaTypes = response?.content && Object.keys(response?.content);

    return (
        <ResponseTabContainer>
            {response.description && (
                <Typography sx={{ margin: '10px 0 0 0', fontWeight: "lighter" }} variant='body2'> {response.description} </Typography>
            )}
            {response?.headers && (
                <ReadOnlyHeaders
                    headers={response?.headers}
                />
            )}
            <ContentWrapper>
                <SubSectionWrapper>
                    <SectionHeader
                        title="Body"
                        variant='h3'
                        actionButtons={
                            (allMediaTypes?.length) > 0 && (
                                <Dropdown
                                    id="media-type-dropdown"
                                    value={selectedMediaType || "application/json"}
                                    items={allMediaTypes?.map(mediaType => ({ label: mediaType, value: mediaType }))}
                                    onValueChange={(value) => setSelectedMediaType(value)}
                                />
                            )
                        }
                    />
                    <div id={selectedMediaType}>
                        {selectedMediaType && response?.content && (
                            <ReadOnlyMediaType
                                mediaType={response?.content[selectedMediaType]}
                                key={selectedMediaType}
                            />
                        )}
                    </div>
                </SubSectionWrapper>
            </ContentWrapper>
            {allMediaTypes?.length === 0 && (
                <Typography sx={{ margin: 0, fontWeight: "lighter" }} variant='body2'> No content available </Typography>
            )}
        </ResponseTabContainer>
    )
}
