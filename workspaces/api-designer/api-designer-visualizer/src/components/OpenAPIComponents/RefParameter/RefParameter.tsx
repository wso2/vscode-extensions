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
import { Dropdown, TextField, Typography } from '@wso2/ui-toolkit';
import { Parameter, SchemaTypes } from '../../../Definitions/ServiceDefinitions';
import { PanelBody } from '../Parameters/Parameters';
import { useContext } from 'react';
import { APIDesignerContext } from '../../../APIDesignerContext';
import { PathID } from '../../../constants';

interface RefParamaterProps {
    paramerName: string;
    parameter: Parameter;
    onParameterChange: (parameter: Parameter, name: string, initialName?: string) => void;
}

const DataTypes = [
    "string",
    "number",
    "integer",
    "boolean",
    "array",
    "any"
];

export function RefParameter(props: RefParamaterProps) {
    const { paramerName, parameter, onParameterChange } = props;
    const { 
        api: { onSelectedComponentIDChange }
    } = useContext(APIDesignerContext);
    const handleParameterChange = (parameter: Parameter) => {
        onParameterChange(parameter, paramerName, paramerName);
    };
    const hanleParameterNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onParameterChange(parameter, e.target.value, paramerName);
        onSelectedComponentIDChange(`${PathID.PARAMETERS_COMPONENTS}${PathID.SEPERATOR}${e.target.value}`);
    };

    const dataTypes = DataTypes.map((type) => {
        return { content: type, value: type };
    });

    return (
        <PanelBody>
            <Typography sx={{ margin: 0, marginTop: 0, flex: 1 }} variant="h2">Parameter</Typography>
            <TextField
                label='Reference Name'
                placeholder='Enter the reference name'
                value={paramerName}
                onBlur={(e) => hanleParameterNameChange(e)}
            />
            <Dropdown
                id='parameter-type'
                label='Parameter Type'
                items={[
                    { content: 'path', value: 'path' },
                    { content: 'query', value: 'query' },
                    { content: 'header', value: 'header' },
                ]}
                value={parameter.in}
                onChange={(e) => handleParameterChange(
                    {
                        ...parameter,
                        in: e.target.value as "header" | "path" | "query" | "cookie",
                    }
                )}
            />
            <TextField
                label='Parameter Name'
                placeholder='Enter the parameter name'
                value={parameter.name}
                onChange={(e) => handleParameterChange(
                    {
                        ...parameter,
                        name: e.target.value,
                    }
                )}
            />
            <Dropdown
                id={"parameter-data-type"}
                label={"Type"}
                items={dataTypes}
                value={parameter.schema?.type}
                onChange={(e) => handleParameterChange(
                    {
                        ...parameter,
                        schema: {
                            ...parameter.schema,
                            type: e.target.value as SchemaTypes,
                        }
                    }
                )}
            />
            <TextField
                label='Description'
                placeholder='Enter the description'
                value={parameter.description}
                onChange={(e) => handleParameterChange(
                    {
                        ...parameter,
                        description: e.target.value,
                    }
                )}
            />
        </PanelBody>
    )
}
