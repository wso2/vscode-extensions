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

import { Query, ResultAttribute, ResultElement } from "@wso2/mi-syntax-tree/src";

export function getDSInputMappingsFromSTNode(node: Query) {
    const data: any = {};
    data.validators = [];
    data.inputMappings = node?.params.map((param) => {
        return [
            param.name,
            "",
            param.paramType,
            param.sqlType,
            param.defaultValue ?? "",
            param.type ?? "IN",
            param.ordinal ?? "",
            param.paramElements?.map((paramElement: any) => {
                let paramEle;
                if ("validateLongRange" in paramElement) {
                    paramEle = [
                        "Long Range Validator",
                        paramElement.validateLongRange.minimum,
                        paramElement.validateLongRange.maximum,
                        ""
                    ];
                } else if ("validateDoubleRange" in paramElement) {
                    paramEle = [
                        "Double Range Validator",
                        paramElement.validateDoubleRange.minimum,
                        paramElement.validateDoubleRange.maximum,
                        ""
                    ];
                } else if ("validateLength" in paramElement) {
                    paramEle = [
                        "Length Validator",
                        paramElement.validateLength.minimum,
                        paramElement.validateLength.maximum,
                        ""
                    ];
                } else {
                    paramEle = [
                        "Pattern Validator",
                        "",
                        "",
                        paramElement.validatePattern.pattern
                    ];
                }
                return paramEle;
            }) ?? []
        ]
    });
    data.queryObject = structureQuery(node);
    return data;
}

export function getDSQueryFromSTNode(node: Query) {
    const data: any = {};
    data.queryId = node?.id;
    data.datasource = node?.useConfig ?? "";
    data.sqlQuery = node.sql !== undefined ? node.sql.textNode : node.expression !== undefined ? node.expression.textNode : "",
    data.returnGeneratedKeys = node?.returnGeneratedKeys ?? false;
    data.keyColumns = node?.keyColumns ?? "";
    data.returnUpdatedRowCount = node?.returnUpdatedRowCount ?? false;
    if (node?.properties) {
        node.properties.property.forEach((property: any) => {
            data[property.name] = property.textNode;
        });
    }
    data.queryObject = structureQuery(node);
    return data;
}

export function getDSTransformationFromSTNode(node: Query) {
    const data: any = {};
    const result = node?.result;
    if (result) {
        data.outputType = result.outputType === undefined ? "XML" : result.outputType === "json" ? "JSON" : "RDF";
        data.useColumnNumbers = result.useColumnNumbers ?? false;
        data.escapeNonPrintableCharacters = result.escapeNonPrintableChar ?? false;
        data.rdfBaseUri = result.rdfBaseURI ?? "";
        data.groupedElement = result.element ?? "";
        data.rowName = result.rowName ?? "";
        data.rowNamespace = result.defaultNamespace ?? "";
        data.xsltPath = result.xsltPath ?? "";
    }
    data.queryObject = structureQuery(node);
    return data;
}

