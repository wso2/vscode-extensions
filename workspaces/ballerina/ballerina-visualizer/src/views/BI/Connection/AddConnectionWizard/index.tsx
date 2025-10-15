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

import { useEffect, useRef, useState } from "react";
import styled from "@emotion/styled";
import {
    AvailableNode,
    DIRECTORY_MAP,
    EVENT_TYPE,
    FlowNode,
    LinePosition,
    LineRange,
    MACHINE_VIEW,
    ParentPopupData,
    RunExternalCommandResponse,
    SubPanel,
    SubPanelView,
} from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import ConnectorView from "../ConnectorView";
import ConnectionConfigView from "../ConnectionConfigView";
import { getFormProperties } from "../../../../utils/bi";
import { ExpressionFormField, FormField, FormValues, PanelContainer } from "@wso2/ballerina-side-panel";
import { Icon, Overlay, ThemeColors, Typography } from "@wso2/ui-toolkit";
import { RelativeLoader } from "../../../../components/RelativeLoader";
import { HelperView } from "../../HelperView";
import { BodyText } from "../../../styles";
import { DownloadIcon } from "../../../../components/DownloadIcon";
import FormGeneratorNew from "../../Forms/FormGeneratorNew";
import { MarketplaceItem } from "@wso2/wso2-platform-core";
import { DevantConnectorPanel } from "../DevantConnections/DevantConnectorPanel";

const Container = styled.div`
    width: 100%;
    display: flex;
    justify-content: center;
`;

const PopupContainer = styled.div`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80%;
    height: 80%;
    z-index: 2000;
    background-color: ${ThemeColors.SURFACE_BRIGHT};
    border-radius: 20px;
    overflow: hidden;
`;

const StatusCard = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;

    & > svg {
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: ${ThemeColors.ON_SURFACE};
    }
`;

const StatusContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    padding: 40px;
`;

const StatusText = styled(Typography)`
    margin-top: 16px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    font-size: 14px;
    text-align: center;
`;

enum WizardStep {
    CONNECTOR_LIST = "connector-list",
    CONNECTION_CONFIG = "connection-config",
    GENERATE_CONNECTOR = "generate-connector",
    DEVANT_CONNECTOR = "devant-connector"
}

enum PullingStatus {
    FETCHING = "fetching",
    PULLING = "pulling",
    SUCCESS = "success",
    ERROR = "error",
}

enum SavingFormStatus {
    SAVING = "saving",
    SUCCESS = "success",
    ERROR = "error",
}

interface AddConnectionWizardProps {
    fileName: string; // file path of `connection.bal`
    target?: LinePosition;
    onClose?: (parent?: ParentPopupData) => void;
    isPopupScreen?: boolean;
    openCustomConnectorView?: boolean;
}

