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

import * as fs from "fs";
import * as path from "path";
import { parse as parseYaml } from "yaml";
import {
    API,
    APIOperation,
    APITool,
    Sequence,
    UnifiedTool,
} from "@wso2/mi-core";

const { XMLParser } = require("fast-xml-parser");

const xmlParserOptions = {
    ignoreAttributes: false,
    allowBooleanAttributes: true,
    attributeNamePrefix: "@_",
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true,
};

export const MCP_INBOUND_LISTENER_CLASS = "org.wso2.carbon.inbound.sse.McpInboundListener";

function escapeXml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

export function cleanPathForToolName(pathStr: string): string {
    return pathStr
        .replace(/[{}]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "_")
        .replace(/_{2,}/g, "_")
        .replace(/^_+|_+$/g, "");
}

export function convertToJsonSchema(input: string): string | null {
    if (!input.trim()) return null;
    try {
        const sanitized = input.replace(/:\s*(string|number|integer|boolean|array|object|null)\b/g, ': "$1"');
        const parsed = JSON.parse(sanitized);
        if (parsed.type || parsed.properties) return JSON.stringify(parsed);
        const properties: Record<string, { type: string }> = {};
        for (const [k, v] of Object.entries(parsed)) properties[k] = { type: v as string };
        return JSON.stringify({ type: "object", properties, additionalProperties: false });
    } catch {
        return null;
    }
}

export function extractInputSchema(spec: any, method: string, operationPath: string): object {
    const pathItem = spec?.paths?.[operationPath];
    if (!pathItem) return { type: "object", properties: {}, additionalProperties: false };
    const operation = pathItem[method.toLowerCase()];
    if (!operation) return { type: "object", properties: {}, additionalProperties: false };

    const properties: Record<string, any> = {};
    const required: string[] = [];

    if (Array.isArray(operation.parameters)) {
        for (const param of operation.parameters) {
            if ((param.in === "path" || param.in === "query") && param.name && param.schema) {
                properties[param.name] = { ...param.schema, ...(param.description ? { description: param.description } : {}) };
                if (param.required) required.push(param.name);
            }
        }
    }

    const bodySchema = operation.requestBody?.content?.["application/json"]?.schema;
    if (bodySchema?.properties) {
        for (const [key, value] of Object.entries(bodySchema.properties)) {
            properties[key] = value;
        }
        if (Array.isArray(bodySchema.required)) required.push(...bodySchema.required);
    }

    const schema: any = { type: "object", properties, additionalProperties: false };
    if (required.length > 0) schema.required = required;
    return schema;
}

function asArray<T>(value: T | T[] | undefined): T[] {
    if (value === undefined || value === null) return [];
    return Array.isArray(value) ? value : [value];
}

function findFirstChild(obj: any, key: string): any {
    if (!obj || typeof obj !== "object") return undefined;
    if (obj[key] !== undefined) return obj[key];
    for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (v && typeof v === "object") {
            const found = findFirstChild(v, key);
            if (found !== undefined) return found;
        }
    }
    return undefined;
}

function collectToolNodes(node: any): any[] {
    if (!node || typeof node !== "object") return [];
    const tools: any[] = [];
    if (node.tool !== undefined) {
        tools.push(...asArray(node.tool));
    }
    for (const key of Object.keys(node)) {
        if (key === "tool") continue;
        const v = node[key];
        if (v && typeof v === "object") {
            tools.push(...collectToolNodes(v));
        }
    }
    return tools;
}

function textOf(value: any): string {
    if (value === undefined || value === null) return "";
    if (typeof value === "string") return value.trim();
    if (typeof value === "object") {
        if (typeof value["#text"] === "string") return value["#text"].trim();
    }
    return String(value).trim();
}

function newId(): string {
    if (typeof (globalThis as any).crypto?.randomUUID === "function") {
        return (globalThis as any).crypto.randomUUID();
    }
    return require("crypto").randomUUID();
}

export function parseToolsFromXML(xmlContent: string): UnifiedTool[] {
    try {
        const parser = new XMLParser(xmlParserOptions);
        const doc = parser.parse(xmlContent);
        const toolNodes = collectToolNodes(doc);

        return toolNodes.map((toolEl: any): UnifiedTool => {
            const name = toolEl["@_name"] ?? "";
            const description = textOf(toolEl.description);
            const seq = toolEl.sequence;
            const apiNode = toolEl.api;

            if (seq !== undefined) {
                return {
                    kind: "sequence",
                    id: newId(),
                    name,
                    description,
                    sequenceName: textOf(seq),
                    sequenceXmlPath: "",
                    inputSchema: textOf(toolEl.inputSchema)
                        || '{"type":"object","properties":{},"additionalProperties":false}',
                };
            }
            const method = textOf(toolEl.method);
            const resource = textOf(toolEl.resource);
            const apiName = textOf(apiNode);
            const existingSchema = textOf(toolEl.inputSchema);
            return {
                kind: "api",
                id: newId(),
                name,
                description,
                apiId: apiName,
                apiName,
                apiVersion: "1.0.0",
                apiRawVersion: "",
                apiXmlPath: "",
                operationId: `${method}_${resource}`.replace(/[^a-zA-Z0-9_]/g, "_"),
                operationMethod: method,
                operationPath: resource,
                operationSummary: description,
                inputSchema: existingSchema || undefined,
            };
        });
    } catch {
        return [];
    }
}

