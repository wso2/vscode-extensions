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
import { Parameter } from '../../../Definitions/ServiceDefinitions';
import styled from '@emotion/styled';
import { ReadOnlyParameter } from '../Parameter/ReadOnlyParameter';

const PanelBody = styled.div`
    height: calc(100% - 87px);
    overflow-y: auto;
    padding: 16px;
    gap: 15px;
    display: flex;
    flex-direction: column;
`;
const MethodWrapper = styled.div`
    display: flex;
    width: fit-content;
    color: white;
    background-color: var(--vscode-editorHoverWidget-border);
`;
const PathWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

export interface ReadOnlyReferenceObjectsProps {
    name: string;
    parameter: Parameter;
}

export function ReadOnlyRefParameters(props: ReadOnlyReferenceObjectsProps) {
    const { parameter, name } = props;

    return (
        <PanelBody>
            <Typography sx={{ margin: 0, marginTop: 0, flex: 1 }} variant="h2">Parameter</Typography>
            <PathWrapper>
                <Typography sx={{ margin: 0, marginTop: 4 }} variant="body3">{name}</Typography>
                <ReadOnlyParameter parameter={parameter} />
            </PathWrapper>
        </PanelBody>
    )
}
