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
import React, { ReactNode, useRef } from "react";
import styled from "@emotion/styled";
import { createPortal } from "react-dom";
import { Button, Codicon, Overlay } from "@wso2/ui-toolkit";

interface RefComponentContainerProps {
    sx?: any;
}

const RefComponentContainer = styled.div<RefComponentContainerProps>`
    ${(props: RefComponentContainerProps) => props.sx};
`;

interface ContainerProps {
    isOpen: boolean;
    dropdownSx?: any;
}

const ValueContainer = styled.div<ContainerProps>`
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    cursor: pointer;
    background-color: var(--vscode-background);
    margin-top: 2px;
    flex-wrap: wrap;
    width: fit-content;
`;

const Dropdown = styled.div<ContainerProps>`
    display: flex;
    flex-direction: column;
    position: absolute;
    width: fit-content;
    z-index: 1001;
    background-color: var(--vscode-dropdown-background);
    border: 1px solid var(--vscode-dropdown-border);
    border-color: ${(props: ContainerProps) => (props.isOpen ? "var(--vscode-focusBorder)" : "var(--vscode-dropdown-border)")};
    padding: 8px;
    box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1);
    max-height: 200px;
    overflow-y: auto;
    &:hover {
        cursor: pointer;
        background-color: var(--vscode-editorHoverWidget-background);
    }
    ${(props: ContainerProps) => props.dropdownSx};
`;

export interface RefComponentProps {
    id?: string;
    className?: string;
    displayValue?: ReactNode;
    sx?: any;
    iconSx?: any;
    buttonSx?: any;
    dropdownSx?: any;
    dropdownWidth?: number;
    componnetHeight?: number;
    onChange?: () => void;
}

export const RefComponent: React.FC<RefComponentProps> = (props: RefComponentProps) => {
    const { id, className, displayValue, sx, dropdownSx, buttonSx, onChange,
        componnetHeight = 0, dropdownWidth = 0 } = props;
    const [isComponentOpen, setIsComponentOpen] = React.useState(false);
    const [valueContainerPosition, setValueContainerPosition] = React.useState<DOMRect | null>(null);
    const containerRef = useRef<HTMLDivElement>(null); // Reference to the container
    const valueContainerRef = useRef<HTMLDivElement>(null); // Reference to the value container

    const handleComponentClick = () => {
        setValueContainerPosition(valueContainerRef.current?.getBoundingClientRect());
        setIsComponentOpen(!isComponentOpen);
    };

    const handleChange = () => {
        setIsComponentOpen(false);
        onChange();
    };

    const handleCloseComponent = () => {
        setIsComponentOpen(false);
    };

    return (
        <RefComponentContainer ref={containerRef} id={id} className={className} sx={sx}>
            {displayValue ? <div ref={valueContainerRef} onClick={handleComponentClick}>{displayValue}</div> : (
                <ValueContainer ref={valueContainerRef} isOpen={isComponentOpen}>
                    <Button buttonSx={buttonSx} appearance="icon" onClick={handleComponentClick}><Codicon name="ellipsis" /></Button>
                </ValueContainer>
            )}
            {isComponentOpen &&
                <>
                    {createPortal(
                        <Dropdown
                            dropdownSx={dropdownSx}
                            isOpen={isComponentOpen}
                            onClick={handleChange}
                            style={{
                                top: (valueContainerPosition?.bottom + window.scrollY + 4 + 200) > window.innerHeight 
                                    ? valueContainerPosition?.top + window.scrollY - componnetHeight - 5 // Adjust if it goes beyond the bottom of the window
                                    : valueContainerPosition?.bottom, // Position below the value container
                                left: ((valueContainerPosition?.right + 200) > window.innerWidth) 
                                    ? valueContainerPosition?.right - dropdownWidth // Adjust if it goes beyond the right of the window
                                    : valueContainerPosition?.left, // Align with the left of the value container
                            }}
                        >
                            Add Reference Object
                        </Dropdown>
                        , document.body
                    )}
                    <>
                        {isComponentOpen && <Overlay onClose={handleCloseComponent} />}
                    </>
                </>
            }
        </RefComponentContainer>
    );
};
