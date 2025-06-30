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

import React, { ReactNode, useEffect, useState } from "react";
import { AutoComplete, ErrorBanner, getItemKey, ItemComponent, Typography } from "@wso2/ui-toolkit";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import styled from "@emotion/styled";
import { VSCodeTag } from "@vscode/webview-ui-toolkit/react";
import { FieldValues, useController, UseControllerProps } from "react-hook-form";
import { Colors } from "../../../resources/constants";
import fsPath from "path";
import { ExpressionField, ExpressionFieldValue } from "../ExpressionField/ExpressionInput";
import { getValue, isExpressionFieldValue } from "./utils";
import { ResourceType, MultipleResourceType, Platform } from "@wso2/mi-core";

export type FilterType =
    | "sequence"
    | "proxyService"
    | "endpoint"
    | "messageStore"
    | "messageProcessor"
    | "task"
    | "sequenceTemplate"
    | "endpointTemplate"
    | "dataService"
    | "dataSource"
    | "localEntry"
    | "dataMapper"
    | "js"
    | "json"
    | "smooksConfig"
    | "swagger"
    | "wsdl"
    | "ws_policy"
    | "xsd"
    | "xsl"
    | "xslt"
    | "yaml"
    | "crt"
    | "registry"
    | "mockService"
    | "dssQuery"
    | "dssDataSource"
    | "configurable"

// Interfaces
interface IKeylookupBase {
    // AutoComplete props
    id?: string;
    label?: string;
    labelAdornment?: ReactNode;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    notItemsFoundMessage?: string;
    widthOffset?: number;
    nullable?: boolean;
    allowItemCreate?: boolean;
    sx?: React.CSSProperties;
    borderBox?: boolean;
    errorMsg?: string;
    value?: string | ExpressionFieldValue;
    onValueChange?: (value: string | ExpressionFieldValue, additionalData?: any) => void;
    onBlur?: React.FocusEventHandler<HTMLInputElement>;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
    // Document path
    path?: string;
    // Artifact type to be fetched
    filterType?: FilterType | ResourceType[];
    // Callback to filter the fetched artifacts
    filter?: (value: string) => boolean;
    onCreateButtonClick?: (fetchItems: any, handleValueChange: any) => void;
    additionalItems?: string[];
    artifactTypes?: { registryArtifacts: boolean, artifacts: boolean };
    requireValidation?: boolean;
}

// Define the conditional properties for the ExpressionField
type ExpressionFieldProps = {
    exprToggleEnabled: true;
    canChangeEx?: boolean;
    openExpressionEditor?: (value: ExpressionFieldValue, setValue: (value: ExpressionFieldValue) => void) => void;
} | {
    exprToggleEnabled?: false | never;
    canChangeEx?: never;
    openExpressionEditor?: never;
};

// Define the conditional properties
type ConditionalProps =
    | { label: string; name: string; identifier?: never }
    | { label: string; name?: never; identifier?: never }
    | { label?: never; name: string; identifier?: never }
    | { label?: never; name?: never; identifier: string };

// Combine the base properties with conditional properties
export type IKeylookup = IKeylookupBase & ExpressionFieldProps & ConditionalProps;

export type IFormKeylookup<T extends FieldValues> = IKeylookupBase
    & { label?: string }
    & UseControllerProps<T>
    // Properties for the ExpressionField
    & ({
        exprToggleEnabled: true;
        canChangeEx?: boolean;
        openExpressionEditor?: (value: ExpressionFieldValue, setValue: (value: ExpressionFieldValue) => void) => void;
    } | {
        exprToggleEnabled?: false | never;
        canChangeEx?: never;
        openExpressionEditor?: never;
    });

// Styles
const Container = styled.div({
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
});

const ItemContainer = styled.div({
    display: "flex",
    alignItems: "center",
    gap: "4px",
    height: "22px",
});

const StyledTag = styled(VSCodeTag)({
    "::part(control)": {
        textTransform: "lowercase",
    },
});

const ItemText = styled.div({
    flex: "1 1 auto",
});

namespace ExBtn {
    export const Container = styled.div({
        display: "flex",
        alignItems: "center",
        backgroundColor: "inherit",
    });

