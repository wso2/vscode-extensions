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
import { Typography } from '@wso2/ui-toolkit';
import styled from "@emotion/styled";
import { ReferenceObject as R } from '../../../Definitions/ServiceDefinitions';
import { useContext } from 'react';
import { APIDesignerContext } from '../../../APIDesignerContext';
import { resolveTypeFormSchema } from '../../Utils/OpenAPIUtils';
import { VSCodeDataGridRow } from '@vscode/webview-ui-toolkit/react';
import { ParameterGridCell, ParamGridRow } from '../Parameters/Parameters';

interface ReadOnlyReferenceObjectsProps {
    referenceObject: R;
    type?: string;
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
export function ReadOnlyReferenceObject(props: ReadOnlyReferenceObjectsProps) {
    const { referenceObject, type } = props;
    const { 
        props: { openAPI },
    } = useContext(APIDesignerContext);

    const refObject = (type === "query" || type === "path" || type === "header" ) ? openAPI?.components?.parameters[referenceObject?.$ref?.replace("#/components/parameters/", "")] : type === "response" ? openAPI?.components?.responses[referenceObject.$ref.replace("#/components/response/", "")] : openAPI?.components?.requestBodies[referenceObject.$ref];
    const refObjectName = refObject?.name;
    const refObjectType = resolveTypeFormSchema(refObject?.schema);
    const refObjectDescription = refObject?.description;

    return (
        // <ParamContainer>
        //     <ParamWrapper>
        //         <Typography sx={{ margin: 0 }} variant='body2'> {refObjectName} </Typography>
        //         <Typography sx={{ margin: 0, fontWeight: "lighter" }} variant='body2'> {`${refObjectType} ${refObject.schema.format ? `<${refObject.schema.format}>` : ""}`} </Typography>
        //     </ParamWrapper>
        //     <Typography sx={{ margin: 0, fontWeight: "lighter" }} variant='body3'> {refObjectDescription} </Typography>
        // </ParamContainer>
        <ParamGridRow>
            <ParameterGridCell key={refObjectName} grid-column={`1`}>Reference</ParameterGridCell>
            <ParameterGridCell key={refObjectType} grid-column={`2`}>{refObjectType ? refObjectType : "-"}</ParameterGridCell>
            <ParameterGridCell key={refObjectDescription} grid-column={`3`}>{refObjectDescription ? refObjectDescription : "-"}</ParameterGridCell>
        </ParamGridRow>
    )
}
