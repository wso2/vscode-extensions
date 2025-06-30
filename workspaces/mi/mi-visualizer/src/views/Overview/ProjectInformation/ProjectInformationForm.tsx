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

import { ProjectDetailsResponse } from "@wso2/mi-core";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { useEffect, useRef, useState } from "react";

import { Button, Dropdown, Banner, FormActions, OptionProps, ProgressIndicator, TextField, Codicon, SplitView, TreeView, Typography, FormCheckBox, PasswordField, VSCodeColors } from "@wso2/ui-toolkit";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { Controller, useForm } from "react-hook-form";
import styled from "@emotion/styled";

interface ProjectInformationFormProps {
    selectedComponent?: string;
    onClose: () => void;
}

const TitleBoxShadow = styled.div`
    box-shadow: var(--vscode-scrollbar-shadow) 0 6px 6px -6px inset;
    height: 3px;
`;

const selectedTreeViewStyle = {
    cursor: "pointer",
    border: `1px solid ${VSCodeColors.FOCUS_BORDER}`,
};

const fieldGroupStyle = { display: "flex", flexDirection: "column", gap: 24, padding: "0 0 30px", marginTop: "20px", paddingLeft: "10px" };
const fieldStyle = {
    padding: "10px",
    "&:hover": { backgroundColor: "var(--vscode-settings-rowHoverBackground)" },
};
const treeViewSelectedStyle = { margin: "0px 0px 3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const treeViewStyle = { ...treeViewSelectedStyle, opacity: 0.8 };
const sectionTitleStyle = { margin: 0, paddingLeft: 20 };

export function ProjectInformationForm(props: ProjectInformationFormProps) {
    const { rpcClient } = useVisualizerContext();
    const [projectDetails, setProjectDetails] = useState<ProjectDetailsResponse>();
    const [runtimeVersions, setRuntimeVersions] = useState<OptionProps[]>([]);

    const [selectedId, setSelectedId] = useState<string | null>("Project Information");

    const schema = yup.object({
        "primaryDetails-projectName": yup.string().required("Project Name is required"),
        "primaryDetails-projectDescription": yup.string(),
        "primaryDetails-projectVersion": yup.string().required("Version is required").matches(/^[a-zA-Z0-9][a-zA-Z0-9.-]*$/, "Version cannot contain spaces or special characters"),
        "primaryDetails-runtimeVersion": yup.string().required("Runtime version is required"),
        "buildDetails-dockerDetails-dockerFileBaseImage": yup.string().required("Base image is required"),
        "buildDetails-dockerDetails-dockerName": yup.string().required("Docker name is required"),
        "buildDetails-dockerDetails-enableCipherTool": yup.boolean(),
        "buildDetails-dockerDetails-keyStoreName": yup.string(),
        "buildDetails-dockerDetails-keyStoreAlias": yup.string(),
        "buildDetails-dockerDetails-keyStoreType": yup.string(),
        "buildDetails-dockerDetails-keyStorePassword": yup.string(),
        "buildDetails-advanceDetails-projectArtifactId": yup.string(),
        "buildDetails-advanceDetails-projectGroupId": yup.string(),
        "buildDetails-advanceDetails-pluginDetails-projectBuildPluginVersion": yup.string(),
        "buildDetails-advanceDetails-pluginDetails-unitTestPluginVersion": yup.string(),
        "buildDetails-advanceDetails-pluginDetails-miContainerPluginVersion": yup.string(),
        "unitTest-skipTest": yup.boolean(),
        "unitTest-serverHost": yup.string(),
        "unitTest-serverPort": yup.string(),
        "unitTest-serverPath": yup.string(),
        "unitTest-serverType": yup.string(),
        "unitTest-serverVersion": yup.string(),
        "unitTest-serverDownloadLink": yup.string(),
        "advanced-legacyExpressionSupport": yup.boolean(),
        "deployment-deployOnRemoteServer": yup.boolean(),
        "deployment-truststorePath": yup.string().when("deployment-deployOnRemoteServer", {
            is: true,
            then: schema => schema.required("Truststore path is required when deploying on a remote server"),
            otherwise: schema => schema.notRequired(),
        }),
        "deployment-truststorePassword": yup.string().when("deployment-deployOnRemoteServer", {
            is: true,
            then: schema => schema.required("Truststore password is required when deploying on a remote server"),
            otherwise: schema => schema.notRequired(),
        }),
        "deployment-truststoreType": yup.string().when("deployment-deployOnRemoteServer", {
            is: true,
            then: schema => schema.required("Truststore type is required when deploying on a remote server"),
            otherwise: schema => schema.notRequired(),
        }),
        "deployment-serverURL": yup.string().when("deployment-deployOnRemoteServer", {
            is: true,
            then: schema => schema.required("Server URL is required when deploying on a remote server"),
            otherwise: schema => schema.notRequired(),
        }),
        "deployment-username": yup.string().when("deployment-deployOnRemoteServer", {
            is: true,
            then: schema => schema.required("Username is required when deploying on a remote server"),
            otherwise: schema => schema.notRequired(),
        }),
        "deployment-password": yup.string().when("deployment-deployOnRemoteServer", {
            is: true,
            then: schema => schema.required("Password is required when deploying on a remote server"),
            otherwise: schema => schema.notRequired(),
        }),
        "deployment-serverType": yup.string().when("deployment-deployOnRemoteServer", {
            is: true,
            then: schema => schema.required("Server type is required when deploying on a remote server"),
            otherwise: schema => schema.notRequired(),
        })
    });

    const {
        register,
        formState: { errors, dirtyFields, isSubmitting, isValid },
        handleSubmit,
        reset,
        getValues,
        control,
        watch,
    } = useForm({
        resolver: yupResolver(schema),
        mode: "all"
    });


    const divRefs: Record<string, React.RefObject<HTMLDivElement>> = {
        "Project Information": useRef<HTMLDivElement | null>(null),
        "Build Details": useRef<HTMLDivElement | null>(null),
        "Unit Test": useRef<HTMLDivElement | null>(null),
        "Deployment": useRef<HTMLDivElement | null>(null),
        "Advanced": useRef<HTMLDivElement | null>(null),
    };
    const contentRef = useRef<HTMLDivElement | null>(null); // Ref for the content div

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await rpcClient?.getMiVisualizerRpcClient().getProjectDetails();

                const isLegacyExpressionEnabled = await rpcClient.getMiVisualizerRpcClient().isSupportEnabled("LEGACY_EXPRESSION_ENABLED");
                let isRemoteDeploymentEnabled = await rpcClient.getMiVisualizerRpcClient().isSupportEnabled("REMOTE_DEPLOYMENT_ENABLED");
                let pluginDetails = null;
                if (isRemoteDeploymentEnabled) {
                    pluginDetails = await rpcClient?.getMiVisualizerRpcClient().getDeployPluginDetails();
                }
                if (props.selectedComponent && props.selectedComponent === "Deployment") {
                    isRemoteDeploymentEnabled = true;
                }
                setProjectDetails(response);

                const supportedVersions = await rpcClient.getMiVisualizerRpcClient().getSupportedMIVersionsHigherThan(response.primaryDetails.runtimeVersion.value);
                const supportedMIVersions = supportedVersions.map((version: string) => ({ value: version, content: version }));
                setRuntimeVersions(supportedMIVersions);
                reset({
                    "primaryDetails-projectName": response.primaryDetails?.projectName?.value,
                    "primaryDetails-projectDescription": response.primaryDetails?.projectDescription?.value,
                    "primaryDetails-projectVersion": response.primaryDetails?.projectVersion?.value,
                    "primaryDetails-runtimeVersion": response.primaryDetails?.runtimeVersion?.value,
                    "buildDetails-dockerDetails-dockerFileBaseImage": response.buildDetails?.dockerDetails?.dockerFileBaseImage?.value,
                    "buildDetails-dockerDetails-dockerName": response.buildDetails?.dockerDetails?.dockerName.value,
                    "buildDetails-dockerDetails-enableCipherTool": Boolean(response.buildDetails?.dockerDetails?.cipherToolEnable?.value),
                    "buildDetails-dockerDetails-keyStoreName": response.buildDetails?.dockerDetails?.keyStoreName?.value,
                    "buildDetails-dockerDetails-keyStoreAlias": response.buildDetails?.dockerDetails?.keyStoreAlias?.value,
                    "buildDetails-dockerDetails-keyStoreType": response.buildDetails?.dockerDetails?.keyStoreType?.value,
                    "buildDetails-dockerDetails-keyStorePassword": response.buildDetails?.dockerDetails?.keyStorePassword?.value,
                    "buildDetails-advanceDetails-projectArtifactId": response.buildDetails?.advanceDetails?.projectArtifactId?.value,
                    "buildDetails-advanceDetails-projectGroupId": response.buildDetails?.advanceDetails?.projectGroupId?.value,
                    "buildDetails-advanceDetails-pluginDetails-projectBuildPluginVersion": response.buildDetails?.advanceDetails?.pluginDetails?.projectBuildPluginVersion?.value,
                    "buildDetails-advanceDetails-pluginDetails-unitTestPluginVersion": response.buildDetails?.advanceDetails?.pluginDetails?.unitTestPluginVersion?.value,
                    "buildDetails-advanceDetails-pluginDetails-miContainerPluginVersion": response.buildDetails?.advanceDetails?.pluginDetails?.miContainerPluginVersion?.value,
                    "unitTest-skipTest": Boolean(response.unitTest?.skipTest?.value),
                    "unitTest-serverHost": response.unitTest?.serverHost?.value,
                    "unitTest-serverPort": response.unitTest?.serverPort?.value,
                    "unitTest-serverPath": response.unitTest?.serverPath?.value,
                    "unitTest-serverType": response.unitTest?.serverType?.value,
                    "unitTest-serverVersion": response.unitTest?.serverVersion?.value,
                    "unitTest-serverDownloadLink": response.unitTest?.serverDownloadLink?.value,
                    "advanced-legacyExpressionSupport": isLegacyExpressionEnabled,
                    "deployment-deployOnRemoteServer": isRemoteDeploymentEnabled,
                    "deployment-truststorePath": pluginDetails ? pluginDetails.truststorePath : "",
                    "deployment-truststorePassword": pluginDetails ? pluginDetails.truststorePassword : "",
                    "deployment-truststoreType": pluginDetails ? pluginDetails.truststoreType : "JKS",
                    "deployment-serverURL": pluginDetails ? pluginDetails.serverUrl : "https://localhost:9164",
                    "deployment-username": pluginDetails ? pluginDetails.username : "",
                    "deployment-password": pluginDetails ? pluginDetails.password : "",
                    "deployment-serverType": pluginDetails ? pluginDetails.serverType : "mi"
                });
                setProjectDetails(response);
            } catch (error) {
                console.error("Error fetching project details:", error);
            }
        }
        fetchData();
    }, [rpcClient, reset]);

    const scrollTo = (id: string, behavior?: ScrollBehavior) => {
        const targetDiv = divRefs[id].current;
        const contentDiv = contentRef.current;
        const targetPosition = targetDiv.getBoundingClientRect().top - contentDiv.getBoundingClientRect().top;
        contentDiv.scrollTo({
            top: targetPosition + contentDiv.scrollTop, // Add current scroll position
            behavior: behavior // Optional: for smooth scrolling
        });
    };

    useEffect(() => {
        const navigatorObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setSelectedId(entry.target.id); // Update selectedId based on the visible div
                }
            });
        }, { threshold: 0.2 }); // Adjust threshold as needed

        // Observe each div
        Object.keys(divRefs).forEach(key => {
            if (divRefs[key].current) {
                navigatorObserver.observe(divRefs[key].current);
            }
        });
        return () => {
            // Cleanup observer on unmount
            navigatorObserver.disconnect();
        };
    }, [divRefs]);

    const handleFormSubmit = async () => {
        try {
            const changes: any[] = [];
            Object.entries(dirtyFields).forEach(async ([field]) => {
                if (field === "advanced-legacyExpressionSupport") {
                    let isLegacyExpressionSupportEnabled = getValues("advanced-legacyExpressionSupport");
                    await rpcClient.getMiVisualizerRpcClient().updateProjectSettingsConfig({ configName: "LEGACY_EXPRESSION_ENABLED", value: isLegacyExpressionSupportEnabled });
                }

                const fieldValue = getValues(field as any);
                const range = field.split('-').reduce((acc, key) => acc?.[key], projectDetails as any)?.range;
                if (range) {
                    if (Array.isArray(range)) {
                        range.forEach((r: any) => {
                            changes.push({ value: fieldValue, range: r });
                        });
                    } else {
                        changes.push({ value: fieldValue, range });
                    }
                }
            });

            if (changes.length > 0) {
                // sort changes by range
                const sortedChanges = changes.sort((a, b) => b.range.start - a.range.start);

                await rpcClient.getMiVisualizerRpcClient().updatePomValues({ pomValues: sortedChanges });
            }

            let isRemoteDeploymentSupportEnabled = getValues("deployment-deployOnRemoteServer");
            await rpcClient.getMiVisualizerRpcClient().updateProjectSettingsConfig({ configName: "REMOTE_DEPLOYMENT_ENABLED",
                value: isRemoteDeploymentSupportEnabled });
            if (isRemoteDeploymentSupportEnabled) {
                await rpcClient.getMiVisualizerRpcClient().setDeployPlugin({
                    truststorePath: getValues("deployment-truststorePath"),
                    truststorePassword: getValues("deployment-truststorePassword"),
                    truststoreType: getValues("deployment-truststoreType"),
                    serverUrl: getValues("deployment-serverURL"),
                    username: getValues("deployment-username"),
                    password: getValues("deployment-password"),
                    serverType: getValues("deployment-serverType"),
                });
            } else {
                await rpcClient.getMiVisualizerRpcClient().removeDeployPlugin();
            }

            if (dirtyFields["primaryDetails-runtimeVersion"]) {
                await rpcClient.getMiVisualizerRpcClient().updateRuntimeVersionsInPom(watch("primaryDetails-runtimeVersion"));
                await rpcClient.getMiVisualizerRpcClient().reloadWindow();
            } else {
                props.onClose();
            }
        } catch (error) {
            console.error("Error updating project details:", error);
        }
    };

    useEffect(() => {
        if (!divRefs["Unit Test"].current) {
            setTimeout(() => {
                if (divRefs["Unit Test"].current) {
                    setSelectedId(props.selectedComponent);
                    scrollTo(props.selectedComponent);
                }
            }, 100);
        }
    }, []);

    const handleCancel = () => {
        props.onClose();
    };

    const handleClick = (id: string) => {
        setSelectedId(id);
        scrollTo(id);
    };

    if (!projectDetails) {
        return <ProgressIndicator />;
    }

    return (
        <div style={{ width: "auto", maxWidth: 1200, padding: "30px 60px 60px 60px" }}>
            <Typography sx={{ margin: "0 0 20px 20px" }} variant="h1">Project Settings</Typography>
            <SplitView defaultWidths={[25, 75]} dynamicContainerSx={{ overflow: "visible" }}>
                {/* Left side tree view */}
                <div style={{ padding: "10px 0 50px 0" }}>
                    <TreeView
                        rootTreeView
                        id="Project Information"
                        sx={selectedId === "Project Information" ? selectedTreeViewStyle : { cursor: "pointer" }}
                        content={
                            <Typography sx={selectedId === "Project Information" ? treeViewSelectedStyle : treeViewStyle} variant="h4">
                                Project Information
                            </Typography>
                        }
                        selectedId={selectedId}
                        onSelect={handleClick}
                    />
                    <TreeView
                        rootTreeView
                        id="Build Details"
                        sx={selectedId === "Build Details" ? selectedTreeViewStyle : { cursor: "pointer" }}
                        content={
                            <Typography sx={selectedId === "Build Details" ? treeViewSelectedStyle : treeViewStyle} variant="h4">
                                Build Details
                            </Typography>
                        }
                        selectedId={selectedId}
                        onSelect={handleClick}
                    />
                    <TreeView
                        rootTreeView
                        id="Unit Test"
                        sx={selectedId === "Unit Test" ? selectedTreeViewStyle : { cursor: "pointer" }}
                        content={
                            <Typography sx={selectedId === "Unit Test" ? treeViewSelectedStyle : treeViewStyle} variant="h4">
                                Unit Test
                            </Typography>
                        }
                        selectedId={selectedId}
                        onSelect={handleClick}
                    />
                    <TreeView
                        rootTreeView
                        id="Deployment"
                        sx={selectedId === "Deployment" ? selectedTreeViewStyle : { cursor: "pointer" }}
                        content={
                            <Typography sx={selectedId === "Deployment" ? treeViewSelectedStyle : treeViewStyle} variant="h4">
                                Deployment
                            </Typography>
                        }
                        selectedId={selectedId}
                        onSelect={handleClick}
                    />
                    <TreeView
                        rootTreeView
                        id="Advanced"
                        sx={selectedId === "Advanced" ? selectedTreeViewStyle : { cursor: "pointer" }}
                        content={
                            <Typography sx={selectedId === "Advanced" ? treeViewSelectedStyle : treeViewStyle} variant="h4">
                                Advanced
                            </Typography>
                        }
                        selectedId={selectedId}
                        onSelect={handleClick}
                    />
                </div>
                {/* Right side view */}
                <div>
                    {/* Title and subtitle */}
                    <div id="TitleDiv" style={{ position: "sticky", top: 0, zIndex: 20005, height: 60, color: "var(--vscode-editor-foreground)", backgroundColor: "var(--vscode-editor-background)" }}>
                        <Typography variant="h1" sx={{ marginTop: 0, padding: "8px 0 0 40px" }} >{selectedId}</Typography>
                        <TitleBoxShadow />
                    </div>
                    {/* Item 1 */}
                    <div id={"content"} ref={contentRef} style={{ maxHeight: '65vh', overflowY: 'auto', paddingLeft: 20 }}>
                        {/* Body 1.1 */}
                        <div ref={divRefs["Project Information"]} id="Project Information" style={fieldGroupStyle}>
                            <Controller
                                name="primaryDetails-projectName"
                                control={control}
                                rules={{
                                    validate: (value) => {
                                        if (!value) {
                                            return "Project Name is required";
                                        }
                                        return true;
                                    }
                                }}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Project Name"
                                        required
                                        description="The name of the project"
                                        descriptionSx={{ margin: "8px 0" }}
                                        errorMsg={errors["primaryDetails-projectName"]?.message?.toString()}
                                        sx={fieldStyle}
                                    />
                                )}
                            />
                            <TextField
                                label="Description"
                                description="The description of the project"
                                descriptionSx={{ margin: "8px 0" }}
                                sx={fieldStyle}
                                {...register("primaryDetails-projectDescription")}
                            />
                            <TextField
                                label="Version"
                                required
                                description="The version of the project"
                                descriptionSx={{ margin: "8px 0" }}
                                sx={fieldStyle}
                                errorMsg={errors["primaryDetails-projectVersion"]?.message?.toString()}
                                {...register("primaryDetails-projectVersion")}
                            />

                            <Dropdown
                                id='runtimeVersion'
                                label="Runtime Version"
                                required
                                description="The runtime version of the project"
                                descriptionSx={{ margin: "6px 0 8px" }}
                                containerSx={fieldStyle}
                                errorMsg={errors["primaryDetails-runtimeVersion"]?.message?.toString()}
                                items={runtimeVersions}
                                {...register("primaryDetails-runtimeVersion")}
                            />
                            {dirtyFields["primaryDetails-runtimeVersion"] && (
                                <Banner
                                    icon={<Codicon name="warning" sx={{ fontSize: 12 }} />}
                                    type="warning"
                                    message={`The extension will restart after saving changes. You will have to set the server runtime again post-restart.\nPlugin versions will also be updated automatically to support the new runtime version.`}
                                />
                            )}
                        </div>
                        <Typography variant="h1" sx={sectionTitleStyle} > Build Details </Typography>
                        <div ref={divRefs["Build Details"]} id="Build Details" style={fieldGroupStyle}>
                            <TextField
                                label="Base Image"
                                required
                                errorMsg={errors["buildDetails-dockerDetails-dockerFileBaseImage"]?.message?.toString()}
                                description="The base image of the project"
                                descriptionSx={{ margin: "8px 0" }}
                                sx={fieldStyle}
                                {...register("buildDetails-dockerDetails-dockerFileBaseImage")}
                            />
                            <TextField
                                label="Docker Name"
                                required
                                errorMsg={errors["buildDetails-dockerDetails-dockerName"]?.message?.toString()}
                                description="The name of the docker"
                                descriptionSx={{ margin: "10px 0" }}
                                sx={fieldStyle}
                                {...register("buildDetails-dockerDetails-dockerName")}
                            />
                            <FormCheckBox
                                label="Enable Cipher Tool"
                                description="Enables the cipher tool"
                                descriptionSx={{ margin: "10px 0" }}
                                control={control as any}
                                sx={fieldStyle}
                                {...register("buildDetails-dockerDetails-enableCipherTool")}
                            />
                            <TextField
                                label="Keystore Name"
                                description="The name of the keystore"
                                descriptionSx={{ margin: "8px 0" }}
                                sx={fieldStyle}
                                {...register("buildDetails-dockerDetails-keyStoreName")}
                            />
                            <TextField
                                label="Keystore Alias"
                                description="The alias of the keystore"
                                descriptionSx={{ margin: "8px 0" }}
                                sx={fieldStyle}
                                {...register("buildDetails-dockerDetails-keyStoreAlias")}
                            />
                            <TextField
                                label="Keystore Type"
                                description="The type of the keystore"
                                descriptionSx={{ margin: "8px 0" }}
                                sx={fieldStyle}
                                {...register("buildDetails-dockerDetails-keyStoreType")}
                            />
                            <PasswordField
                                label="Keystore Password"
                                description="The password of the keystore"
                                descriptionSx={{ margin: "8px 0" }}
                                sx={fieldStyle}
                                {...register("buildDetails-dockerDetails-keyStorePassword")}
                            />
                            <TextField
                                label="Maven Artifact Id"
                                description="The artifact id of the maven"
                                descriptionSx={{ margin: "8px 0" }}
                                sx={fieldStyle}
                                {...register("buildDetails-advanceDetails-projectArtifactId")}
                            />
                            <TextField
                                label="Maven Group Id"
                                description="The group id of the maven"
                                descriptionSx={{ margin: "8px 0" }}
                                sx={fieldStyle}
                                {...register("buildDetails-advanceDetails-projectGroupId")}
                            />
                            <TextField
                                label="CAR Plugin Version"
                                description="The version of the car plugin"
                                descriptionSx={{ margin: "8px 0" }}
                                sx={fieldStyle}
                                {...register("buildDetails-advanceDetails-pluginDetails-projectBuildPluginVersion")}
                            />
                            <TextField
                                label="Unit Test Plugin Version"
                                description="The version of the unit test plugin"
                                descriptionSx={{ margin: "8px 0" }}
                                sx={fieldStyle}
                                {...register("buildDetails-advanceDetails-pluginDetails-unitTestPluginVersion")}
                            />
                            <TextField
                                label="MI Config Mapper Plugin Version"
                                description="The version of the mi config mapper plugin"
                                descriptionSx={{ margin: "8px 0" }}
                                sx={fieldStyle}
                                {...register("buildDetails-advanceDetails-pluginDetails-miContainerPluginVersion")}
                            />
                        </div>
                        <Typography variant="h1" sx={sectionTitleStyle} > Unit Test </Typography>
                        <div ref={divRefs["Unit Test"]} id="Unit Test" style={fieldGroupStyle}>
                            <TextField
                                label="Server Host"
                                description="The host of the server"
                                descriptionSx={{ margin: "8px 0" }}
                                sx={fieldStyle}
                                {...register("unitTest-serverHost")}
                            />
                            <TextField
                                label="Server Port"
                                description="The port of the server"
                                descriptionSx={{ margin: "8px 0" }}
                                sx={fieldStyle}
                                {...register("unitTest-serverPort")}
                            />
                            <TextField
                                label="Server Path"
                                description="The path of the server"
                                descriptionSx={{ margin: "8px 0" }}
                                sx={fieldStyle}
                                {...register("unitTest-serverPath")}
                            />
                            <TextField
                                label="Server Type"
                                description="The type of the server"
                                descriptionSx={{ margin: "8px 0" }}
                                sx={fieldStyle}
                                {...register("unitTest-serverType")}
                            />
                            <TextField
                                label="Server Version"
                                description="The version of the server"
                                descriptionSx={{ margin: "8px 0" }}
                                sx={fieldStyle}
                                {...register("unitTest-serverVersion")}
                            />
                            <TextField
                                label="Server Download Link"
                                description="The download link of the server"
                                descriptionSx={{ margin: "8px 0" }}
                                sx={fieldStyle}
                                {...register("unitTest-serverDownloadLink")}
                            />
                        </div>
                        <Typography variant="h1" sx={sectionTitleStyle} > Deployment </Typography>
                        <div ref={divRefs["Deployment"]} id="Deployment" style={{ ...fieldGroupStyle, paddingBottom: 0 }}>
                            <FormCheckBox
                                label="Deploy to a remote server"
                                description="Enables deploying to a remote server"
                                descriptionSx={{ margin: "10px 0" }}
                                control={control as any}
                                sx={fieldStyle}
                                {...register("deployment-deployOnRemoteServer")}
                            />
                            {watch("deployment-deployOnRemoteServer") && (
                                <>
                                    <TextField
                                        label="Truststore Path"
                                        description="File path of the truststore used in the server"
                                        descriptionSx={{ margin: "8px 0" }}
                                        sx={fieldStyle}
                                        {...register("deployment-truststorePath")}
                                    />
                                    <PasswordField
                                        label="Truststore Password"
                                        description="Password of the truststore"
                                        descriptionSx={{ margin: "8px 0" }}
                                        sx={fieldStyle}
                                        {...register("deployment-truststorePassword")}
                                    />
                                    <TextField
                                        label="Truststore Type"
                                        description="Type of the truststore"
                                        descriptionSx={{ margin: "8px 0" }}
                                        sx={fieldStyle}
                                        {...register("deployment-truststoreType")}
                                    />
                                    <TextField
                                        label="Server URL"
                                        description="Management API URL of the server"
                                        descriptionSx={{ margin: "8px 0" }}
                                        sx={fieldStyle}
                                        {...register("deployment-serverURL")}
                                    />
                                    <TextField
                                        label="Username"
                                        description="Server administrator username"
                                        descriptionSx={{ margin: "8px 0" }}
                                        sx={fieldStyle}
                                        {...register("deployment-username")}
                                    />
                                    <PasswordField
                                        label="Password"
                                        description="Server administrator password"
                                        descriptionSx={{ margin: "8px 0" }}
                                        sx={fieldStyle}
                                        {...register("deployment-password")}
                                    />
                                    <TextField
                                        label="Server Type"
                                        description="Type of the WSO2 server"
                                        descriptionSx={{ margin: "8px 0" }}
                                        sx={fieldStyle}
                                        {...register("deployment-serverType")}
                                    />
                                </>
                            )}
                        </div>
                        <Typography variant="h1" sx={sectionTitleStyle} > Advanced </Typography>
                        <div ref={divRefs["Advanced"]} id="Advanced" style={{ ...fieldGroupStyle, paddingBottom: 0 }}>
                            <FormCheckBox
                                label="Legacy Expression Support"
                                description="Enables the legacy expression support"
                                descriptionSx={{ margin: "10px 0" }}
                                control={control as any}
                                sx={fieldStyle}
                                {...register("advanced-legacyExpressionSupport")}
                            />
                        </div>
                    </div>
                    <div style={{ position: "sticky", bottom: 0, zIndex: 20005, height: 40, backgroundColor: "var(--vscode-editor-background)" }}>
                        {/* <TitleBoxShadow/> */}
                        <FormActions>
                            <Button
                                appearance="secondary"
                                onClick={handleCancel}
                            >
                                Cancel
                            </Button>
                            <Button
                                appearance="primary"
                                onClick={handleSubmit(handleFormSubmit)}
                                disabled={!Object.keys(dirtyFields).length || isSubmitting || !isValid}
                            >
                                Save Changes
                            </Button>
                        </FormActions>
                    </div>
                </div>
            </SplitView>
        </div>
    );
}
