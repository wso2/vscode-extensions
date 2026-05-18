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

import * as fs from 'fs';
import * as path from 'path';
import { GetInboundInfoRequest } from '@wso2/mi-core';
import { MILanguageClient } from '../../../lang-client/activator';
import { logDebug, logWarn } from '../../copilot/logger';
import { isOperationAbortedError } from './abort-utils';

// ============================================================================
// Types — connector path
// ============================================================================

export interface LSConnectorParameter {
    name: string;
    description: string;
    required: boolean;
    xsdType: string;
    defaultValue?: string;
}

export interface LSConnectorConnection {
    name: string;              // e.g. "REDIS" — matches allowedConnectionTypes on actions
    displayName: string;
    description: string;
    uiSchemaPath: string;      // absolute path to the connection's uischema JSON file
    parameters: LSConnectorParameter[];
}

export interface LSConnectorOperation {
    name: string;
    tag: string;
    displayName: string;
    description: string;
    isHidden: boolean;
    supportsResponseModel: boolean;
    canActAsAgentTool: boolean;
    allowedConnectionTypes: string[];
    parameters: LSConnectorParameter[];
    uiSchemaPath?: string;
    outputSchemaPath?: string;
}

export interface LSConnectorResult {
    name: string;
    displayName: string;
    artifactId: string;
    version: string;
    packageName: string;
    extractedConnectorPath: string;  // absolute extracted folder
    connectorZipPath: string;        // absolute downloaded zip
    uiSchemaPath: string;            // connector-level uischema directory
    outputSchemaPath: string;        // connector-level directory for per-operation <name>.json files
    ballerinaModulePath: string;
    connections: LSConnectorConnection[];
    operations: LSConnectorOperation[];
}

// ============================================================================
// Types — inbound path
// ============================================================================

export interface LSInboundParameter {
    name: string;
    description: string;
    required: boolean;
    xsdType: string;
}

export interface LSInboundResult {
    name: string;
    id: string;
    displayName: string;
    description: string;
    type: string;                       // "inbuilt-inbound-endpoint" | "event-integration" | ...
    source: 'bundled' | 'downloaded';
    parameters: LSInboundParameter[];
}

// ============================================================================
// Types — local inbound catalog (discovery)
// ============================================================================

export interface LocalInboundCatalogEntry {
    id: string;
    name: string;
    description?: string;
    type: 'bundled' | 'maven-or-custom';
}

export interface LocalInboundCatalog {
    bundled: LocalInboundCatalogEntry[];
    maven: LocalInboundCatalogEntry[];
}

// ============================================================================
// Internal mapping helpers
// ============================================================================

function mapParameter(p: any): LSConnectorParameter {
    return {
        name: typeof p?.name === 'string' ? p.name : '',
        description: typeof p?.description === 'string' ? p.description : '',
        required: p?.required === true,
        xsdType: typeof p?.xsdType === 'string' ? p.xsdType : 'xs:string',
        defaultValue: typeof p?.defaultValue === 'string' ? p.defaultValue : undefined,
    };
}

function mapConnection(raw: any): LSConnectorConnection {
    return {
        name: typeof raw?.name === 'string' ? raw.name : '',
        displayName: typeof raw?.displayName === 'string' ? raw.displayName : '',
        description: typeof raw?.description === 'string' ? raw.description : '',
        uiSchemaPath: typeof raw?.uiSchemaPath === 'string' ? raw.uiSchemaPath : '',
        parameters: Array.isArray(raw?.parameters) ? raw.parameters.map(mapParameter) : [],
    };
}

function mapOperation(raw: any): LSConnectorOperation {
    // LS uses `isHidden` on the wire (old spec also had `hidden`). Accept either.
    const hidden = raw?.isHidden === true || raw?.hidden === true;
    return {
        name: typeof raw?.name === 'string' ? raw.name : '',
        tag: typeof raw?.tag === 'string' ? raw.tag : '',
        displayName: typeof raw?.displayName === 'string' ? raw.displayName : '',
        description: typeof raw?.description === 'string' ? raw.description : '',
        isHidden: hidden,
        supportsResponseModel: raw?.supportsResponseModel === true,
        canActAsAgentTool: raw?.canActAsAgentTool !== false, // defaults to true
        allowedConnectionTypes: Array.isArray(raw?.allowedConnectionTypes) ? raw.allowedConnectionTypes : [],
        parameters: Array.isArray(raw?.parameters) ? raw.parameters.map(mapParameter) : [],
        uiSchemaPath: typeof raw?.uiSchemaPath === 'string' ? raw.uiSchemaPath : undefined,
        outputSchemaPath: typeof raw?.outputSchemaPath === 'string' ? raw.outputSchemaPath : undefined,
    };
}

