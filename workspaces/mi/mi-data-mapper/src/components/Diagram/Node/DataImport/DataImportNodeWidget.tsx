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
import React from "react";

import { useDMIOConfigPanelStore } from "../../../../store/store";
import { Codicon } from "@wso2/ui-toolkit";
import { Label } from "../../OverriddenLinkLayer/LabelWidget";
import { IOType } from "@wso2/mi-core";
import styled from "@emotion/styled";
import { IO_NODE_DEFAULT_WIDTH } from "../../utils/constants";
import { useShallow } from "zustand/react/shallow";

const DataImportContainer = styled.div`
    align-items: flex-start;
    background: var(--vscode-sideBar-background);
    border: 1px solid var(--vscode-welcomePage-tileBorder);
    width: ${IO_NODE_DEFAULT_WIDTH}px;
    cursor: pointer;
`;

export interface DataImportNodeWidgetProps {
    configName: string;
    ioType: IOType;
}

export function DataImportNodeWidget(props: DataImportNodeWidgetProps) {
    const { ioType } = props;

    const { setIsIOConfigPanelOpen, setIOConfigPanelType, setIsSchemaOverridden } = useDMIOConfigPanelStore(
        useShallow(state => ({
            setIsIOConfigPanelOpen: state.setIsIOConfigPanelOpen,
            setIOConfigPanelType: state.setIOConfigPanelType,
            setIsSchemaOverridden: state.setIsSchemaOverridden
        }))
    );

    const handleOnClick = () => {
        setIsIOConfigPanelOpen(true);
        setIOConfigPanelType(ioType);
        setIsSchemaOverridden(false);
    };

    return (
        <DataImportContainer onClick={handleOnClick} data-testid={`${ioType}-data-import-node`}>
            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', backgroundColor: 'var(--vscode-activityBarTop.activeForeground' }}>
            <div style={{padding: '100px', justifyContent: 'space-between'}}>
                <Codicon sx={{ margin: 5, zoom: 5}}  name="new-file" />
                <Label style={{fontSize:15}}>Import {ioType} schema</Label>
            </div>
            </div>
        </DataImportContainer>
    );
}
