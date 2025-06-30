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
import { OpenAPI as O } from '../../../Definitions/ServiceDefinitions';
import { useContext } from 'react';
import { APIDesignerContext } from '../../../APIDesignerContext';
import { ReadOnlyPaths } from '../Paths/ReadOnlyPaths';
import { ReadOnlyOverview } from '../Overview/ReadOnlyOverview';
import { ReadOnlySchemaEditor } from '../../SchemaEditor/ReadOnlySchemaEditor';
import { ReadOnlyRefParameters } from '../RefParameter/ReadOnlyRefParameter';
import { ReadOnlyRefRequestBody } from '../RefRequestBody/ReadOnlyRefRequestBody';
import { ReadOnlyRefResponse } from '../RefResponse/ReadOnlyRefResponse';

interface OverviewProps {
    openAPI: O;
}

// Path parent component is represented with Paths#-Component#-path-method, 
// Overview is represented with Overview#-Component,
// Schema is represented with Schema#-Component#-schema
export function ReadOnlyOpenAPI(props: OverviewProps) {
    const { openAPI } = props;
    const { 
        props: { selectedComponentID },
    } = useContext(APIDesignerContext);
    const componetName = selectedComponentID.split("#-")[0];

    return (
        <>
            {componetName === "Overview" && (
                <ReadOnlyOverview openAPIDefinition={openAPI} />
            )}
            {componetName === "Paths" && (
                <ReadOnlyPaths 
                    paths={openAPI.paths} 
                />
            )}
            {componetName === "Schemas" && (
                <ReadOnlySchemaEditor
                    schema={openAPI.components.schemas[selectedComponentID.split("#-")[2]]}
                    schemaName={selectedComponentID.split("#-")[2]}
                />
            )}
            {componetName === "Parameters" && (
                <ReadOnlyRefParameters
                    parameter={openAPI.components.parameters[selectedComponentID.split("#-")[2]]}
                    name={selectedComponentID.split("#-")[2]}
                />
            )}
            {componetName === "RequestBody" && (
                <ReadOnlyRefRequestBody
                    requestBody={openAPI.components.requestBodies[selectedComponentID.split("#-")[2]]}
                    name={selectedComponentID.split("#-")[2]}
                />
            )}
            {componetName === "Responses" && (
                <ReadOnlyRefResponse
                    response={openAPI.components.responses[selectedComponentID.split("#-")[2]]}
                    name={selectedComponentID.split("#-")[2]}
                />
            )}
        </>
    )
}
