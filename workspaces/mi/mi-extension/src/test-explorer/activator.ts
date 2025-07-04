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

import path = require("path");
import { TestController, tests, TestRunProfileKind, Uri, TestItem, ExtensionContext, commands, Range, Position, window } from "vscode";
import { runHandler } from "./runner";
import { createTestsForAllFiles, testFileMatchPattern } from "./discover";
import { getProjectName, getProjectRoot, startWatchingWorkspace } from "./helper";
import { EVENT_TYPE, MACHINE_VIEW, ProjectStructureArtifactResponse } from "@wso2/mi-core";
import { COMMANDS } from "../constants";
import { openView } from '../stateMachine';
import { activateMockServiceTreeView } from "./mock-services/activator";
import { TagRange, TestCase, UnitTest } from "../../../syntax-tree/lib/src";
import { normalize } from "upath";
import { MILanguageClient } from "../lang-client/activator";

export let testController: TestController;
const testDirNodes: string[] = [];
const testSuiteNodes: string[] = [];
const testCaseNodes: string[] = [];

let isTestExplorerActive = false;
export async function activateTestExplorer(extensionContext: ExtensionContext) {
    if (isTestExplorerActive) {
        return;
    }
    isTestExplorerActive = true;

    testController = tests.createTestController('synapse-tests', 'Synapse Tests');
    extensionContext.subscriptions.push(testController);

    // create test profiles to display.
    testController.createRunProfile('Run Tests', TestRunProfileKind.Run, runHandler, true);
    testController.createRunProfile('Debug Tests', TestRunProfileKind.Debug, runHandler, true);

    testController.refreshHandler = async () => {
        createTestsForAllFiles();
    };
    createTestsForAllFiles();

    // search for all the tests.
    startWatchingWorkspace(testFileMatchPattern, createTestsForAllFiles);

    commands.registerCommand(COMMANDS.ADD_TEST_SUITE, (args: any) => {
        const projectUri = getProjectRoot(Uri.parse(args?.id));
        openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.TestSuite, projectUri });
        console.log('Add Test suite');
    });

    commands.registerCommand(COMMANDS.EDIT_TEST_SUITE, (entry: TestItem) => {
        openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.TestSuite, documentUri: entry.id });
        console.log('Update Test suite');
    });

    commands.registerCommand(COMMANDS.ADD_TEST_CASE, async (entry: TestItem) => {
        const id = entry?.id;
        if (!id || id.split('.xml/').length < 1) {
            window.showErrorMessage('Test suite id is not available');
            return;
        }
        const fileUri = Uri.parse(entry.id);

        const data = await getTestCaseNamesAndTestSuiteType(fileUri);
        if (!data) {
            return;
        }
        const { availableTestCases, testSuiteType } = data;

        openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.TestCase, documentUri: fileUri.fsPath, customProps: { availableTestCases, testSuiteType } });
        console.log('Add Test Case');
    });

    commands.registerCommand(COMMANDS.EDIT_TEST_CASE, async (entry: TestItem) => {
        const id = entry?.id;
        if (!id || id.split('.xml/').length < 1) {
            window.showErrorMessage('Test case id is not available');
            return;
        }
        const fileUri = `${id.split('.xml/')[0]}.xml`;
        const testCaseName = id.split('.xml/')[1];
        const langClient = await MILanguageClient.getInstance(getProjectRoot(Uri.parse(fileUri))!);
        const st = await langClient?.languageClient?.getSyntaxTree({
            documentIdentifier: {
                uri: fileUri
            },
        });
        if (!st) {
            window.showErrorMessage('Syntax tree is not available');
            return;
        }
        const unitTestsST: UnitTest = st?.syntaxTree["unit-test"];
        const unitTestST = unitTestsST?.testCases?.testCases.find((testCase) => testCase.name === testCaseName);

        if (!unitTestST) {
            window.showErrorMessage('Syntax tree for test case is not found');
            return;
        }

        const testCase = {
            name: unitTestST.name,
            assertions: unitTestST?.assertions?.assertions.map((assertion) => { return [assertion.tag, assertion?.actual?.textNode, assertion?.expected?.textNode, assertion?.message?.textNode] }),
            input: {
                requestPath: unitTestST?.input?.requestPath?.textNode ?? "",
                requestMethod: unitTestST?.input?.requestMethod?.textNode ?? "GET",
                requestProtocol: unitTestST?.input?.requestProtocol?.textNode ?? "HTTP",
                payload: unitTestST?.input?.payload?.textNode ?? "",
                properties: unitTestST?.input?.properties?.properties?.map((property) => { return [property.name, property.scope, property.value] }),
            },
        };

        const data = await getTestCaseNamesAndTestSuiteType(Uri.parse(fileUri));
        if (!data) {
            return;
        }
        const { availableTestCases, testSuiteType } = data;
        const availableTestCasesFiltered = availableTestCases.filter((testCase) => testCase !== unitTestST.name);

        openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.TestCase, documentUri: entry.uri?.fsPath, customProps: { testCase, availableTestCases: availableTestCasesFiltered, testSuiteType, range: unitTestST?.range } });
        console.log('Update Test Case');
    });

    commands.registerCommand(COMMANDS.GEN_AI_TESTS, () => {
        openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.AITestGen });
    });

    activateMockServiceTreeView(extensionContext);
}

