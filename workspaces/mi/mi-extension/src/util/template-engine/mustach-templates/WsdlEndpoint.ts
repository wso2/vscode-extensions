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
import {randomBytes} from "crypto";

export interface WsdlEndpointArgs {
    endpointName: string;
    format: string | null;
    traceEnabled: string | null;
    statisticsEnabled: string | null;
    optimize: string | null;
    description: string;
    wsdlUri: string;
    wsdlService: string;
    wsdlPort: string;
    requireProperties: boolean;
    properties: any;
    addressingEnabled: string;
    addressingVersion: string;
    addressListener: string | null;
    securityEnabled: string;
    seperatePolicies: boolean;
    policyKey: string;
    inboundPolicyKey: string;
    outboundPolicyKey: string;
    suspendErrorCodes: string;
    initialDuration: number;
    maximumDuration: number | null;
    progressionFactor: number;
    retryErrorCodes: string;
    retryCount: number;
    retryDelay: number;
    timeoutDuration: number | null;
    timeoutAction: string | null;
    templateName: string;
    requireTemplateParameters: boolean;
    templateParameters: any;
}

export function getWsdlEndpointMustacheTemplate() {
    return `<?xml version="1.0" encoding="UTF-8"?>
{{#template}}<template name="{{templateName}}" xmlns="http://ws.apache.org/ns/synapse">{{/template}}
{{#parameters}}
<{{{key}}}:parameter name="{{value}}" xmlns:{{key}}="http://ws.apache.org/ns/synapse"/>
{{/parameters}}
<endpoint name="{{endpointName}}" {{^template}}xmlns="http://ws.apache.org/ns/synapse"{{/template}}>
    <wsdl port="{{wsdlPort}}" service="{{wsdlService}}" {{#format}}format="{{format}}"{{/format}} {{#optimize}}optimize="{{optimize}}"{{/optimize}} {{#statisticsEnabled}}statistics="{{statisticsEnabled}}"{{/statisticsEnabled}} {{#traceEnabled}}trace="{{traceEnabled}}"{{/traceEnabled}} uri="{{wsdlUri}}">
        {{#addressingEnabled}}<enableAddressing {{#addressListener}}separateListener="{{addressListener}}"{{/addressListener}} {{#addressingVersion}}version="{{addressingVersion}}{{/addressingVersion}}"/>{{/addressingEnabled}}
        {{#securityEnabled}}<enableSec{{#policyKey}} policy="{{policyKey}}"{{/policyKey}}{{#inboundPolicyKey}} inboundPolicy="{{inboundPolicyKey}}"{{/inboundPolicyKey}}{{#outboundPolicyKey}} outboundPolicy="{{outboundPolicyKey}}"{{/outboundPolicyKey}}/>{{/securityEnabled}}
        {{#timeout}}<timeout>
            {{#timeoutDuration}}<duration>{{timeoutDuration}}</duration>{{/timeoutDuration}}
            {{#timeoutAction}}<responseAction>{{timeoutAction}}</responseAction>{{/timeoutAction}}
        </timeout>{{/timeout}}
        <suspendOnFailure>
            {{#suspendErrorCodes}}<errorCodes>{{suspendErrorCodes}}</errorCodes>{{/suspendErrorCodes}}
            <initialDuration>{{initialDuration}}</initialDuration>
            <progressionFactor>{{progressionFactor}}</progressionFactor>
            {{#maximumDuration}}<maximumDuration>{{maximumDuration}}</maximumDuration>{{/maximumDuration}}
        </suspendOnFailure>
        <markForSuspension>
            {{#retryErrorCodes}}<errorCodes>{{retryErrorCodes}}</errorCodes>{{/retryErrorCodes}}
            <retriesBeforeSuspension>{{retryCount}}</retriesBeforeSuspension>
            {{#retryDelay}}<retryDelay>{{retryDelay}}</retryDelay>{{/retryDelay}}
        </markForSuspension>
    </wsdl>
    {{#properties}}
    <property name="{{name}}" {{#scope}}scope="{{scope}}"{{/scope}} value="{{value}}"/>
    {{/properties}}  
    {{#description}}<description>{{description}}</description>{{/description}}
</endpoint>
{{#template}}</template>{{/template}}`;
}


export function getWsdlEndpointXml(data: WsdlEndpointArgs) {

    data.retryCount = Number(data.retryCount ?? 0);
    data.initialDuration = Number(data.initialDuration ?? -1);
    data.progressionFactor = Number(data.progressionFactor ?? 1);
    data.optimize = (data.optimize === 'LEAVE_AS_IS' || data.optimize === null) ? null : data.optimize.toLowerCase();
    data.format = (data.format === 'LEAVE_AS_IS' || data.format === null) ? null : data.format === 'SOAP 1.1' ? 'soap11' :
        data.format === 'SOAP 1.2' ? 'soap12' : data.format.toLowerCase();

    let timeout, endpoint, template;

    assignNullToEmptyStrings(data);

    data.maximumDuration = data.maximumDuration === Number.MAX_SAFE_INTEGER ? null : data.maximumDuration;
    data.timeoutDuration = data.timeoutDuration === Number.MAX_SAFE_INTEGER ? null : data.timeoutDuration;
    data.timeoutAction = (data.timeoutAction === 'Never' || data.timeoutAction === null) ? null : data.timeoutAction.toLowerCase();
    if (data.timeoutDuration != null || data.timeoutAction != null) {
        timeout = true;
    }

    data.addressListener = data.addressListener === 'enable' ? 'true' : null;

    if (!data.requireProperties || data.properties.length == 0) {
        data.properties = null;
    } else {
        data.properties.forEach(element => {
            element.scope = element.scope === 'default' ? null : element.scope;
        });
    }

    data.templateName != null && data.templateName != '' ? template = true : endpoint = true;

    data.endpointName = (data.endpointName != null && data.endpointName != '') ?
         data.endpointName : "endpoint_urn_uuid_".concat(generateUUID());

    let parameters: any = [];
    if (!data.requireTemplateParameters || data.templateParameters.length == 0) {
        data.templateParameters = null;
    } else {
        let incrementalValue = 1;
        data.templateParameters.forEach(element => {
            parameters.push({ key: 'axis2ns'.concat(String(incrementalValue).padStart(2, '0')), value: element });
            incrementalValue++;
        });
    }

    if (data.seperatePolicies) {
        data.policyKey = '';
    } else {
        data.inboundPolicyKey = '';
        data.outboundPolicyKey = '';
    }

    const modifiedData = {
        ...data,
        timeout,
        endpoint,
        template,
        parameters
    };

    return render(getWsdlEndpointMustacheTemplate(), modifiedData);
}

function assignNullToEmptyStrings(obj: { [key: string]: any }): void {
    for (const key in obj) {
        if (obj[key] === '' || obj[key] === 'disable') {
            obj[key] = null;
        }
    }
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
