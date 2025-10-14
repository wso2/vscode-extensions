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

import { EVENT_TYPE, PopupVisualizerLocation, VisualizerLocation } from "../../state-machine-types";

export interface UpdateUndoRedoMangerRequest {
    filePath: string;
    fileContent: string;
}

export interface OpenViewRequest {
    type: EVENT_TYPE;
    location: VisualizerLocation | PopupVisualizerLocation;
    isPopup?: boolean;
}

export interface GetWorkspaceContextResponse {
    context: string[];
}

export interface UndoRedoStateResponse {
    canUndo: boolean;
    canRedo: boolean;
    undoCount: number;
    redoCount: number;
    nextUndoDescription: string | null;
    nextRedoDescription: string | null;
    batchInProgress: boolean;
}

export interface AddToUndoStackRequest {
    filePath: string;
    source: string;
    description?: string;
}
