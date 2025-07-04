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
// tslint:disable: jsx-no-multiline-js
import React from 'react';

import { TypeKind } from '@wso2/mi-core';
import { Codicon, Item, Menu, MenuItem } from '@wso2/ui-toolkit';
import { css } from '@emotion/css';

import { InputOutputPortModel, MappingType, ValueType } from '../Port';
import { genArrayElementAccessSuffix, getValueType } from '../utils/common-utils';
import { generateArrayMapFunction } from '../utils/link-utils';
import { DataMapperLinkModel } from '../Link';
import { buildInputAccessExpr, createSourceForMapping, mapUsingCustomFunction, updateExistingValue } from '../utils/modification-utils';
import { ExpressionLabelModel } from './ExpressionLabelModel';
import { expandArrayFn } from '../utils/common-utils';

export const useStyles = () => ({
    arrayMappingMenu: css({
        pointerEvents: 'auto'
    }),
    itemContainer: css({
        display: 'flex',
        width: '100%',
        alignItems: 'center'
    }),
});

const a2aMenuStyles = {
    backgroundColor: "var(--vscode-quickInput-background)",
    boxShadow: "none",
    padding: "0px",
    border: "1px solid var(--vscode-debugIcon-breakpointDisabledForeground)"
};

const codiconStyles = {
    color: 'var(--vscode-editorLightBulb-foreground)',
    marginRight: '10px'
}

export interface ArrayMappingOptionsWidgetProps {
    model: ExpressionLabelModel;
}

export function ArrayMappingOptionsWidget(props: ArrayMappingOptionsWidgetProps) {
    const classes = useStyles();
    const { link, pendingMappingType, context } = props.model;

    const sourcePort = link.getSourcePort() as InputOutputPortModel;
    const targetPort = link?.getTargetPort() as InputOutputPortModel;
    const valueType = getValueType(targetPort);

    const isValueModifiable = valueType === ValueType.Default
        || valueType === ValueType.NonEmpty;
    
    const onClickMapArrays = async () => {
        if (isValueModifiable) {
            await updateExistingValue(sourcePort, targetPort);
        } else {
            await createSourceForMapping(sourcePort, targetPort);
        }
    }

    const onClickMapIndividualElements = async () => {
        if (targetPort instanceof InputOutputPortModel) {
            const targetPortField = targetPort.field;

            if (targetPortField.kind === TypeKind.Array && targetPortField?.memberType) {
                const inputAccessExpr = buildInputAccessExpr((link.getSourcePort() as InputOutputPortModel).fieldFQN);
                let isSourceOptional = sourcePort instanceof InputOutputPortModel && sourcePort.field.optional;
                const mapFnSrc = generateArrayMapFunction(inputAccessExpr, targetPortField.memberType, isSourceOptional);

               expandArrayFn(sourcePort as InputOutputPortModel, targetPort as InputOutputPortModel, context);

                if (isValueModifiable) {
                    await updateExistingValue(sourcePort, targetPort, mapFnSrc);
                } else {
                    await createSourceForMapping(sourcePort, targetPort, mapFnSrc);
                }
            }
        }
    };

    const onClickMapArraysAccessSingleton = async () => {
        if (isValueModifiable) {
            await updateExistingValue(sourcePort, targetPort, undefined, genArrayElementAccessSuffix(sourcePort, targetPort));
        } else {
            await createSourceForMapping(sourcePort, targetPort, undefined, genArrayElementAccessSuffix(sourcePort, targetPort));
        }
    }

    const onClickMapUsingCustomFunction = async () => {
        await mapUsingCustomFunction(sourcePort, targetPort, context, isValueModifiable);
    };

    const getItemElement = (id: string, label: string) => {
        return (
            <div
                className={classes.itemContainer}
                key={id}
            >
                <Codicon name="lightbulb" sx={codiconStyles} />
                {label}
            </div>
        );
    }

    const a2aMenuItems: Item[] = [
        {
            id: "a2a-direct",
            label: getItemElement("a2a-direct", "Map Input Array to Output Array"),
            onClick: onClickMapArrays
        },
        {
            id: "a2a-inner",
            label: getItemElement("a2a-inner", "Map Array Elements Individually"),
            onClick: onClickMapIndividualElements
        }
    ];

    const a2sMenuItems: Item[] = [
        {
            id: "a2s-direct",
            label: getItemElement("a2s-direct", "Extract Single Element from Array"),
            onClick: onClickMapArraysAccessSingleton
        }
    ];

    const menuItems = pendingMappingType === MappingType.ArrayToArray ? a2aMenuItems : a2sMenuItems;

    menuItems.push({
        id: "a2a-a2s-func",
        label: getItemElement("a2a-a2s-func", "Map Using Custom Function"),
        onClick: onClickMapUsingCustomFunction
    });

    return (
        <div className={classes.arrayMappingMenu}>
            <Menu sx={a2aMenuStyles}>
                {menuItems.map((item: Item) =>
                    <MenuItem
                        key={`item ${item.id}`}
                        item={item}
                    />
                )}
            </Menu>
        </div>
    );
}
