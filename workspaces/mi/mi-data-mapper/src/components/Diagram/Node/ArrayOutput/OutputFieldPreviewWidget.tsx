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
import { OutputSearchHighlight } from "../commons/Search";
import { useIONodesStyles } from "../../../styles";
import { useDMCollapsedFieldsStore } from '../../../../store/store';
import { getTypeName } from "../../utils/common-utils";
import { DATA_MAPPER_ARRAY_MAPPING_DOC_URL } from "../../utils/constants";


export interface OutputFieldPreviewWidgetProps {
    parentId: string;
    dmType: DMType;
    engine: DiagramEngine;
    getPort: (portId: string) => InputOutputPortModel;
    treeDepth?: number;
    hasHoveredParent?: boolean;
}

export function OutputFieldPreviewWidget(props: OutputFieldPreviewWidgetProps) {
    const { parentId, dmType, getPort, engine, treeDepth = 0, hasHoveredParent } = props;

    const [ portState, setPortState ] = useState<PortState>(PortState.Unselected);
    const [isHovered, setIsHovered] = useState(false);
    const collapsedFieldsStore = useDMCollapsedFieldsStore();

    const fieldName = dmType.fieldName;
    const typeName = getTypeName(dmType);
    const fieldId = `${parentId}.${fieldName}`;
    const portIn = getPort(fieldId + ".IN");

    const classes = useIONodesStyles();

    let fields: DMType[];

    if (dmType.kind === TypeKind.Interface) {
        fields = dmType.fields;
    } else if (dmType.kind === TypeKind.Array) {
        fields = [{...dmType.memberType, fieldName: `<${dmType.fieldName}Item>`}];
    }

    let expanded = true;

    if (portIn && portIn.collapsed) {
        expanded = false;
    }

    const indentation = fields ? 0 : ((treeDepth + 1) * 16) + 8;

    const label = (
        <TruncatedLabel style={{ marginRight: "auto", opacity: 0.5  }}>
            <span className={classes.valueLabel} style={{ marginLeft: indentation }}>
                <OutputSearchHighlight>{fieldName}</OutputSearchHighlight>
                {!dmType.optional && <span className={classes.requiredMark}>*</span>}
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
                content={(<span>Please map parent field first. <a href={DATA_MAPPER_ARRAY_MAPPING_DOC_URL}>Learn more</a></span>)}
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
                    title={"Please map parent field first"}
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
                </div>
            </Tooltip>
            {fields && expanded &&
                fields.map((subField, index) => {
                    return (
                        <OutputFieldPreviewWidget
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
