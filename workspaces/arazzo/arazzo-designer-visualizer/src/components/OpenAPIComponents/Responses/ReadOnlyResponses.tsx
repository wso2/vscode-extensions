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
import { Tabs, Typography, ViewItem } from '@wso2/ui-toolkit';
import { Responses as Rs, Response as R } from '../../../Definitions/ServiceDefinitions';
import { useState } from 'react';
import { ReadOnlyResponse } from '../Response/ReadOnlyResponse';

interface ResponsesProps {
    responses: Rs;
}

const isRefereceObject = (value: Rs | R): value is R => {
    return value.hasOwnProperty('$ref');
};

export function ReadOnlyResponses(props: ResponsesProps) {
    const { responses } = props;
    const [selectedStatusCode, setSelectedStatusCode] = useState<string | undefined>(responses && Object.keys(responses)[0]);

    const statusCodes = responses && Object.keys(responses);
    const statusTabViewItems: ViewItem[] = statusCodes && statusCodes.map(statusCode => ({ id: statusCode, name: statusCode }));

    return (
        <>
            <Typography sx={{ margin: 0 }} variant='h2'> Responses </Typography>
            {statusTabViewItems?.length > 0 && (
                <Tabs views={statusTabViewItems} childrenSx={{paddingTop: 10}} currentViewId={selectedStatusCode} onViewChange={setSelectedStatusCode}>
                    {responses && Object.keys(responses)?.map((status) => (
                        <div id={status} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {isRefereceObject(responses[status]) ? (
                                <>
                                    <ReadOnlyResponse response={responses[status] as R} />
                                </>
                            ) : (
                                <ReadOnlyResponse
                                    response={responses[status] as R}
                                />
                            )}
                        </div>
                    ))}
                </Tabs>
            )}
        </>
    );
}
