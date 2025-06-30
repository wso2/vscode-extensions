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

import React, { useEffect, useState } from 'react';
import { MACHINE_VIEW, PopupMachineStateValue, PopupVisualizerLocation } from '@wso2/mi-core';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { EndpointWizard } from './views/Forms/EndpointForm';
import styled from '@emotion/styled';
import { HttpEndpointWizard } from "./views/Forms/HTTPEndpointForm/index";
import { AddressEndpointWizard } from "./views/Forms/AddressEndpointForm";
import { WsdlEndpointWizard } from "./views/Forms/WSDLEndpointForm/index";
import { DefaultEndpointWizard } from "./views/Forms/DefaultEndpointForm";
import { LoadBalanceWizard } from './views/Forms/LoadBalanceEPform';
import { FailoverWizard } from './views/Forms/FailoverEndpointForm';
import { RecipientWizard } from './views/Forms/RecipientEndpointForm';
import { TemplateEndpointWizard } from './views/Forms/TemplateEndpointForm';
import { DataServiceDataSourceWizard } from "./views/Forms/DataServiceForm/MainPanelForms/DataSourceForm/DatasourceForm";
import path from 'path';
import { ConnectionWizard } from './views/Forms/ConnectionForm';
import AddConnection from './views/Forms/ConnectionForm/ConnectionFormGenerator';
import { AddDriver } from './views/Popup/AddDriver';
import { ManageDependencies } from './views/Overview/ProjectInformation/ManageDependencies';
import { ProjectInformationForm } from './views/Overview/ProjectInformation/ProjectInformationForm';
import { SequenceWizard } from './views/Forms/SequenceForm';
import { RegistryResourceForm } from './views/Forms/RegistryResourceForm';
import { TemplateWizard } from './views/Forms/TemplateForm';
import { DatamapperForm } from './views/Forms/DatamapperForm';
import { ManageConfigurables } from './views/Overview/ProjectInformation/ManageConfigurables';
import { MessageStoreWizard } from './views/Forms/MessageStoreForm';
import { DataServiceWizard } from './views/Forms/DataServiceForm/MainPanelForms';
import { DataSourceWizard } from './views/Forms/DataSourceForm';
import { ImportConnectorForm } from './views/Forms/ConnectionForm/ImportConnector';

const ViewContainer = styled.div`
    
    height: 100vh;
`;

