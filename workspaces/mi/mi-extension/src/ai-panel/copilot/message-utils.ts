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
 * Filters files into text files and PDF files based on mimetype
 */
export function filterFiles(files: FileObject[]): { textFiles: FileObject[]; pdfFiles: FileObject[] } {
    const textFiles: FileObject[] = [];
    const pdfFiles: FileObject[] = [];

    for (const file of files) {
        if (file.mimetype === "application/pdf") {
            pdfFiles.push(file);
        } else {
            textFiles.push(file);
        }
    }

    return { textFiles, pdfFiles };
}

/**
 * Builds message content array for Anthropic API including files, PDFs, and images
 * This follows the same pattern as the Python backend implementation
 *
 * @param prompt - The main user prompt text
 * @param files - Array of file objects (text files and PDFs)
 * @param images - Array of image objects with base64 encoded data
 * @returns Array of content blocks for the Anthropic API
 */
export function buildMessageContent(
    prompt: string,
    files?: FileObject[],
    images?: ImageObject[]
): any[] {
    const content: any[] = [];

    // Add files if provided
    if (files && files.length > 0) {
        const { textFiles, pdfFiles } = filterFiles(files);

        // Add PDF files as file blocks (AI SDK format)
        for (const pdfFile of pdfFiles) {
            content.push({
                type: "file",
                data: pdfFile.content,  // Base64 encoded content
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

    // Add images if provided
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
                image: image.imageBase64  // Use the full data URI (data:image/png;base64,...)
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
