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
import { TextField } from '@wso2/ui-toolkit';
import styled from "@emotion/styled";
import { Contact as C, Info as I } from '../../../Definitions/ServiceDefinitions';
import { useEffect, useState } from 'react';
import { CodeTextArea } from '../../CodeTextArea/CodeTextArea';
import { Contact } from '../Contact/Contact';
import { License } from '../License/Lisense';

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

interface InfoProps {
    info: I;
    isNewFile?: boolean;
    selectedOptions: string[];
    onInfoChange: (info: I) => void;
}

// Title, Vesrion are mandatory fields
export function Info(props: InfoProps) {
    const { info, isNewFile, selectedOptions, onInfoChange } = props;
    const [description, setDescription] = useState<string>(info?.description); // Due to the nature of the code component, this is not a controlled component   

    const handleInfoChange = (info: I) => {
        onInfoChange(info);
    };

    useEffect(() => {
        setDescription(info?.description);
    }, [info?.description]);

    return (
        <>
            <HorizontalFieldWrapper>
                <TextField
                    label="Title"
                    id="title"
                    sx={{ width: "50%" }}
                    value={info?.title}
                    onBlur={(evt) => {
                        info.title = evt.target.value;
                        handleInfoChange(info);
                    }}
                    autoFocus={isNewFile}
                />
                <TextField
                    label="API Version"
                    id="API Version"
                    sx={{ width: "50%" }}
                    value={info?.version}
                    onBlur={(evt) => {
                        info.version = evt.target.value;
                        handleInfoChange(info);
                    }}
                />
            </HorizontalFieldWrapper>
            {selectedOptions.includes("Summary") && (
                <TextField
                    label="Summary"
                    id="summary"
                    sx={{ width: "100%" }}
                    value={info?.summary}
                    onBlur={(evt) => {
                        info.summary = evt.target.value;
                        handleInfoChange(info);
                    }}
                />
            )}
            {selectedOptions.includes("Description") && (
                <CodeTextArea
                    label='Decription'
                    value={description}
                    onChange={(evt) => {
                        info.description = evt.target.value;
                        setDescription(evt.target.value);
                        handleInfoChange(info);
                    }}
                    resize="vertical"
                    growRange={{ start: 5, offset: 10 }}
                />
            )}
            {info?.contact && (
                <Contact
                    contact={info.contact}
                    onContactChange={(contact: C) => {
                        info.contact = contact;
                        handleInfoChange(info);
                    }}
                />
            )}
            {info?.license && (
                <License
                    lisense={info.license}
                    onContactChange={(license) => {
                        info.license = license;
                        handleInfoChange(info);
                    }}
                />
            )}
        </>
    )
}
