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
import React from "react";
import styled from "@emotion/styled";

export interface GridItemProps {
    id: number | string;
    sx?: any;
    onClick?: (event?: React.MouseEvent<HTMLElement, MouseEvent>) => void;
    children?: React.ReactNode;
    selected?: boolean;
}

interface ContainerProps {
    sx: any;
}

const Container = styled.div<ContainerProps>`
    text-align: left;
    ${(props: ContainerProps) => props.sx};
`;

export const GridItem: React.FC<GridItemProps> = (props: GridItemProps) => {
    const { id, sx, onClick, children } = props;

    const handleItemClick = (event?: React.MouseEvent<HTMLElement, MouseEvent>) => {
        if (onClick) {
            event.stopPropagation();
            onClick(event);
        }
    }

    return (
        <Container
            key={id}
            onClick={handleItemClick}
            sx={sx}
            id={`grid-item-${id}`}
        >
            <div style={{...sx}}>{children}</div>
        </Container>
    );
};
