import React, { useState } from "react";
import type { Meta, StoryObj } from '@storybook/react-vite';
import { PromptTextField } from "./PromptTextField";

const meta = {
    component: PromptTextField,
    title: "PromptTextField",
} satisfies Meta<typeof PromptTextField>;
export default meta;

type Story = StoryObj<typeof PromptTextField>;

export const Default: Story = {
    args: {
        label: "Prompt",
        placeholder: "Type your prompt here...",
        required: true,
        autoFocus: true,
    },
    render: args => {
        const [value, setValue] = useState("");
        return (
            <PromptTextField
                {...args}
                ref={undefined}
                value={value}
                onTextChange={text => {
                    setValue(text);
                    console.log("Text changed:", text);
                }}
                onEnter={text => {
                    console.log("Enter pressed:", text);
                }}
            />
        );
    }
};

export const WithError: Story = {
    args: {
        label: "Prompt with Error",
        placeholder: "Type your prompt here...",
        errorMsg: "This field is required",
        required: true,
    },
    render: args => {
        const [value, setValue] = useState("");
        return (
            <PromptTextField
                {...args}
                ref={undefined}
                value={value}
                onTextChange={text => {
                    setValue(text);
                    console.log("Text changed:", text);
                }}
                onEnter={text => {
                    console.log("Enter pressed:", text);
                }}
            />
        );
    }
};
