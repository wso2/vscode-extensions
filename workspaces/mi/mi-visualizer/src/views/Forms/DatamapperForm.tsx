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

import { useEffect, useState } from "react";
import { Button, FormGroup, TextField, FormView, FormActions, Dropdown, OptionProps } from "@wso2/ui-toolkit";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { EVENT_TYPE, MACHINE_VIEW, POPUP_EVENT_TYPE } from "@wso2/mi-core";
import { yupResolver } from "@hookform/resolvers/yup"
import * as yup from "yup";
import { useForm } from "react-hook-form";
import { compareVersions } from "@wso2/mi-diagram/lib/utils/commons";
import { RUNTIME_VERSION_440 } from "../../constants";

export interface DatamapperFormProps {
    path: string;
    isPopup?: boolean;
    handlePopupClose?: () => void;
}

type InputsFields = {
    name?: string;
};

const initialSequence: InputsFields = {
    name: ""
};

const MappingTypes: OptionProps[] = [
    { value: "json", content: "JSON" },
    { value: "xml", content: "XML" },
    { value: "csv", content: "CSV" }
];

export function DatamapperForm(props: DatamapperFormProps) {
    const { rpcClient } = useVisualizerContext();
    const [workspaceFileNames, setWorkspaceFileNames] = useState([]);

    const isNewTemplate = !props?.path?.endsWith(".xml");

    const schema = yup.object({
        name: yup.string().required("Mapping file name is required").matches(/^[a-zA-Z0-9_-]*$/, "Invalid characters in sequence name")
            .test('validateDatamapperName',
                'An artifact with same name already exists', value => {
                    return !workspaceFileNames.includes(value)
                })
    });

    const {
        register,
        handleSubmit,
        getValues,
        formState: { errors, isDirty },
    } = useForm<InputsFields>({
        defaultValues: initialSequence,
        resolver: yupResolver(schema),
        mode: "onChange",
    });

    useEffect(() => {
        (async () => {
            const artifactRes = await rpcClient!.getMiDiagramRpcClient().getAvailableResources({
                documentIdentifier: props.path,
                resourceType: "dataMapper"
            });
            setWorkspaceFileNames(artifactRes.registryResources.map((resource: any) => resource.name.replace(/\.ts$/, "")));
        })();
    }, []);

    const handleCreateDatamapper = async () => {
        const projectDetails = await rpcClient.getMiVisualizerRpcClient().getProjectDetails();
        const runtimeVersion = projectDetails.primaryDetails.runtimeVersion.value;
        const isResourceContentUsed = compareVersions(runtimeVersion, RUNTIME_VERSION_440) >= 0;
        const localPathPrefix = isResourceContentUsed ? 'resources' : 'gov';
        const configName = getValues("name");
        if (configName === "") {
            return;
        }

        const configurationLocalPath = localPathPrefix + ':/datamapper/' + configName + '/' + configName + '.dmc';
        const dataMapperIdentifier = localPathPrefix + ':datamapper/' + configName;
        const request = {
            sourcePath: props.path,
            regPath: configurationLocalPath
        };
        const dmCreateRequest = {
            dmLocation: "",
            filePath: props.path,
            dmName: configName
        };
        const response = await rpcClient.getMiDataMapperRpcClient().createDMFiles(dmCreateRequest);
        const responseAbsPath = await rpcClient.getMiDataMapperRpcClient().convertRegPathToAbsPath(request);
        const state = await rpcClient.getVisualizerState();
        if (props.isPopup) {
            rpcClient.getMiVisualizerRpcClient().openView({
                type: POPUP_EVENT_TYPE.CLOSE_VIEW,
                location: { view: null, recentIdentifier: dataMapperIdentifier },
                isPopup: true
            });
        } else {
            rpcClient.getMiVisualizerRpcClient().openView({
                type: EVENT_TYPE.OPEN_VIEW,
                location: {
                    ...state,
                    documentUri: responseAbsPath.absPath,
                    view: MACHINE_VIEW.DataMapperView,
                    dataMapperProps: {
                        filePath: responseAbsPath.absPath,
                        configName: configName
                    }
                }
            });
        }
    }

    const handleCancel = () => {
        props.handlePopupClose ? props.handlePopupClose() : rpcClient!.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });
    };

    const handleBackButtonClick = () => {
        props.handlePopupClose ? props.handlePopupClose() : rpcClient!.getMiVisualizerRpcClient().goBack();
    }

    return (
        <FormView title={isNewTemplate ? "Create New Datamapper" : "Update Datamapper"} onClose={handleBackButtonClick} >
            <TextField
                id='name-input'
                label="Name"
                placeholder="Name"
                errorMsg={errors.name?.message?.toString()}
                {...register("name")}
            />

            <FormActions>
                <Button
                    appearance="secondary"
                    onClick={handleCancel}
                >
                    Cancel
                </Button>
                <Button
                    appearance="primary"
                    disabled={!isDirty}
                    onClick={handleSubmit(handleCreateDatamapper)}
                >
                    {isNewTemplate ? "Create" : "Save Changes"}
                </Button>
            </FormActions>
        </FormView>
    );
}
