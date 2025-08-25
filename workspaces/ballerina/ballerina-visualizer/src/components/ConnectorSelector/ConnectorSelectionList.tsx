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
import { ConnectorSearchConfig, ConnectorSelectorProps } from "./types";
import { LoaderContainer } from "./styles";
import { convertConnectorCategories, getSearchConfig } from "./utils";
import { getAiModuleOrg } from "../../views/BI/AIChatAgent/utils";

export function ConnectorSelectionList(props: ConnectorSelectorProps): JSX.Element {
    const { connectorType, selectedNode, onSelect } = props;

    const { rpcClient } = useRpcContext();
    const [connectorCategories, setConnectorCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    const projectPath = useRef<string>("");
    const aiModuleOrg = useRef<string>("");
    const searchConfig = useRef<ConnectorSearchConfig>();

    useEffect(() => {
        initPanel();
    }, []);

    const initPanel = async () => {
        setLoading(true);
        projectPath.current = await rpcClient.getVisualizerLocation().then((location) => location.projectUri);
        aiModuleOrg.current = await getAiModuleOrg(rpcClient);
        searchConfig.current = getSearchConfig(connectorType, aiModuleOrg.current);
        await fetchConnectors();
        setLoading(false);
    };

    const fetchConnectors = async () => {
        if (!selectedNode) {
            console.error("Selected node not provided");
            return;
        }

        const connectorSearchResponse = await rpcClient.getBIDiagramRpcClient().search({
            filePath: projectPath.current,
            queryMap: {
                q: searchConfig.current.query
            },
            searchKind: searchConfig.current.searchKind
        });

        setConnectorCategories(convertConnectorCategories(connectorType, connectorSearchResponse.categories));
    };

    return (
        <>
            {loading && (
                <LoaderContainer>
                    <RelativeLoader />
                </LoaderContainer>
            )}
            {!loading && connectorCategories.length > 0 && (
                <CardList
                    categories={connectorCategories}
                    onSelect={onSelect}
                />
            )}
        </>
    );
}
