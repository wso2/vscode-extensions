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

import Mustache from "mustache";

export function getDssQueryTemplate() {
    return `
        <query id="{{queryName}}" useConfig="{{datasource}}" {{#returnGeneratedKeys}}returnGeneratedKeys="{{returnGeneratedKeys}}"{{/returnGeneratedKeys}} {{#keyColumns}}keyColumns="{{keyColumns}}"{{/keyColumns}} {{#returnUpdatedRowCount}}returnUpdatedRowCount="{{returnUpdatedRowCount}}"{{/returnUpdatedRowCount}}>
        {{#sqlType}}{{#sqlQuery}}<sql>{{{sqlQuery}}}</sql>{{/sqlQuery}}{{/sqlType}}
        {{#expressionType}}<expression>{{{sqlQuery}}}</expression>{{/expressionType}}
        {{#queryParams}}
        {{#hasValidators}}<param name="{{paramName}}" paramType="{{paramType}}" sqlType="{{sqlType}}" {{#defaultValue}}defaultValue="{{defaultValue}}"{{/defaultValue}} type="{{type}}" {{#ordinal}}ordinal="{{ordinal}}"{{/ordinal}}>
          {{#validators}}
          <{{validationType}} {{#maximum}}maximum="{{maximum}}"{{/maximum}} {{#minimum}}minimum="{{minimum}}"{{/minimum}} {{#pattern}}pattern="{{pattern}}"{{/pattern}} />
          {{/validators}}
        </param>{{/hasValidators}}{{^hasValidators}}
        <param name="{{paramName}}" paramType="{{paramType}}" sqlType="{{sqlType}}" {{#defaultValue}}defaultValue="{{defaultValue}}"{{/defaultValue}} type="{{type}}" {{#ordinal}}ordinal="{{ordinal}}"{{/ordinal}} />
        {{/hasValidators}}
        {{/queryParams}}
        {{#result}}<result {{#useColumnNumbers}}useColumnNumbers="{{useColumnNumbers}}"{{/useColumnNumbers}} {{#escapeNonPrintableChar}}escapeNonPrintableChar="{{escapeNonPrintableChar}}"{{/escapeNonPrintableChar}} {{#defaultNamespace}}defaultNamespace="{{defaultNamespace}}"{{/defaultNamespace}} {{#xsltPath}}xsltPath="{{xsltPath}}"{{/xsltPath}} {{#rdfBaseURI}}rdfBaseURI="{{rdfBaseURI}}"{{/rdfBaseURI}} {{#element}}element="{{element}}"{{/element}} {{#rowName}}rowName="{{rowName}}"{{/rowName}} {{#outputType}}outputType="{{outputType}}"{{/outputType}}>
          {{#queries}}
          {{#hasQueryParams}}<call-query href="{{query}}" requiredRoles="{{requiredRoles}}">
            {{#queryParams}}
            <with-param name="{{paramName}}" {{#column}}column="{{column}}"{{/column}} {{#queryParam}}query-param="{{queryParam}}"{{/queryParam}} />
            {{/queryParams}}
          </call-query>{{/hasQueryParams}}
          {{^hasQueryParams}}<call-query href="{{query}}" requiredRoles="{{requiredRoles}}" />{{/hasQueryParams}}
          {{/queries}}{{#attributes}}
          <attribute name="{{attributeName}}" {{#datasourceColumn}}column="{{datasourceColumn}}"{{/datasourceColumn}} {{#queryParam}}query-param="{{queryParam}}"{{/queryParam}} xsdType="{{xsdType}}" {{#optional}}optional="{{optional}}"{{/optional}} {{#exportName}}export="{{exportName}}"{{/exportName}} {{exportType}}exportType="{{#exportType}}"{{/exportType}} requiredRoles="{{requiredRoles}}" />
          {{/attributes}}{{#elements}}
          <element name="{{elementName}}" {{#elementNamespace}}namespace="{{elementNamespace}}"{{/elementNamespace}} {{#datasourceColumn}}column="{{datasourceColumn}}"{{/datasourceColumn}} {{#queryParam}}query-param="{{queryParam}}"{{/queryParam}} {{#arrayName}}arrayName="{{arrayName}}"{{/arrayName}} xsdType="{{xsdType}}" {{#optional}}optional="{{optional}}"{{/optional}} {{#exportName}}export="{{exportName}}"{{/exportName}} {{#exportType}}exportType="{{exportType}}"{{/exportType}} requiredRoles="{{requiredRoles}}" />
          {{/elements}}{{#complexElements}}
          <element name="{{elementName}}" {{#elementNamespace}}namespace="{{elementNamespace}}"{{/elementNamespace}} {{#arrayName}}arrayName="{{arrayName}}"{{/arrayName}} requiredRoles="{{requiredRoles}}">
            {{{childElements}}}
          </element>
          {{/complexElements}}{{#jsonPayload}}{{{jsonPayload}}}{{/jsonPayload}}
        </result>{{/result}}
        {{#hasQueryProperties}}<properties>
          {{#queryProperties}}
          <property name="{{key}}">{{value}}</property>
          {{/queryProperties}}
        </properties>{{/hasQueryProperties}}
      </query>`;
}

