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
        return "# Project CodeMap\n\n## CodeMap Structure\n\nNo files found.\n";
    }

    const lines: string[] = [
        "# Project CodeMap",
        "",
        "## CodeMap Structure",
        "",
        "This document provides a structured overview of the project codebase.",
        "It is organized by file path and summarizes the following elements for each file:",
        "",
        "- **Imports** – External modules and dependencies used in the file.",
        "- **Variables** – Global and configurable variables with their types and line ranges.",
        "- **Functions** – Functions with parameter details, return types, documentation, and line ranges.",
        "- **Services / Resources** – HTTP services, resource functions, and entry points.",
        "- **Types** – Record types, enums, and custom type definitions.",
        "- **Classes** – Class definitions with their members.",
        "- **Automations** – Entry-point functions such as `main`.",
        "",
        "Each section is grouped under its corresponding file path to provide a high-level architectural view of the system.",
        "",
        "**Important Notes:**",
        "",
        "This CodeMap may fail or crash if there are syntax errors or compilation errors in the project.",
        "If there are inconsistencies, missing artifacts, or incorrect details in the generated CodeMap,",
        "use the read tool to inspect the actual implementation and verify the source code directly.",
    ];

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
        lines.push(`## File Path : ${filePath}`);

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

function propStr(artifact: CodeMapArtifactRaw, key: string, fallback: string = ""): string {
    const val = prop(artifact, key);
    if (val === null || val === undefined) {
        return fallback;
    }
    return String(val);
}

function formatRange(artifact: CodeMapArtifactRaw): string {
    const r = artifact.range ?? artifact.lineRange;
    if (!r) {
        return "";
    }
    return `(${r.start.line}:${r.start.character}-${r.end.line}:${r.end.character})`;
}

function modifiersPrefix(artifact: CodeMapArtifactRaw): string {
    const mods = prop(artifact, "modifiers");
    if (!mods || !Array.isArray(mods) || mods.length === 0) {
        return "";
    }
    return mods.join(" ") + " ";
}

function parametersInline(artifact: CodeMapArtifactRaw): string {
    const params = prop(artifact, "parameters");
    if (!params || !Array.isArray(params) || params.length === 0) {
        return "";
    }
    return params.map((p: any) => {
        if (typeof p === "string") {
            return p;
        }
        if (p.name && p.type) {
            return `${p.name}: ${p.type}`;
        }
        return JSON.stringify(p);
    }).join(", ");
}

function addPart(parts: string[], label: string, value: string): void {
    if (value) {
        parts.push(`**${label}**: ${value}`);
    }
}

function addBracketPart(parts: string[], label: string, value: string): void {
    if (value) {
        parts.push(`**${label}**: [${value}]`);
    }
}

function addLineRange(parts: string[], artifact: CodeMapArtifactRaw): void {
    const range = formatRange(artifact);
    if (range) {
        parts.push(`**LineRange** ${range}`);
    }
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
    const category = propStr(artifact, "category").toUpperCase();
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
    lines.push("", "### Imports", "");
    for (const a of artifacts) {
        const org = propStr(a, "orgName");
        const mod = propStr(a, "moduleName");
        const alias = prop(a, "alias");
        let entry = `- ${org}/${mod}`;
        if (alias) {
            entry += ` as ${alias}`;
        }
        lines.push(entry);
    }
}

function renderConfigurables(lines: string[], artifacts: CodeMapArtifactRaw[]): void {
    if (artifacts.length === 0) { return; }
    lines.push("", "### Configurables", "");
    for (const a of artifacts) {
        const parts: string[] = [`configurable ${a.name}`];
        addPart(parts, "Type", propStr(a, "type"));
        addPart(parts, "Documentation", propStr(a, "documentation"));
        addLineRange(parts, a);
        lines.push("- " + parts.join(" | "));
    }
}

