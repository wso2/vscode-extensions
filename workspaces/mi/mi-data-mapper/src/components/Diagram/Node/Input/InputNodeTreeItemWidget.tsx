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
// tslint:disable: jsx-no-multiline-js jsx-wrap-multiline
import React, { useState } from "react";

import { DiagramEngine } from "@projectstorm/react-diagrams-core";
import { Button, Codicon, Tooltip, TruncatedLabel } from "@wso2/ui-toolkit";
import { DMType, TypeKind } from "@wso2/mi-core";
import classnames from "classnames";

import { DataMapperPortWidget, PortState, InputOutputPortModel } from "../../Port";
import { InputSearchHighlight } from "../commons/Search";
import { useIONodesStyles } from "../../../styles";
import { useDMCollapsedFieldsStore } from '../../../../store/store';
import { getTypeName } from "../../utils/common-utils";
import { pad } from "lodash";
import { DATA_MAPPER_ARRAY_MAPPING_DOC_URL } from "../../utils/constants";


export interface InputNodeTreeItemWidgetProps {
    parentId: string;
    dmType: DMType;
    engine: DiagramEngine;
    getPort: (portId: string) => InputOutputPortModel;
    treeDepth?: number;
    hasHoveredParent?: boolean;
}

export function InputNodeTreeItemWidget(props: InputNodeTreeItemWidgetProps) {
    const { parentId, dmType, getPort, engine, treeDepth = 0, hasHoveredParent } = props;

    const [ portState, setPortState ] = useState<PortState>(PortState.Unselected);
    const [isHovered, setIsHovered] = useState(false);
    const collapsedFieldsStore = useDMCollapsedFieldsStore();

    const fieldName = dmType.fieldName;
    const typeName = getTypeName(dmType);
    const fieldId = `${parentId}.${fieldName}`;
    const portOut = getPort(`${fieldId}.OUT`);

    const classes = useIONodesStyles();

    let fields: DMType[];

    if (dmType.kind === TypeKind.Interface) {
        fields = dmType.fields;
    } else if (dmType.kind === TypeKind.Array) {
        fields = [{...dmType.memberType, fieldName: `<${dmType.fieldName}Item>`}];
    }

    let expanded = true;

    if (portOut && portOut.collapsed) {
        expanded = false;
    }

    const indentation = fields ? 0 : ((treeDepth + 1) * 16) + 8;

    const label = (
        <TruncatedLabel style={{ marginRight: "auto", opacity: (portOut && portOut.isPreview) ? 0.5 : 1 }}>
            <span className={classes.valueLabel} style={{ marginLeft: indentation }}>
                <InputSearchHighlight>{fieldName}</InputSearchHighlight>
                {dmType.optional && "?"}
                {typeName && ":"}
            </span>
            {typeName && (
                <span className={classes.inputTypeLabel}>
                    {typeName}
                </span>
            )}

        </TruncatedLabel>
    );

    const handleExpand = () => {
        if (!expanded) {
            collapsedFieldsStore.expandField(fieldId, dmType.kind);
        } else {
            collapsedFieldsStore.collapseField(fieldId, dmType.kind);
        }
    };

    const handlePortState = (state: PortState) => {
        setPortState(state)
    };

    const onMouseEnter = () => {
        setIsHovered(true);
    };

    const onMouseLeave = () => {
        setIsHovered(false);
    };

    return (
        <>
            <Tooltip
                content={(portOut && portOut.isPreview) ? (<span>Please map parent field first. <a href={DATA_MAPPER_ARRAY_MAPPING_DOC_URL}>Learn more</a></span>) : ""}
                sx={{ fontSize: "12px" }}
                containerSx={{ width: "100%" }}
            >
                <div
                    id={"recordfield-" + fieldId}
                    className={classnames(classes.treeLabel,
                        (portState !== PortState.Unselected) ? classes.treeLabelPortSelected : "",
                        hasHoveredParent ? classes.treeLabelParentHovered : ""
                    )}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                >
                    <span className={classes.label}>
                        {fields && <Button
                            id={"expand-or-collapse-" + fieldId}
                            appearance="icon"
                            tooltip="Expand/Collapse"
                            onClick={handleExpand}
                            sx={{ marginLeft: treeDepth * 16 }}
                        >
                            {expanded ? <Codicon name="chevron-down" /> : <Codicon name="chevron-right" />}
                        </Button>}
                        {label}
                        {dmType.isRecursive && (
                            <span
                                className={classes.outputNodeValue}
                                style={{ paddingInline: "3px" }}
                                title="Recursive type">
                                ∞
                            </span>
                        )}
                    </span>
                    <span className={classes.outPort}>
                        {portOut && !portOut.isPreview &&
                            <DataMapperPortWidget engine={engine} port={portOut} handlePortState={handlePortState} />
                        }
                    </span>
                </div>
            </Tooltip>
            {fields && expanded &&
                fields.map((subField, index) => {
                    return (
                        <InputNodeTreeItemWidget
                            key={index}
                            engine={engine}
                            dmType={subField}
                            getPort={getPort}
                            parentId={fieldId}
                            treeDepth={treeDepth + 1}
                            hasHoveredParent={isHovered || hasHoveredParent}
                        />
                    );
                })
            }
        </>
    );
}
