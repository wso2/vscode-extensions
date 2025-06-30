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

export interface HttpEndpointArgs {
    endpointName: string;
    traceEnabled: string | null;
    statisticsEnabled: string | null;
    uriTemplate: string;
    httpMethod: string | null;
    description: string;
    requireProperties: boolean;
    properties: any;
    authType: string;
    basicAuthUsername: string;
    basicAuthPassword: string;
    authMode: string;
    grantType: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    tokenUrl: string;
    username: string;
    password: string;
    requireOauthParameters: boolean;
    oauthProperties: any;
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

export function getHttpEndpointMustacheTemplate() {
    return `<?xml version="1.0" encoding="UTF-8"?>
{{#template}}<template name="{{templateName}}" xmlns="http://ws.apache.org/ns/synapse">{{/template}}
{{#parameters}}
<{{{key}}}:parameter name="{{value}}" xmlns:{{{key}}}="http://ws.apache.org/ns/synapse"/>
{{/parameters}}
<endpoint name="{{endpointName}}" {{^template}}xmlns="http://ws.apache.org/ns/synapse"{{/template}}>
    <http {{#httpMethod}}method="{{httpMethod}}"{{/httpMethod}} {{#statisticsEnabled}}statistics="{{statisticsEnabled}}"{{/statisticsEnabled}} {{#traceEnabled}}trace="{{traceEnabled}}"{{/traceEnabled}} uri-template="{{uriTemplate}}">
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
        {{#authentication}}<authentication>
            {{#basicAuth}}<basicAuth>
                {{#basicAuthUsername}}<username>{{basicAuthUsername}}</username>{{/basicAuthUsername}}{{^basicAuthUsername}}<username/>{{/basicAuthUsername}}
                {{#basicAuthPassword}}<password>{{basicAuthPassword}}</password>{{/basicAuthPassword}}{{^basicAuthPassword}}<password/>{{/basicAuthPassword}}
            </basicAuth>{{/basicAuth}}
            {{#oauth}}<oauth>
                {{#authorizationCode}}<authorizationCode>
                    {{#refreshToken}}<refreshToken>{{refreshToken}}</refreshToken>{{/refreshToken}}{{^refreshToken}}{{/refreshToken}}
                    {{#clientId}}<clientId>{{clientId}}</clientId>{{/clientId}}{{^clientId}}<clientId/>{{/clientId}}
                    {{#clientSecret}}<clientSecret>{{clientSecret}}</clientSecret>{{/clientSecret}}{{^clientSecret}}<clientSecret/>{{/clientSecret}}
                    {{#tokenUrl}}<tokenUrl>{{tokenUrl}}</tokenUrl>{{/tokenUrl}}{{^tokenUrl}}<tokenUrl/>{{/tokenUrl}}
                    {{#requireOauthParameters}}<requestParameters>{{/requireOauthParameters}}
                    {{#oauthProperties}}
                        <parameter name="{{key}}">{{value}}</parameter>
                    {{/oauthProperties}} 
                    {{#requireOauthParameters}}</requestParameters>{{/requireOauthParameters}}
                    <authMode>{{authMode}}</authMode>
                </authorizationCode>{{/authorizationCode}}
                {{#clientCredentials}}<clientCredentials>
                    {{#clientId}}<clientId>{{clientId}}</clientId>{{/clientId}}{{^clientId}}<clientId/>{{/clientId}}
                    {{#clientSecret}}<clientSecret>{{clientSecret}}</clientSecret>{{/clientSecret}}{{^clientSecret}}<clientSecret/>{{/clientSecret}}
                    {{#tokenUrl}}<tokenUrl>{{tokenUrl}}</tokenUrl>{{/tokenUrl}}{{^tokenUrl}}<tokenUrl/>{{/tokenUrl}}
                    {{#requireOauthParameters}}<requestParameters>{{/requireOauthParameters}}
                    {{#oauthProperties}}
                        <parameter name="{{key}}">{{value}}</parameter>
                    {{/oauthProperties}}    
                    {{#requireOauthParameters}}</requestParameters>{{/requireOauthParameters}}                
                    <authMode>{{authMode}}</authMode>
                </clientCredentials>{{/clientCredentials}}
                {{#passwordCredentials}}<passwordCredentials>
                    {{#username}}<username>{{username}}</username>{{/username}}{{^username}}<username/>{{/username}}
                    {{#password}}<password>{{password}}</password>{{/password}}{{^password}}<password/>{{/password}}
                    {{#clientId}}<clientId>{{clientId}}</clientId>{{/clientId}}{{^clientId}}<clientId/>{{/clientId}}
                    {{#clientSecret}}<clientSecret>{{clientSecret}}</clientSecret>{{/clientSecret}}{{^clientSecret}}<clientSecret/>{{/clientSecret}}
                    {{#tokenUrl}}<tokenUrl>{{tokenUrl}}</tokenUrl>{{/tokenUrl}}{{^tokenUrl}}<tokenUrl/>{{/tokenUrl}}
                    {{#requireOauthParameters}}<requestParameters>{{/requireOauthParameters}}
                    {{#oauthProperties}}
                        <parameter name="{{key}}">{{value}}</parameter>
                    {{/oauthProperties}}  
                    {{#requireOauthParameters}}</requestParameters>{{/requireOauthParameters}}
                    <authMode>{{authMode}}</authMode>
                </passwordCredentials>{{/passwordCredentials}}
            </oauth>{{/oauth}}
        </authentication>{{/authentication}}
    </http>
    {{#properties}}
    <property name="{{name}}" {{#scope}}scope="{{scope}}"{{/scope}} value="{{value}}"/>
    {{/properties}}  
    {{#description}}<description>{{description}}</description>{{/description}}
</endpoint>
{{#template}}</template>{{/template}}`;
}


export function getHttpEndpointXml(data: HttpEndpointArgs) {

    data.retryCount = Number(data.retryCount ?? 0);
    data.initialDuration = Number(data.initialDuration ?? -1);
    data.progressionFactor = Number(data.progressionFactor ?? 1);
    data.httpMethod = (data.httpMethod === 'leave_as_is' || data.httpMethod === null) ? null : data.httpMethod.toLowerCase();

    let timeout, authentication, basicAuth, oauth, authorizationCode, clientCredentials, passwordCredentials, endpoint, template;

    assignNullToEmptyStrings(data);

    data.maximumDuration = data.maximumDuration === Number.MAX_SAFE_INTEGER ? null : data.maximumDuration;
    data.timeoutDuration = data.timeoutDuration === Number.MAX_SAFE_INTEGER ? null : data.timeoutDuration;
    data.timeoutAction = (data.timeoutAction === 'Never' || data.timeoutAction === null) ? null : data.timeoutAction.toLowerCase();
    if (data.timeoutDuration != null || data.timeoutAction != null) {
        timeout = true;
    }

    if (data.authType === 'None') {
        authentication = null;
    } else if (data.authType === 'Basic Auth') {
        basicAuth = true;
        authentication = true;
    } else {
        oauth = true;
        authentication = true;
        if (data.grantType === 'Authorization Code') {
            authorizationCode = true;
        } else if (data.grantType === 'Client Credentials') {
            clientCredentials = true;
        } else {
            passwordCredentials = true;
        }
    }

    data.addressListener = data.addressListener === 'enable' ? 'true' : null;

    if (!data.requireProperties || data.properties.length == 0) {
        data.properties = null;
    } else {
        data.properties.forEach(element => {
            element.scope = element.scope === 'default' ? null : element.scope;
        });
    }

    if (!data.requireOauthParameters || data.oauthProperties.length == 0) {
        data.oauthProperties = null;
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
        authentication,
        basicAuth,
        oauth,
        authorizationCode,
        clientCredentials,
        passwordCredentials,
        endpoint,
        template,
        parameters
    };

    return render(getHttpEndpointMustacheTemplate(), modifiedData);
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
