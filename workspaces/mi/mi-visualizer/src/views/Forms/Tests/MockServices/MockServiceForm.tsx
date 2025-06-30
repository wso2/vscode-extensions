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

import { yupResolver } from "@hookform/resolvers/yup";
import { EVENT_TYPE, MACHINE_VIEW, UpdateTestSuiteResponse } from "@wso2/mi-core";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { Button, ComponentCard, ContextMenu, FormActions, FormGroup, FormView, Item, ProgressIndicator, TextField, Typography } from "@wso2/ui-toolkit";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { getMockServiceXML } from "../../../../utils/template-engine/mustache-templates/TestSuite";
import path from "path";
import { MockResourceHeader, MockService, MockServiceResource } from "@wso2/mi-syntax-tree/lib/src";
import { AccordionContainer, verticalIconStyles } from "../TestSuiteForm";
import styled from "@emotion/styled";
import { getColorByMethod } from "@wso2/service-designer/lib/components/ResourceAccordion/ResourceAccordion";
import { MockResourceEntry, MockResourceForm } from "./MockResourceForm";
import { FormKeylookup } from "@wso2/mi-diagram";

export interface MockServiceFormProps {
    filePath?: string;
    stNode?: MockService;
    availableMockServices?: string[];
    isWindows: boolean;
    onGoBack?: () => void;
    onSubmit?: (values: any) => void;
}

const cardStyle = {
    display: "block",
    margin: "15px 0 0 0",
    padding: "0 15px 15px 15px",
    width: "auto",
    cursor: "auto"
};

const MethodSection = styled.div`
    display: flex;
    gap: 4px;
`;

type MethodProp = {
    color: string;
    hasLeftMargin?: boolean;
};

const MethodBox = styled.div<MethodProp>`
    display: flex;
    justify-content: center;
    height: 25px;
    width: 70px;
    margin-left: 0px;
    text-align: center;
    padding: 3px 0px 3px 0px;
    background-color: ${(p: MethodProp) => p.color};
    color: #FFF;
    align-items: center;
    font-weight: bold;
`;

const MethodPath = styled.span`
    align-self: center;
    margin-left: 10px;
`;

