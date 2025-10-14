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

import React, { useEffect, useMemo, useState } from "react";
import styled from "@emotion/styled";
import { DiagramEngine, PortWidget } from "@projectstorm/react-diagrams-core";
import { ReferenceNodeModel } from "./ReferenceNodeModel";
import { Colors, MEDIATORS, NODE_DIMENSIONS, OPEN_SEQUENCE_VIEW } from "../../../resources/constants";
import { Aggregate, STNode } from "@wso2/mi-syntax-tree/src";
import { Menu, MenuItem, Popover, Tooltip } from "@wso2/ui-toolkit";
import { MoreVertIcon } from "../../../resources";
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import SidePanelContext from "../../sidePanel/SidePanelContexProvider";
import { getMediatorIconsFromFont } from "../../../resources/icons/mediatorIcons/icons";
import { GetDefinitionResponse } from "@wso2/mi-core";
import { Header, Description, Name, Content, OptionsMenu, Body } from "../BaseNodeModel";
import { getNodeDescription } from "../../../utils/node";

namespace S {
    export type NodeStyleProp = {
        selected: boolean;
        hovered: boolean;
        hasError: boolean;
        isClickable: boolean;
    };
    export const Node = styled.div<NodeStyleProp>`
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        width: ${NODE_DIMENSIONS.REFERENCE.WIDTH - (NODE_DIMENSIONS.BORDER * 2)}px;
        height: ${NODE_DIMENSIONS.REFERENCE.HEIGHT - (NODE_DIMENSIONS.BORDER * 2)}px;
        padding: 0 0px;
        border: ${NODE_DIMENSIONS.BORDER}px solid
            ${(props: NodeStyleProp) =>
            props.hasError ? Colors.ERROR : props.selected ? Colors.SECONDARY : props.hovered ? Colors.SECONDARY : Colors.OUTLINE_VARIANT};
        border-radius: 10px;
        background-color: ${Colors.SURFACE_BRIGHT};
        color: ${Colors.ON_SURFACE};
        cursor: ${(props: NodeStyleProp) => props.isClickable ? 'pointer' : 'default'};
    `;

    export const IconContainer = styled.div`
        padding: 0 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        & img {
            height: 25px;
            width: 25px;
            fill: ${Colors.ON_SURFACE};
            stroke: ${Colors.ON_SURFACE};
        }
    `;

    export const TopPortWidget = styled(PortWidget)`
        margin-top: -3px;
    `;

    export const BottomPortWidget = styled(PortWidget)`
        margin-bottom: -3px;
    `;

    export const TooltipContent = styled.div`
        max-width: 80vw;
        white-space: pre-wrap;
    `;
}
interface ReferenceNodeWidgetProps {
    node: ReferenceNodeModel;
    engine: DiagramEngine;
    onClick?: (node: STNode) => void;
}

