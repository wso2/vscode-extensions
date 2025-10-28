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
import {
    DIRECTORY_MAP,
    EVENT_TYPE,
    FunctionModel,
    LineRange,
    MACHINE_VIEW,
    ProjectStructureArtifactResponse,
    ComponentInfo,
    ServiceModel
} from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { PanelContainer } from "@wso2/ballerina-side-panel";
import { NodePosition } from "@wso2/syntax-tree";
import { Button, Codicon, Icon, LinkButton, TextField, Typography, View } from "@wso2/ui-toolkit";
import { useEffect, useRef, useState } from "react";
import { LoadingRing } from "../../../components/Loader";
import { TitleBar } from "../../../components/TitleBar";
import { TopNavigationBar } from "../../../components/TopNavigationBar";
import { applyModifications, isPositionChanged } from "../../../utils/utils";
import { AddServiceElementDropdown, DropdownOptionProps } from "./components/AddServiceElementDropdown";
import { ResourceAccordion } from "./components/ResourceAccordion";
import { ResourceAccordionV2 } from "./components/ResourceAccordionV2";
import { FunctionConfigForm } from "./Forms/FunctionConfigForm";
import { FunctionForm } from "./Forms/FunctionForm";
import { ResourceForm } from "./Forms/ResourceForm";
import { getCustomEntryNodeIcon } from "../ComponentListView/EventIntegrationPanel";
import { McpToolForm } from "./Forms/McpToolForm";
import { removeForwardSlashes, canDataBind, getReadableListenerName } from "./utils";
import { DatabindForm } from "./Forms/DatabindForm";

const LoadingContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 80vh;
    flex-direction: column;
`;

const ServiceContainer = styled.div`
    padding-right: 10px;
    padding-left: 10px;
    flex-grow: 1;
    overflow-y: auto;
    height: 0; /* This forces the flex item to use available space */
`;

const FunctionsContainer = styled.div`
    max-height: 550px;
    overflow: scroll;
    padding: 15px;
    padding-right: 0px;
`;

const ButtonText = styled.span`
    @media (max-width: 768px) {
        display: none;
    }
    width: 100%;
`;

const HeaderContainer = styled.div`
    display: flex;
    padding: 0px 15px;
    align-items: center;
    justify-content: space-between;
`;

const ActionGroup = styled.div`
    display: flex;
    gap: 12px;
    align-items: center;
`;

const ServiceMetadataContainer = styled.div`
    padding: 12px 25px;
    border-bottom: 1px solid var(--vscode-editorWidget-border);
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: var(--vscode-editor-background);
`;

const MetadataRow = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
`;

const MetadataLabel = styled.span`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    font-weight: 500;
    min-width: 60px;
`;

