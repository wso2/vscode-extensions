/*
 *  Copyright (c) 2023, WSO2 LLC. (http://www.wso2.com). All Rights Reserved.
 *
 *  This software is the property of WSO2 LLC. and its suppliers, if any.
 *  Dissemination of any information or reproduction of any material contained
 *  herein is strictly forbidden, unless permitted by WSO2 in accordance with
 *  the WSO2 Commercial License available at http://wso2.com/licenses.
 *  For specific language governing the permissions and limitations under
 *  this license, please see the license as well as any agreement you’ve
 *  entered into with WSO2 governing the purchase of this software and any
 *  associated services.
 */
import React from "react";
import { Meta, StoryObj } from "@storybook/react-vite";
import { TextField } from "./TextField";
import { Codicon } from "../Codicon/Codicon";
import { Icon } from "../Icon/Icon";

const labelAdornment = (
    <div style={{display: "flex", justifyContent: "flex-end", flexGrow: 1}}>
        <Icon isCodicon name="plus"/>
    </div>
);

const meta: Meta<typeof TextField> = {
    component: TextField,
    title: "TextField",
};
export default meta;

type Story = StoryObj<typeof TextField>;

export const TextFieldWithError: Story = {
    args: {
        value: "Sample Text",
        label: "TextField",
        errorMsg: "Test Error",
        description: "This is a sample text field component",
        autoFocus: true,
        placeholder: "placeholder",
        onTextChange: (txt: string) => {console.log("Text Changed: ", txt);}
    },
};

export const RequiredTextFieldWithError: Story = {
    args: {
        value: "Sample Text",
        label: "TextField",
        errorMsg: "Test Error",
        required: true,
        placeholder: "placeholder",
        onChange: null
    },
};

export const TextFieldWithoutLabel: Story = {
    args: {
        value: "Sample Text",
        errorMsg: "Test Error",
        required: true,
        placeholder: "placeholder",
        onChange: null
    },
};

const searchIcon = (<Codicon name="search" sx={{cursor: "auto"}}/>);
export const TextFieldWithIcon: Story = {
    args: {
        value: "Sample Text",
        icon: {iconComponent: searchIcon, position: "end"},
        placeholder: "Search",
        onChange: null
    },
};

export const TextFieldWithAutoFoucus: Story = {
    args: {
        label: "TextField",
        autoFocus: true,
        placeholder: "placeholder",
        onChange: null
    },
};

const clickableIcon = (<Codicon name="edit" sx={{cursor: "pointer"}}/>);
export const TextFieldWithClickableIcon: Story = {
    args: {
        value: "Sample Text",
        icon: {iconComponent: clickableIcon, position: "end", onClick: () => {console.log("Icon clicked");}},
        placeholder: "Search",
        onChange: null
    },
};

export const TextFieldWithCustomDescription: Story = {
    args: {
        value: "Sample Text",
        label: "TextField",
        errorMsg: "Test Error",
        description: (
            <div style={{display: "flex", flexDirection: "row"}}>
                <div>Custom Description with a Link</div>
                <div style={{color: "var(--vscode-button-background)", marginLeft: 4}}>Click Here</div>
            </div>
        ),
        autoFocus: true,
        placeholder: "placeholder",
        onTextChange: (txt: string) => {console.log("Text Changed: ", txt);}
    },
};

export const TextFieldWithAdornments: Story = {
    args: {
        value: "Sample Text",
        inputProps: {startAdornment: (<button>S</button>), endAdornment: (<button>E</button>) },
        placeholder: "Search",
        onChange: null
    },
};

export const TextFieldWithLabelAdornment: Story = {
    args: {
        value: "Sample Text",
        label: "TextField",
        errorMsg: "Test Error",
        description: "This is a sample text field component",
        autoFocus: true,
        placeholder: "placeholder",
        labelAdornment: labelAdornment,
        onTextChange: (txt: string) => {console.log("Text Changed: ", txt);}
    },
};
