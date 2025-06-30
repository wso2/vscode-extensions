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

import { render } from "mustache";
import { randomBytes } from 'crypto';

export interface TemplateArgs {
    templateName: string;
    templateType: string;
    address: string;
    uriTemplate: string;
    httpMethod: string | null;
    wsdlUri: string;
    wsdlService: string;
    wsdlPort: number | null;
    traceEnabled: boolean;
    statisticsEnabled: boolean;
    parameters: any;
}

export function getTemplateMustacheTemplate() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<template name="{{templateName}}" xmlns="http://ws.apache.org/ns/synapse">
    {{#sequenceTemplate}}
    {{#params}}<parameter {{#default}}defaultValue="{{default}}"{{/default}} isMandatory="{{isMandatory}}" name="{{name}}"/>{{/params}}
    <sequence {{#stats}}statistics="enable"{{/stats}} {{#trace}}trace="enable"{{/trace}}>
    </sequence>{{/sequenceTemplate}}
    {{^sequenceTemplate}}
    <endpoint name="{{endpointName}}">
        {{#addressTemplate}}<address uri="{{address}}">{{/addressTemplate}}
        {{#defaultTemplate}}<default>{{/defaultTemplate}}
        {{#wsdlTemplate}}<wsdl port="{{wsdlPort}}" service="{{wsdlService}}" uri="{{wsdlUri}}">{{/wsdlTemplate}}
        {{#httpTemplate}}<http {{#httpMethod}}method="{{httpMethod}}"{{/httpMethod}} uri-template="{{uriTemplate}}">{{/httpTemplate}}
            <suspendOnFailure>
                <progressionFactor>1</progressionFactor>
            </suspendOnFailure>
            <markForSuspension>
                <retriesBeforeSuspension>0</retriesBeforeSuspension>
                {{#addressTemplate}}<retryDelay>0</retryDelay>{{/addressTemplate}}
            </markForSuspension>
        {{#addressTemplate}}</address>{{/addressTemplate}}
        {{#defaultTemplate}}</default>{{/defaultTemplate}}
        {{#wsdlTemplate}}</wsdl>{{/wsdlTemplate}}
        {{#httpTemplate}}</http>{{/httpTemplate}}
    </endpoint>
    {{/sequenceTemplate}}
</template>`;
}

export const getEditTemplates = () => {
    return `<?xml version="1.0" encoding="UTF-8"?>
    <template name="{{templateName}}" xmlns="http://ws.apache.org/ns/synapse">
        {{#params}}<parameter {{#default}}defaultValue="{{default}}"{{/default}} isMandatory="{{isMandatory}}" name="{{name}}"/>{{/params}}`;
}


export function getTemplateXml(data: TemplateArgs) {

    let addressTemplate, defaultTemplate, httpTemplate, sequenceTemplate, wsdlTemplate;
    if (data.templateType === 'Address Endpoint Template') {
        addressTemplate = true;
    } else if (data.templateType === 'Default Endpoint Template') {
        defaultTemplate = true;
    } else if (data.templateType === 'HTTP Endpoint Template') {
        httpTemplate = true;
        data.httpMethod = (data.httpMethod != null && data.httpMethod != 'leave_as_is') ? data.httpMethod.toLowerCase() : null;
    } else if (data.templateType === 'Sequence Template') {
        sequenceTemplate = true;
    } else {
        wsdlTemplate = true;
    }

    let params: any = [];
    data.parameters.length > 0 ? data.parameters.forEach(element => { params.push(element); }) : params = null;

    const endpointName = data.templateType != 'Sequence Template' ? "endpoint_urn_uuid_".concat(generateUUID()) : null;
    const trace = data.traceEnabled ? "enabled" : null;
    const stats = data.statisticsEnabled ? "enabled" : null;

    const modifiedData = {
        ...data,
        addressTemplate,
        defaultTemplate,
        httpTemplate,
        sequenceTemplate,
        wsdlTemplate,
        endpointName,
        trace,
        stats,
        params
    };

    return render(getTemplateMustacheTemplate(), modifiedData);
}

export function getEditTemplateXml(data: TemplateArgs) {

    let params: any = [];
    data.parameters.length > 0 ? data.parameters.forEach(element => { params.push(element); }) : params = null;

    const endpointName = data.templateType != 'Sequence Template' ? "endpoint_urn_uuid_".concat(generateUUID()) : null;
    const trace = data.traceEnabled ? "enabled" : null;
    const stats = data.statisticsEnabled ? "enabled" : null;

    const modifiedData = {
        ...data,
        endpointName,
        trace,
        stats,
        params
    };

    return render(getEditTemplates(), modifiedData);
}

function generateUUID(): string {
    const buf = randomBytes(16);
    buf[6] = (buf[6] & 0x0f) | 0x40;
    buf[8] = (buf[8] & 0x3f) | 0x80;

    return buf.toString('hex', 0, 4) + '-' +
        buf.toString('hex', 4, 6) + '-' +
        buf.toString('hex', 6, 8) + '-' +
        buf.toString('hex', 8, 10) + '-' +
        buf.toString('hex', 10, 16);
}
