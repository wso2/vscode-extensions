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

import React, { Dispatch, ReactNode, SetStateAction } from "react";
import { Range } from '@wso2/mi-syntax-tree/lib/src';
import { ExpressionFieldValue } from "../Form/ExpressionField/ExpressionInput";
import { NodeLinkModel } from "../NodeLink/NodeLinkModel";
import { MediatorNodeModel } from "../nodes/MediatorNode/MediatorNodeModel";
import { PlusNodeModel } from "../nodes/PlusNode/PlusNodeModel";

export interface SidePanelPage {
    content: ReactNode;
    isOpen: boolean;
    title?: string;
    icon?: string | ReactNode;
}

interface SidePanelContext {
    // Mediator related
    isOpen: boolean;
    isEditing: boolean;
    nodeRange?: Range;
    trailingSpace?: string;
    operationName?: string;
    node?: MediatorNodeModel | NodeLinkModel | PlusNodeModel;
    parentNode?: string;
    previousNode?: string;
    nextNode?: string;
    formValues?: { [key: string]: any };
    inputOutput?:any;
    tag?: string;
    isFormOpen?: boolean;
    isTryoutOpen?: boolean;
    connectors?: any[];
    expressionEditor?: {
        isOpen: boolean;
        value: ExpressionFieldValue;
        setValue: (value: ExpressionFieldValue) => void;
    };
    pageStack: SidePanelPage[];
    setSidePanelState?: Dispatch<SetStateAction<any>>;
    newDataMapperName?: string;
    alertMessage?: string;
}

const SidePanelContext = React.createContext<SidePanelContext>({
    isOpen: false,
    isEditing: false,
    expressionEditor: {
        isOpen: false,
        value: undefined,
        setValue: () => { },
    },
    pageStack: [],
})

export const DefaultSidePanelState: SidePanelContext = {
    // Mediator related
    isOpen: false,
    isEditing: false,
    formValues: {},
    node: undefined,
    nodeRange: undefined,
    trailingSpace: undefined,
    isFormOpen: false,
    pageStack: [],
};

export function clearSidePanelState(sidePanelContext: SidePanelContext) {
    const state = structuredClone(DefaultSidePanelState);
    if (sidePanelContext?.setSidePanelState) sidePanelContext.setSidePanelState({ ...state, setSidePanelState: sidePanelContext.setSidePanelState });
}

export const SidePanelProvider = SidePanelContext.Provider
export default SidePanelContext
