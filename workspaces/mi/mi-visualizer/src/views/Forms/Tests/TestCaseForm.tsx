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
import { yupResolver } from "@hookform/resolvers/yup";
import { EVENT_TYPE, MACHINE_VIEW, AI_EVENT_TYPE } from "@wso2/mi-core";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { Button, ComponentCard, Dialog, Dropdown, FormActions, FormView, ProgressIndicator, TextArea, TextField, Typography, Icon } from "@wso2/ui-toolkit";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { TagRange } from '@wso2/mi-syntax-tree/lib/src';
import * as path from "path";
import * as yup from "yup";
import { getTestCaseXML } from "../../../utils/template-engine/mustache-templates/TestSuite";
import { ParameterManager } from "@wso2/mi-diagram";
import { compareVersions } from "@wso2/mi-diagram/lib/utils/commons";
import { getProjectRuntimeVersion } from "../../AIPanel/utils";
import { AuthenticationDialog, useAuthentication } from "../../../components/AuthenticationDialog";

export enum TestSuiteType {
    API = "API",
    SEQUENCE = "Sequence"
}

interface TestCaseFormProps {
    filePath?: string; // Path to the test suite file
    artifactPath?: string; // Path to the artifact being tested
    range?: TagRange;
    testCase?: TestCaseEntry;
    testSuiteType: TestSuiteType;
    availableTestCases?: string[];
    onGoBack?: () => void;
    onSubmit?: (values: any) => void;
}

interface UnitTestCaseApiResponse {
    event: string;
    error: string | null;
    updated_test_file: string | null;
    mock_services?: string[];
    mock_service_names?: string[];
}

export interface TestCaseEntry {
    name: string;
    assertions?: string[][];
    input: TestCaseInput;
    range?: TagRange;
}

export interface TestCaseInput {
    requestPath?: string;
    requestMethod?: string;
    requestProtocol?: string;
    payload?: string;
    properties?: string[][];
}

const cardStyle = {
    display: "block",
    margin: "15px 0",
    padding: "0 15px 15px 15px",
    width: "auto",
    cursor: "auto"
};

