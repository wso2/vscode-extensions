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

import React, { useEffect, useState } from "react";

import { DataMapperView, resetStoresForNewLoad } from "@wso2/mi-data-mapper";
import { ProgressIndicator } from "@wso2/ui-toolkit";
import { useVisualizerContext } from "@wso2/mi-rpc-client";

import { useIOTypes } from "../../Hooks";

interface DataMapperProps {
    filePath: string;
    functionName?: string;
    fileContent?: string;
    nonMappingFileContent?: string;
    configName: string;
}

export function DataMapper(props: DataMapperProps) {
    const { rpcClient } = useVisualizerContext();
    const { filePath, functionName, fileContent, nonMappingFileContent } = props;

    const [isFileUpdateError, setIsFileUpdateError] = useState(false);

    const { dmIOTypes, isFetchingIOTypes, isIOTypeError } = useIOTypes(filePath, functionName, nonMappingFileContent);

    const updateFileContent = async (newContent: string) => {
        try {
            rpcClient.getMiDataMapperRpcClient().addToDMUndoStack(newContent);
            await rpcClient
                .getMiDataMapperRpcClient()
                .updateFileContent({ filePath, fileContent: newContent });
        } catch (error) {
            console.error(error);
            setIsFileUpdateError(true);
        }
    };

    useEffect(() => {
        // Hack to hit the error boundary
        if (isIOTypeError) {
            throw new Error("Error while fetching input/output types");
        } else if (isFileUpdateError) {
            throw new Error("Error while updating file content");
        } 
    }, [isIOTypeError, isFileUpdateError]);

    useEffect(() => {
        resetStoresForNewLoad();
    },[filePath]);

    return (
        <>
            {isFetchingIOTypes
                ? <ProgressIndicator />
                : (
                    <DataMapperView
                        filePath={filePath}
                        fileContent={fileContent}
                        functionName={functionName}
                        dmIOTypes={dmIOTypes}
                        updateFileContent={updateFileContent}
                        configName={props.configName}
                    />
                )
            }
        </>
    );

};
