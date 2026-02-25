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

import { FileStructure, ImportProjectRequest, ImportProjectResponse } from '@wso2/mi-core';
import * as fs from 'fs';
import * as path from 'path';
import * as childprocess from 'child_process';
import { parseString, Builder } from 'xml2js';
import { v4 as uuidv4 } from 'uuid';
import { dockerfileContent, rootPomXmlContent } from './templates';
import { createFolderStructure, copyDockerResources, copyMavenWrapper, removeMavenWrapper } from '.';
import { commands, Uri, window, workspace } from 'vscode';
import { extension } from '../MIExtensionContext';
import { XMLParser, XMLBuilder } from "fast-xml-parser";
import { updatePomForClassMediator, LATEST_MI_VERSION } from './onboardingUtils';
import { setJavaHomeInEnvironmentAndPath } from '../debugger/debugHelper';
import { MVN_COMMANDS } from "../constants";

enum Nature {
    MULTIMODULE,
    ESB,
    DS,
    DATASOURCE,
    CONNECTOR,
    REGISTRY,
    CLASS,
    LEGACY,
    DISTRIBUTION
}

interface ArtifactItem {
    file: string;
    path: string;
    mediaType: string;
    properties: any;
}

interface ArtifactCollection {
    directory: string;
    path: string;
    properties: any;
}

interface Dependency {
    groupId: string;
    artifactId: string;
    version: string;
}

interface Artifact {
    '@_name': string;
    '@_groupId': string;
    '@_version': string;
    '@_type': string;
    '@_serverRole': string;
    file: string;
    item: ArtifactItem | ArtifactItem[];
    collection: ArtifactCollection | ArtifactCollection[];
}

type FileInfo = {
    path: string;
    artifact: Artifact | null;
    projectType?: Nature;
};

type PomResolutionResult = {
    success: boolean;
    content?: string;
    error?: string;
};

interface ArtifactsRoot {
    artifacts: {
        artifact?: Artifact | Artifact[];
    };
}

const xmlParserOptions = {
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseAttributeValue: false,
    trimValues: true,
    parseTrueNumberOnly: false,
    arrayMode: false,
    parseTagValue: false,
    parseNodeValue: false
};

const xmlBuilderOptions = {
    ignoreAttributes: false,
    format: true,
    indentBy: '  ',
    suppressEmptyNode: true,
    suppressBooleanAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text'
};

const BACKUP_DIR = '.backup';
const SRC = 'src';
const MAIN = 'main';
const WSO2MI = 'wso2mi';
const TEST = 'test';
const RESOURCES = 'resources';
const MOCK_SERVICES = 'mock-services';
const ARTIFACTS = 'artifacts';
const REGISTRY = 'registry';
const METADATA = 'metadata';
const DATA_SOURCES = 'data-sources';
const DATA_SERVICES = 'data-services';
const CONNECTORS = 'connectors';
const MAX_PROJECTS_TO_OPEN = 5;

const SYNAPSE_TO_MI_ARTIFACT_FOLDER_MAP: Record<string, string> = {
    'api': 'apis',
    'endpoints': 'endpoints',
    'inbound-endpoints': 'inbound-endpoints',
    'local-entries': 'local-entries',
    'message-processors': 'message-processors',
    'message-stores': 'message-stores',
    'proxy-services': 'proxy-services',
    'sequences': 'sequences',
    'tasks': 'tasks',
    'templates': 'templates'
};

const OLD_MULTI_MODULE_PROJECT_NATURES = [
    'org.wso2.developerstudio.eclipse.mavenmultimodule.project.nature',
    'org.eclipse.m2e.core.maven2Nature'
];

export async function importProjects(params: ImportProjectRequest[]): Promise<ImportProjectResponse[]> {
    const responses: ImportProjectResponse[] = [];
    const allCreatedFolderUris: Uri[] = [];
    for (const param of params) {
        try {
            const createdFolderPaths = await importProject(param);
            for (const folder of createdFolderPaths) {
                responses.push({ filePath: folder.filePath });
                allCreatedFolderUris.push(Uri.file(folder.filePath));
            }
        } catch (error) {
            console.error(`Failed to import project from ${param.source}:`, error);
            responses.push({ filePath: '' });
        }
    }
    if (allCreatedFolderUris.length > 0) {
        await handleWorkspaceAfterMigration(params[0].directory, allCreatedFolderUris);
    }
    return responses;
}

export async function importProject(params: ImportProjectRequest): Promise<ImportProjectResponse[]> {
    const { source, directory, open } = params;
    const projectUri = workspace.getWorkspaceFolder(Uri.file(source))?.uri?.fsPath;
    if (!projectUri) {
        window.showErrorMessage('Please select a valid project directory');
        throw new Error('Invalid project directory');
    }

    const projectUuid = uuidv4();

    let { projectName, groupId, artifactId, version, runtimeVersion } = getProjectDetails(source);

    if (projectName && groupId && artifactId && version) {
        const destinationFolderPath = path.join(source, ".backup");
        moveFiles(source, destinationFolderPath);
        deleteEmptyFoldersInPath(source);

        const projectDirsWithType = getProjectDirectoriesWithType(destinationFolderPath);
        const projectDirToResolvedPomMap = await generateProjectDirToResolvedPomMap(destinationFolderPath);

        const createdProjectCount = await createFolderStructuresForDistributionProjects(
            destinationFolderPath,
            source,
            projectUuid,
            projectDirToResolvedPomMap,
            projectDirsWithType
        );
        // If no folder structure was created, create one in the given directory
        if (createdProjectCount == 0) {
            const folderStructure = getFolderStructure(projectName, groupId, artifactId, projectUuid, version, runtimeVersion ?? LATEST_MI_VERSION);
            await createFolderStructure(source, folderStructure);
            copyDockerResources(extension.context.asAbsolutePath(path.join('resources', 'docker-resources')), source);
            console.log("Created project structure for project: " + projectName);
        }

        const createdFolderUris = await migrateConfigs(projectUri, path.join(source, ".backup"), source, projectDirToResolvedPomMap, projectDirsWithType, createdProjectCount);

        window.showInformationMessage(`Successfully imported ${projectName} project`);

        if (createdFolderUris && createdFolderUris.length > 0) {
            return createdFolderUris.map(uri => ({ filePath: uri.fsPath }));
        } else {
            return [{ filePath: source }];
        }
    } else {
        window.showErrorMessage('Could not find the project details from the provided project: ' + source);
        return [{ filePath: "" }];
    }
}

/**
 * Creates folder structures for distribution projects found within a given destination folder path.
 *
 * This function recursively scans the specified `destinationFolderPath` for directories representing
 * distribution projects (as determined by `determineProjectType`). For each distribution project found,
 * it creates a corresponding folder structure in the specified `directory`.
 *
 * @param destinationFolderPath - The root path to scan for distribution projects.
 * @param directory - The base directory where new folder structures should be created.
 * @param projectUuid - The unique identifier for the project, used in folder structure generation.
 * @param projectDirToResolvedPomMap - A map from project directory paths to resolved POM file paths, used to extract project details.
 * @returns A promise that resolves to the number of folder structures created.
 */
async function createFolderStructuresForDistributionProjects(
    destinationFolderPath: string,
    directory: string,
    projectUuid: string,
    projectDirToResolvedPomMap: Map<string, string>,
    projectDirsWithType: { projectDir: string, projectType: Nature }[]
): Promise<number> {
    let distributionProjectCount = 0;

    for (const { projectDir, projectType } of projectDirsWithType) {
        if (projectType === Nature.DISTRIBUTION) {
            const relativeDir = path.relative(destinationFolderPath, projectDir);
            const newProjectDir = path.join(directory, relativeDir);
            try {
                fs.mkdirSync(newProjectDir, { recursive: true });
                let { projectName, groupId, artifactId, version, runtimeVersion } =
                    getProjectDetails(projectDir, projectDirToResolvedPomMap);

                if (projectName && groupId && artifactId && version) {
                    const newFolderStructure = getFolderStructure(
                        projectName,
                        groupId,
                        artifactId,
                        projectUuid,
                        version,
                        runtimeVersion ?? LATEST_MI_VERSION
                    );
                    await createFolderStructure(newProjectDir, newFolderStructure);
                    copyDockerResources(
                        extension.context.asAbsolutePath(path.join("resources", "docker-resources")),
                        newProjectDir
                    );
                    console.log("Created project structure for project: " + projectName);
                }
            } catch (err) {
                console.error(`Failed to create folder structure at ${newProjectDir}:`, err);
            }
            distributionProjectCount++;
        }
    }

    return distributionProjectCount;
}

/**
 * Generates a map that associates each project directory within a multi-module Maven project
 * to its corresponding resolved `<project>` XML content from the `pom.xml` file.
 *
 * This function temporarily copies the Maven wrapper to the specified project directory,
 * resolves the effective `pom.xml` using the Maven wrapper, and parses each `<project>` section.
 * It extracts the `build.sourceDirectory` to determine the project directory, normalizes the path,
 * and maps the cleaned directory path to the resolved project XML.
 * The Maven wrapper is removed after processing.
 *
 * @param multiModuleProjectDir - The root directory of the multi-module Maven project.
 * @returns A map where the keys are normalized project directory paths and the values are the corresponding resolved `<project>` XML strings.
 */
