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
import { TextField, Typography } from '@wso2/ui-toolkit';
import styled from "@emotion/styled";
import { Contact as C } from '../../../Definitions/ServiceDefinitions';

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

interface ContactProps {
    contact: C;
    onContactChange: (contact: C) => void;
}

export function Contact(props: ContactProps) {
    const { contact, onContactChange } = props;

    const handleContactChange = (contact: C) => {
        onContactChange(contact);
    };

    return (
        <>
            <Typography sx={{ margin: 0 }} variant="h3">Contact</Typography>
            <ContentWrapper>
                <HorizontalFieldWrapper>
                    <TextField
                        placeholder="Name"
                        id="contactName"
                        sx={{ width: "33%" }}
                        value={contact.name}
                        onBlur={(evt) => handleContactChange({ ...contact, name: evt.target.value })}
                    />
                    <TextField
                        placeholder='URL'
                        id="contactURL"
                        sx={{ width: "33%" }}
                        value={contact.url}
                        onBlur={(evt) => handleContactChange({ ...contact, url: evt.target.value })}
                    />
                    <TextField
                        placeholder='Email'
                        id="contactEmail"
                        sx={{ width: "33%" }}
                        value={contact.email}
                        onBlur={(evt) => handleContactChange({ ...contact, email: evt.target.value })}
                    />
                </HorizontalFieldWrapper>
            </ContentWrapper>
        </>
    )
}
