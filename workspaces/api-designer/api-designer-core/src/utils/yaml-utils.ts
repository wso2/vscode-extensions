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
 * Utility helpers for working with YAML content.
 * Shared across extension and visualizer workspaces.
 */
import * as yaml from 'js-yaml';

/**
 * Attempts to parse YAML content using the default schema and falls back to a
 * fail-safe schema when custom tags or unsupported features are encountered.
 *
 * @param content YAML string content
 * @returns Parsed YAML object
 */
export function loadYaml(content: string): unknown {
    try {
        return yaml.load(content, { schema: yaml.DEFAULT_SCHEMA });
    } catch (primaryError) {
        try {
            return yaml.load(content, { schema: yaml.FAILSAFE_SCHEMA });
        } catch {
            throw primaryError;
        }
    }
}

