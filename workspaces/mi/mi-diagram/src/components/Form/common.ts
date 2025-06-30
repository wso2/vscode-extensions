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

import { MACHINE_VIEW, POPUP_EVENT_TYPE, ParentPopupData } from '@wso2/mi-core';
import { RpcClient } from '@wso2/mi-rpc-client';
import { Range } from '@wso2/mi-syntax-tree/lib/src';
import { ExpressionFieldValue, ParamConfig, ParamField, ParamValue } from '.';
import { generateSpaceSeperatedStringFromParamValues } from '../../utils/commons';

export interface AddMediatorProps {
    nodePosition: Range;
    trailingSpace: string;
    documentUri: string;
    endpoint?: string;
}

export function filterFormValues(formValues: { [key: string]: any }, keysToInclude: string[], keysToExclude: string[]): { [key: string]: any } {
    if (keysToInclude && keysToInclude.length > 0) {
        Object.keys(formValues).forEach(key => {
            if (!keysToInclude.includes(key)) {
                delete formValues[key];
            }
        });
    }
    if (keysToExclude && keysToExclude.length > 0) {
        Object.keys(formValues).forEach(key => {
            if (keysToExclude.includes(key)) {
                delete formValues[key];
            }
        });
    }
    return formValues;
}

export const openPopup = (rpcClient: RpcClient, view: string, fetchItems: any, setValue: any, documentUri?: string, customProps?: any, sidePanelContext?: any) => {
    switch (view) {
        case "endpoint":
            rpcClient.getMiVisualizerRpcClient().openView({ type: POPUP_EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.EndPointForm }, isPopup: true });
            break;
        case "sequence":
            rpcClient.getMiVisualizerRpcClient().openView({ type: POPUP_EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.SequenceForm }, isPopup: true });
            break;
        case "datasource":
            rpcClient.getMiVisualizerRpcClient().openView({ type: POPUP_EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.DataSourceForm, documentUri: documentUri, customProps }, isPopup: true });
            break;
        case "dataService":
            rpcClient.getMiVisualizerRpcClient().openView({ type: POPUP_EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.DataServiceForm, documentUri: documentUri, customProps }, isPopup: true });
            break;
        case "addDriver":
            rpcClient.getMiVisualizerRpcClient().openView({ type: POPUP_EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.AddDriverPopup, documentUri: documentUri, customProps }, isPopup: true });
            break;
        case "addResource":
            rpcClient.getMiVisualizerRpcClient().openView({ type: POPUP_EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.RegistryResourceForm, documentUri: documentUri, customProps }, isPopup: true });
            break;
        case "sequenceTemplate":
            rpcClient.getMiVisualizerRpcClient().openView({ type: POPUP_EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.SequenceTemplateView, documentUri: documentUri, customProps }, isPopup: true });
            break;
        case "dataMapper":
            rpcClient.getMiVisualizerRpcClient().openView({ type: POPUP_EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.DatamapperForm, documentUri: documentUri, customProps }, isPopup: true });
            break;
        case "messageStore":
            rpcClient.getMiVisualizerRpcClient().openView({ type: POPUP_EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.MessageStoreForm, documentUri: documentUri, customProps }, isPopup: true });
            break;
        case "connection":
            rpcClient.getMiVisualizerRpcClient().openView({ type: POPUP_EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.ConnectorStore, documentUri: documentUri, customProps }, isPopup: true });
            break;
        default:
            return;
    }

    rpcClient.onParentPopupSubmitted((data: ParentPopupData) => {
        if (data.recentIdentifier) {
            fetchItems();
            setValue(data.recentIdentifier);
            sidePanelContext.setSidePanelState({
                ...sidePanelContext,
                newDataMapperName: data.recentIdentifier
            });
        }
    });
}

export const getParamManagerValues = (paramManager: ParamConfig, withAdditionalData: boolean = false): any[] => {
    return paramManager.paramValues.map((param: any) => param.paramValues.map((p: any) => {
        if (p?.value?.paramValues) {
            return getParamManagerValues(p.value, withAdditionalData);
        }
        if (withAdditionalData) {
            return { value: p.value, additionalData: p.additionalData };
        }
        return p.value;
    }));
}

export const getParamManagerFromValues = (values: any[], keyIndex?: number, valueIndex: number = 1): any => {

    if (!values) {
        return [];
    }

    values = typeof values?.[0] === 'object' && !values?.[0]?.additionalData ? values.map((v: any) => Object.values(v)) : values;
    const getParamValues = (value: any): any => {
        return value.map((v: any) => {
            let additionalData
            if (v?.additionalData) {
                additionalData = v.additionalData;
                v = v.value;
            }
            if (v instanceof Array) {
                return {
                    value: {
                        paramValues: getParamManagerFromValues(v)
                    }
                }
            }
            return { value: v, additionalData };
        });
    }

    const paramValues = values.map((value: any, index: number) => {

        if (typeof value === 'object' && value !== null) {
            const paramValues = getParamValues(value);
            return {
                id: index,
                key: keyIndex != undefined && keyIndex >= 0 ? typeof value[keyIndex] === 'object' ? value[keyIndex].value : value[keyIndex] : index + 1,
                value: typeof value[valueIndex] === 'object' ? value[valueIndex].value : value[valueIndex],
                icon: 'query', paramValues
            };
        } else {
            return { value };
        }
    });
    return paramValues;
}

export const getParamManagerOnChange = (element: any, values: ParamConfig) => {
    return values.paramValues.map((param: any, index: number) => {
        const paramFields = values.paramFields;
        const paramValues: ParamValue[] = param.paramValues;
        param.key = getParamManagerKeyOrValue(element.elements, element.tableKey, paramFields, paramValues) || index + 1;
        param.value = getParamManagerKeyOrValue(element.elements, element.tableValue, paramFields, paramValues) || '';
        param.icon = 'query';;

        paramValues.forEach((value: any, index: number) => {
            if (value?.value?.paramValues) {
                const elements = element?.elements[index]?.value;
                value.value.paramValues = getParamManagerOnChange(elements, value.value);
            }
        });

        return param;
    });
}

const getParamManagerKeyOrValue = (elements: any, key: string, fields: ParamField[], values: ParamValue[]) => {
    const keyIndex = elements?.findIndex((field: any) => field?.value?.name === key);
    if (keyIndex === undefined || !fields || keyIndex === -1 || keyIndex >= fields.length) {
        return 0;
    }
    if (fields[keyIndex].type === 'ParamManager') {
        return generateSpaceSeperatedStringFromParamValues(values[keyIndex].value as ParamConfig);
    } else if (fields[keyIndex].type === 'ExprField') {
        return (values[keyIndex].value as ExpressionFieldValue).value;
    }

    return values[keyIndex].value ?? '';
}

export const deriveDefaultValue = (connectorName: string, connectorOperation: string): string => {
    const randomNum = Math.floor(Math.random() * 1000);
    return `${connectorName}_${connectorOperation}_${randomNum}`;
}
