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
import { EVENT_TYPE, MACHINE_VIEW } from '@wso2/mi-core';
import { RUNTIME_VERSION_440 } from '../../../resources/constants';
import { compareVersions } from '../../../utils/commons';

export function createAndopenDataMapper(documentUri: string, formValues: { [key: string]: any; }, rpcClient: any, runtimeVersion: string) {
    const configName = formValues.name;

    const isResourceContentUsed = compareVersions(runtimeVersion, RUNTIME_VERSION_440) >= 0;
    const localPathPrefix = isResourceContentUsed ? 'resources' : 'gov';
    const configurationLocalPath = localPathPrefix + ':/datamapper/' + configName + '/' + configName + '.dmc';
    return () => {

        const request = {
            sourcePath: documentUri,
            regPath: configurationLocalPath
        };
        if (configName === "") {
            return;
        }
        const dmCreateRequest = {
            dmLocation: "",
            filePath: documentUri,
            dmName: configName
        };
        rpcClient.getMiDataMapperRpcClient().convertRegPathToAbsPath(request).then((response: any) => {
            rpcClient.getVisualizerState().then((state: any) => {
                rpcClient.getMiVisualizerRpcClient().openView({
                    type: EVENT_TYPE.OPEN_VIEW,
                    location: {
                        ...state,
                        documentUri: response.absPath,
                        view: MACHINE_VIEW.DataMapperView,
                        dataMapperProps: {
                            filePath: response.absPath,
                            configName: configName
                        }
                    }
                });
            });
        });
    };
}
