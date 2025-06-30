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

import _ from "lodash";
import { DefaultLinkModel } from "@projectstorm/react-diagrams";
import { Colors, NODE_DIMENSIONS, NODE_LINK, NodeTypes } from "../../resources/constants";
import { SourceNodeModel, TargetNodeModel } from "../../utils/diagram";
import { Position, Range } from "@wso2/mi-syntax-tree/lib/src";
import { Diagnostic } from "vscode-languageserver-types";
import { EmptyNodeModel } from "../nodes/EmptyNode/EmptyNodeModel";

export const LINK_BOTTOM_OFFSET = 10;

export interface NodeLinkModelOptions {
    id: string;
    label?: string;
    showAddButton?: boolean; // default true
    showArrow?: boolean; // default true
    brokenLine?: boolean; // default false
    stRange?: Range | Position;
    trailingSpace?: string;
    onAddClick?: () => void;
    parentNode?: string;
    previousNode?: string;
    nextNode?: string;
    diagnostics?: Diagnostic[];
}

export class NodeLinkModel extends DefaultLinkModel {
    label: string;
    sourceNode: SourceNodeModel;
    targetNode: TargetNodeModel;
    // options
    showAddButton = true;
    showArrow = true;
    brokenLine = false;
    linkBottomOffset = LINK_BOTTOM_OFFSET;
    stRange: Range | Position;
    trailingSpace: string;
    parentNode: string;
    previousNode: string;
    nextNode: string;
    onAddClick?: () => void;
    diagnostics?: Diagnostic[];
    readonly nodeWidth = NODE_DIMENSIONS.PLUS.WIDTH;
    readonly nodeHeight = NODE_DIMENSIONS.PLUS.HEIGHT;

    constructor(options: NodeLinkModelOptions) {
        super({
            id: options.id,
            type: NODE_LINK,
            width: 10,
            color: Colors.PRIMARY,
            selectedColor: Colors.SECONDARY,
            curvyness: 0,
        });
        if (options) {
            const nodeOptions = options as NodeLinkModelOptions;
            if (nodeOptions.label) {
                this.label = nodeOptions.label;
                this.linkBottomOffset = LINK_BOTTOM_OFFSET + 80;
            } else if (nodeOptions.label === "") {
                this.linkBottomOffset = LINK_BOTTOM_OFFSET + 32;
            }
            if (nodeOptions.showAddButton === false) {
                this.showAddButton = nodeOptions.showAddButton;
            }
            if (nodeOptions.showArrow === false) {
                this.showArrow = nodeOptions.showArrow;
            }
            if (nodeOptions.brokenLine === true) {
                this.brokenLine = nodeOptions.brokenLine;
            }
            if (nodeOptions.stRange) {
                this.stRange = nodeOptions.stRange;
            }
            if (nodeOptions.parentNode) {
                this.parentNode = nodeOptions.parentNode;
            }
            if (nodeOptions.previousNode) {
                this.previousNode = nodeOptions.previousNode;
            }
            if (nodeOptions.nextNode) {
                this.nextNode = nodeOptions.nextNode;
            }
            if (nodeOptions.diagnostics) {
                this.diagnostics = nodeOptions.diagnostics;
            }
            if (nodeOptions.trailingSpace !== undefined) {
                this.trailingSpace = nodeOptions.trailingSpace;
            }
            if ((options as NodeLinkModelOptions).onAddClick) {
                this.onAddClick = (options as NodeLinkModelOptions).onAddClick;
            }
        }
    }

    updateLinkSelect(selected: boolean) {
        super.setSelected(selected);
        const targetNode = this.targetNode as EmptyNodeModel;
        if (targetNode && targetNode?.getType() === NodeTypes.EMPTY_NODE && !targetNode.visible) {
            _.forEach(this.targetNode.getOutPort().getLinks(), (link) => {
                link.setSelected(selected);
            });
        }
        const sourceNode = this.sourceNode as EmptyNodeModel;
        if (sourceNode && sourceNode?.getType() === NodeTypes.EMPTY_NODE && !sourceNode.visible) {
            _.forEach(this.sourceNode.getInPort().getLinks(), (link) => {
                link.setSelected(selected);
            });
        }
    }