export function MockServiceForm(props: MockServiceFormProps) {
    const { rpcClient } = useVisualizerContext();
    const [isLoaded, setIsLoaded] = useState(false);
    const [availableMockServices, setAvailableMockServices] = useState(props.availableMockServices || []);
    const [mockResources, setMockResources] = useState<MockResourceEntry[]>([]);
    const [showAddMockResource, setShowAddMockResource] = useState(false);
    const [currentMockResource, setCurrentMockResource] = useState<MockResourceEntry | undefined>(undefined);

    const isUpdate = !!props.stNode;
    const mockService = props.stNode;
    const filePath = props.filePath;

    const isWindows = props.isWindows;
    const fileName = filePath ? filePath.split(isWindows ? path.win32.sep : path.sep).pop().split(".xml")[0] : "";

    // Schema
    const schema = yup.object({
        name: yup.string().required("Test case name is required").notOneOf(availableMockServices, "Mock service name already exists"),
        endpointName: yup.string().required("Endpoint name is required"),
        servicePort: yup.number().required("Service port is required"),
        serviceContext: yup.string().required("Service context is required").matches(/^\//, "Service context should start with '/'")
    });

    const {
        handleSubmit,
        formState: { errors },
        register,
        reset,
        control
    } = useForm({
        resolver: yupResolver(schema),
        mode: "onChange",
    });

    useEffect(() => {
        (async () => {
            const mockServices = await rpcClient.getMiDiagramRpcClient().getAllMockServices();
            const mockServicesNames = mockServices.mockServices.map((mockService: any) => mockService.name);
            const allMockServices = mockServicesNames.concat(availableMockServices).filter((value) => value !== fileName);
            setAvailableMockServices(allMockServices);

            if (mockService) {
                if (mockService?.resources?.resources) {
                    const resources = mockService.resources.resources.map((resource: MockServiceResource) => {
                        let requestHeaders;
                        let responseHeaders;
                        if (resource?.request?.headers?.headers) {
                            requestHeaders = resource.request.headers.headers.map((header: MockResourceHeader) => {
                                return [
                                    header?.name,
                                    header?.value
                                ]
                            });
                        }
                        if (resource?.response?.headers?.headers) {
                            responseHeaders = resource.response.headers.headers.map((header: MockResourceHeader) => {
                                return [
                                    header?.name,
                                    header?.value
                                ]
                            });
                        }
                        return {
                            subContext: resource?.subContext?.textNode,
                            method: resource?.method?.textNode,
                            requestHeaders,
                            expectedRequestPayload: resource?.request?.payload?.textNode,
                            responseStatusCode: resource?.response?.statusCode?.textNode,
                            responseHeaders,
                            expectedResponsePayload: resource?.response?.payload?.textNode
                        }
                    });
                    setMockResources(resources);
                }
                reset({
                    name: fileName,
                    endpointName: mockService.serviceName?.textNode,
                    servicePort: parseInt(mockService?.port?.textNode || '0'),
                    serviceContext: mockService?.context?.textNode
                });
                setIsLoaded(true);
                return;
            }

            reset({
                name: "",
                endpointName: "",
                servicePort: 0,
                serviceContext: "/"
            });
            setIsLoaded(true);
        })();
    }, [props.filePath, mockService]);

    const handleGoBack = () => {
        if (props.onGoBack) {
            props.onGoBack();
        } else {
            openOverview();
        }
    }

    const openOverview = () => {
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });
    };

    const openMockResource = () => {
        setShowAddMockResource(true);
    }

    const editMockResource = (mockResource: MockResourceEntry) => {
        setCurrentMockResource(mockResource);
        setMockResources(mockResources.filter(ms => ms !== mockResource));
        setShowAddMockResource(true);
    }

    function getActions(entry: MockResourceEntry) {
        const editAction: Item = {
            id: "edit",
            label: "Edit",
            onClick: () => {
                editMockResource(entry);
            },
        };
        const deleteAction: Item = {
            id: "delete",
            label: "Delete",
            onClick: () => {
                setMockResources(mockResources.filter(ms => ms !== entry));
            },
        };
        return [editAction, deleteAction];
    }

    const submitForm = async (values: any) => {
        values.resources = mockResources.map((mockResource: MockResourceEntry) => {
            const { subContext, method } = mockResource;
            const request = {
                headers: mockResource.requestHeaders,
                payload: mockResource.expectedRequestPayload
            }
            const response = {
                headers: mockResource.responseHeaders,
                payload: mockResource.expectedResponsePayload,
                statusCode: mockResource.responseStatusCode
            }
            return {
                subContext,
                method,
                request,
                response
            }
        });
        const xml = getMockServiceXML(values);
        rpcClient.getMiDiagramRpcClient().updateMockService({ path: props.filePath, content: xml, name: values.name }).then((resp: UpdateTestSuiteResponse) => {
            if (props.onSubmit) {
                values.filePath = resp.path;
                props.onSubmit(values);
                return;
            }
            openOverview();
        });
    }

    if (!isLoaded) {
        return <ProgressIndicator/>;
    }

    if (showAddMockResource) {
        const goBack = () => {
            if (currentMockResource) {
                setMockResources([...mockResources, currentMockResource]);
            }
            setCurrentMockResource(undefined);
            setShowAddMockResource(false);
        }
        const onSubmit = (values: MockResourceEntry) => {
            setMockResources([...mockResources, values]);
            setCurrentMockResource(undefined);
            setShowAddMockResource(false);
        };
        const availableMockResources = mockResources.map((mockResource) => mockResource);

        return <MockResourceForm onGoBack={goBack} onSubmit={onSubmit} mockResource={currentMockResource} />
    }

    return (
        <FormView title={`${isUpdate ? "Update" : "Create New"} Mock Service`} onClose={handleGoBack}>
            <TextField
                id="name"
                label="Name"
                placeholder="Mock service name"
                required
                errorMsg={errors.name?.message.toString()}
                {...register("name")}
            />

            <ComponentCard sx={cardStyle} disbaleHoverEffect>
                <Typography variant="h3">Mock Service Details</Typography>
                <FormKeylookup
                    control={control as any}
                    label="Endpoint"
                    name="endpointName"
                    filterType="endpoint"
                    path={props.filePath}
                    errorMsg={errors.endpointName?.message.toString()}
                    {...register("endpointName")}
                />
                <TextField
                    id="mockServicePort"
                    label="Service port"
                    placeholder="Mock service port"
                    required
                    errorMsg={errors.servicePort?.message.toString()}
                    {...register("servicePort")}
                />
                <TextField
                    id="mockServiceContext"
                    label="Service context"
                    placeholder="Mock service context"
                    required
                    errorMsg={errors.serviceContext?.message.toString()}
                    {...register("serviceContext")}
                />
            </ComponentCard>

            <ComponentCard id="mockServiceResourceCard" sx={cardStyle} disbaleHoverEffect>
                <FormGroup title="Mock service resources" isCollapsed={false}>
                    <Button appearance="secondary" onClick={openMockResource}>Add mock service resource</Button>

                    {mockResources.map((mockResource, index) => {
                        return (
                            <AccordionContainer onClick={() => editMockResource(mockResource)}>
                                <MethodSection>
                                    <MethodBox key={index} color={getColorByMethod(mockResource.method)}>
                                        {mockResource.method}
                                    </MethodBox>
                                    <MethodPath>{mockResource.subContext}</MethodPath>
                                </MethodSection>
                                <div style={{ margin: "auto 0 auto auto" }}>
                                    <ContextMenu
                                        sx={{ transform: "translateX(-50%)" }}
                                        iconSx={verticalIconStyles}
                                        menuItems={getActions(mockResource)}
                                        position='bottom-left'
                                    />
                                </div>
                            </AccordionContainer>
                        );
                    })}
                </FormGroup>
            </ComponentCard>

            <FormActions>
                <Button
                    appearance="primary"
                    onClick={handleSubmit(submitForm)}
                >
                    {`${isUpdate ? "Update" : "Create"}`}
                </Button>
                <Button appearance="secondary" onClick={handleGoBack}>
                    Cancel
                </Button>
            </FormActions>
        </FormView>
    );
}
