import React, { useEffect, useState, Suspense } from 'react';
import { POPUP_EVENT_TYPE, PopupMachineStateValue, MACHINE_VIEW, Platform, VisualizerLocation } from '@wso2/mi-core';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { ServiceDesignerView } from './views/ServiceDesigner';
import { DSSResourceServiceDesignerView } from './views/Forms/DataServiceForm/ResourceServiceDesigner';
import { DSSQueryServiceDesignerView } from './views/Forms/DataServiceForm/QueryServiceDesigner';
import { APIWizard, APIWizardProps } from './views/Forms/APIform';
import { EndpointWizard } from './views/Forms/EndpointForm';
import { SequenceWizard } from './views/Forms/SequenceForm';
import { NavigationBar } from './components/NavigationBar';
import { ProjectWizard } from './views/Forms/ProjectForm';
import { TaskForm } from './views/Forms/TaskForm';
import { MessageStoreWizard } from './views/Forms/MessageStoreForm/index';
import { MessageProcessorWizard } from "./views/Forms/MessageProcessorForm";
import { VSCodeProgressRing } from '@vscode/webview-ui-toolkit/react';
import styled from '@emotion/styled';
import { InboundEPWizard } from './views/Forms/InboundEPform';
import { LocalEntryWizard } from './views/Forms/LocalEntryForm';
import { RegistryResourceForm } from './views/Forms/RegistryResourceForm';
import { RegistryMetadataForm } from './views/Forms/RegistryMetadataForm';
import { ProxyServiceWizard } from "./views/Forms/ProxyServiceForm";
import { TemplateWizard } from "./views/Forms/TemplateForm";
import { ClassMediatorForm } from './views/Forms/ClassMediatorForm';
import { BallerinaModuleForm } from './views/Forms/BallerinaModuleForm';
import { DataSourceWizard } from './views/Forms/DataSourceForm';
import { HttpEndpointWizard } from "./views/Forms/HTTPEndpointForm/index";
import { AddressEndpointWizard } from "./views/Forms/AddressEndpointForm";
import { WsdlEndpointWizard } from "./views/Forms/WSDLEndpointForm/index";
import { DefaultEndpointWizard } from "./views/Forms/DefaultEndpointForm";
import { LoadBalanceWizard } from './views/Forms/LoadBalanceEPform';
import { FailoverWizard } from './views/Forms/FailoverEndpointForm';
import { APIResource, NamedSequence, Proxy, Template, MockService, UnitTest, Task, InboundEndpoint } from '@wso2/mi-syntax-tree/lib/src';
import { ProxyView, ResourceView, SequenceView } from './views/Diagram';
import { RecipientWizard } from './views/Forms/RecipientEndpointForm';
import { TemplateEndpointWizard } from './views/Forms/TemplateEndpointForm';
import { UnsupportedProject, UnsupportedProjectProps } from './views/UnsupportedProject';
import { DataMapper } from './views/DataMapper';
import { ErrorBoundary } from '@wso2/ui-toolkit';
import PopupPanel from './PopupPanel';
import { AddArtifactView } from './views/AddArtifact';
import { SequenceTemplateView } from './views/Diagram/SequenceTemplate';
import { ConnectionWizard } from './views/Forms/ConnectionForm';
import { TestSuiteForm } from './views/Forms/Tests/TestSuiteForm';
import { TestCaseForm } from './views/Forms/Tests/TestCaseForm';
import { MockServiceForm } from './views/Forms/Tests/MockServices/MockServiceForm';
import { DataServiceWizard } from './views/Forms/DataServiceForm/MainPanelForms';
import { DataServiceView } from './views/Diagram/DataService';
import { SignInToCopilotMessage } from './views/LoggedOutWindow';
import { DataServiceDataSourceWizard } from "./views/Forms/DataServiceForm/MainPanelForms/DataSourceForm/DatasourceForm";
import { UpdateMIExtension } from './views/UpdateExtension';
import AddConnection from './views/Forms/ConnectionForm/ConnectionFormGenerator';
import { SamplesView } from './views/SamplesView';
import { WelcomeView } from './views/WelcomeView';
import { TaskView } from './views/Diagram/Task';
import { InboundEPView } from './views/Diagram/InboundEndpoint';
import { Overview } from './views/Overview';
import { DatamapperForm } from './views/Forms/DatamapperForm';
import { DataMapperMigrationForm } from './views/Forms/DataMapperMigrationForm';
import { ImportArtfactForm } from './views/Forms/ImportArtifactForm';
import { IdpConnectorSchemaGenerateForm }from './views/Forms/IDPConnectorForm/IdpConnectorSchemaGenerateForm';
import { KubernetesConfigurationForm } from "./views/Forms/KubernetesConfigurationForm";
import { RegistryPropertyForm } from "./views/Forms/RegistryPropertyForm";