    export const Wrapper = styled.div<{ isActive: boolean }>`
        padding: 3px;
        cursor: pointer;
        background-color: ${(props: { isActive: any; }) => props.isActive ?
            Colors.INPUT_OPTION_ACTIVE : Colors.INPUT_OPTION_INACTIVE};
        border: 1px solid ${(props: { isActive: any; }) => props.isActive ?
            Colors.INPUT_OPTION_ACTIVE_BORDER : "transparent"};
        &:hover {
            background-color: ${(props: { isActive: any; }) => props.isActive ?
            Colors.INPUT_OPTION_ACTIVE : Colors.INPUT_OPTION_HOVER};
        }
`;
}

const getItemComponent = (item: string, type?: string) => {
    return (
        <ItemContainer>
            {type && <StyledTag>{type}</StyledTag>}
            <ItemText>{item}</ItemText>
        </ItemContainer>
    );
};

export const Keylookup = (props: IKeylookup) => {
    const {
        filter,
        filterType,
        value = "",
        onValueChange,
        allowItemCreate = true,
        path,
        errorMsg,
        exprToggleEnabled,
        canChangeEx,
        openExpressionEditor,
        sx,
        requireValidation,
        artifactTypes = { registryArtifacts: true, artifacts: true },
        ...rest
    } = props;
    const [items, setItems] = useState<(string | ItemComponent)[]>([]);
    const { rpcClient } = useVisualizerContext();

    useEffect(() => {
        fetchItems();
    }, [filterType]);

    const fetchItems = async () => {
        if (filterType === "mockService") {
            const result = await rpcClient.getMiDiagramRpcClient().getAllMockServices();
            let items: (string | ItemComponent)[] = [];
            if (result?.mockServices) {
                const machineView = await rpcClient.getVisualizerState();
                const projectUri = machineView.projectUri;
                const mockServicesDirs = [projectUri, "src", "test", "resources", "mock-services"];
                const mockServicesRoot = machineView.platform === Platform.WINDOWS ? fsPath.win32.join(...mockServicesDirs) : fsPath.join(...mockServicesDirs);

                result.mockServices.forEach((mockService) => {
                    const fileName = mockService.path.split(mockServicesRoot)[1];
                    const item = { key: mockService.name, item: getItemComponent(fileName.substring(1, fileName.length - 4)) };
                    if (mockService.name === getValue(value)) {
                        items.unshift(item);
                    } else {
                        items.push(item);
                    }
                });
            }
            setItems(items);
            return;
        }

        if (filterType === "dssQuery") {
            const machineView = await rpcClient.getVisualizerState();
            const dsSyntaxTree = await rpcClient.getMiDiagramRpcClient().getSyntaxTree({ documentUri: machineView.documentUri });
            const dataServiceQueryParams = dsSyntaxTree.syntaxTree.data.queries;
            const queryNames: string[] = [];

            if (dataServiceQueryParams != undefined) {
                dataServiceQueryParams.forEach((query: any) => {
                    queryNames.push(query.id);
                });
            }
            setItems(queryNames);
            return;
        }

        if (filterType === "dssDataSource") {
            const machineView = await rpcClient.getVisualizerState();
            const dsSyntaxTree = await rpcClient.getMiDiagramRpcClient().getSyntaxTree({ documentUri: machineView.documentUri });
            const dataServiceConfigs = dsSyntaxTree.syntaxTree.data.configs;
            const configNames: string[] = [];

            if (dataServiceConfigs != undefined) {
                dataServiceConfigs.forEach((config: any) => {
                    configNames.push(config.id);
                });
            }
            setItems(configNames);
            return;
        }

        if (filterType === "configurable") {
            const fetchedConfigurableEntries = await rpcClient.getMiDiagramRpcClient().getConfigurableEntries();
            const items = fetchedConfigurableEntries.configurableEntries;
            let result = items.map(item => item.name);
            if (filter) {
                result = items.filter((item) => filter(item.type)).map(item => item.name) || [];
            }
            setItems(result);
            return;
        }

        let resourceType: ResourceType | MultipleResourceType[];
        if (Array.isArray(filterType)) {
            resourceType = filterType.map((type) => {
                return { type: type }
            });
        } else {
            resourceType = filterType;
        }
        const result = await rpcClient.getMiDiagramRpcClient().getAvailableResources({
            documentIdentifier: path,
            resourceType: resourceType
        });

        let workspaceItems: ItemComponent[] = [];
        let registryItems: ItemComponent[] = [];
        let initialItem: ItemComponent;
        const registryResources = artifactTypes.registryArtifacts;
        const resources = artifactTypes.artifacts;
        if (resources && result?.resources) {
            result.resources.forEach((resource) => {
                const item = { key: resource.name, item: getItemComponent(resource.name, resource.type), path: resource.absolutePath };
                if (resource.name === getValue(value)) {
                    initialItem = item;
                    return;
                }
                workspaceItems.push(item);
            });
        }
        if (registryResources && result?.registryResources) {
            result.registryResources.forEach((resource) => {
                const [type, pathKey] = resource.registryKey.split(":");
                const item = { key: resource.registryKey, item: getItemComponent(pathKey, `${type}:`), path: resource.registryPath };
                if (resource.registryKey === getValue(value)) {
                    initialItem = item;
                    return;
                }
                registryItems.push(item);
            });
        }

        let items: (string | ItemComponent)[] = [
            ...(props.additionalItems ? props.additionalItems : []),
            ...workspaceItems, ...registryItems];

        // Add the initial value to the start of the list if provided
        if (!!getValue(value) && getValue(value).length > 0) {
            items.unshift((initialItem || getValue(value)));
        }

        if (filter) {
            items = items.filter((item) => filter(getItemKey(item)));
        }
        setItems(items);
    };

    const handleValueChange = (val: string, index?: number) => {
        const path = (items[index] as any)?.path;
        if (isExpressionFieldValue(value)) {
            onValueChange && onValueChange({ ...value, value: val });
        } else {
            onValueChange && onValueChange(val, { path });
        }
    };

    const ExButton = (props: { isActive: boolean; onClick: () => void }) => {
        return (
            <ExBtn.Container>
                <ExBtn.Wrapper isActive={props.isActive} onClick={props.onClick}>
                    <Typography sx={{ textAlign: "center", margin: 0 }} variant="h6">EX</Typography>
                </ExBtn.Wrapper>
            </ExBtn.Container>
        );
    }

    return (
        <Container id={"keylookup" + props.label}>
            {((isExpressionFieldValue(value) && !value.isExpression) ||
                !isExpressionFieldValue(value)) ? (
                <AutoComplete
                    {...rest}
                    value={getValue(value)}
                    onValueChange={handleValueChange}
                    borderBox={true}
                    required={props.required}
                    items={items}
                    allowItemCreate={allowItemCreate}
                    requireValidation={requireValidation !== undefined ? requireValidation : allowItemCreate}
                    onCreateButtonClick={props.onCreateButtonClick ? () => {
                        handleValueChange("");
                        props.onCreateButtonClick(fetchItems, handleValueChange);
                    } : null}
                    {...exprToggleEnabled && isExpressionFieldValue(value) && {
                        actionBtns: [
                            <ExButton
                                isActive={value.isExpression}
                                onClick={() => {
                                    if (canChangeEx) {
                                        onValueChange && onValueChange({
                                            ...value, isExpression: !value.isExpression
                                        });
                                    }
                                }}
                            />
                        ],
                    }}
                />
            ) : (
                <ExpressionField
                    label={props.label}
                    labelAdornment={props.labelAdornment}
                    placeholder={props.placeholder}
                    required={props.required}
                    disabled={props.disabled}
                    value={value}
                    onChange={onValueChange}
                    canChange={canChangeEx}
                    openExpressionEditor={(value, onValueChange) => openExpressionEditor(value, onValueChange)}
                    errorMsg={errorMsg}
                    sx={{ ...sx, height: "45px" }}
                />
            )}
            {errorMsg && <ErrorBanner errorMsg={errorMsg} />}
        </Container>
    );
};

export const FormKeylookup = <T extends FieldValues>(props: IFormKeylookup<T>) => {
    const { control, name, label, canChangeEx = true, exprToggleEnabled, openExpressionEditor, ...rest } = props;
    const {
        field: { value, onChange },
    } = useController({ name, control });

    if (exprToggleEnabled) {
        return (
            <Keylookup
                {...rest}
                name={name}
                label={label}
                value={value}
                onValueChange={onChange}
                exprToggleEnabled={true}
                canChangeEx={canChangeEx}
                openExpressionEditor={openExpressionEditor}
            />
        );
    }

    return <Keylookup {...rest} name={name} label={label} value={value} onValueChange={onChange} />;
};
