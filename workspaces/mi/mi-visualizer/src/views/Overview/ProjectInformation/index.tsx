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

import { DependencyDetails, MACHINE_VIEW, ParentPopupData, PomNodeDetails, POPUP_EVENT_TYPE, ProjectDetailsResponse } from "@wso2/mi-core";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { useEffect, useState } from "react";

import { Icon, ProgressIndicator, Typography, Divider, Button } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { ParamConfig, ParamManager } from "@wso2/mi-diagram";
import { VSCodeLink } from "@vscode/webview-ui-toolkit/react";

const Item = styled.div`
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    opacity: 0.6;

    & > p {
        margin: 0px;
    }
`;

interface ProjectInformationProps {
}
export function ProjectInformation(props: ProjectInformationProps) {
    const { rpcClient } = useVisualizerContext();
    const [projectDetails, setProjectDetails] = useState<ProjectDetailsResponse>();
    const [connectorDependencies, setConnectorDependencies] = useState<ParamConfig>({
        paramValues: [],
        paramFields: []
    });
    const [otherDependencies, setOtherDependencies] = useState<ParamConfig>({
        paramValues: [],
        paramFields: []
    });
    const [pomTimestamp, setPomTimestamp] = useState<number>(0);

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await rpcClient.getMiVisualizerRpcClient().getProjectDetails();
                setProjectDetails(response);
                setDependencies(response.dependencies.connectorDependencies, setConnectorDependencies);
                setDependencies(response.dependencies.otherDependencies, setOtherDependencies);
            } catch (error) {
                console.error("Error fetching project details:", error);
            }
        }
        fetchData();
    }, [props]);

    const setDependencies = (dependencies: DependencyDetails[], setDependencies: any) => {
        setDependencies({
            paramValues: dependencies.map((dep, index) => (
                {
                    id: index,
                    key: dep.groupId,
                    value: dep.artifact,
                    icon: 'package',
                    paramValues: [
                        { value: dep.groupId },
                        { value: dep.artifact },
                    ]
                }
            )) || [],
            paramFields: [
                {
                    "type": "TextField" as "TextField",
                    "label": "Group ID",
                    "defaultValue": "",
                    "isRequired": false,
                    "canChange": false
                },
                {
                    "type": "TextField" as "TextField",
                    "label": "Artifact ID",
                    "defaultValue": "",
                    "isRequired": false,
                    "canChange": false
                },
            ]
        });
    };

    const openManageDependencies = (title: string, dependencies: DependencyDetails[], type: string) => {
        rpcClient.getMiVisualizerRpcClient().openView({
            type: POPUP_EVENT_TYPE.OPEN_VIEW,
            location: { view: MACHINE_VIEW.ManageDependencies, customProps: { title, dependencies, type } },
            isPopup: true
        });
    }

    const openManageConfigs = (configs: PomNodeDetails[]) => {
        rpcClient.getMiVisualizerRpcClient().openView({
            type: POPUP_EVENT_TYPE.OPEN_VIEW,
            location: { view: MACHINE_VIEW.ManageConfigurables, customProps: { configs } },
            isPopup: true
        });
    }

    if (!projectDetails) {
        return <ProgressIndicator />;
    }

    const { primaryDetails, buildDetails, dependencies, unitTest, configurables } = projectDetails;

    function Dependencies(title: string, dependencies: DependencyDetails[], type: string, config: ParamConfig, onChange: (values: ParamConfig) => void) {
        return <div>
            {!dependencies || dependencies.length === 0 ? <Typography sx={{margin: "10px 0 0", opacity: 0.6}}>No dependencies found</Typography> :
                <ParamManager
                    sx={{ opacity: 0.8 }}
                    paramConfigs={config}
                    readonly={true}
                    allowAddItem={false}
                    onChange={(values: ParamConfig) => {
                        values.paramValues = values.paramValues.map((param: any) => {
                            const paramValues = param.paramValues;
                            param.key = paramValues[0].value;
                            param.value = paramValues[1].value;
                            param.icon = 'query';
                            return param;
                        });
                        onChange(values);
                    }}
                />}
            <VSCodeLink onClick={() => openManageDependencies(title, dependencies, type)}>
                <div style={{
                    display: 'flex',
                    padding: '10px 0 0'
                }}>Manage Dependencies <Icon name="link-external" id={"link-external-manage-dependencies-" + title} isCodicon sx={{ marginLeft: '5px' }} />
                </div>
            </VSCodeLink>
        </div>;
    }

    function Configurables(configs: PomNodeDetails[]) {
        return <>
            {!configs || configs.length === 0 ? <Typography sx={{opacity: 0.6}}>No configurables found</Typography> :
                <ParamManager
                    allowDuplicates={false}
                    sx={{ opacity: 0.8 }}
                    paramConfigs={{
                        paramValues: configurables.map((config, index) => (
                            {
                                id: index,
                                key: config.key,
                                value: config.value,
                                icon: 'query',
                                paramValues: [
                                    { value: config.key },
                                    { value: config.value },
                                ]
                            }
                        )) || [],
                        paramFields: [
                            {
                                "type": "TextField",
                                "label": "Key",
                                "defaultValue": "",
                                "isRequired": false,
                                "canChange": false
                            },
                            {
                                "type": "TextField",
                                "label": "Value",
                                "defaultValue": "",
                                "isRequired": false,
                                "canChange": false
                            },
                        ]
                    }}
                    readonly={true}
                    allowAddItem={false}
                />}
            <VSCodeLink onClick={() => openManageConfigs(configs)}>
                <div style={{
                    display: 'flex',
                    padding: '10px 0 0'
                }}>Manage Configurables <Icon name="link-external" isCodicon sx={{ marginLeft: '5px' }} />
                </div>
            </VSCodeLink>
        </>;
    }

    const handleEditProjectInformation = (componentType: string) => {
        rpcClient.getMiVisualizerRpcClient().openView({
            type: POPUP_EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.ProjectInformationForm,
                customProps: componentType
            },
            
            isPopup: true
        });

        rpcClient.onParentPopupSubmitted((data: ParentPopupData) => {
            setPomTimestamp(pomTimestamp + 1);
        });
    };

    return (
        <div>
            <Typography variant="h4" sx={{ margin: "10px 0 12px", opacity: 0.8, display: 'flex', alignItems: 'center' }}>
                Project Information
                <div style={{ display: "flex", paddingRight: 6, flex: 1, justifyContent: "flex-end" }}>
                    <Button appearance="icon" tooltip="Edit Project Information" onClick={() => handleEditProjectInformation("Project Information")}>
                        <Icon name="gear" isCodicon sx={{ flex: 1 }} />
                    </Button>
                </div>
            </Typography>
            <Item>
                <Icon name="project" sx={{ marginRight: '8px' }} />
                <Typography>Name: {primaryDetails.projectName.value}</Typography>
            </Item>
            <Item>
                <Icon name="info" isCodicon sx={{ marginRight: '8px' }} />
                <Typography>Description: {primaryDetails.projectDescription.value}</Typography>
            </Item>
            <Item>
                <Icon name="versions" isCodicon sx={{ marginRight: '8px' }} />
                <Typography>Version: {primaryDetails.projectVersion.value}</Typography>
            </Item>
            <Item>
                <Icon name="vm" isCodicon sx={{ marginRight: '8px' }} />
                <Typography>Runtime Version: {primaryDetails.runtimeVersion.value}</Typography>
            </Item>

            <Divider />

            <Typography variant="h4" sx={{margin: "10px 0 12px", opacity: 0.8}}>Configurables</Typography>
            {Configurables(configurables)}

            <Divider />

            <Typography variant="h4" sx={{margin: "10px 0 12px", opacity: 0.8}}>Connector Dependencies</Typography>
            {Dependencies("Connector Dependencies", dependencies?.connectorDependencies, "zip", connectorDependencies, setConnectorDependencies)}

            <Divider />

            <Typography variant="h4" sx={{margin: "10px 0 12px", opacity: 0.8}}>Other Dependencies</Typography>
            {Dependencies("Other Dependencies", dependencies?.otherDependencies, "jar", otherDependencies, setOtherDependencies)}

            <Divider />

            <Typography variant="h4" sx={{margin: "10px 0 12px", opacity: 0.8, display: 'flex', alignItems: 'center'}}>
                Build Details
                <div style={{ display: "flex", paddingRight: 6, flex: 1, justifyContent: "flex-end" }}>
                    <Button appearance="icon" tooltip="Edit Project Information" onClick={() => handleEditProjectInformation("Build Details")}>
                        <Icon name="gear" isCodicon sx={{ flex: 1 }} />
                    </Button>
                </div>
            </Typography>
            <Item>
                <Icon name="file-code" isCodicon sx={{ marginRight: '8px' }} />
                <Typography>Base Image: {buildDetails?.dockerDetails?.dockerFileBaseImage?.displayValue || buildDetails?.dockerDetails?.dockerFileBaseImage?.value}</Typography>
            </Item>
            <Item>
                <Icon name="package" isCodicon sx={{ marginRight: '8px' }} />
                <Typography>Docker Name: {buildDetails?.dockerDetails?.dockerName?.displayValue || buildDetails?.dockerDetails?.dockerName?.value}</Typography>
            </Item>
            <Item>
                <Icon name="tools" isCodicon sx={{ marginRight: '8px' }} />
                <Typography>Enable Cipher Tool: {buildDetails?.dockerDetails?.cipherToolEnable?.displayValue || buildDetails?.dockerDetails?.cipherToolEnable?.value}</Typography>
            </Item>
            <Item>
                <Icon name="key" isCodicon sx={{ marginRight: '8px' }} />
                <Typography>Keystore Name: {buildDetails?.dockerDetails?.keyStoreName?.displayValue || buildDetails?.dockerDetails?.keyStoreName?.value}</Typography>
            </Item>
            <Item>
                <Icon name="symbol-key" isCodicon sx={{ marginRight: '8px' }} />
                <Typography>Keystore Alias: {buildDetails?.dockerDetails?.keyStoreAlias?.displayValue || buildDetails?.dockerDetails?.keyStoreAlias?.value}</Typography>
            </Item>
            <Item>
                <Icon name="bi-type" sx={{ marginRight: '8px' }} />
                <Typography>Keystore Type: {buildDetails?.dockerDetails?.keyStoreType?.displayValue || buildDetails?.dockerDetails?.keyStoreType?.value}</Typography>
            </Item>
            <Item>
                <Icon name="gist-secret" isCodicon sx={{ marginRight: '8px' }} />
                <Typography>Keystore Password: {'*'.repeat(buildDetails?.dockerDetails?.keyStorePassword?.value?.length || 0)}</Typography>
            </Item>
            {buildDetails?.advanceDetails?.projectArtifactId?.value && (
                <Item>
                    <Icon name="file-code" isCodicon sx={{ marginRight: '8px' }} />
                    <Typography>Maven Artifact ID: {buildDetails?.advanceDetails?.projectArtifactId?.displayValue || buildDetails?.advanceDetails?.projectArtifactId?.value}</Typography>
                </Item>
            )}
            {buildDetails?.advanceDetails?.projectGroupId?.value && (
                <Item>
                    <Icon name="package" isCodicon sx={{ marginRight: '8px' }} />
                    <Typography>Maven Group ID: {buildDetails?.advanceDetails?.projectGroupId?.displayValue || buildDetails?.advanceDetails?.projectGroupId?.value}</Typography>
                </Item>
            )}
            {buildDetails?.advanceDetails?.pluginDetails?.projectBuildPluginVersion?.value && (
                <Item>
                    <Icon name="versions" isCodicon sx={{ marginRight: '8px' }} />
                    <Typography>Build Plugin Version: {buildDetails?.advanceDetails?.pluginDetails?.projectBuildPluginVersion?.displayValue || buildDetails?.advanceDetails?.pluginDetails?.projectBuildPluginVersion?.value}</Typography>
                </Item>
            )}
            {buildDetails?.advanceDetails?.pluginDetails?.unitTestPluginVersion?.value && (
                <Item>
                    <Icon name="versions" isCodicon sx={{ marginRight: '8px' }} />
                    <Typography>Unit Test Plugin Version: {buildDetails?.advanceDetails?.pluginDetails?.unitTestPluginVersion?.displayValue || buildDetails?.advanceDetails?.pluginDetails?.unitTestPluginVersion?.value}</Typography>
                </Item>
            )}
            {buildDetails?.advanceDetails?.pluginDetails?.miContainerPluginVersion?.value && (
                <Item>
                    <Icon name="versions" isCodicon sx={{ marginRight: '8px' }} />
                    <Typography>Config Mapper Plugin Version: {buildDetails?.advanceDetails?.pluginDetails?.miContainerPluginVersion?.displayValue || buildDetails?.advanceDetails?.pluginDetails?.miContainerPluginVersion?.value}</Typography>
                </Item>
            )}

            <Divider />

            <Typography variant="h4" sx={{margin: "10px 0 12px", opacity: 0.8, display: "flex", alignItems: 'center'}}>
                Unit Tests Configuration
                <div style={{ display: "flex", paddingRight: 6, flex: 1, justifyContent: "flex-end" }}>
                    <Button appearance="icon" tooltip="Edit Project Information" onClick={() => handleEditProjectInformation("Unit Test")}>
                        <Icon name="gear" isCodicon sx={{ flex: 1 }} />
                    </Button>
                </div>
            </Typography>
            <Item>
                <Icon name="check" isCodicon sx={{ marginRight: '8px' }} />
                <Typography>Skip Tests: {unitTest?.skipTest?.displayValue || unitTest?.skipTest?.value}</Typography>
            </Item>
            <Item>
                <Icon name="server" isCodicon sx={{ marginRight: '8px' }} />
                <Typography>Server Host: {unitTest?.serverHost?.displayValue || unitTest?.serverHost?.value}</Typography>
            </Item>
            <Item>
                <Icon name="settings" isCodicon sx={{ marginRight: '8px' }} />
                <Typography>Server Port: {unitTest?.serverPort?.displayValue || unitTest?.serverPort?.value}</Typography>
            </Item>
            <Item>
                <Icon name="folder" isCodicon sx={{ marginRight: '8px' }} />
                <Typography>Server Path: {unitTest?.serverPath?.displayValue || unitTest?.serverPath?.value}</Typography>
            </Item>
            <Item>
                <Icon name="bi-type" sx={{ marginRight: '8px' }} />
                <Typography>Server Type: {unitTest?.serverType?.displayValue || unitTest?.serverType?.value}</Typography>
            </Item>
            <Item>
                <Icon name="versions" isCodicon sx={{ marginRight: '8px' }} />
                <Typography>Server Version: {unitTest?.serverVersion?.displayValue || unitTest?.serverVersion?.value}</Typography>
            </Item>
            <Item>
                <Icon name="desktop-download" isCodicon sx={{ marginRight: '8px' }} />
                <Typography>Server Download Link: {unitTest?.serverDownloadLink?.displayValue || unitTest?.serverDownloadLink?.value}</Typography>
            </Item>
        </div>
    );
}
