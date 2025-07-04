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

import React from "react"
import { DATA_SERVICE_NODES } from "../../../resources/constants"
import TransformationForm from "../dataServices/transformation";
import QueryForm from "../dataServices/query";
import InputMappingsForm from "../dataServices/input-mapping";
import OutputMappingsForm from "../dataServices/output-mapping";

export interface GetMediatorsProps {
    nodePosition: any;
    trailingSpace: string;
    documentUri: string;
    parentNode?: string;
    previousNode?: string;
    nextNode?: string;
}
export function getAllDataServiceForms(props: GetMediatorsProps) {
    const { nodePosition, documentUri, trailingSpace } = props;
    return [
        {
            title: "Input Mapping",
            operationName: DATA_SERVICE_NODES.INPUT,
            form: <InputMappingsForm nodePosition={nodePosition} documentUri={documentUri} trailingSpace={trailingSpace}></InputMappingsForm>,
        },
        {
            title: "Query",
            operationName: DATA_SERVICE_NODES.QUERY,
            form: <QueryForm nodePosition={nodePosition} documentUri={documentUri} trailingSpace={trailingSpace}></QueryForm>,
        },
        {
            title: "Transformation",
            operationName: DATA_SERVICE_NODES.TRANSFORMATION,
            form: <TransformationForm nodePosition={nodePosition} documentUri={documentUri} trailingSpace={trailingSpace}></TransformationForm>,
        },
        {
            title: "Output Mapping",
            operationName: DATA_SERVICE_NODES.OUTPUT,
            form: <OutputMappingsForm nodePosition={nodePosition} documentUri={documentUri} trailingSpace={trailingSpace}></OutputMappingsForm>,
        }
    ]
}