export function getDssResourceQueryParamsTemplate() {
    return `
        {{#hasQueryParams}}<call-query href="{{query}}">
          {{#queryParams}}
          <with-param name="{{key}}" query-param="{{value}}" />
          {{/queryParams}}
        </call-query>{{/hasQueryParams}}
        {{^hasQueryParams}}<call-query href="{{query}}" />{{/hasQueryParams}}`;
}

export function getDssResourceSelfClosingTemplate() {
    return `<call-query href="{{query}}" />`;
}

export function getDssResourceTemplate() {
    return `<call-query href="{{query}}">`;
}

export function getDssQueryXml(data: { [key: string]: any }) {

    if (data.queryParams.length > 0) {
        data.queryParams.forEach((param: any) => {
            assignNullToEmptyStrings(param);
            if (param.validators != null && param.validators.length > 0) {
                param.validators.forEach((validator: any) => {
                    validator.validationType = validator.validationType === 'Long Range Validator' ? 'validateLongRange' :
                        validator.validationType === 'Double Range Validator' ? 'validateDoubleRange' :
                            validator.validationType === 'Length Validator' ? 'validateLength' : 'validatePattern';
                    assignNullToEmptyStrings(validator);
                });
            } else {
                param.validators = null;
            }
        });
    }
    if (data.result != undefined) {
        if (data.result.queries.length > 0) {
            data.result.queries.forEach((subQuery: any) => {
                assignNullToEmptyStrings(subQuery);
            })
        }
        if (data.result.attributes.length > 0) {
            data.result.attributes.forEach((attribute: any) => {
                assignNullToEmptyStrings(attribute);
            })
        }
        if (data.result.elements.length > 0) {
            data.result.elements.forEach((element: any) => {
                assignNullToEmptyStrings(element);
            })
        }
        if (data.result.complexElements.length > 0) {
            data.result.complexElements.forEach((element: any) => {
                assignNullToEmptyStrings(element);
            })
        }
        data.result.useColumnNumbers = data.result.useColumnNumbers ? data.result.useColumnNumbers : null;
        data.result.escapeNonPrintableChar = data.result.escapeNonPrintableChar ? data.result.escapeNonPrintableChar : null;
        data.result.outputType = data.result.outputType === 'XML' ? null : data.result.outputType.toLowerCase();
    }
    data.returnGeneratedKeys = data.returnGeneratedKeys ? data.returnGeneratedKeys : null;
    data.returnUpdatedRowCount = data.returnUpdatedRowCount ? data.returnUpdatedRowCount : null;
    assignNullToEmptyStrings(data.result);
    if (data.result.outputType === null || data.result.outputType !== 'json') {
        delete data.result["jsonPayload"];
    }
    data.result = Object.values(data.result).every(value => value === null) ? null : data.result;

    const sqlType = data.queryType === "sql" ? true : false;
    const expressionType = data.queryType === "expression" ? true : false;
    data.sqlQuery = data.sqlQuery === "" ? null : data.sqlQuery;

    const output = Mustache.render(getDssQueryTemplate(), {...data, sqlType, expressionType})?.trim();
    return output;
}

export function getDssResourceQueryParamsXml(data: { [key: string]: any }) {

    const output = Mustache.render(getDssResourceQueryParamsTemplate(), data)?.trim();
    return output;
}

export function getDssResourceSelfClosingXml(data: { [key: string]: any }) {

    const output = Mustache.render(getDssResourceSelfClosingTemplate(), data)?.trim();
    return output;
}

export function getDssResourceXml(data: { [key: string]: any }) {

    const output = Mustache.render(getDssResourceTemplate(), data)?.trim();
    return output;
}

function assignNullToEmptyStrings(obj: { [key: string]: any }): void {
    for (const key in obj) {
        if ((Array.isArray(obj[key]) && obj[key].length == 0) || obj[key] === '' || obj[key] === 'disable' || obj[key] == undefined) {
            obj[key] = null;
        }
    }
}
