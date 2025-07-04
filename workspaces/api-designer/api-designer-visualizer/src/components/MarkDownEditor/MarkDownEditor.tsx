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
import {
    BlockTypeSelect,
    BoldItalicUnderlineToggles,
    codeBlockPlugin, CodeToggle,
    CreateLink,
    headingsPlugin,
    InsertTable,
    linkDialogPlugin,
    linkPlugin,
    listsPlugin,
    ListsToggle,
    MDXEditor,
    quotePlugin,
    tablePlugin,
    thematicBreakPlugin,
    toolbarPlugin,
    UndoRedo
} from '@mdxeditor/editor';

interface MakrDownEditorProps {
    key: string;
    value: string;
    onChange: (value: string) => void;
    sx?: any;
}

function Separator() {
    return (
      <div
        data-orientation="vertical"
        aria-orientation="vertical"
        role="separator"
      />
    );
}

const StyledMDXEditor = styled(MDXEditor)<{ sx?: any }>`
    --baseBg: var(--vscode-badge-background);
    --basePageBg: var(--vscode-editorRuler-foreground);
    --baseBorderHover: var(--vscode-editor-inactiveSelectionBackground);
    --baseTextContrast: var(--vscode-editor-foreground);
    --baseBgActive: var(--vscode-breadcrumbPicker-background);
    --radius-medium: 0;
    --baseBorder: var(--vscode-list-hoverBackground);
    --baseBase: var(--vscode-editorWidget-foreground);
    --baseText: var(--vscode-editor-background);
    --spacing-1_5: 2px;
    --spacing-3: 0 15px;
    --radius-medium: none;
    color: var(--vscode-editor-foreground);
    background-color: var(--vscode-editor-background);
    border: 1px solid var(--vscode-list-hoverBackground);
    ${(props: MakrDownEditorProps) => props.sx};
`;
const ToolbarUR = styled(UndoRedo)`
    display: flex;
`;

export function MarkDownEditor(props: MakrDownEditorProps) {
    const { key, value, sx, onChange } = props;

    return (
        <StyledMDXEditor
            key={key}
            sx={sx}
            markdown={value || ""}
            onChange={onChange}
            plugins={[
                headingsPlugin(),
                listsPlugin(),
                linkPlugin(),
                quotePlugin(),
                thematicBreakPlugin(),
                codeBlockPlugin(),
                tablePlugin(),
                quotePlugin(),
                // diffSourcePlugin({ viewMode: "rich-text", diffMarkdown: "" }),
                linkDialogPlugin({}),
                tablePlugin(),
                toolbarPlugin({
                    toolbarContents: () => (
                        <>
                            <ToolbarUR />
                            <Separator />
                            <BoldItalicUnderlineToggles />
                            <CodeToggle />
                            <Separator />
                            <ListsToggle />
                            <Separator />
                            <BlockTypeSelect />
                            <Separator />
                            <CreateLink />
                            <InsertTable />
                        </>
                    )
                })
            ]}
        />
    );
}
