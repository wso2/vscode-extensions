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

export function restructureDssQueryST(query: any) {

    const inputMappings: any = query.params;
    const outputMappings: any = {};
    const queryParams: any = {};

    if (query.result) {
        if (query.result.elements) {
            outputMappings.elements = query.result.elements;
            delete query.result.elements;
        }
        if (query.result.attributes) {
            outputMappings.attributes = query.result.attributes;
            delete query.result.attributes;
        }
        if (query.result.callQueries) {
            outputMappings.callQueries = query.result.callQueries;
            delete query.result.callQueries;
        }
    }

    const transformation: any = query.result;
    queryParams.sql = query.sql;

    delete query.params
    delete query.sql
    if (query.result) {
        delete query.result
    }
    queryParams.properties = query;

    let updatedQuery = {
        inputMappings: inputMappings,
        query: queryParams,
        transformation: transformation,
        outputMappings: outputMappings
    };

    return updatedQuery;
}
