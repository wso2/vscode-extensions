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