export async function generateProjectDirToResolvedPomMap(multiModuleProjectDir: string): Promise<Map<string, string>> {
    const projectDirToResolvedPomMap = new Map<string, string>();

    await copyMavenWrapper(extension.context.asAbsolutePath(path.join('resources', 'maven-wrapper')), multiModuleProjectDir);
    const pomResolvedResult = await getResolvedPomXmlContent(path.join(multiModuleProjectDir, 'pom.xml'));
    if (!pomResolvedResult.success) {
        await window.showWarningMessage(
            `Migration may fail: Unable to resolve the root pom.xml in ${multiModuleProjectDir}.\nError: ${pomResolvedResult.error}`,
            { modal: true }
        );
    }
    const resolvedPomContent = pomResolvedResult.content || '';

    const projectRegex = /<project [\s\S]*?<\/project>/g;
    let match;
    while ((match = projectRegex.exec(resolvedPomContent)) !== null) {
        const projectXml = match[0];
        const parser = new XMLParser({ ignoreAttributes: false });
        const parsed = parser.parse(projectXml);
        const reportingDir = parsed?.project?.build?.sourceDirectory;

        if (reportingDir) {
            let cleanedProjectDir = reportingDir;

            // Normalize path separators
            const srcMainIndex = cleanedProjectDir.lastIndexOf(`${path.sep}src${path.sep}main`);
            if (srcMainIndex !== -1) {
                cleanedProjectDir = cleanedProjectDir.substring(0, srcMainIndex);
            }
            if (process.platform === 'win32' && cleanedProjectDir[1] === ':') {
                cleanedProjectDir = cleanedProjectDir[0].toLowerCase() + cleanedProjectDir.slice(1);
            }
            projectDirToResolvedPomMap.set(cleanedProjectDir.trim(), projectXml);
        }
    }

    removeMavenWrapper(multiModuleProjectDir);
    return projectDirToResolvedPomMap;
}

/**
 * Retrieves project details (name, groupId, artifactId, version, runtimeVersion) from a pom.xml file.
 * If a resolved POM map is provided, it will use the resolved content; otherwise, it reads and parses the pom.xml file directly.
 *
 * @param filePath - Path to the project directory containing pom.xml.
 * @param projectDirToResolvedPomMap - (Optional) Map of project directory to resolved pom.xml content.
 * @returns An object with projectName, groupId, artifactId, version, and runtimeVersion.
 */
export function getProjectDetails(filePath: string, projectDirToResolvedPomMap?: Map<string, string>) {
    let projectName: string | undefined;
    let groupId: string | undefined;
    let artifactId: string | undefined;
    let version: string | undefined;
    let runtimeVersion: string | undefined;

    const pomPath = path.join(filePath, "pom.xml");

    if (fs.existsSync(pomPath)) {
        if (projectDirToResolvedPomMap && projectDirToResolvedPomMap.get(filePath)) {
            const resolvedPomContent = projectDirToResolvedPomMap.get(filePath);
            const parser = new XMLParser({ ignoreAttributes: false });
            const parsed = resolvedPomContent ? parser.parse(resolvedPomContent) : {};
            projectName = parsed?.project?.name;
            groupId = parsed?.project?.groupId;
            artifactId = parsed?.project?.artifactId;
            version = parsed?.project?.version;
            runtimeVersion = parsed?.project?.properties?.["project.runtime.version"];
        } else {
            const pomContent = fs.readFileSync(pomPath, 'utf8');
            parseString(pomContent, { explicitArray: false, ignoreAttrs: true }, (err, result) => {
                if (err) {
                    console.error('Error parsing pom.xml:', err);
                    return;
                }
                projectName = result?.project?.name;
                groupId = result?.project?.groupId;
                artifactId = result?.project?.artifactId;
                version = result?.project?.version;
                runtimeVersion = result?.project?.properties?.["project.runtime.version"];
            });
        }
    }
    return { projectName, groupId, artifactId, version, runtimeVersion };
}

/**
 * Captures the project directory from a given file path which is in ".backup" dir.
 * If filePath contains ".backup", extract the segment after the last ".backup" and keep only the next directory name
 *
 * @param filePath - The absolute or relative file path to analyze.
 * @returns The project directory path, with special handling for ".backup" directories.
 */
export function getProjectDir(filePath: string): string {
    const normalizedPath = path.normalize(filePath);
    const backupIndex = normalizedPath.lastIndexOf(BACKUP_DIR);
    if (backupIndex !== -1) {
        // Find the next path segment after ".backup"
        const afterBackup = normalizedPath.substring(backupIndex + BACKUP_DIR.length);
        const match = afterBackup.match(/[/\\]([^/\\]+)/);
        if (match && match[1]) {
            // Reconstruct the path up to and including ".backup/<nextDir>"
            return normalizedPath.substring(0, backupIndex + BACKUP_DIR.length + match[0].length);
        }
        // If nothing after .backup, just return up to .backup
        return normalizedPath.substring(0, backupIndex + BACKUP_DIR.length);
    }
    return path.dirname(normalizedPath);
}

export async function migrateConfigs(
    projectUri: string,
    source: string,
    target: string,
    projectDirToResolvedPomMap: Map<string, string>,
    projectDirsWithType: { projectDir: string, projectType: Nature }[],
    createdProjectCount: number
): Promise<Uri[]> {
    // determine the project type here
    const projectType = await determineProjectType(source);
    let hasClassMediatorModule = false;
    const createdFolderUris: Uri[] = [];

    if (projectType === Nature.MULTIMODULE) {
        const artifactIdToFileInfoMap = generateArtifactIdToFileInfoMap(projectDirToResolvedPomMap, projectDirsWithType);
        const { configToTests, configToMockServices } = generateConfigToTestAndMockServiceMaps(source, projectDirsWithType);
        const projectDirToMetaFilesMap = generateProjectDirToMetaFilesMap(projectDirsWithType);

        const allUsedDependencyIds = new Set<string>();
        for (const { projectDir, projectType } of projectDirsWithType) {
            if (projectType === Nature.DISTRIBUTION && artifactIdToFileInfoMap) {
                // Compute the relative path from source to projectDir, and map it to the target
                const relativeDir = path.relative(source, projectDir);
                const targetPath = path.join(target, relativeDir);
                const usedDepIds = await processCompositeExporterProject(
                    projectDir,
                    targetPath,
                    artifactIdToFileInfoMap,
                    configToTests,
                    configToMockServices,
                    projectDirToMetaFilesMap,
                    projectDirToResolvedPomMap
                );
                usedDepIds.forEach(depId => allUsedDependencyIds.add(depId));
                createdFolderUris.push(Uri.file(targetPath));
            }
        }
        writeUnusedFileInfos(allUsedDependencyIds, artifactIdToFileInfoMap, source)
    } else if (projectType === Nature.LEGACY) {
        const items = fs.readdirSync(source, { withFileTypes: true });
        for (const item of items) {
            if (item.isDirectory()) {
                const sourceAbsolutePath = path.join(source, item.name);
                const moduleType = await determineProjectType(path.join(source, item.name));
                if (moduleType === Nature.LEGACY) {
                    processArtifactsFolder(sourceAbsolutePath, target);
                    processMetaDataFolder(sourceAbsolutePath, target);
                    processTestsFolder(sourceAbsolutePath, target);
                }
            }
        }
    } else if (projectType === Nature.ESB || projectType === Nature.DS || projectType === Nature.DATASOURCE ||
        projectType === Nature.CONNECTOR || projectType === Nature.REGISTRY || projectType === Nature.CLASS) {
        copyConfigsToNewProjectStructure(projectType, source, target);
    }
    if (hasClassMediatorModule) {
        await updatePomForClassMediator(projectUri);
    }
    commands.executeCommand('setContext', 'MI.migrationStatus', 'done');
    return createdFolderUris;
}

/**
 * Handles workspace updates after a migration process by opening new folders or updating the workspace configuration.
 *
 * - If there is only one folder in workspace or none, and exactly one new folder was created, it opens that folder in a new window and closes the current one.
 * - If multiple folders were created or the workspace already contains multiple folders, it updates the workspace with the new folders.
 *
 * @param projectUri - The URI of the original project being migrated.
 * @param createdFolderUris - An array of URIs representing the folders created during migration.
 * @returns A promise that resolves when the workspace has been updated accordingly.
 */
async function handleWorkspaceAfterMigration(projectUri: string, createdFolderUris: Uri[]) {
    const createdProjectCount = createdFolderUris.length;
    if (!workspace.workspaceFolders || workspace.workspaceFolders.length <= 1) {
        if (createdProjectCount === 1) {
            await commands.executeCommand('workbench.action.closeWindow');
            await commands.executeCommand('vscode.openFolder', createdFolderUris[0], true);
        } else {
            await commands.executeCommand('workbench.action.closeActiveEditor');
            await updateWorkspaceWithNewFolders(projectUri, createdFolderUris);
        }
    } else {
        // If in a workspace with multiple folders, close the current open tab
        await commands.executeCommand('workbench.action.closeActiveEditor');
        await updateWorkspaceWithNewFolders(projectUri, createdFolderUris);
    }
}

/**
 * Updates the current VS Code workspace by removing the specified project folder
 * and adding any newly created folders that are not already part of the workspace.
 *
 * @param projectUri - The file system path of the current project folder to be removed from the workspace.
 * @param createdFolderUris - An array of `Uri` objects representing the newly created folders to add to the workspace.
 *
 * @remarks
 * - If any of the `createdFolderUris` are already present in the workspace, they will not be added again.
 * - If the current project folder is not found in the workspace, no folders will be removed.
 */
async function updateWorkspaceWithNewFolders(projectUri: string, createdFolderUris: Uri[]) {
    const workspaceFolders = workspace.workspaceFolders || [];
    // Check if the folders are not already part of the workspace
    const urisToAdd = createdFolderUris.filter(folderUri =>
        !workspaceFolders.some(folder => folder.uri.fsPath === folderUri.fsPath)
    );

    if (urisToAdd.length > 0) {
        // Remove the current project folder from workspaceFolders
        const currentProjectIndex = workspaceFolders.findIndex(folder => folder.uri.fsPath === projectUri);
        const foldersToAdd = urisToAdd.map(uri => ({ uri }));
        const foldersToRemove = currentProjectIndex !== -1 ? [currentProjectIndex] : [];

        workspace.updateWorkspaceFolders(
            foldersToRemove[0] ?? workspaceFolders.length,
            foldersToRemove.length,
            ...foldersToAdd
        );
    }
}

