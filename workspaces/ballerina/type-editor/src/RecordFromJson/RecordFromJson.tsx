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

import React, { useState } from 'react';
import { Button, SidePanelBody, TextArea, Typography } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { FileSelect } from '../style';
import { FileSelector } from '../components/FileSelector';
import { BallerinaRpcClient } from '@wso2/ballerina-rpc-client';
import { JsonToTypeResponse, Type } from '@wso2/ballerina-core';
import { set } from 'lodash';

interface RecordFromJsonProps {
    name: string;
    onImport: (types: Type[]) => void;
    isTypeNameValid: boolean;
    rpcClient: BallerinaRpcClient;
    isSaving: boolean;
    setIsSaving: (isSaving: boolean) => void;
}

namespace S {
    export const Container = styled(SidePanelBody)`
        display: flex;
        flex-direction: column;
        gap: 20px;
    `;

    export const Footer = styled.div<{}>`
        display: flex;
        gap: 8px;
        flex-direction: row;
        justify-content: flex-end;
        align-items: center;
        margin-top: 8px;
        width: 100%;
    `;
}

export const RecordFromJson = (props: RecordFromJsonProps) => {
    const { name, onImport, rpcClient, isTypeNameValid, isSaving, setIsSaving } = props;
    const [json, setJson] = useState<string>("");
    const [error, setError] = useState<string>("");

    const validateJson = (jsonString: string) => {
        try {
            if (jsonString.trim() === "") {
                setError("");
                return;
            }
            JSON.parse(jsonString);
            setError("");
        } catch (e) {
            setError("Invalid JSON format");
        }
    };

    const onJsonChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newJson = event.target.value;
        setJson(newJson);
        validateJson(newJson);
    }

    const onJsonUpload = (json: string) => {
        setJson(json);
        validateJson(json);
    }

    const importJsonAsRecord = async () => {
        setIsSaving(true);
        setError("");

        try {
            const typesFromJson: JsonToTypeResponse = await rpcClient.getBIDiagramRpcClient().getTypeFromJson({
                jsonString: json,
                typeName: name
            });

            //  find the record with the name
            const record = typesFromJson.types.find((t) => t.type.name === name);
            // if there are other records than the matching name, get the types
            const otherRecords = typesFromJson.types
                .filter((t) => t.type.name !== name)
                .map((t) => t.type);


            if (otherRecords.length > 0) {
                await rpcClient.getBIDiagramRpcClient().updateTypes({
                    filePath: 'types.bal',
                    types: otherRecords
                });
            }

            if (record) {
                onImport([record.type]);
            }
        } catch (err) {
            setError("Could not import JSON as type.");
            console.error("Error importing JSON as type:", err);
            setIsSaving(false);
        }
    }

    return (
        <>
            <FileSelect>
                <FileSelector label="Select JSON file" extension="json" onReadFile={onJsonUpload} />
            </FileSelect>
            <TextArea
                rows={15}
                value={json}
                onChange={onJsonChange}
                errorMsg={error}
                placeholder="Paste your JSON here..."
            />
            <S.Footer>
                <Button onClick={importJsonAsRecord} disabled={!!error || !json.trim() || !isTypeNameValid || isSaving}>
                    {isSaving ? <Typography variant="progress">Importing...</Typography> : "Import"}
                </Button>
            </S.Footer>
        </>
    );
};