export function ReferenceNodeWidget(props: ReferenceNodeWidgetProps) {
    const { node, engine } = props;
    const [isHovered, setIsHovered] = React.useState(false);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [popoverAnchorEl, setPopoverAnchorEl] = useState(null);
    const sidePanelContext = React.useContext(SidePanelContext);
    const { rpcClient, setIsLoading: setDiagramLoading } = useVisualizerContext();
    const hasDiagnotics = node.hasDiagnotics();
    const tooltip = hasDiagnotics ? node.getDiagnostics().map(diagnostic => diagnostic.message).join("\n") : undefined;
    const [definition, setDefinition] = useState<GetDefinitionResponse>(undefined);
    const [canOpenView, setCanOpenView] = useState(false);
    const [fromDependency, setFromDependency] = useState(false);
    const referenceKey = node.referenceName?.split("=")[0];
    const referenceValue = node.referenceName?.split("=")[1];
    const isClickable = referenceKey !== "sequence" && referenceKey !== "inSequence" && referenceKey !== "outSequence" && referenceKey !== "faultSequence" && node.stNode.tag !== "target";
    const description = referenceValue || getNodeDescription(node.stNode);

    useEffect(() => {
        if (node.mediatorName === MEDIATORS.DATAMAPPER) {
            setCanOpenView(true);
        } else {
            getDefinition();
        }
    }, []);

    useEffect(() => {
        node.setSelected(sidePanelContext?.node === node);
    }, [sidePanelContext?.node]);

    const getDefinition = async () => {
        let range;
        if (node.mediatorName === MEDIATORS.SEQUENCE || node.mediatorName === MEDIATORS.DATASERVICECALL) {
            range = node.stNode?.range?.startTagRange ?? node.getParentStNode()?.range?.startTagRange;
        } else if (node.mediatorName === MEDIATORS.AGGREGATE) {
            range = (node.stNode as Aggregate)?.correlateOnOrCompleteConditionOrOnComplete?.onComplete?.range?.startTagRange;
        }

        if (!range) {
            return;
        }
        const text = await rpcClient?.getMiDiagramRpcClient().getTextAtRange({
            documentUri: node.documentUri,
            range
        });

        const regex = new RegExp(`\\s*${referenceKey}\\s*=\\s*(['"])(.*?)\\1`);
        const match = text?.text?.match(regex);
        if (match) {
            const keyPart = match[0].split("=")[0];
            const valuePart = match[0].split("=")[1];
            const keyLines = keyPart.split("\n");
            const valueLines = valuePart.split("\n");
            const offsetBeforeKey = (text.text.split(match[0])[0]).length;

            let charPosition = 0

            if (keyLines.length > 1) {
                charPosition = keyLines[keyLines.length - 1].length + valueLines[valueLines.length - 1].length;
            }
            if (valueLines.length > 1) {
                charPosition = valueLines[valueLines.length - 1].length;
            }
            const definitionPosition = {
                line: range.start.line + keyLines.length - 1 + valueLines.length - 1,
                character: keyLines.length > 1 || valueLines.length > 1 ?
                    charPosition :
                    range.start.character + offsetBeforeKey + match[0].length - 2,
            };

            const definition = await rpcClient?.getMiDiagramRpcClient().getDefinition({
                document: {
                    uri: node.documentUri,
                },
                position: definitionPosition
            });
            if (definition.uri && definition.range) {
                setDefinition(definition);
                setCanOpenView(true);
            } else if (definition.fromDependency) {
                setFromDependency(true);
            }
        }
    }

    const handleOnClickMenu = (event: any) => {
        setIsPopoverOpen(!isPopoverOpen);
        setPopoverAnchorEl(event.currentTarget);
        event.stopPropagation();
    };

    const handlePopoverClose = () => {
        setIsPopoverOpen(false);
    }

    const handleOpenView = async (e?: any) => {
        if (e) e.stopPropagation();

        if (!definition && node.mediatorName !== MEDIATORS.DATAMAPPER) {
            return onClick(e);
        }

        if (node.mediatorName === MEDIATORS.DATASERVICECALL) {
            node.openDSSServiceDesigner(rpcClient, definition.uri);
        } else if (node.mediatorName === MEDIATORS.DATAMAPPER) {
            node.openDataMapperView(rpcClient);
        } else if (definition && node.openViewName === OPEN_SEQUENCE_VIEW) {
            node.openSequenceDiagram(rpcClient, definition.uri);
        }
    }

    const onClick = (e: any) => {
        if (!isClickable) {
            return;
        }
        node.onClicked(e, node, rpcClient, sidePanelContext);
    }

    const TooltipEl = useMemo(() => {
        return () => (
            <S.TooltipContent style={{ textWrap: "wrap" }}>
                {tooltip}
            </S.TooltipContent>
        );
    }, [tooltip])

    return (
        <div data-testid={`referenceNode-${node.getID()}`}>
            <Tooltip content={!isPopoverOpen && tooltip ? <TooltipEl /> : ""} position={'bottom'} containerPosition={'absolute'}>
                <S.Node
                    selected={node.isSelected()}
                    hasError={hasDiagnotics}
                    hovered={isHovered}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onClick={onClick}
                    isClickable={isClickable}
                >
                    <S.TopPortWidget port={node.getPort("in")!} engine={engine} />
                    <div style={{ display: "flex", flexDirection: "row", width: NODE_DIMENSIONS.DEFAULT.WIDTH }}>
                        <S.IconContainer>{getMediatorIconsFromFont(node.stNode.tag)}</S.IconContainer>
                        <div>
                            {isHovered && (
                                <OptionsMenu appearance="icon" onClick={handleOnClickMenu}>
                                    <MoreVertIcon />
                                </OptionsMenu>
                            )}
                            <Content>
                                <Header showBorder={description !== undefined}>
                                    <Name>{node.stNode.displayName || node.mediatorName}</Name>
                                </Header>
                                <Body>
                                    <Tooltip content={description} position={'bottom'} >
                                        <Description onClick={handleOpenView} isError={!canOpenView && !fromDependency} selectable={canOpenView && !fromDependency}>{description}</Description>
                                    </Tooltip>
                                </Body>
                            </Content>
                        </div>
                    </div>
                    <S.BottomPortWidget port={node.getPort("out")!} engine={engine} />
                </S.Node>
            </Tooltip>
            <Popover
                anchorEl={popoverAnchorEl}
                open={isPopoverOpen}
                sx={{
                    backgroundColor: Colors.SURFACE,
                    marginLeft: "30px",
                    padding: 0
                }}
                handleClose={handlePopoverClose}
            >
                <Menu>
                    {canOpenView && <MenuItem key={'openView-btn'} item={{ label: node.openViewName || 'Open View', id: "open-view", onClick: handleOpenView }} />}
                    <MenuItem key={'delete-btn'} item={{ label: 'Delete', id: "delete", onClick: () => node.delete(rpcClient, setDiagramLoading) }} />
                </Menu>
            </Popover>

        </div >
    );
}
