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
import { Dropdown, TextField, Typography } from '@wso2/ui-toolkit';
import styled from "@emotion/styled";
import { License as L } from '../../../Definitions/ServiceDefinitions';

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

const HorizontalFieldWrapper = styled.div`
    display: flex;
    flex-direction: row;
    gap: 10px;
`;

interface LicenseProps {
    lisense: L;
    onContactChange: (license: L) => void;
}

export function License(props: LicenseProps) {
    const { lisense } = props;

    const handleContactChange = (license: L) => {
        props.onContactChange(license);
    };

    const handleLicenceTypeChange = (licenceType: string) => {
        if (licenceType === "URL") {
            lisense.url = lisense.identifier;
            delete lisense.identifier;
        } else {
            lisense.identifier = lisense.url;
            delete lisense.url;
        }
        handleContactChange(lisense);
    };

    return (
        <ContentWrapper>
            <Typography sx={{ margin: 0 }} variant="h3">License</Typography>
            <HorizontalFieldWrapper>
                <TextField
                    placeholder="Name"
                    id="licenceName"
                    sx={{ width: "33%" }}
                    value={lisense.name}
                    onBlur={(evt) => handleContactChange({ ...lisense, name: evt.target.value })}
                />
                <Dropdown
                    id="licenceType"
                    containerSx={{ width: "33%", gap: 0 }}
                    dropdownContainerSx={{ gap: 0 }}
                    items={[
                        { value: "URL", content: "URL" },
                        { value: "Identifier", content: "Identifier" }
                    ]}
                    value={lisense.url ? "URL" : "Identifier"}
                    onValueChange={(value) => handleLicenceTypeChange(value)}
                />
                {lisense.url ? (
                    <TextField
                        placeholder='URL'
                        id="licenceURL"
                        sx={{ width: "33%" }}
                        value={lisense.url}
                        onBlur={(evt) => handleContactChange({ ...lisense, url: evt.target.value })}
                    />
                ) : (
                    <TextField
                        placeholder='Identifier'
                        id="licenceIdentifier"
                        sx={{ width: "33%" }}
                        value={lisense.identifier}
                        onBlur={(evt) => handleContactChange({ ...lisense, identifier: evt.target.value })}
                    />
                )}
            </HorizontalFieldWrapper>
        </ContentWrapper>
    )
}
