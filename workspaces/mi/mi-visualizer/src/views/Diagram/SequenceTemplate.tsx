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
import { Template } from "@wso2/mi-syntax-tree/lib/src";
import { Diagram } from "@wso2/mi-diagram";
import { View, ViewContent, ViewHeader } from "../../components/View";
import { TemplateWizard } from "../Forms/TemplateForm";

export interface SequenceViewProps {
    model: Template;
    documentUri: string;
    diagnostics: Diagnostic[];
}

export const SequenceTemplateView = ({ model: SequenceModel, documentUri, diagnostics }: SequenceViewProps) => {
    const model = SequenceModel as Template;
    // const data = generateSequenceData(model) as EditSequenceFields
    const [isFormOpen, setFormOpen] = React.useState(false);

    const handleEditSequence = () => {
        setFormOpen(true);
    }

    return (
        <View>
            {isFormOpen ?
                <TemplateWizard
                    path={documentUri}
                    type="Sequence Template"
                    onCancel={() => setFormOpen(false)}
                    model={model}
                /> :
                <>
                    <ViewHeader title={`Sequence: ${model.name}`} icon="sequence-template" onEdit={handleEditSequence} />
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

