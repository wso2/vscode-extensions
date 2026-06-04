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

import { FileObject, ImageObject } from "@wso2/mi-core";

const TEXT_MIMETYPES = new Set([
    "text/plain",
    "text/markdown",
    "text/x-markdown",
    "text/csv",
    "application/json",
    "application/xml",
    "text/xml",
    "application/x-yaml",
    "text/yaml",
    "application/yaml",
    "text/x-yaml",
    "text/html",
    "text/javascript",
    "application/javascript",
    "text/typescript",
    "text/css",
    "text/rtf",
    "application/rtf",
]);

const IMAGE_MIMETYPES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
]);

function isValidBase64(str: string): boolean {
    if (!str || typeof str !== "string") {
        return false;
    }

    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(str)) {
        return false;
    }

    return str.length % 4 === 0;
}

function isValidImageDataUri(dataUri: string): boolean {
    if (!dataUri || typeof dataUri !== "string") {
        return false;
    }

    const dataUriRegex = /^data:([^;]+);base64,([A-Za-z0-9+/]+={0,2})$/;
    const match = dataUri.match(dataUriRegex);
    if (!match || !match[1] || !match[2] || match[2].length === 0) {
        return false;
    }

    const mimeType = match[1].toLowerCase();
    if (!IMAGE_MIMETYPES.has(mimeType)) {
        return false;
    }

    return isValidBase64(match[2]);
}

/**
 * Strips an optional `data:<mediaType>;base64,` prefix, returning the raw base64 payload.
 *
 * A full `data:` URI must never reach the AI SDK as inline `data`/`image`: the SDK
 * parses it into a URL and, since Anthropic only declares `http(s)` URLs as supported,
 * tries to `fetch()` the data URI, which Node rejects with "URL scheme must be http or
 * https, got data:". Normalizing to raw base64 keeps the payload on the inline-data path.
 * No-op when the input is already raw base64.
 */
function stripDataUriPrefix(content: string): string {
    const match = content.match(/^data:[^;]+;base64,([\s\S]+)$/);
    return match ? match[1] : content;
}

/**
 * Converts an image data URI (or raw base64) into an AI SDK `image` content part,
 * passing raw base64 + explicit `mediaType` to avoid the data-URI fetch path
 * (see {@link stripDataUriPrefix}).
 */
function toImageContentPart(imageDataUri: string): { type: "image"; image: string; mediaType?: string } {
    const match = imageDataUri.match(/^data:([^;]+);base64,([\s\S]+)$/);
    if (match) {
        return { type: "image", image: match[2], mediaType: match[1] };
    }
    // Fallback: pass through unchanged (already-raw base64 or unexpected format).
    return { type: "image", image: imageDataUri };
}

export function filterFiles(files: FileObject[]): { textFiles: FileObject[]; pdfFiles: FileObject[] } {
    const textFiles: FileObject[] = [];
    const pdfFiles: FileObject[] = [];

    for (const file of files) {
        if (file.mimetype === "application/pdf") {
            pdfFiles.push(file);
        } else if (TEXT_MIMETYPES.has(file.mimetype)) {
            textFiles.push(file);
        }
    }

    return { textFiles, pdfFiles };
}

function buildTextFileSection(textFiles: FileObject[]): string {
    if (textFiles.length === 0) {
        return "";
    }

    const sections = textFiles
        .map((file) => `---\nFile: ${file.name}\n---\n${file.content}\n---`)
        .join("\n");

    return `The following text files are provided for your reference:\n${sections}`.trim();
}

/**
 * Builds multimodal user message content by prepending file/image attachments
 * before the prompt content blocks.
 *
 * @param promptBlocks - Array of text content blocks from getUserPrompt()
 * @param files - Optional file attachments (text, PDF)
 * @param images - Optional image attachments
 * @returns Combined content array: [attachments..., promptBlocks...]
 */
export function buildMessageContent(promptBlocks: Array<{ type: 'text'; text: string }>, files?: FileObject[], images?: ImageObject[]): any[] {
    const content: any[] = [];

    if (files && files.length > 0) {
        const { textFiles, pdfFiles } = filterFiles(files);

        for (const pdfFile of pdfFiles) {
            content.push({
                type: "file",
                data: stripDataUriPrefix(pdfFile.content),
                mediaType: "application/pdf",
            });
        }

        const textContent = buildTextFileSection(textFiles);
        if (textContent) {
            content.push({
                type: "text",
                text: textContent,
            });
        }
    }

    if (images && images.length > 0) {
        content.push({
            type: "text",
            text: "Following additional images are provided for your reference.",
        });

        for (const image of images) {
            content.push(toImageContentPart(image.imageBase64));
        }
    }

    // Append all prompt content blocks (system-reminder wrapped context + user query)
    content.push(...promptBlocks);

    return content;
}

export function validateAttachments(files?: FileObject[], images?: ImageObject[]): string[] {
    const warnings: string[] = [];

    if (files && files.length > 0) {
        for (const file of files) {
            if (file.mimetype !== "application/pdf" && !TEXT_MIMETYPES.has(file.mimetype)) {
                warnings.push(`Unsupported file type (${file.mimetype}): ${file.name}`);
            } else if (file.mimetype === "application/pdf" && !isValidBase64(stripDataUriPrefix(file.content))) {
                warnings.push(`Invalid base64 encoding: ${file.name}`);
            }
        }
    }

    if (images && images.length > 0) {
        for (const image of images) {
            if (!isValidImageDataUri(image.imageBase64)) {
                warnings.push(`Invalid image format: ${image.imageName}`);
            }
        }
    }

    return warnings;
}
