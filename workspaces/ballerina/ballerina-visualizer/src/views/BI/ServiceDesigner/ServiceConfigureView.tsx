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

import { useEffect, useState, useRef } from "react";
import styled from "@emotion/styled";
import { ConfigVariable, DIRECTORY_MAP, LineRange, ListenerModel, NodePosition, ProjectStructureArtifactResponse, ServiceModel } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Button, Codicon, Icon, LinkButton, ProgressRing, SidePanelBody, SplitView, TabPanel, ThemeColors, TreeView, TreeViewItem, Typography, View, ViewContent } from "@wso2/ui-toolkit";
import { TopNavigationBar } from "../../../components/TopNavigationBar";
import { TitleBar } from "../../../components/TitleBar";
import ListenerConfigForm from "./Forms/ListenerConfigForm";
import { ServiceEditView } from "./ServiceEditView";
import { LoadingContainer } from "../../styles";
import { LoadingRing } from "../../../components/Loader";
import DynamicModal from "../../../components/Modal";
import { getReadableListenerName } from "./utils";

const Container = styled.div`
    width: 100%;
    padding: 10px 0px 10px 8px;
    height: calc(100vh - 220px);
    overflow-y: auto;
`;

const SearchStyle = {
    width: '100%',

    '& > vscode-text-field': {
        width: '100%',
        borderRadius: '5px'
    },
};

const EmptyReadmeContainer = styled.div`
    display: flex;
    margin: 80px 0px;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    height: 100%;
`;

const Description = styled(Typography)`
    color: var(--vscode-descriptionForeground);
`;

const TitleBoxShadow = styled.div`
    box-shadow: var(--vscode-scrollbar-shadow) 0 6px 6px -6px inset;
    height: 3px;
`;

const TitleContent = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const SearchContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 15px;
    gap: 40px;
`;

const AccordionContainer = styled.div`
    width: 587px;
    margin-left: 16px;
    & h4 {
        margin: 7px 0px;
    }
    & .side-panel-body {
        padding: unset;
    }
`;

const ServiceConfigureListenerEditViewContainer = styled.div`
    display: "flex";
    flex-direction: "column";
    gap: 10;
    margin: 0 20px 20px 0;
`;

const ListenerConfigHeader = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    width: 568px;
`;


namespace S {
    export const Grid = styled.div<{ columns: number }>`
        display: grid;
        grid-template-columns: repeat(${({ columns }: { columns: number }) => columns}, minmax(0, 1fr));
        gap: 8px;
        width: 100%;
        margin-top: 8px;
        margin-bottom: 12px;
    `;
    export const Component = styled.div<{ enabled?: boolean }>`
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 5px;
        padding: 5px;
        border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
        border-radius: 5px;
        height: 36px;
        cursor: ${({ enabled }: { enabled?: boolean }) => (enabled ? "pointer" : "not-allowed")};
        font-size: 14px;
        min-width: 160px;
        max-width: 100%;
        ${({ enabled }: { enabled?: boolean }) => !enabled && "opacity: 0.5;"}
        &:hover {
            ${({ enabled }: { enabled?: boolean }) =>
            enabled &&
            `
                background-color: ${ThemeColors.PRIMARY_CONTAINER};
                border: 1px solid ${ThemeColors.HIGHLIGHT};
            `}
        }
    `;
    export const ComponentTitle = styled.div`
        white-space: nowrap;
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
        word-break: break-word;
    `;
    export const IconContainer = styled.div`
        padding: 0 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        & svg {
            height: 16px;
            width: 16px;
        }
    `;
}

const searchIcon = (<Codicon name="search" sx={{ cursor: "auto" }} />);

export interface ServiceConfigureProps {
    filePath: string;
    position: NodePosition;
    listenerName?: string;
}

interface CategoryWithModules {
    name: string;
    modules: string[];
}

type ConfigVariablesState = {
    [category: string]: {
        [module: string]: ConfigVariable[];
    };
};

interface ReadonlyProperty {
    label: string;
    value: string | string[];
}

const Overlay = styled.div`
    position: fixed;
    width: 100vw;
    height: 100vh;
    background: var(--vscode-settings-rowHoverBackground);
    z-index: 1000;
`;