const MainContainer = styled.div`
    display: flex;
    overflow: hidden;
`;

const MainContent = styled.div`
    flex-grow: 1;
`;

const LoaderWrapper = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 50vh;
    width: 100vw;
`;

const ProgressRing = styled(VSCodeProgressRing)`
    height: 40px;
    width: 40px;
    margin-top: auto;
    padding: 4px;
`;

const PopUpContainer = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2100;
    background: var(--background);
`;

const ViewContainer = styled.div({});

interface MainPanelProps {
    visualizerState: VisualizerLocation
}
const MainPanel = (props: MainPanelProps) => {
    const { visualizerState } = props;
    const isWindows = visualizerState.platform === Platform.WINDOWS;
    const { rpcClient } = useVisualizerContext();
    const [viewComponent, setViewComponent] = useState<React.ReactNode>();
    const [showNavigator, setShowNavigator] = useState<boolean>(true);
    const [formState, setFormState] = useState<PopupMachineStateValue>('initialize');

    rpcClient?.onPopupStateChanged((newState: PopupMachineStateValue) => {
        setFormState(newState);
    });

    useEffect(() => {
        fetchContext();
    }, [props]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'i' && (event.metaKey || event.ctrlKey)) {
                rpcClient.getMiDiagramRpcClient().executeCommand({ commands: ["MI.openAiPanel"] });
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        // Cleanup function to remove the event listener when the component unmounts
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const getUniqueKey = (model: any, documentUri: string) => {
        return `${JSON.stringify(model?.range)}-${documentUri}`;
    }

    const fetchContext = async () => {
        let shouldShowNavigator = true;
        switch (visualizerState.view) {
            case MACHINE_VIEW.Overview:
                setViewComponent(<Overview />);
                break;
            case MACHINE_VIEW.ADD_ARTIFACT:
                setViewComponent(<AddArtifactView />);
                break;
            case MACHINE_VIEW.UnsupportedProject:
                setViewComponent(
                    <UnsupportedProject
                        displayOverview={(visualizerState.customProps as UnsupportedProjectProps)?.displayOverview}
                    />
                );
                break;
            case MACHINE_VIEW.ResourceView:
                setViewComponent(
                    <ResourceView
                        key={getUniqueKey(visualizerState.stNode, visualizerState.documentUri)}
                        model={visualizerState.stNode as APIResource}
                        documentUri={visualizerState.documentUri}
                        diagnostics={visualizerState.diagnostics}
                    />
                );
                await rpcClient.getMiDiagramRpcClient().initUndoRedoManager({ path: visualizerState.documentUri });
                break;
            case MACHINE_VIEW.SequenceView:
                setViewComponent(
                    <SequenceView
                        key={getUniqueKey(visualizerState.stNode, visualizerState.documentUri)}
                        model={visualizerState.stNode as NamedSequence}
                        documentUri={visualizerState.documentUri}
                        diagnostics={visualizerState.diagnostics}
                    />
                );
                await rpcClient.getMiDiagramRpcClient().initUndoRedoManager({ path: visualizerState.documentUri });
                break;
            case MACHINE_VIEW.SequenceTemplateView:
                setViewComponent(
                    <SequenceTemplateView
                        key={getUniqueKey(visualizerState.stNode, visualizerState.documentUri)}
                        model={visualizerState.stNode as Template}
                        documentUri={visualizerState.documentUri}
                        diagnostics={visualizerState.diagnostics}
                    />
                );
                await rpcClient.getMiDiagramRpcClient().initUndoRedoManager({ path: visualizerState.documentUri });
                break;
            case MACHINE_VIEW.ProxyView:
                setViewComponent(
                    <ProxyView
                        key={getUniqueKey(visualizerState.stNode, visualizerState.documentUri)}
                        model={visualizerState.stNode as Proxy}
                        documentUri={visualizerState.documentUri}
                        diagnostics={visualizerState.diagnostics}
                    />
                );
                await rpcClient.getMiDiagramRpcClient().initUndoRedoManager({ path: visualizerState.documentUri });
                break;
            case MACHINE_VIEW.DataServiceView:
                setViewComponent(
                    <DataServiceView
                        key={getUniqueKey(visualizerState.stNode, visualizerState.documentUri)}
                        model={visualizerState.stNode as any}
                        href={visualizerState.identifier}
                        documentUri={visualizerState.documentUri}
                        diagnostics={visualizerState.diagnostics}
                    />
                );
                await rpcClient.getMiDiagramRpcClient().initUndoRedoManager({ path: visualizerState.documentUri });
                break;
            case MACHINE_VIEW.ServiceDesigner:
                setViewComponent(<ServiceDesignerView syntaxTree={visualizerState.stNode} documentUri={visualizerState.documentUri} />);
                break;
            case MACHINE_VIEW.DataMapperView:
                setViewComponent(
                    <ErrorBoundary errorMsg="An error occurred in the MI Data Mapper">
                        <DataMapper {...visualizerState.dataMapperProps} />
                    </ErrorBoundary >
                );
                const { filePath, fileContent } = visualizerState.dataMapperProps;
                await rpcClient.getMiDataMapperRpcClient().initDMUndoRedoManager({ filePath, fileContent });
                break;
            case MACHINE_VIEW.APIForm:
                setViewComponent(<APIWizard apiData={(visualizerState.customProps as APIWizardProps)?.apiData} path={visualizerState.documentUri} />);
                break;
            case MACHINE_VIEW.EndPointForm:
                setViewComponent(<EndpointWizard path={visualizerState.documentUri} />);
                break;
            case MACHINE_VIEW.LoadBalanceEndPointForm:
                setViewComponent(<LoadBalanceWizard path={visualizerState.documentUri} />);
                break;
            case MACHINE_VIEW.FailoverEndPointForm:
                setViewComponent(<FailoverWizard path={visualizerState.documentUri} />);
                break;
            case MACHINE_VIEW.RecipientEndPointForm:
                setViewComponent(<RecipientWizard path={visualizerState.documentUri} />);
                break;
            case MACHINE_VIEW.TemplateEndPointForm:
                setViewComponent(<TemplateEndpointWizard path={visualizerState.documentUri} />);
                break;
            case MACHINE_VIEW.SequenceForm:
                setViewComponent(<SequenceWizard path={visualizerState.documentUri} />);
                break;
            case MACHINE_VIEW.DatamapperForm:
                setViewComponent(<DatamapperForm path={visualizerState.documentUri} />);
                break;
            case MACHINE_VIEW.DataMapperMigrationForm:
                setViewComponent(<DataMapperMigrationForm 
                    path={visualizerState.documentUri}
                    configName={visualizerState.customProps?.configName}
                    migratedDmcPath={visualizerState.customProps?.migratedDmcPath}
                    migratedInputSchemaPath={visualizerState.customProps?.migratedInputSchemaPath}
                    migratedOutputSchemaPath={visualizerState.customProps?.migratedOutputSchemaPath}
                    range={visualizerState.customProps?.range}
                    documentUri={visualizerState.customProps?.documentUri}
                    tsFilePath={visualizerState.customProps?.tsFilePath}
                    description={visualizerState.customProps?.description}
                    inputType={visualizerState.customProps?.inputType}
                    outputType={visualizerState.customProps?.outputType}
                />);
                break;
            case MACHINE_VIEW.InboundEPForm:
                setViewComponent(<InboundEPWizard
                    path={visualizerState.documentUri}
                    model={visualizerState.customProps?.model as InboundEndpoint} />);
                break;
            case MACHINE_VIEW.InboundEPView:
                setViewComponent(<InboundEPView
                    path={visualizerState.documentUri}
                    model={visualizerState.stNode as InboundEndpoint}
                    diagnostics={visualizerState.diagnostics} />);
                break;
            case MACHINE_VIEW.RegistryResourceForm:
                setViewComponent(<RegistryResourceForm path={visualizerState.documentUri} />);
                break;
            case MACHINE_VIEW.RegistryMetadataForm:
                setViewComponent(<RegistryMetadataForm path={visualizerState.documentUri} />);
                break;
            case MACHINE_VIEW.MessageProcessorForm:
                setViewComponent(<MessageProcessorWizard path={visualizerState.documentUri} />);
                break;
            case MACHINE_VIEW.ProxyServiceForm:
                setViewComponent(<ProxyServiceWizard path={visualizerState.documentUri} />);
                break;
            case MACHINE_VIEW.TaskForm:
                setViewComponent(<TaskForm path={visualizerState.documentUri} type={visualizerState?.customProps?.type} />);
                break;
            case MACHINE_VIEW.TaskView:
                setViewComponent(<TaskView
                    path={visualizerState.documentUri}
                    model={visualizerState.stNode as Task}
                    diagnostics={visualizerState.diagnostics} />);
                break;
            case MACHINE_VIEW.TemplateForm:
                const templateType = visualizerState.customProps && visualizerState.customProps.type ? visualizerState.customProps.type : '';
                setViewComponent(<TemplateWizard path={visualizerState.documentUri} type={templateType} />);
                break;
            case MACHINE_VIEW.HttpEndpointForm:
                setViewComponent(<HttpEndpointWizard path={visualizerState.documentUri} type={visualizerState.customProps.type} />);
                break;
            case MACHINE_VIEW.AddressEndpointForm:
                setViewComponent(<AddressEndpointWizard path={visualizerState.documentUri} type={visualizerState.customProps.type} />);
                break;
            case MACHINE_VIEW.WsdlEndpointForm:
                setViewComponent(<WsdlEndpointWizard path={visualizerState.documentUri} type={visualizerState.customProps.type} />);
                break;
            case MACHINE_VIEW.DefaultEndpointForm:
                setViewComponent(<DefaultEndpointWizard path={visualizerState.documentUri} type={visualizerState.customProps.type} />);
                break;
            case MACHINE_VIEW.DataServiceForm:
                setViewComponent(<DataServiceWizard path={visualizerState.documentUri} />);
                break;
            case MACHINE_VIEW.DssDataSourceForm:
                setViewComponent(<DataServiceDataSourceWizard path={visualizerState.documentUri} />);
                break;
            case MACHINE_VIEW.ProjectCreationForm:
                setViewComponent(<ProjectWizard cancelView={MACHINE_VIEW.Overview} />);
                shouldShowNavigator = false;
                break;
            case MACHINE_VIEW.LocalEntryForm:
                setViewComponent(<LocalEntryWizard path={visualizerState.documentUri} />);
                break;
            case MACHINE_VIEW.MessageStoreForm:
                setViewComponent(<MessageStoreWizard path={visualizerState.documentUri} />);
                break;
            case MACHINE_VIEW.ClassMediatorForm:
                setViewComponent(<ClassMediatorForm path={visualizerState.documentUri} />);
                break;
            case MACHINE_VIEW.BallerinaModuleForm:
                setViewComponent(<BallerinaModuleForm path={visualizerState.documentUri} />);
                break;
            case MACHINE_VIEW.DataSourceForm:
                setViewComponent(<DataSourceWizard path={visualizerState.documentUri} />);
                break;
            case MACHINE_VIEW.ImportArtifactForm:
                setViewComponent(<ImportArtfactForm />);
                break;
            case MACHINE_VIEW.KubernetesConfigurationForm:
                setViewComponent(<KubernetesConfigurationForm />);
                break;
            case MACHINE_VIEW.RegistryForm:
                setViewComponent(<RegistryPropertyForm path={visualizerState.documentUri} />);
                break;
            case MACHINE_VIEW.ConnectorStore:
                setViewComponent(
                    <ConnectionWizard path={visualizerState.documentUri} />);
                break;
            case MACHINE_VIEW.ConnectionForm:
                setViewComponent(
                    <AddConnection
                        connectionName={visualizerState.customProps.connectionName}
                        connectionType={visualizerState.customProps.connectionType}
                        connector={visualizerState.customProps}
                        path={visualizerState.documentUri} />);
                break;
            case MACHINE_VIEW.TestSuite:
                setViewComponent(<TestSuiteForm filePath={visualizerState.documentUri} stNode={visualizerState.stNode as UnitTest} isWindows={isWindows} />);
                break;
            case MACHINE_VIEW.LoggedOut:
                setViewComponent(<SignInToCopilotMessage />);
                break;
            case MACHINE_VIEW.UpdateExtension:
                setViewComponent(<UpdateMIExtension />);
                break;
            case MACHINE_VIEW.TestCase:
                setViewComponent(<TestCaseForm
                    filePath={visualizerState.documentUri}
                    range={visualizerState.customProps?.range}
                    availableTestCases={visualizerState.customProps?.availableTestCases}
                    testCase={visualizerState.customProps?.testCase}
                    testSuiteType={visualizerState.customProps?.testSuiteType}
                />);
                break;
            case MACHINE_VIEW.MockService:
                setViewComponent(<MockServiceForm filePath={visualizerState.documentUri} stNode={visualizerState.stNode as MockService} isWindows={isWindows} />);
                break;
            case MACHINE_VIEW.DSSResourceServiceDesigner:
                setViewComponent(<DSSResourceServiceDesignerView syntaxTree={visualizerState.stNode} documentUri={visualizerState.documentUri} />);
                break;
            case MACHINE_VIEW.DSSQueryServiceDesigner:
                setViewComponent(<DSSQueryServiceDesignerView syntaxTree={visualizerState.stNode} documentUri={visualizerState.documentUri} />);
                break;
            case MACHINE_VIEW.Welcome:
                setViewComponent(<WelcomeView />);
                break;
            case MACHINE_VIEW.Samples:
                setViewComponent(<SamplesView />);
                break;
            case MACHINE_VIEW.IdpConnectorSchemaGeneratorForm:
                setViewComponent(< IdpConnectorSchemaGenerateForm path={visualizerState.documentUri} fileContent={visualizerState.customProps?.fileContent}/>);
                break;
            default:
                setViewComponent(null);
        }
        // Update the showNavigator state based on the current view
        setShowNavigator(shouldShowNavigator);
    }

    const handleOnClose = () => {
        rpcClient.getMiVisualizerRpcClient().openView({ type: POPUP_EVENT_TYPE.CLOSE_VIEW, location: { view: null }, isPopup: true })
    }

    return (
        <ViewContainer>
            {!viewComponent ? (
                <LoaderWrapper>
                    <ProgressRing />
                </LoaderWrapper>
            ) : <>
                {showNavigator && <NavigationBar />}
                {viewComponent}
            </>}
            {typeof formState === 'object' && 'open' in formState && (
                <PopUpContainer>
                    <PopupPanel formState={formState} handleClose={handleOnClose} />
                </PopUpContainer>
            )}
        </ViewContainer>
    );
};

export default MainPanel;   
