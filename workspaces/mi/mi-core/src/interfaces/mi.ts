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

import { API, Datamapper, NamedSequence, Proxy, Template, Task, InboundEndpoint } from "@wso2/mi-syntax-tree/lib/src";

export enum DIAGRAM_KIND {
    API = "api",
    SEQUENCE = "sequence",
    PROXY = "proxy",
    DATA_MAPPER = "data_mapper",
    TEMPLATE = "template",
    TASK = "task",
    INBOUND_ENDPOINT = "inboundEndpoint",
}

export declare enum DIRECTORY_MAP {
    SERVICES = "services",
    TRIGGERS = "triggers",
    CONNECTIONS = "connections",
    SCHEDULED_TASKS = "tasks"
}

export type SyntaxTreeMi = {
    [DIAGRAM_KIND.API]: API;
    [DIAGRAM_KIND.SEQUENCE]: NamedSequence;
    [DIAGRAM_KIND.PROXY]: Proxy;
    [DIAGRAM_KIND.DATA_MAPPER]: Datamapper;
    [DIAGRAM_KIND.TEMPLATE]: Template;
    [DIAGRAM_KIND.TASK]: Task;
    [DIAGRAM_KIND.INBOUND_ENDPOINT]: InboundEndpoint;
}
