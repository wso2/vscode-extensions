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
import { Button, TextField, FormView, FormActions } from "@wso2/ui-toolkit";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { EVENT_TYPE, MACHINE_VIEW, POPUP_EVENT_TYPE } from "@wso2/mi-core";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useForm } from "react-hook-form";

export interface CreateIdpConnectorSchemaProps {
    isPopup?: boolean;
    handlePopupClose?: () => void;
}

type InputsFields = {
    name?: string;
};

const initialSequence: InputsFields = {
    name: ""
};

export function CreateIdpConnectorSchema(props: CreateIdpConnectorSchemaProps) {
    const { rpcClient } = useVisualizerContext();
    const [workspaceFileNames, setWorkspaceFileNames] = useState([]);

    const schema = yup.object({
        name: yup.string().required("Schema file name is required")
            .matches(/^[a-zA-Z0-9_-]*$/, "Invalid characters in sequence name")
            .test(
                'validateSchemaName',
                'A schema with same name already exists',
                value => {
                    return !workspaceFileNames.includes(value);
                }
            )
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
            const idpSchemas = await rpcClient.getMiDiagramRpcClient().getIdpSchemaFiles();
            setWorkspaceFileNames(idpSchemas.schemaFiles.map((file) => file.fileName));
        })();
    }, []);

    const handleCreateOutputSchema = async () => {
        await rpcClient.getMiDiagramRpcClient().writeIdpSchemaFileToRegistry({
            fileContent: "{}",
            schemaName: getValues("name"),
            writeToArtifactFile: true,
        });

        rpcClient.getMiVisualizerRpcClient().openView({
            type: POPUP_EVENT_TYPE.CLOSE_VIEW,
            location: {
                view: null,
                recentIdentifier: getValues('name')
            },
            isPopup: true,
        });
    };

    const handleCancel = () => {
        props.handlePopupClose
            ? props.handlePopupClose()
            : rpcClient!.getMiVisualizerRpcClient().openView({
                type: EVENT_TYPE.OPEN_VIEW,
                location: { view: MACHINE_VIEW.Overview }
            });
    };

    const handleBackButtonClick = () => {
        props.handlePopupClose
            ? props.handlePopupClose()
            : rpcClient!.getMiVisualizerRpcClient().goBack();
    };

    return (
        <FormView title="Create New Output Schema" onClose={handleBackButtonClick}>
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
                    onClick={handleSubmit(handleCreateOutputSchema)}
                >
                    Create
                </Button>
            </FormActions>
        </FormView>
    );
}

