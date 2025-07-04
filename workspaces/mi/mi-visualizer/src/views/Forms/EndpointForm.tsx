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

import { FormView } from "@wso2/ui-toolkit";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { EVENT_TYPE, MACHINE_VIEW } from "@wso2/mi-core";
import CardWrapper from "./Commons/CardWrapper";

export interface EndpointWizardProps {
    path: string;
    isPopup?: boolean;
    handlePopupClose?: () => void;
}

export function EndpointWizard(props: EndpointWizardProps) {

    const { rpcClient } = useVisualizerContext();

    const setEndpointType = (type: string) => {
        const endpointMappings: { [key: string]: MACHINE_VIEW } = {
            'HTTP Endpoint': MACHINE_VIEW.HttpEndpointForm,
            'WSDL Endpoint': MACHINE_VIEW.WsdlEndpointForm,
            'Address Endpoint': MACHINE_VIEW.AddressEndpointForm,
            'Default Endpoint': MACHINE_VIEW.DefaultEndpointForm,
            'Failover Endpoint': MACHINE_VIEW.FailoverEndPointForm,
            'Load Balance Endpoint': MACHINE_VIEW.LoadBalanceEndPointForm,
            'Recipient List Endpoint': MACHINE_VIEW.RecipientEndPointForm,
            'Template Endpoint': MACHINE_VIEW.TemplateEndPointForm,
        };

        const view = endpointMappings[type];
        if (view) {
            rpcClient.getMiVisualizerRpcClient().openView({
                type: EVENT_TYPE.OPEN_VIEW,
                location: {
                    view,
                    documentUri: props.path,
                    customProps: { type: 'endpoint' }
                },
                isPopup: props.isPopup
            });
        }
    };

    const handleOnClose = () => {
        rpcClient.getMiVisualizerRpcClient().goBack();
    };

    return (
        <FormView title={"Create Endpoint"} onClose={props.handlePopupClose ?? handleOnClose}>
            <CardWrapper cardsType={"ENDPOINT"} setType={setEndpointType} />
        </FormView>
    );
}
