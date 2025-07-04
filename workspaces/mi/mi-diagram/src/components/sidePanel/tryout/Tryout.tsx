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

import React, { useEffect } from 'react';
import { Button, ProgressIndicator, Typography, FormGroup, ErrorBanner, TextArea, Dropdown, ProgressRing, Tooltip, Icon, Alert } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { CodeTextArea } from '../../Form/CodeTextArea';
import ReactJson, { InteractionProps } from 'react-json-view';
import { DiagramService, Range } from '@wso2/mi-syntax-tree/lib/src';
import { Header, MediatorProperties, MediatorTryOutInfo, Params } from '@wso2/mi-core';
import { ERROR_MESSAGES, REACT_JSON_THEME } from '../../../resources/constants';
import { getParamManagerValues } from '../../..';
import { SetPayloads } from './SetPayloads';

const TryoutContainer = styled.div`
    width: 100%;
`;
const Section = styled.div`
   margin-bottom: 12px;
`;
const PropertiesContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

interface TryoutProps {
    documentUri: string;
    nodeRange?: Range;
    mediatorType: string;
    getValues: any;
    isActive: boolean;
    artifactModel: DiagramService;
    isTryoutSupported: boolean;
}

export function TryOutView(props: TryoutProps) {
    const { documentUri, nodeRange, artifactModel, isTryoutSupported } = props;
    const { rpcClient, setIsLoading: setDiagramLoading } = useVisualizerContext();
    const [isLoading, setIsLoading] = React.useState(true);
    const [isTryOutInputLoading, setIsTryOutInputLoading] = React.useState(true);
    const [isTryOutLoading, setIsTryOutLoading] = React.useState(false);
    const [tryOutError, setTryOutError] = React.useState<string | null>(null);
    const [mediatorInput, setMediatorInput] = React.useState<MediatorTryOutInfo>(undefined);
    const [mediatorOutput, setMediatorOutput] = React.useState<MediatorTryOutInfo>(undefined);
    const [inputPayloads, setInputPayloads] = React.useState([]);
    const [selectedPayload, setSelectedPayload] = React.useState<any>();
    const [tryoutId, setTryoutId] = React.useState<string>();

    // State to manage the expanded/collapsed state of each section
    const [isInputExpanded, setIsInputExpanded] = React.useState({
        properties: false,
        headers: false,
        params: false,
        variables: false,
        miscellaneous: false,
    });

    const [isOutputExpanded, setIsOutputExpanded] = React.useState({
        properties: false,
        headers: false,
        params: false,
        variables: false,
        miscellaneous: false,
    });

    useEffect(() => {
        if (!props.isActive) {
            return;
        }
        const fetchMediatorDetails = async () => {
            await getRequestPayloads();
            setIsLoading(false);
        };
        fetchMediatorDetails();
    }, [props]);

    useEffect(() => {
        if (selectedPayload) {
            getInputData();
        }
    }, [selectedPayload]);

    const getEdits = () => {
        const values = props.getValues();
        for (const key in values) {
            if (values[key]?.paramValues) {
                values[key] = getParamManagerValues(values[key]);
            }
        }
        return values;
    }

    const getRequestPayloads = async () => {
        try {
            const { payloads, defaultPayload } = await rpcClient.getMiDiagramRpcClient().getInputPayloads({ documentUri, artifactModel });
            if (!Array.isArray(payloads)) {
                setInputPayloads([{ name: 'Default', content: JSON.stringify(payloads) }]);
                setSelectedPayload('Default');
            } else {
                setInputPayloads(payloads);
                setSelectedPayload(defaultPayload);
            }
        } catch (error) {
            console.error("Error fetching input payload:", error);
        }
    }

    const getInputData = async () => {
        try {
            setIsTryOutInputLoading(true);
            setTryOutError(null);
            setMediatorInput(undefined);
            setMediatorOutput(undefined);
            setTryoutId(undefined);
            if (!nodeRange) {
                setIsLoading(false);
                return;
            }

            const inputPayload = inputPayloads.find((payload) => payload.name === selectedPayload);
            const res = await rpcClient.getMiDiagramRpcClient().tryOutMediator({
                tryoutId,
                file: documentUri,
                line: nodeRange.start.line,
                column: nodeRange.start.character + 1,
                isServerLess: false,
                contentType: inputPayload?.contentType ?? 'text/plain',
                inputPayload: inputPayload?.contentType == 'application/json' ? JSON.stringify(inputPayload?.content) : inputPayload?.content,
                queryParams: inputPayload.queryParams && typeof inputPayload.queryParams === 'object'
                    ? Object.keys(inputPayload.queryParams).map((key: string) => ({
                        key: key,
                        value: (inputPayload.queryParams as Record<string, any>)[key]
                    }))
                    : [],
                pathParams: inputPayload.pathParams && typeof inputPayload.pathParams === 'object'
                    ? Object.keys(inputPayload.pathParams).map((key: string) => ({
                        key: key,
                        value: (inputPayload.pathParams as Record<string, any>)[key]
                    }))
                    : [],
                mediatorType: props.mediatorType,
                edits: []
            });

            if (res.error) {
                setTryOutError(typeof res.error === 'string' ? res.error : ERROR_MESSAGES.ERROR_TRYING_OUT_MEDIATOR);
                console.error("Error trying out mediator:", res.error);
            } else {
                setMediatorInput(res.input);
                setTryoutId(res.id);
            }
        } catch (error) {
            console.error("Error fetching mediator input/output schema:", error);
        } finally {
            setIsTryOutInputLoading(false);
        }
    }

    const onTryOut = async () => {
        try {
            setIsTryOutLoading(true);
            setTryOutError(null);
            setMediatorOutput(undefined);

            const input = inputPayloads.find((payload) => payload.name === selectedPayload);
            const res = await rpcClient.getMiDiagramRpcClient().tryOutMediator({
                tryoutId,
                file: documentUri,
                line: nodeRange.start.line,
                column: nodeRange.start.character + 1,
                isServerLess: false,
                inputPayload: JSON.stringify(input?.content),
                contentType: input?.contentType ?? 'text/plain',
                mediatorInfo: mediatorInput
            });

            if (res.error) {
                setTryOutError(typeof res.error === 'string' ? res.error : ERROR_MESSAGES.ERROR_TRYING_OUT_MEDIATOR);
                console.error("Error trying out mediator:", res.error);
            } else {
                setMediatorOutput(res.output);
            }
        } catch (error) {
            console.error("Error during try out:", error);
        } finally {
            setIsTryOutLoading(false);
        }
    }

    if (isLoading) {
        return (
            <TryoutContainer>
                <ProgressIndicator />
            </TryoutContainer>
        );
    } else if ((!mediatorInput || !mediatorInput.properties) && (inputPayloads === undefined)) {
        return (
            <TryoutContainer>
                <ErrorBanner errorMsg={ERROR_MESSAGES.ERROR_LOADING_TRYOUT} />
            </TryoutContainer>
        )
    } else if (!nodeRange) {
        return (
            <SetPayloads documentUri={documentUri} artifactModel={artifactModel} />
        );
    } else if (!isTryoutSupported) {
        return (<Typography variant="body2" sx={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Icon name="warning" isCodicon /> Try-Out feature is not supported for this artifact type.
        </Typography>)
    }

    const helpTipElement =
        (<Tooltip
            content={"Select a request to try out the mediator. Select start node to add new requests."}
            position='right'
        >
            <Icon name="question" isCodicon iconSx={{ fontSize: '18px' }} sx={{ marginLeft: '5px', cursor: 'help' }} />
        </Tooltip>);

    const Header = (
        <>
            <Typography
                sx={{ padding: "10px", marginBottom: "10px", borderBottom: "1px solid var(--vscode-editorWidget-border)" }}
                variant="body3">
                {`Try the request flow up to this mediator`}
            </Typography>
            <Alert subTitle="All mediators up to this point are re-executed each time you change the request payload or click on the 'Run' button." />
        </>
    );

    if (inputPayloads.length === 0) {
        return (
            <TryoutContainer>
                {Header}
                <Typography variant="body2" sx={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <Icon name="warning" isCodicon /> No requests available to try out the mediator. Select start node to add a request.
                </Typography>
            </TryoutContainer>
        );
    };

    return (
        <TryoutContainer>
            {Header}

            <Section>
                <Dropdown
                    id="request"
                    label="Select a request to try out"
                    labelAdornment={helpTipElement}
                    disabled={isTryOutInputLoading || isTryOutLoading}
                    items={inputPayloads.map((payload) => { return { value: payload.name } })}
                    value={selectedPayload}
                    onChange={(e) => {
                        setSelectedPayload(e.target.value);
                    }}
                />

                {isTryOutInputLoading &&
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginTop: '20px' }}>
                        <ProgressRing />
                        <Typography variant="body3" sx={{ marginTop: '10px' }}>
                            Loading data. This may take a while...
                        </Typography>
                    </div>
                }
                {mediatorInput &&
                    <>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="h2">Mediator Input</Typography>
                        </div>
                        <div>
                            <MediatorDetails
                                data={mediatorInput}
                                setMediatorInfo={setMediatorInput}
                                isExpanded={isInputExpanded}
                                setIsExpanded={setIsInputExpanded}
                                isEditable={true}
                            />
                        </div>
                        <Button onClick={onTryOut} sx={{ marginTop: "10px", marginLeft: "auto" }} disabled={isTryOutLoading}>
                            {isTryOutLoading ? 'Running...' : 'Run'}
                        </Button>
                    </>
                }
            </Section>
            <hr style={{ width: "100%", border: "none", borderTop: "1px solid var(--vscode-editorWidget-border)", margin: "20px 0" }} />

            {tryOutError && <ErrorBanner errorMsg={tryOutError} />}
            {mediatorOutput && mediatorOutput.properties.synapse && <Section>
                <Typography variant="h2">Mediator Output</Typography>
                {mediatorOutput && <MediatorDetails
                    data={mediatorOutput}
                    setMediatorInfo={setMediatorOutput}
                    isExpanded={isOutputExpanded}
                    setIsExpanded={setIsOutputExpanded}
                    isEditable={false}
                />}
            </Section>}
        </TryoutContainer>
    );
};