const PopupPanel = (props: { formState: PopupMachineStateValue, handleClose?: () => void }) => {
    const { rpcClient } = useVisualizerContext();
    const [viewComponent, setViewComponent] = useState<React.ReactNode>();

    useEffect(() => {
        if (typeof props.formState === 'object' && 'open' in props.formState) {
            fetchContext();
        }
    }, [props.formState]);

    useEffect(() => {
        fetchContext();
    }, []);

    const fetchContext = () => {
        const endpointPath = new URL(path.join('src', 'main', 'wso2mi', 'artifacts', 'endpoints').toString(), window.location.origin).pathname;
        rpcClient.getPopupVisualizerState().then((machineSate: PopupVisualizerLocation) => {
            switch (machineSate?.view) {
                case MACHINE_VIEW.EndPointForm:
                    setViewComponent(<EndpointWizard handlePopupClose={props.handleClose} isPopup={true} path={machineSate.documentUri} />);
                    break;
                case MACHINE_VIEW.HttpEndpointForm:
                    setViewComponent(<HttpEndpointWizard handlePopupClose={props.handleClose} isPopup={true} path={`${machineSate.documentUri}${endpointPath}`} type={machineSate.customProps.type} />);
                    break;
                case MACHINE_VIEW.AddressEndpointForm:
                    setViewComponent(<AddressEndpointWizard handlePopupClose={props.handleClose} isPopup={true} path={`${machineSate.documentUri}${endpointPath}`} type={machineSate.customProps.type} />);
                    break;
                case MACHINE_VIEW.WsdlEndpointForm:
                    setViewComponent(<WsdlEndpointWizard handlePopupClose={props.handleClose} isPopup={true} path={`${machineSate.documentUri}${endpointPath}`} type={machineSate.customProps.type} />);
                    break;
                case MACHINE_VIEW.DefaultEndpointForm:
                    setViewComponent(<DefaultEndpointWizard handlePopupClose={props.handleClose} isPopup={true} path={`${machineSate.documentUri}${endpointPath}`} type={machineSate.customProps.type} />);
                    break;
                case MACHINE_VIEW.LoadBalanceEndPointForm:
                    setViewComponent(<LoadBalanceWizard handlePopupClose={props.handleClose} isPopup={true} path={`${machineSate.documentUri}${endpointPath}`} />);
                    break;
                case MACHINE_VIEW.FailoverEndPointForm:
                    setViewComponent(<FailoverWizard handlePopupClose={props.handleClose} isPopup={true} path={`${machineSate.documentUri}${endpointPath}`} />);
                    break;
                case MACHINE_VIEW.RecipientEndPointForm:
                    setViewComponent(<RecipientWizard handlePopupClose={props.handleClose} isPopup={true} path={`${machineSate.documentUri}${endpointPath}`} />);
                    break;
                case MACHINE_VIEW.TemplateEndPointForm:
                    setViewComponent(<TemplateEndpointWizard handlePopupClose={props.handleClose} isPopup={true} path={`${machineSate.documentUri}${endpointPath}`} />);
                    break;
                case MACHINE_VIEW.ConnectorStore:
                    setViewComponent(<ConnectionWizard handlePopupClose={props.handleClose} isPopup={true} path={machineSate.documentUri} allowedConnectionTypes={machineSate.customProps?.allowedConnectionTypes} />);
                    break;
                case MACHINE_VIEW.DssDataSourceForm:
                    setViewComponent(<DataServiceDataSourceWizard isPopup={true} path={machineSate.documentUri} datasource={machineSate.customProps.datasource} handlePopupClose={props.handleClose} />);
                    break;
                case MACHINE_VIEW.DataServiceForm:
                    const dsPath = [machineSate.projectUri, 'src', 'main', 'wso2mi', 'artifacts', 'data-services'].join(machineSate.pathSeparator);
                    setViewComponent(<DataServiceWizard isPopup={true} path={dsPath} handlePopupClose={props.handleClose} />);
                    break;
                case MACHINE_VIEW.DataSourceForm:
                    setViewComponent(<DataSourceWizard isPopup={true} path={machineSate.documentUri} handlePopupClose={props.handleClose} />);
                    break;
                case MACHINE_VIEW.ConnectionForm:
                    setViewComponent(
                        <AddConnection
                            connectionName={machineSate.customProps.connectionName}
                            connectionType={machineSate.customProps.connectionType}
                            connector={machineSate.customProps.connector}
                            fromSidePanel={machineSate.customProps.fromSidePanel}
                            isPopup={true}
                            path={machineSate.documentUri}
                            handlePopupClose={props.handleClose}
                        />
                    );
                    break;
                case MACHINE_VIEW.AddDriverPopup:
                    setViewComponent(<AddDriver handlePopupClose={props.handleClose} path={machineSate.documentUri} identifier={machineSate.customProps.identifier} />);
                    break;
                case MACHINE_VIEW.ManageDependencies:
                    setViewComponent(<ManageDependencies
                        onClose={props.handleClose}
                        dependencies={machineSate.customProps.dependencies}
                        title={machineSate.customProps.title}
                        type={machineSate.customProps.type}
                    />
                    );
                    break;
                case MACHINE_VIEW.ManageConfigurables:
                    setViewComponent(<ManageConfigurables onClose={props.handleClose} configurables={machineSate.customProps.configs} />);
                    break;
                case MACHINE_VIEW.ProjectInformationForm:
                    setViewComponent(<ProjectInformationForm selectedComponent={machineSate.customProps} onClose={props.handleClose} />);
                    break;
                case MACHINE_VIEW.SequenceForm:
                    setViewComponent(<SequenceWizard handlePopupClose={props.handleClose} isPopup={true} path={machineSate.documentUri} />);
                    break;
                case MACHINE_VIEW.RegistryResourceForm:
                    setViewComponent(<RegistryResourceForm handlePopupClose={props.handleClose} isPopup={true} path={machineSate.documentUri} type={machineSate.customProps.type} />);
                    break;
                case MACHINE_VIEW.SequenceTemplateView:
                    const rPath = [machineSate.projectUri, 'src', 'main', 'wso2mi', 'artifacts', 'templates'].join(machineSate.pathSeparator);
                    setViewComponent(<TemplateWizard onCancel={props.handleClose} isPopup={true} path={rPath} type='Sequence Template' />);
                    break;
                case MACHINE_VIEW.DatamapperForm:
                    setViewComponent(<DatamapperForm path={machineSate.projectUri} handlePopupClose={props.handleClose} isPopup={true} />);
                    break;
                case MACHINE_VIEW.MessageStoreForm:
                    const dir = [machineSate.projectUri, "src", "main", "wso2mi", "artifacts", "messageStores"].join(machineSate.pathSeparator);
                    setViewComponent(<MessageStoreWizard onClose={props.handleClose} path={dir} isPopup={true} />);
                    break;
                case MACHINE_VIEW.ImportConnectorForm:
                    setViewComponent(<ImportConnectorForm handlePopupClose={props.handleClose} isPopup={true} onImportSuccess={props.handleClose} goBack={null} />);
                    break;
                default:
                    setViewComponent(null);
            }
        });
    }

    return (
        <ViewContainer id='popUpPanel'>
            {viewComponent}
        </ViewContainer >
    );
};

export default PopupPanel;   
