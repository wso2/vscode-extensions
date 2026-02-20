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

// MI Copilot Error Messages
export const COPILOT_ERROR_MESSAGES = {
    BAD_REQUEST: 'Bad Request',
    UNAUTHORIZED: 'Unauthorized',
    FORBIDDEN: 'Forbidden',
    NOT_FOUND: 'Not Found',
    TOKEN_COUNT_EXCEEDED: 'Token Count Exceeded',
    ERROR_422: "Something went wrong. Please clear the chat and try again.",
};

// MI Copilot maximum allowed file size
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // Default to 5MB

export const USER_INPUT_PLACEHOLDER_MESSAGE = "Ask MI Copilot";

export const PROJECT_RUNTIME_VERSION_THRESHOLD = "4.4.0";

export const VALID_FILE_TYPES = {
    files: [
        // Plain text
        "text/plain",

        // Markdown
        "text/markdown",
        "text/x-markdown",

        // CSV
        "text/csv",

        // JSON
        "application/json",

        // XML
        "application/xml",
        "text/xml",

        // YAML
        "application/x-yaml",
        "text/yaml",
        "application/yaml",
        "text/x-yaml",

        // HTML
        "text/html",

        // JavaScript/TypeScript
        "text/javascript",
        "application/javascript",
        "text/typescript",

        // CSS
        "text/css",

        // RTF
        "text/rtf",
        "application/rtf",

        // PDF (binary but supported)
        "application/pdf"
    ],
    images: ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"],
};