/**
 * Writes the file paths of unused files (those whose artifact IDs are not present in the set of used dependency IDs)
 * to a text file in the backup directory.
 *
 * @param allUsedDependencyIds - A set containing the artifact IDs of all dependencies that are used.
 * @param artifactIdToFileInfoMap - A map from artifact IDs to their corresponding file information.
 * @param backupDir - The directory where the output file listing unused file paths will be written.
 */
function writeUnusedFileInfos(
    allUsedDependencyIds: Set<string>,
    artifactIdToFileInfoMap: Map<string, FileInfo>,
    backupDir: string
): void {
    const unusedFilePaths: string[] = [];
    for (const [artifactId, fileInfo] of artifactIdToFileInfoMap.entries()) {
        // Only consider entries with an artifact (i.e., config files that could be selected for a composite exporter)
        if (fileInfo.artifact && !allUsedDependencyIds.has(artifactId)) {
            unusedFilePaths.push(fileInfo.path);
        }
    }
    const outputFilePath = path.join(backupDir, 'skipped-files-during-migration.txt');
    try {
        fs.writeFileSync(outputFilePath, unusedFilePaths.join('\n'), 'utf-8');
    } catch (err) {
        console.error(`Failed to write skipped files during migration to ${outputFilePath}:`, err);
    }
}

/**
 * Retrieves a list of project directories from the given source directory,
 * along with their determined project types.
 *
 * @param source - The path to the source directory containing potential project directories.
 * @param items - An array of `fs.Dirent` objects representing the contents of the source directory.
 * @returns An array of objects, each containing:
 *   - `projectDir`: The absolute path to the project directory.
 *   - `projectType`: The type of the project as determined by `determineProjectType`.
 */
function getProjectDirectoriesWithType(rootDir: string, items?: fs.Dirent[]): { projectDir: string, projectType: Nature }[] {
    const results: { projectDir: string, projectType: Nature }[] = [];

    async function traverse(dir: string) {
        const items = fs.readdirSync(dir, { withFileTypes: true });

        for (const item of items) {
            const fullPath = path.join(dir, item.name);

            if (item.isDirectory()) {
                const projectType = await determineProjectType(fullPath);
                if (projectType !== undefined) {
                    results.push({ projectDir: fullPath, projectType });
                }

                // Recursively check subdirectories
                traverse(fullPath);
            }
        }
    }

    traverse(rootDir);
    return results;
}

/**
 * Generates a map from artifact identifiers to their corresponding file information for a given source directory.
 *
 * This function scans the provided source directory and its items to identify project directories.
 * For each project directory, it attempts to resolve a unique project identifier (artifactId) using the provided
 * `projectDirToResolvedPom` map. It also parses any `artifact.xml` files found within the project directories to
 * extract artifact information. Each artifact's identifier is mapped to its associated file information.
 *
 * @param source - The root directory to scan for project directories and artifacts.
 * @param items - The list of directory entries (files and folders) within the source directory.
 * @param projectDirToResolvedPom - A map that associates project directories with their resolved POM XML content.
 * @returns A map where each key is an artifact identifier (string) and each value is the corresponding file information.
 */
function generateArtifactIdToFileInfoMap(
    projectDirToResolvedPom: Map<string, string>,
    projectDirsWithType: { projectDir: string, projectType: Nature }[]
): Map<string, FileInfo> {
    const artifactIdToFileInfoMap = new Map<string, FileInfo>();

    projectDirsWithType.forEach(({ projectDir, projectType }) => {
        const projectId = getPomIdentifier(projectDir, projectDirToResolvedPom);
        if (projectId) {
            artifactIdToFileInfoMap.set(projectId, { path: projectDir, artifact: null, projectType });
        }

        // Try to get the artifacts from artifact.xml if it exists
        const artifactXmlPath = path.join(projectDir, 'artifact.xml');
        if (fs.existsSync(artifactXmlPath)) {
            const xml = parseArtifactsXmlFile(artifactXmlPath);
            if (xml.artifacts?.artifact) {
                const artifacts = normalizeArtifacts(xml.artifacts.artifact);
                artifacts.forEach((artifact) => {
                    const artifactId = getPomIdentifierStr(
                        artifact['@_groupId'],
                        artifact['@_name'],
                        artifact['@_version']
                    );
                    const fileInfo = getFileInfoForArtifact(artifact, projectDir, projectType);
                    if (fileInfo) {
                        artifactIdToFileInfoMap.set(artifactId, fileInfo);
                    }
                });
            }
        }
    });

    return artifactIdToFileInfoMap;
}

/**
 * Generates mappings from config files to their associated test files and mock service files.
 *
 * @param source - The root project directory.
 * @param items - Array of fs.Dirent representing directories in the project.
 * @returns An object with two maps:
 *   - configToTests: Map<string, string[]> mapping config file path to its test file paths.
 *   - configToMockServices: Map<string, string[]> mapping config file path to its mock service file paths.
 */
function generateConfigToTestAndMockServiceMaps(
    source: string,
    projectDirsWithType: { projectDir: string, projectType: Nature }[]
): {
    configToTests: Map<string, string[]>,
    configToMockServices: Map<string, string[]>
} {
    const configToTests = new Map<string, string[]>();
    const configToMockServices = new Map<string, string[]>();

    projectDirsWithType.forEach(({ projectDir, projectType }) => {
        if (projectType !== Nature.ESB) return;
        const testDir = path.join(projectDir, TEST);
        if (!fs.existsSync(testDir) || !fs.statSync(testDir).isDirectory()) return;
        const testFiles = fs.readdirSync(testDir)
            .filter(f => f.endsWith('.xml'))
            .map(f => path.join(testDir, f));
        for (const testFile of testFiles) {
            const fileContent = fs.readFileSync(testFile, 'utf-8');
            let testArtifact: string | undefined;
            let mockServices: string[] = [];
            parseString(fileContent, { explicitArray: false, ignoreAttrs: false }, (err, result) => {
                if (err) return;
                testArtifact = result?.['unit-test']?.artifacts?.['test-artifact']?.artifact;
                const mocks = result?.['unit-test']?.['mock-services']?.['mock-service'];
                if (mocks) {
                    mockServices = Array.isArray(mocks) ? mocks : [mocks];
                }
            });
            if (testArtifact) {
                // Split with '/' because testArtifact uses forward slashes regardless of OS.
                const configFile = path.join(source, ...testArtifact.split('/'));
                if (!configToTests.has(configFile)) configToTests.set(configFile, []);
                configToTests.get(configFile)!.push(testFile);
                if (!configToMockServices.has(configFile)) configToMockServices.set(configFile, []);
                for (const mockService of mockServices) {
                    // mockService starts with "/<multi-module-dir>/<project-dir>/...", so we get substring from the second slash
                    const firstSlash = mockService.indexOf('/');
                    const secondSlash = mockService.indexOf('/', firstSlash + 1);
                    let relativeMockServicePath = mockService;
                    if (secondSlash !== -1) {
                        relativeMockServicePath = mockService.substring(secondSlash);
                    }
                    // Split by '/' because relativeMockServicePath uses forward slashes regardless of OS
                    const absoluteMockServicePath = path.join(source, ...relativeMockServicePath.split('/'));
                    configToMockServices.get(configFile)!.push(absoluteMockServicePath);
                }
            }
        }
    });
    return { configToTests, configToMockServices };
}

/**
 * Generates a map where the key is the project directory and the value is an array of files in its metadata directory.
 *
 * @param source - The root directory containing project subdirectories.
 * @param items - Array of fs.Dirent representing directories in the source.
 * @returns Map<string, string[]> where key is projectDir and value is array of absolute file paths in metadata dir.
 */
function generateProjectDirToMetaFilesMap(projectDirsWithType: { projectDir: string, projectType: Nature }[]): Map<string, string[]> {
    const metaDataMap = new Map<string, string[]>();
    projectDirsWithType.forEach(({ projectDir, projectType }) => {
        if (projectType === Nature.ESB) {
            const metadataDir = path.join(projectDir, SRC, MAIN, RESOURCES, METADATA);
            if (fs.existsSync(metadataDir) && fs.statSync(metadataDir).isDirectory()) {
                const files = fs.readdirSync(metadataDir)
                    .filter(file => fs.statSync(path.join(metadataDir, file)).isFile())
                    .map(file => path.join(metadataDir, file));
                metaDataMap.set(projectDir, files);
            }
        }
    });
    return metaDataMap;
}

/**
 * Returns a normalized, joined path from a base path and a relative (or mixed-format) path.
 *
 * @param basePath - The base directory path (absolute or relative)
 * @param relativePath - A relative path that may contain mixed separators
 * @returns A normalized, platform-safe full path
 */
function getNormalizedPath(basePath: string, relativePath: string): string {
    if (!relativePath) return basePath;

    // Ensure separators are consistent before normalizing
    const cleanedRelativePath = path.normalize(relativePath.replace(/\\/g, '/'));
    return path.join(basePath, cleanedRelativePath);
}

/**
 * Retrieves file information for a given artifact within a project.
 *
 * This function attempts to resolve the file or directory path associated with the provided artifact,
 * based on its structure (`file`, `item`, or `collection`). It checks for the existence of the resolved
 * path and, if found, returns a `FileInfo` object containing the path, artifact, and project type.
 *
 * @param artifact - The artifact object which may contain a file, item, or collection property.
 * @param projectFilePath - The root file path of the project to resolve artifact paths against.
 * @param projectType - The type of the project, or `undefined` if not specified.
 * @returns A `FileInfo` object if a valid file or directory is found, otherwise `null`.
 */
