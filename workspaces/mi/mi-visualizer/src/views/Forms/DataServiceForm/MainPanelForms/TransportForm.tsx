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
import styled from "@emotion/styled";
import React, { Dispatch, SetStateAction } from "react";
import {TextField, FormCheckBox} from "@wso2/ui-toolkit";
import {DataServicePropertyTable} from "./PropertyTable";

const CheckBoxContainer = styled.div`
    display  : flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: 10px;
    padding-bottom: 5px;
`;

export interface DataServiceTransportWizardProps {
    authProperties: any;
    setAuthProperties: Dispatch<SetStateAction<any>>;
    renderProps: any;
    control: any;
    setValue?: any;
}

export function DataServiceTransportWizard(props: DataServiceTransportWizardProps) {

    const transportTypes = [
        'http',
        'https',
        'jms',
        'local'
    ];

    return (
        <>
            <span>Select the Transports:</span>
            <CheckBoxContainer>
                {transportTypes.map(transportType => (
                    <FormCheckBox
                        label={transportType}
                        control={props.control}
                        {...props.renderProps(transportType)}
                    />
                ))}
            </CheckBoxContainer>
            <TextField
                label="Transaction Manager JNDI Name"
                size={100}
                {...props.renderProps('jndiName')}
            />
            <TextField
                label="Authorization Provider Class"
                size={100}
                {...props.renderProps('authProviderClass')}
            />
            <DataServicePropertyTable setProperties={props.setAuthProperties} properties={props.authProperties} type={'transport'} setValue={props.setValue} />
        </>
    );
}
