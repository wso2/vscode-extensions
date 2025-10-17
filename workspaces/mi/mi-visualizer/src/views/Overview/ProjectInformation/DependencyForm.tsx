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
import styled from "@emotion/styled";
import { Colors } from "@wso2/mi-diagram/lib/resources/constants";
import { Button, Typography, Codicon, TextField, ProgressRing, Overlay } from "@wso2/ui-toolkit";
import { useForm } from "react-hook-form";

const FormContainer = styled.div`
    margin: 16px 0;
    padding: 20px;
    background-color: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-widget-border);
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const FormHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
`;

const FormTitle = styled(Typography)`
    font-size: 16px;
    font-weight: 600;
    color: var(--vscode-foreground);
    margin: 0;
`;

const FormFieldsContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 20px;
`;

const FormActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding-top: 16px;
    border-top: 1px solid var(--vscode-editorWidget-border);
`;

const ErrorMessage = styled.div`
    padding: 12px;
    margin-bottom: 16px;
    background-color: var(--vscode-inputValidation-errorBackground);
    border: 1px solid var(--vscode-inputValidation-errorBorder);
    border-radius: 4px;
    color: var(--vscode-inputValidation-errorForeground);
    font-size: 13px;
    display: flex;
    align-items: flex-start;
    gap: 8px;
`;

const LoaderContainer = styled.div`
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    color: white;
    position: absolute;
    justify-self: anchor-center;
    margin-top: 150px;
`;

interface DependencyFormData {
    groupId: string;
    artifact: string;
    version: string;
}

interface DependencyFormProps {
    groupId: string;
    artifact: string;
    version: string;
    title: string;
    onClose: () => void;
    showLoader?: boolean;
    duplicateError?: string;
    onUpdate?: (updatedDependency: { groupId: string; artifact: string; version: string }) => void;
}

export function DependencyForm(props: DependencyFormProps) {
    const { groupId, artifact, version, title, onClose, onUpdate, showLoader, duplicateError } = props;

    const { register, handleSubmit, formState: { errors } } = useForm<DependencyFormData>({
        defaultValues: {
            groupId,
            artifact,
            version
        }
    });

    const handleFormClose = () => {
        onClose();
    };

    const onSubmit = async (data: DependencyFormData) => {
        if (onUpdate) {
            onUpdate(data);
        }
    };

    return (
        <>
            <form onSubmit={handleSubmit(onSubmit)}>
                <FormContainer>
                    <FormHeader>
                        <FormTitle variant="h3">{title}</FormTitle>
                        <Button appearance="icon" onClick={handleFormClose} tooltip="Close">
                            <Codicon name='close' />
                        </Button>
                    </FormHeader>

                    {duplicateError && (
                        <ErrorMessage>
                            <Codicon name="error" />
                            <span>{duplicateError}</span>
                        </ErrorMessage>
                    )}

                    <FormFieldsContainer>
                        <TextField
                            label="Group ID"
                            {...register("groupId", { required: "Group ID is required" })}
                            errorMsg={errors.groupId?.message}
                            disabled={showLoader}
                        />
                        <TextField
                            label="Artifact ID"
                            {...register("artifact", { required: "Artifact ID is required" })}
                            errorMsg={errors.artifact?.message}
                            disabled={showLoader}
                        />
                        <TextField
                            label="Version"
                            {...register("version", { required: "Version is required" })}
                            errorMsg={errors.version?.message}
                            disabled={showLoader}
                        />
                    </FormFieldsContainer>

                    <FormActions>
                        <Button appearance="secondary" onClick={handleFormClose} disabled={showLoader}>
                            Cancel
                        </Button>
                        <Button
                            appearance="primary"
                            onClick={handleSubmit(onSubmit)}
                            disabled={showLoader}
                        >
                            {title === "Add Dependency" ? "Add Dependency" : "Save Changes"}
                        </Button>
                    </FormActions>
                </FormContainer>
            </form>

            {showLoader && (
                <>
                    <Overlay sx={{ background: `${Colors.SURFACE_CONTAINER}`, opacity: `0.3`, zIndex: 2000 }} />
                    <LoaderContainer>
                        <ProgressRing sx={{ height: '32px', width: '32px' }} />
                    </LoaderContainer>
                </>
            )}
        </>
    );
}
