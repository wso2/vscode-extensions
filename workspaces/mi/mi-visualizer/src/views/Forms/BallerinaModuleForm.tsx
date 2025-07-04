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

export interface BallerinaModuleProps {
    path: string;
}

type InputsFields = {
    moduleName?: string;
    version?: string;
};

const initialBallerinaModule: InputsFields = {
    moduleName: "",
    version: "1.0.0"
};

const schema = yup.object({
    moduleName: yup.string()
        .required("Module Name is required")
        .matches(/^[a-zA-Z0-9]*$/, "Invalid Module Name"),
    version: yup.string()
        .required("Version is required")
        .matches(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/, "Invalid Version")
});

export function BallerinaModuleForm(props: BallerinaModuleProps) {

    const { rpcClient } = useVisualizerContext();

    const {
        register,
        formState: { errors },
        handleSubmit,
    } = useForm({
        defaultValues: initialBallerinaModule,
        resolver: yupResolver(schema),
        mode: "onChange"
    });

    const openOverview = () => {
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });
    };

    const handleBackButtonClick = () => {
        rpcClient.getMiVisualizerRpcClient().goBack();
    };


    const handleCreateModule = async (values: InputsFields) => {
        const request = {
            projectDirectory: props.path,
            moduleName: values.moduleName,
            version: values.version
        };
        console.log(request);
        const response = await rpcClient.getMiDiagramRpcClient().createBallerinaModule(request);
        console.log("Response: ", response);
        if (response) {
            rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });
            rpcClient.getMiDiagramRpcClient().openFile(response);
            rpcClient.getMiDiagramRpcClient().closeWebView();
        }
    }

    return (
        <FormView title="Create Ballerina Module" onClose={handleBackButtonClick}>
            <TextField
                id='name-input'
                label="Module Name"
                errorMsg={errors.moduleName?.message}
                required
                {...register("moduleName")}
            />
            <TextField
                id='version-input'
                label="Version"
                errorMsg={errors.version?.message}
                required
                {...register("version")}
            />
            <br />
            <FormActions>
                <Button appearance="secondary" onClick={openOverview}>
                    Cancel
                </Button>
                <Button onClick={handleSubmit(handleCreateModule)}>
                    Create
                </Button>
            </FormActions>
        </FormView>

    );
}
