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
import React, { useState } from "react";
import { DropdownButton } from "./DropdownButton";
import Typography from "../Typography/Typography";
import styled from "@emotion/styled";
import { Icon } from "../Icon/Icon";
import type { Meta, StoryObj } from "@storybook/react-vite";

const IconWrapper = styled.div`
    height: 20px;
    width: 20px;
`;
const TextWrapper = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
`;

const option1 = (
    <div>
        <Typography sx={{margin: '0 0 10px 0'}} variant="h4">Option 1</Typography>
        <Typography sx={{margin: 0}} variant="body2">This is the first option in the dropdown</Typography>
    </div>
);
const option2 = (
    <div>
        <Typography sx={{margin: '0 0 10px 0'}} variant="h4">Option 2</Typography>
        <Typography sx={{margin: 0}} variant="body2">This is the second option in the dropdown</Typography>
    </div>
);
const option3 = (
    <div>
        <Typography sx={{margin: '0 0 10px 0'}} variant="h4">Option 3</Typography>
        <Typography sx={{margin: 0}} variant="body2">This is the third option in the dropdown</Typography>
    </div>
);
const onSelect = (option: string) => {
    console.log(`Selected option: ${option}`);
};

const meta: Meta<typeof DropdownButton> = {
    title: "DropdownButton",
    component: DropdownButton,
};
export default meta;

type Story = StoryObj<typeof DropdownButton>;

export const DropdownButtonWithComponent: Story = {
    render: () => {
        const [selectedItem, setSelectedItem] = useState<string>("Option 1");
        const handleOptionSelect = (option: string) => {
            setSelectedItem(option);
            console.log(`Selected option: ${option}`);
        };
        const buttonContent = (
            <div style={{ display: "flex", flexDirection: "row", gap: 4, alignItems: "center" }}>
                <IconWrapper>
                    <Icon name="import" iconSx={{ fontSize: 22 }} />
                </IconWrapper>
                <TextWrapper>Import {selectedItem}</TextWrapper>
            </div>
        );
        return (
            <div style={{ display: "flex", flexDirection: "column", paddingTop: "100px" }}>
                <div style={{ marginBottom: "10px" }}>
                    <Typography  variant="h1">Dropdown Button Example</Typography>
                    <Typography variant="h2">Select an option from the dropdown below:</Typography>
                </div>
                <DropdownButton
                    tooltip="Select an option"
                    dropDownAlign="top"
                    selecteOption={selectedItem}
                    buttonContent={buttonContent}
                    selectIconSx={{marginRight: 10}}
                    onOptionChange={handleOptionSelect}
                    onClick={onSelect}
                    options={[
                        {
                            content: option1,
                            value: "Option 1",
                        },
                        {
                            content: option2,
                            value: "Option 2",
                        },
                        {
                            content: option3,
                            value: "Option 3",
                        },
                    ]}
                    optionButtonSx={{ height: 30 }}
                    iconName="chevron-down"
                />
            </div>
        );
    },
};

export const DropdownButtonWithStringContent: Story = {
    render: () => {
        const [selectedItem, setSelectedItem] = useState<string>("Option 1");
        const handleOptionSelect = (option: string) => {
            setSelectedItem(option);
            console.log(`Selected option: ${option}`);
        };
        return (
            <div style={{ display: "flex", flexDirection: "column" , paddingTop: "100px" }}>
                <div style={{ marginBottom: "10px" }}>
                    <Typography variant="h1">Dropdown Button Example</Typography>
                    <Typography variant="h2">Select an option from the dropdown below:</Typography>
                </div>
                <DropdownButton
                    dropDownAlign="top"
                    selecteOption={selectedItem}
                    buttonContent={`Import ${selectedItem}`}
                    onOptionChange={handleOptionSelect}
                    onClick={onSelect}
                    options={[
                        {
                            content: option1,
                            value: "Option 1",
                        },
                        {
                            content: option2,
                            value: "Option 2",
                        },
                        {
                            content: option3,
                            value: "Option 3",
                        },
                    ]}
                    optionButtonSx={{ height: 26 }}
                    selectIconSx={{marginRight: 10}}
                    iconName="chevron-down"
                />
            </div>
        );
    },
};
