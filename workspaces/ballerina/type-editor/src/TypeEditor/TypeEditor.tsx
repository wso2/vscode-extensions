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

import React, { useState } from "react";
import { SidePanelBody, ProgressRing, Icon, TabPanel } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { BallerinaRpcClient } from "@wso2/ballerina-rpc-client";
import { Member, Type, TypeNodeKind, Imports, AddImportItemResponse } from "@wso2/ballerina-core";
import { TypeHelperCategory, TypeHelperItem, TypeHelperOperator } from "../TypeHelper";
import { TypeHelperContext } from "../Context";
import { ImportTab } from "./Tabs/ImportTab";
import { TypeCreatorTab } from "./Tabs/TypeCreatorTab";

namespace S {
    export const Container = styled(SidePanelBody)`
        display: flex;
        flex-direction: column;
        padding: 0px;
    `;
}

interface TypeEditorProps {
    type?: Type;
    imports?: Imports;
    rpcClient: BallerinaRpcClient;
    onTypeChange: (type: Type, rename?: boolean) => void;
    newType: boolean;
    newTypeValue?: string;
    isGraphql?: boolean;
    typeHelper: {
        loading?: boolean;
        loadingTypeBrowser?: boolean;
        referenceTypes: TypeHelperCategory[];
        basicTypes: TypeHelperCategory[];
        importedTypes: TypeHelperCategory[];
        operators: TypeHelperOperator[];
        typeBrowserTypes: TypeHelperCategory[];
        onSearchTypeHelper: (searchText: string, isType?: boolean) => void;
        onSearchTypeBrowser: (searchText: string) => void;
        onTypeItemClick: (item: TypeHelperItem) => Promise<AddImportItemResponse>;
        onCloseCompletions?: () => void;
        onTypeCreate?: (typeName?: string) => void;
    }
}


export function TypeEditor(props: TypeEditorProps) {
    const { isGraphql, newType } = props;

    let initialTypeKind = props.type?.codedata?.node ?? "RECORD" as TypeNodeKind;
    const [isSaving, setIsSaving] = useState(false);

    const type: Type = (() => {
        if (props.type) {
            return props.type;
        }
        // Initialize with default type for new types
        const defaultType = {
            name: props.newTypeValue ?? "",
            members: [] as Member[],
            editable: true,
            metadata: {
                description: "",
                deprecated: false,
                readonly: false,
                label: ""
            },
            properties: {},
            codedata: {
                node: "RECORD" as TypeNodeKind
            },
            includes: [] as string[],
            allowAdditionalFields: false
        };

        return defaultType as unknown as Type;
    })();

    const [activeTab, setActiveTab] = useState<string>("create-from-scratch");


    const onTypeSave = async (type: Type) => {
        const name = type.name;
        setIsSaving(true);
        // IF type nodeKind is CLASS then we call graphqlEndpoint
        // TODO: for TypeDiagram we need to give a generic class creation
        if (type.codedata.node === "CLASS") {
            const response = await props.rpcClient
                .getBIDiagramRpcClient()
                .createGraphqlClassType({ filePath: type.codedata?.lineRange?.fileName || 'types.bal', type, description: "" });

        } else {
            const response = await props.rpcClient
                .getBIDiagramRpcClient()
                .updateType({ filePath: type.codedata?.lineRange?.fileName || 'types.bal', type, description: "" });
        }
        props.onTypeChange(type);
        setIsSaving(false);
    }

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
    }

    return (
        <TypeHelperContext.Provider value={props.typeHelper}>
            <S.Container data-testid="type-editor-container">
                {!type ? (
                    <ProgressRing />
                ) : newType ? (
                    <TabPanel
                        views={[
                            {
                                id: 'create-from-scratch',
                                name: 'Create from scratch',
                                icon: <Icon
                                    name="bi-edit"
                                    sx={{ marginRight: '5px' }}
                                    iconSx={{ fontSize: '12px', display: 'flex', alignItems: 'center', paddingTop: '2px' }}
                                />
                            },
                            {
                                id: 'import',
                                name: 'Import',
                                icon: <Icon
                                    name="bi-import"
                                    sx={{ marginRight: '5px' }}
                                    iconSx={{ fontSize: '15px', display: 'flex', alignItems: 'center', paddingTop: '2px' }}
                                />
                            }
                        ]}
                        currentViewId={activeTab}
                        onViewChange={handleTabChange}
                        childrenSx={{ padding: '10px' }}
                    >
                        <div id="create-from-scratch" data-testid="create-from-scratch-tab">                           
                            <TypeCreatorTab
                                onTypeChange={props.onTypeChange}
                                editingType={type}
                                newType={newType}
                                isGraphql={isGraphql}
                                initialTypeKind={initialTypeKind}
                                onTypeSave={onTypeSave}
                                isSaving={isSaving}
                                setIsSaving={setIsSaving}
                            />
                        </div>
                        <div id="import" data-testid="import-tab">                            
                            <ImportTab
                                type={type}
                                onTypeSave={onTypeSave}
                                isSaving={isSaving}
                                setIsSaving={setIsSaving}
                            />
                        </div>
                    </TabPanel>
                ) : (
                    <div style={{ padding: '10px' }} data-testid="type-editor-content">                        
                        <TypeCreatorTab
                            onTypeChange={props.onTypeChange}
                            editingType={type}
                            newType={newType}
                            isGraphql={isGraphql}
                            initialTypeKind={initialTypeKind}
                            onTypeSave={onTypeSave}
                            isSaving={isSaving}
                            setIsSaving={setIsSaving}
                        />
                    </div>
                )}
            </S.Container>
        </TypeHelperContext.Provider>
    );
}
