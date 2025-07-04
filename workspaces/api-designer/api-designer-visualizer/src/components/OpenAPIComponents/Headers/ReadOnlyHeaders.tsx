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
import { Headers as Hs, HeaderDefinition as H, ReferenceObject as R } from '../../../Definitions/ServiceDefinitions';
import { ReadOnlyHeader } from '../Header/ReadOnlyHeader';

interface HeadersProps {
    headers : Hs;
}

const isReferenceObject = (obj: H | R): obj is R => {
    return obj && typeof obj === 'object' && '$ref' in obj;
}

export function ReadOnlyHeaders(props: HeadersProps) {
    const { headers } = props;

    return (
        <>
            <Typography sx={{ margin: 0 }} variant='h4'> Headers </Typography>
            {headers && Object.entries(headers).map(([headerName, header], index) => (
                <div key={index} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {isReferenceObject(header) ? (
                        <>
                            {/* TODO: Implement ReferenceObject */}
                        </>
                    ) : (
                        <ReadOnlyHeader
                            id={index}
                            header={header as H}
                            name={headerName}
                        />
                    )}
                </div>
            ))}
        </>
    )
}
