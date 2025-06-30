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

import React, { forwardRef, useEffect, useState } from "react";
import { Range } from 'vscode-languageserver-types';
import { ComponentCard, RequiredFormInput, Typography } from "@wso2/ui-toolkit";
import ParameterManager, { Param } from "../GigaParamManager/ParameterManager";
import { Element, cardStyle } from "../FormGenerator";
import { FormTokenEditor } from "../FormTokenEditor";
import { SIDE_PANEL_WIDTH } from "../../../resources/constants";

interface StringWithParamManagerProps {
    element: Element;
    isRequired: boolean;
    helpTipElement: JSX.Element;
    field: any;
    errorMsg: string;
    nodeRange?: Range;
}

export const StringWithParamManagerComponent = forwardRef<HTMLDivElement, StringWithParamManagerProps>(
    (props, ref) => {
    const { element, isRequired, helpTipElement, field, errorMsg, nodeRange } = props;
    const [stringValue, setStringValue] = useState('');
    const [paramManagerParameters, setParamManagerParameters] = useState<Param[]>([]);

    useEffect(() => {
        field.onChange(stringValue);
    }, [stringValue]);

    useEffect(() => {
        if (field.value !== undefined) {
            setStringValue(field.value);
            const initialParamManagerParameters = generateParamManagerParameters(field.value, element.separatorPattern);
            setParamManagerParameters(initialParamManagerParameters);
        }
    }, []);

    const generateParamManagerParameters = (fieldValue: string, regex: string): Param[] => {
        const params: Param[] = [];
        const match = fieldValue.matchAll(new RegExp(regex, 'g'));
        for (const param of match) {
            const paramName = param[1]; 
            const paramValue = param[2]; 
            const isExpression = paramValue.startsWith('${') && paramValue.endsWith('}');

            params.push({
                propertyName: paramName, 
                propertyValue : { isExpression: isExpression, value: paramValue, namespaces: []}
            });
        }
        return params;
    }

    const paramManagerElement = {
        'displayName': element.displayName,
        'elements': [
            {'type': 'attribute', 'value': {'name': 'propertyName', 'displayName': 'Name', 'inputType': 'string', 'required': false}},
            {'type': 'attribute', 'value': {'name': 'propertyValue', 'displayName': 'Value', 'inputType': 'stringOrExpression', 'required': false}},
        ],
        'inputType': 'ParamManager',
        'name': element.name,
        'tableKey': 'propertyName',
        'tableValue': 'propertyValue',
        'helpTip': element.helpTip,
        'placeholder': element.placeholder,
        'required': isRequired,
        'addParamText': 'Add Query Parameter',
        'noDataText': 'No query parameters available',
    };

    return (<ComponentCard sx={cardStyle} disbaleHoverEffect>

        <FormTokenEditor
            sx={{ paddingTop: 20, fontSize: '1.17em',fontWeight: 'bold' }}
            editorSx={{ width: `${SIDE_PANEL_WIDTH - 106}px` }}
            nodeRange={nodeRange}
            value={stringValue}
            onChange={setStringValue}
            labelAdornment={helpTipElement}
            label={element.displayName}
            placeholder={element.placeholder}
            required={isRequired}
            errorMsg={errorMsg}
        />
        
        <ParameterManager
            formData={paramManagerElement}
            parameters={paramManagerParameters}
            setParameters={(params: Param[]) => {
                const separatorIndex = stringValue.indexOf(element.initialSeparator);
                let newStringValue = separatorIndex !== -1 ? stringValue.substring(0, separatorIndex) : stringValue;
                params.forEach(param => {
                    const separator = newStringValue.includes(element.initialSeparator) ? element.secondarySeparator : element.initialSeparator;
                    newStringValue += `${separator}${param['propertyName' as keyof Param]}${element.keyValueSeparator}${(param['propertyValue' as keyof Param] as any).value}`;
                });
                setStringValue(newStringValue);
                setParamManagerParameters([...params]);
                }
            }
            nodeRange={nodeRange}
        />
    </ComponentCard>);
}
);
