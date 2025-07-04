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
import { ErrorBoundary as EB } from "./ErrorBoundary";
import { Button } from "../Button/Button";

function MyComponent() {
    const [shouldThrowError, setShouldThrowError] = useState(false);

    const handleClick = () => {
        setShouldThrowError(true);
    };

    if (shouldThrowError) {
        // This will be caught by the error boundary due to being part of the rendering phase
        throw new Error('This is an error');
    }

    return <Button onClick={handleClick}>My Component</Button>;
}

const meta = {
    component: EB,
    title: "Error Boundary",
} satisfies Meta<typeof EB>;
export default meta;

type Story = StoryObj<typeof EB>;

export const ErrorBoundary: Story = {
    args: { children: <MyComponent />, errorMsg: "An error occurred" },
};
