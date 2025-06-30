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

import { TextField, RadioButtonGroup } from "@wso2/ui-toolkit";
import { RpcClient } from "@wso2/mi-rpc-client";
import { FieldErrors, UseFormGetValues, UseFormRegister } from "react-hook-form";
import { CreateRegistryResourceRequest } from "@wso2/mi-core";

export interface AddToRegistryProps {
    path: string;
    fileName: string;
    register: UseFormRegister<any>;
    getValues: UseFormGetValues<any>;
    errors: FieldErrors<any>;
}

export async function saveToRegistry(rpcClient: RpcClient, path: string, registryType: string,
    fileName: string, content: string, registryPath: string, artifactName: string) {
    const regRequest: CreateRegistryResourceRequest = {
        projectDirectory: path,
        templateType: "Sequence",
        filePath: "",
        resourceName: fileName,
        artifactName: artifactName,
        registryPath: registryPath,
        registryRoot: registryType,
        createOption: "new",
        content: content,
    }
    return await rpcClient.getMiDiagramRpcClient().createRegistryResource(regRequest);
}

export function formatRegistryPath(path: string, registryType: string, fileName: string): string | undefined {
    if (!path || !fileName) return undefined;

    let regPath = '';
    if (registryType === 'gov') {
        regPath = regPath + 'gov';
    } else {
        regPath = regPath + 'conf';
    }
    path.startsWith('/') ? regPath = regPath + path : regPath = regPath + '/' + path;
    regPath.endsWith('/') ? regPath = regPath + fileName + '.xml' : regPath = regPath + '/' + fileName + '.xml';
    return regPath;
}

export async function getArtifactNamesAndRegistryPaths(path: string, rpcClient: RpcClient)
    : Promise<{ artifactNamesArr: string[], registryPaths: string[] }> {
    const artifactRes = await rpcClient.getMiDiagramRpcClient().getAvailableRegistryResources({
        path: path
    });
    const pathRes = await rpcClient.getMiDiagramRpcClient().getAllRegistryPaths({
        path: path,
    });
    return { artifactNamesArr: artifactRes.artifacts, registryPaths: pathRes.registryPaths };
}

export function AddToRegistry(props: AddToRegistryProps) {
    return (
        <div>
            <TextField
                id='artifactName'
                label="Artifact Name"
                errorMsg={props.errors.artifactName?.message.toString()}
                {...props.register("artifactName")}
            />
            <RadioButtonGroup
                label="Select registry type"
                id="registryType"
                options={[{ content: "Governance registry (gov)", value: "gov" }, { content: "Configuration registry (conf)", value: "conf" }]}
                {...props.register("registryType")}
            />
            <TextField
                id='registryPath'
                label="Registry Path"
                errorMsg={props.errors.registryPath?.message.toString()}
                {...props.register("registryPath")}
            />
        </div>
    );
};

export default AddToRegistry;
