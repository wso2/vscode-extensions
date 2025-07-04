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
import { NamedSequence } from "@wso2/mi-syntax-tree/lib/src";
import { Diagram } from "@wso2/mi-diagram";
import { Button, Codicon, ProgressRing } from "@wso2/ui-toolkit";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { View, ViewContent, ViewHeader } from "../../components/View";
import { generateSequenceData, onSequenceEdit } from "../../utils/form";
import { EditSequenceForm, EditSequenceFields } from "../Forms/EditForms/EditSequenceForm";
import path from "path";
import { EVENT_TYPE, MACHINE_VIEW } from "@wso2/mi-core";

export interface SequenceViewProps {
    model: NamedSequence;
    documentUri: string;
    diagnostics: Diagnostic[];
}

export const SequenceView = ({ model: SequenceModel, documentUri, diagnostics }: SequenceViewProps) => {
    const { rpcClient } = useVisualizerContext();

    const [isFormOpen, setFormOpen] = React.useState(false);

    const handleEditSequence = () => {
        setFormOpen(true);
    }

    const onSave = (data: EditSequenceFields) => {
        let artifactNameChanged = false;
        let documentPath = documentUri;
        if (path.basename(documentUri).split('.')[0] !== data.name) {
            rpcClient.getMiDiagramRpcClient().renameFile({ existingPath: documentUri, newPath: path.join(path.dirname(documentUri), `${data.name}.xml`) });
            artifactNameChanged = true;
            documentPath = path.join(path.dirname(documentUri), `${data.name}.xml`);
        }
        onSequenceEdit(data, model.range.startTagRange, documentPath, rpcClient);
        if (artifactNameChanged) {
            rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });
        } else {
            setFormOpen(false);
        }
    }

    // TODO: Fix from statemachine
    if (!SequenceModel) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <ProgressRing />
        </div>
    }
    const model = SequenceModel as NamedSequence;
    const data = generateSequenceData(model) as EditSequenceFields

    return (
        <View>
            {isFormOpen ?
                <EditSequenceForm
                    sequenceData={data}
                    isOpen={isFormOpen}
                    onCancel={() => setFormOpen(false)}
                    onSave={onSave}
                    documentUri={documentUri}
                /> :
                <>
                    <ViewHeader title={`Sequence: ${model.name}`} icon="Sequence" onEdit={handleEditSequence} />
                    <ViewContent>
                        <Diagram
                            model={model}
                            documentUri={documentUri}
                            diagnostics={diagnostics}
                            isFormOpen={isFormOpen}
                        />
                    </ViewContent>
                </>
            }
        </View>
    )
}

