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

import { ActorNodeModel } from "../components/nodes/ActorNode";
import { ButtonNodeModel } from "../components/nodes/ButtonNode/ButtonNodeModel";
import { ConnectionNodeModel } from "../components/nodes/ConnectionNode";
import { EntryNodeModel } from "../components/nodes/EntryNode";

export type NodeModel = EntryNodeModel | ConnectionNodeModel | ActorNodeModel | ButtonNodeModel;

export type Project = {
    name: string;
    entryPoints: EntryPoint[];
    connections: Connection[];
};

export type EntryPointType = "service" | "task" | "schedule-task" | "trigger" | string;

export type EntryPoint = {
    id: string;
    name: string;
    type: EntryPointType;
    location?: Location;
    icon?: React.ReactNode;
    label?: string;
    description?: string;
    connections?: string[];
};

export type Connection = {
    id: string;
    name: string;
    location?: Location;
};

export type Location = {
    filePath: string;
    position: NodePosition;
};

export type NodePosition = {
    startLine?: number;
    startColumn?: number;
    endLine?: number;
    endColumn?: number;
};
