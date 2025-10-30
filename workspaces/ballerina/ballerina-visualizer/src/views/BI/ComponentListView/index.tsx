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

import React, { useEffect, useState } from "react";
import { View, ViewContent } from "@wso2/ui-toolkit";
import { SCOPE, TriggerModelsResponse } from "@wso2/ballerina-core";

import { TitleBar } from "../../../components/TitleBar";
import { TopNavigationBar } from "../../../components/TopNavigationBar";
import { AddPanel, Container } from "./styles";
import { AutomationPanel } from "./AutomationPanel";
import { EventIntegrationPanel } from "./EventIntegrationPanel";
import { FileIntegrationPanel } from "./FileIntegrationPanel";
import { IntegrationAPIPanel } from "./IntegrationApiPanel";
import { OtherArtifactsPanel } from "./OtherArtifactsPanel";
import { AIAgentPanel } from "./AIAgentPanel";
import { useVisualizerContext } from "../../../Context";
import { useRpcContext } from "@wso2/ballerina-rpc-client";

interface ComponentListViewProps {
    scope: SCOPE;
};

export function ComponentListView(props: ComponentListViewProps) {
    const { scope } = props;
    const { rpcClient } = useRpcContext();
    const [triggers, setTriggers] = useState<TriggerModelsResponse>({ local: [] });
    const { cacheTriggers, setCacheTriggers } = useVisualizerContext();
    const [isNPSupported, setIsNPSupported] = useState<boolean>(false);

    useEffect(() => {
        getTriggers();

        rpcClient.getCommonRpcClient().isNPSupported().then((supported) => {
            setIsNPSupported(supported);
        });
    }, []);

    const getTriggers = () => {
        if (cacheTriggers.local.length > 0) {
            setTriggers(cacheTriggers);
        } else {
            rpcClient
                .getServiceDesignerRpcClient()
                .getTriggerModels({ query: "" })
                .then((model) => {
                    console.log(">>> bi triggers", model);
                    setTriggers(model);
                    setCacheTriggers(model);
                });
        }
    };

    return (
        <View>
            <TopNavigationBar />
            <TitleBar title="Artifacts" subtitle="Add a new artifact to your integration" />
            <ViewContent padding>
                <Container>
                    <AddPanel>
                        <AutomationPanel scope={scope} />
                        <AIAgentPanel scope={scope} triggers={triggers} />
                        <IntegrationAPIPanel scope={scope} />
                        <EventIntegrationPanel triggers={triggers} scope={scope} />
                        <FileIntegrationPanel triggers={triggers} scope={scope} />
                        <OtherArtifactsPanel isNPSupported={isNPSupported} />
                    </AddPanel>
                </Container>
            </ViewContent>
        </View>
    );
}