export function getDSOutputMappingsFromSTNode(node: Query) {
    const data: any = {};
    const result = node?.result;
    if (result) {
        const attributes = result.attributes?.map((attr:ResultAttribute): (string | boolean | any[])[] => {
            return [
                "Attribute",
                "",
                [],
                "queryParam" in attr ? "Query Param" : "Column",
                attr.name,
                "",
                "",
                attr.column ?? "",
                attr.queryParam ?? "",
                "arrayName" in attr ? "Array" : "Scalar",
                attr.arrayName ?? "",
                attr.xsdType,
                attr.optional ?? false,
                "",
                attr.exportName ?? "",
                attr.exportType ?? "Scalar",
                attr.requiredRoles ? attr.requiredRoles.split(",").includes("admin") : false,
                attr.requiredRoles ? attr.requiredRoles.split(",").includes("Internal/everyone") : false
            ]
        });

        const elements = result.elements?.filter((element) => {
            return !Object.keys(element).includes("elements");
        }).map((element): (string | boolean | any[])[] => {
            return [
                "Element",
                "",
                [],
                "queryParam" in element ? "Query Param" : "Column",
                element.name,
                "",
                element.namespace ?? "",
                element.column ?? "",
                element.queryParam ?? "",
                "arrayName" in element ? "Array" : "Scalar",
                element.arrayName ?? "",
                element.xsdType,
                element.optional ?? false,
                "",
                element.exportName ?? "",
                element.exportType ?? "Scalar",
                element.requiredRoles ? element.requiredRoles.split(",").includes("admin") : false,
                element.requiredRoles ? element.requiredRoles.split(",").includes("Internal/everyone"): false
            ]
        });

        const queries = result.callQueries?.map((query) => {
            return [
                "Query",
                query.href,
                query?.withParam?.map((param: any) => {
                    const mappingType = "column" in param ? "Column" : "Query Param";
                    let queryParam = [
                        param.name,
                        mappingType === "Column" ? param.column : param.queryParam,
                        mappingType
                    ];
                    return queryParam;
                }) ?? [],
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                query.requiredRoles ? query.requiredRoles.split(",").includes("admin") : false,
                query.requiredRoles ? query.requiredRoles.split(",").includes("Internal/everyone") : false
            ]
        });

        const complexElements = result.elements?.filter((complexElement) => {
            return Object.keys(complexElement).includes("elements");
        }).map((complexElement:ResultElement): (string | boolean | any[])[] => {
            return [
                "Complex Element",
                "",
                [],
                "",
                "",
                complexElement.name,
                complexElement.namespace ?? "",
                "",
                "",
                "arrayName" in complexElement ? "Array" : "Scalar",
                complexElement.arrayName ?? "",
                "",
                "",
                complexElement.inlineXml ?? "",
                "",
                "",
                complexElement.requiredRoles ? complexElement.requiredRoles.split(",").includes("admin") : false,
                complexElement.requiredRoles ? complexElement.requiredRoles.split(",").includes("Internal/everyone") : false
            ]
        });

        data.outputMappings = [
            ...(elements ?? []),
            ...(attributes ?? []),
            ...(queries ?? []),
            ...(complexElements ?? [])
        ];

        if (result.outputType !== undefined && result.outputType === "json") {
            data.outputJson = true;
            data.jsonPayload = result.textNode ?? "";
        } else {
            data.outputJson = false;
        }
    }

    data.queryObject = structureQuery(node);
    return data;
}