export function parsePortFromInboundEndpoint(xmlContent: string): number | null {
    try {
        const parser = new XMLParser(xmlParserOptions);
        const doc = parser.parse(xmlContent);
        const params = asArray(doc?.inboundEndpoint?.parameters?.parameter);
        for (const param of params) {
            const pname = param?.["@_name"];
            if (pname === "inbound.mcp.port" || pname === "inbound.http.port") {
                const raw = textOf(param);
                const val = parseInt(raw, 10);
                if (!isNaN(val)) return val;
            }
        }
    } catch { /* fallthrough */ }
    return null;
}

export interface McpInboundEndpointConfig {
    port: number | null;
    corsAllowOrigin: string;
    corsAllowMethods: string;
    corsAllowHeaders: string;
    corsExposeHeaders: string;
    keepAliveInterval: number;
}

export function parseInboundEndpointConfig(xmlContent: string): McpInboundEndpointConfig {
    const defaults: McpInboundEndpointConfig = {
        port: null,
        corsAllowOrigin: "*",
        corsAllowMethods: "GET, POST, OPTIONS",
        corsAllowHeaders: "Content-Type, Mcp-Session-Id",
        corsExposeHeaders: "Mcp-Session-Id",
        keepAliveInterval: 30000,
    };
    try {
        const parser = new XMLParser(xmlParserOptions);
        const doc = parser.parse(xmlContent);
        const params = asArray(doc?.inboundEndpoint?.parameters?.parameter);
        const byName: Record<string, string> = {};
        for (const param of params) {
            const pname = param?.["@_name"];
            if (typeof pname === "string") byName[pname] = textOf(param);
        }
        const portRaw = byName["inbound.mcp.port"] ?? byName["inbound.http.port"];
        const port = portRaw ? parseInt(portRaw, 10) : NaN;
        return {
            port: isNaN(port) ? null : port,
            corsAllowOrigin: byName["inbound.cors.allow.origin"] || defaults.corsAllowOrigin,
            corsAllowMethods: byName["inbound.cors.allow.methods"] || defaults.corsAllowMethods,
            corsAllowHeaders: byName["inbound.cors.allow.headers"] || defaults.corsAllowHeaders,
            corsExposeHeaders: byName["inbound.cors.expose.headers"] || defaults.corsExposeHeaders,
            keepAliveInterval: parseInt(byName["inbound.sse.keepalive.interval"] || `${defaults.keepAliveInterval}`, 10) || defaults.keepAliveInterval,
        };
    } catch {
        return defaults;
    }
}

export async function getUsedInboundPorts(
    inboundEndpointPaths: string[],
    excludePath?: string
): Promise<number[]> {
    const usedPorts = new Set<number>();
    for (const epPath of inboundEndpointPaths) {
        if (excludePath && epPath === excludePath) continue;
        try {
            if (!fs.existsSync(epPath)) continue;
            const content = fs.readFileSync(epPath, "utf8");
            const port = parsePortFromInboundEndpoint(content);
            if (port !== null) usedPorts.add(port);
        } catch { /* ignore unreadable */ }
    }
    return Array.from(usedPorts);
}

export function generateToolsXml(tools: UnifiedTool[], inputSchemas: Record<string, object>): string {
    let toolsXml = "";

    tools.forEach(tool => {
        if (tool.kind === "api") {
            const derived = inputSchemas[tool.id];
            const isEmpty = !derived || (Object.keys((derived as any).properties ?? {}).length === 0 && !(derived as any).required);
            const inputSchema = (!isEmpty ? derived : null)
                ?? (tool.inputSchema ? JSON.parse(tool.inputSchema) : null)
                ?? { type: "object", properties: {} };
            const description = tool.description || tool.operationSummary
                || `${tool.operationMethod} ${tool.operationPath} - ${tool.apiName}`;
            toolsXml += `
            <tool name="${escapeXml(tool.name)}">
                <api>${escapeXml(tool.apiName)}</api>
                <resource>${escapeXml(tool.operationPath)}</resource>
                <method>${escapeXml(tool.operationMethod)}</method>
                <description>${escapeXml(description)}</description>
                <inputSchema><![CDATA[${JSON.stringify(inputSchema)}]]></inputSchema>
            </tool>`;
        } else {
            toolsXml += `
            <tool name="${escapeXml(tool.name)}">
                <sequence>${escapeXml(tool.sequenceName)}</sequence>
                <description>${escapeXml(tool.description || tool.sequenceName)}</description>
                <inputSchema><![CDATA[${tool.inputSchema}]]></inputSchema>
            </tool>`;
        }
    });

    return `
        <mcptools>${toolsXml}
        </mcptools>`;
}