function getFileInfoForArtifact(
    artifact: Artifact,
    projectFilePath: string,
    projectType: Nature | undefined
): FileInfo | null {
    if (artifact.file) {
        const artifactFilePath = getNormalizedPath(projectFilePath, artifact.file);
        if (fs.existsSync(artifactFilePath)) {
            return { path: artifactFilePath, artifact, projectType };
        }
    } else if (artifact.item) {
        // artifact.item can be an array or a single object
        const items = Array.isArray(artifact.item) ? artifact.item : [artifact.item];
        const firstItem = items[0];
        if (firstItem && firstItem.file) {
            const artifactFilePath = getNormalizedPath(projectFilePath, firstItem.file);
            if (fs.existsSync(artifactFilePath)) {
                return { path: artifactFilePath, artifact, projectType };
            }
        }
    } else if (artifact.collection) {
        // artifact.collection can be an array or a single object
        const collections = Array.isArray(artifact.collection) ? artifact.collection : [artifact.collection];
        const firstCollection = collections[0];
        if (firstCollection && firstCollection.directory) {
            const artifactPath =  getNormalizedPath(projectFilePath, firstCollection.directory);
            if (fs.existsSync(artifactPath)) {
                return { path: artifactPath, artifact, projectType };
            }
        }
    }
    return null;
}

function getPomIdentifierStr(groupId: string, artifactId: string, version: string): string {
    return `${groupId}:${artifactId}:${version}`;
}

/**
 * Extracts the XML content of a Maven `<project>` element from the given output string.
 *
 * Searches for the first occurrence of `<project` and the last occurrence of `</project>`,
 * and returns the substring containing the entire `<project>...</project>` XML block.
 * If the tags are not found, returns `null`.
 *
 * @param output - The string output (typically from a Maven command) to search for XML content.
 * @returns The extracted XML string if found, or `null` if no `<project>` block is present.
 */
function extractXmlFromMavenOutput(output: string): string | null {
    const start = output.indexOf('<project');
    const end = output.lastIndexOf('</project>');

    if (start === -1 || end === -1) {
        return null; // XML not found
    }

    // +10 to include length of '</project>'
    return output.substring(start, end + 10);
}

/**
 * Executes the Maven `help:effective-pom` goal on the specified `pom.xml` file and returns the resolved effective POM XML content as a string.
 *
 * This function spawns a Maven process in the directory of the provided POM file, capturing its output.
 * It extracts the effective POM XML from the Maven output.
 * If the Maven process fails or the output does not contain valid XML, an empty string is returned.
 *
 * @param pomFilePath - The absolute path to the `pom.xml` file for which to resolve the effective POM.
 * @returns A promise that resolves to the effective POM XML content as a string, or an empty string if extraction fails.
 */
export async function getResolvedPomXmlContent(pomFilePath: string): Promise<PomResolutionResult> {
    const pomDir = path.dirname(pomFilePath);
    const config = workspace.getConfiguration('MI', Uri.file(pomDir));
    const mvnCmd = config.get("useLocalMaven") ? "mvn" : (process.platform === "win32" ?
        MVN_COMMANDS.MVN_WRAPPER_WIN_COMMAND : MVN_COMMANDS.MVN_WRAPPER_COMMAND);
    const command = `${mvnCmd} -f "${pomFilePath}" ${MVN_COMMANDS.GEN_POM_COMMAND}`;
    console.log(`Running command: ${command} in directory: ${pomDir}`);

    return new Promise((resolve, reject) => {
        let output = '';
        let errorOutput = '';

        const child = childprocess.spawn(command, [], {
            cwd: pomDir,
            shell: true,
            env: {
                ...process.env,
                ...setJavaHomeInEnvironmentAndPath(pomDir)
            }
        });

        child.stdout.on('data', (data) => {
            output += data.toString();
        });

        child.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        child.on('close', (code) => {
            if (code === 0) {
                const xmlContent = extractXmlFromMavenOutput(output);
                if (!xmlContent) {
                    console.warn(`Output of 'mvn help:effective-pom -f ${pomFilePath}' might be corrupted.`);
                    const warnMsg = `Failed to obtain effective-pom for '${pomFilePath}'. The obtained effective pom might be corrupted.`;
                    resolve({ success: false, error: warnMsg });
                } else {
                    resolve({ success: true, content: xmlContent });
                }
            } else {
                console.error(`Failed to run 'mvn help:effective-pom -f ${pomFilePath}'. Exit code: ${code}\n${errorOutput}`);
                const errMsg = `Failed to obtain effective-pom for '${pomFilePath}'. Exit code: ${code}\n${errorOutput}`;
                resolve({ success: false, error: errMsg });
            }
        });

        child.on('error', (err) => {
            console.error(`Failed to run 'mvn help:effective-pom -f ${pomFilePath}'`, err);
            const errMsg = `Failed to obtain effective-pom for '${pomFilePath}': ${err.message}`;
            resolve({ success: false, error: errMsg });
        });
    });
}

/**
 * Retrieves the Maven POM identifier (in the format `groupId:artifactId:version`) for a given project directory.
 *
 * This function checks if a `pom.xml` file exists in the specified project directory. If it exists,
 * it attempts to parse the resolved POM content (provided in the `projectDirToResolvedPom` map) to extract
 * the `groupId`, `artifactId`, and `version` from the effective POM XML. If all three values are found,
 * it returns them as a colon-separated string. If any value is missing or the POM file does not exist,
 * the function returns `null`.
 *
 * @param projectDir - The absolute path to the project directory containing the `pom.xml` file.
 * @param projectDirToResolvedPom - A map from project directory paths to their resolved POM XML content.
 * @returns The Maven POM identifier as a string (`groupId:artifactId:version`), or `null` if not found.
 */
function getPomIdentifier(projectDir: string, projectDirToResolvedPom: Map<string, string>): string | null {
    const projectPomFilePath = path.join(projectDir, 'pom.xml');
    if (!fs.existsSync(projectPomFilePath)) {
        return null;
    }

    const resolvedPomContent = projectDirToResolvedPom.get(projectDir);
    if (resolvedPomContent) {
        // Parse the effective POM XML output
        const parser = new XMLParser({ ignoreAttributes: false });
        const parsed = parser.parse(resolvedPomContent);

        const groupId = parsed?.project?.groupId;
        const artifactId = parsed?.project?.artifactId;
        const version = parsed?.project?.version;

        if (groupId && artifactId && version) {
            return `${groupId}:${artifactId}:${version}`;
        }
    }

    return null;
}

function getFolderStructure(
    projectName: string,
    groupId: string,
    artifactId: string,
    projectUuid: string,
    version: string,
    runtimeVersion: string | undefined
): FileStructure {
    return {
        'pom.xml': rootPomXmlContent(projectName, groupId, artifactId, projectUuid, version, runtimeVersion ?? LATEST_MI_VERSION, ""),
        '.env': '',
        'src': {
            'main': {
                'java': '',
                'wso2mi': {
                    'artifacts': {
                        'apis': '',
                        'endpoints': '',
                        'inbound-endpoints': '',
                        'local-entries': '',
                        'message-processors': '',
                        'message-stores': '',
                        'proxy-services': '',
                        'sequences': '',
                        'tasks': '',
                        'templates': '',
                        'data-services': '',
                        'data-sources': '',
                    },
                    'resources': {
                        'registry': {
                            'gov': '',
                            'conf': '',
                        },
                        'metadata': '',
                        'connectors': '',
                        'conf': {
                            'config.properties': ''
                        }
                    },
                },
            },
            'test': {
                'wso2mi': '',
                'resources': {
                    "mock-services": '',
                }
            }
        },
        'deployment': {
            'docker': {
                'Dockerfile': dockerfileContent(),
                'resources': ''
            },
            'libs': '',
        },
    };
}

async function determineProjectType(source: string): Promise<Nature | undefined> {
    const rootMetaDataFilePath = path.join(source, '.project');
    const rootPomFilePath = path.join(source, 'pom.xml');
    let configType;
    // Try reading from .project file
    if (fs.existsSync(rootMetaDataFilePath)) {
        configType = await getNatureFromProjectFile(rootMetaDataFilePath);
    } 
    // If not found OR it is LEGACY, fallback to pom.xml
    if ((!configType || configType === Nature.LEGACY) && fs.existsSync(rootPomFilePath)) {
        const pomContent = fs.readFileSync(rootPomFilePath, 'utf-8');
        const fetchedNatureStr = await extractNatureFromPomContent(pomContent);
        configType = getNatureFromString(fetchedNatureStr);
    }
    return configType;
}

/**
 * Extracts the {@link Nature} from a `.project` file.
 *
 * If multiple natures are present, the method selects the one that starts
 * with "org.wso2.developerstudio.eclipse".
 *
 * @param projectFilePath Absolute path to the `.project` file.
 * @returns A resolved {@link Nature} if a valid nature is found,
 *          otherwise `undefined`.
 */
async function getNatureFromProjectFile(projectFilePath: string): Promise<Nature | undefined> {
    const projectFileContent = fs.readFileSync(projectFilePath, 'utf-8');
    const result = await new Promise<any>((resolve) => {
        parseString(projectFileContent, { explicitArray: false, ignoreAttrs: true }, (err, result) => {
            if (err) {
                console.error('Error occurred while reading ' + projectFilePath, err);
                resolve('');
            } else {
                resolve(result);
            }
        });
    });
    if (result && result.projectDescription) {
        const projectDescription = result.projectDescription;
        if (projectDescription && projectDescription.natures && projectDescription.natures.nature) {
            let nature = projectDescription.natures.nature;
            if (Array.isArray(nature)) {
                nature = nature.find(element => element.startsWith("org.wso2.developerstudio.eclipse"));
            }
            return getNatureFromString(nature);
        }
    }
    return undefined;
}