export function TestCaseForm(props: TestCaseFormProps) {
    const { rpcClient } = useVisualizerContext();

    const [isLoaded, setIsLoaded] = useState(false);
    const [inputProperties, setInputProperties] = useState<any[]>([]);
    const [assertions, setAssertions] = useState<any[]>([]);
    const [showAIDialog, setShowAIDialog] = useState(false);
    const [aiPrompt, setAiPrompt] = useState("");

    // Use the authentication hook
    const {
        showSignInConfirm,
        checkAuthentication,
        openSignInView,
        closeSignInView
    } = useAuthentication({
        operationType: 'generateTestCase',
        sessionStorageKey: 'pendingTestCaseOperation'
    });

    // Form data configurations for ParameterManager
    const inputPropertiesFormData = {
        elements: [
            {
                type: "attribute",
                value: {
                    name: "propertyName",
                    displayName: "Property Name",
                    inputType: "string",
                    required: true,
                    helpTip: "",
                },
            },
            {
                type: "attribute",
                value: {
                    name: "propertyScope",
                    displayName: "Property Scope",
                    inputType: "combo",
                    required: true,
                    comboValues: ["default", "transport", "axis2", "axis2-client"],
                    defaultValue: "default",
                    helpTip: "",
                },
            },
            {
                type: "attribute",
                value: {
                    name: "propertyValue",
                    displayName: "Property Value",
                    inputType: "string",
                    required: true,
                    helpTip: "",
                },
            }
        ],
        tableKey: 'propertyName',
        tableValue: 'propertyValue',
        addParamText: 'Add Property',
    };

    // Helper function to create assertions form data based on version
    const createAssertionsFormData = (useStringOrExpression: boolean, testSuiteType: TestSuiteType) => ({
        elements: [
            {
                type: "attribute",
                value: {
                    name: "assertionType",
                    displayName: "Assertion Type",
                    inputType: "combo",
                    required: false,
                    comboValues: ["Assert Equals", "Assert Not Null"],
                    defaultValue: "Assert Equals",
                    helpTip: "",
                },
            },
            {
                type: "attribute",
                value: {
                    name: "actualExpressionType",
                    displayName: "Assertion",
                    inputType: "combo",
                    required: true,
                    comboValues: testSuiteType === TestSuiteType.SEQUENCE ? ["Payload", "Transport Header", "Custom"] : ["Payload", "Status Code", "Transport Header", "HTTP Version"],
                    defaultValue: "Payload",
                    helpTip: "",
                },
            },
            {
                type: "attribute",
                value: {
                    name: "transportHeader",
                    displayName: "Transport Header",
                    inputType: "string",
                    required: true,
                    helpTip: "",
                    enableCondition: [
                        {
                            actualExpressionType: "Transport Header",
                        }
                    ]
                },
            },
            {
                type: "attribute",
                value: {
                    name: "actualExpression",
                    displayName: "Expression",
                    inputType: useStringOrExpression ? "stringOrExpression" : "string",
                    required: true,
                    helpTip: "",
                    artifactPath: props.filePath,
                    artifactType: props.testSuiteType,
                    enableCondition: [
                        {
                            actualExpressionType: "Custom",
                        }
                    ],
                    isUnitTest: true
                },
            },
            {
                type: "attribute",
                value: {
                    name: "expectedValue",
                    displayName: "Expected Value",
                    inputType: "codeTextArea",
                    required: false,
                    helpTip: "",
                    enableCondition: [
                        {
                            assertionType: "Assert Equals",
                        }
                    ]
                },
            },
            {
                type: "attribute",
                value: {
                    name: "errorMessage",
                    displayName: "Error Message",
                    inputType: "string",
                    required: true,
                    helpTip: "",
                },
            }
        ],
        tableKey: 'assertionType',
        tableValue: 'actualExpressionType',
        addParamText: 'Add Assertion',
    });

    const [assertionsFormData, setAssertionsFormData] = useState(createAssertionsFormData(true, props.testSuiteType));

    const requestMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'TRACE', 'CONNECT'];
    const requestProtocols = ['http', 'https'];
    const isUpdate = !!props.testCase;
    const availableTestCases = props.availableTestCases || [];
    const testSuiteType = props.testSuiteType;
    const isSequence = testSuiteType?.toLowerCase() === TestSuiteType.SEQUENCE.toLowerCase();

    // Schema
    const schema = yup.object({
        name: yup.string().required("Test case name is required").matches(/^[a-zA-Z0-9_-]*$/, "Invalid characters in test case name")
            .notOneOf(availableTestCases.filter(c => c !== props?.testCase?.name), "Test case name already exists"),
        input: yup.object({
            requestPath: !isSequence ? yup.string().required("Resource path is required") : yup.string(),
            requestMethod: !isSequence ? yup.string().oneOf(requestMethods).required("Resource method is required") : yup.string(),
            requestProtocol: !isSequence ? yup.string().oneOf(requestProtocols).required("Resource protocol is required") : yup.string(),
            payload: yup.string(),
        }),
    });

    const {
        handleSubmit,
        formState: { errors },
        register,
        reset
    } = useForm({
        resolver: yupResolver(schema),
        mode: "onChange",
    });

    useEffect(() => {
        const checkRuntimeVersion = async () => {
            try {
                const runtimeVersion = await getProjectRuntimeVersion(rpcClient);
                const useStringOrExpression = runtimeVersion && compareVersions(runtimeVersion, "4.4.0") >= 0;
                setAssertionsFormData(createAssertionsFormData(useStringOrExpression, props.testSuiteType));
            } catch (error) {
                console.error('Error getting runtime version:', error);
                // Fallback to default configuration (stringOrExpression)
                setAssertionsFormData(createAssertionsFormData(true, props.testSuiteType));
            }
        };

        checkRuntimeVersion();
    }, [rpcClient]);

    useEffect(() => {
        (async () => {
            if (isUpdate) {
                const testCase = structuredClone(props?.testCase);
                if (testCase.input?.payload?.startsWith("<![CDATA[")) {
                    testCase.input.payload = testCase.input.payload.substring(9, testCase.input.payload.length - 3);
                }
                if (testCase.assertions) {
                    testCase.assertions = testCase.assertions.map((assertion: string[]) => {
                        assertion[0] = assertion[0]?.toLowerCase() === "assertequals" ? "Assert Equals" : "Assert Not Null";
                        if (assertion[2]?.startsWith("<![CDATA[")) {
                            assertion[2] = assertion[2].substring(9, assertion[2].length - 3);
                        }
                        return assertion;
                    });
                }
                testCase.input.requestProtocol = testCase?.input?.requestProtocol?.toLowerCase() ?? "http";

                // Convert properties to new format
                const properties = testCase.input.properties ?
                    testCase.input.properties.map((prop: string[]) => ({
                        propertyName: prop[0],
                        propertyScope: prop[1] || "default",
                        propertyValue: prop[2]
                    })) : [];
                // Helper function to determine actualExpressionType from actualExpression value
                const getActualExpressionType = (actualExpression: string): string => {
                    // if actualExpression starts with $trp, it's a transport header
                    if (actualExpression.startsWith("$trp:")) {
                        return "Transport Header";
                    }
                    switch (actualExpression) {
                        case "$body":
                            return "Payload";
                        case "$statusCode":
                            return "Status Code";
                        case "$httpVersion":
                            return "HTTP Version";
                        default:
                            return "Custom";
                    }
                };

                // Convert assertions to new format
                const assertionsData = testCase.assertions ?
                    testCase.assertions.map((assertion: string[]) => ({
                        assertionType: assertion[0],
                        actualExpressionType: getActualExpressionType(assertion[1]),
                        transportHeader: assertion[1]?.startsWith("$trp:") ? assertion[1].substring(5) : undefined,
                        actualExpression: assertion[1],
                        expectedValue: assertion[2] || "",
                        errorMessage: assertion[3] || "",
                    })) : [];

                setInputProperties(properties);
                setAssertions(assertionsData);

                reset({
                    name: testCase.name,
                    input: {
                        requestPath: testCase.input?.requestPath,
                        requestMethod: testCase.input?.requestMethod,
                        requestProtocol: testCase.input?.requestProtocol,
                        payload: testCase.input?.payload || ""
                    }
                });
                setIsLoaded(true);
                return;
            }

            reset({
                name: "",
                input: {
                    requestPath: !isSequence ? "/" : undefined,
                    requestMethod: !isSequence ? "GET" : undefined,
                    requestProtocol: !isSequence ? "http" : undefined,
                    payload: ""
                }
            });
            setInputProperties([]);
            setAssertions([]);
            setIsLoaded(true);
        })();
    }, [props.filePath, props.testCase]);

    const handleGoBack = () => {
        if (props.onGoBack) {
            props.onGoBack();
            return;
        }
        rpcClient.getMiVisualizerRpcClient().goBack();
    }

    const openOverview = () => {
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });
    };

    const submitForm = async (values: any) => {
        // Convert properties back to array format
        values.input.properties = inputProperties.map(prop => [
            prop.propertyName,
            prop.propertyScope,
            prop.propertyValue
        ]);

        // Convert assertions back to array format
        values.assertions = assertions.map(assertion => {
            // Handle actualExpression field - convert from JSON object to string
            let actualExpression = assertion.actualExpression;
            if(actualExpression === undefined){
                switch (assertion.actualExpressionType) {
                    case "Payload":
                        actualExpression = "$body";
                        break;
                    case "Status Code":
                        actualExpression = "$statusCode";
                        break;
                    case "Transport Header":
                        const header = assertion.transportHeader;
                        actualExpression = "$trp:" + header;
                        break;
                    case "HTTP Version":
                        actualExpression = "$httpVersion";
                        break;
                }
            }
            if (typeof actualExpression === 'object' && actualExpression !== null) {
                actualExpression = actualExpression.value;
            }

            return [
                assertion.assertionType,
                actualExpression,
                assertion.expectedValue,
                assertion.errorMessage,
            ];
        });

        if (props.onSubmit) {
            delete values.filePath;
            props.onSubmit(values);
            return;
        }
        const content = getTestCaseXML(values);
        rpcClient.getMiDiagramRpcClient().updateTestCase({ path: props.filePath, content, range: props.range }).then(() => {
            openOverview();
        });
    }

    const handleAIGeneration = async (promptValue?: string) => {
        const currentPrompt = promptValue || aiPrompt;
        
        if (!currentPrompt || typeof currentPrompt !== 'string' || !currentPrompt.trim()) {
            console.error("AI prompt is required or invalid");
            return;
        }

        setIsLoaded(false);

        try {
            // Check authentication first
            const isAuthenticated = await checkAuthentication();
            if (!isAuthenticated) {
                openSignInView({ aiPrompt: currentPrompt });
                setIsLoaded(true);
                return;
            }

            // Read the current test suite file directly
            const testSuiteContent = await rpcClient.getMiDiagramRpcClient().handleFileWithFS({
                filePath: props.filePath!,
                fileName: path.basename(props.filePath!),
                operation: 'read'
            });

            // Extract test suite name from the file path
            const testSuiteFileName = path.basename(props.filePath!, '.xml') || 'test-suite';

            // Use the artifact path for getting context
            const artifactPath = props.artifactPath || props.filePath!;
            const contextResponse = await rpcClient.getMiDiagramRpcClient().getSelectiveArtifacts({ path: artifactPath });

            const fullContextResponse = await rpcClient.getMiDiagramRpcClient().getWorkspaceContext();

            const pom_file_content = await rpcClient.getMiDiagramRpcClient().getPomFileContent();

            const external_connector_details = await rpcClient.getMiDiagramRpcClient().getExternalConnectorDetails();

            const mock_service_details = await rpcClient.getMiDiagramRpcClient().getMockServices();

            // Call the new RPC method for test case generation
            const response = await rpcClient.getMiAiPanelRpcClient().generateUnitTestCase({
                context: contextResponse?.artifacts || [],
                testFileName: testSuiteFileName,
                testSuiteFile: testSuiteContent?.content || '',
                testCaseDescription: currentPrompt,
                existingMockServices: mock_service_details?.mockServices || [],
                existingMockServiceNames: mock_service_details?.mockServiceNames || [],
                fullContext: fullContextResponse?.context || [],
                pomFile: pom_file_content?.content || '',
                externalConnectors: external_connector_details?.connectors || []
            });

            // Parse the markdown response
            const markdownResponse = response.response;

            // Extract main unit test XML (first code block is the complete updated test file)
            const mainXmlMatch = markdownResponse.match(/```xml\s*([\s\S]*?)```/);
            if (!mainXmlMatch) {
                throw new Error('No updated unit test XML found in response');
            }
            const updatedUnitTestXml = mainXmlMatch[1].trim();

            // Extract new mock services (if any)
            const mockServicePattern = /###\s+([^\n]+\.xml)\s*```xml\s*([\s\S]*?)```/g;
            const newMockServices: string[] = [];
            const newMockServiceNames: string[] = [];
            let mockMatch;
            while ((mockMatch = mockServicePattern.exec(markdownResponse)) !== null) {
                newMockServiceNames.push(mockMatch[1].trim());
                newMockServices.push(mockMatch[2].trim());
            }

            // Update the test suite file with the complete updated content
            const artifact = props.artifactPath || props.filePath!;
            await rpcClient.getMiDiagramRpcClient().updateTestSuite({
                path: props.filePath,
                content: updatedUnitTestXml,
                name: testSuiteFileName,
                artifact
            });

            // Write new mock services if any were generated
            if (newMockServices.length > 0) {
                await rpcClient.getMiDiagramRpcClient().writeMockServices({
                    content: newMockServices,
                    fileNames: newMockServiceNames
                });
            }

            // Close the dialog
            setShowAIDialog(false);
            setAiPrompt("");

            // Open the updated test suite file
            rpcClient.getMiVisualizerRpcClient().openView({
                type: EVENT_TYPE.OPEN_VIEW,
                location: {
                    view: MACHINE_VIEW.TestSuite,
                    documentUri: props.filePath
                }
            });

            setIsLoaded(true);

        } catch (error) {
            console.error('Error while generating test case:', error);
            setIsLoaded(true);
        } finally {
            setIsLoaded(true);
            setShowAIDialog(false);
            setAiPrompt("");
        }
    };


    // Handler for authentication success - this will be called when authentication is successful
    const handleAuthenticationSuccess = async (formValues: any) => {
        const storedPrompt = formValues?.aiPrompt;
        await handleAIGeneration(storedPrompt);
    };

    const openUpdateExtensionView = () => {
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.UpdateExtension } });
    };

    const handleAIDialogClose = () => {
        setShowAIDialog(false);
        setAiPrompt("");
    };

    if (!isLoaded) {
        return <ProgressIndicator />;
    }

    return (
        <FormView title={`${isUpdate ? "Update" : "Create New"} Test Case`} onClose={handleGoBack}>
            <TextField
                id="name"
                label="Name"
                placeholder="Test case name"
                required
                errorMsg={errors.name?.message.toString()}
                {...register("name")}
            />
            {!isSequence &&
                <>
                    <TextField
                        id="requestPath"
                        label="Resource path"
                        placeholder="/"
                        required
                        errorMsg={errors.requestPath?.message.toString()}
                        {...register("input.requestPath")}
                    />
                    <Dropdown
                        id="requestMethod"
                        label="Resource method"
                        items={requestMethods.map((method) => ({ value: method, content: method }))}
                        errorMsg={errors.requestMethod?.message.toString()}
                        {...register('input.requestMethod')} />
                    <Dropdown
                        id="requestProtocol"
                        label="Resource Protocol"
                        items={requestProtocols.map((method) => ({ value: method, content: method.toUpperCase() }))}
                        errorMsg={errors.requestProtocol?.message.toString()}
                        {...register('input.requestProtocol')} />
                </>
            }
            <TextArea
                id="payload"
                label="Input Payload"
                placeholder="Input payload"
                rows={5}
                {...register("input.payload")}
            />

            <ComponentCard id="testCasePropertiesCard" sx={cardStyle} disbaleHoverEffect>
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <Typography variant="h3">Properties</Typography>
                </div>
                <Typography variant="body3">Editing of the properties of an input</Typography>

                <ParameterManager
                    formData={inputPropertiesFormData}
                    parameters={inputProperties}
                    setParameters={setInputProperties}
                />

            </ComponentCard>

            <ComponentCard id="testCaseAssertionsCard" sx={cardStyle} disbaleHoverEffect>
                <Typography variant="h3">Assertions</Typography>
                <Typography variant="body3">Editing of the properties of an assertion</Typography>

                <ParameterManager
                    formData={assertionsFormData}
                    parameters={assertions}
                    setParameters={setAssertions}
                />

            </ComponentCard>

            <FormActions>
                <Button
                    appearance="primary"
                    onClick={handleSubmit(submitForm)}
                >
                    {`${isUpdate ? "Update" : "Create"}`}
                </Button>
                {props.filePath && (
                    <Button
                        appearance="primary"
                        onClick={() => setShowAIDialog(true)}
                    >
                        <Icon name="wand-magic-sparkles-solid" sx="marginRight:5px" />&nbsp;
                        Generate Test Case with AI
                    </Button>
                )}
                <Button appearance="secondary" onClick={handleGoBack}>
                    Cancel
                </Button>
            </FormActions>

            {/* AI Generation Dialog - Only render when filePath is defined */}
            {props.filePath && (
                <Dialog 
                    isOpen={showAIDialog} 
                    onClose={handleAIDialogClose}
                    sx={{ 
                        width: 'auto', 
                        minWidth: '480px', 
                        maxWidth: '600px',
                        maxHeight: '80vh'
                    }}
                >
                    <div style={{ 
                        padding: '24px', 
                        overflow: 'auto'
                    }}>
                        <div style={{ marginBottom: '20px' }}>
                            <Typography variant="h3">
                                Generate Test Case with AI
                            </Typography>
                        </div>
                        <div style={{ 
                            marginBottom: '20px', 
                            color: 'var(--vscode-descriptionForeground)',
                            lineHeight: '1.5'
                        }}>
                            <Typography variant="body3">
                                Describe what kind of test case you want to generate. Be specific about the scenario, expected behavior, and any particular assertions you need.
                            </Typography>
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            <TextArea
                                id="aiPrompt"
                                label="Test Case Description"
                                placeholder="Example: Generate a test case for a successful API call that validates the response status is 200 and the response body contains a valid user object with id, name, and email fields..."
                                rows={6}
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                            />
                        </div>
                        <div style={{ 
                            display: 'flex', 
                            gap: '12px', 
                            justifyContent: 'flex-end',
                            paddingTop: '8px'
                        }}>
                            <Button appearance="secondary" onClick={handleAIDialogClose}>
                                Cancel
                            </Button>
                            <Button 
                                appearance="primary" 
                                onClick={() => handleAIGeneration()}
                                disabled={!aiPrompt.trim()}
                            >
                                <Icon name="wand-magic-sparkles-solid" sx="marginRight:5px" />&nbsp;
                                Generate
                            </Button>
                        </div>
                    </div>
                </Dialog>
            )}

            {/* Authentication dialog */}
            <AuthenticationDialog
                isOpen={showSignInConfirm}
                operationType="generateTestCase"
                sessionStorageKey="pendingTestCaseOperation"
                signInMessage="You need to sign in to MI Copilot to use AI features. Would you like to sign in?"
                waitingMessage="Please complete the sign-in process. Your unit test generation will continue automatically after successful authentication."
                dependencies={[isLoaded]}
                onCancel={closeSignInView}
                onAuthenticationSuccess={handleAuthenticationSuccess}
            />
        </FormView>
    );
}
