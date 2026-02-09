// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { CodeMapResponse } from "@wso2/ballerina-core";

interface ArtifactRange {
    start: { line: number; character: number };
    end: { line: number; character: number };
}

interface CodeMapArtifactRaw {
    name: string;
    type: string;
    range?: ArtifactRange;
    lineRange?: ArtifactRange;
    properties?: Record<string, any> | null;
    children?: CodeMapArtifactRaw[] | null;
}

/**
 * Generates a structured markdown representation of the project's CodeMap.
 * This markdown is intended to be sent to the LLM as project context.
 */
export function generateCodeMapMarkdown(codeMapResponse: CodeMapResponse): string {
    const files = codeMapResponse?.files;
    if (!files) {
        return "# Project CodeMap\n\nNo files found.\n";
    }

    const lines: string[] = ["# Project CodeMap"];

    for (const [filePath, fileData] of Object.entries(files)) {
        // Handle both shapes: { artifacts: [...] } or direct array
        const artifacts: CodeMapArtifactRaw[] = Array.isArray(fileData)
            ? fileData
            : (fileData as any)?.artifacts ?? [];

        if (artifacts.length === 0) {
            continue;
        }

        lines.push("");
        lines.push("---");
        lines.push("");
        lines.push(`## ${filePath}`);

        // Group artifacts by section
        const imports: CodeMapArtifactRaw[] = [];
        const configurables: CodeMapArtifactRaw[] = [];
        const connections: CodeMapArtifactRaw[] = [];
        const variables: CodeMapArtifactRaw[] = [];
        const types: CodeMapArtifactRaw[] = [];
        const functions: CodeMapArtifactRaw[] = [];
        const automations: CodeMapArtifactRaw[] = [];
        const listeners: CodeMapArtifactRaw[] = [];
        const services: CodeMapArtifactRaw[] = [];
        const classes: CodeMapArtifactRaw[] = [];
        const dataMappers: CodeMapArtifactRaw[] = [];

        for (const artifact of artifacts) {
            switch (artifact.type) {
                case "IMPORT":
                    imports.push(artifact);
                    break;
                case "LISTENER":
                    listeners.push(artifact);
                    break;
                case "TYPE":
                    types.push(artifact);
                    break;
                case "SERVICE":
                    services.push(artifact);
                    break;
                case "CLASS":
                    classes.push(artifact);
                    break;
                case "DATA_MAPPER":
                    dataMappers.push(artifact);
                    break;
                case "VARIABLE":
                    categorizeVariable(artifact, configurables, connections, variables);
                    break;
                case "FUNCTION":
                    if (artifact.name === "main") {
                        automations.push(artifact);
                    } else {
                        functions.push(artifact);
                    }
                    break;
                default:
                    break;
            }
        }

        // Render sections in order (only non-empty)
        renderImports(lines, imports);
        renderConfigurables(lines, configurables);
        renderVariables(lines, variables);
        renderTypes(lines, types);
        renderFunctions(lines, functions);
        renderAutomations(lines, automations);
        renderListeners(lines, listeners);
        renderConnections(lines, connections);
        renderServices(lines, services);
        renderClasses(lines, classes);
        renderDataMappers(lines, dataMappers);
    }

    lines.push("");
    return lines.join("\n");
}

// --- Helper functions ---

function prop(artifact: CodeMapArtifactRaw, key: string): any {
    return artifact.properties?.[key] ?? null;
}

function propStr(artifact: CodeMapArtifactRaw, key: string, fallback: string = "none"): string {
    const val = prop(artifact, key);
    if (val === null || val === undefined) {
        return fallback;
    }
    return String(val);
}

function formatRange(artifact: CodeMapArtifactRaw): string {
    const r = artifact.range ?? artifact.lineRange;
    if (!r) {
        return "unknown";
    }
    return `L${r.start.line}:${r.start.character} → L${r.end.line}:${r.end.character}`;
}

function formatModifiers(artifact: CodeMapArtifactRaw): string {
    const mods = prop(artifact, "modifiers");
    if (!mods || !Array.isArray(mods) || mods.length === 0) {
        return "none";
    }
    return mods.map((m: string) => `\`${m}\``).join(", ");
}

