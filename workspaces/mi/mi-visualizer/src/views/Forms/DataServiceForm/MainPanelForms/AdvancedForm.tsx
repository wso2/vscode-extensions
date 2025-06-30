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
import React from "react";
import { FormCheckBox, TextField } from "@wso2/ui-toolkit";

export interface DataServiceAdvancedWizardProps {
    renderProps: any;
    control: any;
}

export function DataServiceAdvancedWizard(props: DataServiceAdvancedWizardProps) {

    return (
        <>
            <TextField
                label="Data Service Group"
                size={100}
                {...props.renderProps('serviceGroup')}
            />
            <TextField
                label="Data Service Namespace"
                size={100}
                {...props.renderProps('dataServiceNamespace')}
            />
            <TextField
                label="Publish Swagger"
                size={100}
                {...props.renderProps('publishSwagger')}
            />
            <FormCheckBox
                label="Enable Batch Requests"
                control={props.control}
                {...props.renderProps('enableBatchRequests')}
            />
            <FormCheckBox
                label="Enable Boxcarring"
                control={props.control}
                {...props.renderProps('enableBoxcarring')}
            />
            <FormCheckBox
                label="Disable Legacy Boxcarrying Mode"
                control={props.control}
                {...props.renderProps('disableLegacyBoxcarringMode')}
            />
            <FormCheckBox
                label="Enable Streaming"
                control={props.control}
                {...props.renderProps('enableStreaming')}
            />
            <FormCheckBox
                label="Active Service Status"
                control={props.control}
                {...props.renderProps('serviceStatus')}
            />
        </>
    );
}
