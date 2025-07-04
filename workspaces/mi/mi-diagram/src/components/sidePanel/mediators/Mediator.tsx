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

import React from "react";
import { VSCodePanels, VSCodePanelTab } from "@vscode/webview-ui-toolkit/react";
import { Icon, PanelContent, Typography } from "@wso2/ui-toolkit";
import { MediatorForm } from "./Form";
import { DiagramService, Range } from "@wso2/mi-syntax-tree/lib/src";
import TryOutView from "../tryout/Tryout";
import { useForm } from "react-hook-form";
import { Colors } from "../../../resources/constants";
import AddConnector from "../connectors/AddConnector";

interface MediatorPageProps {
    mediatorData?: any;
    connectorData?: any;
    mediatorType: string;
    nodeRange: Range;
    documentUri: string;
    isUpdate: boolean;
    showForm: boolean;
    artifactModel: DiagramService;
}
export function MediatorPage(props: MediatorPageProps) {
    const { mediatorData, connectorData, mediatorType, documentUri, nodeRange, isUpdate, showForm, artifactModel } = props;
    const [activeTab, setActiveTab] = React.useState("form");
    const { control, handleSubmit, setValue, getValues, watch, reset, formState: { dirtyFields, errors } } = useForm<any>({
        defaultValues: {
        }
    });
    const canTryOut = (mediatorData || connectorData?.form)?.canTryOut;
    const isTryoutSupported = (artifactModel.tag === 'resource' || artifactModel.tag === 'sequence'); // Allow tryout for APIs and sequences only

    const onChangeTab = (tabId: string) => {
        if (activeTab === tabId) {
            return;
        }
        setActiveTab(tabId);
    }
    return (
        <div>
            <VSCodePanels activeId={activeTab}>
                {showForm && <VSCodePanelTab id="form" onClick={() => onChangeTab("form")}>Edit</VSCodePanelTab>}
                <VSCodePanelTab id="tryout" onClick={() => onChangeTab("tryout")} style={{ alignItems: 'center' }}>
                    Tryout
                    {activeTab === "tryout" && <span style={{
                        marginLeft: '4px',
                        backgroundColor: Colors.SURFACE_CONTAINER,
                        color: Colors.ON_SURFACE,
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '9px',
                        fontStyle: 'italic'
                    }}>
                        Experimental
                    </span>}
                </VSCodePanelTab>

                {showForm && <PanelContent id={"form"} >
                    {mediatorData && <MediatorForm
                        control={control}
                        errors={errors}
                        setValue={setValue}
                        reset={reset}
                        watch={watch}
                        getValues={getValues}
                        dirtyFields={dirtyFields}
                        handleSubmit={handleSubmit}
                        mediatorData={mediatorData}
                        mediatorType={mediatorType}
                        isUpdate={isUpdate}
                        documentUri={documentUri}
                        range={nodeRange} />}

                    {connectorData && <AddConnector
                        control={control}
                        errors={errors}
                        setValue={setValue}
                        reset={reset}
                        watch={watch}
                        getValues={getValues}
                        dirtyFields={dirtyFields}
                        isUpdate={isUpdate}
                        handleSubmit={handleSubmit}
                        formData={connectorData.form}
                        nodePosition={nodeRange}
                        documentUri={documentUri}
                        connectorName={connectorData.connectorName || connectorData.name}
                        connectionName={connectorData.connectionName}
                        operationName={connectorData.operationName}
                        connectionType={connectorData.connectionType}
                        parameters={connectorData.parameters}
                    />}

                </PanelContent>}

                <PanelContent id={"tryout"}>
                    {(!showForm || canTryOut) && <TryOutView
                        documentUri={documentUri}
                        nodeRange={nodeRange}
                        mediatorType={mediatorType}
                        getValues={getValues}
                        isActive={activeTab === "tryout" || !showForm}
                        artifactModel={props.artifactModel}
                        isTryoutSupported={isTryoutSupported}
                    />}
                    {isTryoutSupported && ((mediatorData || connectorData) && !canTryOut) && (
                        <Typography variant="body2" sx={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <Icon name="warning" isCodicon /> Please update your MI runtime to the latest version to use the Try-Out feature.
                        </Typography>
                    )}
                </PanelContent>
            </VSCodePanels>
        </div>
    );
}
