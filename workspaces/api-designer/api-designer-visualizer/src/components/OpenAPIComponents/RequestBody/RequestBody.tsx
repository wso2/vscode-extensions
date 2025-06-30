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
import { Button, Codicon, Dropdown, Typography } from '@wso2/ui-toolkit';
import { RequestBody as R, MediaType as M, ReferenceObject as RO } from '../../../Definitions/ServiceDefinitions';
import SectionHeader from '../SectionHeader/SectionHeader';
import { ReactNode, useContext, useState } from 'react';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { MediaType } from '../MediaType/MediaType';
import { MediaTypes } from '../../../constants';
import { APIDesignerContext } from '../../../APIDesignerContext';
import { RefComponent } from '../RefComponent/RefComponent';
import { ReferenceObject } from '../ReferenceObject/ReferenceObject';

interface RequestBodyProps {
    requestBody: R | RO;
    hideTitle?: boolean;
    onRequestBodyChange: (mediaType: R | RO) => void;
}

const isRefereceObject = (value: R | RO): value is RO => {
    return (value as RO)?.$ref !== undefined;
};

export function RequestBody(props: RequestBodyProps) {
    const { requestBody, hideTitle, onRequestBodyChange } = props;
    const { rpcClient } = useVisualizerContext();
    const {
        props: { openAPI },
    } = useContext(APIDesignerContext);

    const [selectedMediaType, setSelectedMediaType] = useState<string | undefined>(requestBody?.content && Object.keys(requestBody.content)[0]);

    const mediaTypes = requestBody?.content && Object.keys(requestBody?.content);
    const componentRequestBodyNames = openAPI?.components?.requestBodies ? Object.keys(openAPI?.components?.requestBodies) : [];

    const handleRequestBodyChange = (mediaType: R | RO) => {
        onRequestBodyChange(mediaType);
    };

    const handleOptionChange = (options: string[]) => {
        const newRequestBody: R = {
            ...requestBody,
            content: options.reduce((acc, item) => {
                acc[item] = requestBody?.content[item] || { schema: { type: "object" } };
                return acc;
            }, {} as Record<string, M>)
        };
        setSelectedMediaType(options[0]);
        handleRequestBodyChange(newRequestBody);
    };
    const onConfigureRequestClick = () => {
        rpcClient.selectQuickPickItems({
            title: "Select Content Types",
            items: MediaTypes.map(item => ({ label: item, picked: mediaTypes?.includes(item) }))
        }).then(resp => {
            if (resp) {
                handleOptionChange(resp.map(item => item.label))
            }
        })
    };

    const onSchemaChange = (updatedSchema: any) => {
        if (selectedMediaType) {
            // Update the schema of the selected media type
            const newRequestBody: R = {
                ...requestBody,
                content: {
                    ...requestBody.content,
                    [selectedMediaType]: {
                        ...requestBody.content[selectedMediaType],
                        schema: updatedSchema
                    }
                }
            };
            handleRequestBodyChange(newRequestBody);
        }
    };

    const handleImportJSON = () => {
        rpcClient.getApiDesignerVisualizerRpcClient().importJSON().then(resp => {
            if (resp) {
                onSchemaChange(resp);
            }
        })
    };

    const handleMediaTypeChange = (mediaType: M) => {
        if (selectedMediaType) {
            // Update the schema of the selected media type
            const newRequestBody: R = {
                ...requestBody,
                content: {
                    ...requestBody.content,
                    [selectedMediaType]: mediaType
                }
            };
            handleRequestBodyChange(newRequestBody);
        }
    };

    const handleMoreOptionsClick = () => {
        const ref: RO = {
            $ref: `#/components/requestBodies/${componentRequestBodyNames[0]}`,
            summary: "",
            description: ""
        };
        handleRequestBodyChange(ref);
    };
    const addReferenceParamButton: ReactNode = (
        <RefComponent
            onChange={handleMoreOptionsClick}
            dropdownWidth={157}
            componnetHeight={32}
        />
    );

    const allMediaTypes = requestBody?.content && Object.keys(requestBody.content);

    return (
        <>
            {!hideTitle && <Typography variant='h2' sx={{ margin: 0 }}>Request</Typography>}
            <SectionHeader
                title="Body"
                variant='h3'
                actionButtons={
                    <>
                        {!isRefereceObject(requestBody) && (
                            <>
                                {allMediaTypes?.length > 0 && (
                                    <>
                                        <Button tooltip='Import from JSON' onClick={handleImportJSON} appearance='icon'>
                                            <Codicon name='arrow-circle-down' sx={{ marginRight: "4px" }} /> Import JSON
                                        </Button>
                                        <Dropdown
                                            id="media-type-dropdown"
                                            value={selectedMediaType || "application/json"}
                                            items={allMediaTypes?.map(mediaType => ({ label: mediaType, value: mediaType }))}
                                            onValueChange={(value) => setSelectedMediaType(value)} 
                                        />
                                    </>
                                )}
                                <Button tooltip='Configure Content Types' onClick={onConfigureRequestClick} appearance='icon'>
                                    <Codicon name='gear' sx={{ marginRight: "4px" }} /> Configure
                                </Button>
                                {componentRequestBodyNames.length > 0 && addReferenceParamButton}
                            </>
                        )}
                    </>
                }
            />
            {isRefereceObject(requestBody) && (
                <ReferenceObject
                    id={0}
                    type='requestBody'
                    referenceObject={requestBody}
                    onRefernceObjectChange={handleRequestBodyChange}
                    onRemoveReferenceObject={
                        () => handleRequestBodyChange({ content: { "application/json": { schema: { type: "object" } } } })
                    }
                />
            )}
            {selectedMediaType && requestBody?.content && (
                <MediaType
                    mediaType={requestBody.content[selectedMediaType]}
                    onMediaTypeChange={handleMediaTypeChange}
                    key={selectedMediaType}
                />
            )}
        </>
    )
}
