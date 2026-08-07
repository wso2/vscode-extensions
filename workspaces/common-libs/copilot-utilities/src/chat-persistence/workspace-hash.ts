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

import * as crypto from 'crypto';

/**
 * Compute a stable, filesystem-safe hash for a workspace identity.
 *
 * The hash is deterministic: the same input string always produces the same hash.
 * Uses SHA-256 truncated to 16 hex characters (64 bits), which is collision-negligible
 * for a single user's workspace set.
 *
 * The input is hashed as-is — callers are responsible for producing a stable,
 * normalized identity string. For filesystem paths, that means resolving symlinks
 * and normalizing trailing slashes before calling. For non-path identities (e.g.
 * a cloud project id), the string should be used verbatim.
 *
 * @param workspaceId Stable workspace identity string
 * @returns 16-character hex string
 */
export function computeWorkspaceHash(workspaceId: string): string {
    return crypto.createHash('sha256').update(workspaceId).digest('hex').substring(0, 16);
}