function formatParameters(artifact: CodeMapArtifactRaw): string[] {
    const params = prop(artifact, "parameters");
    if (!params || !Array.isArray(params) || params.length === 0) {
        return [];
    }
    return params.map((p: any) => {
        if (typeof p === "string") {
            return `  - ${p}`;
        }
        if (p.name && p.type) {
            return `  - \`${p.name}\`: \`${p.type}\``;
        }
        return `  - ${JSON.stringify(p)}`;
    });
}

function getChildren(artifact: CodeMapArtifactRaw): CodeMapArtifactRaw[] {
    return artifact.children ?? [];
}

function categorizeVariable(
    artifact: CodeMapArtifactRaw,
    configurables: CodeMapArtifactRaw[],
    connections: CodeMapArtifactRaw[],
    variables: CodeMapArtifactRaw[]
): void {
    const category = propStr(artifact, "category", "").toUpperCase();
    if (category === "CONFIGURABLE") {
        configurables.push(artifact);
    } else if (category === "CONNECTION") {
        connections.push(artifact);
    } else {
        variables.push(artifact);
    }
}

// --- Section renderers ---

function renderImports(lines: string[], artifacts: CodeMapArtifactRaw[]): void {
    if (artifacts.length === 0) { return; }
    lines.push("");
    lines.push("### Imports");
    for (const a of artifacts) {
        const org = propStr(a, "orgName");
        const mod = propStr(a, "moduleName");
        const alias = prop(a, "alias");
        let entry = `- \`${org}/${mod}\``;
        if (alias) {
            entry += ` as \`${alias}\``;
        }
        lines.push(entry);
    }
}

function renderConfigurables(lines: string[], artifacts: CodeMapArtifactRaw[]): void {
    if (artifacts.length === 0) { return; }
    lines.push("");
    lines.push("### Configurables");
    for (const a of artifacts) {
        lines.push("");
        lines.push(`#### ${a.name}`);
        lines.push(`- **Modifiers:** \`configurable\``);
        lines.push(`- **Type:** \`${propStr(a, "type")}\``);
        lines.push(`- **Line Range:** ${formatRange(a)}`);
        lines.push(`- **Documentation:** ${propStr(a, "documentation")}`);
    }
}

function renderVariables(lines: string[], artifacts: CodeMapArtifactRaw[]): void {
    if (artifacts.length === 0) { return; }
    lines.push("");
    lines.push("### Variables");
    for (const a of artifacts) {
        lines.push("");
        lines.push(`#### ${a.name}`);
        lines.push(`- **Modifiers:** ${formatModifiers(a)}`);
        lines.push(`- **Type:** \`${propStr(a, "type")}\``);
        lines.push(`- **Line Range:** ${formatRange(a)}`);
        lines.push(`- **Documentation:** ${propStr(a, "documentation")}`);
    }
}

function renderTypes(lines: string[], artifacts: CodeMapArtifactRaw[]): void {
    if (artifacts.length === 0) { return; }
    lines.push("");
    lines.push("### Types");
    for (const a of artifacts) {
        lines.push("");
        lines.push(`#### ${a.name}`);
        lines.push(`- **Type Descriptor:** \`${propStr(a, "typeDescriptor")}\``);
        lines.push(`- **Line Range:** ${formatRange(a)}`);
        lines.push(`- **Documentation:** ${propStr(a, "documentation")}`);
        const fields = prop(a, "fields");
        if (fields && Array.isArray(fields) && fields.length > 0) {
            lines.push("- **Fields:**");
            for (const f of fields) {
                lines.push(`  - ${f}`);
            }
        }
    }
}

function renderFunctions(lines: string[], artifacts: CodeMapArtifactRaw[]): void {
    if (artifacts.length === 0) { return; }
    lines.push("");
    lines.push("### Functions");
    for (const a of artifacts) {
        renderSingleFunction(lines, a, "####");
    }
}

