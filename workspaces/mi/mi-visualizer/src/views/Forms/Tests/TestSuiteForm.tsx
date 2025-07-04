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

import styled from "@emotion/styled";
import { yupResolver } from "@hookform/resolvers/yup";
import { EVENT_TYPE, MACHINE_VIEW, ProjectStructureArtifactResponse, GetSelectiveArtifactsResponse, GetUserAccessTokenResponse, ResourceType, RegistryArtifact } from "@wso2/mi-core";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { Button, ComponentCard, ContainerProps, ContextMenu, Dropdown, FormActions, FormGroup, FormView, Item, ProgressIndicator, TextField, Typography, Icon } from "@wso2/ui-toolkit";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import { TestCaseEntry, TestCaseForm, TestSuiteType } from "./TestCaseForm";
import { UnitTest, TestCase, STNode } from "@wso2/mi-syntax-tree/lib/src";
import path from "path";
import { getTestSuiteXML } from "../../../utils/template-engine/mustache-templates/TestSuite";
import { SelectMockService } from "./MockServices/SelectMockService";
import { MI_UNIT_TEST_GENERATION_BACKEND_URL } from "../../../constants";
import { getParamManagerFromValues, getParamManagerValues, ParamConfig, ParamField, ParamManager, ParamValue } from "@wso2/mi-diagram";
import { normalize } from "upath";

interface TestSuiteFormProps {
    stNode?: UnitTest;
    filePath?: string;
    isWindows: boolean;
}

interface MockServiceEntry {
    name: string;
}

interface UnitTestApiResponse {
    event: string;
    error: string | null;
    tests: string;
}

const cardStyle = {
    display: "block",
    margin: "15px 0 0 0",
    padding: "0 15px 15px 15px",
    width: "auto",
    cursor: "auto"
};

export const AccordionContainer = styled.div<ContainerProps>`
    padding-left: 10px;
    overflow: hidden;
    display: flex;
    background-color: var(--vscode-editorHoverWidget-background);
    &:hover {
        background-color: var(--vscode-list-hoverBackground);
        cursor: pointer;
    }
`;

export const verticalIconStyles = {
    transform: "rotate(90deg)",
    ":hover": {
        backgroundColor: "var(--vscode-welcomePage-tileHoverBackground)",
    }
};


