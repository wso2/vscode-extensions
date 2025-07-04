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

export interface DataServiceArgs {
    dataServiceName: string;
    dataServiceNamespace: string;
    serviceGroup: string;
    selectedTransports: string;
    publishSwagger?: string;
    jndiName?: string;
    enableBoxcarring: boolean | null;
    enableBatchRequests: boolean | null;
    serviceStatus: string | null;
    disableLegacyBoxcarringMode: boolean | null;
    enableStreaming: boolean | null;
    description?: string | null;
    datasources: Datasource[];
    authProviderClass?: string;
    authProperties: Property[] | null;
    queries: any[] | undefined;
    operations: any[] | undefined;
    resources: any[] | undefined;
    writeType: string;
}

export interface Datasource {
    dataSourceName: string;
    enableOData: boolean | null;
    dynamicUserAuthClass?: string;
    datasourceProperties: Property[];
    datasourceConfigurations: Configuration[];
    dynamicUserAuthMapping?: boolean | null;
}

export interface Property {
    key: string;
    value: string;
}

export interface Configuration {
    carbonUsername: string;
    username: string;
    password: string;
}

export interface Query {
    queryName: string;
    datasource: string;
    sqlQuery?: string;
    expression?: string;
    returnGeneratedKeys: boolean | null;
    keyColumns?: string;
    returnUpdatedRowCount: boolean | null;
    queryProperties: Property[];
    hasQueryProperties: boolean | null;
    queryParams: QueryParam[];
    result?: Result;
}

export interface QueryParam {
    paramName: string;
    paramType: string;
    sqlType: string;
    defaultValue?: string;
    type: string;
    ordinal?: string;
    optional: boolean;
    validators: Validator[] | null;
}

export interface Validator {
    validationType: string;
    minimum?: string;
    maximum?: string;
    pattern?: string;
}

export interface Result {
    useColumnNumbers: boolean | null;
    escapeNonPrintableChar: boolean | null;
    defaultNamespace?: string;
    xsltPath?: string;
    rdfBaseURI?: string;
    element?: string;
    rowName?: string
    outputType?: string;
    elements: ElementResult[];
    complexElements: ComplexElementResult[];
    attributes: AttributeResult[];
    queries: QueryResult[];
}

export interface ElementResult {
    elementName: string;
    elementNamespace?: string;
    datasourceColumn?: string
    arrayName?: string;
    xsdType: string;
    optional: boolean;
    exportName?: string;
    exportType?: string;
    requiredRoles: string;
}

export interface ComplexElementResult {
    elementName: string;
    elementNamespace?: string;
    arrayName?: string;
    requiredRoles: string;
}

export interface AttributeResult {
    attributeName: string;
    datasourceColumn?: string
    xsdType: string;
    optional: boolean;
    exportName?: string;
    exportType?: string;
    requiredRoles: string;
}

export interface QueryResult {
    query: string;
    requiredRoles: string;
    queryParams: Property[];
    hasQueryParams: boolean | null;
}

export interface Operation {
    operationName: string;
    returnRequestStatus: boolean | null;
    disableStreaming: boolean | null;
    operationDescription?: string;
    query: string;
    queryParams: Property[];
    hasQueryParams: boolean | null;
}

export interface Resource {
    method: string;
    path: string;
    returnRequestStatus: boolean | null;
    disableStreaming: boolean | null;
    resourceDescription?: string;
    query: string;
    queryParams: Property[];
    hasQueryParams: boolean | null;
}

