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

import { STNode } from "@wso2/mi-syntax-tree/src";
import { MEDIATORS, NODE_GAP } from "../resources/constants";

export function getNodeIdFromModel(model: STNode, prefix?: string) {
    if (model.viewState?.id) {
        return model.viewState.id;
    }
    if (model && model.tag && model.range) {
        const id = `${model.tag}-${model.range.startTagRange.start.line}-${model.range.startTagRange.start.character}`;
        if (prefix) {
            return `${prefix}-${id}`;
        }
        return id;
    }
    return Date.now().toString();
}

export function getNodeDescription(stNode: any): string {
    if (stNode.description) {
        return stNode.description;
    }

    // TODO: Move to LS
    switch (stNode.tag.toLowerCase()) {
        case "endpoint": {
            if (stNode.key) {
                return stNode.key;
            }
            if (stNode.type) {
                return stNode.type;
            }
            return;
        }
        case (MEDIATORS.FILTER.toLowerCase()): {
            if (stNode.regex && stNode.source) {
                return `${stNode.source} matches ${stNode.regex}`;
            }
            if (stNode.regex) {
                return stNode.regex;
            } else if (stNode.source) {
                return stNode.source;
            } else if (stNode.xpath) {
                return stNode.xpath;
            }
            return;
        }
        case (MEDIATORS.LOG.toLowerCase()): {
            if (stNode.property) {
                return stNode.property.map((property: any) => {
                    return property.name;
                }).join(", ");
            }
            return;
        }
        case (MEDIATORS.PROPERTY.toLowerCase()): {
            if (stNode.name) {
                return stNode.name;
            }
            return;
        }
        case (MEDIATORS.SEQUENCE.toLowerCase()): {
            const description = stNode.sequenceAttribute|| stNode.staticReferenceKey || stNode.dynamicReferenceKey || stNode.key;
            if (description) {
                return description.split(".")[0];
            }
            return;
        }
        case (MEDIATORS.SWITCH.toLowerCase()): {
            return stNode.source;
        }
        case (MEDIATORS.DATAMAPPER.toLowerCase()): {
            const description = stNode.config;
            if (description) {
                const match = description.match(/\/([^\/]+)\.dmc$/);
                return match ? match[1] : null;
            }
            return;
        }
        case (MEDIATORS.DATASERVICECALL.toLowerCase()): {
            return stNode.serviceName;
        }
        case (MEDIATORS.AGGREGATE.toLowerCase()): {
            const onComplete = stNode?.correlateOnOrCompleteConditionOrOnComplete?.onComplete;
            const isSequnceReference = onComplete.sequenceAttribute !== undefined;

            return isSequnceReference ? onComplete.sequenceAttribute.split(".")[0] : undefined;
        }
        case (MEDIATORS.VARIABLE.toLowerCase()): {
            return stNode.name;
        }
        default:
            return;
    }
}

export function getTextSizes(text: any, fontSize?: any, fontWidth?: string, fontFamily?: string, containerWidth?: number, maxLineCount?: number) {
    function getCssStyle(element: Element, prop: string) {
        return window.getComputedStyle(element, null).getPropertyValue(prop);
    }
    function getCanvasFont(el = document.body) {
        const fontW = fontWidth ?? (getCssStyle(el, 'font-weight') || 'normal');
        const fontS = fontSize ?? (getCssStyle(el, 'font-size') || '16px');
        const fontF = fontFamily ?? (getCssStyle(el, 'font-family') || 'Times New Roman');

        return `${fontW} ${fontS} ${fontF}`;
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    context.font = getCanvasFont();

    const metrics = context.measureText(text);
    const width = metrics.width;

    if (!text) {
        return { width: 0, height: 0 };
    }

    // Split text into lines if container width is provided
    if (containerWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const testLine = currentLine + ' ' + word;
            const testWidth = context.measureText(testLine).width;

            if (testWidth <= containerWidth) {
                currentLine = testLine;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }

            // Return early if maxLineCount is hit
            if (maxLineCount && lines.length >= maxLineCount) {
                const lineHeight = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
                const height = lineHeight * maxLineCount;
                return { width: containerWidth, height, lineCount: maxLineCount };
            }
        }
        lines.push(currentLine);

        // Calculate total height based on line count
        const lineHeight = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
        const height = lineHeight * lines.length;

        return { width: containerWidth, height, lineCount: lines.length };
    }

    // Return single line metrics if no container width
    const height = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
    return { width, height, lineCount: 1 };
}
