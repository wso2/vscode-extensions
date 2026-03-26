/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as https from 'https';
import * as net from 'net';
import fetch from 'node-fetch';
import { DebuggerConfig } from '../../../debugger/config';
import { logDebug, logError, logInfo } from '../../copilot/logger';
import { ToolResult } from './types';

// ============================================================================
// Artifact Type Map
// ============================================================================

export interface ArtifactTypeInfo {
    path: string;
    nameParam: string;
}

export const ARTIFACT_TYPE_MAP: Record<string, ArtifactTypeInfo> = {
    'apis': { path: '/management/apis', nameParam: 'apiName' },
    'proxy-services': { path: '/management/proxy-services', nameParam: 'proxyServiceName' },
    'endpoints': { path: '/management/endpoints', nameParam: 'endpointName' },
    'sequences': { path: '/management/sequences', nameParam: 'sequenceName' },
    'inbound-endpoints': { path: '/management/inbound-endpoints', nameParam: 'inboundEndpointName' },
    'connectors': { path: '/management/connectors', nameParam: '' },
    'templates': { path: '/management/templates', nameParam: 'name' },
    'local-entries': { path: '/management/local-entries', nameParam: 'name' },
    'tasks': { path: '/management/tasks', nameParam: 'taskName' },
    'message-stores': { path: '/management/message-stores', nameParam: 'name' },
    'message-processors': { path: '/management/message-processors', nameParam: 'name' },
    'applications': { path: '/management/applications', nameParam: 'carbonAppName' },
    'data-services': { path: '/management/data-services', nameParam: 'dataServiceName' },
    'data-sources': { path: '/management/data-sources', nameParam: 'name' },
    'server': { path: '/management/server', nameParam: '' },
    'logging': { path: '/management/logging', nameParam: 'loggerName' },
    'registry': { path: '/management/registry-resources', nameParam: 'path' },
    'registry-content': { path: '/management/registry-resources/content', nameParam: 'path' },
    'configs': { path: '/management/configs', nameParam: 'configName' },
};

// ============================================================================
// Management API HTTP Client
// ============================================================================

// Allow insecure TLS only when explicitly opted in (e.g. self-signed certs in dev).
// Set MI_MANAGEMENT_ALLOW_INSECURE_TLS=true to enable.
const allowInsecureTls = process.env['MI_MANAGEMENT_ALLOW_INSECURE_TLS'] === 'true';
const httpsAgent = new https.Agent({ rejectUnauthorized: !allowInsecureTls });

function getManagementBaseUrl(): string {
    const host = DebuggerConfig.getHost();
    const port = DebuggerConfig.getManagementPort();
    return `https://${host}:${port}`;
}

