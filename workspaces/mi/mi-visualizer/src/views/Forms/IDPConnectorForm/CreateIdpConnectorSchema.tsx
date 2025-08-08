/*
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
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