export function getDataServiceCreateMustacheTemplate() {
    return `
<data name="{{dataServiceName}}" serviceNamespace="{{dataServiceNamespace}}" serviceGroup="{{serviceGroup}}" transports="{{selectedTransports}}" {{#publishSwagger}}publishSwagger="{{publishSwagger}}"{{/publishSwagger}} {{#jndiName}}txManagerJNDIName="{{jndiName}}"{{/jndiName}} {{#enableBoxcarring}}enableBoxcarring="{{enableBoxcarring}}"{{/enableBoxcarring}} {{#enableBatchRequests}}enableBatchRequests="{{enableBatchRequests}}"{{/enableBatchRequests}} {{#serviceStatus}}serviceStatus="active"{{/serviceStatus}} {{#disableLegacyBoxcarringMode}}disableLegacyBoxcarringMode="{{disableLegacyBoxcarringMode}}"{{/disableLegacyBoxcarringMode}} {{#enableStreaming}}disableStreaming="true"{{/enableStreaming}}>
  {{#description}}<description>{{description}}</description>{{/description}}{{^description}}<description/>{{/description}}
  {{#datasources}}
  <config id="{{dataSourceName}}" {{#enableOData}}enableOData="{{enableOData}}"{{/enableOData}}>
    {{#datasourceProperties}}
    <property name="{{key}}">{{value}}</property>
    {{/datasourceProperties}}
    {{#secretAlias}}<property xmlns:svns="http://org.wso2.securevault/configuration" name="password" svns:secretAlias="{{secretAlias}}" />{{/secretAlias}}
    {{#dynamicUserAuthClass}}<property name="dynamicUserAuthClass">{{dynamicUserAuthClass}}</property>{{/dynamicUserAuthClass}}
    {{#dynamicUserAuthMapping}}<property name="dynamicUserAuthMapping">
      <configuration>
        {{#datasourceConfigurations}}
        <entry request="{{carbonUsername}}">
          <username>{{username}}</username>
          <password>{{password}}</password>
        </entry>
        {{/datasourceConfigurations}}
      </configuration>
    </property>{{/dynamicUserAuthMapping}}
  </config>
  {{/datasources}}
  {{#authProviderClass}}<authorization_provider class="{{authProviderClass}}">
    {{#authProperties}}
    <property name="{{key}}">{{value}}</property>
    {{/authProperties}}
  </authorization_provider>{{/authProviderClass}}
</data>`;
}

export function getDataServiceEditMustacheTemplate() {
    return `
<data name="{{dataServiceName}}" serviceNamespace="{{dataServiceNamespace}}" serviceGroup="{{serviceGroup}}" transports="{{selectedTransports}}" {{#publishSwagger}}publishSwagger="{{publishSwagger}}"{{/publishSwagger}} {{#jndiName}}txManagerJNDIName="{{jndiName}}"{{/jndiName}} {{#enableBoxcarring}}enableBoxcarring="{{enableBoxcarring}}"{{/enableBoxcarring}} {{#enableBatchRequests}}enableBatchRequests="{{enableBatchRequests}}"{{/enableBatchRequests}} {{#serviceStatus}}serviceStatus="active"{{/serviceStatus}} {{#disableLegacyBoxcarringMode}}disableLegacyBoxcarringMode="{{disableLegacyBoxcarringMode}}"{{/disableLegacyBoxcarringMode}} {{#enableStreaming}}disableStreaming="true"{{/enableStreaming}}>
  {{#description}}<description>{{description}}</description>{{/description}}{{^description}}<description/>{{/description}}
  {{#datasources}}
  <config id="{{dataSourceName}}" {{#enableOData}}enableOData="{{enableOData}}"{{/enableOData}}>
    {{#datasourceProperties}}
    <property name="{{key}}">{{value}}</property>
    {{/datasourceProperties}}
    {{#secretAlias}}<property xmlns:svns="http://org.wso2.securevault/configuration" name="password" svns:secretAlias="{{secretAlias}}" />{{/secretAlias}}
    {{#dynamicUserAuthClass}}<property name="dynamicUserAuthClass">{{dynamicUserAuthClass}}</property>{{/dynamicUserAuthClass}}
    {{#dynamicUserAuthMapping}}<property name="dynamicUserAuthMapping">
      <configuration>
        {{#datasourceConfigurations}}
        <entry request="{{carbonUsername}}">
          <username>{{username}}</username>
          <password>{{password}}</password>
        </entry>
        {{/datasourceConfigurations}}
      </configuration>
    </property>{{/dynamicUserAuthMapping}}
  </config>
  {{/datasources}}
  {{#queries}}
    {{{.}}}
  {{/queries}}
  {{#resources}}
        {{{.}}}
    {{/resources}}
  {{#operations}}
  {{{.}}}
  {{/operations}}
  {{#authProviderClass}}<authorization_provider class="{{authProviderClass}}">
    {{#authProperties}}
    <property name="{{key}}">{{value}}</property>
    {{/authProperties}}
  </authorization_provider>{{/authProviderClass}}
</data>`;
}