const ListenerBadge = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 7px;
    background: var(--vscode-editorWidget-background, #f3f3f3);
    color: var(--vscode-descriptionForeground, #888);
    border-radius: 10px;
    font-weight: 400;
    cursor: pointer;
    transition: background 0.12s;

    &:hover {
        background: var(--vscode-editorWidget-border, #e0e0e0);
        transform: none;
    }
`;

const PropertyInline = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 8px;
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-editorWidget-border);
    border-radius: 4px;
    font-size: 11px;
    height: 24px;
    pointer-events: none;
`;

const PropertyKey = styled.span`
    color: var(--vscode-descriptionForeground);
    font-weight: 500;
`;

const PropertyValue = styled.span`
    color: var(--vscode-input-foreground);
    font-family: var(--vscode-editor-font-family);
`;

const EmptyReadmeContainer = styled.div`
    display: flex;
    margin: 80px 0px;
    flex-direction: column;
    align-items: center;
    gap: 8px;
`;

const Description = styled(Typography)`
    color: var(--vscode-descriptionForeground);
`;

interface ServiceDesignerProps {
    filePath: string;
    position: NodePosition;
    serviceIdentifier: string;
}

interface ReadonlyProperty {
    label: string;
    value: string | string[];
}

export const ADD_HANDLER = "add-handler";
export const ADD_INIT_FUNCTION = "add-init-function";
export const ADD_REUSABLE_FUNCTION = "add-reusable-function";
export const EXPORT_OAS = "export-oas";
export const ADD_HTTP_RESOURCE = "add-http-resource";

export function ServiceDesigner(props: ServiceDesignerProps) {
    const { filePath, position, serviceIdentifier } = props;
    const { rpcClient } = useRpcContext();
    const [serviceModel, setServiceModel] = useState<ServiceModel>(undefined);
    const [functionModel, setFunctionModel] = useState<FunctionModel>(undefined);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    const [isNew, setIsNew] = useState<boolean>(false);
    const [showForm, setShowForm] = useState<boolean>(false);
    const [showFunctionConfigForm, setShowFunctionConfigForm] = useState<boolean>(false);
    const [projectListeners, setProjectListeners] = useState<ProjectStructureArtifactResponse[]>([]);
    const prevPosition = useRef(position);

    const [resources, setResources] = useState<ProjectStructureArtifactResponse[]>([]);
    const [searchValue, setSearchValue] = useState<string>("");

    const [listeners, setListeners] = useState<string[]>([]);
    const [readonlyProperties, setReadonlyProperties] = useState<Set<ReadonlyProperty>>(new Set());
    const [isHttpService, setIsHttpService] = useState<boolean>(false);
    const [isMcpService, setIsMcpService] = useState<boolean>(false);
    const [objectMethods, setObjectMethods] = useState<FunctionModel[]>([]);
    const [dropdownOptions, setDropdownOptions] = useState<DropdownOptionProps[]>([]);
    const [initMethod, setInitMethod] = useState<FunctionModel>(undefined);
    const [enabledHandlers, setEnabledHandlers] = useState<FunctionModel[]>([]);
    const [unusedHandlers, setUnusedHandlers] = useState<FunctionModel[]>([]);
    const [selectedHandler, setSelectedHandler] = useState<FunctionModel>(undefined);

    const [initFunction, setInitFunction] = useState<FunctionModel>(undefined);


    const handleCloseInitFunction = () => {
        setInitFunction(undefined);
    };

    const handleInitFunctionSave = async (value: FunctionModel) => {
        setIsSaving(true);
        const lineRange: LineRange = {
            startLine: { line: position.startLine, offset: position.startColumn },
            endLine: { line: position.endLine, offset: position.endColumn },
        };
        const res = await rpcClient
            .getServiceDesignerRpcClient()
            .updateResourceSourceCode({ filePath, codedata: { lineRange }, function: value, service: serviceModel });
        const serviceArtifact = res.artifacts.find(res => res.name === serviceIdentifier);
        if (serviceArtifact) {
            fetchService(serviceArtifact.position);
            await rpcClient.getVisualizerRpcClient().openView({ type: EVENT_TYPE.UPDATE_PROJECT_LOCATION, location: { documentUri: serviceArtifact.path, position: serviceArtifact.position } });
            setIsSaving(false);
            setInitFunction(undefined);
            return;
        }
    }

    useEffect(() => {
        if (!serviceModel || isPositionChanged(prevPosition.current, position)) {
            fetchService(position);
        }

        rpcClient.onProjectContentUpdated(() => {
            fetchService(position);
        });
    }, [position]);

    const fetchService = (targetPosition: NodePosition, addMore?: boolean) => {
        const lineRange: LineRange = {
            startLine: { line: targetPosition.startLine, offset: targetPosition.startColumn },
            endLine: { line: targetPosition.endLine, offset: targetPosition.endColumn },
        };
        try {
            rpcClient
                .getServiceDesignerRpcClient()
                .getServiceModelFromCode({ filePath, codedata: { lineRange } })
                .then((res) => {
                    console.log("Service Model: ", res.service);
                    if (addMore) {
                        handleNewResourceFunction();
                    } else {
                        setShowForm(false);
                    }
                    setServiceModel(res.service);
                    setServiceMetaInfo(res.service);
                    setIsSaving(false);
                    prevPosition.current = targetPosition;
                });
        } catch (error) {
            console.log("Error fetching service model: ", error);
        }
        getProjectListeners();
    };

    const setServiceMetaInfo = (service: ServiceModel) => {
        if (service?.properties?.listener) {
            const listenerProperty = service.properties.listener;
            if (listenerProperty.values && listenerProperty.values.length > 0) {
                setListeners(listenerProperty.values);
            } else if (listenerProperty.value) {
                setListeners([listenerProperty.value]);
            }
        }
        if (service?.properties) {
            // Extract readonly properties from readOnlyMetadata if available
            const readonlyProps: Set<ReadonlyProperty> = new Set();
            const readOnlyMetadata = service.properties.readOnlyMetadata;

            if (readOnlyMetadata?.enabled && readOnlyMetadata.value && typeof readOnlyMetadata.value === "object" && !Array.isArray(readOnlyMetadata.value)) {
                Object.entries(readOnlyMetadata.value).forEach(([label, values]) => {
                    if (Array.isArray(values) && values.length > 0) {
                        readonlyProps.add({
                            label,
                            value: values.length === 1 ? values[0] : values
                        });
                    }
                });
            }

            setReadonlyProperties(readonlyProps);
            setIsHttpService(service.moduleName === "http");
            setIsMcpService(service.moduleName === "mcp");
        }

        // Extract object methods if available (for service classes)
        const objectMethods: FunctionModel[] = [];
        const enabledHandlers: FunctionModel[] = [];
        const unusedHandlers: FunctionModel[] = [];

        let hasInitMethod = false;
        service.functions.forEach(func => {
            if (func.kind === "DEFAULT") {
                if (func.name?.value === "init") {
                    hasInitMethod = true;
                    setInitMethod(func);
                } else {
                    objectMethods.push(func);
                }
            }
            if (func.kind === "REMOTE" || func.kind === "RESOURCE") {
                if (func.enabled) {
                    enabledHandlers.push(func);
                } else {
                    unusedHandlers.push(func);
                }
            }
        });

        setEnabledHandlers(enabledHandlers);
        setUnusedHandlers(unusedHandlers);
        setObjectMethods(objectMethods);

        // Set dropdown options
        const options: DropdownOptionProps[] = [];
        // if (!hasInitMethod) {
        //     options.push({
        //         title: "Add Init Function",
        //         description: "Add a new init function within the service",
        //         value: ADD_INIT_FUNCTION
        //     });
        // }

        // options.push({
        //     title: "Add Sub Flow",
        //     description: "Add a new reusable function within the service",
        //     value: ADD_REUSABLE_FUNCTION
        // });

        if (service.moduleName === "http") {
            options.push({
                title: "Export OpenAPI Spec",
                description: "Export the OpenAPI spec for the service",
                value: EXPORT_OAS
            });
        }

        setDropdownOptions(options);
    }

    const getProjectListeners = () => {
        rpcClient
            .getBIDiagramRpcClient()
            .getProjectStructure()
            .then((res) => {
                const listeners = res.directoryMap[DIRECTORY_MAP.LISTENER];
                if (listeners.length > 0) {
                    setProjectListeners(listeners);
                }
                const services = res.directoryMap[DIRECTORY_MAP.SERVICE];
                if (services.length > 0) {
                    const selectedService = services.find((service) => service.name === serviceIdentifier);
                    if (selectedService.moduleName === "mcp") {
                        const updatedResources = selectedService.resources.map(resource => ({
                            ...resource,
                            icon: "tool"
                        }));
                        setResources(updatedResources);
                    } else {
                        setResources(selectedService.resources);
                    }

                    // // Remove the init option from setDropdownOptions(options); if init function is here
                    // if (selectedService.resources.find((func) => func.name === "init")) {
                    //     const filtered = [...dropdownOptions].filter((option) => option.value !== ADD_INIT_FUNCTION);
                    //     setDropdownOptions(filtered);
                    // }
                }
            });
    };

    const handleOpenListener = (value: string) => {
        rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.BIServiceConfigView,
                position: position,
                documentUri: filePath,
                identifier: value,
            },
        });
    };

    const handleOpenDiagram = async (resource: FunctionModel) => {
        const lineRange: LineRange = resource.codedata.lineRange;
        const nodePosition: NodePosition = {
            startLine: lineRange.startLine.line,
            startColumn: lineRange.startLine.offset,
            endLine: lineRange.endLine.line,
            endColumn: lineRange.endLine.offset,
        };
        await rpcClient
            .getVisualizerRpcClient()
            .openView({ type: EVENT_TYPE.OPEN_VIEW, location: { position: nodePosition, documentUri: filePath } });
    };

    const handleServiceEdit = async () => {
        await rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.BIServiceConfigView,
                position: position,
                documentUri: filePath,
            },
        });
    };

    const handleNewResourceFunction = () => {
        rpcClient
            .getServiceDesignerRpcClient()
            .getHttpResourceModel({ type: "http", functionName: "resource" })
            .then((res) => {
                console.log("New Function Model: ", res.function);
                setFunctionModel(res.function);
                setIsNew(true);
                setShowForm(true);
            });
    };

    const handleNewMcpTool = () => {
        rpcClient
            .getServiceDesignerRpcClient()
            .getFunctionModel({ type: "mcp", functionName: "remote" })
            .then((res) => {
                console.log("New Function Model: ", res.function);
                // let fields = res.function ? convertConfig(res.function.properties) : [];
                setFunctionModel(res.function);
                setIsNew(true);
                setShowForm(true);
            });
    };

    const handleNewObjectMethod = () => {
        rpcClient
            .getServiceDesignerRpcClient()
            .getFunctionModel({ type: "object", functionName: "default" })
            .then((res) => {
                console.log("New Function Model: ", res.function);
                setFunctionModel(res.function);
                setIsNew(true);
                setShowForm(true);
            });
    };

    const onSelectAddReusableFunction = () => {
        setIsNew(true);
        // setShowFunctionConfigForm(true);
        handleNewObjectMethod();
    };

    const onSelectAddHandler = () => {
        setIsNew(true);
        setShowFunctionConfigForm(true);
    };

    const onHandlerSelected = (handler: FunctionModel) => {
        // Check if this handler is databindable
        if (canDataBind(handler)) {
            // For databindable functions, show DatabindForm for configuration
            setSelectedHandler(handler);
            setFunctionModel(handler);
            setShowForm(true);
            // Close the FunctionConfigForm to show the DatabindForm instead
            setShowFunctionConfigForm(false);
        } else {
            // For regular functions, immediately add without showing a form
            handler.enabled = true;
            setShowFunctionConfigForm(false);
            handleFunctionSubmit(handler);
        }
    };

    const onSelectAddInitFunction = async () => {
        setIsNew(false);
        const lsResponse = await rpcClient.getServiceDesignerRpcClient().getFunctionModel({
            type: 'object',
            functionName: 'init'
        });
        if (lsResponse.function) {
            setInitFunction(lsResponse.function);
            console.log(`Adding init function`, lsResponse.function);
        }
    };

    const handleAddDropdownOption = (option: string) => {
        switch (option) {
            case ADD_REUSABLE_FUNCTION:
                onSelectAddReusableFunction();
                break;
            case ADD_INIT_FUNCTION:
                onSelectAddInitFunction();
                break;
            case ADD_HANDLER:
                onSelectAddHandler();
                break;
            case ADD_HTTP_RESOURCE:
                handleNewResourceFunction();
                break;
            case EXPORT_OAS:
                handleExportOAS();
                break;
        }
    };

    const handleNewFunctionClose = () => {
        setShowForm(false);
        // If a handler was selected, also close the FunctionConfigForm
        if (selectedHandler) {
            setShowFunctionConfigForm(false);
            setSelectedHandler(undefined);
        }
    };

    const handleFunctionEdit = (value: FunctionModel) => {
        setFunctionModel(value);
        setIsNew(false);
        setShowForm(true);
    };

    const handleFunctionDelete = async (model: FunctionModel) => {
        console.log("Deleting Resource Model:", model);
        const component: ComponentInfo = {
            name: model.name.value,
            filePath: model.codedata.lineRange.fileName,
            startLine: model.codedata.lineRange.startLine.line,
            startColumn: model.codedata.lineRange.startLine.offset,
            endLine: model.codedata.lineRange.endLine.line,
            endColumn: model.codedata.lineRange.endLine.offset,
        };
        await rpcClient.getBIDiagramRpcClient().deleteByComponentInfo({ filePath, component });
        const projectStructure = await rpcClient.getBIDiagramRpcClient().getProjectStructure();
        const serviceArtifact = projectStructure.directoryMap[DIRECTORY_MAP.SERVICE].find(res => res.name === serviceIdentifier);
        if (serviceArtifact) {
            await rpcClient.getVisualizerRpcClient().openView({ type: EVENT_TYPE.UPDATE_PROJECT_LOCATION, location: { documentUri: serviceArtifact.path, position: serviceArtifact.position } });
            fetchService(serviceArtifact.position);
        }
    };

    const handleResourceSubmit = async (value: FunctionModel, openDiagram: boolean = false) => {
        setIsSaving(true);
        const lineRange: LineRange = {
            startLine: { line: position.startLine, offset: position.startColumn },
            endLine: { line: position.endLine, offset: position.endColumn },
        };
        let res = undefined;
        if (isNew) {
            res = await rpcClient
                .getServiceDesignerRpcClient()
                .addResourceSourceCode({ filePath, codedata: { lineRange }, function: value, service: serviceModel });
            const serviceArtifact = res.artifacts.find(res => res.isNew && res.name === serviceIdentifier);
            if (serviceArtifact) {
                if (openDiagram) {
                    const accessor = value.accessor.value;
                    const path = value.name.value;
                    const resourceIdentifier = `${accessor}#${path}`.toLowerCase();
                    const resource = serviceArtifact.resources.find(res => res.id === resourceIdentifier);
                    if (resource) {
                        await rpcClient.getVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { documentUri: resource.path, position: resource.position } });
                    }
                } else {
                    await rpcClient.getVisualizerRpcClient().openView({ type: EVENT_TYPE.UPDATE_PROJECT_LOCATION, location: { documentUri: serviceArtifact.path, position: serviceArtifact.position } });
                    fetchService(serviceArtifact.position, true);
                }
                setIsSaving(false);
                return;
            }
        } else {
            res = await rpcClient
                .getServiceDesignerRpcClient()
                .updateResourceSourceCode({ filePath, codedata: { lineRange }, function: value, service: serviceModel });
            const serviceArtifact = res.artifacts.find(res => res.name === serviceIdentifier);
            if (serviceArtifact) {
                fetchService(serviceArtifact.position);
                await rpcClient.getVisualizerRpcClient().openView({ type: EVENT_TYPE.UPDATE_PROJECT_LOCATION, location: { documentUri: serviceArtifact.path, position: serviceArtifact.position } });
                setIsSaving(false);
                return;
            }
        }
    };

    /**
     * This function invokes when a new function is added using right panel form.
     * 
     * @param value 
     */
    const handleFunctionSubmit = async (value: FunctionModel) => {
        setIsSaving(true);
        const lineRange: LineRange = {
            startLine: { line: position.startLine, offset: position.startColumn },
            endLine: { line: position.endLine, offset: position.endColumn },
        };
        let res = undefined;
        if (isNew) {
            res = await rpcClient
                .getServiceDesignerRpcClient()
                .addFunctionSourceCode({ filePath, codedata: { lineRange }, function: value });
            const serviceArtifact = res.artifacts.find(res => res.name === serviceIdentifier);
            if (serviceArtifact) {
                fetchService(serviceArtifact.position);
                await rpcClient.getVisualizerRpcClient().openView({ type: EVENT_TYPE.UPDATE_PROJECT_LOCATION, location: { documentUri: serviceArtifact.path, position: serviceArtifact.position } });
            }
        } else {
            res = await rpcClient
                .getServiceDesignerRpcClient()
                .updateResourceSourceCode({ filePath, codedata: { lineRange }, function: value });
            const serviceArtifact = res.artifacts.find(res => res.name === serviceIdentifier);
            if (serviceArtifact) {
                fetchService(serviceArtifact.position);
                await rpcClient.getVisualizerRpcClient().openView({ type: EVENT_TYPE.UPDATE_PROJECT_LOCATION, location: { documentUri: serviceArtifact.path, position: serviceArtifact.position } });
            }
        }
        setIsNew(false);
        handleNewFunctionClose();
        handleFunctionConfigClose();
        setIsSaving(false);
    };

    const handleFunctionConfigClose = () => {
        setShowFunctionConfigForm(false);
    };

    const handleInitFunctionClose = () => {
        setIsNew(false);
    };

    const handleAddHandleClose = () => {
        setIsNew(false);
    };

    const handleServiceTryIt = () => {
        const basePath = serviceModel.properties?.basePath?.value?.trim();
        const listener = serviceModel.properties?.listener?.value?.trim();
        const commands = ["ballerina.tryIt", false, undefined, { basePath, listener }];
        rpcClient.getCommonRpcClient().executeCommand({ commands });
    }

    const handleExportOAS = () => {
        rpcClient.getServiceDesignerRpcClient().exportOASFile({});
    };

    const handleAddListener = () => {
        // TODO: Implement add listener functionality
        console.log("Add listener clicked");
    };

    const handleFieldEdit = () => {
    };

    const handleFieldDelete = () => {
    };

    const handleAddServiceField = () => {
        // TODO: Implement add service field functionality
        console.log("Add service field clicked");
    };

    const findIcon = (label: string) => {
        label = label.toLowerCase();
        switch (true) {
            case label.includes("listener"):
                return "bell";
            case label.includes("path") || label.includes("base"):
                return "link";
            case label.includes("port"):
                return "ports";
            case label.includes("host"):
                return "server";
            case label.includes("name") || label.includes("queue"):
                return "tag";
            case label.includes("timeout"):
                return "clock";
            case label.includes("ssl") || label.includes("secure"):
                return "lock";
            case label.includes("config"):
                return "gear";
            default:
                return "info";
        }
    };

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchValue(event.target.value);
    };

    const haveServiceTypeName = serviceModel?.properties["serviceTypeName"]?.value;

    const openInit = async (resource: ProjectStructureArtifactResponse) => {
        await rpcClient
            .getVisualizerRpcClient()
            .openView({ type: EVENT_TYPE.OPEN_VIEW, location: { position: resource.position, documentUri: resource.path } });
    }


    const resourcesCount = resources
        .filter((resource) => resource.type === DIRECTORY_MAP.RESOURCE)
        .filter((resource) => {
            const search = searchValue.toLowerCase();
            const nameMatch = resource.name && resource.name.toLowerCase().includes(search);
            const iconMatch = resource.icon && resource.icon.toLowerCase().includes(search);
            return nameMatch || iconMatch;
        })
        .length;

    const remoteFunctionsCount = resources
        .filter((resource) => resource.type === DIRECTORY_MAP.REMOTE)
        .filter((resource) => {
            const search = searchValue.toLowerCase();
            const nameMatch = resource.name && resource.name.toLowerCase().includes(search);
            const iconMatch = resource.icon && resource.icon.toLowerCase().includes(search);
            return nameMatch || iconMatch;
        })
        .length;

    function createLineRange(filePath: string, position: NodePosition): LineRange {
        return {
            fileName: filePath,
            startLine: {
                line: position.startLine ?? 1,
                offset: position.startColumn ?? 0
            },
            endLine: {
                line: position.endLine ?? position.startLine ?? 1,
                offset: position.endColumn ?? position.startColumn ?? 0
            }
        };
    }

    return (
        <View>
            <TopNavigationBar />
            {!serviceModel && (
                <LoadingContainer>
                    <LoadingRing message="Loading Service..." />
                </LoadingContainer>
            )}
            {
                serviceModel && (
                    <>
                        <TitleBar
                            title={serviceModel.name}
                            subtitle={"Implement and configure your service"}
                            actions={
                                <>
                                    <Button appearance="secondary" tooltip="Edit Service" onClick={handleServiceEdit}>
                                        <Icon
                                            name="bi-settings"
                                            sx={{
                                                marginRight: 5,
                                                fontSize: "16px",
                                                width: "16px",
                                            }}
                                        /> Configure
                                    </Button>
                                    {
                                        serviceModel && (isHttpService || isMcpService) && (
                                            <>
                                                <Button appearance="secondary" tooltip="Try Service" onClick={handleServiceTryIt}>
                                                    <Icon name="play" isCodicon={true} sx={{ marginRight: 8, fontSize: 16 }} /> <ButtonText>Try It</ButtonText>
                                                </Button>
                                            </>
                                        )
                                    }
                                    {serviceModel && !isMcpService && dropdownOptions.length > 0 && (
                                        <AddServiceElementDropdown
                                            buttonTitle="More"
                                            toolTip="More options"
                                            defaultOption="reusable-function"
                                            onOptionChange={handleAddDropdownOption}
                                            options={dropdownOptions}
                                        />
                                    )}
                                </>
                            }
                        />

                        <ServiceContainer>
                            {/* Service Metadata - Compact View */}
                            {(listeners.length > 0 || readonlyProperties.size > 0) && (
                                <ServiceMetadataContainer>
                                    <MetadataRow>
                                        {listeners.length > 0 && (
                                            <>
                                                {listeners.map((listener, index) => (
                                                    <PropertyInline key={`${index}-listener`}>
                                                        <Icon name="radio-tower" isCodicon sx={{ fontSize: 12 }} />
                                                        <PropertyKey>Listener:</PropertyKey>
                                                        <PropertyValue>
                                                            {listener.includes(":") ? getReadableListenerName(listener) : listener}
                                                        </PropertyValue>
                                                    </PropertyInline>
                                                ))}
                                            </>
                                        )}
                                        {readonlyProperties.size > 0 && (
                                            <>
                                                {
                                                    Array.from(readonlyProperties).map(prop => (
                                                        <PropertyInline key={prop.label}>
                                                            <PropertyKey>{prop.label}:</PropertyKey>
                                                            <PropertyValue>
                                                                {Array.isArray(prop.value) ? prop.value.join(", ") : removeForwardSlashes(prop.value)}
                                                            </PropertyValue>
                                                        </PropertyInline>
                                                    ))
                                                }
                                            </>
                                        )}
                                    </MetadataRow>

                                    {/* {resources?.
                                        filter((func) => func.name === "init")
                                        .map((functionModel, index) => (
                                            <MetadataRow>
                                                <MetadataLabel> Initialization Function:</MetadataLabel>
                                                <Typography key={`${index}-value`} variant="body3">
                                                    <LinkButton
                                                        sx={{ fontSize: 12, padding: 8, gap: 4, justifyContent: "center" }}
                                                        onClick={() => openInit(functionModel)}
                                                    >
                                                        {functionModel.name}
                                                    </LinkButton>
                                                </Typography>
                                            </MetadataRow>
                                        ))} */}
                                </ServiceMetadataContainer>
                            )}


                            {resources.filter((resource) => resource.type === DIRECTORY_MAP.FUNCTION && resource.name === "init").length > 0 && (
                                <>
                                    <SectionHeader
                                        title="Initialization Function"
                                        subtitle={`Define the initialization logic for the service`}
                                    >
                                    </SectionHeader>
                                    <FunctionsContainer>
                                        {resources
                                            .filter((resource) => resource.type === DIRECTORY_MAP.FUNCTION && resource.name === "init")
                                            .map((resource, index) => (
                                                <ResourceAccordionV2
                                                    methodName="INIT"
                                                    key={`${index}-${resource.name}`}
                                                    resource={resource}
                                                    readOnly={serviceModel.properties.hasOwnProperty('serviceTypeName')}
                                                    onEditResource={handleFunctionEdit}
                                                    onDeleteResource={handleFunctionDelete}
                                                    onResourceImplement={() => { openInit(resource) }}
                                                />
                                            ))}
                                    </FunctionsContainer>

                                </>
                            )}


                            {/* Listing Resources in HTTP */}
                            {isHttpService && (
                                <>

                                    <>
                                        <SectionHeader
                                            title="Resources"
                                            subtitle={`${resourcesCount === 0 ? `` : 'Define how the service responds to HTTP requests'}`}
                                        >
                                            <ActionGroup>
                                                {resources.length > 10 && (
                                                    <TextField placeholder="Search..." sx={{ width: 200 }} onChange={handleSearch} value={searchValue} />
                                                )}
                                                {!haveServiceTypeName && resourcesCount > 0 && (
                                                    <Button appearance="primary" tooltip="Add Resource" onClick={handleNewResourceFunction}>
                                                        <Codicon name="add" sx={{ marginRight: 8 }} /> <ButtonText>Resource</ButtonText>
                                                    </Button>
                                                )}
                                            </ActionGroup>
                                        </SectionHeader>
                                        {resourcesCount > 0 && (
                                            <FunctionsContainer>
                                                {resources
                                                    .filter((resource) => {
                                                        const search = searchValue.toLowerCase();
                                                        const nameMatch = resource.name && resource.name.toLowerCase().includes(search);
                                                        const iconMatch = resource.icon && resource.icon.toLowerCase().includes(search);
                                                        return nameMatch || iconMatch;
                                                    })
                                                    .filter((resource) => resource.type === DIRECTORY_MAP.RESOURCE)
                                                    .map((resource, index) => (
                                                        <ResourceAccordionV2
                                                            key={`${index}-${resource.name}`}
                                                            resource={resource}
                                                            readOnly={serviceModel.properties.hasOwnProperty('serviceTypeName')}
                                                            onEditResource={handleFunctionEdit}
                                                            onDeleteResource={handleFunctionDelete}
                                                            onResourceImplement={handleOpenDiagram}
                                                        />
                                                    ))}
                                            </FunctionsContainer>
                                        )}
                                        {resourcesCount === 0 && (
                                            <EmptyReadmeContainer>
                                                <Description variant="body2">
                                                    No resources found. Add a new resource.
                                                </Description>
                                                <Button
                                                    appearance="primary"
                                                    onClick={handleNewResourceFunction}>
                                                    <Codicon name="add" sx={{ marginRight: 5 }} />
                                                    Add Resource
                                                </Button>
                                            </EmptyReadmeContainer>
                                        )}
                                    </>
                                </>
                            )}

                            {/* Listing Tools in MCP */}
                            {isMcpService && (
                                <>
                                    <SectionHeader
                                        title="Tools"
                                        subtitle={`${remoteFunctionsCount === 0 ? `` : 'Define how the mcp service responds to tool calls'}`}
                                    >
                                        <ActionGroup>
                                            {resources.length > 10 && (
                                                <TextField placeholder="Search..." sx={{ width: 200 }} onChange={handleSearch} value={searchValue} />
                                            )}
                                            {!haveServiceTypeName && remoteFunctionsCount > 0 && (
                                                <Button appearance="primary" tooltip="Add Tool" onClick={handleNewMcpTool}>
                                                    <Codicon name="add" sx={{ marginRight: 8 }} /> <ButtonText>Tool</ButtonText>
                                                </Button>
                                            )}
                                        </ActionGroup>
                                    </SectionHeader>
                                    <FunctionsContainer>
                                        {resources
                                            .filter((resource) => {
                                                const search = searchValue.toLowerCase();
                                                const nameMatch = resource.name && resource.name.toLowerCase().includes(search);
                                                const iconMatch = resource.icon && resource.icon.toLowerCase().includes(search);
                                                return nameMatch || iconMatch;
                                            })
                                            .map((resource, index) => (
                                                <ResourceAccordionV2
                                                    key={`${index}-${resource.name}`}
                                                    resource={resource}
                                                    readOnly={serviceModel.properties.hasOwnProperty('serviceTypeName')}
                                                    onEditResource={handleFunctionEdit}
                                                    onDeleteResource={handleFunctionDelete}
                                                    onResourceImplement={handleOpenDiagram}
                                                    isMcpTool={true}
                                                />
                                            ))}
                                    </FunctionsContainer>

                                    {remoteFunctionsCount === 0 && (
                                        <EmptyReadmeContainer>
                                            <Description variant="body2">
                                                No tools found. Add a new tool.
                                            </Description>
                                            <Button
                                                appearance="primary"
                                                onClick={handleNewMcpTool}>
                                                <Codicon name="add" sx={{ marginRight: 5 }} />
                                                Add Tool
                                            </Button>
                                        </EmptyReadmeContainer>
                                    )}
                                </>
                            )}

                            {/* Listing service type bound functions */}
                            {!(isHttpService || isMcpService) && (
                                <>
                                    <SectionHeader
                                        title="Event Handlers"
                                        subtitle={enabledHandlers.length === 0 ? "" : `Define how the service responds to events`}
                                    >
                                        <ActionGroup>
                                            {enabledHandlers.length !== 0 && unusedHandlers.length > 0 && (
                                                <Button appearance="primary" tooltip="Add Handler" onClick={onSelectAddHandler}>
                                                    <Codicon name="add" sx={{ marginRight: 8 }} /> <ButtonText>Handler</ButtonText>
                                                </Button>
                                            )}
                                        </ActionGroup>
                                    </SectionHeader>
                                    <FunctionsContainer>
                                        {enabledHandlers.map((functionModel, index) => (
                                            <ResourceAccordion
                                                key={`${index}-${functionModel.name.value}`}
                                                functionModel={functionModel}
                                                goToSource={() => { }}
                                                onEditResource={handleFunctionEdit}
                                                onDeleteResource={handleFunctionDelete}
                                                onResourceImplement={handleOpenDiagram}
                                            />
                                        ))}
                                    </FunctionsContainer>

                                    {enabledHandlers.length === 0 && (
                                        <EmptyReadmeContainer>
                                            <Description variant="body2">
                                                No event handlers found. Add a new event handler.
                                            </Description>
                                            <Button
                                                appearance="primary"
                                                onClick={onSelectAddHandler}>
                                                <Codicon name="add" sx={{ marginRight: 5 }} />
                                                Add Handler
                                            </Button>
                                        </EmptyReadmeContainer>
                                    )}
                                </>
                            )}

                            {/* Listing service type bound functions */}
                            {/* {(initMethod && (
                                <>
                                    <SectionHeader
                                        title="Initialization Function"
                                        subtitle="Define the initialization logic for the service"
                                    />
                                    <FunctionsContainer>
                                        <ResourceAccordion
                                            key={`init-${initMethod.name.value}`}
                                            functionModel={initMethod}
                                            goToSource={() => { }}
                                            onEditResource={handleFunctionEdit}
                                            onDeleteResource={handleFunctionDelete}
                                            onResourceImplement={handleOpenDiagram}
                                        />
                                    </FunctionsContainer>
                                </>
                            ))} */}

                            {/* Listing service type bound functions */}
                            {/* {(objectMethods.length > 0 && (
                                <>
                                    <SectionHeader
                                        title="Functions"
                                        subtitle="Reusable functions within the service"
                                    />
                                    <FunctionsContainer>
                                        {objectMethods.map((functionModel, index) => (
                                            <ResourceAccordion
                                                key={`${index}-${functionModel.name.value}`}
                                                functionModel={functionModel}
                                                goToSource={() => { }}
                                                onEditResource={handleFunctionEdit}
                                                onDeleteResource={handleFunctionDelete}
                                                onResourceImplement={handleOpenDiagram}
                                            />
                                        ))}
                                    </FunctionsContainer>
                                </>
                            ))} */}


                            {resources.filter((resource) => resource.type === DIRECTORY_MAP.FUNCTION && resource.name !== "init").length > 0 && (
                                <>
                                    <SectionHeader
                                        title="Functions"
                                        subtitle="Reusable functions within the service"
                                    >
                                        <ActionGroup>
                                            {/* {!haveServiceTypeName && resourcesCount > 0 && (
                                                <Button appearance="primary" tooltip="Add Sub Flow" onClick={handleNewResourceFunction}>
                                                    <Codicon name="add" sx={{ marginRight: 8 }} /> <ButtonText>Sub Flow</ButtonText>
                                                </Button>
                                            )} */}
                                        </ActionGroup>
                                    </SectionHeader>
                                    <FunctionsContainer>
                                        {resources
                                            .filter((resource) => {
                                                const search = searchValue.toLowerCase();
                                                const nameMatch = resource.name && resource.name.toLowerCase().includes(search);
                                                const iconMatch = resource.icon && resource.icon.toLowerCase().includes(search);
                                                return nameMatch || iconMatch;
                                            })
                                            .filter((resource) => resource.type === DIRECTORY_MAP.FUNCTION && resource.name !== "init")
                                            .map((resource, index) => (
                                                <ResourceAccordionV2
                                                    methodName="FUNC"
                                                    key={`${index}-${resource.name}`}
                                                    resource={resource}
                                                    readOnly={serviceModel.properties.hasOwnProperty('serviceTypeName')}
                                                    onEditResource={handleFunctionEdit}
                                                    onDeleteResource={handleFunctionDelete}
                                                    onResourceImplement={handleOpenDiagram}
                                                />
                                            ))}
                                    </FunctionsContainer>
                                </>
                            )}

                            {/* This is for adding a http resource */}
                            {functionModel && isHttpService && functionModel.kind === "RESOURCE" && isNew && (
                                <PanelContainer
                                    title={"Select HTTP Method to Add"}
                                    show={showForm}
                                    onClose={handleNewFunctionClose}
                                    width={400}
                                >
                                    <ResourceForm
                                        model={functionModel}
                                        isSaving={isSaving}
                                        onSave={handleResourceSubmit}
                                        onClose={handleNewFunctionClose}
                                        isNew={isNew}
                                        payloadContext={{
                                            serviceName: serviceModel.name || '',
                                            serviceBasePath: serviceModel.properties?.basePath?.value || '',
                                        }}
                                    />
                                </PanelContainer>
                            )}

                            {/* This is for editing a http resource */}
                            {functionModel && isHttpService && functionModel.kind === "RESOURCE" && !isNew && (
                                <PanelContainer
                                    title={"Resource Configuration"}
                                    show={showForm}
                                    onClose={handleNewFunctionClose}
                                    width={400}
                                >
                                    <ResourceForm
                                        model={functionModel}
                                        isSaving={isSaving}
                                        filePath={filePath}
                                        onSave={handleResourceSubmit}
                                        onClose={handleNewFunctionClose}
                                        payloadContext={{
                                            serviceName: serviceModel.name || '',
                                            serviceBasePath: serviceModel.properties?.basePath?.value || '',
                                        }}
                                    />
                                </PanelContainer>
                            )}

                            {/* This is for adding or editing functions with data binding */}
                            {functionModel && !isHttpService && !isMcpService && canDataBind(functionModel) && (
                                <PanelContainer
                                    title={"Message Handler Configuration"}
                                    show={showForm}
                                    onClose={handleNewFunctionClose}
                                    width={400}
                                >
                                    <DatabindForm
                                        model={functionModel}
                                        isSaving={isSaving}
                                        onSave={handleFunctionSubmit}
                                        onClose={handleNewFunctionClose}
                                    />
                                </PanelContainer>
                            )}

                            {/* This is for adding or editing functions */}
                            {functionModel && !isHttpService && !isMcpService && !canDataBind(functionModel) && (
                                <PanelContainer
                                    title={"Function Configuration"}
                                    show={showForm}
                                    onClose={handleNewFunctionClose}
                                    width={600}
                                >
                                    <FunctionForm
                                        model={functionModel}
                                        onSave={handleFunctionSubmit}
                                        onClose={handleNewFunctionClose}
                                    />
                                </PanelContainer>
                            )}

                            {/* This is for adding a new handler to the service */}
                            {serviceModel && !isHttpService && (
                                <PanelContainer
                                    title={"Select Handler to Add"}
                                    show={showFunctionConfigForm}
                                    onClose={handleFunctionConfigClose}
                                >
                                    <FunctionConfigForm
                                        isSaving={isSaving}
                                        serviceModel={serviceModel}
                                        onSubmit={handleFunctionSubmit}
                                        onSelect={onHandlerSelected}
                                        onBack={handleFunctionConfigClose}
                                    />
                                </PanelContainer>
                            )}

                            {/* This is for adding a init function to the service */}
                            <PanelContainer
                                title={"Add Initialization Function"}
                                show={!!initFunction}
                                onClose={handleCloseInitFunction}
                                onBack={handleCloseInitFunction}
                                width={400}
                            >
                                <FunctionForm
                                    model={initFunction}
                                    onSave={handleInitFunctionSave}
                                    onClose={handleCloseInitFunction}
                                />
                            </PanelContainer>

                            {functionModel && isMcpService && (
                                <PanelContainer
                                    title={"Tool Configuration"}
                                    show={showForm}
                                    onClose={handleNewFunctionClose}
                                    width={400}
                                >
                                    <McpToolForm
                                        model={functionModel}
                                        filePath={filePath}
                                        lineRange={createLineRange(filePath, position)}
                                        isSaving={isSaving}
                                        onSave={handleFunctionSubmit}
                                        onClose={handleNewFunctionClose}
                                    />
                                </PanelContainer>
                            )}
                        </ServiceContainer>
                    </>
                )
            }
        </View>
    );
}

interface SectionHeaderProps {
    title: string;
    subtitle: string;
    children?: React.ReactNode;
}

function SectionHeader({ title, subtitle, children }: SectionHeaderProps) {
    return (
        <HeaderContainer>
            <div>
                <Typography
                    variant="h3"
                    sx={{ marginLeft: 10, fontWeight: 'bold', marginBottom: 4 }}
                >
                    {title}
                </Typography>
                <Typography
                    variant="body3"
                    sx={{ marginLeft: 10, color: 'var(--vscode-descriptionForeground)', marginBottom: 0 }}
                >
                    {subtitle}
                </Typography>
            </div>
            {children}
        </HeaderContainer>
    );
}