async function getManagementAuthToken(): Promise<string> {
    const username = DebuggerConfig.getManagementUserName();
    const password = DebuggerConfig.getManagementPassword();
    const basicToken = Buffer.from(`${username}:${password}`, 'utf8').toString('base64');
    const baseUrl = getManagementBaseUrl();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    let response;
    try {
        response = await fetch(`${baseUrl}/management/login`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${basicToken}`,
            },
            agent: httpsAgent,
            signal: controller.signal as any,
        });
    } finally {
        clearTimeout(timeoutId);
    }

    if (!response.ok) {
        throw new Error(`Management API login failed: ${response.status} ${response.statusText}`);
    }

    const body = await response.json() as { AccessToken?: string };
    if (!body?.AccessToken) {
        throw new Error('Management API login response did not contain AccessToken');
    }

    return body.AccessToken;
}

interface ManagementApiResponse {
    status: number;
    data: unknown;
}

async function managementApiFetch(
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    path: string,
    queryParams?: Record<string, string>,
    body?: unknown,
): Promise<ManagementApiResponse> {
    const baseUrl = getManagementBaseUrl();
    const token = await getManagementAuthToken();

    let url = `${baseUrl}${path}`;
    if (queryParams && Object.keys(queryParams).length > 0) {
        const params = new URLSearchParams(queryParams);
        url += `?${params.toString()}`;
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };

    const options: Record<string, unknown> = {
        method,
        headers,
        agent: httpsAgent,
    };

    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
        options.body = JSON.stringify(body);
    }

    logDebug(`[ManagementAPI] ${method} ${url}`);
    const fetchController = new AbortController();
    const fetchTimeoutId = setTimeout(() => fetchController.abort(), 2000);
    let response;
    try {
        response = await fetch(url, { ...options, signal: fetchController.signal as any });
    } finally {
        clearTimeout(fetchTimeoutId);
    }
    const responseData = await response.json().catch(() => null);

    return { status: response.status, data: responseData };
}

// ============================================================================
// Management API Reachability Check
// ============================================================================

export async function isManagementApiReachable(): Promise<boolean> {
    const host = DebuggerConfig.getHost();
    const port = DebuggerConfig.getManagementPort();

    return new Promise<boolean>((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(2000);
        socket.on('connect', () => { socket.destroy(); resolve(true); });
        socket.on('error', () => { socket.destroy(); resolve(false); });
        socket.on('timeout', () => { socket.destroy(); resolve(false); });
        socket.connect(port, host);
    });
}

// ============================================================================
// Query Artifacts
// ============================================================================

export async function queryArtifacts(
    artifactType: string,
    artifactName?: string,
    extraParams?: Record<string, string>,
): Promise<ToolResult> {
    const typeInfo = ARTIFACT_TYPE_MAP[artifactType];
    if (!typeInfo) {
        return {
            success: false,
            message: `Unknown artifact type: '${artifactType}'`,
            error: `Valid types: ${Object.keys(ARTIFACT_TYPE_MAP).join(', ')}`,
        };
    }

    // Validate required parameters for specific artifact types
    if (artifactType === 'configs' && !artifactName) {
        return {
            success: false,
            message: "artifact_name is required for 'configs' queries (e.g. artifact_name='correlation')",
            error: 'The configs API requires a configName parameter',
        };
    }
    if ((artifactType === 'registry' || artifactType === 'registry-content') && !artifactName) {
        return {
            success: false,
            message: "artifact_name is required for registry queries. Use the registry path format: 'registry/config/<path>' or 'registry/governance/<path>'",
            error: "Example: artifact_name='registry/config/myFolder' or artifact_name='registry/governance/endpoints'",
        };
    }

    try {
        const reachable = await isManagementApiReachable();
        if (!reachable) {
            return {
                success: false,
                message: 'Management API is not reachable. Is the MI server running?',
                error: `Could not connect to management port ${DebuggerConfig.getManagementPort()}`,
            };
        }

        const queryParams: Record<string, string> = { ...extraParams };
        if (artifactName && typeInfo.nameParam) {
            queryParams[typeInfo.nameParam] = artifactName;
        }

        const response = await managementApiFetch('GET', typeInfo.path, queryParams);

        if (response.status >= 200 && response.status < 300) {
            const label = artifactName
                ? `${artifactType} '${artifactName}'`
                : artifactType;
            logInfo(`[ManagementAPI] Queried ${label} successfully`);
            return {
                success: true,
                message: JSON.stringify(response.data, null, 2),
            };
        }

        return {
            success: false,
            message: `Management API returned status ${response.status}`,
            error: response.data ? JSON.stringify(response.data) : 'No response body',
        };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logError(`[ManagementAPI] Query failed: ${errorMsg}`);
        return {
            success: false,
            message: `Failed to query ${artifactType}`,
            error: errorMsg,
        };
    }
}

// ============================================================================
// Control Artifacts
// ============================================================================

interface ControlMapping {
    method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    path: string;
    buildBody: (artifactName: string, body?: Record<string, unknown>) => unknown;
}

function getControlMapping(
    artifactType: string,
    controlAction: string,
    artifactName: string,
): ControlMapping | { error: string } {
    const typeInfo = ARTIFACT_TYPE_MAP[artifactType];
    if (!typeInfo) {
        return { error: `Unknown artifact type: '${artifactType}'. Valid types: ${Object.keys(ARTIFACT_TYPE_MAP).join(', ')}` };
    }

    // Artifacts that support activate/deactivate
    const activatableTypes = new Set([
        'proxy-services', 'endpoints', 'inbound-endpoints', 'message-processors', 'tasks',
    ]);

    // Artifacts that support tracing
    const traceableTypes = new Set([
        'apis', 'proxy-services', 'endpoints', 'sequences', 'inbound-endpoints', 'templates',
    ]);

    // Artifacts that support statistics
    const statisticsTypes = new Set([
        'apis', 'proxy-services', 'endpoints', 'sequences', 'inbound-endpoints', 'templates',
    ]);

    switch (controlAction) {
        case 'activate':
        case 'deactivate': {
            if (!activatableTypes.has(artifactType)) {
                return { error: `'${artifactType}' does not support activate/deactivate. Supported: ${[...activatableTypes].join(', ')}` };
            }
            const status = controlAction === 'activate' ? 'active' : 'inactive';
            return {
                method: 'POST',
                path: typeInfo.path,
                buildBody: () => ({ name: artifactName, status }),
            };
        }

        case 'enableTracing':
        case 'disableTracing': {
            if (!traceableTypes.has(artifactType)) {
                return { error: `'${artifactType}' does not support tracing. Supported: ${[...traceableTypes].join(', ')}` };
            }
            const trace = controlAction === 'enableTracing' ? 'enable' : 'disable';
            const bodyObj: Record<string, string> = { name: artifactName, trace };
            if (artifactType === 'templates') {
                bodyObj.type = 'sequence';
            }
            return {
                method: 'POST',
                path: typeInfo.path,
                buildBody: () => bodyObj,
            };
        }

        case 'enableStatistics':
        case 'disableStatistics': {
            if (!statisticsTypes.has(artifactType)) {
                return { error: `'${artifactType}' does not support statistics. Supported: ${[...statisticsTypes].join(', ')}` };
            }
            const statistics = controlAction === 'enableStatistics' ? 'enable' : 'disable';
            const bodyObj: Record<string, string> = { name: artifactName, statistics };
            if (artifactType === 'templates') {
                bodyObj.type = 'sequence';
            }
            return {
                method: 'POST',
                path: typeInfo.path,
                buildBody: () => bodyObj,
            };
        }

        case 'trigger': {
            if (artifactType !== 'tasks') {
                return { error: `'trigger' is only supported for 'tasks', not '${artifactType}'` };
            }
            return {
                method: 'POST',
                path: typeInfo.path,
                buildBody: () => ({ name: artifactName, status: 'trigger' }),
            };
        }

        case 'setLogLevel': {
            if (artifactType !== 'logging') {
                return { error: `'setLogLevel' is only supported for 'logging', not '${artifactType}'` };
            }
            return {
                method: 'PATCH',
                path: typeInfo.path,
                buildBody: (_name, body) => {
                    if (!body?.loggingLevel) {
                        throw new Error('body.loggingLevel is required for setLogLevel');
                    }
                    const patchBody: Record<string, unknown> = {
                        loggerName: body.loggerName || artifactName,
                        loggingLevel: body.loggingLevel,
                    };
                    if (body.loggerClass) {
                        patchBody.loggerClass = body.loggerClass;
                    }
                    return patchBody;
                },
            };
        }

        case 'restart':
        case 'restartGracefully': {
            if (artifactType !== 'server') {
                return { error: `'${controlAction}' is only supported for 'server', not '${artifactType}'` };
            }
            return {
                method: 'PATCH',
                path: '/management/server',
                buildBody: () => ({ status: controlAction }),
            };
        }

        default:
            return {
                error: `Unknown control action: '${controlAction}'. Valid actions: activate, deactivate, enableTracing, disableTracing, enableStatistics, disableStatistics, trigger, setLogLevel, restart, restartGracefully`,
            };
    }
}

export async function controlArtifact(
    artifactType: string,
    controlAction: string,
    artifactName: string,
    body?: Record<string, unknown>,
): Promise<ToolResult> {
    const mapping = getControlMapping(artifactType, controlAction, artifactName);
    if ('error' in mapping) {
        return { success: false, message: mapping.error, error: mapping.error };
    }

    try {
        const reachable = await isManagementApiReachable();
        if (!reachable) {
            return {
                success: false,
                message: 'Management API is not reachable. Is the MI server running?',
                error: `Could not connect to management port ${DebuggerConfig.getManagementPort()}`,
            };
        }

        const requestBody = mapping.buildBody(artifactName, body);
        const response = await managementApiFetch(mapping.method, mapping.path, undefined, requestBody);

        if (response.status >= 200 && response.status < 300) {
            logInfo(`[ManagementAPI] ${controlAction} on ${artifactType}/${artifactName} succeeded`);
            return {
                success: true,
                message: response.data ? JSON.stringify(response.data, null, 2) : `${controlAction} on '${artifactName}' succeeded`,
            };
        }

        return {
            success: false,
            message: `Management API returned status ${response.status}`,
            error: response.data ? JSON.stringify(response.data) : 'No response body',
        };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logError(`[ManagementAPI] Control action failed: ${errorMsg}`);
        return {
            success: false,
            message: `Failed to ${controlAction} on ${artifactType}/${artifactName}`,
            error: errorMsg,
        };
    }
}