export function AddConnectionWizard(props: AddConnectionWizardProps) {
    const { fileName, target, onClose, isPopupScreen, openCustomConnectorView } = props;
    const { rpcClient } = useRpcContext();

    const [currentStep, setCurrentStep] = useState<WizardStep>(WizardStep.CONNECTOR_LIST);
    const [pullingStatus, setPullingStatus] = useState<PullingStatus>(PullingStatus.FETCHING);
    const [savingFormStatus, setSavingFormStatus] = useState<SavingFormStatus>(undefined);
    const selectedConnectorRef = useRef<AvailableNode>();
    const selectedNodeRef = useRef<FlowNode>();
    const [subPanel, setSubPanel] = useState<SubPanel>({ view: SubPanelView.UNDEFINED });
    const [updatedExpressionField, setUpdatedExpressionField] = useState<ExpressionFormField>(undefined);
    const [fetchingInfo, setFetchingInfo] = useState<boolean>(false);
    const [connectorsViewKey, setConnectorsViewKey] = useState(0);
    const [targetLineRange, setTargetLineRange] = useState<LineRange>();
    const [selectedDevantConnector, setSelectedDevantConnector] = useState<MarketplaceItem>()
    const [genConnectorFields, setGenConnectorFields] = useState<FormField[]>([
        {
            key: `module`,
            label: "Module",
            type: "string",
            optional: false,
            editable: true,
            documentation: "Name of the connector",
            enabled: true,
            value: "",
            valueTypeConstraint: "",
            diagnostics: [],
        },
        {
            key: `openApiSpecPath`,
            label: "OpenAPI Spec",
            type: "FILE_SELECT",
            optional: false,
            editable: true,
            documentation: "",
            enabled: true,
            value: "",
            valueTypeConstraint: "",
        },
    ]);

    const handleOnSelectConnector = async (connector: AvailableNode) => {
        if (!connector.codedata) {
            console.error(">>> Error selecting connector. No codedata found");
            return;
        }
        selectedConnectorRef.current = connector;
        setCurrentStep(WizardStep.CONNECTION_CONFIG);

        try {
            let timer: ReturnType<typeof setTimeout> | null = null;
            let didTimeout = false;

            // Set status to FETCHING before starting
            setPullingStatus(PullingStatus.FETCHING);
            selectedNodeRef.current = undefined;

            // Start a timer for 3 seconds
            const timeoutPromise = new Promise<void>((resolve) => {
                timer = setTimeout(() => {
                    didTimeout = true;
                    setPullingStatus(PullingStatus.PULLING);
                    resolve();
                }, 3000);
            });

            // Start the request
            const nodeTemplatePromise = rpcClient.getBIDiagramRpcClient().getNodeTemplate({
                position: target || null,
                filePath: fileName,
                id: connector.codedata,
            });

            // Wait for either the timer or the request to finish
            const response = await Promise.race([
                nodeTemplatePromise.then((res) => {
                    if (timer) {
                        clearTimeout(timer);
                        timer = null;
                    }
                    return res;
                }),
                timeoutPromise.then(() => nodeTemplatePromise),
            ]);

            if (didTimeout) {
                // If it timed out, set status to SUCCESS
                setPullingStatus(PullingStatus.SUCCESS);
            }

            console.log(">>> FlowNode template", response);
            selectedNodeRef.current = response.flowNode;
            const formProperties = getFormProperties(response.flowNode);
            console.log(">>> Form properties", formProperties);

            if (Object.keys(formProperties).length === 0) {
                // add node to source code
                handleOnFormSubmit(response.flowNode);
                return;
            }
        } catch (error) {
            console.error(">>> Error selecting connector", error);
            setPullingStatus(PullingStatus.ERROR);
        } finally {
            // After few seconds, set status to undefined
            setTimeout(() => {
                setPullingStatus(undefined);
            }, 2000);
        }
    };

    const handleOnAddGeneratedConnector = () => {
        setCurrentStep(WizardStep.GENERATE_CONNECTOR);
    };

    const onSelectDevantConnector = (item: MarketplaceItem) => {
        setSelectedDevantConnector(item);
        setCurrentStep(WizardStep.DEVANT_CONNECTOR)
    }

    const handleOnFormSubmit = async (node: FlowNode) => {
        console.log(">>> on form submit", node);
        if (selectedNodeRef.current) {
            setSavingFormStatus(SavingFormStatus.SAVING);
            const visualizerLocation = await rpcClient.getVisualizerLocation();
            let connectionsFilePath = visualizerLocation.documentUri || visualizerLocation.projectUri;

            if (node.codedata.isGenerated && !connectionsFilePath.endsWith(".bal")) {
                connectionsFilePath += "/main.bal";
            }

            if (connectionsFilePath === "") {
                console.error(">>> Error updating source code. No source file found");
                setSavingFormStatus(SavingFormStatus.ERROR);
                return;
            }

            // node property scope is local. then use local file path and line position
            if ((node.properties?.scope?.value as string)?.toLowerCase() === "local") {
                node.codedata.lineRange = {
                    fileName: visualizerLocation.documentUri,
                    startLine: target,
                    endLine: target,
                };
            }

            rpcClient
                .getBIDiagramRpcClient()
                .getSourceCode({
                    filePath: connectionsFilePath,
                    flowNode: node,
                    isConnector: true,
                })
                .then((response) => {
                    console.log(">>> Updated source code", response);
                    if (response.artifacts.length > 0) {
                        // clear memory
                        selectedNodeRef.current = undefined;
                        setSavingFormStatus(SavingFormStatus.SUCCESS);
                        const newConnection = response.artifacts.find((artifact) => artifact.isNew);
                        onClose
                            ? onClose({ recentIdentifier: newConnection.name, artifactType: DIRECTORY_MAP.CONNECTION })
                            : gotoHome();
                    } else {
                        console.error(">>> Error updating source code", response);
                        setSavingFormStatus(SavingFormStatus.ERROR);
                    }
                });
        }
    };

    const handleOnGenerateSubmit = async (data: FormValues) => {
        // Note: Project path is empty as the value is overridden in the rpc client
        const response = await rpcClient.getBIDiagramRpcClient().generateOpenApiClient({
            openApiContractPath: data["openApiSpecPath"],
            projectPath: "",
            module: data["module"],
        });
        if (response.errorMessage) {
            setGenConnectorFields((prevFields) =>
                prevFields.map((field) =>
                    field.key === "module"
                        ? {
                              ...field,
                              diagnostics: [
                                  ...field.diagnostics,
                                  { message: response.errorMessage, severity: "ERROR" },
                              ],
                          }
                        : field
                )
            );
        } else {
            handleOnBack();//
            setConnectorsViewKey((prev) => prev + 1);//
        }
    };

    const handleOnBack = () => {
        isPopupScreen ? onClose() : setCurrentStep(WizardStep.CONNECTOR_LIST);
    };

    const handleSubPanel = (subPanel: SubPanel) => {
        setSubPanel(subPanel);
    };

    const updateExpressionField = (data: ExpressionFormField) => {
        setUpdatedExpressionField(data);
    };

    const findSubPanelComponent = (subPanel: SubPanel) => {
        switch (subPanel.view) {
            case SubPanelView.HELPER_PANEL:
                return (
                    <HelperView
                        filePath={subPanel.props.sidePanelData.filePath}
                        position={subPanel.props.sidePanelData.range}
                        updateFormField={updateExpressionField}
                        editorKey={subPanel.props.sidePanelData.editorKey}
                        onClosePanel={handleSubPanel}
                        configurePanelData={subPanel.props.sidePanelData?.configurePanelData}
                    />
                );
            default:
                return null;
        }
    };

    const handleResetUpdatedExpressionField = () => {
        setUpdatedExpressionField(undefined);
    };

    const gotoHome = () => {
        rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.Overview,
            },
        });
    };

    return (
        <Container>
            {!isPopupScreen ? (
                <ConnectorView
                    key={connectorsViewKey}
                    fileName={fileName}
                    targetLinePosition={target}
                    onSelectConnector={handleOnSelectConnector}
                    onAddGeneratedConnector={handleOnAddGeneratedConnector}
                    onClose={onClose}
                    openCustomConnectorView={openCustomConnectorView}
                    onSelectDevantConnector={onSelectDevantConnector}
                />
            ) : (
                currentStep === WizardStep.CONNECTOR_LIST && (
                    <>
                        <Overlay
                            sx={{ background: `${ThemeColors.SURFACE_CONTAINER}`, opacity: `0.5`, zIndex: 1999 }}
                        />
                        <PopupContainer>
                            <ConnectorView
                                key={connectorsViewKey}
                                fileName={fileName}
                                targetLinePosition={target}
                                onSelectConnector={handleOnSelectConnector}
                                onAddGeneratedConnector={handleOnAddGeneratedConnector}
                                onClose={onClose}
                                isPopupView={true}
                                onSelectDevantConnector={onSelectDevantConnector}
                            />
                        </PopupContainer>
                    </>
                )
            )}
            {(currentStep === WizardStep.CONNECTION_CONFIG || currentStep === WizardStep.GENERATE_CONNECTOR) || currentStep === WizardStep.DEVANT_CONNECTOR && (
                <Overlay sx={{ background: `${ThemeColors.SURFACE_CONTAINER}`, opacity: `0.3`, zIndex: 2000 }} />
            )}
            {currentStep === WizardStep.CONNECTION_CONFIG && (
                <PanelContainer
                    show={true}
                    title={`Configure the ${selectedConnectorRef.current?.metadata.label || ""} Connector`}
                    onClose={onClose ? onClose : handleOnBack}
                    width={400}
                    subPanelWidth={400}
                    subPanel={findSubPanelComponent(subPanel)}
                    onBack={handleOnBack}
                >
                    <>
                        {pullingStatus && (
                            <StatusContainer>
                                {pullingStatus === PullingStatus.FETCHING && (
                                    <RelativeLoader message="Loading connector package..." />
                                )}
                                {pullingStatus === PullingStatus.PULLING && (
                                    <StatusCard>
                                        <DownloadIcon color={ThemeColors.ON_SURFACE} />
                                        <StatusText variant="body2">
                                            Please wait while the connector package is being pulled...
                                        </StatusText>
                                    </StatusCard>
                                )}
                                {pullingStatus === PullingStatus.SUCCESS && (
                                    <StatusCard>
                                        <Icon
                                            name="bi-success"
                                            sx={{
                                                color: ThemeColors.PRIMARY,
                                                fontSize: "28px",
                                                width: "28px",
                                                height: "28px",
                                            }}
                                        />
                                        <StatusText variant="body2">Connector package pulled successfully.</StatusText>
                                    </StatusCard>
                                )}
                                {pullingStatus === PullingStatus.ERROR && (
                                    <StatusCard>
                                        <Icon
                                            name="bi-error"
                                            sx={{
                                                color: ThemeColors.ERROR,
                                                fontSize: "28px",
                                                width: "28px",
                                                height: "28px",
                                            }}
                                        />
                                        <StatusText variant="body2">
                                            Failed to pull the connector package. Please try again.
                                        </StatusText>
                                    </StatusCard>
                                )}
                            </StatusContainer>
                        )}
                        {!pullingStatus && selectedNodeRef.current && (
                            <>
                                <BodyText style={{ padding: "20px 16px 0 16px" }}>
                                    Provide the necessary configuration details for the selected connector to complete
                                    the setup.
                                </BodyText>
                                <ConnectionConfigView
                                    fileName={fileName}
                                    submitText={savingFormStatus === SavingFormStatus.SAVING ? "Creating..." : "Create"}
                                    isSaving={savingFormStatus === SavingFormStatus.SAVING}
                                    selectedNode={selectedNodeRef.current}
                                    onSubmit={handleOnFormSubmit}
                                    updatedExpressionField={updatedExpressionField}
                                    resetUpdatedExpressionField={handleResetUpdatedExpressionField}
                                    openSubPanel={handleSubPanel}
                                    isPullingConnector={savingFormStatus === SavingFormStatus.SAVING}
                                />
                            </>
                        )}
                    </>
                </PanelContainer>
            )}
            {!fetchingInfo && currentStep === WizardStep.GENERATE_CONNECTOR && (
                <PanelContainer
                    show={true}
                    title={`Generate a new connector`}
                    onClose={onClose ? onClose : handleOnBack}
                    width={400}
                    subPanelWidth={400}
                    onBack={handleOnBack}
                >
                    <>
                        <BodyText style={{ padding: "20px 16px 0 16px" }}>
                            Provide the necessary details to generate the connector.
                        </BodyText>
                        <FormGeneratorNew
                            fileName={fileName}
                            targetLineRange={targetLineRange}
                            fields={genConnectorFields}
                            onSubmit={handleOnGenerateSubmit}
                            submitText={"Generate"}
                            nestedForm={false}
                        />
                        {savingFormStatus === SavingFormStatus.SAVING && (
                            <BodyText style={{ padding: "20px 20px 0 20px" }}>Saving connection ...</BodyText>
                        )}
                        {savingFormStatus === SavingFormStatus.SUCCESS && (
                            <BodyText style={{ padding: "20px 20px 0 20px" }}>Connection saved successfully.</BodyText>
                        )}
                        {savingFormStatus === SavingFormStatus.ERROR && (
                            <BodyText style={{ padding: "20px 20px 0 20px" }}>Error saving connection.</BodyText>
                        )}
                    </>
                </PanelContainer>
            )}

            {currentStep === WizardStep.DEVANT_CONNECTOR && (
                 <DevantConnectorPanel 
                    onClose={()=>{
                        setCurrentStep(WizardStep.CONNECTOR_LIST)
                        setSelectedDevantConnector(undefined)
                    }}
                    selectedItem={selectedDevantConnector}
                />
            )}
        </Container>
    );
}

export default AddConnectionWizard;
