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
import { Meta, StoryObj } from "@storybook/react-vite";
import { SyntaxHighlighter } from "./SyntaxHighlighter";

const xmlCode = `<note>
<to city="Colombo">User</to>
<from>WSO2</from>
<heading>Reminder</heading>
<body>Don't forget to subscribe!</body>
</note>`;

const jsonCode = '{"name":"John", "age":30, "car":null}';
const javaScriptCode = `function add(a, b) {
    // This is a comment
    return a + b;
}`;
const cssCode = `body {
    background-color: lightblue;
}`;
const htmlCode = `<!DOCTYPE html>
<html>
<body>
    <h1>My First Heading</h1>
    <p>My first paragraph.</p>
</body>
</html>`;

const meta: Meta<typeof SyntaxHighlighter> = {
    component: SyntaxHighlighter,
    title: "Syntax Highlighter",
};
export default meta;

type Story = StoryObj<typeof SyntaxHighlighter>;

export const SampleXML: Story = {
    args: { code: xmlCode, language: "xml" },
};

export const SampleJSON: Story = {
    args: { code: jsonCode, language: "json" },
};

export const SampleJS: Story = {
    args: { code: javaScriptCode, language: "javascript" },
};

export const SampleCSS: Story = {
    args: { code: cssCode, language: "css" },
};

export const SampleHTML: Story = {
    args: { code: htmlCode, language: "html" },
};
