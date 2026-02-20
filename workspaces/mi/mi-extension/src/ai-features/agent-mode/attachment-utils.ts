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

export function buildMessageContent(prompt: string, files?: FileObject[], images?: ImageObject[]): any[] {
    const content: any[] = [];

    if (files && files.length > 0) {
        const { textFiles, pdfFiles } = filterFiles(files);

        for (const pdfFile of pdfFiles) {
            content.push({
                type: "file",
                data: pdfFile.content,
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
            content.push({
                type: "image",
                image: image.imageBase64,
            });
        }
    }

    content.push({
        type: "text",
        text: prompt,
    });

    return content;
}

export function validateAttachments(files?: FileObject[], images?: ImageObject[]): string[] {
    const warnings: string[] = [];

    if (files && files.length > 0) {
        for (const file of files) {
            if (file.mimetype !== "application/pdf" && !TEXT_MIMETYPES.has(file.mimetype)) {
                warnings.push(`Unsupported file type (${file.mimetype}): ${file.name}`);
            } else if (file.mimetype === "application/pdf" && !isValidBase64(file.content)) {
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