    setSourceNode(node: SourceNodeModel) {
        this.sourceNode = node;
    }

    setTargetNode(node: TargetNodeModel) {
        this.targetNode = node;
    }

    getSVGPath(): string {
        if (this.points.length != 2) {
            return "";
        }

        let source = this.getFirstPoint().getPosition();
        let target = this.getLastPoint().getPosition();

        // is lines are straight?
        let tolerance = 10;
        let isStraight = Math.abs(source.y - target.y) <= tolerance || Math.abs(source.x - target.x) <= tolerance;
        if (isStraight) {
            let path = `M ${source.x} ${source.y} `;
            path += `L ${target.x} ${target.y}`;
            return path;
        }

        // generate 2 angle lines
        let curveOffset = 10;
        // is the target on the right?
        let isRight = source.x < target.x;

        let path = `M ${source.x} ${source.y} `;
        path += `L ${source.x} ${target.y - this.linkBottomOffset - curveOffset} `;
        if (isRight) {
            path += `A ${curveOffset},${curveOffset} 0 0 0 ${source.x + curveOffset},${target.y - this.linkBottomOffset
                } `;
            path += `L ${target.x - curveOffset} ${target.y - this.linkBottomOffset} `;
            path += `A ${curveOffset},${curveOffset} 0 0 1 ${target.x},${target.y - this.linkBottomOffset + curveOffset
                } `;
        } else {
            path += `A ${curveOffset},${curveOffset} 0 0 1 ${source.x - curveOffset},${target.y - this.linkBottomOffset
                } `;
            path += `L ${target.x + curveOffset} ${target.y - this.linkBottomOffset} `;
            path += `A ${curveOffset},${curveOffset} 0 0 0 ${target.x},${target.y - this.linkBottomOffset + curveOffset
                } `;
        }
        path += `L ${target.x} ${target.y}`;
        return path;
    }

    // get label coordinates
    getLabelPosition(): { x: number; y: number } {
        if (this.points.length != 2) {
            return { x: 0, y: 0 };
        }

        let source = this.getFirstPoint().getPosition();
        let target = this.getLastPoint().getPosition();

        // is lines are straight?
        let tolerance = 10;
        let isStraight = Math.abs(source.y - target.y) <= tolerance || Math.abs(source.x - target.x) <= tolerance;
        if (isStraight) {
            // is horizontal?
            if (Math.abs(source.y - target.y) <= tolerance) {
                return { x: (source.x + target.x) / 2, y: source.y + 5 };
            }
            return { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 };
        }

        // generate for 2 angle lines
        let x = target.x;
        let y = target.y - this.linkBottomOffset / 2 - 10;
        return { x: x, y: y };
    }

    // get add button position
    getAddButtonPosition(): { x: number; y: number } {
        if (this.points.length != 2 && !this.showAddButton) {
            return { x: 0, y: 0 };
        }

        let source = this.getFirstPoint().getPosition();
        let target = this.getLastPoint().getPosition();

        // is lines are straight?
        let tolerance = 10;
        let isStraight = Math.abs(source.y - target.y) <= tolerance || Math.abs(source.x - target.x) <= tolerance;
        if (isStraight) {
            // with label
            if (this.label) {
                return { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 + 25 };
            }
            // without label
            return { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 - 5 };
        }

        // generate for 2 angle lines
        if (this.label) {
            return { x: target.x, y: target.y - this.linkBottomOffset / 2 + 15 };
        }
        return { x: source.x, y: source.y + 20 };
    }

    // show node arrow. default true. but target node is a EmptyNodeModel, then false
    showArrowToNode(): boolean {
        if (this.points.length != 2) {
            return false;
        }
        if (this.targetNode?.getType() === NodeTypes.EMPTY_NODE) {
            return false;
        }
        return this.showArrow;
    }

    getParentNode(): string {
        return this.parentNode;
    }

    getPreviousNode(): string {
        return this.previousNode;
    }

    getNextNode(): string {
        return this.nextNode;
    }

    hasDiagnotics(): boolean {
        return this.diagnostics !== undefined && this.diagnostics.length > 0;
    }

    getDiagnostics(): Diagnostic[] {
        return this.diagnostics || [];
    }
}
