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
import { Button, TextField, FormView, FormActions } from "@wso2/ui-toolkit";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { EVENT_TYPE, MACHINE_VIEW } from "@wso2/mi-core";
import { yupResolver } from "@hookform/resolvers/yup"
import * as yup from "yup";
import { useForm } from "react-hook-form";

export interface ClassMediatorProps {
    path: string;
}

type InputsFields = {
    packageName?: string;
    className?: string;
};

const initialClassMediator: InputsFields = {
    packageName: "com.example",
    className: "SampleMediator"
};

const schema = yup.object({
    packageName: yup.string()
        .required("Package Name is required")
        .matches(/^([a-zA-Z_$][a-zA-Z\d_$]*\.)*[a-zA-Z_$][a-zA-Z\d_$]*$/, "Invalid Package Name"),
    className: yup.string()
        .required("Class Name is required")
        .matches(/^[a-zA-Z][a-zA-Z\d_$]*$/, "Invalid Class Name")
});

export function ClassMediatorForm(props: ClassMediatorProps) {

    const { rpcClient } = useVisualizerContext();

    const {
        register,
        formState: { errors },
        handleSubmit,
    } = useForm({
        defaultValues: initialClassMediator,
        resolver: yupResolver(schema),
        mode: "onChange"
    });

    const openOverview = () => {
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });
    };

    const handleBackButtonClick = () => {
        rpcClient.getMiVisualizerRpcClient().goBack();
    };


    const handleCreateMediator = async (values: InputsFields) => {
        const request = {
            projectDirectory: props.path,
            packageName: values.packageName,
            className: values.className
        };
        const response = await rpcClient.getMiDiagramRpcClient().createClassMediator(request);
        if (response) {
            rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });
            rpcClient.getMiDiagramRpcClient().openFile(response);
            rpcClient.getMiDiagramRpcClient().closeWebView();
        }
    }

    return (
        <FormView title="Create Class Mediator" onClose={handleBackButtonClick}>
            <TextField
                id='package-input'
                label="Package Name"
                required
                errorMsg={errors.packageName?.message}
                {...register("packageName")}
            />
            <TextField
                id='class-input'
                label="Class Name"
                required
                errorMsg={errors.className?.message}
                {...register("className")}
            />
            <br />
            <FormActions>
                <Button appearance="secondary" onClick={openOverview}>
                    Cancel
                </Button>
                <Button onClick={handleSubmit((values) => {
                    handleCreateMediator(values);
                })}>
                    Create
                </Button>
            </FormActions>
        </FormView>

    );
}