function mapConnectorResult(raw: any): LSConnectorResult | null {
    if (!raw || typeof raw !== 'object' || typeof raw.name !== 'string') {
        return null;
    }
    return {
        name: raw.name,
        displayName: typeof raw.displayName === 'string' ? raw.displayName : raw.name,
        artifactId: typeof raw.artifactId === 'string' ? raw.artifactId : '',
        version: typeof raw.version === 'string' ? raw.version : '',
        packageName: typeof raw.packageName === 'string' ? raw.packageName : '',
        extractedConnectorPath: typeof raw.extractedConnectorPath === 'string' ? raw.extractedConnectorPath : '',
        connectorZipPath: typeof raw.connectorZipPath === 'string' ? raw.connectorZipPath : '',
        uiSchemaPath: typeof raw.uiSchemaPath === 'string' ? raw.uiSchemaPath : '',
        outputSchemaPath: typeof raw.outputSchemaPath === 'string' ? raw.outputSchemaPath : '',
        ballerinaModulePath: typeof raw.ballerinaModulePath === 'string' ? raw.ballerinaModulePath : '',
        connections: Array.isArray(raw.connections) ? raw.connections.map(mapConnection) : [],
        operations: Array.isArray(raw.operations) ? raw.operations.map(mapOperation) : [],
    };
}

function mapInboundResult(raw: any): LSInboundResult | null {
    if (!raw || typeof raw !== 'object' || typeof raw.name !== 'string' || typeof raw.id !== 'string') {
        return null;
    }
    const source = raw.source === 'bundled' ? 'bundled' : raw.source === 'downloaded' ? 'downloaded' : null;
    if (source === null) {
        return null;
    }
    return {
        name: raw.name,
        id: raw.id,
        displayName: typeof raw.displayName === 'string' ? raw.displayName : raw.name,
        description: typeof raw.description === 'string' ? raw.description : '',
        type: typeof raw.type === 'string' ? raw.type : '',
        source,
        parameters: Array.isArray(raw.parameters)
            ? raw.parameters.map((p: any) => ({
                name: typeof p?.name === 'string' ? p.name : '',
                description: typeof p?.description === 'string' ? p.description : '',
                required: p?.required === true,
                xsdType: typeof p?.xsdType === 'string' ? p.xsdType : 'xs:string',
            }))
            : [],
    };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Fetch a connector's full metadata by Maven coordinates via `synapse/getConnectorInfo`.
 * LS downloads + extracts the zip if not already cached. Single call; no separate resolve step.
 *
 * Returns the mapped result on success, or a `{ error }` envelope when the LS returns a string error
 * (e.g. "Artifact not found on WSO2 Nexus: ...").
 */
export async function getConnectorInfoFromLS(
    projectPath: string,
    groupId: string,
    artifactId: string,
    version: string
): Promise<LSConnectorResult | { error: string }> {
    try {
        const langClient = await MILanguageClient.getInstance(projectPath);
        if (!langClient) {
            return { error: 'Language client not available' };
        }
        const response = await langClient.getConnectorInfo({ groupId, artifactId, version });
        // Error path: LS returns a plain string message on failure.
        if (typeof response === 'string') {
            logDebug(`[ConnectorLSClient] getConnectorInfo error for ${artifactId}:${version}: ${response}`);
            return { error: response };
        }
        const mapped = mapConnectorResult(response);
        if (!mapped) {
            return { error: `Unexpected response shape from synapse/getConnectorInfo for ${artifactId}:${version}` };
        }
        return mapped;
    } catch (error) {
        // User-initiated aborts must propagate — collapsing them into an
        // { error } envelope would leave the agent thinking the LS refused the
        // request and it could reasonably retry.
        if (isOperationAbortedError(error)) {
            throw error;
        }
        const msg = error instanceof Error ? error.message : String(error);
        logWarn(`[ConnectorLSClient] getConnectorInfo threw for ${artifactId}:${version}: ${msg}`);
        return { error: msg };
    }
}

/**
 * Fetch an inbound endpoint's metadata via `synapse/getInboundInfo`.
 * Either a bundled id (e.g. "jms") or Maven coords (e.g. mi-inbound-amazonsqs).
 */
export async function getInboundInfoFromLS(
    projectPath: string,
    req: GetInboundInfoRequest
): Promise<LSInboundResult | { error: string }> {
    try {
        const langClient = await MILanguageClient.getInstance(projectPath);
        if (!langClient) {
            return { error: 'Language client not available' };
        }
        const response = await langClient.getInboundInfo(req);
        if (typeof response === 'string') {
            logDebug(`[ConnectorLSClient] getInboundInfo error for ${JSON.stringify(req)}: ${response}`);
            return { error: response };
        }
        const mapped = mapInboundResult(response);
        if (!mapped) {
            return { error: `Unexpected response shape from synapse/getInboundInfo for ${JSON.stringify(req)}` };
        }
        return mapped;
    } catch (error) {
        if (isOperationAbortedError(error)) {
            throw error;
        }
        const msg = error instanceof Error ? error.message : String(error);
        logWarn(`[ConnectorLSClient] getInboundInfo threw: ${msg}`);
        return { error: msg };
    }
}

/**
 * Resolve realpath for a candidate file, returning null on ENOENT. Used to
 * canonicalize before containment checks so a symlink target is verified, not
 * just the lexical path.
 */
async function tryRealpath(candidate: string): Promise<string | null> {
    try {
        return await fs.promises.realpath(candidate);
    } catch (error) {
        if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
            return null;
        }
        throw error;
    }
}

