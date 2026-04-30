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

import { HistoryEntry } from "../../history";
import { EVENT_TYPE, PopupVisualizerLocation, VisualizerLocation } from "../../state-machine-types";

export interface OpenViewRequest {
    type: EVENT_TYPE;
    location: VisualizerLocation | PopupVisualizerLocation;
    isPopup?: boolean;
}

export interface HistoryEntryResponse {
    history: HistoryEntry[];
}

export interface FileChangedNotification {
    filePath: string;
    timestamp: number;
}

export type DocumentFileChangeType = 'created' | 'modified' | 'deleted';

export interface DocumentFileChangedNotification {
    filePath: string;
    changeType: DocumentFileChangeType;
    timestamp: number;
    content?: string; // Optional content for real-time updates during editing
}

export interface FileTreeNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    children?: FileTreeNode[];
}

export interface BrowseFileRequest {
    title?: string;
    canSelectFiles?: boolean;
    canSelectFolders?: boolean;
    canSelectMany?: boolean;
    filters?: { [name: string]: string[] };
    defaultUri?: string;
    openLabel?: string;
}

export interface BrowseFileResponse {
    filePath?: string;
    filePaths?: string[];
}

export interface ReadFileRequest {
    filePath: string;
}

export interface ReadFileResponse {
    content: string;
    success: boolean;
    message?: string;
}

export interface WriteFileRequest {
    filePath: string;
    content: string;
}

export interface WriteFileResponse {
    success: boolean;
    message?: string;
}

export interface DeleteFileRequest {
    filePath: string;
}

export interface DeleteFileResponse {
    success: boolean;
    message?: string;
}

export type CheckAIAvailabilityRequest = Record<string, never>;

export interface CheckAIAvailabilityResponse {
    available: boolean;
}

/**
 * @deprecated Use CheckAIAvailabilityRequest instead
 */
export type CheckCopilotAvailabilityRequest = CheckAIAvailabilityRequest;

/**
 * @deprecated Use CheckAIAvailabilityResponse instead
 */
export type CheckCopilotAvailabilityResponse = CheckAIAvailabilityResponse;

export interface OpenFileInBrowserRequest {
    filePath: string;
}

export interface OpenFileInBrowserResponse {
    success: boolean;
    message?: string;
}

export interface GetWorkspaceFileTreeRequest {
    workspaceUri: string;
    path?: string; // Optional subdirectory path
    filterType?: 'openapi' | 'artifact' | 'documentation' | 'tests' | 'ruleset'; // Optional filter
}

export interface GetWorkspaceFileTreeResponse {
    files: WorkspaceFileNode[];
}

export interface WorkspaceFileNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    children?: WorkspaceFileNode[];
}

export interface GenerateWithAIRequest {
    context: string;
    prompt: string;
}

export interface GenerateWithAIResponse {
    success: boolean;
    result?: string;
    error?: string;
    provider?: string;
}
