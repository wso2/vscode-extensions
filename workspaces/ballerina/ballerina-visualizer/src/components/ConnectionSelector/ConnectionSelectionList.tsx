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

import { useEffect, useRef, useState } from "react";
import { Category, CardList } from "@wso2/ballerina-side-panel";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { RelativeLoader } from "../RelativeLoader";
import { ConnectionSearchConfig, ConnectionSelectionListProps } from "./types";
import { LoaderContainer } from "./styles";
import { convertConnectionCategories, getSearchConfig } from "./utils";
import { getAiModuleOrg } from "../../views/BI/AIChatAgent/utils";

export function ConnectionSelectionList(props: ConnectionSelectionListProps): JSX.Element {
    const { connectionKind, selectedNode, onSelect } = props;

    const { rpcClient } = useRpcContext();
    const [connectionCategories, setConnectionCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    const projectPath = useRef<string>("");
    const aiModuleOrg = useRef<string>("");
    const searchConfig = useRef<ConnectionSearchConfig>();

    useEffect(() => {
        initPanel();
    }, []);

    const initPanel = async () => {
        setLoading(true);
        projectPath.current = await rpcClient.getVisualizerLocation().then((location) => location.projectUri);
        aiModuleOrg.current = await getAiModuleOrg(rpcClient, selectedNode?.codedata?.node);
        searchConfig.current = getSearchConfig(connectionKind, aiModuleOrg.current);
        await fetchConnections();
        setLoading(false);
    };

    const fetchConnections = async () => {
        const connectionSearchResponse = await rpcClient.getBIDiagramRpcClient().search({
            filePath: projectPath.current,
            queryMap: {
                q: searchConfig.current.query
            },
            searchKind: searchConfig.current.searchKind
        });

        setConnectionCategories(convertConnectionCategories(connectionKind, connectionSearchResponse.categories));
    };

    return (
        <>
            {loading && (
                <LoaderContainer>
                    <RelativeLoader />
                </LoaderContainer>
            )}
            {!loading && connectionCategories.length > 0 && (
                <CardList
                    categories={connectionCategories}
                    onSelect={onSelect}
                />
            )}
        </>
    );
}
