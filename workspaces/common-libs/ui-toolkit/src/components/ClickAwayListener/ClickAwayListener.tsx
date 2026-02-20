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
import React, { PropsWithChildren, useCallback, useEffect } from "react";
import { Overlay } from "../Commons/Overlay";

const Container = styled.div`
    height: fit-content;
    width: fit-content;
`;

export type ClickAwayListenerProps = {
    anchorEl?: HTMLElement | SVGGElement;
    isMenuOpen?: boolean;
    onClickAway: (event?: React.MouseEvent<HTMLElement, MouseEvent>) => void;
    sx?: React.CSSProperties;
};

export const ClickAwayListener: React.FC<PropsWithChildren<ClickAwayListenerProps>> = 
    (props: PropsWithChildren<ClickAwayListenerProps>) => {
        const { anchorEl, isMenuOpen, children, onClickAway, sx } = props;
        const ref = React.useRef<HTMLDivElement>(null);

        const handleClickAway = useCallback((event: MouseEvent) => {
            if (
                (ref.current && !ref.current.contains(event.target as Node)) && 
                (!anchorEl?.contains(event.target as Node))
            ) {
                onClickAway();
            }
        }, [anchorEl, onClickAway]);

        useEffect(() => {
            document.addEventListener("click", handleClickAway);
            return () => {
                document.removeEventListener("click", handleClickAway);
            };
        }, [handleClickAway])

        return (
            <Container ref={ref} style={sx}>
                {children}
                {isMenuOpen && (
                    <Overlay sx={{zIndex: 0}} onClose={onClickAway}/>
                )}
            </Container>
        );
    }
