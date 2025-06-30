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
import { Diagnostic } from "vscode-languageserver-types";
import { NamedSequence, Task } from "@wso2/mi-syntax-tree/lib/src";
import { Diagram } from "@wso2/mi-diagram";
import { Button, Codicon, Alert } from "@wso2/ui-toolkit";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { View, ViewContent, ViewHeader } from "../../components/View";
import { generateSequenceData, onSequenceEdit } from "../../utils/form";
import { EditSequenceForm, EditSequenceFields } from "../Forms/EditForms/EditSequenceForm";
import { TaskForm } from "../Forms/TaskForm";
import { GetTaskResponse } from '@wso2/mi-core';
import { CreateTaskRequest, CreateSequenceRequest, EVENT_TYPE, MACHINE_VIEW } from "@wso2/mi-core";


export interface TaskViewProps {
    path: string;
    model: Task;
    diagnostics: Diagnostic[];
}

export const TaskView = ({ path, model, diagnostics }: TaskViewProps) => {
    const { rpcClient } = useVisualizerContext();
    // const data = generateSequenceData(model) as EditSequenceFields
    const [isFormOpen, setFormOpen] = React.useState(false);

    const handleEditTask = () => {
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.TaskForm, documentUri: path } });
    }

    useEffect(() => {
        if (model && model.sequence === undefined) {
            handleEditTask();
        }
    }, [model]);

    return (
        <View>
            {model && model.name &&
                <ViewHeader title={`Task: ${model.name}`} icon="task" onEdit={handleEditTask} />
            }
            {<ViewContent>
                {model && model.name && model.sequence &&
                    <Diagram
                        model={model.sequence}
                        documentUri={model.sequenceURI}
                        diagnostics={diagnostics}
                        isFormOpen={isFormOpen}
                    />
                }
            </ViewContent>}

        </View>
    )
}

