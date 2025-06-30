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
import React, { useEffect } from 'react';
import { Diagnostic } from "vscode-languageserver-types";
import { InboundEndpoint } from "@wso2/mi-syntax-tree/lib/src";
import { Diagram } from "@wso2/mi-diagram";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { View, ViewContent, ViewHeader } from "../../components/View";
import { EVENT_TYPE, MACHINE_VIEW } from "@wso2/mi-core";
import { Button, Codicon, Icon, ProgressRing, Typography } from '@wso2/ui-toolkit';


export interface InboundEPViewProps {
    path: string;
    model: InboundEndpoint;
    diagnostics: Diagnostic[];
}

export const InboundEPView = ({ path, model, diagnostics }: InboundEPViewProps) => {
    const { rpcClient } = useVisualizerContext();
    const [isFormOpen, setFormOpen] = React.useState(false);

    const handleEditInboundEP = () => {
        rpcClient.getMiVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: { view: MACHINE_VIEW.InboundEPForm, documentUri: path, customProps: { model: model } }
        });
    }

    useEffect(() => {
        if (model && model.sequence === undefined) {
            handleEditInboundEP();
        }
    }, [model]);

    const goHome = () => {
        rpcClient.getMiVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: { view: MACHINE_VIEW.Overview }
        });
    }

    // TODO: Fix from statemachine
    if (!model) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <ProgressRing />
        </div>
    }

    return (
        <View>
            {model && model.name &&
                <ViewHeader title={`Event Integration: ${model.name}`} icon='inbound-endpoint' onEdit={handleEditInboundEP} />
            }
            {<ViewContent>
                {model && model.name && model.sequenceModel &&
                    <Diagram
                        model={model.sequenceModel}
                        documentUri={model.sequenceURI}
                        diagnostics={diagnostics}
                        isFormOpen={isFormOpen}
                    />
                }
                {
                    (!model?.sequenceModel) &&
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <Codicon name="error" sx={{ height: "100px", width: "100px" }} iconSx={{ fontSize: 100, color: "var(--vscode-errorForeground)" }} />
                        <Typography variant="h4" sx={{ textAlign: 'center' }}>
                            {"Cannot find the sequence for the inbound endpoint"}
                        </Typography>

                        <Button appearance="icon" onClick={goHome} >
                            <Icon name="home" isCodicon sx={{ width: 24, height: 24 }} iconSx={{ fontSize: 24 }} />
                        </Button>

                    </div>
                }
            </ViewContent>}
        </View>
    )
}

