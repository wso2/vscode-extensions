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
import { PathItem } from '../PathItem/PathItem';
import { Operation } from "../Operation/Operation";
import { useContext, useState } from 'react';
import { APIDesignerContext } from '../../../APIDesignerContext';
import { PathID } from '../../../constants';

interface PathsProps {
    paths: P;
    onPathsChange: (path: P, newPath?: string) => void;
}

export function Paths(props: PathsProps) {
    const { paths, onPathsChange } = props;
    const { 
        props: { selectedComponentID },
        api: { onSelectedComponentIDChange }
    } = useContext(APIDesignerContext);
    const [prevSelectedPath, setPrevSelectedPath] = useState(selectedComponentID.split("#-")[2]);
    const handlePathsChange = (pathItem: PI, path: string) => {
        const previousPath = selectedComponentID.split("#-")[2];
        setPrevSelectedPath(previousPath);
        if (previousPath !== path) {
            const newPaths = Object.keys(paths).reduce((acc, key) => {
                if (key === previousPath) {
                    // Add new path item
                    acc[path] = pathItem;
                    return acc;
                }
                acc[key] = paths[key];
                return acc;
            }, {} as P);
            onPathsChange(newPaths, path); // Call onPathsChange with the updated paths
            onSelectedComponentIDChange(`${PathID.PATHS_COMPONENTS}${PathID.SEPERATOR}${path}`);
        } else {
            onPathsChange({ ...paths, [path]: pathItem });
        }
    };
    const handleOperationsChange = (operation: O) => {
        onPathsChange({ 
            ...paths, 
            [selectedPath]: {
                ...paths[selectedPath], 
                [selectedMethod]: operation
            }
        });
    };
    const selectedPath = selectedComponentID.split("#-")[2];
    const selectedMethod = selectedComponentID.split("#-")[3];
    const selectedOperation: O = selectedPath && selectedMethod && paths[selectedPath] && paths[selectedPath][selectedMethod] as O;
    const selectedPathInPaths = Object.keys(paths).includes(selectedPath);
    return (
        <>
            {Object.keys(paths).map((key) => {
                if (key !== "$ref" && key !== "summary" && key !== "description" && key !== "servers" && !selectedMethod && (selectedPathInPaths ? selectedPath === key : key === prevSelectedPath)) {
                    return (
                        <PathItem
                            pathItem={paths[key]}
                            path={key !== selectedPath ? selectedPath : key}
                            onPathItemChange={handlePathsChange}
                        />
                    )
                } else if (key !== "$ref" && key !== "summary" && key !== "description" && key !== "servers" && selectedPath === key && selectedMethod) {
                    return (
                        <Operation
                            operation={selectedOperation}
                            method={selectedMethod}
                            path={selectedPath}
                            onOperationChange={handleOperationsChange}
                        />
                    )
                }
            })}
        </>
    )
}