const MediatorDetails = ({ data, setMediatorInfo, isExpanded, setIsExpanded, isEditable }: { data: MediatorTryOutInfo, setMediatorInfo: React.Dispatch<React.SetStateAction<MediatorTryOutInfo>>, isExpanded: any, setIsExpanded: any, isEditable: boolean }) => {
    const handleEdit = (type: string, edit: any, key?: string) => {
        if (!isEditable) return; // Prevent editing if not editable
        setMediatorInfo((prev) => {
            const updated = { ...prev };
            if (key !== undefined) {
                (updated as any)[type][key] = edit.updated_src;
            } else {
                (updated as any)[type] = edit.updated_src;
            }
            return updated;
        });
    }
    const toggleExpanded = (type: any, collapsed: boolean) => {
        setIsExpanded((prev: any) => {
            return {
                ...prev,
                [type]: !collapsed
            }
        });
    }

    const Payload = ({ payload }: { payload: string }) => (
        <FormGroup title='Payload' isCollapsed={!isExpanded.payload} onToggle={(collapsed) => toggleExpanded('payload', collapsed)}>
            {isEditable &&
                <CodeTextArea
                    name="Payload"
                    label='Payload'
                    rows={5}
                    value={payload}
                    onChange={(e) => handleEdit('payload', { updated_src: e.target.value })}
                />}
            {!isEditable && <TextArea name="Payload" label='Payload' value={payload} rows={5} readOnly />}
        </FormGroup>
    );

    const Properties = ({ properties }: { properties: MediatorProperties }) => (
        <FormGroup title='Properties' isCollapsed={!isExpanded.properties} onToggle={(collapsed) => toggleExpanded('properties', collapsed)}>
            <PropertiesContainer>
                {['synapse', 'axis2', 'axis2Client', 'axis2Transport', 'axis2Operation'].map((key) => (
                    <ReactJson
                        key={key}
                        sortKeys
                        name={`${key.charAt(0).toUpperCase() + key.slice(1)} Properties`}
                        src={(properties as any)?.[key]}
                        theme={REACT_JSON_THEME}
                        onEdit={isEditable ? (edit: InteractionProps) => handleEdit('properties', edit, key) : undefined}
                    />
                ))}
            </PropertiesContainer>
        </FormGroup>
    );

    const Headers = ({ headers }: { headers: Header[] }) => (
        <FormGroup title='Headers' isCollapsed={!isExpanded.headers} onToggle={(collapsed) => toggleExpanded('headers', collapsed)}>
            <PropertiesContainer>
                <ReactJson
                    sortKeys
                    name={false}
                    src={headers}
                    theme={REACT_JSON_THEME}
                    onEdit={isEditable ? (edit: InteractionProps) => handleEdit('headers', edit) : undefined}
                />
            </PropertiesContainer>
        </FormGroup>
    );

    const Params = ({ params }: { params: Params }) => (
        <FormGroup title='Params' isCollapsed={!isExpanded.params} onToggle={(collapsed) => toggleExpanded('params', collapsed)}>
            <PropertiesContainer>
                {['functionParams', 'queryParams', 'pathParams'].map((key) => (
                    <ReactJson
                        sortKeys
                        name={key.charAt(0).toUpperCase() + key.slice(1)}
                        src={(params as any)?.[key]}
                        theme={REACT_JSON_THEME}
                        onEdit={isEditable ? (edit: InteractionProps) => handleEdit('params', edit, key) : undefined}
                    />
                ))}
            </PropertiesContainer>
        </FormGroup>
    );

    const Variables = ({ variables }: { variables: any }) => (
        <FormGroup title='Variables' isCollapsed={!isExpanded.variables} onToggle={(collapsed) => toggleExpanded('variables', collapsed)}>
            <PropertiesContainer>
                <ReactJson
                    sortKeys
                    name={false}
                    src={variables}
                    theme={REACT_JSON_THEME}
                    onEdit={isEditable ? (edit: InteractionProps) => handleEdit('variables', edit) : undefined}
                />
            </PropertiesContainer>
        </FormGroup>
    );

    return (
        <>
            {Payload({ payload: data.payload })}
            <Headers headers={data.headers} />
            <Variables variables={data.variables} />

            <FormGroup title='Miscellaneous' isCollapsed={!isExpanded.miscellaneous} onToggle={(collapsed) => toggleExpanded('miscellaneous', collapsed)}>
                <Properties properties={data.properties} />
                <Params params={data.params} />
            </FormGroup>
        </>
    );
}

export default TryOutView; 
