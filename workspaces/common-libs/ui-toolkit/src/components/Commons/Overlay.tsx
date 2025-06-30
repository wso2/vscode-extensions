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
import styled from "@emotion/styled";
import React from "react";
export interface OverlayProps {
    id?: string;
    className?: string;
    onClose?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
    sx?: any;
}

const OverlayContainer = styled.div<OverlayProps>`
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    z-index: 1000;
    ${(props: OverlayProps) => props.sx};
`;

export const Overlay: React.FC<OverlayProps> = (props: OverlayProps) => {
    const { id, className, sx, onClose } = props;

    return (
        <OverlayContainer id={id} className={className} sx={sx} onClick={onClose} />
    );
};
