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

import { useEffect, useState } from "react";
import { useVisualizerContext } from "@wso2/api-designer-rpc-client";
import { convertOpenAPIStringToOpenAPI } from "../../components/Utils/OpenAPIUtils";
import { OpenAPI } from "../../Definitions/ServiceDefinitions";
import { debounce } from "lodash";
import { MachineStateValue } from "@wso2/api-designer-core";
import { ApiDesigner } from "../../components/OpenAPIComponents/ApiDesigner/ApiDesigner";

interface ServiceDesignerProps {
    fileUri: string;
}

export function APIDesignerView(props: ServiceDesignerProps) {
    const { fileUri } = props;
    const { rpcClient } = useVisualizerContext();
    const [ apiDefinition, setApiDefinition ] = useState<OpenAPI | undefined>(undefined);
    const [ documentType, setDocumentType ] = useState<string | undefined>(undefined);
    const [ isNewFile, setIsNewFile ] = useState<boolean>(false);

    rpcClient?.onStateChanged((newState: MachineStateValue) => {
        if (typeof newState === 'object' && 'ready' in newState && newState.ready === 'viewReady') {
            fetchData();
        }
    });
    
    const writeToFile = async (openApiDefinition: OpenAPI) => {
        rpcClient.getApiDesignerVisualizerRpcClient().writeOpenApiContent({
            filePath: fileUri,
            content: JSON.stringify(openApiDefinition),
        });
    };
    const debouncedFileWrite = debounce(writeToFile, 300);
    const handleOpenApiDefinitionChange = async (openApiDefinition: OpenAPI) => {
        setApiDefinition(openApiDefinition);
        debouncedFileWrite(openApiDefinition);
    };

    const fetchData = async () => {
        const resp = await rpcClient.getApiDesignerVisualizerRpcClient().getOpenApiContent({
            filePath: fileUri,
        });
        let convertedApiDefinition = convertOpenAPIStringToOpenAPI(resp.content, resp.type);
        if (!convertedApiDefinition) {
            convertedApiDefinition = {
                openapi: "3.0.1",
                info: {
                    title: "",
                    version: "",
                },
                paths: {},
            };
            setIsNewFile(true);
        }
        // If no Info field is present in the response, then set the Info field
        if (!convertedApiDefinition.info) {
            convertedApiDefinition.info = {
                title: "",
                version: "",
            };
        }
        setApiDefinition(convertedApiDefinition);
        setDocumentType(resp.type);
    };

    useEffect(() => {
        fetchData();
    }, [fileUri]);
    return (
        <ApiDesigner
            openApi={apiDefinition}
            isEditMode={isNewFile}
            openAPIVersion={apiDefinition?.openapi || "3.0.1"}
            onOpenApiChange={handleOpenApiDefinitionChange}
        />
    )
}