function renderVariables(lines: string[], artifacts: CodeMapArtifactRaw[]): void {
    if (artifacts.length === 0) { return; }
    lines.push("", "### Variables", "");
    for (const a of artifacts) {
        const parts: string[] = [`${modifiersPrefix(a)}${a.name}`];
        addPart(parts, "Type", propStr(a, "type"));
        addPart(parts, "Documentation", propStr(a, "documentation"));
        addLineRange(parts, a);
        lines.push("- " + parts.join(" | "));
    }
}

function renderTypes(lines: string[], artifacts: CodeMapArtifactRaw[]): void {
    if (artifacts.length === 0) { return; }
    lines.push("", "### Types", "");
    for (const a of artifacts) {
        const parts: string[] = [`type ${a.name}`];
        addPart(parts, "Type Descriptor", propStr(a, "typeDescriptor"));
        const fields = prop(a, "fields");
        if (fields && Array.isArray(fields) && fields.length > 0) {
            addBracketPart(parts, "Fields", fields.join(", "));
        }
        addPart(parts, "Documentation", propStr(a, "documentation"));
        addLineRange(parts, a);
        lines.push("- " + parts.join(" | "));
    }
}

function renderFunctions(lines: string[], artifacts: CodeMapArtifactRaw[]): void {
    if (artifacts.length === 0) { return; }
    lines.push("", "### Functions", "");
    for (const a of artifacts) {
        renderSingleFunction(lines, a);
    }
}

function renderAutomations(lines: string[], artifacts: CodeMapArtifactRaw[]): void {
    if (artifacts.length === 0) { return; }
    lines.push("", "### Automations (Entry Points)", "");
    for (const a of artifacts) {
        renderSingleFunction(lines, a);
    }
}

function renderListeners(lines: string[], artifacts: CodeMapArtifactRaw[]): void {
    if (artifacts.length === 0) { return; }
    lines.push("", "### Listeners", "");
    for (const a of artifacts) {
        const parts: string[] = [`listener ${a.name}`];
        addPart(parts, "Type", propStr(a, "type"));
        const args = prop(a, "arguments");
        if (args && Array.isArray(args) && args.length > 0) {
            addBracketPart(parts, "Arguments", args.join(", "));
        }
        addPart(parts, "Documentation", propStr(a, "documentation"));
        addLineRange(parts, a);
        lines.push("- " + parts.join(" | "));
    }
}

function renderConnections(lines: string[], artifacts: CodeMapArtifactRaw[]): void {
    if (artifacts.length === 0) { return; }
    lines.push("", "### Connections", "");
    for (const a of artifacts) {
        const parts: string[] = [`${modifiersPrefix(a)}${a.name}`];
        addPart(parts, "Type", propStr(a, "type"));
        addPart(parts, "Documentation", propStr(a, "documentation"));
        addLineRange(parts, a);
        lines.push("- " + parts.join(" | "));
    }
}

function renderServices(lines: string[], artifacts: CodeMapArtifactRaw[]): void {
    if (artifacts.length === 0) { return; }
    lines.push("", "### Services (Entry Points)", "");
    for (const a of artifacts) {
        const parts: string[] = [`${modifiersPrefix(a)}service ${a.name}`];
        addPart(parts, "Base Path", propStr(a, "basePath"));
        addPart(parts, "Listener Type", propStr(a, "listenerType"));
        addPart(parts, "Port", propStr(a, "port"));
        addPart(parts, "Documentation", propStr(a, "documentation"));
        addLineRange(parts, a);
        lines.push("- " + parts.join(" | "));

        const children = getChildren(a);
        if (children.length > 0) {
            renderServiceChildren(lines, children);
        }
    }
}