export async function buildInputSchemasForAPITools(
    tools: APITool[],
    apiDefDir: string
): Promise<Record<string, object>> {
    const inputSchemas: Record<string, object> = {};

    const readYamlSpec = (filePath: string): any => {
        try {
            if (!fs.existsSync(filePath)) return null;
            const content = fs.readFileSync(filePath, "utf8");
            return content ? parseYaml(content) : null;
        } catch {
            return null;
        }
    };

    for (const tool of tools) {
        const rawVersion = tool.apiRawVersion || "";
        const xmlBaseName = tool.apiXmlPath
            ? path.basename(tool.apiXmlPath, path.extname(tool.apiXmlPath))
            : tool.apiName;

        const baseNames = Array.from(new Set([xmlBaseName, tool.apiName]));
        const candidates = baseNames
            .flatMap(base => [
                ...(rawVersion ? [`${base}_v${rawVersion}.yaml`] : []),
                `${base}.yaml`,
            ])
            .map(f => path.join(apiDefDir, f));

        let spec: any = null;
        for (const candidate of candidates) {
            spec = readYamlSpec(candidate);
            if (spec !== null) break;
        }

        inputSchemas[tool.id] = spec
            ? extractInputSchema(spec, tool.operationMethod, tool.operationPath)
            : { type: "object", properties: {}, additionalProperties: false };
    }

    return inputSchemas;
}

export const artifactParserConfig = {
    apis: {
        pathInStructure: (structure: any) => structure?.directoryMap?.src?.main?.wso2mi?.artifacts?.apis || [],
        parseFields: {
            id: (art: Record<string, any>) => art.name || art.id || art.fileName || "",
            name: (art: Record<string, any>) => art.name || art.id || art.fileName || "",
            context: (art: Record<string, any>) => art.context || `/${art.name || art.id || ""}`,
            version: (art: Record<string, any>) => art.version || "1.0.0",
            rawVersion: (art: Record<string, any>) => art.version ?? "",
            xmlPath: (art: Record<string, any>) => art.path || "",
        },
        parseOperations: (art: Record<string, any>): APIOperation[] => {
            const operations: APIOperation[] = [];
            if (art.resources && Array.isArray(art.resources)) {
                for (const res of art.resources) {
                    const methods = Array.isArray(res.methods)
                        ? res.methods
                        : typeof res.methods === "string"
                            ? res.methods.split(",")
                            : [];
                    const uri = res.path || res.uri || res["uri-template"] || res.uriTemplate || "";
                    for (const m of methods) {
                        const method = String(m).toUpperCase();
                        operations.push({
                            id: `${method}_${uri}`.replace(/[^a-zA-Z0-9_]/g, "_"),
                            method,
                            path: uri,
                            summary: res.summary || "",
                        });
                    }
                }
            }
            return operations;
        },
    },
};

export function parseApisFromProjectStructure(projectStructure: any): API[] {
    const apiArtifacts: any[] = artifactParserConfig.apis.pathInStructure(projectStructure);
    return apiArtifacts.map((art: Record<string, any>) => ({
        id: artifactParserConfig.apis.parseFields.id(art),
        name: artifactParserConfig.apis.parseFields.name(art),
        context: artifactParserConfig.apis.parseFields.context(art),
        version: artifactParserConfig.apis.parseFields.version(art),
        rawVersion: artifactParserConfig.apis.parseFields.rawVersion(art),
        xmlPath: artifactParserConfig.apis.parseFields.xmlPath(art),
        operations: artifactParserConfig.apis.parseOperations(art),
    }));
}

export function parseSequencesFromProjectStructure(projectStructure: any): Sequence[] {
    const seqArtifacts: any[] =
        projectStructure?.directoryMap?.src?.main?.wso2mi?.artifacts?.sequences || [];
    return seqArtifacts
        .map((art: any) => ({
            id: art.name || art.id || art.fileName || "",
            name: art.name || art.id || art.fileName || "",
            xmlPath: art.path || "",
        }))
        .filter((s: Sequence) => s.id !== "");
}

export function applyCorsParametersToInboundEndpointXml(
    xmlContent: string,
    corsSettings: {
        corsAllowOrigin: string;
        corsAllowMethods: string;
        corsAllowHeaders: string;
        corsExposeHeaders: string;
        keepAliveInterval: number;
    }
): string {
    let xml = xmlContent;
    const updateParam = (paramName: string, paramValue: string) => {
        const paramRegex = new RegExp(`<parameter name="${paramName}"[^>]*>[^<]*</parameter>`, "g");
        const newParam = `<parameter name="${paramName}">${paramValue}</parameter>`;
        if (paramRegex.test(xml)) {
            xml = xml.replace(paramRegex, newParam);
        } else {
            xml = xml.replace("</inboundEndpoint>", `    ${newParam}\n    </inboundEndpoint>`);
        }
    };
    updateParam("inbound.cors.allow.origin", corsSettings.corsAllowOrigin);
    updateParam("inbound.cors.allow.methods", corsSettings.corsAllowMethods);
    updateParam("inbound.cors.allow.headers", corsSettings.corsAllowHeaders);
    updateParam("inbound.cors.expose.headers", corsSettings.corsExposeHeaders);
    updateParam("inbound.sse.keepalive.interval", String(corsSettings.keepAliveInterval));
    return xml;
}
