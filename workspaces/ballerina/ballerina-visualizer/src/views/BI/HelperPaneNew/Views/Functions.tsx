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

import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { HelperPaneCompletionItem, HelperPaneFunctionInfo } from "@wso2/ballerina-side-panel";
import { debounce } from "lodash";
import { useRef, useState, useCallback, RefObject, useEffect } from "react";
import { convertToHelperPaneFunction, extractFunctionInsertText } from "../../../../utils/bi";
import { CompletionInsertText, FunctionKind, LineRange } from "@wso2/ballerina-core";
import { useMutation } from "@tanstack/react-query";
import { ExpandableList } from "../Components/ExpandableList";
import { SlidingPaneNavContainer } from "@wso2/ui-toolkit/lib/components/ExpressionEditor/components/Common/SlidingPane";
import { COMPLETION_ITEM_KIND, CompletionItem, getIcon, HelperPaneCustom } from "@wso2/ui-toolkit/lib/components/ExpressionEditor";
import { EmptyItemsPlaceHolder } from "../Components/EmptyItemsPlaceHolder";
import styled from "@emotion/styled";
import { Divider, SearchBox } from "@wso2/ui-toolkit";
import { LibraryBrowser } from "../../HelperPane/LibraryBrowser";
import { ScrollableContainer } from "../Components/ScrollableContainer";
import FooterButtons from "../Components/FooterButtons";
import DynamicModal from "../../../../components/Modal";
import { URI, Utils } from "vscode-uri";
import { FunctionFormStatic } from "../../FunctionFormStatic";
import { POPUP_IDS, useModalStack } from "../../../../Context";

type FunctionsPageProps = {
    fieldKey: string;
    anchorRef: RefObject<HTMLDivElement>;
    fileName: string;
    targetLineRange: LineRange;
    onClose: () => void;
    onChange: (insertText: CompletionInsertText | string) => void;
    updateImports: (key: string, imports: { [key: string]: string }) => void;
    selectedType?: CompletionItem
};

