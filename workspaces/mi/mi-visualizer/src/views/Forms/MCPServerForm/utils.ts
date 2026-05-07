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

import * as pathModule from 'path';
import * as yaml from 'yaml';
import { APIOperation, APITool, UnifiedTool } from '@wso2/mi-core';

export function cleanPathForToolName(path: string): string {
    return path
        .replace(/[{}]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_+|_+$/g, '');
}

export function convertToJsonSchema(input: string): string | null {
    if (!input.trim()) return null;
    try {
        const sanitized = input.replace(/:\s*(string|number|integer|boolean|array|object|null)\b/g, ': "$1"');
        const parsed = JSON.parse(sanitized);
        if (parsed.type || parsed.properties) return JSON.stringify(parsed);
        const properties: Record<string, { type: string }> = {};
        for (const [k, v] of Object.entries(parsed)) properties[k] = { type: v as string };
        return JSON.stringify({ type: 'object', properties, additionalProperties: false });
    } catch {
        return null;
    }
}

export function extractInputSchema(spec: any, method: string, operationPath: string): object {
    const pathItem = spec?.paths?.[operationPath];
    if (!pathItem) return { type: 'object', properties: {}, additionalProperties: false };
    const operation = pathItem[method.toLowerCase()];
    if (!operation) return { type: 'object', properties: {}, additionalProperties: false };

    const properties: Record<string, any> = {};
    const required: string[] = [];

    if (Array.isArray(operation.parameters)) {
        for (const param of operation.parameters) {
            if ((param.in === 'path' || param.in === 'query') && param.name && param.schema) {
                properties[param.name] = { ...param.schema, ...(param.description ? { description: param.description } : {}) };
                if (param.required) required.push(param.name);
            }
        }
    }

    const bodySchema = operation.requestBody?.content?.['application/json']?.schema;
    if (bodySchema?.properties) {
        for (const [key, value] of Object.entries(bodySchema.properties)) {
            properties[key] = value;
        }
        if (Array.isArray(bodySchema.required)) required.push(...bodySchema.required);
    }

    const schema: any = { type: 'object', properties, additionalProperties: false };
    if (required.length > 0) schema.required = required;
    return schema;
}

export function parseToolsFromXML(xmlContent: string): UnifiedTool[] {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlContent, 'text/xml');
        const toolElements = Array.from(doc.querySelectorAll('tool'));

        return toolElements.map(toolEl => {
            const name = toolEl.getAttribute('name') || '';
            const description = toolEl.querySelector('description')?.textContent?.trim() || '';
            const seqEl = toolEl.querySelector('sequence');
            const apiEl = toolEl.querySelector('api');

            if (seqEl) {
                return {
                    kind: 'sequence' as const,
                    id: crypto.randomUUID(),
                    name,
                    description,
                    sequenceName: seqEl.textContent?.trim() || '',
                    sequenceXmlPath: '',
                    inputSchema: toolEl.querySelector('inputSchema')?.textContent?.trim()
                        || '{"type":"object","properties":{},"additionalProperties":false}',
                };
            } else {
                const method = toolEl.querySelector('method')?.textContent?.trim() || '';
                const resource = toolEl.querySelector('resource')?.textContent?.trim() || '';
                const apiName = apiEl?.textContent?.trim() || '';
                const existingSchema = toolEl.querySelector('inputSchema')?.textContent?.trim();
                const apiRawVersion = toolEl.getAttribute('apiRawVersion') || '';
                const apiXmlPath = toolEl.getAttribute('apiXmlPath') || '';
                return {
                    kind: 'api' as const,
                    id: crypto.randomUUID(),
                    name,
                    description,
                    apiId: apiName,
                    apiName,
                    apiVersion: '1.0.0',
                    apiRawVersion,
                    apiXmlPath,
                    operationId: `${method}_${resource}`.replace(/[^a-zA-Z0-9_]/g, '_'),
                    operationMethod: method,
                    operationPath: resource,
                    operationSummary: description,
                    inputSchema: existingSchema,
                };
            }
        });
    } catch {
        return [];
    }
}

export function parsePortFromInboundEndpoint(xmlContent: string): number | null {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlContent, 'text/xml');
        const params = Array.from(doc.querySelectorAll('parameter'));
        for (const param of params) {
            const pname = param.getAttribute('name') || '';
            if (pname === 'inbound.mcp.port' || pname === 'inbound.http.port') {
                const val = parseInt(param.textContent?.trim() || '', 10);
                if (!isNaN(val)) return val;
            }
        }
    } catch {}
    return null;
}

export async function getUsedInboundPorts(
    inboundEndpointPaths: string[],
    readFile: (path: string) => Promise<string | null>,
    excludePath?: string
): Promise<Set<number>> {
    const usedPorts = new Set<number>();
    for (const epPath of inboundEndpointPaths) {
        if (excludePath && epPath === excludePath) continue;
        try {
            const content = await readFile(epPath);
            if (content) {
                const port = parsePortFromInboundEndpoint(content);
                if (port !== null) usedPorts.add(port);
            }
        } catch {}
    }
    return usedPorts;
}