/**
 * Read an output schema JSON from a direct file path. Used when an operation
 * declares its own `outputSchemaPath` (a full path to the schema file) — in
 * that case we should NOT re-derive the path from the connector-level dir +
 * operation name. When `allowedBaseDir` is provided, we verify via realpath
 * that the file resolves inside it so a symlink target outside the connector
 * extraction dir is refused.
 */
export async function readOutputSchemaFile(
    filePath: string,
    allowedBaseDir?: string
): Promise<any | null> {
    if (!filePath) {
        return null;
    }
    try {
        if (allowedBaseDir) {
            const realFile = await tryRealpath(filePath);
            if (!realFile) {
                return null; // ENOENT — no schema for this op.
            }
            const realBase = await tryRealpath(allowedBaseDir);
            if (!realBase) {
                logDebug(`[ConnectorLSClient] allowedBaseDir '${allowedBaseDir}' does not exist; refusing to read '${filePath}'`);
                return null;
            }
            if (realFile !== realBase && !realFile.startsWith(realBase + path.sep)) {
                logDebug(`[ConnectorLSClient] Refusing to read '${filePath}' — realpath '${realFile}' is outside '${realBase}'`);
                return null;
            }
        }
        const content = await fs.promises.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
            return null;
        }
        logDebug(`[ConnectorLSClient] Failed to read output schema file '${filePath}': ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

export async function readOutputSchema(
    outputSchemaDir: string,
    operationName: string
): Promise<any | null> {
    if (!outputSchemaDir) {
        return null;
    }
    // Defense in depth: operationName comes from the LS response, but a
    // malformed or malicious name like "../../etc/passwd" would escape the
    // schema directory. Reduce to basename and verify containment before reading.
    const safeName = path.basename(`${operationName}.json`);
    const resolvedDir = path.resolve(outputSchemaDir);
    const schemaPath = path.resolve(resolvedDir, safeName);
    if (schemaPath !== resolvedDir && !schemaPath.startsWith(resolvedDir + path.sep)) {
        logDebug(`[ConnectorLSClient] Refusing to read output schema outside '${resolvedDir}' for '${operationName}'`);
        return null;
    }
    try {
        // Canonicalize via realpath so a symlink can't escape the directory
        // even though the lexical check above passed.
        const realDir = await tryRealpath(resolvedDir);
        if (!realDir) {
            return null;
        }
        const realPath = await tryRealpath(schemaPath);
        if (!realPath) {
            return null; // ENOENT — no schema for this op.
        }
        if (realPath !== realDir && !realPath.startsWith(realDir + path.sep)) {
            logDebug(`[ConnectorLSClient] Refusing to read output schema — realpath '${realPath}' is outside '${realDir}'`);
            return null;
        }
        const content = await fs.promises.readFile(realPath, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
            return null;
        }
        logDebug(`[ConnectorLSClient] Failed to read output schema for '${operationName}': ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * Discover inbound endpoint types known to the LS/runtime — splits bundled (runtime-shipped)
 * from Maven-or-custom (either in the store catalog or added under
 * `src/main/wso2mi/resources/inbound-connectors/`).
 *
 * The bundled list is runtime-dependent — we do NOT hardcode it. Bundled `id`s are the
 * values passed to `getInboundInfo({id})`. Maven entries' `id`s are consumer class FQNs
 * and are NOT usable directly with `getInboundInfo` — use the mavenArtifactId from the
 * connector store instead.
 */
export async function getLocalInboundCatalog(projectPath: string): Promise<LocalInboundCatalog> {
    try {
        const langClient = await MILanguageClient.getInstance(projectPath);
        if (!langClient) {
            return { bundled: [], maven: [] };
        }
        const response = (await langClient.getLocalInboundConnectors()) as
            | { 'inbound-connector-data'?: unknown }
            | undefined;
        const data = response?.['inbound-connector-data'];
        const entries: any[] = Array.isArray(data) ? data : [];
        const bundled: LocalInboundCatalogEntry[] = [];
        const maven: LocalInboundCatalogEntry[] = [];
        for (const e of entries) {
            const id = typeof e?.id === 'string' ? e.id : '';
            const name = typeof e?.name === 'string' ? e.name : '';
            if (!id || !name) {
                continue;
            }
            const description = typeof e?.description === 'string' ? e.description : undefined;
            // Accept both spellings defensively: `getLocalInboundConnectors` documents
            // "builtin-inbound-endpoint", while `getInboundInfo` uses "inbuilt-inbound-endpoint".
            // If the LS ever aligns the two, this stays correct either way.
            if (e?.type === 'builtin-inbound-endpoint' || e?.type === 'inbuilt-inbound-endpoint') {
                bundled.push({ id, name, description, type: 'bundled' });
            } else {
                // 'inbound-endpoint' plus any future custom categorization
                maven.push({ id, name, description, type: 'maven-or-custom' });
            }
        }
        return { bundled, maven };
    } catch (error) {
        logWarn(`[ConnectorLSClient] getLocalInboundCatalog failed: ${error instanceof Error ? error.message : String(error)}`);
        return { bundled: [], maven: [] };
    }
}