export function getDataSourceMustacheTemplate() {
    return `
    <config id="{{dataSourceName}}" {{#enableOData}}enableOData="{{enableOData}}"{{/enableOData}}>
    {{#datasourceProperties}}
    <property name="{{key}}">{{value}}</property>
    {{/datasourceProperties}}
    {{#secretAlias}}<property xmlns:svns="http://org.wso2.securevault/configuration" name="password" svns:secretAlias="{{secretAlias}}" />{{/secretAlias}}
    {{#dynamicUserAuthClass}}<property name="dynamicUserAuthClass">{{dynamicUserAuthClass}}</property>{{/dynamicUserAuthClass}}
    {{#dynamicUserAuthMapping}}<property name="dynamicUserAuthMapping">
      <configuration>
        {{#datasourceConfigurations}}
        <entry request="{{carbonUsername}}">
          <username>{{username}}</username>
          <password>{{password}}</password>
        </entry>
        {{/datasourceConfigurations}}
      </configuration>
    </property>{{/dynamicUserAuthMapping}}
  </config>`;
}

export function getDataSourceXml(data: Datasource) {

    data.enableOData = data.enableOData ? data.enableOData : null;
    if (data.datasourceConfigurations != null && data.datasourceConfigurations.length > 0) {
        data.dynamicUserAuthMapping = true;
    } else {
        data.dynamicUserAuthMapping = null;
    }

    let secretAlias: (string | null) = null;
    data.datasourceProperties.forEach(property => {
        if (property.key === "useSecretAlias") {
            if (property.value) {
                const secretElement = data.datasourceProperties.find(element => element.key === "secretAlias");
                if (secretElement) {
                    secretAlias = secretElement.value;
                }
            }
        }
    });
    data.datasourceProperties = data.datasourceProperties.filter(element => !["secretAlias", "useSecretAlias"].includes(element.key));

    assignNullToEmptyStrings(data);

    return render(getDataSourceMustacheTemplate(), { ...data, secretAlias });
}

export function getDataServiceXml(data: DataServiceArgs) {

    data.description = data.description ? data.description : null;
    data.enableBoxcarring = data.enableBoxcarring ? data.enableBoxcarring : null;
    data.enableBatchRequests = data.enableBatchRequests ? data.enableBatchRequests : null;
    data.disableLegacyBoxcarringMode = data.disableLegacyBoxcarringMode ? data.disableLegacyBoxcarringMode : null;
    data.enableStreaming = data.enableStreaming ? null : !data.enableStreaming;
    data.serviceStatus = data.serviceStatus ? data.serviceStatus : null;

    if (data.authProperties != null && data.authProperties.length == 0) {
        data.authProperties = null;
    }

    data.datasources.forEach(datasource => {
        datasource.enableOData = datasource.enableOData ? datasource.enableOData : null;
    })

    if (data.datasources.length > 0) {
        data.datasources.forEach(datasource => {
            assignNullToEmptyStrings(datasource);
        })
    }

    let secretAlias: (string | null) = null;
    data.datasources.forEach(datasource => {
        if (datasource.datasourceConfigurations != null && datasource.datasourceConfigurations.length > 0) {
            datasource.dynamicUserAuthMapping = true;
        } else {
            datasource.dynamicUserAuthMapping = null;
        }
        datasource.datasourceProperties.forEach(property => {
            if (property.key === "useSecretAlias") {
                if (property.value) {
                    const secretElement = datasource.datasourceProperties.find(element => element.key === "secretAlias");
                    if (secretElement) {
                        secretAlias = secretElement.value;
                    }
                }
            }
        });
        datasource.datasourceProperties = datasource.datasourceProperties.filter(element => !["secretAlias", "useSecretAlias"].includes(element.key));
    });

    assignNullToEmptyStrings(data);

    if (data.writeType === 'edit') {
        return render(getDataServiceEditMustacheTemplate(), { ...data, secretAlias });
    } else {
        return render(getDataServiceCreateMustacheTemplate(), { ...data, secretAlias });
    }
}

function assignNullToEmptyStrings(obj: { [key: string]: any }): void {
    for (const key in obj) {
        if ((Array.isArray(obj[key]) && obj[key].length == 0) || obj[key] === '' || obj[key] === 'disable' || obj[key] == undefined) {
            obj[key] = null;
        }
    }
}
