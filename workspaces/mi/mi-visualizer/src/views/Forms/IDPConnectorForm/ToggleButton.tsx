/*
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import styled from "@emotion/styled";

interface ToggleButtonProps {
    isFieldsTableOpen: number;
    setIsFieldsTableOpen: React.Dispatch<React.SetStateAction<number>>;
}

const ToggleContainer = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
`;

const ButtonGroup = styled.div`
    display: flex;
    width: 120px;
    background-color: var(--vscode-input-background);
    padding: 5px;
`;

const Button = styled.div<{ isSelected: boolean }>`
    background-color: ${(props: { isSelected: boolean }) => props.isSelected ? 
        "var(--vscode-quickInput-background)" : 
        "var(--vscode-input-background)"};
    color: var(--vscode-input-foreground);
    cursor: pointer;
    flex: 1;
    text-align: center;
    padding: 5px;
`;

export function ToggleButton({isFieldsTableOpen, setIsFieldsTableOpen}: ToggleButtonProps) {
    return (
        <ToggleContainer>
            <ButtonGroup>
                <Button
                    isSelected={isFieldsTableOpen === 1}
                    onClick={() => {
                        if (isFieldsTableOpen !== 1) {
                            setIsFieldsTableOpen(1);
                        }
                    }}
                >
                    Fields
                </Button>
                <Button
                    isSelected={isFieldsTableOpen === 2}
                    onClick={() => {
                        if (isFieldsTableOpen !== 2) {
                            setIsFieldsTableOpen(2);
                        }
                    }}
                >
                    Tables
                </Button>
            </ButtonGroup>
        </ToggleContainer>
    );
}

