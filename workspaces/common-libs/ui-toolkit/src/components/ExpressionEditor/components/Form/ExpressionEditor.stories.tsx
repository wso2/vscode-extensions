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
import type { Meta, StoryObj } from '@storybook/react-vite';

import { FormExpressionEditorWrapper as FormExpressionEditor } from ".";

import { CompletionItem } from "../../types";

/* Common */
const completions: CompletionItem[] = [
    {
        tag: "tag1",
        label: "label1",
        value: "value1",
        description: "description1",
        kind: "variable",
    },
    {
        tag: "tag2",
        label: "label2",
        value: "value2",
        description: "description2",
        kind: "function",
    },
    {
        tag: "tag3",
        label: "label3",
        value: "value3",
        description: "description3",
        kind: "function",
    },
    {
        tag: "tag4",
        label: "label4",
        value: "value4",
        description: "description4",
        kind: "variable",
    },
    {
        tag: "tag5",
        label: "label5",
        value: "value5",
        description: "description5",
        kind: "variable",
    },
];

const filterCompletions = (searchString: string) => {
    const searchStringRegex = /[a-zA-Z0-9_']+$/;
    const effectiveSearchString = searchString.match(searchStringRegex)?.[0] || "";

    return completions.filter(completion => {
        return completion.label.toLowerCase().includes(effectiveSearchString.toLowerCase());
    });
};

/* Form Expression Editor */
const meta = {
    title: "Form Expression Editor",
    component: FormExpressionEditor,
} satisfies Meta<typeof FormExpressionEditor>;
export default meta;

type Story = StoryObj<typeof FormExpressionEditor>;

export const Default: Story = {
    render: () => {
        const [value, setValue] = useState<string>("");
        const [completions, setCompletions] = useState<CompletionItem[]>([]);

        const handleOnChange = (value: string) => {
            setValue(value);
            setCompletions(filterCompletions(value));
        };

        const handleOnCancel = () => {
            console.log("Triggering cancel action");
            setCompletions([]);
        };

        const handleOnFocus = () => {
            console.log("Triggering focus action");
            setCompletions(filterCompletions(value));
        };

        const handleOnBlur = () => {
            console.log("Triggering blur action");
            handleOnCancel();
        };

        const handleOnCompletionSelect = (value: string, completion: CompletionItem) => {
            console.log("Triggering completion select action", completion);
            setValue(value);
            setCompletions([]);
        };

        return (
            <div style={{ width: "350px" }}>
                <FormExpressionEditor
                    value={value}
                    onChange={handleOnChange}
                    completions={completions}
                    onCompletionSelect={handleOnCompletionSelect}
                    onCancel={handleOnCancel}
                    onFocus={handleOnFocus}
                    onBlur={handleOnBlur}
                />
            </div>
        );
    },
};