function getNatureFromString(nature: string | undefined): Nature | undefined {
    switch (nature) {
        case 'org.wso2.developerstudio.eclipse.mavenmultimodule.project.nature':
            return Nature.MULTIMODULE;
        case 'org.wso2.developerstudio.eclipse.esb.project.nature':
            return Nature.ESB;
        case 'org.wso2.developerstudio.eclipse.ds.project.nature':
            return Nature.DS;
        case 'org.wso2.developerstudio.eclipse.datasource.project.nature':
            return Nature.DATASOURCE;
        case 'org.wso2.developerstudio.eclipse.artifact.connector.project.nature':
            return Nature.CONNECTOR;
        case 'org.wso2.developerstudio.eclipse.general.project.nature':
            return Nature.REGISTRY;
        case 'org.wso2.developerstudio.eclipse.artifact.mediator.project.nature':
            return Nature.CLASS;
        case 'org.eclipse.m2e.core.maven2Nature':
            return Nature.LEGACY;
        case 'org.wso2.developerstudio.eclipse.distribution.project.nature':
            return Nature.DISTRIBUTION;
        default:
            return undefined;
    }
}

function copyConfigToNewProjectStructure(sourceFileInfo: FileInfo, target: string) {
    switch (sourceFileInfo.projectType) {
        case Nature.ESB:
            const artifactType = getArtifactType(sourceFileInfo.path);
            const subDir = SYNAPSE_TO_MI_ARTIFACT_FOLDER_MAP[artifactType ?? ''];
            if (subDir) {
                copyArtifactFileToTargetDir(sourceFileInfo.path, path.join(target, SRC, MAIN, WSO2MI, ARTIFACTS, subDir));
            }
            break;
        case Nature.DATASOURCE:
            copyArtifactFileToTargetDir(sourceFileInfo.path, path.join(target, SRC, MAIN, WSO2MI, ARTIFACTS, DATA_SOURCES));
            break;
        case Nature.DS:
            copyArtifactFileToTargetDir(sourceFileInfo.path, path.join(target, SRC, MAIN, WSO2MI, ARTIFACTS, DATA_SERVICES));
            break;
        case Nature.CONNECTOR:
            copyArtifactFileToTargetDir(sourceFileInfo.path, path.join(target, SRC, MAIN, WSO2MI, RESOURCES, CONNECTORS));
            break;
        case Nature.REGISTRY:
            copyRegistryFile(sourceFileInfo, target);
            break;
        case Nature.CLASS:
            processClassMediators(sourceFileInfo.path, target);
            break;
    }
}

function copyConfigsToNewProjectStructure(nature: Nature, source: string, target: string) {
    switch (nature) {
        case Nature.ESB:
            processArtifactsFolder(source, target);
            processMetaDataFolder(source, target);
            processTestsFolder(source, target);
            break;
        case Nature.DATASOURCE:
            processDataSourcesFolder(source, target);
            break;
        case Nature.DS:
            processDataServicesFolder(source, target);
            break;
        case Nature.CONNECTOR:
            processConnectors(source, target);
            break;
        case Nature.REGISTRY:
            processRegistryResources(source, target);
            break;
        case Nature.CLASS:
            processClassMediators(source, target);
            break;
    }
}

/**
 * Extracts the artifact type (e.g., 'api', 'sequences', 'endpoints') from a given Synapse config file path.
 *
 * @param sourceFilePath Full file path to the artifact.
 * @returns The artifact folder name under synapse-config (e.g., 'api').
 */
export function getArtifactType(sourceFilePath: string): string | null {
    const normalizedPath = path.normalize(sourceFilePath);
    const parts = normalizedPath.split(path.sep);

    const synapseIndex = parts.indexOf('synapse-config');
    if (synapseIndex !== -1 && parts.length > synapseIndex + 1) {
        return parts[synapseIndex + 1];  // The folder name immediately under synapse-config
    }

    return null; // If synapse-config not found or no folder under it
}

function processArtifactsFolder(source: string, target: string) {
    const synapseConfigsPath = path.join(source, 'src', 'main', 'synapse-config');
    const artifactsPath = path.join(target, 'src', 'main', 'wso2mi', 'artifacts');
    const sourceFolders = [
        'api',
        'endpoints',
        'inbound-endpoints',
        'local-entries',
        'message-processors',
        'message-stores',
        'proxy-services',
        'sequences',
        'tasks',
        'templates',
    ];
    const targetFolders = [
        'apis',
        'endpoints',
        'inbound-endpoints',
        'local-entries',
        'message-processors',
        'message-stores',
        'proxy-services',
        'sequences',
        'tasks',
        'templates',
    ];

    sourceFolders.forEach((sourceFolder, index) => {
        const sourcePath = path.join(synapseConfigsPath, sourceFolder);
        const targetPath = path.join(artifactsPath, targetFolders[index]);

        copy(sourcePath, targetPath);
    });

}

/**
 * Copies metadata files associated with the given configuration files to a target directory.
 *
 * For each configuration file in `configFiles`, this function:
 * - Determines the project directory using `getProjectDir`.
 * - Retrieves the list of metadata files for that project from `projectDirToMetaFilesMap`.
 * - For each metadata file whose basename starts with the configuration file's name,
 *   copies it to the destination metadata directory under `targetDir`.
 *
 * @param configFiles - An array of absolute paths to configuration files.
 * @param targetDir - The base directory where metadata files should be copied.
 * @param projectDirToMetaFilesMap - A map from project directory paths to arrays of metadata file paths.
 */
function copyConfigMetaData(configFiles: string[], targetDir: string, projectDirToMetaFilesMap: Map<string, string[]>) {
    const destDir = path.join(targetDir, SRC, MAIN, WSO2MI, RESOURCES, METADATA);
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }
    for (const configFile of configFiles) {
        const projectDir = getProjectDir(configFile);
        const metaFiles = projectDirToMetaFilesMap.get(projectDir) || [];
        const configFileName = path.basename(configFile, path.extname(configFile));
        metaFiles.forEach(metaFile => {
            if (path.basename(metaFile).startsWith(configFileName)) {
                const destFile = path.join(destDir, path.basename(metaFile));
                copyFile(metaFile, destFile);
            }
        });
    }
}

/**
 * Copies test files and mock service files associated with the given configuration files
 * into their respective target directories within the specified target directory.
 *
 * @param configFiles - An array of configuration file paths for which associated test and mock service files should be copied.
 * @param targetDir - The root directory where the test and mock service files should be copied to.
 * @param configToTests - A map associating each configuration file path with an array of test file paths to be copied.
 * @param configToMockServices - A map associating each configuration file path with an array of mock service file paths to be copied.
 */
function copyConfigTests(
    configFiles: string[],
    targetDir: string,
    configToTests: Map<string, string[]>,
    configToMockServices: Map<string, string[]>
) {
    const testTargetDir = path.join(targetDir, SRC, TEST, WSO2MI);
    const mockServicesTargetDir = path.join(targetDir, SRC, TEST, RESOURCES, MOCK_SERVICES);

    if (!fs.existsSync(testTargetDir)) {
        fs.mkdirSync(testTargetDir, { recursive: true });
    }
    if (!fs.existsSync(mockServicesTargetDir)) {
        fs.mkdirSync(mockServicesTargetDir, { recursive: true });
    }

    for (const configFile of configFiles) {
        const testFiles = configToTests.get(configFile) || [];
        for (const testFile of testFiles) {
            const fileName = path.basename(testFile);
            copyFile(testFile, path.join(testTargetDir, fileName));
        }

        const mockServiceFiles = configToMockServices.get(configFile) || [];
        for (const mockServiceFile of mockServiceFiles) {
            const fileName = path.basename(mockServiceFile);
            copyFile(mockServiceFile, path.join(mockServicesTargetDir, fileName));
        }
    }
}

function processMetaDataFolder(source: string, target: string) {
    const oldMetaDataPath = path.join(source, 'src', 'main', 'resources', 'metadata');
    const newMetaDataPath = path.join(target, 'src', 'main', 'wso2mi', 'resources', 'metadata');

    copy(oldMetaDataPath, newMetaDataPath);
}

/**
 * Copies a single artifact file to a specific subdirectory under the target project's artifacts directory.
 * @param sourceFilePath - The absolute path to the source artifact file.
 * @param targetProjectDir - The root directory of the target project.
 * @param artifactSubDir - The subdirectory under 'artifacts' (e.g., 'data-sources', 'data-services').
 */
function copyArtifactFileToTargetDir(sourceFilePath: string, targetDir: string) {
    if (!fs.statSync(sourceFilePath).isDirectory()) {
        const fileName = path.basename(sourceFilePath);
        copyFile(sourceFilePath, path.join(targetDir, fileName));
    }
}

function processDataSourcesFolder(source: string, target: string) {
    const oldDataSourcePath = path.join(source, 'datasource');
    const newDataSourcePath = path.join(target, 'src', 'main', 'wso2mi', 'artifacts', 'data-sources');

    copy(oldDataSourcePath, newDataSourcePath);
}

function processDataServicesFolder(source: string, target: string) {
    const oldDataServicePath = path.join(source, 'dataservice');
    const newDataServicePath = path.join(target, 'src', 'main', 'wso2mi', 'artifacts', 'data-services');

    copy(oldDataServicePath, newDataServicePath);
}

function processConnectors(source: string, target: string) {
    const newConnectorPath = path.join(target, 'src', 'main', 'wso2mi', 'resources', 'connectors');

    fs.readdir(source, { withFileTypes: true }, (err, files) => {
        if (err) {
            console.error(`Failed to list contents of the folder: ${source}`, err);
            return;
        }

        files.forEach(file => {
            if (file.isFile()) {
                if (path.extname(file.name).toLowerCase() === '.zip') {
                    copyFile(path.join(source, file.name), path.join(newConnectorPath, file.name));
                }
            }
        });
    });
}

/**
 * Ensures that an `artifact.xml` file exists at the specified registry path.
 * If the file does not exist, it creates a new `artifact.xml` file with a default XML structure.
 *
 * @param registryPath - The path to the registry directory where `artifact.xml` should exist.
 * @returns The full path to the `artifact.xml` file.
 */
