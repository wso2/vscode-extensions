/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

/**
 * Shared store for the "pending BI save path" and collection name.
 *
 * When the Ballerina Integrator opens API TryIt via "Try It" button, the
 * request is loaded in-memory (not written to disk). This module holds the
 * intended target path and the collection name so that on the first Save:
 *   - The api-tryit/ folder is auto-created
 *   - The file is written with the correct # @collectionName header
 *   - The collection name matches what is shown in the Explorer
 */

let _pendingBiSavePath: string | undefined;
let _pendingBiCollectionName: string | undefined;
let _pendingBiCollectionContent: string | undefined;

export function setPendingBiSavePath(p: string, collectionName?: string, collectionContent?: string): void {
    _pendingBiSavePath = p;
    _pendingBiCollectionName = collectionName;
    _pendingBiCollectionContent = collectionContent;
}

export function getPendingBiSavePath(): string | undefined {
    return _pendingBiSavePath;
}

export function getPendingBiCollectionName(): string | undefined {
    return _pendingBiCollectionName;
}

export function getPendingBiCollectionContent(): string | undefined {
    return _pendingBiCollectionContent;
}

export function clearPendingBiSavePath(): void {
    _pendingBiSavePath = undefined;
    _pendingBiCollectionName = undefined;
    _pendingBiCollectionContent = undefined;
}