function structureQuery(query: Query) {

    const queryParams: any = query.params.map((param) => {
        const validators = param?.paramElements?.map((paramElement: any) => {
            let paramEle;
            if ("validateLongRange" in paramElement) {
                paramEle = {
                    validationType: "Long Range Validator",
                    minimum: paramElement.validateLongRange.minimum,
                    maximum: paramElement.validateLongRange.maximum
                };
            } else if ("validateDoubleRange" in paramElement) {
                paramEle = {
                    validationType: "Double Range Validator",
                    minimum: paramElement.validateDoubleRange.minimum,
                    maximum: paramElement.validateDoubleRange.maximum
                };
            } else if ("validateLength" in paramElement) {
                paramEle = {
                    validationType: "Length Validator",
                    minimum: paramElement.validateLength.minimum,
                    maximum: paramElement.validateLength.maximum
                };
            } else {
                paramEle = {
                    validationType: "Pattern Validator",
                    pattern: paramElement.validatePattern?.pattern
                };
            }
            return paramEle;
        }) ?? [];
        return {
            paramName: param.name,
            paramType: param.paramType,
            sqlType: param.sqlType,
            defaultValue: param.defaultValue ?? "",
            type: param.type ?? "IN",
            ordinal: param.ordinal ?? "",
            validators: validators,
            hasValidators: validators.length > 0
        };
    }) ?? [];

    let queryProperties: any = {};

    if (query.properties !== undefined) {
        query.properties.property.forEach((property: any) => {
            queryProperties[property.name] = property.textNode;
        });
    }

    queryProperties = Object.entries(queryProperties).map(([key, value]) => ({ key, value }));

    const elements = query.result?.elements?.filter((element) => {
        return !Object.keys(element).includes("elements");
    }).map((element) => {
        return {
            elementName: element.name,
            elementNamespace: element.namespace ?? "",
            datasourceColumn: element.column ?? "",
            queryParam: element.queryParam ?? "",
            arrayName: element.arrayName ?? "",
            xsdType: element.xsdType,
            optional: element.optional ?? false,
            exportName: element.exportName ?? "",
            exportType: element.exportType ?? "Scalar",
            requiredRoles: element.requiredRoles
        }
    }) ?? [];

    const attributes = query?.result?.attributes?.map((attr) => {
        return {
            attributeName: attr.name,
            datasourceColumn: attr.column ?? "",
            queryParam: attr.queryParam ?? "",
            xsdType: attr.xsdType,
            optional: attr.optional ?? false,
            exportName: attr.exportName ?? "",
            exportType: attr.exportType ?? "Scalar",
            requiredRoles: attr.requiredRoles
        }
    }) ?? [];

    const queries = query?.result?.callQueries?.map((query) => {
        const queryParams = query?.withParam?.map((param: any) => {
                const mappingType = "column" in param ? "Column" : "Query Param";
                let queryParam = {
                    paramName: param.name,
                    column: mappingType === "Column" ? param.column : "",
                    queryParam: mappingType === "Query Param" ? param.queryParam : "",
                    mappingType: mappingType
                };
                return queryParam;
            }) ?? [];
        return {
            query: query.href,
            requiredRoles: query.requiredRoles,
            queryParams: queryParams,
            hasQueryParams: queryParams.length > 0
        }
    }) ?? [];

    const complexElements = query?.result?.elements?.filter((complexElement) => {
        return Object.keys(complexElement).includes("elements");
    }).map((complexElement) => {
        return {
            elementName: complexElement.name,
            elementNamespace: complexElement.namespace ?? "",
            arrayName: complexElement.arrayName ?? "",
            requiredRoles: complexElement.requiredRoles,
            childElements: complexElement.inlineXml ?? ""
        }
    }) ?? [];

    const result: any = {
        outputType: query.result?.outputType === undefined ? "XML" : query.result?.outputType === "json" ? "JSON" : "RDF",
        useColumnNumbers: query.result?.useColumnNumbers ?? false,
        escapeNonPrintableChar: query.result?.escapeNonPrintableChar ?? false,
        defaultNamespace: query.result?.defaultNamespace ?? "",
        xsltPath: query.result?.xsltPath ?? "",
        rdfBaseURI: query.result?.rdfBaseURI ?? "",
        element: query.result?.element ?? "",
        rowName: query.result?.rowName ?? "",
        jsonPayload: query.result?.textNode ?? "",
        elements: elements,
        attributes: attributes,
        queries: queries,
        complexElements: complexElements
    }

    const data: any = {
        queryName: query.id,
        datasource: query.useConfig ?? "",
        returnGeneratedKeys: query.returnGeneratedKeys ?? false,
        keyColumns: query.keyColumns ?? "",
        returnUpdatedRowCount: query.returnUpdatedRowCount ?? false,
        sqlQuery: query.sql !== undefined ? query.sql.textNode : query.expression !== undefined ? query.expression.textNode : "",
        expression: query.expression !== undefined ? true : false,
        queryParams: queryParams,
        result: result,
        queryProperties: queryProperties ?? [],
        range: query.range,
        hasQueryProperties: queryProperties.length > 0
    }
    return data;
}

export const getParamManagerFromValues = (values: any[], keyIndex?: number, valueIndex: number = 1): any => {

    const defaultValueIndex = valueIndex;
    const getParamValues = (value: any): any => {
        return value.map((v: any) => {
            if (v instanceof Array) {
                return {
                    value: {
                        paramValues: getParamManagerFromValues(v)
                    }
                }
            }
            return { value: v };
        });
    }

    const getValidatorValue = (property: any) => {
        return property[0] === 'Pattern Validator' ? "pattern: " + property[3] :
            "min: " + property[1] + "; max: " + property[2];
    }

    const paramValues = values.map((value: any, index: number) => {

        if (value[keyIndex] === "Element" || value[keyIndex] === "Attribute") {
            valueIndex = 4;
        } else if (value[keyIndex] === "Complex Element") {
            valueIndex = 5;
        } else {
            valueIndex = defaultValueIndex;
        }

        const isValidator = value[0].includes("Validator");
        const isQueryParam = typeof value[2] === 'string' && (value[2].includes("Column") || value[2].includes("Query Param"));

        if (typeof value === 'object' && value !== null) {
            const paramValues = getParamValues(value);
            if (isValidator) {
                return {
                    id: index, key: value[0],
                    value: getValidatorValue(value),
                    paramValues
                };
            } else if (isQueryParam) {
                return {
                    id: index, key: value[0],
                    value: value[1],
                    paramValues
                };
            }
            else {
                return {
                    id: index, key: keyIndex != undefined ? typeof value[keyIndex] === 'object' ? value[keyIndex].value : value[keyIndex] : 12,
                    value: typeof value[valueIndex] === 'object' ? value[valueIndex].value : value[valueIndex],
                    paramValues
                };
            }
        } else {
            return { value };
        }
    });
    return paramValues;
}
