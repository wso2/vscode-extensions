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

import * as Handlebars from "handlebars";
import { FileObject, ImageObject } from "@wso2/mi-core";
import { logWarn } from "./logger";

/**
 * Template for text files content
 */
const TEXT_FILES_TEMPLATE = `
{{#if files}}
The following text files are provided for your reference:
{{#each files}}
---
File: {{this.name}}
---
{{this.content}}
---
{{/each}}
{{/if}}
`;

/**
 * Supported text file mimetypes that can be safely processed as text
 * Includes common text formats: plain text, markdown, CSV, JSON, XML, YAML, HTML, etc.
 */
const TEXT_MIMETYPES = new Set([
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

    // Other common text formats
    "text/rtf",
    "application/rtf"
]);

/**
 * Supported image mimetypes for Claude multimodal input
 */
const IMAGE_MIMETYPES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp"
]);

/**
 * Validates if a string is properly base64-encoded
 * @param str - The string to validate
 * @returns true if the string is valid base64, false otherwise
 */
function isValidBase64(str: string): boolean {
    if (!str || typeof str !== 'string') {
        return false;
    }

    // Base64 regex: alphanumeric + / + (plus padding with =)
    // Must have length divisible by 4 (with padding)
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;

    if (!base64Regex.test(str)) {
        return false;
    }

    // Check length is divisible by 4
    if (str.length % 4 !== 0) {
        return false;
    }

    return true;
}

/**
 * Validates if a string is a properly formatted image data URI
 * @param dataUri - The data URI string to validate
 * @returns true if the string is a valid image data URI, false otherwise
 */
function isValidImageDataUri(dataUri: string): boolean {
    if (!dataUri || typeof dataUri !== 'string') {
        return false;
    }

    // Data URI format: data:<mimetype>;base64,<base64data>
    const dataUriRegex = /^data:([^;]+);base64,([A-Za-z0-9+/]+={0,2})$/;
    const match = dataUri.match(dataUriRegex);
    if (!match || !match[1] || !match[2] || match[2].length === 0) {
        return false;
    }

    const mimeType = match[1].toLowerCase();
    if (!IMAGE_MIMETYPES.has(mimeType)) {
        return false;
    }

    if (!isValidBase64(match[2])) {
        return false;
    }

    return true;
}

/**
 * Filters files into text files and PDF files based on mimetype
 * Assumes validation has already been done - all files should be supported types
 */
export function filterFiles(files: FileObject[]): { textFiles: FileObject[]; pdfFiles: FileObject[] } {
    const textFiles: FileObject[] = [];
    const pdfFiles: FileObject[] = [];

    for (const file of files) {
        if (file.mimetype === "application/pdf") {
            pdfFiles.push(file);
        } else if (TEXT_MIMETYPES.has(file.mimetype)) {
            textFiles.push(file);
        }
        // Note: Invalid file types are rejected upfront in RPC manager via validateAttachments()
    }

    return { textFiles, pdfFiles };
}

/**
 * Builds message content array for Anthropic API including files, PDFs, and images
 * This follows the same pattern as the Python backend implementation
 *
 * Note: Validation should be done upfront via validateAttachments() before calling this function
 *
 * @param prompt - The main user prompt text
 * @param files - Array of file objects (text files and PDFs) - must be pre-validated
 * @param images - Array of image objects with base64 encoded data - must be pre-validated
 * @returns Array of content blocks for the Anthropic API
 */
export function buildMessageContent(
    prompt: string,
    files?: FileObject[],
    images?: ImageObject[]
): any[] {
    const content: any[] = [];

    // Add files if provided (assumes pre-validation)
    if (files && files.length > 0) {
        const { textFiles, pdfFiles } = filterFiles(files);

        // Add PDF files as file blocks (AI SDK format)
        for (const pdfFile of pdfFiles) {
            content.push({
                type: "file",
                data: pdfFile.content,  // Base64 encoded content (pre-validated)
                mediaType: "application/pdf"
            });
        }

        // Add text files as a formatted text block
        if (textFiles.length > 0) {
            const template = Handlebars.compile(TEXT_FILES_TEMPLATE);
            const textFilesContent = template({ files: textFiles });

            content.push({
                type: "text",
                text: textFilesContent.trim()
            });
        }
    }

    // Add images if provided (assumes pre-validation)
    if (images && images.length > 0) {
        content.push({
            type: "text",
            text: "Following additional images are provided for your reference."
        });

        for (const image of images) {
            // Use AI SDK format: { type: 'image', image: dataUri }
            // The AI SDK will convert this to the provider's format internally
            content.push({
                type: "image",
                image: image.imageBase64  // Use the full data URI (pre-validated)
            });
        }
    }

    // Add the main prompt at the end
    content.push({
        type: "text",
        text: prompt
    });

    return content;
}

/**
 * Checks if files or images are present
 */
export function hasAttachments(files?: FileObject[], images?: ImageObject[]): boolean {
    return !!(files && files.length > 0) || !!(images && images.length > 0);
}

/**
 * Validates attachments and returns warnings for any issues found
 * This allows early validation before processing attachments
 *
 * @param files - Array of file objects to validate
 * @param images - Array of image objects to validate
 * @returns Array of warning messages for invalid attachments
 */
export function validateAttachments(files?: FileObject[], images?: ImageObject[]): string[] {
    const warnings: string[] = [];

    // Validate files
    if (files && files.length > 0) {
        for (const file of files) {
            // Check for unsupported file types
            if (file.mimetype !== "application/pdf" && !TEXT_MIMETYPES.has(file.mimetype)) {
                warnings.push(`Unsupported file type (${file.mimetype}): ${file.name}`);
            }
            // Check PDF base64 encoding
            else if (file.mimetype === "application/pdf" && !isValidBase64(file.content)) {
                warnings.push(`Invalid base64 encoding: ${file.name}`);
            }
        }
    }

    // Validate images
    if (images && images.length > 0) {
        for (const image of images) {
            if (!isValidImageDataUri(image.imageBase64)) {
                warnings.push(`Invalid image format: ${image.imageName}`);
            }
        }
    }

    return warnings;
}
