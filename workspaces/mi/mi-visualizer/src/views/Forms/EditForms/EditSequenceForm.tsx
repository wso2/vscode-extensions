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
import React, { useEffect, useState } from "react";
import {
    Button,
    TextField,
    FormView,
    FormActions,
    FormCheckBox,
    FormAutoComplete,
} from "@wso2/ui-toolkit";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { Resolver, useForm } from "react-hook-form";
import { FormKeylookup } from "@wso2/mi-diagram";
import { set } from "lodash";

export type EditSequenceFields = {
    name?: string;
    onError?: string;
    trace?: boolean;
    statistics?: boolean;
}

export type ResourceProps = {
    isOpen: boolean;
    sequenceData: EditSequenceFields;
    onCancel: () => void;
    onSave: (data: EditSequenceFields) => void;
    documentUri: string;
};


export function EditSequenceForm({ sequenceData, isOpen, onCancel, onSave, documentUri }: ResourceProps) {

    const { rpcClient } = useVisualizerContext();
    const [artifactNames, setArtifactNames] = useState([]);
    const [workspaceFileNames, setWorkspaceFileNames] = useState([]);

    const initialSequence: EditSequenceFields = {
        name: sequenceData.name,
        onError: sequenceData.onError,
        trace: sequenceData.trace,
        statistics: sequenceData.statistics,
    };

    const schema = yup.object({
        name: yup.string().required("Sequence name is required").matches(/^[a-zA-Z0-9_-]*$/, "Invalid characters in sequence name")
            .test('validateSequenceName',
                'An artifact with same name already exists', value => {
                    return !(workspaceFileNames.includes(value) && sequenceData.name !== value)
                }).test('validateArtifactName',
                    'A registry resource with this artifact name already exists', value => {
                        return !(artifactNames.includes(value) && sequenceData.name !== value)
                    }),
        endpoint: yup.string().notRequired(),
        onError: yup.string().notRequired(),
        trace: yup.boolean().default(false),
        statistics: yup.boolean().default(false),
    });

    type EditSequanceFieldsType = yup.InferType<typeof schema>;

    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isDirty },
    } = useForm<EditSequanceFieldsType>({
        defaultValues: initialSequence,
        resolver: yupResolver(schema) as Resolver<EditSequanceFieldsType>,
        mode: "onChange",
    });

    useEffect(() => {
        (async () => {
            const artifactRes = await rpcClient.getMiDiagramRpcClient().getAllArtifacts({
                path: documentUri,
            });
            setWorkspaceFileNames(artifactRes.artifacts);
            const regArtifactRes = await rpcClient.getMiDiagramRpcClient().getAvailableRegistryResources({
                path: documentUri
            });
            setArtifactNames(regArtifactRes.artifacts);
        })();
    }, []);

    return (
        <FormView title={`Edit Sequence : ${sequenceData.name}`} onClose={onCancel}>
            <TextField
                id='seqName'
                label="Name"
                placeholder="Name"
                required
                errorMsg={errors.name?.message.toString()}
                {...register("name")}
            />
            <FormCheckBox
                label="Enable statistics"
                {...register("statistics")}
                control={control as any}
            />
            <FormCheckBox
                label="Enable tracing"
                {...register("trace")}
                control={control as any}
            />
            <FormKeylookup
                control={control}
                label="On Error Sequence"
                name="onErrorSequence"
                filterType="sequence"
                path={documentUri}
                errorMsg={errors.onError?.message.toString()}
                {...register("onError")}
            />
            <FormActions>
                <Button
                    appearance="secondary"
                    onClick={onCancel}
                >
                    Cancel
                </Button>
                <Button
                    data-testid="update-button"
                    appearance="primary"
                    disabled={!isDirty}
                    onClick={handleSubmit((values) => onSave(values))}
                >
                    Update
                </Button>
            </FormActions>
        </FormView>
    );
}