export const FunctionsPage = ({
    fieldKey,
    anchorRef,
    fileName,
    targetLineRange,
    onClose,
    onChange,
    updateImports,
    selectedType
}: FunctionsPageProps) => {

    const { rpcClient } = useRpcContext();
    const firstRender = useRef<boolean>(true);
    const [searchValue, setSearchValue] = useState<string>('');
    const [isLibraryBrowserOpen, setIsLibraryBrowserOpen] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [functionInfo, setFunctionInfo] = useState<HelperPaneFunctionInfo | undefined>(undefined);
    const [libraryBrowserInfo, setLibraryBrowserInfo] = useState<HelperPaneFunctionInfo | undefined>(undefined);
    const [projectUri, setProjectUri] = useState<string>('');

    const { addModal , closeModal} = useModalStack();



    //TODO: get the correct filepath
    let defaultFunctionsFile = Utils.joinPath(URI.file(projectUri), 'functions.bal').fsPath;

    const debounceFetchFunctionInfo = useCallback(
        debounce((searchText: string, includeAvailableFunctions?: string) => {
            setIsLoading(true);
            rpcClient
                .getBIDiagramRpcClient()
                .search({
                    position: targetLineRange,
                    filePath: fileName,
                    queryMap: {
                        q: searchText.trim(),
                        limit: 12,
                        offset: 0,
                        ...(!!includeAvailableFunctions && { includeAvailableFunctions })
                    },
                    searchKind: "FUNCTION"
                })
                .then((response) => {
                    if (response.categories?.length) {
                        if (!!includeAvailableFunctions) {
                            setLibraryBrowserInfo(convertToHelperPaneFunction(response.categories));
                        } else {
                            setFunctionInfo(convertToHelperPaneFunction(response.categories));
                        }
                    }
                    console.log(response);
                })
                .then(() => setIsLoading(false));
        }, 150),
        [rpcClient, fileName, targetLineRange]
    );

    const fetchFunctionInfo = useCallback(
        (searchText: string, includeAvailableFunctions?: string) => {
            debounceFetchFunctionInfo(searchText, includeAvailableFunctions);
        },
        [debounceFetchFunctionInfo, searchValue]
    );

    const { mutateAsync: addFunction, isPending: isAddingFunction } = useMutation({
        mutationFn: (item: HelperPaneCompletionItem) =>
            rpcClient.getBIDiagramRpcClient().addFunction({
                filePath: fileName,
                codedata: item.codedata,
                kind: item.kind as FunctionKind,
                searchKind: 'FUNCTION'
            })
    });

    const onFunctionItemSelect = async (item: HelperPaneCompletionItem) => {
        setIsLoading(true);
        const response = await addFunction(item);

        setIsLoading(false)
        if (response) {
            const importStatement = {
                [response.prefix]: response.moduleId
            };
            updateImports(fieldKey, importStatement);
            return extractFunctionInsertText(response.template);
        }

        return { value: '' };
    };

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            fetchFunctionInfo('');
        }

        setDefaultFunctionsPath()
    }, []);

    const setDefaultFunctionsPath = () => {
        rpcClient.getVisualizerLocation().then((location) => {
            setProjectUri(location?.projectUri || '')
        })
    }

    const handleFunctionSearch = (searchText: string) => {
        setSearchValue(searchText);

        // Search functions
        if (isLibraryBrowserOpen) {
            fetchFunctionInfo(searchText, 'true');
        } else {
            fetchFunctionInfo(searchText);
        }
    };

    const handleFunctionSave = (value: string) => {
        onChange(value);
        closeModal(POPUP_IDS.FUNCTION);
        onClose();
    }

    const handleFunctionItemSelect = async (item: HelperPaneCompletionItem) => {
        const { value, cursorOffset } = await onFunctionItemSelect(item);
        onChange({ value, cursorOffset });
        onClose();
    };

    const handleNewFunctionClick = () => {
        addModal(
            <FunctionFormStatic
                projectPath={projectUri}
                filePath={defaultFunctionsFile}
                handleSubmit={handleFunctionSave}
                functionName={undefined}
                isDataMapper={false}
                defaultType={selectedType?.label}
            />, POPUP_IDS.FUNCTION, "New Function", 600, 400);
        onClose();
    }

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden"
        }}>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "3px 8px" }}>
                <SearchBox sx={{ width: "100%" }} placeholder='Search' value={searchValue} onChange={handleFunctionSearch} />
            </div>
            <ScrollableContainer style={{ margin: '8px 0px' }}>
                {

                    isLoading ? (
                        <HelperPaneCustom.Loader />
                    ) : (
                        <>
                            {
                                !functionInfo || !functionInfo.category || functionInfo.category.length === 0 ? (
                                    <EmptyItemsPlaceHolder />
                                ) : (
                                    functionInfo.category.map((category) => {
                                        if (!category.subCategory) {
                                            if (!category.items || category.items.length === 0) {
                                                return null;
                                            }

                                            return (
                                                <ExpandableList>
                                                    <ExpandableList.Section key={category.label} title={category.label} level={0}>
                                                        <div style={{ marginTop: '10px' }}>
                                                            {category.items.map((item) => (
                                                                <SlidingPaneNavContainer onClick={async () => await handleFunctionItemSelect(item)}>
                                                                    <ExpandableList.Item
                                                                        key={item.label}
                                                                    >
                                                                        {getIcon(COMPLETION_ITEM_KIND.Function)}
                                                                        <FunctionItemLabel>{`${item.label}()`}</FunctionItemLabel>
                                                                    </ExpandableList.Item>
                                                                </SlidingPaneNavContainer>
                                                            ))}
                                                        </div>
                                                    </ExpandableList.Section>
                                                </ExpandableList>
                                            )
                                        }

                                        //if sub category is empty
                                        if (category.subCategory.length === 0) {
                                            return null;
                                        }

                                        return (
                                            <ExpandableList>
                                                {category.subCategory.map((subCategory) => (
                                                    <ExpandableList.Section sx={{ marginTop: '20px' }} key={subCategory.label} title={subCategory.label} level={0}>
                                                        <div style={{ marginTop: '10px' }}>
                                                            {subCategory.items.map((item) => (
                                                                <SlidingPaneNavContainer onClick={async () => await handleFunctionItemSelect(item)}>
                                                                    <ExpandableList.Item
                                                                        key={item.label}
                                                                    >
                                                                        {getIcon(COMPLETION_ITEM_KIND.Function)}
                                                                        <FunctionItemLabel>{`${item.label}()`}</FunctionItemLabel>
                                                                    </ExpandableList.Item>
                                                                </SlidingPaneNavContainer>
                                                            ))}
                                                        </div>
                                                    </ExpandableList.Section>
                                                ))}
                                            </ExpandableList>
                                        )
                                    })
                                )
                            }
                        </>
                    )
                }
            </ScrollableContainer>
            <Divider sx={{ margin: '0px' }} />
            <div style={{padding: '0px'}}>
                <FooterButtons onClick={handleNewFunctionClick} startIcon='add' title="New Function" />
                <FooterButtons sx={{ display: 'flex', justifyContent: 'space-between' }} startIcon='add' title="Open Function Browser" onClick={() => setIsLibraryBrowserOpen(true)} />

            </div>
            {isLibraryBrowserOpen && (
                <LibraryBrowser
                    anchorRef={anchorRef}
                    isLoading={isLoading}
                    libraryBrowserInfo={libraryBrowserInfo as HelperPaneFunctionInfo}
                    setFilterText={handleFunctionSearch}
                    onBack={() => setIsLibraryBrowserOpen(false)}
                    onClose={onClose}
                    onChange={onChange}
                    onFunctionItemSelect={onFunctionItemSelect}
                />
            )}
        </div>
    )
}

const FunctionItemLabel = styled.span`
    font-size: 13px;
`;
