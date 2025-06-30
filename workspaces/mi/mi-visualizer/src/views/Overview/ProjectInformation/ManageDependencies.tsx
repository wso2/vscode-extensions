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

import { DependencyDetails } from "@wso2/mi-core";
import { getParamManagerValues, ParamConfig, ParamManager } from "@wso2/mi-diagram";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { Button, FormActions, FormView, Typography } from "@wso2/ui-toolkit";
import { useState } from "react";
import { Range } from "../../../../../syntax-tree/lib/src";

interface ManageDependenciesProps {
    title: string;
    dependencies: DependencyDetails[];
    type: string;
    onClose: () => void;
}
export function ManageDependencies(props: ManageDependenciesProps) {
    const { title, dependencies, type, onClose } = props;
    const { rpcClient } = useVisualizerContext();
    const [paramConfig, setParamConfig] = useState<ParamConfig>({
        paramValues: dependencies?.map((dep, index) => (
            {
                id: index,
                key: dep.groupId,
                value: dep.artifact,
                icon: 'query',
                paramValues: [
                    { value: dep.groupId },
                    { value: dep.artifact },
                    { value: dep.version },
                    { value: dep.range },
                    { value: dep.type }
                ]
            }
        )) || [],
        paramFields: [
            {
                "type": "TextField" as "TextField",
                "label": "Group ID",
                "defaultValue": "",
                "isRequired": true,
                "canChange": false
            },
            {
                "type": "TextField" as "TextField",
                "label": "Artifact ID",
                "defaultValue": "",
                "isRequired": true,
                "canChange": false
            },
            {
                "type": "TextField" as "TextField",
                "label": "Version",
                "defaultValue": "",
                "isRequired": true,
                "canChange": false
            },
            {
                "type": "TextField" as "TextField",
                "label": "Range",
                "defaultValue": "",
                "isRequired": false,
                "canChange": false,
                "enableCondition": [
                    "false"
                ]
            },
            {
                "type": "TextField" as "TextField",
                "label": "Type",
                "defaultValue": "",
                "isRequired": false,
                "canChange": false,
                "enableCondition": [
                    "false"
                ]
            }
        ]
    });

    const updateDependencies = async () => {
        const values = getParamManagerValues(paramConfig);

        const isSameRange = (range1: Range, range2: Range) => {
            return range1?.start?.line === range2?.start?.line &&
                range1?.start?.character === range2?.start?.character &&
                range1?.end?.line === range2?.end?.line &&
                range1?.end?.character === range2?.end?.character;
        }

        const updatedDependencies: any[] = [];
        const removedDependencies: any[] = [];
        for (const d of dependencies) {
            let found = false;
            for (const newDep of values) {
                if (isSameRange(d.range, newDep[3])) {
                    found = true;
                    if (d.groupId !== newDep[0] || d.artifact !== newDep[1] || d.version !== newDep[2]) {
                        updatedDependencies.push({
                            groupId: newDep[0],
                            artifact: newDep[1],
                            version: newDep[2],
                            range: newDep[3],
                            type: type
                        });
                    }
                }
            }
            if (!found) {
                removedDependencies.push(d);
            }
        }

        const addedDependencies = values.filter((dep) => { return dep[3] === undefined }).map((dep) => {
            return {
                groupId: dep[0],
                artifact: dep[1],
                version: dep[2],
                type: type
            };
        });

        const dependenciesToUpdate = [...updatedDependencies, ...addedDependencies];
        if (dependenciesToUpdate.length > 0) {
            await rpcClient.getMiVisualizerRpcClient().updateDependenciesFromOverview({
                dependencies: dependenciesToUpdate
            });
        }
        if (removedDependencies.length > 0) {
            await rpcClient.getMiVisualizerRpcClient().updatePomValues({
                pomValues: removedDependencies.map(dep => ({ range: dep.range, value: '' }))
            });
        }
        onClose();
    };

    return (
        <FormView title={title} onClose={onClose}>
            {paramConfig.paramValues.length === 0 && <Typography>No dependencies found</Typography>}
            <ParamManager
                paramConfigs={paramConfig}
                readonly={false}
                addParamText="Add Dependency"
                onChange={(values: ParamConfig) => {
                    values.paramValues = values.paramValues.map((param: any) => {
                        const paramValues = param.paramValues;
                        param.key = paramValues[0].value;
                        param.value = paramValues[1].value;
                        param.icon = 'query';
                        return param;
                    });
                    setParamConfig(values);
                }}
            />
            <FormActions>
                <Button
                    appearance="secondary"
                    onClick={onClose}
                >
                    Cancel
                </Button>
                <Button
                    appearance="primary"
                    onClick={updateDependencies}
                >
                    {"Update Dependencies"}
                </Button>
            </FormActions>
        </FormView>
    );
}
