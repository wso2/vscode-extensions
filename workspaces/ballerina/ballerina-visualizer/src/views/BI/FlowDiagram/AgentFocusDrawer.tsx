/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import React, { useState } from "react";
import styled from "@emotion/styled";
import { keyframes, css } from "@emotion/react";
import { NodePosition, FOCUS_FLOW_DIAGRAM_VIEW } from "@wso2/ballerina-core";
import { Button, Icon, ThemeColors } from "@wso2/ui-toolkit";
import { BIFocusFlowDiagram } from "../FocusFlowDiagram";

const ANIM_DURATION = 130;

const fadeIn = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
`;
const fadeOut = keyframes`
    from { opacity: 1; }
    to   { opacity: 0; }
`;
const popIn = keyframes`
    from { opacity: 0; transform: scale(0.96); }
    to   { opacity: 1; transform: scale(1); }
`;
const popOut = keyframes`
    from { opacity: 1; transform: scale(1); }
    to   { opacity: 0; transform: scale(0.96); }
`;

const Backdrop = styled.div<{ closing: boolean }>`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1500;
    background-color: color-mix(in srgb, ${ThemeColors.SURFACE} 60%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: ${(p: { closing: boolean }) => p.closing
        ? css`${fadeOut} ${ANIM_DURATION}ms ease forwards`
        : css`${fadeIn} ${ANIM_DURATION}ms ease`};
`;

const DrawerPanel = styled.div<{ closing: boolean }>`
    width: 88vw;
    height: 84vh;
    display: flex;
    flex-direction: column;
    background-color: ${ThemeColors.SURFACE_DIM};
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    border-radius: 12px;
    z-index: 1501;
    overflow: hidden;
    animation: ${(p: { closing: boolean }) => p.closing
        ? css`${popOut} ${ANIM_DURATION}ms cubic-bezier(0.4, 0, 1, 1) forwards`
        : css`${popIn} ${ANIM_DURATION}ms cubic-bezier(0.16, 1, 0.3, 1)`};
`;

const DrawerHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px 8px 16px;
    border-bottom: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    flex-shrink: 0;
    gap: 8px;
`;

const DrawerTitle = styled.div`
    font-size: 14px;
    font-family: "GilmerMedium";
    color: ${ThemeColors.ON_SURFACE};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
`;

const DrawerBody = styled.div`
    flex: 1;
    overflow: hidden;
    position: relative;
`;

export interface AgentFocusDrawerProps {
    projectPath: string;
    filePath: string;
    position: NodePosition;
    agentName: string;
    onClose: () => void;
    onUpdate: () => void;
}

export function AgentFocusDrawer(props: AgentFocusDrawerProps) {
    const { projectPath, filePath, position, agentName, onClose, onUpdate } = props;
    const [closing, setClosing] = useState(false);

    const handleClose = () => {
        if (closing) return;
        setClosing(true);
    };

    const handleAnimationEnd = () => {
        if (closing) onClose();
    };

    return (
        <Backdrop closing={closing} onClick={handleClose}>
            <DrawerPanel closing={closing} onClick={(e) => e.stopPropagation()} onAnimationEnd={handleAnimationEnd}>
                <DrawerHeader>
                    <Icon name="bi-ai-agent" sx={{ flexShrink: 0 }} iconSx={{ fontSize: "18px" }} />
                    <DrawerTitle title={agentName}>{agentName}</DrawerTitle>
                    <span title="Close">
                        <Button appearance="icon" onClick={handleClose}>
                            <Icon name="close" isCodicon={true} iconSx={{ fontSize: "16px" }} />
                        </Button>
                    </span>
                </DrawerHeader>
                <DrawerBody>
                    <BIFocusFlowDiagram
                        projectPath={projectPath}
                        filePath={filePath}
                        position={position}
                        view={FOCUS_FLOW_DIAGRAM_VIEW.AGENT_TYPE}
                        embedded={true}
                        onUpdate={onUpdate}
                        onReady={() => { }}
                    />
                </DrawerBody>
            </DrawerPanel>
        </Backdrop>
    );
}
