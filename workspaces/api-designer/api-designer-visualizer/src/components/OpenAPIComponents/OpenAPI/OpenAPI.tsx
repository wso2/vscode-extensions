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
import { OpenAPI as O, Parameter, ReferenceObject, RequestBody, Response } from '../../../Definitions/ServiceDefinitions';
import { Overview } from '../Overview/Overview';
import { Paths } from '../Paths/Paths';
import { SchemaEditor } from '../../SchemaEditor/SchemaEditor';
import { useContext } from 'react';
import { APIDesignerContext } from '../../../APIDesignerContext';
import { RefParameter } from '../RefParameter/RefParameter';
import { RefRequestBody } from '../RefRequestBody/RefRequestBody';
import { RefResponse } from '../RefResponse/RefResponse';
import { PathID } from '../../../constants';

interface OverviewProps {
    openAPI: O;
    onOpenAPIChange: (openAPIDefinition: O) => void;
}

// Path parent component ID is represented with Paths#-Component#-${path},
// Method component ID is represented with Paths#-Component#-${path}#-${method},
// Overview component ID is represented with Overview#-Component,
// Schema component ID is represented with Schema#-Component#-schema
export function OpenAPI(props: OverviewProps) {
    const { openAPI, onOpenAPIChange } = props;
    const {
        props: { selectedComponentID },
        api: { onSelectedComponentIDChange }
    } = useContext(APIDesignerContext);
    const componetName = selectedComponentID.split("#-")[0];

    const handleOpenAPIChange = (openAPI: O) => {
        onOpenAPIChange(openAPI);
    };
    const handleRequestBodiesChange = (requestBody: RequestBody | ReferenceObject, name: string, initialName: string) => {
        const updatedOpenAPI = { ...openAPI };
        const requestBodies = { ...updatedOpenAPI.components.requestBodies };
        // Create new object maintaining order and replacing the key
        const orderedRequestBodies = Object.fromEntries(
            Object.entries(requestBodies).map(([key, value]) => 
                key === initialName ? [name, requestBody] : [key, value]
            )
        );
        updatedOpenAPI.components.requestBodies = orderedRequestBodies as RequestBody;
        if (initialName !== name) {
            onSelectedComponentIDChange(`${PathID.REQUEST_BODY_COMPONENTS}${PathID.SEPERATOR}${name}`);
        }
        handleOpenAPIChange(updatedOpenAPI);
    };
    const handleParameterChange = (parameter: Parameter, name: string, initialName?: string) => {
        const updatedOpenAPI = { ...openAPI };
        const parameters = { ...updatedOpenAPI.components.parameters };
        // Create new object maintaining order and replacing the key
        const orderedParameters = Object.fromEntries(
            Object.entries(parameters).map(([key, value]) => 
                key === initialName ? [name, parameter] : [key, value]
            )
        );
        updatedOpenAPI.components.parameters = orderedParameters;
        if (initialName !== name) {
            onSelectedComponentIDChange(`${PathID.PARAMETERS_COMPONENTS}${PathID.SEPERATOR}${name}`);
        }
        handleOpenAPIChange(updatedOpenAPI);
    };
    const handleResponseChange = (response: Response, name: string, initialName?: string) => {
        const updatedOpenAPI = { ...openAPI };
        const responses = { ...updatedOpenAPI.components.responses };
        // Create new object maintaining order and replacing the key
        const orderedResponses = Object.fromEntries(
            Object.entries(responses).map(([key, value]) => 
                key === initialName ? [name, response] : [key, value]
            )
        );
        updatedOpenAPI.components.responses = orderedResponses;
        if (initialName !== name) {
            onSelectedComponentIDChange(`${PathID.RESPONSE_COMPONENTS}${PathID.SEPERATOR}${name}`);
        }
        handleOpenAPIChange(updatedOpenAPI);
    };


    return (
        <>
            {componetName === PathID.OVERVIEW && (
                <Overview openAPIDefinition={openAPI} onOpenApiDefinitionChange={handleOpenAPIChange} />
            )}
            {componetName === PathID.PARAMETERS && (
                <Paths 
                    paths={openAPI.paths}
                    onPathsChange={(paths) => handleOpenAPIChange({ ...openAPI, paths })}
                />
            )}
            {componetName === PathID.SCHEMAS && (
                <SchemaEditor
                    openAPI={openAPI}
                    schema={openAPI.components.schemas[selectedComponentID.split("#-")[2]]}
                    schemaName={selectedComponentID.split("#-")[2]}
                    onSchemaChange={
                        (schema) => handleOpenAPIChange({ 
                            ...openAPI, components: { 
                                ...openAPI.components, schemas: { 
                                    ...openAPI.components.schemas, [selectedComponentID.split("#-")[2]]: schema 
                                } 
                            } 
                        }
                    )
                }
                />
            )}
            {componetName === PathID.PARAMETERS && (
                <RefParameter
                    paramerName={selectedComponentID.split("#-")[2]}
                    parameter={openAPI.components.parameters[selectedComponentID.split("#-")[2]]}
                    onParameterChange={handleParameterChange}
                />
            )}
            {componetName === PathID.REQUEST_BODY && (
                <RefRequestBody
                    requestBodyName={selectedComponentID.split("#-")[2]}
                    requestBody={openAPI.components.requestBodies[selectedComponentID.split("#-")[2]]}
                    onRequestBodyChange={handleRequestBodiesChange}
                />
            )}
            {componetName === PathID.RESPONSES && (
                <RefResponse
                    responseName={selectedComponentID.split("#-")[2]}
                    response={openAPI.components.responses[selectedComponentID.split("#-")[2]]}
                    onResponseChange={handleResponseChange}
                />
            )}
        </>
    )
}
