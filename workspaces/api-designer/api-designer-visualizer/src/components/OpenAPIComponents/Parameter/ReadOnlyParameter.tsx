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
import styled from "@emotion/styled";
import { Parameter } from '../../../Definitions/ServiceDefinitions';
import { resolveTypeFormSchema } from '../../Utils/OpenAPIUtils';
import { ParameterGridCell, ParamGridRow } from '../Parameters/Parameters';

interface ReadOnlyParameterProps {
    parameter: Parameter;
}

const ParamContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const ParamWrapper = styled.div`
    display: flex;
    flex-direction: row;
    gap: 10px;
`;

export function ReadOnlyParameter(props: ReadOnlyParameterProps) {
    const { parameter } = props;

    const type = resolveTypeFormSchema(parameter.schema);

    return (
        // <ParamContainer>
        //     <ParamWrapper>
        //         <Typography sx={{ margin: 0 }} variant='body2'> {parameter.name} </Typography>
        //         <Typography sx={{ margin: 0, fontWeight: "lighter" }} variant='body2'> {`${resolveTypeFormSchema(parameter.schema)} ${parameter.schema.format ? `<${parameter.schema.format}>` : ""}`} </Typography>
        //     </ParamWrapper>
        //     <Typography sx={{ margin: 0, fontWeight: "lighter" }} variant='body3'> {parameter.description} </Typography>
        // </ParamContainer>
        <ParamGridRow>
            <ParameterGridCell key={parameter.name} grid-column={`1`}>{parameter.name ? parameter.name : "-"}</ParameterGridCell>
            <ParameterGridCell key={parameter.schema.type} grid-column={`2`}>{type ? type : "-"}</ParameterGridCell>
            <ParameterGridCell key={parameter.schema.description} grid-column={`3`}>{parameter.schema.description ? parameter.schema.description : "-"}</ParameterGridCell>
        </ParamGridRow>
    )
}
