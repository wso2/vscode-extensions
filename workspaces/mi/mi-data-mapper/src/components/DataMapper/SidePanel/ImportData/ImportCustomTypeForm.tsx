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

import React, { Dispatch, SetStateAction, useMemo, useState } from "react";
import {
    Button,
    SidePanelTitleContainer,
    SidePanelBody,
    Codicon
} from "@wso2/ui-toolkit";
import { useVisualizerContext } from '@wso2/mi-rpc-client';

import { useDMSubMappingConfigPanelStore } from "../../../../store/store";
import { ImportDataButtons } from "./ImportDataButtons";
import { ImportCustomTypePanel } from "./ImportCustomTypePanel";
import { FunctionDeclaration } from "ts-morph";
import { IOType } from "@wso2/mi-core";
import { useShallow } from "zustand/react/shallow";

export interface ImportType {
    type: string;
    label: string;
}

export enum FileExtension {
    JSON = ".json",
    XML = ".xml",
    CSV = ".csv",
    XSD = ".xsd"
}

export type ImportCustomTypeFormProps = {
    functionST: FunctionDeclaration;
    configName: string;
    documentUri: string;
    setIsImportCustomTypeFormOpen: Dispatch<SetStateAction<boolean>>;
};

export function ImportCustomTypeForm(props: ImportCustomTypeFormProps) {
    const { functionST, configName, documentUri, setIsImportCustomTypeFormOpen } = props;
    const { rpcClient } = useVisualizerContext();

    const [selectedImportType, setSelectedImportType] = useState<ImportType>(undefined);

    const { resetSubMappingConfig, subMappingConfigFromData, setSubMappingConfigFormData } = useDMSubMappingConfigPanelStore(
        useShallow(
            state => ({
                subMappingConfig: state.subMappingConfig,
                setSubMappingConfig: state.setSubMappingConfig,
                resetSubMappingConfig: state.resetSubMappingConfig,
                subMappingConfigFromData: state.subMappingConfigFormData,
                setSubMappingConfigFormData: state.setSubMappingConfigFormData
            })
        )
    );

    const fileExtension = useMemo(() => {
        if (!selectedImportType) return undefined;

        switch (selectedImportType.type) {
            case 'JSON':
                return FileExtension.JSON;
            case 'CSV':
                return FileExtension.CSV;
            case 'XML':
                return FileExtension.XML;
            case 'JSONSCHEMA':
                return FileExtension.JSON;
            case 'XSD':
                return FileExtension.XSD;
        }
    }, [selectedImportType]);


    const loadSchema = async (typeName: string, content: string) => {
        const request = {
            documentUri: documentUri,
            overwriteSchema: false,
            content: content,
            ioType: IOType.Other,
            schemaType: selectedImportType.type.toLowerCase(),
            configName: configName,
            typeName: typeName
        }
        await rpcClient.getMiDataMapperRpcClient().browseSchema(request).then(response => {
            setSelectedImportType(undefined);
            setIsImportCustomTypeFormOpen(false);
            setSubMappingConfigFormData({ ...subMappingConfigFromData, mappingType: typeName })
            if (!response.success) {
                console.error("Error while importing schema");
            }
        }).catch(e => {
            console.error("Error while importing schema", e);
        });
    };

    const handleFileUpload = (typeName: string, text: string) => {
        loadSchema(typeName, text);
    };

    const onClose = () => {
        setSelectedImportType(undefined);
        setIsImportCustomTypeFormOpen(false);
        resetSubMappingConfig();
    };

    const onBack = () => {
        if (!selectedImportType) {
            setIsImportCustomTypeFormOpen(false);
        }
        setSelectedImportType(undefined);
    };

    const handleImportTypeChange = (importType: ImportType) => {
        setSelectedImportType(importType);
    };

    return (
        <>
            <SidePanelTitleContainer>
                <Button
                    onClick={onBack}
                    appearance="icon"
                >
                    <Codicon name="arrow-left" />
                </Button>
                <span style={{ padding: 10 }}>Import custom data type</span>
                <Button
                    sx={{ marginLeft: "auto" }}
                    onClick={onClose}
                    appearance="icon"
                >
                    <Codicon name="close" />
                </Button>
            </SidePanelTitleContainer>
            <SidePanelBody>
                {!selectedImportType && <ImportDataButtons onImportTypeChange={handleImportTypeChange} />}
                {selectedImportType && (
                    <ImportCustomTypePanel
                        functionST={functionST}
                        importType={selectedImportType}
                        extension={fileExtension}
                        rowRange={{ start: 15, offset: 10 }}
                        onSave={handleFileUpload}
                    />
                )}
            </SidePanelBody>
        </>
    );
}
