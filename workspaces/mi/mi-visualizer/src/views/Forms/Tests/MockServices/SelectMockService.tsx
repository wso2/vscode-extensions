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

import { Button, FormActions, FormView } from "@wso2/ui-toolkit";
import { Keylookup } from "@wso2/mi-diagram";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { Controller, useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { MockServiceForm } from "./MockServiceForm";

export interface SelectMockServiceProps {
    name?: string;
    availableMockServices?: string[];
    isWindows: boolean;
    onGoBack: () => void;
    onSubmit: (values: any) => void;
}


export function SelectMockService(props: SelectMockServiceProps) {
    const isUpdate = !!props.name;
    const [showAddMockService, setShowAddMockService] = useState(false);

    // Schema
    const schema = yup.object({
        name: yup.string().required("Test case name is required").notOneOf(props.availableMockServices, "Mock service already added"),
    });

    const {
        control,
        handleSubmit,
        formState: { errors },
        reset
    } = useForm({
        resolver: yupResolver(schema),
        mode: "onChange",
    });

    useEffect(() => {
        reset({ name: props.name });
    }, []);

    const submitForm = async (values: any) => {
        props.onSubmit(values);
    }

    const handleGoBack = () => {
        props.onGoBack();
    }

    if (showAddMockService) {
        return <MockServiceForm onGoBack={handleGoBack} onSubmit={submitForm} availableMockServices={props.availableMockServices} isWindows={props.isWindows}/>
    }

    return (
        <FormView title={`${isUpdate ? "Update" : "Add"} Mock Service`} onClose={handleGoBack}>
            <div style={{ height: "50vh" }}>
                <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                        <Keylookup
                            value={field.value}
                            filterType='mockService'
                            label="Select Mock Service"
                            errorMsg={errors.name?.message.toString()}
                            allowItemCreate={true}
                            onCreateButtonClick={() => {
                                setShowAddMockService(true);
                            }}
                            onValueChange={field.onChange}
                        />
                    )}
                />
            </div>
            <FormActions>
                <Button
                    appearance="primary"
                    onClick={handleSubmit(submitForm)}
                >
                    {`${isUpdate ? "Update" : "Add"}`}
                </Button>
                <Button appearance="secondary" onClick={handleGoBack}>
                    Cancel
                </Button>
            </FormActions>
        </FormView>
    );
}