function renderAutomations(lines: string[], artifacts: CodeMapArtifactRaw[]): void {
    if (artifacts.length === 0) { return; }
    lines.push("");
    lines.push("### Automations (Entry Points)");
    for (const a of artifacts) {
        lines.push("");
        lines.push(`#### ${a.name}`);
        lines.push(`- **Modifiers:** ${formatModifiers(a)}`);
        lines.push(`- **Line Range:** ${formatRange(a)}`);
        lines.push(`- **Documentation:** ${propStr(a, "documentation")}`);
        const params = formatParameters(a);
        if (params.length > 0) {
            lines.push("- **Parameters:**");
            lines.push(...params);
        } else {
            lines.push("- **Parameters:** none");
        }
        lines.push(`- **Returns:** \`${propStr(a, "returns")}\``);
    }
}

function renderListeners(lines: string[], artifacts: CodeMapArtifactRaw[]): void {
    if (artifacts.length === 0) { return; }
    lines.push("");
    lines.push("### Listeners");
    for (const a of artifacts) {
        lines.push("");
        lines.push(`#### ${a.name}`);
        lines.push(`- **Type:** \`${propStr(a, "type")}\``);
        lines.push(`- **Line Range:** ${formatRange(a)}`);
        lines.push(`- **Modifiers:** ${formatModifiers(a)}`);
        lines.push(`- **Documentation:** ${propStr(a, "documentation")}`);
        const args = prop(a, "arguments");
        if (args && Array.isArray(args) && args.length > 0) {
            lines.push("- **Arguments:**");
            for (const arg of args) {
                lines.push(`  - ${arg}`);
            }
        }
    }
}

function renderConnections(lines: string[], artifacts: CodeMapArtifactRaw[]): void {
    if (artifacts.length === 0) { return; }
    lines.push("");
    lines.push("### Connections");
    for (const a of artifacts) {
        lines.push("");
        lines.push(`#### ${a.name}`);
        lines.push(`- **Type:** \`${propStr(a, "type")}\``);
        lines.push(`- **Line Range:** ${formatRange(a)}`);
        lines.push(`- **Modifiers:** ${formatModifiers(a)}`);
        lines.push(`- **Documentation:** ${propStr(a, "documentation")}`);
    }
}

function renderServices(lines: string[], artifacts: CodeMapArtifactRaw[]): void {
    if (artifacts.length === 0) { return; }
    lines.push("");
    lines.push("### Services (Entry Points)");
    for (const a of artifacts) {
        lines.push("");
        lines.push(`#### ${a.name}`);
        lines.push(`- **Base Path:** \`${propStr(a, "basePath")}\``);
        lines.push(`- **Listener Type:** \`${propStr(a, "listenerType")}\``);
        lines.push(`- **Port:** ${propStr(a, "port")}`);
        lines.push(`- **Line Range:** ${formatRange(a)}`);
        lines.push(`- **Modifiers:** ${formatModifiers(a)}`);
        lines.push(`- **Documentation:** ${propStr(a, "documentation")}`);

        const children = getChildren(a);
        if (children.length === 0) {
            continue;
        }

        // Categorize children
        const fields: CodeMapArtifactRaw[] = [];
        const resourceFns: CodeMapArtifactRaw[] = [];
        const serviceFns: CodeMapArtifactRaw[] = [];

        for (const child of children) {
            if (child.type === "VARIABLE") {
                fields.push(child);
            } else if (child.type === "FUNCTION") {
                const category = propStr(child, "category", "").toUpperCase();
                if (category === "RESOURCE") {
                    resourceFns.push(child);
                } else {
                    serviceFns.push(child);
                }
            }
        }

        if (fields.length > 0) {
            lines.push("");
            lines.push("##### Fields");
            for (const f of fields) {
                lines.push("");
                lines.push(`###### ${f.name}`);
                lines.push(`- **Type:** \`${propStr(f, "type")}\``);
                lines.push(`- **Line Range:** ${formatRange(f)}`);
                lines.push(`- **Modifiers:** ${formatModifiers(f)}`);
                lines.push(`- **Documentation:** ${propStr(f, "documentation")}`);
            }
        }

        if (resourceFns.length > 0) {
            lines.push("");
            lines.push("##### Resource Functions");
            for (const fn of resourceFns) {
                renderSingleFunction(lines, fn, "######", true);
            }
        }

        if (serviceFns.length > 0) {
            lines.push("");
            lines.push("##### Service Functions");
            for (const fn of serviceFns) {
                renderSingleFunction(lines, fn, "######");
            }
        }
    }
}