/** 
 * Find and create tests.
 * @param controller Test Controller.
 * @param uri File uri to find tests.
 * @param ballerinaExtInstance Balleina extension instace.
 */
export async function createTests(uri: Uri) {
    const projectRoot = getProjectRoot(uri);
    const langClient = await MILanguageClient.getInstance(projectRoot!);
    const projectDetails = await langClient?.languageClient?.getProjectDetails();
    const projectName = projectDetails?.primaryDetails?.projectName?.value ?? getProjectName(uri);

    if (!testController || !projectRoot || !projectName) {
        return;
    }

    const testCases: TestCase[] = await getTestCases(uri);

    const testsRoot = path.join(projectRoot, "src", "test");

    let relativePath = path.relative(testsRoot, uri.fsPath).toString().split(path.sep);

    const ancestors: TestItem[] = [];

    // uncomment to add project name as parent
    // if already added to the test explorer.
    // let projectNode = testController.items.get(testsRoot);
    // if (!projectNode) {
    //     projectNode = createTestItem(testController, testsRoot, projectName);
    //     await setCanAddTestSuite(testsRoot);
    //     testController.items.add(projectNode);
    // }
    // ancestors.push(projectNode);

    // let parentNode: TestItem = projectNode;
    let parentNode: TestItem | undefined;
    const testPath = uri.fsPath;

    const currentItems = testController.items;
    currentItems.forEach((item) => {
        if (testPath.includes(item.id) && item.canResolveChildren) {
            parentNode = getParentNode(item, testPath);
        }

    });

    if (parentNode) {
        ancestors.push(parentNode);
        relativePath = path.relative(parentNode.id, testPath).split(path.sep);
    }

    // parentNode = getParentNode(projectNode, testPath);
    // if (projectNode !== parentNode) {
    //     ancestors.push(parentNode);
    //     relativePath = path.relative(parentNode.id, testPath).split(path.sep);
    // }

    for (let i = 0; i < relativePath.length; i++) {
        const parent = ancestors[ancestors.length - 1];
        const level = relativePath[i];
        const currentPath = parent ? path.join(parent.id, level).toString() : path.join(testsRoot, level).toString();

        let node;
        if (i < relativePath.length - 1) {
            node = createTestItem(testController, currentPath, i === 0 ? projectName : level, true);
            await setStateforTestDirs(currentPath);
        } else {
            node = createTestItem(testController, currentPath, level.split(".xml")[0], false);
            testCases.forEach(async (testCase) => {
                const tcase = createTestCase(testController, currentPath, testCase.name, testCase.range);
                node.children.add(tcase);
                await setStateForTestCases(`${currentPath}/${testCase.name}`);
            });
            await setStateForTestSuites(currentPath);
        }
        parent ? parent.children.add(node) : testController.items.add(node);
        ancestors.push(node);
    }
}

