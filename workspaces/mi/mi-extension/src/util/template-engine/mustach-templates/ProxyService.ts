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

export interface ProxyServiceTemplateArgs {
    proxyServiceName: string;
    proxyServiceType: string;
    selectedTransports: string;
    endpointType: string;
    endpoint: string;
    requestLogLevel: string | null;
    responseLogLevel: string | null;
    securityPolicy: string;
    requestXslt: string;
    responseXslt: string;
    transformResponse: string;
    wsdlUri: string;
    wsdlService: string;
    wsdlPort: number | null;
    publishContract: string;
}

export function getProxyServiceMustacheTemplate() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<proxy name="{{proxyServiceName}}" startOnLoad="true" transports="{{selectedTransports}}" xmlns="http://ws.apache.org/ns/synapse">
    <target>
        {{#customProxy}}
        <inSequence>
        </inSequence>
        <faultSequence/>
        {{/customProxy}}
        {{^customProxy}}
        {{#endpointName}}
        <endpoint name="{{endpointName}}">
            {{#wsdlProxy}}<wsdl port="{{wsdlPort}}" service="{{wsdlService}}" uri="{{wsdlUri}}">{{/wsdlProxy}}
            {{^wsdlProxy}}<address uri="{{endpoint}}">{{/wsdlProxy}}
                <suspendOnFailure>
                    <initialDuration>-1</initialDuration>
                    <progressionFactor>1</progressionFactor>
                </suspendOnFailure>
                <markForSuspension>
                    <retriesBeforeSuspension>0</retriesBeforeSuspension>
                </markForSuspension>
            {{#wsdlProxy}}</wsdl>{{/wsdlProxy}}
            {{^wsdlProxy}}</address>{{/wsdlProxy}}
        </endpoint>
        {{/endpointName}}
        {{^endpointName}}
        <endpoint key="{{endpoint}}"/>
        {{/endpointName}}
        {{/customProxy}}
        {{#loggingProxy}}
        <inSequence>
            <log{{#requestLogLevel}} level="{{requestLogLevel}}"{{/requestLogLevel}}/>
        </inSequence>
        <outSequence>
            <log{{#responseLogLevel}} level="{{responseLogLevel}}"{{/responseLogLevel}}/>
            <send/>
        </outSequence>
        <faultSequence/>
        {{/loggingProxy}}
        {{#passThroughProxy}}
        <inSequence/>
        <outSequence>
            <send/>
        </outSequence>
        <faultSequence/>
        {{/passThroughProxy}}
        {{#secureProxy}}
        <inSequence>
            <header action="remove" name="wsse:Security" scope="default" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"/>
        </inSequence>
        <outSequence>
            <send/>
        </outSequence>
        <faultSequence/>
        {{/secureProxy}}
        {{#transformerProxy}}
        <inSequence>
            <xslt key="{{requestXslt}}"/>
        </inSequence>
        <outSequence>
            {{#transformResponse}}<xslt key="{{responseXslt}}"/>{{/transformResponse}}
            <send/>
        </outSequence>
        <faultSequence/>
        {{/transformerProxy}}
        {{#wsdlProxy}}
        <inSequence/>
        <outSequence>
            <send/>
        </outSequence>
        <faultSequence/>
        {{/wsdlProxy}}
    </target>
    {{#secureProxy}}
    <enableSec/>
    {{/secureProxy}}
    {{#publishContract}}<publishWSDL preservePolicy="true" uri="{{wsdlUri}}"/>{{/publishContract}}
</proxy>`;
}


export function getProxyServiceXml(data: ProxyServiceTemplateArgs) {

    let customProxy, loggingProxy, passThroughProxy, secureProxy, transformerProxy, wsdlProxy;
    if (data.proxyServiceType === 'Custom Proxy') {
        customProxy = true;
    } else if (data.proxyServiceType === 'Logging Proxy') {
        loggingProxy = true;
        data.requestLogLevel = data.requestLogLevel === 'Full' ? 'full' : data.requestLogLevel === 'None' ? 'custom' : null;
        data.responseLogLevel = data.responseLogLevel === 'Full' ? 'full' : data.responseLogLevel === 'None' ? 'custom' : null;
    } else if (data.proxyServiceType === 'Pass Through Proxy') {
        passThroughProxy = true;
    } else if (data.proxyServiceType === 'Secure Proxy') {
        secureProxy = true;
    } else if (data.proxyServiceType === 'Transformer Proxy') {
        transformerProxy = true;
    } else {
        wsdlProxy = true;
    }

    const endpointName = (data.endpointType === 'Custom' || data.proxyServiceType === 'WSDL Based Proxy') ?
        "endpoint_urn_uuid_".concat(generateUUID()) : null;

    const modifiedData = {
        ...data,
        customProxy,
        loggingProxy,
        passThroughProxy,
        secureProxy,
        transformerProxy,
        wsdlProxy,
        endpointName
    };

    return render(getProxyServiceMustacheTemplate(), modifiedData);
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
