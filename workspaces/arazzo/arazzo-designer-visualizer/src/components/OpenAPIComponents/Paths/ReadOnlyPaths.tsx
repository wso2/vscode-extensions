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
import { Paths as P, PathItem as PI, Operation as O } from '../../../Definitions/ServiceDefinitions';
import { useContext } from 'react';
import { APIDesignerContext } from '../../../APIDesignerContext';
import { ReadOnlyOperation } from '../Operation/ReadOnlyOperation';
import { ReadOnlyPathItem } from '../PathItem/ReadOnlyPathItem';

interface PathsProps {
    paths: P;
}

export function ReadOnlyPaths(props: PathsProps) {
    const { paths } = props;
    const { 
        props: { selectedComponentID },
    } = useContext(APIDesignerContext);
    const selectedPath = selectedComponentID.split("#-")[2];
    const selectedMethod = selectedComponentID.split("#-")[3];
    const selectedOperation: O = selectedPath && selectedMethod && paths[selectedPath] && paths[selectedPath][selectedMethod] as O;
    return (
        <>
            {Object.keys(paths).map((key) => {
                if (key !== "$ref" && key !== "summary" && key !== "description" && key !== "servers" && selectedPath === key && selectedMethod && selectedOperation) {
                    return (
                        <ReadOnlyOperation
                            operation={selectedOperation}
                            method={selectedMethod}
                            path={selectedPath}
                        />
                    )
                } else if (key !== "$ref" && key !== "summary" && key !== "description" && key !== "servers" && selectedPath === key) {
                    return (
                        <ReadOnlyPathItem
                            pathItem={paths[key]}
                            path={key}
                        />
                    )
                }
            })}
        </>
    )
}
