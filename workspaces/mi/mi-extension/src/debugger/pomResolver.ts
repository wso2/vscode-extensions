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

import * as vscode from "vscode";
import fs from "fs/promises";
import path from "path";
import { XMLParser } from "fast-xml-parser";

type Project = {
    id: string; // groupId:artifactId
    folder: string;
    dependencies: string[];
};

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: ""
});

async function fileExists(p: string) {
    try {
        await fs.access(p);
        return true;
    } catch {
        return false;
    }
}

async function parsePom(pomPath: string) {
    const xml = await fs.readFile(pomPath, "utf-8");
    const json = parser.parse(xml);

    const project = json.project;
    if (!project) {
        return null;
    }

    const groupId = project.groupId || project.parent?.groupId;
    const artifactId = project.artifactId;
    if (!groupId || !artifactId) {
        return null;
    }

    const deps = project.dependencies?.dependency || [];

    const dependencies = (Array.isArray(deps) ? deps : [deps]).map((d: any) => ({
        groupId: d.groupId,
        artifactId: d.artifactId
    }));

    return {
        id: `${groupId}:${artifactId}`,
        dependencies
    };
}

export async function getBuildOrder(folders: string[]): Promise<string[]> {
    const projects = new Map<string, Project>();
    
    const workspaceProjects = new Map<string, string>();
    const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
    for (const wsFolder of workspaceFolders) {
        const folderPath = wsFolder.uri.fsPath;
        const pomPath = path.join(folderPath, "pom.xml");
        if (!(await fileExists(pomPath))) {
            continue;
        }
        const parsed = await parsePom(pomPath);
        if (!parsed?.id) {
            continue;
        }
        workspaceProjects.set(parsed.id, folderPath);
    }

    // Scan folders and parse pom.xml files
    for (const folder of folders) {
        const pomPath = path.join(folder, "pom.xml");

        if (!(await fileExists(pomPath))) {
            continue;
        }

        const parsed = await parsePom(pomPath);
        if (!parsed?.id) {
            continue;
        }
        projects.set(parsed.id, {
            id: parsed.id,
            folder,
            dependencies: parsed.dependencies.map(
                (d: any) => `${d.groupId}:${d.artifactId}`
            )
        });
    }

    // Check for missing internal dependencies in the workspace
    for (const project of projects.values()) {
        for (const dep of project.dependencies) {
            const existsInWorkspace = workspaceProjects.has(dep);
            const selected = projects.has(dep);
            if (existsInWorkspace && !selected) {
                throw new Error(
                    `Missing internal project dependency detected: ` +
                    `${project.id} depends on ${dep}, ` +
                    `but ${dep} exists in the workspace and was not selected`
                );
            }
        }
    }

    // Filter dependencies to only include selected projects
    for (const project of projects.values()) {
        project.dependencies = project.dependencies.filter(dep =>
            projects.has(dep)
        );
    }

    // Build reverse dependency map (dependency -> dependents)
    const dependents = new Map<string, string[]>();
    for (const id of projects.keys()) {
        dependents.set(id, []);
    }

    for (const project of projects.values()) {
        for (const dep of project.dependencies) {
            dependents.get(dep)!.push(project.id);
        }
    }

    // Topological Sort
    const inDegree = new Map<string, number>();

    for (const id of projects.keys()) {
        inDegree.set(id, 0);
    }

    // Calculate inDegrees
    for (const project of projects.values()) {
        for (const _ of project.dependencies) {
            inDegree.set(project.id, inDegree.get(project.id)! + 1);
        }
    }

    const queue: string[] = [];

    for (const [id, degree] of inDegree.entries()) {
        if (degree === 0) {
            queue.push(id);
        }
    }

    const sorted: string[] = [];

    while (queue.length > 0) {
        const id = queue.shift()!;
        sorted.push(id);

        // Reduce inDegree of projects that depend on the current project
        for (const dependent of dependents.get(id)!) {
            inDegree.set(dependent, inDegree.get(dependent)! - 1);
            if (inDegree.get(dependent) === 0) {
                queue.push(dependent);
            }
        }
    }

    // Detect cyclic dependencies
    if (sorted.length !== projects.size) {
        const cycle = detectDependencyCycle(projects);
        if (cycle) {
            throw new Error(
                "Circular dependency detected:\n" +
                cycle.join(" -> ")
            );
        }
        throw new Error("Circular dependency detected between selected projects");
    }


    // Return folders in correct Maven build order
    return sorted.map(id => projects.get(id)!.folder);
}

function detectDependencyCycle(projects: Map<string, Project>): string[] | null {

    const visited = new Set<string>();
    const stack = new Set<string>();

    function dfs(current: string, path: string[]): string[] | null {
        if (stack.has(current)) {
            const cycleStartIndex = path.indexOf(current);
            return path.slice(cycleStartIndex);
        }

        if (visited.has(current)) {
            return null;
        }

        visited.add(current);
        stack.add(current);

        const project = projects.get(current);
        if (!project) return null;

        for (const dep of project.dependencies) {
            const result = dfs(dep, [...path, dep]);
            if (result) {
                return result;
            }
        }

        stack.delete(current);
        return null;
    }

    for (const id of projects.keys()) {
        const result = dfs(id, [id]);
        if (result) {
            return result;
        }
    }

    return null;
}