export function generateToolsXml(tools: UnifiedTool[], inputSchemas: Record<string, object>): string {
    let toolsXml = '';

    tools.forEach(tool => {
        if (tool.kind === 'api') {
            const derived = inputSchemas[tool.id];
            const isEmpty = !derived || (Object.keys((derived as any).properties ?? {}).length === 0 && !(derived as any).required);
            const inputSchema = (!isEmpty ? derived : null)
                ?? (tool.inputSchema ? JSON.parse(tool.inputSchema) : null)
                ?? { type: 'object', properties: {} };
            const description = tool.description || tool.operationSummary
                || `${tool.operationMethod} ${tool.operationPath} - ${tool.apiName}`;
            const apiRawVersion = tool.apiRawVersion || '';
            const apiXmlPath = tool.apiXmlPath || '';
            toolsXml += `
            <tool name="${tool.name}" apiRawVersion="${apiRawVersion}" apiXmlPath="${apiXmlPath}">
                <api>${tool.apiName}</api>
                <resource>${tool.operationPath}</resource>
                <method>${tool.operationMethod}</method>
                <description>${description}</description>
                <inputSchema>${JSON.stringify(inputSchema)}</inputSchema>
            </tool>`;
        } else {
            toolsXml += `
            <tool name="${tool.name}">
                <sequence>${tool.sequenceName}</sequence>
                <description>${tool.description || tool.sequenceName}</description>
                <inputSchema>${tool.inputSchema}</inputSchema>
            </tool>`;
        }
    });

    return `
        <mcptools>${toolsXml}
        </mcptools>`;
}

export async function buildInputSchemasForAPITools(
    tools: APITool[],
    apiDefDir: string,
    readFile: (filePath: string) => Promise<string | null>
): Promise<Record<string, object>> {
    const inputSchemas: Record<string, object> = {};

    const readYaml = async (filePath: string): Promise<any> => {
        try {
            const content = await readFile(filePath);
            return content ? yaml.parse(content) : null;
        } catch {
            return null;
        }
    };

    for (const tool of tools) {
        const rawVersion = tool.apiRawVersion || '';
        const xmlBaseName = tool.apiXmlPath
            ? pathModule.basename(tool.apiXmlPath, pathModule.extname(tool.apiXmlPath))
            : tool.apiName;

        // On Linux (case-sensitive), the YAML file is named after the API's `name` attribute
        // (set at creation time) while the XML file may have a different case. Include both.
        const baseNames = [...new Set([xmlBaseName, tool.apiName])];
        const candidates = baseNames
            .flatMap(base => [
                ...(rawVersion ? [`${base}_v${rawVersion}.yaml`] : []),
                `${base}.yaml`,
            ])
            .map(f => pathModule.join(apiDefDir, f).toString());

        let spec: any = null;
        for (const candidate of candidates) {
            spec = await readYaml(candidate);
            if (spec !== null) break;
        }

        inputSchemas[tool.id] = spec
            ? extractInputSchema(spec, tool.operationMethod, tool.operationPath)
            : { type: 'object', properties: {}, additionalProperties: false };
    }

    return inputSchemas;
}

export const artifactParserConfig = {
    apis: {
        pathInStructure: (structure: any) => structure?.directoryMap?.src?.main?.wso2mi?.artifacts?.apis || [],
        parseFields: {
            id: (art: Record<string, any>) => art.name || art.id || art.fileName || '',
            name: (art: Record<string, any>) => art.name || art.id || art.fileName || '',
            context: (art: Record<string, any>) => art.context || `/${art.name || art.id || ''}`,
            version: (art: Record<string, any>) => art.version || '1.0.0',
            rawVersion: (art: Record<string, any>) => art.version ?? '',
            xmlPath: (art: Record<string, any>) => art.path || '',
        },
        parseOperations: (art: Record<string, any>): APIOperation[] => {
            const operations: APIOperation[] = [];
            if (art.resources && Array.isArray(art.resources)) {
                for (const res of art.resources) {
                    const methods = Array.isArray(res.methods)
                        ? res.methods
                        : typeof res.methods === 'string'
                        ? res.methods.split(',')
                        : [];
                    const uri = res.path || res.uri || res['uri-template'] || res.uriTemplate || '';
                    for (const m of methods) {
                        const method = String(m).toUpperCase();
                        operations.push({
                            id: `${method}_${uri}`.replace(/[^a-zA-Z0-9_]/g, '_'),
                            method,
                            path: uri,
                            summary: res.summary || ''
                        });
                    }
                }
            }
            return operations;
        }
    }
};
