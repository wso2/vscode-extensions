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

/** @jsxImportSource @emotion/react */
import { css, keyframes } from "@emotion/react";
import { useContext, useEffect, useState } from "react";
import { DiagramEngine } from "@projectstorm/react-diagrams";
import { NodeLinkModel } from "./NodeLinkModel";
import { Colors } from "../../resources/constants";
import SidePanelContext from "../sidePanel/SidePanelContexProvider";
import { Range } from "@wso2/mi-syntax-tree/lib/src";
import { Tooltip } from "@wso2/ui-toolkit";

interface NodeLinkWidgetProps {
    link: NodeLinkModel;
    engine: DiagramEngine;
}

const fadeInZoomIn = keyframes`
    0% {
        opacity: 0;
        transform: scale(0.5);
    }
    100% {
        opacity: 1;
        transform: scale(1);
    }
`;
const zoomIn = keyframes`
0% {
    transform: scale(0.9);
}
100% {
    transform: scale(1.2);
}
`;
const zoomOut = keyframes`
0% {
    transform: scale(1.2);
}
100% {
    transform: scale(0.9);
}
`;

export const NodeLinkWidget: React.FC<NodeLinkWidgetProps> = ({ link, engine }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isSelected, setIsSelected] = useState(false);
    const labelPosition = link.getLabelPosition();
    const addButtonPosition = link.getAddButtonPosition();
    const sidePanelContext = useContext(SidePanelContext);
    const hasDiagnotics = link.hasDiagnotics();
    const tooltip = hasDiagnotics
        ? link
            .getDiagnostics()
            .map((diagnostic) => diagnostic.message)
            .join("\n")
        : link?.label?.length > 8 ? link.label : undefined;

    useEffect(() => {
        const onChange = (event: any) => {
            setIsHovered(event.isSelected);
        };
        const listener = link.registerListener({
            selectionChanged: onChange,
        });
        return () => {
            listener.deregister();
        };
    }, []);

    useEffect(() => {
        setIsSelected(sidePanelContext?.node === link);
    }, [sidePanelContext?.node]);

    const handleAddNode = async () => {
        if (link.onAddClick) {
            link.onAddClick();
        } else {
            const rangeOrPosition: any = link.stRange;
            let nodeRange;
            if (rangeOrPosition.start && rangeOrPosition.end) {
                nodeRange = link.stRange as Range;
            } else {
                nodeRange = {
                    start: rangeOrPosition,
                    end: rangeOrPosition,
                };
            }
            setIsSelected(true);
            await new Promise(resolve => setTimeout(resolve, 1));
            sidePanelContext.setSidePanelState({
                ...sidePanelContext,
                isOpen: true,
                parentNode: link.getParentNode(),
                previousNode: link.getPreviousNode(),
                node: link,
                nextNode: link.getNextNode(),
                nodeRange: nodeRange,
                trailingSpace: link.trailingSpace,
            });
        }
    };

    const handleMouseEnter = () => {
        link.updateLinkSelect(true);
    };

    const handleMouseLeave = () => {
        link.updateLinkSelect(false);
    };

    return (
        <g pointerEvents={"auto"} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} data-testid={`link-${link.getID()}`}>
            <path
                id={link.getID() + "-bg"}
                d={link.getSVGPath()}
                fill={"none"}
                stroke={"transparent"}
                strokeWidth={16}
            />
            <path
                id={link.getID()}
                d={link.getSVGPath()}
                fill={"none"}
                stroke={isHovered || link.isSelected() ? Colors.SECONDARY : Colors.PRIMARY}
                strokeWidth={2}
                strokeDasharray={link.brokenLine ? "5,5" : "0"}
                {...(link.showArrowToNode() && { markerEnd: `url(#${link.getID()}-arrow-head)` })}
            />
            {link.label && (
                <foreignObject x={labelPosition.x - 50} y={labelPosition.y - 20} width="100" height="100">
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        <Tooltip content={tooltip} position={"bottom"}>
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    borderRadius: "20px",
                                    border: `2px solid ${link.hasDiagnotics()
                                        ? Colors.ERROR
                                        : link.showAddButton && isHovered
                                            ? Colors.SECONDARY
                                            : Colors.PRIMARY
                                        }`,
                                    backgroundColor: `${Colors.SURFACE_BRIGHT}`,
                                    padding: "2px 10px",
                                    boxSizing: "border-box",
                                    width: "fit-content",
                                    fontFamily: "var(--font-family)",
                                    fontSize: "var(--type-ramp-base-font-size)",
                                }}
                            >
                                <span
                                    style={{
                                        color: link.hasDiagnotics()
                                            ? Colors.ERROR
                                            : link.showAddButton && isHovered
                                                ? Colors.SECONDARY
                                                : Colors.PRIMARY,
                                        fontSize: "14px",
                                    }}
                                >
                                    {link.label.length > 8 ? `${link.label.substring(0, 8)}...` : link.label}
                                </span>
                            </div>
                        </Tooltip>
                    </div>
                </foreignObject>
            )}
            {link.showAddButton && (
                <foreignObject
                    x={addButtonPosition.x - 10}
                    y={addButtonPosition.y - 10}
                    width="20"
                    height="30"
                    onClick={handleAddNode}
                    data-testid={`add-mediator-button`}
                >
                    <div
                        css={css`
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            cursor: pointer;
                            animation: ${fadeInZoomIn} 0.2s ease-out forwards;
                            svg {
                                animation: ${zoomOut} 0.2s ease-out forwards;
                            }
                            &:hover {
                                svg {
                                    animation: ${zoomIn} 0.2s ease-out forwards;
                                }
                            }
                        `}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                            <path
                                fill={Colors.SURFACE_BRIGHT}
                                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
                            />
                            <path
                                fill={isHovered || isSelected ? Colors.SECONDARY : Colors.PRIMARY}
                                d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m0 18a8 8 0 1 1 8-8a8 8 0 0 1-8 8m4-9h-3V8a1 1 0 0 0-2 0v3H8a1 1 0 0 0 0 2h3v3a1 1 0 0 0 2 0v-3h3a1 1 0 0 0 0-2"
                            />
                        </svg>
                    </div>
                </foreignObject>
            )}
            <defs>
                <marker
                    markerWidth="4"
                    markerHeight="4"
                    refX="3"
                    refY="2"
                    viewBox="0 0 4 4"
                    orient="auto"
                    id={`${link.getID()}-arrow-head`}
                >
                    <polygon
                        points="0,4 0,0 4,2"
                        fill={link.showAddButton && isHovered ? Colors.SECONDARY : Colors.PRIMARY}
                    ></polygon>
                </marker>
            </defs>
        </g>
    );
};