export function ServiceConfigureView(props: ServiceConfigureProps) {

    const { rpcClient } = useRpcContext();
    const [serviceModel, setServiceModel] = useState<ServiceModel>(undefined);
    const [listeners, setListeners] = useState<ProjectStructureArtifactResponse[]>([]);

    const [showAttachListenerModal, setShowAttachListenerModal] = useState<boolean>(false);

    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [hasChanges, setHasChanges] = useState<boolean>(false);

    const [selectedListener, setSelectedListener] = useState<string | null>(null);

    const [changeMap, setChangeMap] = useState<{ [key: string]: { data: ServiceModel | ListenerModel, isService: boolean, filePath: string } }>({});
    // Helper function to create key from filePath and position
    const getChangeKey = (filePath: string, position: NodePosition) => {
        return `${filePath}:${position.startLine}:${position.startColumn}:${position.endLine}:${position.endColumn}`;
    };
    // Helper function to add a change to the map
    const addChangeToMap = (filePath: string, position: NodePosition, data: ServiceModel | ListenerModel, isService: boolean) => {
        const key = getChangeKey(filePath, position);
        setChangeMap(prev => ({ ...prev, [key]: { data, isService, filePath } }));
    };


    const [configTitle, setConfigTitle] = useState<string>("");
    const [visibleSection, setVisibleSection] = useState<string | null>("service"); // Track which section is visible

    // Create ref map for accordion containers
    const accordionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    // Create ref for service section
    const serviceRef = useRef<HTMLDivElement | null>(null);

    // Create ref for the scrollable container
    const containerRef = useRef<HTMLDivElement | null>(null);

    // State to manage which accordion is expanded
    const [expandedAccordion, setExpandedAccordion] = useState<string | null>(null);

    const [listenerType, setListenerType] = useState<"SINGLE" | "MULTIPLE">("MULTIPLE");
    const [haveServiceConfigs, setHaveServiceConfigs] = useState<boolean>(true);

    useEffect(() => {
        fetchService(props.position);
    }, [props.position]);

    useEffect(() => {
        if (props.listenerName) {
            handleOnListenerClick(props.listenerName);
        }
    }, [props.listenerName]);

    // Set up Intersection Observer to track visible sections
    useEffect(() => {
        if (!containerRef.current) return;

        const observerOptions = {
            root: containerRef.current,
            threshold: Array.from({ length: 21 }, (_, i) => i * 0.05), // Check at 0%, 5%, 10%, ... 100% visibility
            rootMargin: '0px 0px 0px 0px', // Offset for the sticky header area
        };

        const topOffset = -60;
        const observerCallback = (entries: IntersectionObserverEntry[]) => {
            // Get all currently visible sections with their visibility ratios
            const visibleSections: Array<{ id: string; ratio: number; isService: boolean }> = [];

            // Check all observed elements, not just the ones in the current callback
            if (serviceRef.current) {
                const serviceRect = serviceRef.current.getBoundingClientRect();
                const containerRect = containerRef.current!.getBoundingClientRect();
                const effectiveTop = containerRect.top + 20; // Account for rootMargin

                if (serviceRect.bottom > effectiveTop && serviceRect.top < containerRect.bottom) {
                    const visibleHeight = Math.min(serviceRect.bottom, containerRect.bottom) - Math.max(serviceRect.top, effectiveTop);
                    const ratio = visibleHeight / serviceRect.height;
                    if (ratio > 0) {
                        visibleSections.push({ id: 'service', ratio, isService: true });
                    }
                }
            }

            // Check all listener sections
            Object.entries(accordionRefs.current).forEach(([id, ref]) => {
                if (ref) {
                    const rect = ref.getBoundingClientRect();
                    const containerRect = containerRef.current!.getBoundingClientRect();
                    const effectiveTop = containerRect.top + topOffset;

                    if (rect.bottom > effectiveTop && rect.top < containerRect.bottom) {
                        const visibleHeight = Math.min(rect.bottom, containerRect.bottom) - Math.max(rect.top, effectiveTop);
                        const ratio = visibleHeight / rect.height;
                        if (ratio > 0) {
                            visibleSections.push({ id, ratio, isService: false });
                        }
                    }
                }
            });

            // Prioritize service if it's visible
            const serviceSection = visibleSections.find(s => s.isService);
            if (serviceSection && serviceSection.ratio > 0.05) {
                setVisibleSection('service');
                setConfigTitle(`${serviceModel.name} Configuration`);
            } else {
                // Get all visible listeners
                const visibleListenerIds = visibleSections
                    .filter(s => !s.isService && s.ratio > 0.01) // At least 1% visible
                    .map(s => s.id);
                
                if (visibleListenerIds.length > 0) {
                    // Find the first listener (topmost) that is visible
                    // We iterate through the listeners array which is in document order
                    const firstVisibleListener = listeners.find(l => visibleListenerIds.includes(l.id));
                    
                    if (firstVisibleListener) {
                        setVisibleSection(firstVisibleListener.id);
                        const displayName = firstVisibleListener.name.includes(":")
                            ? getReadableListenerName(firstVisibleListener.name)
                            : firstVisibleListener.name;
                        setConfigTitle(`Configuration for ${displayName}`);
                    }
                }
            }
        };

        const observer = new IntersectionObserver(observerCallback, observerOptions);

        // Observe service section
        if (serviceRef.current) {
            observer.observe(serviceRef.current);
        }

        // Observe all listener sections
        Object.values(accordionRefs.current).forEach(ref => {
            if (ref) {
                observer.observe(ref);
            }
        });

        // Also add a scroll listener for more responsive updates
        const handleScroll = () => {
            observerCallback([]);
        };

        containerRef.current.addEventListener('scroll', handleScroll);

        return () => {
            observer.disconnect();
            if (containerRef.current) {
                containerRef.current.removeEventListener('scroll', handleScroll);
            }
        };
    }, [listeners, serviceModel]);

    const handleOnServiceSelect = () => {
        // Clear selected listener when service is selected
        setSelectedListener(null);
        // Scroll to service section
        if (serviceRef.current) {
            serviceRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
        // Clear any expanded accordion when switching to service view
        setExpandedAccordion(null);
    };

    const fetchService = (targetPosition: NodePosition) => {
        const lineRange: LineRange = {
            startLine: { line: targetPosition.startLine, offset: targetPosition.startColumn },
            endLine: { line: targetPosition.endLine, offset: targetPosition.endColumn },
        };
        try {
            rpcClient
                .getServiceDesignerRpcClient()
                .getServiceModelFromCode({ filePath: props.filePath, codedata: { lineRange } })
                .then((res) => {
                    console.log("Service Model: ", res.service);
                    // Set the service model
                    setServiceModel(res.service);
                    setConfigTitle(`${res.service.name} Configuration`);
                    // Set the service listeners
                    setServiceListeners(res.service);
                    // Find the listener type
                    findListenerType(res.service);
                });
        } catch (error) {
            console.log("Error fetching service model: ", error);
        }
    };

    const findListenerType = (service: ServiceModel) => {
        let detectedType: "SINGLE" | "MULTIPLE" = "MULTIPLE";
        let foundType = false;
        for (const key in service.properties) {
            const expression = service.properties[key];
            if (
                expression.valueType === "MULTIPLE_SELECT_LISTENER" ||
                expression.valueType === "SINGLE_SELECT_LISTENER"
            ) {
                detectedType = expression.valueType === "SINGLE_SELECT_LISTENER" ? "SINGLE" : "MULTIPLE";
                foundType = true;
                // Check if only one property is enabled
                const enabledCount = Object.values(service.properties).filter((prop: any) => prop.enabled).length;
                if (enabledCount === 1) {
                    setHaveServiceConfigs(false);
                }
                break;
            }
        }
        console.log("Listener type: ", detectedType);
        setListenerType(detectedType);
    }

    const setServiceListeners = (service: ServiceModel) => {
        rpcClient
            .getBIDiagramRpcClient()
            .getProjectStructure()
            .then((res) => {
                const listeners = res.directoryMap[DIRECTORY_MAP.LISTENER];
                if (service?.properties?.listener) {
                    const listenerProperty = service.properties.listener.properties;
                    const listenersToSet: ProjectStructureArtifactResponse[] = [];
                    Object.keys(listenerProperty).forEach((listener) => {
                        const listenerItem = listeners?.find((l) => l.name === listener);
                        if (listenerItem) {
                            listenersToSet.push(listenerItem);
                        } else {
                            const property = listenerProperty[listener];
                            listenersToSet.push({
                                id: listener,
                                name: listener,
                                path: props.filePath,
                                type: "TYPE",
                                position: {
                                    startLine: property.codedata.lineRange.startLine.line,
                                    startColumn: property.codedata.lineRange.startLine.offset,
                                    endLine: property.codedata.lineRange.endLine.line,
                                    endColumn: property.codedata.lineRange.endLine.offset,
                                },
                            });
                        }
                    });
                    setListeners(listenersToSet);
                }
            });
    };


    const handleOnAttachListener = async (listenerName: string) => {
        if (serviceModel.properties['listener'].value && serviceModel.properties['listener'].values.length === 0) {
            serviceModel.properties['listener'].values = [serviceModel.properties['listener'].value];
        }
        serviceModel.properties['listener'].values.push(listenerName);
        const res = await rpcClient.getServiceDesignerRpcClient().updateServiceSourceCode({ filePath: props.filePath, service: serviceModel });
        const updatedArtifact = res.artifacts.at(0);
        await fetchService(updatedArtifact.position);
        setShowAttachListenerModal(false);
        setChangeMap({});
    }

    const handleOnDetachListener = async (listenerName: string) => {
        serviceModel.properties['listener'].values = serviceModel.properties['listener'].values.filter(listener => listener !== listenerName);
        const res = await rpcClient.getServiceDesignerRpcClient().updateServiceSourceCode({ filePath: props.filePath, service: serviceModel });
        const updatedArtifact = res.artifacts.at(0);
        await fetchService(updatedArtifact.position);
        setChangeMap({});
    }

    const handleOnListenerClick = (listenerId: string) => {
        // Set the selected listener for highlighting
        setSelectedListener(listenerId);

        // Expand the clicked accordion
        setExpandedAccordion(listenerId);

        // Scroll to the corresponding accordion container
        setTimeout(() => {
            const accordionElement = accordionRefs.current[listenerId];
            if (accordionElement) {
                accordionElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }, 100); // Small delay to ensure tab switch and DOM update
    }

    const handleListenerChange = async (data: ListenerModel, filePath: string, position: NodePosition) => {
        addChangeToMap(filePath, position, data, false);
        setHasChanges(true);
        setIsSaving(false);
    }

    const handleServiceChange = async (data: ServiceModel, filePath: string, position: NodePosition) => {
        addChangeToMap(filePath, position, data, true);
        setHasChanges(true);
        setIsSaving(false);
    }

    const handleSave = async () => {
        setIsSaving(true);
        const changes = Object.values(changeMap);
        for (const change of changes) {
            if (change.isService) {
                const res = await rpcClient.getServiceDesignerRpcClient().updateServiceSourceCode({ filePath: change.filePath, service: change.data as ServiceModel });
                const updatedArtifact = res.artifacts.at(0);
                await fetchService(updatedArtifact.position);
            } else {
                await rpcClient.getServiceDesignerRpcClient().updateListenerSourceCode({ filePath: change.filePath, listener: change.data as ListenerModel });
            }
        }
        setChangeMap({});
        setHasChanges(false);
        setIsSaving(false);
    }

    return (
        <View>
            <TopNavigationBar />
            {!serviceModel && (
                <LoadingContainer>
                    <LoadingRing message="Loading service..." />
                </LoadingContainer>
            )}
            {
                serviceModel && (
                    <>
                        <TitleBar title={`${serviceModel.name} Configuration`} subtitle="Configure and manage service details" />
                        <ViewContent padding>
                            <div style={{ height: 'calc(100vh - 220px)' }}>
                                <div style={{ width: "auto" }}>
                                    <SplitView defaultWidths={[20, 80]}>
                                        {/* Left side tree view */}
                                        <div id={`package-treeview`} style={{ padding: "10px 0 50px 0" }}>
                                            {haveServiceConfigs && (
                                                <TreeViewItem
                                                    id="service"
                                                    onSelect={handleOnServiceSelect}
                                                    selectedId={serviceModel.name}
                                                    sx={{
                                                        border: !selectedListener
                                                            ? '1px solid var(--vscode-focusBorder)'
                                                            : 'none'
                                                    }}
                                                >
                                                    <Typography
                                                        variant="body3"
                                                        sx={{
                                                            fontWeight: !selectedListener
                                                                ? 'bold' : 'normal'
                                                        }}
                                                    >{serviceModel.name}</Typography>
                                                </TreeViewItem>
                                            )}

                                            {/* Group all the listeners under "Service listeners" */}
                                            {listeners.length > 0 && (
                                                <TreeView
                                                    rootTreeView
                                                    id="service-listeners"
                                                    expandByDefault={true}
                                                    content={
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                height: '22px',
                                                                alignItems: 'center',
                                                            }}>
                                                            <Typography
                                                                variant="body3"
                                                                sx={{
                                                                    fontWeight: 'normal'
                                                                }}
                                                            >
                                                                Attached Listeners
                                                            </Typography>
                                                        </div>
                                                    }
                                                >
                                                    {/* Map all the listeners */}
                                                    {listeners
                                                        .map((listener, index) => (
                                                            <TreeViewItem
                                                                key={listener.id}
                                                                id={listener.id}
                                                                sx={{
                                                                    backgroundColor: 'transparent',
                                                                    paddingLeft: '35px',
                                                                    height: '25px',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                    boxSizing: 'border-box',
                                                                    border: selectedListener === listener.id
                                                                        ? '1px solid var(--vscode-focusBorder)'
                                                                        : 'none'
                                                                }}
                                                                selectedId={listener.id}
                                                            >
                                                                <div
                                                                    style={{
                                                                        display: 'flex',
                                                                        height: '22px',
                                                                        alignItems: 'center',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                    onClick={(e) => {
                                                                        handleOnListenerClick(listener.id);
                                                                    }}
                                                                >
                                                                    <Typography
                                                                        variant="body3"
                                                                        sx={{
                                                                            fontWeight: selectedListener === listener.id
                                                                                ? 'bold' : 'normal'
                                                                        }}
                                                                    >
                                                                        {listener.name.includes(":") ? getReadableListenerName(listener.name) : listener.name}
                                                                    </Typography>
                                                                </div>
                                                            </TreeViewItem>
                                                        ))}
                                                </TreeView>
                                            )}
                                        </div>
                                        {/* Right side view */}
                                        <div style={{ height: '100%' }}>
                                            <>
                                                <div
                                                    id="TitleDiv"
                                                    style={{
                                                        position: "sticky", top: 0, color: "var(--vscode-editor-foreground)",
                                                        backgroundColor: "var(--vscode-editor-background)"
                                                    }}>
                                                    <TitleContent>
                                                        <Typography
                                                            variant="h2"
                                                            sx={{
                                                                padding: "0px 0 0 20px",
                                                                margin: "10px 0px",
                                                                color: "var(--vscode-foreground)"
                                                            }}>
                                                            {configTitle}
                                                        </Typography>

                                                        <Button appearance="primary" onClick={handleSave} disabled={isSaving || !hasChanges}>
                                                            {isSaving ? <Typography variant="progress">Saving...</Typography> : <>Save Changes</>}
                                                        </Button>
                                                    </TitleContent>
                                                    <TitleBoxShadow />
                                                </div>
                                                <Container ref={containerRef}>
                                                    <>
                                                        {!serviceModel && (
                                                            <LoadingContainer>
                                                                <LoadingRing message="Loading service..." />
                                                            </LoadingContainer>
                                                        )}
                                                        {serviceModel && (
                                                            <div>
                                                                {haveServiceConfigs && (
                                                                    <div ref={serviceRef} data-section-id="service">
                                                                        <ServiceEditView filePath={props.filePath} position={props.position} onChange={handleServiceChange} />
                                                                    </div>
                                                                )}
                                                                {listeners.map((listener) => (
                                                                    <AccordionContainer
                                                                        key={listener.id}
                                                                        ref={(el) => {
                                                                            accordionRefs.current[listener.id] = el;

                                                                        }}
                                                                        data-section-id={listener.id}
                                                                    >
                                                                        <div>
                                                                            {/* Only show the listener header if it's not the currently visible section in the sticky title */}
                                                                            {visibleSection !== listener.id && (
                                                                                <ListenerConfigHeader>
                                                                                    <Typography variant="h2" sx={{ marginBottom: '10px', marginTop: '10px' }}>Configuration for {listener.name.includes(":") ? getReadableListenerName(listener.name) : listener.name} </Typography>
                                                                                    {/* Add detach button to the listener configuration only if there are more than one listener attached */}
                                                                                    {listeners.length > 1 && (
                                                                                        <Button appearance="secondary" onClick={() => {
                                                                                            handleOnDetachListener(listener.name);
                                                                                        }}> <Codicon name="trash" /></Button>
                                                                                    )}
                                                                                </ListenerConfigHeader>
                                                                            )}
                                                                            <ServiceConfigureListenerEditView
                                                                                filePath={listener.path}
                                                                                position={listener.position}
                                                                                onChange={handleListenerChange}
                                                                            />
                                                                        </div>
                                                                    </AccordionContainer>
                                                                ))}
                                                                {/* Add a button to attach a new listener and when clicked, open a new modal to select a listener if multiple listener are allowed */}
                                                                {listenerType === "MULTIPLE" && (
                                                                    <LinkButton sx={{ marginTop: '10px', marginLeft: '18px' }} onClick={() => {
                                                                        setShowAttachListenerModal(true);
                                                                    }}> <Codicon name="add" /> Attach Listener</LinkButton>
                                                                )}

                                                                <DynamicModal
                                                                    key="attach-listener-modal"
                                                                    title="Attach Listener"
                                                                    anchorRef={undefined}
                                                                    width={420}
                                                                    height={450}
                                                                    openState={showAttachListenerModal}
                                                                    setOpenState={setShowAttachListenerModal}
                                                                >
                                                                    <AttachListenerModal
                                                                        filePath={props.filePath}
                                                                        moduleName={serviceModel.moduleName}
                                                                        onAttachListener={handleOnAttachListener}
                                                                        attachedListeners={listeners.map(listener => listener.name)}
                                                                    />
                                                                </DynamicModal>
                                                            </div>
                                                        )}
                                                    </>
                                                </Container >
                                            </>
                                        </div>
                                    </SplitView>
                                </div>
                            </div>
                        </ViewContent >
                    </>
                )}
        </View >
    );
}

export default ServiceConfigureView;


interface ServiceConfigureListenerEditViewProps {
    filePath: string;
    position: NodePosition;
    onChange?: (data: ListenerModel, filePath: string, position: NodePosition) => void;
}

function ServiceConfigureListenerEditView(props: ServiceConfigureListenerEditViewProps) {
    const { filePath, position, onChange } = props;
    const { rpcClient } = useRpcContext();
    const [listenerModel, setListenerModel] = useState<ListenerModel>(undefined);

    const [saving, setSaving] = useState<boolean>(false);

    const [savingText, setSavingText] = useState<string>("Saving...");

    useEffect(() => {
        const lineRange: LineRange = { startLine: { line: position.startLine, offset: position.startColumn }, endLine: { line: position.endLine, offset: position.endColumn } };
        rpcClient.getServiceDesignerRpcClient().getListenerModelFromCode({ filePath, codedata: { lineRange } }).then(res => {
            console.log("Editing Listener Model: ", res.listener)
            setListenerModel(res.listener);
        })
    }, [position]);

    const onSubmit = async (value: ListenerModel) => {
        setSaving(true);
        const res = await rpcClient.getServiceDesignerRpcClient().updateListenerSourceCode({ filePath, listener: value });
        setSavingText("Saved");
        setTimeout(() => {
            setSavingText("Save");
            setSaving(false);
        }, 1000);
    }

    const handleListenerChange = (data: ListenerModel) => {
        console.log("Listener change: ", data);
        onChange(data, filePath, position);
    }

    return (
        <ServiceConfigureListenerEditViewContainer>
            {!listenerModel &&
                <LoadingContainer>
                    <ProgressRing />
                    <Typography variant="h3" sx={{ marginTop: '16px' }}>Loading...</Typography>
                </LoadingContainer>
            }
            {listenerModel &&
                <ListenerConfigForm listenerModel={listenerModel} onSubmit={onSubmit} formSubmitText={saving ? savingText : "Save"} isSaving={saving} onChange={handleListenerChange} />
            }
        </ServiceConfigureListenerEditViewContainer>
    );
};



namespace S {
    export const Container = styled(SidePanelBody)`
        display: flex;
        flex-direction: column;
        padding: 0px;
    `;

    export const TabContainer = styled.div`
        height: 100%;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    `;

    export const LoadingContainer = styled.div`
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        width: 100%;
        padding: 10px;
    `;
}



interface AttachListenerModalProps {
    filePath: string;
    moduleName: string;
    attachedListeners: string[];
    onAttachListener: (listenerName: string) => void;
}

function AttachListenerModal(props: AttachListenerModalProps) {

    const [activeTab, setActiveTab] = useState<"existing" | "new">("existing");
    const { rpcClient } = useRpcContext();

    const [existingListeners, setExistingListeners] = useState<string[]>([]);

    const [isLoading, setIsLoading] = useState<boolean>(false);

    const [attachingListener, setAttachingListener] = useState<string | undefined>(undefined);


    const [listenerModel, setListenerModel] = useState<ListenerModel>(undefined);

    useEffect(() => {
        setIsLoading(true);
        rpcClient.getServiceDesignerRpcClient().getListeners({ filePath: props.filePath, moduleName: props.moduleName }).then(res => {
            console.log("Existing listeners: ", res.listeners);
            setExistingListeners(res.listeners.filter(listener => !props.attachedListeners.includes(listener)).filter(listener => !listener.includes("+")));
        }).finally(() => {
            setIsLoading(false);
        });
    }, [props.filePath, props.moduleName]);

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId as "existing" | "new");
        if (tabId === "new") {
            rpcClient.getServiceDesignerRpcClient().getListenerModel({ moduleName: props.moduleName }).then(res => {
                console.log("New listener model: ", res.listener)
                setListenerModel(res.listener);
            })
        }
    }

    const handleListenerSelect = (listenerName: string) => {
        console.log("Listener selected: ", listenerName);
        setAttachingListener(listenerName);
        props.onAttachListener(listenerName);
    }

    const onCreateNewListener = async (value?: ListenerModel) => {
        if (value) {
            const listenerName = value.properties['variableNameKey'].value;
            setAttachingListener(listenerName);
            await rpcClient.getServiceDesignerRpcClient().addListenerSourceCode({ filePath: "", listener: value });
            handleListenerSelect(listenerName);
        }
    };

    return (
        <>
            <TabPanel
                views={[
                    {
                        id: 'existing',
                        name: 'Existing Listeners',
                        icon: <Icon
                            name="radio-tower"
                            isCodicon={true}
                            sx={{ marginRight: '5px' }}
                            iconSx={{ fontSize: '15px', display: 'flex', alignItems: 'center' }}
                        />
                    },
                    {
                        id: 'new',
                        name: 'Create New Listener',
                        icon: <Icon
                            name="radio-tower"
                            isCodicon={true}
                            sx={{ marginRight: '5px' }}
                            iconSx={{ fontSize: '12px', display: 'flex', alignItems: 'center', paddingTop: '2px' }}
                        />
                    },
                ]}
                currentViewId={activeTab}
                onViewChange={handleTabChange}
                childrenSx={{ padding: '10px', height: '100%', overflow: 'hidden' }}
            >
                <S.TabContainer id="existing" data-testid="existing-tab">

                    {isLoading && (
                        <S.LoadingContainer>
                            <ProgressRing />
                            <Typography variant="h3" sx={{ marginTop: '16px' }}>Loading...</Typography>
                        </S.LoadingContainer>
                    )}


                    {!isLoading && existingListeners.length === 0 && (
                        <S.LoadingContainer>
                            <Typography variant="h4" sx={{ marginTop: '16px', textAlign: 'center' }}>No existing listeners found</Typography>
                            <LinkButton sx={{ marginTop: '10px' }} onClick={() => {
                                handleTabChange("new");
                            }}> <Codicon name="add" /> Create New Listener</LinkButton>
                        </S.LoadingContainer>
                    )}

                    {!isLoading && existingListeners.length > 0 && (
                        <S.Grid columns={1}>
                            {existingListeners.map((listener) => (
                                <S.Component
                                    key={listener}
                                    enabled={attachingListener !== listener}
                                    onClick={() => handleListenerSelect(listener)}
                                >
                                    <S.IconContainer>{<Icon name='radio-tower' isCodicon={true} />}</S.IconContainer>
                                    <S.ComponentTitle>
                                        {listener}
                                    </S.ComponentTitle>
                                    {attachingListener === listener && (
                                        <>
                                            <ProgressRing />
                                            <Typography variant="body3" sx={{ marginLeft: '10px' }}>Attaching listener...</Typography>
                                        </>
                                    )}
                                </S.Component>
                            ))}
                        </S.Grid>
                    )}
                </S.TabContainer>
                <S.TabContainer id="new" data-testid="new-tab">
                    {isLoading && (
                        <S.LoadingContainer>
                            <ProgressRing />
                            <Typography variant="h3" sx={{ marginTop: '16px' }}>Loading...</Typography>
                        </S.LoadingContainer>
                    )}
                    {!isLoading && listenerModel && (
                        <ListenerConfigForm listenerModel={listenerModel} onSubmit={onCreateNewListener} formSubmitText={attachingListener ? "Saving..." : "Save"} isSaving={!!attachingListener} />
                    )}
                </S.TabContainer>
            </TabPanel>
        </>
    );
}