export function TestSuiteForm(props: TestSuiteFormProps) {
    const { rpcClient } = useVisualizerContext();
    const isUpdate = !!props.filePath;

    const [isLoaded, setIsLoaded] = useState(false);
    const [artifacts, setArtifacts] = useState([]);
    const [filteredArtifacts, setFilteredArtifacts] = useState([]);
    const [showAddTestCase, setShowAddTestCase] = useState(false);
    const [showAddMockService, setShowAddMockService] = useState(false);

    const [testCases, setTestCases] = useState<TestCaseEntry[]>([]);
    const [mockServices, setMockServices] = useState<MockServiceEntry[]>([]);

    const [currentTestCase, setCurrentTestCase] = useState<TestCaseEntry | undefined>(undefined);
    const [currentMockService, setCurrentMockService] = useState<MockServiceEntry | undefined>(undefined);
    const [projectUri, setProjectUri] = useState("");

    const [allTestSuites, setAllTestSuites] = useState([]);
    const artifactTypes = ["API", "Sequence", "Template"];
    const syntaxTree = props.stNode;
    const filePath = props.filePath;

    const isWindows = props.isWindows;
    const fileName = filePath ? filePath.split(isWindows ? path.win32.sep : path.sep).pop().split(".xml")[0] : undefined;

    const paramConfigs: ParamField = {
        id: 0,
        type: "KeyLookup",
        label: "Name",
        filterType: ["sequence", "endpoint", "api", "messageStore", "messageProcessor", "task", "sequenceTemplate", "endpointTemplate", "proxyService", "dataService", "dataSource", "localEntry", "dataMapper"] as ResourceType[],
        isRequired: true,
        artifactTypes: { registryArtifacts: false, artifacts: true }
    };
    const registryParamConfigs: ParamField = {
        id: 0,
        type: "KeyLookup",
        label: "Name",
        filterType: ["sequence", "endpoint", "sequenceTemplate", "endpointTemplate", "localEntry", "registry"] as ResourceType[],
        isRequired: true,
        artifactTypes: { registryArtifacts: true, artifacts: false }
    };

    // Schema
    const schema = yup.object({
        name: yup.string().required("Unit test name is required").matches(/^[a-zA-Z0-9_-]*$/, "Invalid characters in unit test name")
            .test('validateTestSuiteName',
                'A unit test with same name already exists', value => {
                    let isDuplicate = false;
                    for (let i = 0; i < allTestSuites.length; i++) {
                        if (allTestSuites[i].name === value && allTestSuites[i].path !== filePath) {
                            isDuplicate = true;
                            break;
                        }
                    }
                    return !isDuplicate;
                }),
        artifactType: yup.string().required("Artifact type is required"),
        artifact: yup.string().required("Artifact is required"),
        supportiveArtifacts: yup.object<ParamConfig>(),
        registryResources: yup.object<ParamConfig>()
    });

    const {
        control,
        handleSubmit,
        formState: { errors },
        register,
        watch,
        reset,
        getValues,
        setValue
    } = useForm({
        resolver: yupResolver(schema),
        mode: "onChange",
        defaultValues: {
            name: "",
            artifactType: "",
            artifact: "",
            supportiveArtifacts: {
                paramValues: [],
                paramFields: [paramConfigs]
            },
            registryResources: {
                paramValues: [],
                paramFields: [registryParamConfigs]
            }
        }
    });

    const openUpdateExtensionView = () => {
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.UpdateExtension } });
    };

    const handleCreateUnitTests = async (values: any) => {
        setIsLoaded(false);

        try {

            let token: GetUserAccessTokenResponse;
            try {
                token = await rpcClient.getMiDiagramRpcClient().getUserAccessToken();
            } catch (error) {
                console.error('User not signed in', error);
            }

            if (!token) {
                openSignInView();
            }
            const backendRootUri = (await rpcClient.getMiDiagramRpcClient().getBackendRootUrl()).url;
            const url = backendRootUri + MI_UNIT_TEST_GENERATION_BACKEND_URL;
            const artifact = isWindows ? path.win32.join(projectUri, values.artifact) : path.join(projectUri, values.artifact);

            var context: GetSelectiveArtifactsResponse[] = [];
            await rpcClient?.getMiDiagramRpcClient()?.getSelectiveArtifacts({ path: artifact }).then((response: GetSelectiveArtifactsResponse) => {
                context.push(response);
            });

            let retryCount = 0;
            const maxRetries = 2;

            const fetchUnitTests = async (): Promise<Response> => {
                let response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token.token}`
                    },
                    body: JSON.stringify({ context: context[0].artifacts, test_file_name: values.name, num_suggestions: 1, type: "generate_unit_tests" }),
                });

                if (response.status === 401) {
                    // Retrieve a new token
                    await rpcClient.getMiDiagramRpcClient().refreshAccessToken();
                    const token = await rpcClient.getMiDiagramRpcClient().getUserAccessToken();

                    // Make the request again with the new token
                    response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token.token}`
                        },
                        body: JSON.stringify({ context: context[0].artifacts, testFileName: values.name, num_suggestions: 1, type: "generate_unit_tests" }),
                    });
                } else if (response.status === 404) {
                    if (retryCount < maxRetries) {
                        retryCount++;
                        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
                        await new Promise(resolve => setTimeout(resolve, delay));
                        return fetchUnitTests(); // Retry the request
                    } else {
                        openUpdateExtensionView();
                        return response; // Exit the function if maximum retries reached
                    }
                }

                if (!response.ok) {
                    throw new Error('Failed to create unit tests');
                }
                return response;
            }

            const response = await fetchUnitTests();
            const data = await response.json() as UnitTestApiResponse;
            if (data.event === "test_generation_success") {
                // Extract xml from the response
                const xml = data.tests.match(/```xml\n([\s\S]*?)\n```/gs);
                if (xml) {
                    // Remove the Markdown code block delimiters
                    const cleanedXml = xml.map(xml => xml.replace(/```xml\n|```/g, ''));
                    rpcClient.getMiDiagramRpcClient().updateTestSuite({ path: props.filePath, content: cleanedXml[0], name: values.name, artifact }).then(() => {
                        openOverview();
                    });
                } else {
                    console.error('No XMLs found in the response');
                }
            } else {
                throw new Error("Failed to generate suggestions: " + data.error);
            }
            setIsLoaded(true);

        } catch (error) {
            console.error('Error while generating unit tests:', error);
        }
    };


    useEffect(() => {
        (async () => {
            // get available artifacts
            const projectStructure = await rpcClient.getMiVisualizerRpcClient().getProjectStructure({});
            const machineView = await rpcClient.getVisualizerState();
            const projectUri = machineView.projectUri;
            const artifacts = projectStructure.directoryMap.src?.main?.wso2mi?.artifacts;
            const apis = artifacts?.apis?.map((api: ProjectStructureArtifactResponse) => { return { name: api.name, path: api.path.split(projectUri)[1], type: "API" } });
            const sequences = artifacts?.sequences?.map((sequence: ProjectStructureArtifactResponse) => { return { name: sequence.name, path: sequence.path.split(projectUri)[1], type: "Sequence" } });
            const templates = artifacts?.templates?.map((template: ProjectStructureArtifactResponse) => { return { name: template.name, path: template.path.split(projectUri)[1], type: "Template" } });
            const allArtifacts = [...apis, ...sequences, ...templates];

            setArtifacts(allArtifacts);
            setProjectUri(projectUri);

            // get all test suites
            const testSuites = await rpcClient.getMiDiagramRpcClient().getAllTestSuites();
            setAllTestSuites(testSuites.testSuites);

            if (syntaxTree && filePath) {
                let artifactType = "";
                let artifactPath = "";
                let supportiveArtifacts: any[] = [];
                let registryResources: any[] = [];

                if (syntaxTree.unitTestArtifacts.testArtifact.artifact) {
                    artifactPath = normalize(syntaxTree.unitTestArtifacts.testArtifact.artifact.content);
                    artifactType = allArtifacts.find(artifact => {
                        const aPath = normalize(artifact.path).substring(1);
                        return path.relative(aPath, artifactPath) === ""
                    })?.type;
                }

                if (syntaxTree.unitTestArtifacts.supportiveArtifacts?.artifacts) {
                    const artifacts = syntaxTree.unitTestArtifacts.supportiveArtifacts.artifacts;
                    for (let i = 0; i < artifacts.length; i++) {
                        const param = artifacts[i];
                        supportiveArtifacts.push([{
                            value: path.basename(param.content, ".xml"),
                            additionalData: { path: param.content },
                        }]);
                    }
                }

                if (syntaxTree.unitTestArtifacts.registryResources?.registryResources) {
                    const resources = syntaxTree.unitTestArtifacts.registryResources.registryResources.map((resource: any) => {
                        return resource.artifact.textNode;
                    });
                    const resourcesWithoutPropertiesFiles = removeAssociatedProperties(resources);

                    for (let i = 0; i < resourcesWithoutPropertiesFiles.length; i++) {
                        const param = resourcesWithoutPropertiesFiles[i];
                        registryResources.push([{
                            value: getKeyFromRegistryArtifactPath(param),
                            additionalData: { path: param },
                        }]);
                    }
                }

                // get test cases
                if (syntaxTree.testCases?.testCases) {
                    const testCases = getTestCases(syntaxTree.testCases.testCases);
                    setTestCases(testCases);
                }

                // get mock services
                if (syntaxTree.mockServices?.services) {
                    const mockServices = getMockServices(syntaxTree.mockServices.services);
                    setMockServices(mockServices);
                }

                reset({
                    name: fileName,
                    artifactType: artifactType,
                    artifact: artifactPath,
                    supportiveArtifacts: {
                        paramValues: getParamManagerFromValues(supportiveArtifacts, undefined, 0),
                        paramFields: [paramConfigs]
                    },
                    registryResources: {
                        paramValues: getParamManagerFromValues(registryResources, undefined, 0),
                        paramFields: [registryParamConfigs]
                    }
                });
            } else {
                reset({
                    name: "",
                    artifactType: "API",
                    artifact: apis[0]?.path,
                    supportiveArtifacts: {
                        paramValues: [],
                        paramFields: [paramConfigs]
                    },
                    registryResources: {
                        paramValues: [],
                        paramFields: [registryParamConfigs]
                    }
                })
            }
            setIsLoaded(true);
        })();
    }, [filePath, syntaxTree]);

    useEffect(() => {
        if (!artifacts || artifacts.length === 0) {
            return;
        }

        const filteredArtifacts = artifacts.filter(artifact => artifact.type === getValues("artifactType")).map((artifact) => {
            return {
                id: artifact.name,
                value: normalize(artifact.path).substring(1),
                content: artifact.name
            }
        });
        setFilteredArtifacts(filteredArtifacts);

        if (!filteredArtifacts || filteredArtifacts.length === 0) {
            return;
        }
        setValue("artifact", filteredArtifacts[0].value);
    }, [artifacts, watch("artifactType")]);

    const handleBackButtonClick = () => {
        rpcClient.getMiVisualizerRpcClient().goBack();
    }

    const openOverview = () => {
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });
    };
    const openSignInView = () => {
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.LoggedOut } });
    };

    const openAddTestCase = () => {
        setShowAddTestCase(true);
    }

    const openMockService = () => {
        setShowAddMockService(true);
    }

    const submitForm = async (values: any) => {
        values.testCases = testCases;
        values.artifact = values.artifact.startsWith(path.sep) ? values.artifact.slice(1) : values.artifact;

        values.supportiveArtifacts = getParamManagerValues(values.supportiveArtifacts, true).map((param: any) => {
            return normalize(param[0].additionalData.path).replace(`${normalize(projectUri)}/`, '');
        });

        const registryResources = getParamManagerValues(values.registryResources, true);
        values.registryResources = await getRegistryArtifactDetails(registryResources);

        const mockServicePaths = [];
        const mockServicesDirs = ["src", "test", "resources", "mock-services"];
        for (let i = 0; i < mockServices.length; i++) {
            const fileName = mockServices[i].name + ".xml";
            const mockService = path.posix.join(...mockServicesDirs, fileName);
            mockServicePaths.push(mockService);
        }
        values.mockServices = mockServicePaths;

        const xml = getTestSuiteXML(values);
        const artifact = path.posix.join(projectUri, values.artifact);
        rpcClient.getMiDiagramRpcClient().updateTestSuite({ path: props.filePath, content: xml, name: values.name, artifact }).then(() => {
            openOverview();
        });
        async function getRegistryArtifactDetails(params: any): Promise<{ fileName: string; artifact: string; registryPath: string; mediaType: string }[]> {
            const PATH_PREFIXES = [
                { basePath: '/_system/governance/', prefix: 'gov:' },
                { basePath: '/_system/config/', prefix: 'conf:' },
            ];

            const miDiagramRpcClient = rpcClient.getMiDiagramRpcClient();
            const [allRegistryResources, allRegistryPaths] = await Promise.all([
                (await miDiagramRpcClient.getAvailableRegistryResources({ path: projectUri, withAdditionalData: true })).artifactsWithAdditionalData,
                miDiagramRpcClient.getAllRegistryPaths({ path: projectUri }),
            ]);

            const artifacts = allRegistryResources.map((artifact) => ({
                ...artifact,
                key: buildKey(artifact),
            }));

            const artifactDetails: {
                fileName: string;
                artifact: string;
                registryPath: string;
                mediaType: string;
            }[] = [];

            for (const param of params) {
                const paramKey = param[0];
                const artifact = artifacts.find((a) => a.key === paramKey.value);
                if (!artifact) continue;

                const registryPath =
                    artifact.path.endsWith('/') && artifact.path.length > 1
                        ? artifact.path.slice(0, -1)
                        : artifact.path;

                const artifactPath = normalize(param[0].additionalData.path).replace(`${normalize(projectUri)}/`, '')

                const newArtifact = {
                    fileName: artifact.file,
                    artifact: artifactPath,
                    registryPath,
                    mediaType: artifact.mediaType,
                };

                artifactDetails.push(newArtifact);
                const relativePath = findArtifactRelativePath(paramKey.value);
                if (
                    relativePath &&
                    allRegistryPaths.registryPaths.includes(`${relativePath}.properties`)
                ) {
                    artifactDetails.push({
                        fileName: `${newArtifact.fileName}.properties`,
                        artifact: `${newArtifact.artifact}.properties`,
                        registryPath: newArtifact.registryPath,
                        mediaType: newArtifact.mediaType,
                    });
                }
            }
            return artifactDetails;

            function parseParamValue(paramValue: string): { type: string; fileName: string } | null {
                const match = paramValue.match(/(conf|gov):(.+)/);
                if (!match) return null;
                const [, type, fileName] = match;
                return { type, fileName };
            }

            function findArtifactRelativePath(paramValue: string): string | null {
                const parsed = parseParamValue(paramValue);
                if (!parsed) return null;
                return `${parsed.type}/${parsed.fileName}`;
            }

            function extractPrefixAndSubPath(fullPath: string): { prefix: string; subPath: string } {
                for (const { basePath, prefix } of PATH_PREFIXES) {
                    if (fullPath.startsWith(basePath)) {
                        const subPath = fullPath.slice(basePath.length).replace(/^\/+|\/+$/g, '');
                        return { prefix, subPath };
                    }
                }
                return { prefix: '', subPath: '' };
            }

            function buildKey(artifact: RegistryArtifact): string {
                const { prefix, subPath } = extractPrefixAndSubPath(artifact.path);
                return subPath ? `${prefix}${subPath}/${artifact.file}` : `${prefix}${artifact.file}`;
            }
        }
    }

    function removeAssociatedProperties(files: string[]) {
        const baseFilesSet = new Set(
            files.filter(file => !file.endsWith('.properties'))
        );

        return files.filter(file => {
            if (file.endsWith('.properties')) {
                const baseFile = file.slice(0, -'.properties'.length);
                return !baseFilesSet.has(baseFile);
            }
            return true;
        });
    }
    function getKeyFromRegistryArtifactPath(filePath: string) {
        const BASE_PATH = 'src/main/wso2mi/resources/registry/';
        const VALID_PREFIXES = ['gov', 'conf'];

        if (!filePath.startsWith(BASE_PATH)) {
            throw new Error('Invalid base path in file path.');
        }

        const relativePath = filePath.slice(BASE_PATH.length);

        const pathComponents = relativePath.split('/');

        const prefix = pathComponents.shift();

        if (!VALID_PREFIXES.includes(prefix)) {
            throw new Error(`Invalid prefix '${prefix}' in file path.`);
        }

        // Reconstruct the remaining path
        const remainingPath = pathComponents.join('/');

        // Build the transformed path
        return `${prefix}:${remainingPath}`;
    }
    const getTestCases = (testCases: TestCase[]): TestCaseEntry[] => {
        return testCases.map((testCase) => {
            const assertions = testCase.assertions.assertions.map((assertion) => {
                return [
                    assertion.tag,
                    assertion?.actual?.textNode,
                    assertion?.expected?.textNode,
                    assertion?.message?.textNode,
                ]
            });
            const input = {
                requestPath: testCase?.input?.requestPath?.textNode,
                requestMethod: testCase?.input?.requestMethod?.textNode,
                requestProtocol: testCase?.input?.requestProtocol?.textNode,
                payload: testCase?.input?.payload?.textNode,
                properties: testCase?.input?.properties?.properties?.map((property) => { return [property.name, property.scope, property.value] })
            }

            return {
                name: testCase.name,
                assertions: assertions,
                input: input,
                range: testCase.range,
            };
        });
    };

    const getMockServices = (mockServices: STNode[]): MockServiceEntry[] => {
        return mockServices.map((mockService) => {
            const name = path.basename(mockService.textNode, ".xml");

            return {
                name,
                isFile: true,
            };
        });
    };

    function getActions(entry: TestCaseEntry | MockServiceEntry, type: "test-case" | "mock-service") {
        const editAction: Item = {
            id: "edit",
            label: "Edit",
            onClick: () => {
                if (type === "test-case") {
                    editTestCase(entry as TestCaseEntry);
                } else {
                    editMockService(entry as MockServiceEntry);
                }
            },
        };
        const deleteAction: Item = {
            id: "delete",
            label: "Delete",
            onClick: () => {
                if (type === "test-case") {
                    setTestCases(testCases.filter(tc => tc !== entry));
                } else {
                    setMockServices(mockServices.filter(ms => ms !== entry));
                }
            },
        };
        if (type === "test-case") {
            const goToSourceAction: Item = {
                id: "go-to-source",
                label: "Go to Source",
                onClick: () => highlightCode(entry as TestCaseEntry, true),
            };
            return [goToSourceAction, editAction, deleteAction];
        }
        return [editAction, deleteAction];
    }

    const editTestCase = (testCase: TestCaseEntry) => {
        setCurrentTestCase(testCase);
        setShowAddTestCase(true);
    };

    const editMockService = (mockService: MockServiceEntry) => {
        setCurrentMockService(mockService);
        setMockServices(mockServices.filter(ms => ms !== mockService));
        setShowAddMockService(true);
    }

    const highlightCode = (entry: TestCaseEntry, force?: boolean) => {
        rpcClient.getMiDiagramRpcClient().highlightCode({
            range: {
                start: {
                    line: entry.range.startTagRange.start.line,
                    character: entry.range.startTagRange.start.character,

                },
                end: {
                    line: entry.range.endTagRange.end.line,
                    character: entry.range.endTagRange.end.character,
                },
            },
            force: force,
        });
    };

    if (!isLoaded) {
        return <ProgressIndicator />;
    }

    if (showAddTestCase) {
        const goBack = () => {
            setCurrentTestCase(undefined);
            setShowAddTestCase(false);
        }
        const onSubmit = (values: TestCaseEntry) => {
            if (currentTestCase) {
                setTestCases(testCases.map(tc => tc === currentTestCase ? values : tc));
            } else {
                setTestCases([...testCases, values]);
            }
            setCurrentTestCase(undefined);
            setShowAddTestCase(false);
        };
        const availableTestCases = testCases.map((testCase) => testCase.name);
        return <TestCaseForm onGoBack={goBack} onSubmit={onSubmit} testCase={currentTestCase} availableTestCases={availableTestCases} testSuiteType={getValues('artifactType') as TestSuiteType} />
    }

    if (showAddMockService) {
        const goBack = () => {
            if (currentMockService) {
                setMockServices([...mockServices, currentMockService]);
            }
            setCurrentMockService(undefined);
            setShowAddMockService(false);
        }
        const onSubmit = (values: MockServiceEntry) => {
            setMockServices([...mockServices, values]);
            setCurrentMockService(undefined);
            setShowAddMockService(false);
        };
        const availableMockServices = mockServices.map((mockService) => mockService.name);

        return <SelectMockService name={currentMockService?.name} availableMockServices={availableMockServices} isWindows={isWindows} onGoBack={goBack} onSubmit={onSubmit} />
    }

    return (
        <FormView title={`${isUpdate ? "Update" : "Create New"} Unit Test`} onClose={handleBackButtonClick}>
            < TextField
                label="Name"
                id="name"
                placeholder="Unit test name"
                required
                errorMsg={errors.name?.message.toString()}
                {...register("name")}
            />
            < Dropdown
                label="Artifact type"
                id="artifactType"
                errorMsg={errors.artifactType?.message.toString()}
                isRequired
                items={artifactTypes.map((artifactType) => { return { value: artifactType } })}
                {...register("artifactType")}
            ></Dropdown >
            <Dropdown
                label="Artifact"
                id="artifact"
                errorMsg={errors.artifact?.message.toString()}
                isRequired
                items={filteredArtifacts}
                sx={{ zIndex: 99 }}
                {...register("artifact")}
            ></Dropdown>
            <div id="testSuiteSupportiveArtifactsSection">
                <Controller
                    name="supportiveArtifacts"
                    control={control}
                    render={({ field: { onChange, value } }) => (
                        <ParamManager
                            paramConfigs={value as ParamConfig}
                            addParamText="Add Supportive Artifact"
                            readonly={false}
                            onChange={(values) => {
                                values.paramValues = values.paramValues.map((param: any, index: number) => {
                                    const property: ParamValue[] = param.paramValues;
                                    param.key = index + 1;
                                    param.value = (property[0]?.value as any)?.value ?? property[0]?.value;
                                    param.icon = 'query';

                                    return param;
                                });
                                onChange(values);
                            }}
                        />
                    )}
                />
            </div>
            <div id="testSuiteRegistryResourcesSection">
                <Controller
                    name="registryResources"
                    control={control}
                    render={({ field: { onChange, value } }) => (
                        <ParamManager
                            paramConfigs={value as ParamConfig}
                            addParamText="Add Registry Resources"
                            readonly={false}
                            onChange={(values) => {
                                values.paramValues = values.paramValues.map((param: any, index: number) => {
                                    const property: ParamValue[] = param.paramValues;
                                    param.key = index + 1;
                                    param.value = (property[0]?.value as any)?.value ?? property[0]?.value;
                                    param.icon = 'query';

                                    return param;
                                });
                                onChange(values);
                            }}
                        />
                    )}
                />
            </div>

            <ComponentCard id="testSuiteTestCasesCard" sx={cardStyle} disbaleHoverEffect>
                <FormGroup title="Test cases" isCollapsed={false}>
                    <Button appearance="secondary" onClick={openAddTestCase}>Add test case</Button>

                    {testCases.map((testCase) => {
                        return (
                            <AccordionContainer onClick={() => editTestCase(testCase)}>
                                <Typography variant="h4">{testCase.name}</Typography>
                                <div style={{ margin: "auto 0 auto auto" }}>
                                    <ContextMenu
                                        sx={{ transform: "translateX(-50%)" }}
                                        iconSx={verticalIconStyles}
                                        menuItems={getActions(testCase, "test-case")}
                                        position='bottom-left'

                                    />
                                </div>
                            </AccordionContainer>
                        );
                    })}
                </FormGroup>
            </ComponentCard>

            <ComponentCard id="testSuiteMockServicesCard" sx={cardStyle} disbaleHoverEffect>
                <FormGroup title="Mock services" isCollapsed={false}>
                    <Button appearance="secondary" onClick={openMockService}>Add mock service</Button>

                    {mockServices.map((mockService) => {
                        return (
                            <AccordionContainer onClick={() => editMockService(mockService)}>
                                <Typography variant="h4">{mockService.name}</Typography>
                                <div style={{ margin: "auto 0 auto auto" }}>
                                    <ContextMenu
                                        sx={{ transform: "translateX(-50%)" }}
                                        iconSx={verticalIconStyles}
                                        menuItems={getActions(mockService, "mock-service")}
                                        position='bottom-left'
                                    />
                                </div>
                            </AccordionContainer>
                        );
                    })}
                </FormGroup>
            </ComponentCard>

            <FormActions>
                <Button
                    appearance="primary"
                    onClick={handleSubmit(submitForm)}
                >
                    {isUpdate ? "Update" : "Create"}
                </Button>
                <Button
                    appearance="primary"
                    onClick={handleSubmit(handleCreateUnitTests)}
                >
                    <Icon name="wand-magic-sparkles-solid" sx="marginRight:5px" />&nbsp;
                    Generate Unit Tests with AI
                </Button>
                <Button appearance="secondary" onClick={openOverview}>
                    Cancel
                </Button>
            </FormActions>
        </FormView >
    );

}
