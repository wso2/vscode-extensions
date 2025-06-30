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
import { Diagnostic } from "vscode-languageserver-types";
import { APIResource, Range } from "@wso2/mi-syntax-tree/lib/src";
import { Diagram } from "@wso2/mi-diagram";
import { Switch } from "@wso2/ui-toolkit";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { VSCodeTag } from "@vscode/webview-ui-toolkit/react";
import { getColorByMethod } from "@wso2/service-designer";
import { View, ViewContent, ViewHeader } from "../../components/View";
import { generateResourceData, getResourceDeleteRanges, onResourceEdit } from "../../utils/form";
import styled from "@emotion/styled";
import { ResourceForm, ResourceFormData, ResourceType } from "../Forms/ResourceForm";

interface ColoredTagProps {
    color: string;
};

const ColoredTag = styled(VSCodeTag)<ColoredTagProps>`
    ::part(control) {
        color: var(--button-primary-foreground);
        background-color: ${({ color }: ColoredTagProps) => color};
    }
`;

export interface ResourceViewProps {
    model: APIResource;
    documentUri: string;
    diagnostics: Diagnostic[];
}

export const ResourceView = ({ model: resourceModel, documentUri, diagnostics }: ResourceViewProps) => {
    const { rpcClient } = useVisualizerContext();
    const model = resourceModel as APIResource;
    const data = generateResourceData(model) as ResourceType;
    const flowStateKey = `flowState-${documentUri}-${model.uriTemplate || model.urlMapping}`;
    const [isFaultFlow, setFlow] = React.useState<boolean>(localStorage.getItem(flowStateKey) === 'true' ? true : false);
    const [isFormOpen, setFormOpen] = React.useState(false);

    const toggleFlow = () => {
        const newFlowState = !isFaultFlow;
        setFlow(newFlowState);
        localStorage.setItem(flowStateKey, newFlowState.toString());
    };

    const handleEditResource = () => {
        console.log(model);
        setFormOpen(true);
    }

    const onSave = (data: ResourceFormData) => {
        const ranges: Range[] = getResourceDeleteRanges(model, data);
        onResourceEdit(data, model.range, ranges, documentUri, rpcClient);
        setFormOpen(false);
    }

    const ResourceTitle = (
        <React.Fragment>
            <span>Resource:</span>
            {model.methods.map((method, index) => <ColoredTag key={index} color={getColorByMethod(method)}>{method}</ColoredTag>)}
            <span>{model.uriTemplate || model.urlMapping}</span>
        </React.Fragment>
    )

    return (
        <View>
            <ViewHeader title={ResourceTitle} icon="APIResource" onEdit={handleEditResource}>
                <Switch
                    leftLabel="Flow"
                    rightLabel="Fault"
                    checked={isFaultFlow}
                    checkedColor="var(--vscode-button-background)"
                    enableTransition={true}
                    onChange={toggleFlow}
                    sx={{
                        "margin": "auto",
                        fontFamily: "var(--font-family)",
                        fontSize: "var(--type-ramp-base-font-size)",
                    }}
                    disabled={false}
                />
            </ViewHeader>
            <ViewContent>
                <Diagram
                    model={model}
                    documentUri={documentUri}
                    diagnostics={diagnostics}
                    isFaultFlow={isFaultFlow}
                    isFormOpen={isFormOpen}
                />
                <ResourceForm
                    isOpen={isFormOpen}
                    formData={data}
                    documentUri={documentUri}
                    onCancel={() => setFormOpen(false)}
                    onSave={onSave}
                />
            </ViewContent>
        </View>
    )
}

