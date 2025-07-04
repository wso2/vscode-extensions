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

import { FormActions, Button, ErrorBanner } from "@wso2/ui-toolkit";
import React, { useContext } from "react";
import FormGenerator from "../../Form/FormGenerator";
import styled from "@emotion/styled";
import { sidepanelGoBack } from "..";
import SidePanelContext, { clearSidePanelState } from "../SidePanelContexProvider";
import { useVisualizerContext, } from "@wso2/mi-rpc-client";
import { GetMediatorResponse } from "@wso2/mi-core";
import { Range } from "@wso2/mi-syntax-tree/lib/src";
import { ERROR_MESSAGES } from "../../../resources/constants";
import { createAndopenDataMapper } from "./onSubmitFunctions";

export interface MediatorFormProps {
    control: any;
    errors: any;
    setValue: any;
    reset: any;
    watch: any;
    getValues: any;
    dirtyFields: any;
    handleSubmit: any;
    mediatorData: GetMediatorResponse
    mediatorType: string;
    isUpdate: boolean;
    documentUri: string;
    range: Range
}

const FormContainer = styled.div`
    width: 100%;
`;
export function MediatorForm(props: MediatorFormProps) {
    const { control, errors, setValue, reset, watch, getValues, dirtyFields, handleSubmit, mediatorData, mediatorType, isUpdate, documentUri, range } = props;
    const { rpcClient, setIsLoading: setDiagramLoading } = useVisualizerContext();
    const sidePanelContext = useContext(SidePanelContext);

    const handleOnSubmit = async (values: any) => {
        setDiagramLoading(true);
        for (const key in values) {
            // Handle paramerter manager
            if (Array.isArray(values[key])) {
                values[key] = values[key].map((item: any) => {
                    const extractValues: any = (obj: any) => {
                        return Object.values(obj).map((value: any) =>
                            Array.isArray(value) ? value.map((subItem: any) =>
                                (subItem instanceof Object) ? extractValues(subItem) : subItem
                            ) : value
                        );
                    };
                    return extractValues(item);
                });
            }
        }

        if (mediatorData.onSubmit) {
            switch (mediatorData.onSubmit) {
                case "openDataMapperEditor":
                    if (sidePanelContext?.newDataMapperName === values.name) {
                        const projectDetails = await rpcClient.getMiVisualizerRpcClient().getProjectDetails();
                        const runtimeVersion = await projectDetails.primaryDetails.runtimeVersion.value;
                        createAndopenDataMapper(documentUri, values, rpcClient, runtimeVersion)();
                    }
                    break;
            }
        }

        const edits = await rpcClient.getMiDiagramRpcClient().updateMediator({
            mediatorType: mediatorType,
            values: values as Record<string, any>,
            oldValues: sidePanelContext.formValues as Record<string, any>,
            dirtyFields: Object.keys(dirtyFields),
            documentUri,
            range
        });

        if (edits.textEdits.length > 0) {
            clearSidePanelState(sidePanelContext);
        } else {
            setTimeout(() => {
                setDiagramLoading(false);
                sidePanelContext.setSidePanelState((prevState: SidePanelContext) => ({
                    ...prevState,
                    alertMessage: `${prevState.isEditing ? "Error updating mediator" : "Error adding mediator"}. Please try again.`,
                }));
            }, 3000);
        }
    }

    const handleOnClose = () => {
        sidePanelContext.pageStack.length > 1 ? sidepanelGoBack(sidePanelContext) : clearSidePanelState(sidePanelContext);
    }

    if (!mediatorData) {
        return <ErrorBanner
            errorMsg={ERROR_MESSAGES.ERROR_LOADING_MEDIATORS}
        />
    }

    return (
        <FormContainer>
            <FormGenerator
                documentUri={documentUri}
                formData={mediatorData}
                control={control}
                errors={errors}
                setValue={setValue}
                reset={reset}
                watch={watch}
                getValues={getValues}
                skipGeneralHeading={true}
                range={range}
            />
            <FormActions>
                <Button
                    appearance="secondary"
                    onClick={handleOnClose}
                >
                    Cancel
                </Button>
                <Button
                    appearance="primary"
                    onClick={handleSubmit(handleOnSubmit)}
                    disabled={isUpdate && Object.keys(dirtyFields).length === 0}
                >
                    {isUpdate ? "Update" : "Add"}
                </Button>
            </FormActions>
        </FormContainer>);
}