async function getTestCaseNamesAndTestSuiteType(uri: Uri) {
    const projectUri = getProjectRoot(uri);

    if (!projectUri) {
        window.showErrorMessage('Workspace is not available');
        return;
    }

    const langClient = await MILanguageClient.getInstance(projectUri);
    const st = await langClient?.languageClient?.getSyntaxTree({
        documentIdentifier: {
            uri: uri.fsPath
        },
    });
    if (!st) {
        window.showErrorMessage('Syntax tree is not available');
        return;
    }
    const unitTestST: UnitTest = st?.syntaxTree["unit-test"];
    const testArtifact = unitTestST?.unitTestArtifacts?.testArtifact?.artifact?.textNode;

    const projectStructure = await langClient.languageClient!.getProjectStructure(projectUri);

    const artifacts = projectStructure.directoryMap.src?.main?.wso2mi?.artifacts;
    const apis = artifacts?.apis?.map((api: ProjectStructureArtifactResponse) => { return { name: api.name, path: api.path.split(projectUri)[1], type: "Api" } });
    const sequences = artifacts?.sequences?.map((sequence: ProjectStructureArtifactResponse) => { return { name: sequence.name, path: sequence.path.split(projectUri)[1], type: "Sequence" } });
    const templates = artifacts?.templates?.map((template: ProjectStructureArtifactResponse) => { return { name: template.name, path: template.path.split(projectUri)[1], type: "Template" } });
    const allArtifacts = [...apis, ...sequences, ...templates];

    const testSuiteType = allArtifacts.find(artifact => {
        const aPath = normalize(artifact.path).substring(1);
        const artifactPath = normalize(testArtifact);
        return path.relative(aPath, artifactPath) === "";
    })?.type;

    if (!testSuiteType) {
        window.showErrorMessage('Cannot find the test suite');
        return;
    }

    const availableTestCases: string[] = [];
    if (unitTestST && unitTestST.testCases) {
        unitTestST.testCases.testCases.forEach((testCase) => {
            availableTestCases.push(testCase.name);
        });
    }

    return { availableTestCases, testSuiteType };
}

async function getTestCases(uri: Uri) {
    const testCases: TestCase[] = [];
    const projectRoot = getProjectRoot(uri);
    const langClient = await MILanguageClient.getInstance(projectRoot!);

    const st = await langClient?.languageClient?.getSyntaxTree({
        documentIdentifier: {
            uri: uri.fsPath
        },
    });
    if (st) {
        const unitTestST: UnitTest = st?.syntaxTree["unit-test"];
        if (unitTestST && unitTestST.testCases) {
            unitTestST.testCases.testCases.forEach((testCase) => {
                testCases.push(testCase);
            });
        }
    }

    return testCases;
}

async function setStateforTestDirs(id: string) {
    if (!testDirNodes.includes(id)) {
        testDirNodes.push(id);
    }
    await commands.executeCommand('setContext', 'test.dirs', testDirNodes);
}

async function setStateForTestSuites(id: string) {
    if (!testSuiteNodes.includes(id)) {
        testSuiteNodes.push(id);
    }
    await commands.executeCommand('setContext', 'test.suites', testSuiteNodes);
}

async function setStateForTestCases(id: string) {
    if (!testCaseNodes.includes(id)) {
        testCaseNodes.push(id);
    }
    await commands.executeCommand('setContext', 'test.cases', testCaseNodes);
}

/**
 * Create test item for test case. 
 */
function createTestCase(controller: TestController, testSuite: string, testCase: string, range: TagRange) {
    const tcase = createTestItem(controller, `${testSuite}/${testCase}`, testCase, false, testSuite);
    tcase.canResolveChildren = false;
    tcase.range = new Range(new Position(range.startTagRange.start.line, range.startTagRange.start.character), new Position(range.endTagRange.end.line, range.endTagRange.end.character));
    return tcase;
}

/**
 * Create test tree item. 
 */
function createTestItem(controller: TestController, id: string, label: string, canResolveChildren: boolean, path?: string): TestItem {
    let uri: Uri | undefined;
    if (path) {
        uri = Uri.file(path);
    }
    const item = controller.createTestItem(id, label, uri);
    item.canResolveChildren = canResolveChildren ?? false;
    return item;
}

/**
 * Get parent node of a test item. This may return invalid parent node 
 * if the parent is not found. Always check the parent id with the returned
 * parent's id to validate.
 */
function getParentNode(testNode: TestItem, pathToSearch: string):
    TestItem | undefined {
    if (!testNode.canResolveChildren) {
        return;
    }

    testNode.children.forEach((node) => {
        if (pathToSearch.includes(node.id)) {
            return getParentNode(node, pathToSearch);
        }
    });
    return testNode;
}
