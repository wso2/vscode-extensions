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
import { TextField, Typography } from '@wso2/ui-toolkit';
import { RequestBody as R, ReferenceObject } from '../../../Definitions/ServiceDefinitions';
import { PanelBody } from '../Parameters/Parameters';
import { RequestBody } from '../RequestBody/RequestBody';
import { PathID } from '../../../constants';
import { useContext } from 'react';
import { APIDesignerContext } from '../../../APIDesignerContext';

interface RefRequestBodyProps {
    requestBodyName: string;
    requestBody: R | ReferenceObject;
    onRequestBodyChange: (requestBody: R | ReferenceObject, name: string, initialName?: string) => void;
}

export function RefRequestBody(props: RefRequestBodyProps) {
    const { requestBodyName, requestBody, onRequestBodyChange } = props;
    const { 
        api: { onSelectedComponentIDChange }
    } = useContext(APIDesignerContext);
    const handleRequestBodyChangeChange = (parameter: R | ReferenceObject) => {
        onRequestBodyChange(parameter, requestBodyName, requestBodyName);
    };
    const handleRequestBodyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onRequestBodyChange(requestBody, e.target.value, requestBodyName);
        onSelectedComponentIDChange(`${PathID.REQUEST_BODY_COMPONENTS}${PathID.SEPERATOR}${e.target.value}`);
    };

    return (
        <PanelBody>
            <Typography sx={{ margin: 0, marginTop: 0, flex: 1 }} variant="h2">Request Body</Typography>
            <TextField
                label='Reference Name'
                placeholder='Enter the reference name'
                value={requestBodyName}
                onBlur={(e) => handleRequestBodyNameChange(e)}
            />
            <RequestBody
                hideTitle
                requestBody={requestBody}
                onRequestBodyChange={handleRequestBodyChangeChange}
            />
        </PanelBody>
    )
}