function renderServiceChildren(lines: string[], children: CodeMapArtifactRaw[]): void {
    const fields: CodeMapArtifactRaw[] = [];
    const resourceFns: CodeMapArtifactRaw[] = [];
    const serviceFns: CodeMapArtifactRaw[] = [];

    for (const child of children) {
        if (child.type === "VARIABLE" || child.type === "FIELD") {
            fields.push(child);
        } else if (child.type === "FUNCTION") {
            const category = propStr(child, "category").toUpperCase();
            if (category === "RESOURCE") {
                resourceFns.push(child);
            } else {
                serviceFns.push(child);
            }
        }
    }

    for (const f of fields) {
        const parts: string[] = [`${modifiersPrefix(f)}${f.name}`];
        addPart(parts, "Type", propStr(f, "type"));
        addLineRange(parts, f);
        lines.push(`  - ${parts.join(" | ")}`);
    }

    for (const fn of resourceFns) {
        renderSingleFunction(lines, fn, "  ", true);
    }

    for (const fn of serviceFns) {
        renderSingleFunction(lines, fn, "  ");
    }
}

function renderClasses(lines: string[], artifacts: CodeMapArtifactRaw[]): void {
    if (artifacts.length === 0) { return; }
    lines.push("", "### Classes", "");
    for (const a of artifacts) {
        const parts: string[] = [`${modifiersPrefix(a)}class ${a.name}`];
        addPart(parts, "Documentation", propStr(a, "documentation"));
        addLineRange(parts, a);
        lines.push("- " + parts.join(" | "));

        const children = getChildren(a);
        if (children.length > 0) {
            renderClassChildren(lines, children);
        }
    }
}

function renderClassChildren(lines: string[], children: CodeMapArtifactRaw[]): void {
    const fields: CodeMapArtifactRaw[] = [];
    const regularFns: CodeMapArtifactRaw[] = [];
    const resourceFns: CodeMapArtifactRaw[] = [];
    const remoteFns: CodeMapArtifactRaw[] = [];

    for (const child of children) {
        if (child.type === "VARIABLE" || child.type === "FIELD") {
            fields.push(child);
        } else if (child.type === "FUNCTION") {
            const cat = propStr(child, "category").toUpperCase();
            const childMods: string[] = prop(child, "modifiers") ?? [];
            if (cat === "RESOURCE") {
                resourceFns.push(child);
            } else if (cat === "REMOTE" || childMods.includes("remote")) {
                remoteFns.push(child);
            } else {
                regularFns.push(child);
            }
        }
    }

    for (const f of fields) {
        const parts: string[] = [`${modifiersPrefix(f)}${f.name}`];
        addPart(parts, "Type", propStr(f, "type"));
        addLineRange(parts, f);
        lines.push(`  - ${parts.join(" | ")}`);
    }

    for (const fn of regularFns) {
        renderSingleFunction(lines, fn, "  ");
    }

    for (const fn of resourceFns) {
        renderSingleFunction(lines, fn, "  ", true);
    }

    for (const fn of remoteFns) {
        renderSingleFunction(lines, fn, "  ");
    }
}

function renderDataMappers(lines: string[], artifacts: CodeMapArtifactRaw[]): void {
    if (artifacts.length === 0) { return; }
    lines.push("", "### Data Mappers", "");
    for (const a of artifacts) {
        renderSingleFunction(lines, a);
    }
}

/**
 * Renders a single function artifact as one compact line.
 */
function renderSingleFunction(
    lines: string[],
    a: CodeMapArtifactRaw,
    indent: string = "",
    isResource: boolean = false
): void {
    const parts: string[] = [];

    // Title: modifiers + [accessor] + function + name
    if (isResource) {
        const accessor = propStr(a, "accessor");
        parts.push(`${accessor ? accessor + " " : ""}resource function ${a.name}`);
    } else {
        parts.push(`${modifiersPrefix(a)}function ${a.name}`);
    }

    // Parameters
    const params = parametersInline(a);
    if (params) {
        parts.push(`**Parameters**: [${params}]`);
    } else {
        parts.push("**Parameters**: none");
    }

    // Returns
    const returns = propStr(a, "returns") || "()";
    if (returns === "()") {
        parts.push("**Returns**: ()");
    } else {
        parts.push(`**Returns**: [${returns}]`);
    }

    // Documentation (optional)
    addPart(parts, "Documentation", propStr(a, "documentation"));

    // LineRange at the end
    addLineRange(parts, a);

    lines.push(`${indent}- ${parts.join(" | ")}`);
}