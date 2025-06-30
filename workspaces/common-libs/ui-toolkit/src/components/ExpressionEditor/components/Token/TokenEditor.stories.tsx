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

import { TokenEditor } from ".";

import { HELPER_PANE_HEIGHT } from "../../constants";
import styled from "@emotion/styled";
import { Button } from "../../../Button/Button";

/* Styles */
const HelperPane = styled.div`
    height: ${HELPER_PANE_HEIGHT}px;
    width: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
    justify-content: center;
    align-items: center;
    border: 1px solid var(--vscode-dropdown-border);
`;

const TokenEditorContainer = styled.div`
    width: 300px;
`;

/* Components */
const SampleHelperPane = ({ onChange }: { onChange: (value: string) => void }) => {
    return (
        <HelperPane>
            Helper Pane
            <Button appearance="secondary" onClick={() => onChange('Hello')}>
                Add token
            </Button>
        </HelperPane>
    );
};

const meta = {
    title: "Token Editor",
    component: TokenEditor,
} satisfies Meta<typeof TokenEditor>;
export default meta;

type Story = StoryObj<typeof TokenEditor>;

export const Default: Story = {
    render: () => {
        const [value, setValue] = useState<string>('Hello ${world}');
        const [isHelperPaneOpen, setIsHelperPaneOpen] = useState<boolean>(false);

        const handleChange = (value: string) => {
            setValue(value);
            console.log(value);
        };

        return (
            <TokenEditorContainer>
                <TokenEditor
                    value={value}
                    onChange={handleChange}
                    isHelperPaneOpen={isHelperPaneOpen}
                    changeHelperPaneState={setIsHelperPaneOpen}
                    getHelperPane={onChange => <SampleHelperPane onChange={onChange} />}
                    helperPaneOrigin="right"
                />
            </TokenEditorContainer>
        );
    },
};
