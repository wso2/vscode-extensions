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
import { Content, MediaType as M, Response as R, Schema } from '../../../Definitions/ServiceDefinitions';
import { useEffect, useState } from 'react';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { MediaType } from '../MediaType/MediaType';
import { CodeTextArea } from '../../CodeTextArea/CodeTextArea';
import { Headers } from '../Headers/Headers';
import SectionHeader from '../SectionHeader/SectionHeader';
import { Button, Codicon, Dropdown } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { MediaTypes } from '../../../constants';

const SubSectionWrapper = styled.div`
    display: flex;
    flex-direction: column;
    padding-top: 5px;
    gap: 5px;
`;
interface ResponseProps {
    response: R;
    onResponseChange: (response: R) => void;
}

export function Response(props: ResponseProps) {
    const { response, onResponseChange } = props;
    const { rpcClient } = useVisualizerContext();
    const [selectedMediaType, setSelectedMediaType] = useState<string | undefined>(response?.content && Object.keys(response?.content)[0]);
    const [description, setDescription] = useState<string | undefined>(response?.description);
    const responseMediaTypes = response?.content && Object.keys(response?.content);

    const handleOptionChange = (options: string[]) => {
        const newResponse: R = {
            ...response,
            content: options.reduce((acc, item) => {
                acc[item] = (response?.content && response?.content[item]) || { schema: { type: "object" } };
                return acc;
            }, {} as Content)
        };
        setSelectedMediaType(options[0]);
        onResponseChange(newResponse);
    };

    const handleConfigureClick = () => {
        rpcClient.selectQuickPickItems({
            title: "Select Types",
            items: MediaTypes.map(item => ({ label: item, picked: responseMediaTypes?.includes(item) }))
        }).then(resp => {
            if (resp) {
                handleOptionChange(resp.map(item => item.label))
            }
        })
    };

    const handleResponsesChange = (response: R) => {
        onResponseChange(response);
    };

    const handleImportJSON = () => {
        rpcClient.getApiDesignerVisualizerRpcClient().importJSON().then(resp => {
            if (resp) {
                const schema: Schema = resp;
                const newResponse: R = {
                    ...response,
                    content: {
                        ...response.content,
                        [selectedMediaType]: {
                            schema
                        }
                    }
                };
                handleResponsesChange(newResponse);
            }
        })
    };
    const handleMediaTypeChange = (mediaType: M) => {
        const newResponse: R = {
            ...response,
            content: {
                ...response.content,
                [selectedMediaType]: mediaType
            }
        };
        handleResponsesChange(newResponse);
    }
    const handleDescriptionChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
        setDescription(evt.target.value);
        handleResponsesChange({ ...response, description: evt.target.value });
    };
    const allMediaTypes = response?.content && Object.keys(response?.content);

    useEffect(() => {
        setDescription(response?.description);
    }, [response?.description]);

    return (
        <SubSectionWrapper>
            <CodeTextArea
                value={description}
                onChange={handleDescriptionChange}
                resize="vertical"
                growRange={{ start: 2, offset: 10 }}
            />
            <Headers
                headers={response?.headers}
                onHeadersChange={(headers) => handleResponsesChange({ ...response, headers })}
                title='Headers'
            />
            <SectionHeader
                title="Body"
                variant='h3'
                actionButtons={
                    <>
                        {allMediaTypes?.length > 0 && (
                            <>
                                <Button tooltip='Import from JSON' onClick={handleImportJSON} appearance='icon'>
                                    <Codicon name='arrow-circle-down' sx={{ marginRight: "4px" }} /> Import JSON
                                </Button>
                                <Dropdown
                                    id="media-type-dropdown"
                                    value={selectedMediaType}
                                    items={allMediaTypes?.map(mediaType => ({ label: mediaType, value: mediaType }))}
                                    onValueChange={(value) => setSelectedMediaType(value)}
                                />
                            </>
                        )}
                        <Button tooltip='Configure Content Types' onClick={handleConfigureClick} appearance='icon'>
                            <Codicon name='gear' sx={{ marginRight: "4px" }} /> Configure
                        </Button>
                    </>
                }
            />
            {selectedMediaType && response?.content && (
                <MediaType
                    mediaType={response?.content[selectedMediaType]}
                    onMediaTypeChange={handleMediaTypeChange}
                    key={selectedMediaType}
                />
            )}
        </SubSectionWrapper>
    )
}