function ensureArtifactXmlExists(registryPath: string): string {
    const artifactXmlPath = path.join(registryPath, 'artifact.xml');

    if (!fs.existsSync(artifactXmlPath)) {
        const artifactXmlContent = '<?xml version="1.0" encoding="UTF-8"?><artifacts></artifacts>';
        fs.writeFileSync(artifactXmlPath, artifactXmlContent, 'utf-8');
    }

    return artifactXmlPath;
}

/**
 * Reads and parses an XML file containing artifact definitions, returning the result as an `ArtifactsRoot` object.
 *
 * @param filePath - The path to the XML file to be parsed.
 * @returns The parsed `ArtifactsRoot` object, or an object with an empty `artifacts` property if parsing fails.
 */
function parseArtifactsXmlFile(filePath: string): ArtifactsRoot {
    try {
        const xmlContent = fs.readFileSync(filePath, 'utf-8');
        const parser = new XMLParser(xmlParserOptions);
        const result = parser.parse(xmlContent);

        // Normalize structure so result.artifacts.artifact is always an array
        if (!result.artifacts || typeof result.artifacts === 'string') {
            result.artifacts = {};
        }
        if (!result.artifacts.artifact) {
            result.artifacts.artifact = [];
        } else if (!Array.isArray(result.artifacts.artifact)) {
            result.artifacts.artifact = [result.artifacts.artifact];
        }

        return result as ArtifactsRoot;
    } catch (error) {
        console.error(`Failed to parse XML file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return {
            artifacts: { artifact: [] }
        };
    }
}

/**
 * Normalizes the input artifact data to always return an array of `Artifact` objects.
 *
 * If the input is `null` or `undefined`, returns an empty array.
 * If the input is already an array, returns it as-is.
 * If the input is a single object, wraps it in an array.
 *
 * @param artifactsData - The artifact data to normalize, which can be an array, a single object, or null/undefined.
 * @returns An array of `Artifact` objects.
 */
function normalizeArtifacts(artifactsData: any): Artifact[] {
    if (!artifactsData) return [];
    return Array.isArray(artifactsData) ? artifactsData : [artifactsData];
}

/**
 * Writes the updated artifact XML to the specified file path.
 *
 * This function serializes the provided `artifactsRoot` object into XML format
 * using the configured XML builder, and writes the resulting XML string to the
 * file at `filePath`. If an error occurs during the process, it logs an error
 * message to the console.
 *
 * @param filePath - The path to the file where the updated XML should be written.
 * @param artifactsRoot - The root object representing the artifacts to be serialized into XML.
 */
function writeUpdatedArtifactXml(filePath: string, artifactsRoot: ArtifactsRoot): void {
    try {
        const builder = new XMLBuilder(xmlBuilderOptions);
        const updatedXml = builder.build(artifactsRoot);
        fs.writeFileSync(filePath, updatedXml, 'utf-8');
    } catch (error) {
        console.error(`Failed to write XML file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Copies a registry file or collection from the source location to the target project's registry directory.
 *
 * This function determines whether the provided `sourceFileInfo` contains an artifact of type `item` or `collection`.
 * - If the artifact is an `item`, it copies the file to the appropriate target directory, preserving the relative path.
 * - If the artifact is a `collection`, it copies the entire collection directory to the target location.
 * The function creates any necessary directories in the target path.
 *
 * @param sourceFileInfo - Information about the source file, including its path and artifact metadata.
 * @param targetProjectDir - The root directory of the target project where the registry file or collection should be copied.
 *
 * @remarks
 * - Logs an error if the artifact does not contain an `item` or `collection`.
 * - Logs an error if the copy operation fails.
 */
function copyRegistryFile(sourceFileInfo: FileInfo, targetProjectDir: string): void {
    const registryPath = path.join(targetProjectDir, SRC, MAIN, WSO2MI, RESOURCES, REGISTRY);
    try {
        const artifact = sourceFileInfo.artifact;
        if (artifact) {
            if (artifact.item) {
                const items = Array.isArray(artifact.item) ? artifact.item : [artifact.item];
                const firstItem = items[0];
                const relativePath = firstItem.path;
                const targetDir = resolveRegistryTargetPath(relativePath, registryPath);
                const targetFile = path.join(targetDir, firstItem.file.split('/').pop()!);
                fs.mkdirSync(targetDir, { recursive: true });
                copyFile(sourceFileInfo.path, targetFile);
            } else if (artifact.collection) {
                const collections = Array.isArray(artifact.collection) ? artifact.collection : [artifact.collection];
                const firstCollection = collections[0];
                const relativePath = firstCollection.path;
                const targetDir = resolveRegistryTargetPath(relativePath, registryPath);
                fs.mkdirSync(targetDir, { recursive: true });
                copy(sourceFileInfo.path, targetDir);
            } else {
                console.error('Artifact does not have item or collection for registry resource.');
            }
        }
    } catch (error) {
        console.error(`Failed to copy registry file: ${error instanceof Error ? error.message : error}`);
    }
}

/**
 * Resolves a target path within the registry directory based on a given relative path.
 *
 * This function maps specific system paths to their corresponding directories:
 * - Paths starting with `/_system/governance` are mapped to the `gov` directory.
 * - Paths starting with `/_system/config` are mapped to the `conf` directory.
 * - All other paths are used as-is under the registry directory.
 *
 * @param relativePath - The relative path to resolve, typically starting with a system prefix.
 * @param registryPath - The base path of the registry directory.
 * @returns The resolved absolute path within the registry directory.
 */
function resolveRegistryTargetPath(relativePath: string, registryPath: string): string {
    if (relativePath.startsWith('/_system/governance')) {
        return path.join(registryPath, path.normalize(relativePath.replace(/^\/_system\/governance/, 'gov')));
    } else if (relativePath.startsWith('/_system/config')) {
        return path.join(registryPath, path.normalize(relativePath.replace(/^\/_system\/config/, 'conf')));
    } else {
        // For other paths, use them as-is under registry directory
        return path.join(registryPath, path.normalize(relativePath));
    }
}

/**
 * Updates the `artifact.xml` file in the registry resources directory of the given project
 * by adding the provided artifacts to it.
 *
 * This function ensures that the `artifact.xml` file exists, parses its contents,
 * processes each new artifact, and appends them to the existing list of artifacts.
 * Finally, it writes the updated XML back to disk.
 *
 * @param projectDir - The root directory of the project where the registry artifacts are located.
 * @param artifacts - An array of `Artifact` objects to be added to the `artifact.xml`.
 */
function updateRegistryArtifactXml(projectDir: string, artifacts: Artifact[]) {
    const targetRegistryPath = path.join(projectDir, SRC, MAIN, WSO2MI, RESOURCES, REGISTRY);
    if (!fs.existsSync(targetRegistryPath)) {
        fs.mkdirSync(targetRegistryPath, { recursive: true });
    }
    const targetArtifactXmlPath = ensureArtifactXmlExists(targetRegistryPath);
    const targetXml = parseArtifactsXmlFile(targetArtifactXmlPath);

    // Process and add new artifacts
    artifacts.forEach(artifact => {
        processArtifactForWrite(artifact);
        (targetXml.artifacts.artifact as Artifact[]).push(artifact);
    });

    writeUpdatedArtifactXml(targetArtifactXmlPath, targetXml);
}

/**
 * Processes an `Artifact` object to prepare its file and directory paths for writing.
 *
 * - For `artifact.item` (or array of items), it modifies the `file` property by extracting only the filename
 *   (removing any preceding directory paths).
 * - For `artifact.collection` (or array of collections), it modifies:
 *   - The `directory` property by extracting only the last directory name.
 *   - The `path` property by removing the last segment
 *
 * The function mutates the input `artifact` object in place.
 *
 * @param artifact - The `Artifact` object to process. Can contain either `item` or `collection` properties.
 */
function processArtifactForWrite(artifact: Artifact): void {
    if (artifact) {
        if (artifact.item) {
            const items = Array.isArray(artifact.item) ? artifact.item : [artifact.item];
            items.forEach(item => {
                if (item.file && typeof item.file === 'string') {
                    const parts = item.file.split('/');
                    item.file = parts[parts.length - 1];
                }
            });
            artifact.item = Array.isArray(artifact.item) ? items : items[0];
        } else if (artifact.collection) {
            const collections = Array.isArray(artifact.collection) ? artifact.collection : [artifact.collection];
            collections.forEach(collection => {
                if (collection.directory && typeof collection.directory === 'string') {
                    const parts = collection.directory.split('/');
                    collection.directory = parts[parts.length - 1];
                }
            });
            artifact.collection = Array.isArray(artifact.collection) ? collections : collections[0];
        }
    }
}

function processRegistryResources(source: string, target: string) {
    const artifactXMLPath = path.join(source, 'artifact.xml');
    const newRegistryPath = path.join(target, 'src', 'main', 'wso2mi', 'resources', 'registry');

    const xmlContent = fs.readFileSync(artifactXMLPath, 'utf-8');

    parseString(xmlContent, { explicitArray: false, ignoreAttrs: false }, (err, result) => {
        if (err) {
            console.error('Error parsing pom.xml:', err);
            return;
        }

        const artifactsData = result.artifacts.artifact;
        const artifacts = Array.isArray(artifactsData) ? artifactsData : [artifactsData];

        artifacts.forEach(artifact => {
            const fileName = artifact.item.file;
            const relativePath = artifact.item.path;
            let targetAbsolutePath;

            if (relativePath.startsWith('/_system/governance')) {
                targetAbsolutePath = path.join(newRegistryPath, path.normalize(relativePath.replace(/^\/_system\/governance/, 'gov')));
            } else if (relativePath.startsWith('/_system/config')) {
                targetAbsolutePath = path.join(newRegistryPath, path.normalize(relativePath.replace(/^\/_system\/config/, 'conf')));
            }
            const sourceFile = path.join(source, ...fileName.split("/"));
            const targetFile = path.join(targetAbsolutePath, fileName.split("/").pop());
            try {
                fs.mkdirSync(targetAbsolutePath, { recursive: true });
                copyFile(sourceFile, targetFile);
                artifact.item.file = artifact.item.file.split("/").pop();
            } catch (err) {
                console.error(`Failed to create folder structure ${targetAbsolutePath}`, err);
            }
        });
        const builder = new Builder({ headless: false });
        const updatedXml = builder.buildObject(result);
        fs.writeFileSync(path.join(newRegistryPath, 'artifact.xml'), updatedXml, 'utf-8');
    });
}

function processTestsFolder(source: string, target: string) {
    const oldTestPath = path.join(source, 'test');
    const newTestPath = path.join(target, 'src', 'test', 'wso2mi');
    copy(oldTestPath, newTestPath);
    const oldResPath = path.join(oldTestPath, 'resources', 'mock-services');
    const newResPath = path.join(target, 'src', 'test', 'resources', 'mock-services');
    copy(oldResPath, newResPath);
    fixTestFilePaths(target);
}

function processClassMediators(source: string, target: string) {
    const oldClassMediatorPath = path.join(source, 'src', 'main', 'java');
    const newClassMediatorPath = path.join(target, 'src', 'main', 'java');

    copyFilesAndDirectories();

    function copyFilesAndDirectories() {
        function copyRecursive(source: string, target: string) {
            if (!fs.existsSync(source)) {
                return;
            }
            const items = fs.readdirSync(source, { withFileTypes: true });
            items.forEach(item => {
                const sourceItemPath = path.join(source, item.name);
                const targetItemPath = path.join(target, item.name);
                if (item.isDirectory()) {
                    fs.mkdirSync(targetItemPath, { recursive: true });
                    copyRecursive(sourceItemPath, targetItemPath);
                } else {
                    fs.copyFileSync(sourceItemPath, targetItemPath);
                }
            });
        }

        copyRecursive(oldClassMediatorPath, newClassMediatorPath);
    }
}

/**
 * Processes a project dependency by determining its type and copying its configuration
 * to a new project structure if applicable.
 *
 * @param depId - The identifier of the dependency to process.
 * @param sourceFileInfo - Information about the source file associated with the dependency.
 * @param target - The target directory or path for the migrated configuration.
 */
function processDependency(depId: string, sourceFileInfo: FileInfo | undefined, target: string) {
    if (!sourceFileInfo) {
        console.warn(`Dependency '${depId}' selected for the composite exporter project was not found. Skipping migration for this dependency.`);
    } else {
        if (sourceFileInfo.projectType === Nature.ESB || sourceFileInfo.projectType === Nature.DS || sourceFileInfo.projectType === Nature.DATASOURCE ||
            sourceFileInfo.projectType === Nature.CONNECTOR || sourceFileInfo.projectType === Nature.REGISTRY || sourceFileInfo.projectType === Nature.CLASS) {
            copyConfigToNewProjectStructure(sourceFileInfo, target);
        }
    }
}

/**
 * Reads and parses the dependencies from a Maven `pom.xml` file located in the specified source directory.
 *
 * This function checks for the existence of a `pom.xml` file in the given source directory.
 * If found, it retrieves the resolved POM content from the provided map, parses the XML,
 * and extracts the list of dependencies. Each dependency is returned as an object containing
 * `groupId`, `artifactId`, and `version` properties.
 *
 * @param source - The path to the source directory containing the `pom.xml` file.
 * @param projectDirToResolvedPomMap - A map that associates project directory paths with their resolved POM XML content.
 * @returns An array of `Dependency` objects representing the dependencies defined in the `pom.xml` file.
 */
function readPomDependencies(source: string, projectDirToResolvedPomMap: Map<string, string>): Dependency[] {
    const pomFilePath = path.join(source, 'pom.xml');
    if (!fs.existsSync(pomFilePath)) {
        console.error(`pom.xml file not found in the source directory: ${source}`);
        return [];
    }
    let resolvedPomContent = projectDirToResolvedPomMap.get(source) || '';
    if (!resolvedPomContent) {
        console.error(`Resolved POM content not found for the directory: ${source}`);
        // Fallback: read the pom.xml directly if resolved content is missing
        try {
            resolvedPomContent = fs.readFileSync(pomFilePath, 'utf-8');
        } catch (err) {
            console.error(`Failed to read pom.xml from ${pomFilePath}:`, err);
            return [];
        }
    }

    const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false });
    const parsed = parser.parse(resolvedPomContent);

    const dependencies = parsed?.project?.dependencies?.dependency;
    if (!dependencies) return [];

    const dependencyList = Array.isArray(dependencies) ? dependencies : [dependencies];
    return dependencyList.map((dep: any) => ({
        groupId: dep.groupId,
        artifactId: dep.artifactId,
        version: dep.version,
    }));
}

/**
 * Extracts the first matching <projectnature> value from the given pom.xml content.
 * Assumes <projectnatures> structure always contains one or more <projectnature> elements.
 */
export function extractNatureFromPomContent(pomXmlContent: string): Promise<string | undefined> {
    return new Promise((resolve, reject) => {
        parseString(pomXmlContent, { explicitArray: false, ignoreAttrs: true }, (err, result) => {
            if (err) {
                return reject('Failed to parse pom.xml: ' + err);
            }

            const nature = findProjectNature(result);
            resolve(nature);
        });
    });
}

/**
 * Recursively searches for <projectnatures><projectnature>...</projectnature></projectnatures>
 * and returns the first matching value that starts with the expected prefix.
 */
function findProjectNature(node: any): string | undefined {
    if (typeof node !== 'object' || node === null) return undefined;

    for (const key of Object.keys(node)) {
        const value = node[key];

        if (key.toLowerCase() === 'projectnatures') {
            const natures = value.projectnature;

            if (typeof natures === 'string') {
                if (natures.startsWith('org.wso2.developerstudio.eclipse')) {
                    return natures;
                }
            } else if (Array.isArray(natures)) {
                const match = natures.find(n =>
                    typeof n === 'string' && n.startsWith('org.wso2.developerstudio.eclipse')
                );
                if (match) return match;
            }
        }

        // Recurse into nested objects
        if (typeof value === 'object') {
            const nestedResult = findProjectNature(value);
            if (nestedResult) return nestedResult;
        }
    }

    return undefined;
}

/**
 * Checks if the specified project file contains any of the old multi-module project natures.
 *
 * @param filePath - The path to the project file to check.
 * @returns A promise that resolves to `true` if the file contains any of the old multi-module project natures, otherwise `false`.
 */
export async function containsMultiModuleNatureInProjectFile(filePath: string): Promise<boolean> {
    if (!fs.existsSync(filePath)) return false;
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return OLD_MULTI_MODULE_PROJECT_NATURES.some(nature => content.includes(`<nature>${nature}</nature>`));
}

/**
 * Checks if the given POM file contains a multi-module project nature.
 *
 * Reads the specified POM file, extracts its project nature, and determines
 * whether it matches any of the known old multi-module project natures.
 *
 * @param filePath - The absolute path to the POM file to check.
 * @returns A promise that resolves to `true` if the POM file contains a multi-module nature, or `false` otherwise.
 */
export async function containsMultiModuleNatureInPomFile(filePath: string): Promise<boolean> {
    if (!fs.existsSync(filePath)) return false;
    const pomContent = await fs.promises.readFile(filePath, 'utf-8');
    const projectNature = await extractNatureFromPomContent(pomContent);
    return OLD_MULTI_MODULE_PROJECT_NATURES.includes(projectNature ?? '');
}

/**
 * Recursively searches the given workspace directory for multi-module projects.
 * 
 * A multi-module project is identified by either:
 * - A `.project` file containing multi-module nature
 * - A `pom.xml` file containing multi-module nature
 * 
 * Directories named `.backup` are skipped.
 * 
 * @param workspaceDir - The root directory of the workspace to search.
 * @returns A promise that resolves to an array of directory paths containing multi-module projects.
 */
export async function findMultiModuleProjectsInWorkspaceDir(workspaceDir: string): Promise<string[]> {
    const foundProjects: string[] = [];

    async function checkDir(dir: string) {
        if (path.basename(dir) === '.backup') {
            return; // Skip .backup directories
        }
        const projectFile = path.join(dir, '.project');
        const pomFile = path.join(dir, 'pom.xml');
        if (fs.existsSync(projectFile)) {
            if (await containsMultiModuleNatureInProjectFile(projectFile)) {
                foundProjects.push(dir);
            }
        } else if (fs.existsSync(pomFile)) {
            if (await containsMultiModuleNatureInPomFile(pomFile)) {
                foundProjects.push(dir);
            }
        } else {
            // Recurse into subdirectories
            const dirs = fs.readdirSync(dir, { withFileTypes: true });
            for (const dirent of dirs) {
                if (dirent.isDirectory()) {
                    await checkDir(path.join(dir, dirent.name));
                }
            }
        }
    }

    await checkDir(workspaceDir);
    return foundProjects;
}

/**
 * Extracts and returns a record of property key-value pairs from the given XML object.
 *
 * This function expects the XML object to have a structure where properties are located at `xml.project.properties`.
 * It trims whitespace from both keys and values, and ensures all values are returned as strings.
 *
 * @param xml - The XML object potentially containing project properties.
 * @returns A record mapping property names to their string values. Returns an empty object if no properties are found.
 */
function extractProperties(xml: any): Record<string, string> {
    const properties = xml?.project?.properties;
    if (!properties) return {};

    return Object.fromEntries(
        Object.entries(properties).map(([key, val]) => [key.trim(), String(val).trim()])
    );
}

/**
 * Processes a composite exporter (distribution) project by reading its `pom.xml` dependencies,
 * migrating each dependency's configuration to the target project, and handling special cases such as
 * class mediator modules, registry artifacts, metadata, and test/mock service files.
 *
 * For each dependency in the `pom.xml`, this function:
 * - Resolves the dependency using the provided artifactId-to-FileInfo map.
 * - Migrates the configuration based on its project type (ESB, DS, datasource, connector, registry, class).
 * - Tracks and updates class mediator modules if present.
 * - Collects registry artifacts and ESB config files for further processing.
 *
 * After processing all dependencies, it:
 * - Updates the registry artifact.xml in the target project.
 * - Copies relevant metadata and test/mock service files.
 * - Fixes test file paths in the target directory.
 * - Logs any unused files that were not included in the migration.
 *
 * @param source - The path to the source project directory containing the `pom.xml` file.
 * @param target - The path to the target project directory where updates will be applied.
 * @param artifactIdToFileInfoMap - A map of artifact IDs to their corresponding file information,
 *                                  used to resolve dependency source file paths.
 * @param configToTests - Map of config file paths to their associated test file paths.
 * @param configToMockServices - Map of config file paths to their associated mock service file paths.
 * @param projectDirToMetaFilesMap - Map of project directory paths to arrays of metadata file paths.
 * @returns A promise that resolves to an array of dependency IDs that were used in the migration.
 */
async function processCompositeExporterProject(
    source: string,
    target: string,
    artifactIdToFileInfoMap: Map<string, FileInfo>,
    configToTests: Map<string, string[]>,
    configToMockServices: Map<string, string[]>,
    projectDirToMetaFilesMap: Map<string, string[]>,
    projectDirToResolvedPomMap: Map<string, string>
): Promise<string[]> {

    const dependencies = readPomDependencies(source, projectDirToResolvedPomMap);

    let hasClassMediatorModule = false;
    let registryArtifactsList: Artifact[] = [];
    let configFiles: string[] = [];
    const usedDependencyIds: string[] = [];

    for (const dependency of dependencies) {
        const depId = getPomIdentifierStr(dependency.groupId, dependency.artifactId, dependency.version);
        const sourceFileInfo = artifactIdToFileInfoMap.get(depId);
        processDependency(depId, sourceFileInfo, target);
        if (sourceFileInfo?.projectType === Nature.CLASS) {
            hasClassMediatorModule = true;
        }
        if (sourceFileInfo?.projectType === Nature.REGISTRY && sourceFileInfo.artifact) {
            registryArtifactsList.push(sourceFileInfo.artifact);
        }
        if (sourceFileInfo?.projectType === Nature.ESB) {
            configFiles.push(sourceFileInfo.path);
        }
        usedDependencyIds.push(depId);
    }
    if (hasClassMediatorModule) {
        await updatePomForClassMediator(target);
    }
    if (registryArtifactsList.length > 0) {
        updateRegistryArtifactXml(target, registryArtifactsList);
    }
    if (configFiles.length > 0) {
        copyConfigMetaData(configFiles, target, projectDirToMetaFilesMap);
        copyConfigTests(configFiles, target, configToTests, configToMockServices);
    }
    fixTestFilePaths(target);

    return usedDependencyIds;
}

function fixTestFilePaths(source: string) {
    const testPath = path.join(source, 'src', 'test', 'wso2mi');
    if (!fs.existsSync(testPath)) {
        return;
    }
    const items = fs.readdirSync(testPath, { withFileTypes: true });
    const options = {
        ignoreAttributes: false,
        attributeNamePrefix: "@",
        parseTagValue: true,
        format: true,
    };
    const parser = new XMLParser(options);
    items.forEach(item => {
        if (!item.isDirectory()) {
            const filePath = path.join(testPath, item.name);
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const jsonData = parser.parse(fileContent);
            if (jsonData['unit-test']['artifacts']) {
                let artifacts = jsonData['unit-test']['artifacts'];
                let testArtifact = artifacts['test-artifact']['artifact'];
                if (testArtifact) {
                    artifacts['test-artifact']['artifact'] = updateArtifactPath(testArtifact);
                }
                let supportArtifact = artifacts['supportive-artifacts'];
                if (supportArtifact) {
                    let supportArtifactArr = supportArtifact["artifact"];
                    if (supportArtifactArr && Array.isArray(supportArtifactArr)) {
                        supportArtifactArr.forEach((supportArtifact, index) => {
                            supportArtifactArr[index] = updateArtifactPath(supportArtifact);
                        });
                    } else if (supportArtifactArr) {
                        supportArtifact["artifact"] = updateArtifactPath(supportArtifactArr);
                    }
                }
                let registryResources = artifacts['registry-resources'];
                if (registryResources) {
                    const registryResourcesArr = registryResources["registry-resource"];
                    if (registryResourcesArr && Array.isArray(registryResourcesArr)) {
                        registryResourcesArr.forEach(registryResource => {
                            updateRegistryArtifactPath(registryResource);
                        });
                    } else if (registryResourcesArr) {
                        updateRegistryArtifactPath(registryResourcesArr);
                    }
                }
                let connectorResources = artifacts['connector-resources'];
                if (connectorResources) {
                    let connectorResourcesArr = connectorResources["connector-resource"];
                    if (connectorResourcesArr && Array.isArray(connectorResourcesArr)) {
                        connectorResourcesArr.forEach((connectorResource, index) => {
                            connectorResourcesArr[index] = updateConnectorPath(connectorResource);
                        });
                    } else if (connectorResourcesArr) {
                        connectorResources["connector-resource"] = updateConnectorPath(connectorResourcesArr);
                    }
                }
            }
            let mockServices = jsonData["unit-test"]["mock-services"]
            if (mockServices) {
                let mockServicesArr = mockServices["mock-service"];
                if (mockServicesArr && Array.isArray(mockServicesArr)) {
                    mockServicesArr.forEach((mockService, index) => {
                        mockServicesArr[index] = updateMockServicePath(mockService);
                    });
                } else if (mockServicesArr) {
                    mockServices["mock-service"] = updateMockServicePath(mockServicesArr);
                }
            }
            const builder = new XMLBuilder(options);
            const updatedXmlString = builder.build(jsonData);
            fs.writeFileSync(filePath, updatedXmlString);
        }
    });
}

function updateArtifactPath(artifact: any): string {
    let index = artifact.lastIndexOf("/src/main/synapse-config/");
    index += "/src/main/synapse-config/".length;
    artifact = artifact.substring(index);
    if (artifact.startsWith("api")) {
        artifact = artifact.substring("api".length);
        artifact = "apis" + artifact;
    }
    return `src/main/wso2mi/artifacts/${artifact}`;
}

function updateConnectorPath(connector: any): string {
    let index = connector.lastIndexOf("/");
    connector = connector.substring(index + 1);
    return `src/main/wso2mi/resources/connectors/${connector}`;
}

function updateMockServicePath(mockService: any): string {
    let index = mockService.lastIndexOf("/test/resources/mock-services/");
    index += "/test/resources/mock-services/".length;
    mockService = mockService.substring(index);
    return `src/test/resources/mock-services/${mockService}`;
}

function updateRegistryArtifactPath(registryResource: any) {
    let registryResourcePath = registryResource['registry-path'];
    const newRegPath = "src/main/wso2mi/resources/registry/";
    if (registryResourcePath.startsWith("/_system/governance")) {
        registryResourcePath = registryResourcePath.substring("/_system/governance".length);
        registryResourcePath = newRegPath + "gov" + registryResourcePath + "/" + registryResource['file-name'];
    } else if (registryResourcePath.startsWith("/_system/config")) {
        registryResourcePath = registryResourcePath.substring("/_system/config".length);
        registryResourcePath = newRegPath + "conf" + registryResourcePath + "/" + registryResource['file-name'];
    }
    registryResource['artifact'] = registryResourcePath;
}

function copy(source: string, target: string) {
    if (!fs.existsSync(source)) {
        return;
    }
    const files = fs.readdirSync(source);
    files.forEach(file => {
        const sourceItemPath = path.join(source, file);
        const destinationItemPath = path.join(target, file);
        if (!fs.statSync(sourceItemPath).isDirectory()) {
            copyFile(sourceItemPath, destinationItemPath);
        } else {
            if (!fs.existsSync(destinationItemPath)) {
                fs.mkdirSync(destinationItemPath, { recursive: true });
            }
            copy(sourceItemPath, destinationItemPath);
        }
    });
}

function copyFile(sourcePath: string, targetPath: string) {
    try {
        fs.copyFileSync(sourcePath, targetPath);
    } catch (err) {
        console.error(`Failed to copy file from ${sourcePath} to ${targetPath}`, err);
    }
}

function moveFiles(sourcePath: string, destinationPath: string) {

    if (!fs.existsSync(destinationPath)) {
        fs.mkdirSync(destinationPath);
    }
    const items = fs.readdirSync(sourcePath);

    items.forEach(item => {
        if (item === '.backup' || item === '.git') {
            return;
        }
        const sourceItemPath = path.join(sourcePath, item);
        const destinationItemPath = path.join(destinationPath, item);
        const isDirectory = fs.statSync(sourceItemPath).isDirectory();

        if (isDirectory) {
            moveFiles(sourceItemPath, destinationItemPath);
            fs.rmSync(sourceItemPath, { recursive: true });
        } else {
            fs.renameSync(sourceItemPath, destinationItemPath);
        }
    });
}

function deleteEmptyFoldersInPath(basePath: string): void {

    if (!fs.existsSync(basePath)) {
        return;
    }
    const items = fs.readdirSync(basePath);
    for (const item of items) {
        const fullPath = path.join(basePath, item);
        if (fs.statSync(fullPath).isDirectory()) {
            const contents = fs.readdirSync(fullPath);
            if (contents.length === 0) {
                fs.rmdirSync(fullPath);
            }
        }
    }
}
