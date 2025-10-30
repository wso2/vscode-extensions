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

import { MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import { debounce } from 'lodash';
import { LineRange, PayloadContext, Type } from '@wso2/ballerina-core';
import { useRpcContext } from '@wso2/ballerina-rpc-client';
import { ContextTypeEditor, EditorContext, StackItem, TypeEditor, TypeHelperCategory, TypeHelperItem, TypeHelperOperator } from '@wso2/type-editor';
import { TYPE_HELPER_OPERATORS } from './constants';
import { filterOperators, filterTypes, getImportedTypes, getTypeBrowserTypes, getTypes } from './utils';
import { useMutation } from '@tanstack/react-query';
import { Overlay, ThemeColors } from '@wso2/ui-toolkit';
import { createPortal } from 'react-dom';
import { LoadingRing } from '../../../components/Loader';
import styled from '@emotion/styled';
import { TypeHelperContext } from '../../../constants';

const LoadingContainer = styled.div`
    position: absolute;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    z-index: 5000;
`;

type FormTypeEditorProps = {
    type?: Type;
    onTypeChange: (type: Type) => void;
    newType: boolean;
    newTypeValue?: string;
    isGraphql?: boolean;
    onCloseCompletions?: () => void;
    onTypeCreate: (typeName?: string) => void;
    getNewTypeCreateForm: () => void;
    onSaveType: (type: Type | string) => void
    refetchTypes: boolean;
    isPopupTypeForm: boolean;
    isContextTypeForm?: boolean;
    payloadContext?: PayloadContext;
    simpleType?: string;
};

export const FormTypeEditor = (props: FormTypeEditorProps) => {
    const { type, onTypeChange, newType, newTypeValue, isGraphql, onCloseCompletions, getNewTypeCreateForm, onSaveType, refetchTypes, isPopupTypeForm, isContextTypeForm, simpleType, payloadContext } = props;
    const { rpcClient } = useRpcContext();

    const [filePath, setFilePath] = useState<string | undefined>(undefined);
    const [targetLineRange, setTargetLineRange] = useState<LineRange | undefined>(undefined);

    const [loading, setLoading] = useState<boolean>(false);
    const [loadingTypeBrowser, setLoadingTypeBrowser] = useState<boolean>(false);

    const [basicTypes, setBasicTypes] = useState<TypeHelperCategory[]>([]);
    const [importedTypes, setImportedTypes] = useState<TypeHelperCategory[]>([]);
    const [filteredBasicTypes, setFilteredBasicTypes] = useState<TypeHelperCategory[]>([]);
    const [filteredOperators, setFilteredOperators] = useState<TypeHelperOperator[]>([]);
    const [filteredTypeBrowserTypes, setFilteredTypeBrowserTypes] = useState<TypeHelperCategory[]>([]);

    const fetchedInitialTypes = useRef<boolean>(false);

    useEffect(() => {
        if (rpcClient) {
            rpcClient.getVisualizerLocation().then((machineView) => {
                setFilePath(machineView.metadata.recordFilePath);
                rpcClient
                    .getBIDiagramRpcClient()
                    .getEndOfFile({
                        filePath: machineView.metadata.recordFilePath
                    })
                    .then((linePosition) => {
                        setTargetLineRange({
                            startLine: linePosition,
                            endLine: linePosition
                        });
                    });
            });
        }
    }, [rpcClient]);

    const prevRefetchRef = useRef(false);

    useEffect(() => {
        if (refetchTypes && !prevRefetchRef.current) {
            fetchedInitialTypes.current = false;
            handleSearchTypeHelper('', true);
        }
        prevRefetchRef.current = refetchTypes;
    }, [refetchTypes]);

    const debouncedSearchTypeHelper = useCallback(
            debounce(async (searchText: string, isType: boolean) => {
                if (!rpcClient) return;
    
                if (isType && (!fetchedInitialTypes.current || refetchTypes)) {
                    try {
                        let types;
                        if (isGraphql) {
                            const context = type?.codedata?.node === "CLASS"
                                ? TypeHelperContext.GRAPHQL_FIELD_TYPE
                                : TypeHelperContext.GRAPHQL_INPUT_TYPE;
                            types = await rpcClient.getServiceDesignerRpcClient().getResourceReturnTypes({
                                filePath: filePath,
                                context: context,
                            });
                        } else {
                            types = await rpcClient.getBIDiagramRpcClient().getVisibleTypes({
                                filePath: filePath,
                                position: {
                                    line: targetLineRange.startLine.line,
                                    offset: targetLineRange.startLine.offset
                                },
                            });
                        }
                        const basicTypes = getTypes(types);
                        setBasicTypes(basicTypes);
                        setFilteredBasicTypes(basicTypes);
                        fetchedInitialTypes.current = true;
    
                        if (!isGraphql) {
                            const searchResponse = await rpcClient.getBIDiagramRpcClient().search({
                                filePath: filePath,
                                position: targetLineRange,
                                queryMap: {
                                    q: '',
                                    offset: 0,
                                    limit: 1000
                                },
                                searchKind: 'TYPE'
                            });
    
                            const importedTypes = getImportedTypes(searchResponse.categories);
                            setImportedTypes(importedTypes);
                        }
    
                    } catch (error) {
                        console.error(error);
                    } finally {
                        setLoading(false);
                    }
                } else if (isType) {
                    setFilteredBasicTypes(filterTypes(basicTypes, searchText));
    
                    try {
                        const response = await rpcClient.getBIDiagramRpcClient().search({
                            filePath: filePath,
                            position: targetLineRange,
                            queryMap: {
                                q: searchText,
                                offset: 0,
                                limit: 1000
                            },
                            searchKind: 'TYPE'
                        });
    
                        const importedTypes = getImportedTypes(response.categories);
                        setImportedTypes(importedTypes);
                    } catch (error) {
                        console.error(error);
                    } finally {
                        setLoading(false);
                    }
                } else {
                    setFilteredOperators(filterOperators(TYPE_HELPER_OPERATORS, searchText));
                    setLoading(false);
                }
            }, 150),
            [basicTypes, filePath, targetLineRange, rpcClient]
    );    
    const handleSearchTypeHelper = useCallback(
        (searchText: string, isType: boolean) => {
            setLoading(true);
            debouncedSearchTypeHelper(searchText, isType);
        },
        [debouncedSearchTypeHelper, basicTypes]
    );

    const debouncedSearchTypeBrowser = useCallback(
        debounce((searchText: string) => {
            if (rpcClient) {
                rpcClient
                    .getBIDiagramRpcClient()
                    .search({
                        filePath: filePath,
                        position: targetLineRange,
                        queryMap: {
                            q: searchText,
                            offset: 0,
                            limit: 60
                        },
                        searchKind: 'TYPE'
                    })
                    .then((response) => {
                        setFilteredTypeBrowserTypes(getTypeBrowserTypes(response.categories));
                    })
                    .finally(() => {
                        setLoadingTypeBrowser(false);
                    });
            }
        }, 150),
        [filePath, targetLineRange]
    );

    const handleSearchTypeBrowser = useCallback(
        (searchText: string) => {
            setLoadingTypeBrowser(true);
            debouncedSearchTypeBrowser(searchText);
        },
        [debouncedSearchTypeBrowser]
    );

    const { mutateAsync: addFunction, isPending: isAddingType } = useMutation({
        mutationFn: (item: TypeHelperItem) =>
            rpcClient.getBIDiagramRpcClient().addFunction({
                filePath: filePath,
                codedata: item.codedata,
                kind: item.kind,
                searchKind: 'TYPE'
            })
    });

    const handleTypeItemClick = async (item: TypeHelperItem) => {
        return await addFunction(item);
    };

    const handleTypeCreate = (typeName?: string) => {
        getNewTypeCreateForm();
    };

    return (
        <>
            {filePath && targetLineRange && (
                isContextTypeForm ?
                    <ContextTypeEditor
                        type={type}
                        rpcClient={rpcClient}
                        isPopupTypeForm={isPopupTypeForm}
                        onTypeChange={onTypeChange}
                        newType={newType}
                        newTypeValue={newTypeValue}
                        onSaveType={onSaveType}
                        isGraphql={isGraphql}
                        simpleType={simpleType}
                        payloadContext={payloadContext}
                        typeHelper={{
                            loading,
                            loadingTypeBrowser,
                            referenceTypes: basicTypes,
                            basicTypes: filteredBasicTypes,
                            importedTypes,
                            operators: filteredOperators,
                            typeBrowserTypes: filteredTypeBrowserTypes,
                            onSearchTypeHelper: handleSearchTypeHelper,
                            onSearchTypeBrowser: handleSearchTypeBrowser,
                            onTypeItemClick: handleTypeItemClick,
                            onCloseCompletions: onCloseCompletions,
                            onTypeCreate: handleTypeCreate
                        }}
                    /> :
                    <TypeEditor
                        type={type}
                        rpcClient={rpcClient}
                        isPopupTypeForm={isPopupTypeForm}
                        onTypeChange={onTypeChange}
                        newType={newType}
                        newTypeValue={newTypeValue}
                        onSaveType={onSaveType}
                        isGraphql={isGraphql}
                        typeHelper={{
                            loading,
                            loadingTypeBrowser,
                            referenceTypes: basicTypes,
                            basicTypes: filteredBasicTypes,
                            importedTypes,
                            operators: filteredOperators,
                            typeBrowserTypes: filteredTypeBrowserTypes,
                            onSearchTypeHelper: handleSearchTypeHelper,
                            onSearchTypeBrowser: handleSearchTypeBrowser,
                            onTypeItemClick: handleTypeItemClick,
                            onCloseCompletions: onCloseCompletions,
                            onTypeCreate: handleTypeCreate
                        }}
                    />
            )}
            {isAddingType && createPortal(
                <>
                    <Overlay sx={{ background: `${ThemeColors.SURFACE_CONTAINER}`, opacity: `0.3`, zIndex: 5000 }} />
                    <LoadingContainer> <LoadingRing /> </LoadingContainer>
                </>
                , document.body
            )}
        </>
    );
};
