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
import { Response as R } from '../../../Definitions/ServiceDefinitions';
import { PanelBody } from '../Parameters/Parameters';
import { Response } from '../Response/Response';
import { APIDesignerContext } from '../../../APIDesignerContext';
import { useContext } from 'react';
import { PathID } from '../../../constants';

interface RefRequestBodyProps {
    responseName: string;
    response: R;
    onResponseChange: (response: R, name: string, initialName?: string) => void;
}

export function RefResponse(props: RefRequestBodyProps) {
    const { responseName, response, onResponseChange } = props;
    const { 
        api: { onSelectedComponentIDChange }
    } = useContext(APIDesignerContext);
    const handleResponseChangeChange = (response: R) => {
        onResponseChange(response, responseName, responseName);
    };
    const handleResponseNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onResponseChange(response, e.target.value, responseName);
        onSelectedComponentIDChange(`${PathID.RESPONSE_COMPONENTS}${PathID.SEPERATOR}${e.target.value}`);
    };

    return (
        <PanelBody>
            <Typography sx={{ margin: 0, marginTop: 0, flex: 1 }} variant="h2">Response</Typography>
            <TextField
                label='Reference Name'
                placeholder='Enter the reference name'
                value={responseName}
                onBlur={(e) => handleResponseNameChange(e)}
            />
            <Response
                response={response}
                onResponseChange={handleResponseChangeChange}
            />
        </PanelBody>
    )
}