function renderClasses(lines: string[], artifacts: CodeMapArtifactRaw[]): void {
    if (artifacts.length === 0) { return; }
    lines.push("");
    lines.push("### Classes");
    for (const a of artifacts) {
        lines.push("");
        lines.push(`#### ${a.name}`);
        const category = propStr(a, "category", "Class");
        lines.push(`- **Category:** ${category}`);
        lines.push(`- **Modifiers:** ${formatModifiers(a)}`);
        lines.push(`- **Line Range:** ${formatRange(a)}`);
        lines.push(`- **Documentation:** ${propStr(a, "documentation")}`);

        const children = getChildren(a);
        if (children.length === 0) {
            continue;
        }

        // Categorize children
        const fields: CodeMapArtifactRaw[] = [];
        const regularFns: CodeMapArtifactRaw[] = [];
        const resourceFns: CodeMapArtifactRaw[] = [];
        const remoteFns: CodeMapArtifactRaw[] = [];

        for (const child of children) {
            if (child.type === "VARIABLE") {
                fields.push(child);
            } else if (child.type === "FUNCTION") {
                const cat = propStr(child, "category", "").toUpperCase();
                const mods: string[] = prop(child, "modifiers") ?? [];
                if (cat === "RESOURCE") {
                    resourceFns.push(child);
                } else if (cat === "REMOTE" || mods.includes("remote")) {
                    remoteFns.push(child);
                } else {
                    regularFns.push(child);
                }
            }
        }

        if (fields.length > 0) {
            lines.push("");
            lines.push("##### Fields");
            for (const f of fields) {
                lines.push("");
                lines.push(`###### ${f.name}`);
                lines.push(`- **Type:** \`${propStr(f, "type")}\``);
                lines.push(`- **Line Range:** ${formatRange(f)}`);
                lines.push(`- **Modifiers:** ${formatModifiers(f)}`);
                lines.push(`- **Documentation:** ${propStr(f, "documentation")}`);
            }
        }

        if (regularFns.length > 0) {
            lines.push("");
            lines.push("##### Functions");
            for (const fn of regularFns) {
                renderSingleFunction(lines, fn, "######");
            }
        }

        if (resourceFns.length > 0) {
            lines.push("");
            lines.push("##### Resource Functions");
            for (const fn of resourceFns) {
                renderSingleFunction(lines, fn, "######", true);
            }
        }

        if (remoteFns.length > 0) {
            lines.push("");
            lines.push("##### Remote Functions");
            for (const fn of remoteFns) {
                renderSingleFunction(lines, fn, "######");
            }
        }
    }
}

function renderDataMappers(lines: string[], artifacts: CodeMapArtifactRaw[]): void {
    if (artifacts.length === 0) { return; }
    lines.push("");
    lines.push("### Data Mappers");
    for (const a of artifacts) {
        renderSingleFunction(lines, a, "####");
    }
}

/**
 * Renders a single function artifact with the given heading level.
 * @param isResource If true, includes accessor field.
 */
function renderSingleFunction(
    lines: string[],
    a: CodeMapArtifactRaw,
    heading: string,
    isResource: boolean = false
): void {
    lines.push("");
    lines.push(`${heading} ${a.name}`);
    if (isResource) {
        lines.push(`- **Accessor:** \`${propStr(a, "accessor")}\``);
    }
    lines.push(`- **Modifiers:** ${formatModifiers(a)}`);
    lines.push(`- **Line Range:** ${formatRange(a)}`);
    lines.push(`- **Documentation:** ${propStr(a, "documentation")}`);
    const params = formatParameters(a);
    if (params.length > 0) {
        lines.push("- **Parameters:**");
        lines.push(...params);
    } else {
        lines.push("- **Parameters:** none");
    }
    lines.push(`- **Returns:** \`${propStr(a, "returns")}\``);
}
