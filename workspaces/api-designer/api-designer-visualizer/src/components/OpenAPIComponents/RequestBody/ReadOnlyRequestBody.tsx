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
import { Dropdown } from '@wso2/ui-toolkit';
import { RequestBody as R, ReferenceObject } from '../../../Definitions/ServiceDefinitions';
import SectionHeader from '../SectionHeader/SectionHeader';
import { useState } from 'react';
import styled from '@emotion/styled';
import { ReadOnlyMediaType } from '../MediaType/ReadOnlyMediaType';

interface RequestBodyProps {
    requestBody: R | ReferenceObject;
}

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;
const SubSectionWrapper = styled.div`
    display: flex;
    flex-direction: column;
    padding-top: 5px;
    gap: 5px;
`;

export function ReadOnlyRequestBody(props: RequestBodyProps) {
    const { requestBody } = props;
    const [selectedMediaType, setSelectedMediaType] = useState<string | undefined>(requestBody?.content && Object.keys(requestBody.content)[0]);

    const allMediaTypes = requestBody?.content && Object.keys(requestBody.content);

    return (
        <>
            <ContentWrapper>
                <SubSectionWrapper>
                    <SectionHeader
                        title="Body"
                        variant='h3'
                        actionButtons={
                            <Dropdown
                                id="media-type-dropdown"
                                value={selectedMediaType || "application/json"}
                                items={allMediaTypes?.map(mediaType => ({ label: mediaType, value: mediaType }))}
                                onValueChange={(value) => setSelectedMediaType(value)}
                            />
                        }
                    />
                    {selectedMediaType && requestBody.content[selectedMediaType] && (
                        <ReadOnlyMediaType
                            mediaType={requestBody.content[selectedMediaType]}
                            key={selectedMediaType}
                        />
                    )}
                </SubSectionWrapper>
            </ContentWrapper>
        </>
    )
}
