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
import styled from '@emotion/styled';

// Source: https://github.com/PrismJS/prism-themes/blob/master/themes/prism-vsc-dark-plus.css
export const StyledPre = styled.pre`
    color: var(--vscode-editor-foreground);
    font-size: 13px;
    text-shadow: none;
    font-family: Menlo, Monaco, Consolas, "Andale Mono", "Ubuntu Mono", "Courier New", monospace;
    direction: ltr;
    text-align: left;
    white-space: pre;
    word-spacing: normal;
    word-break: normal;
    line-height: 1.5;
    -moz-tab-size: 4;
    -o-tab-size: 4;
    tab-size: 4;
    -webkit-hyphens: none;
    -moz-hyphens: none;
    -ms-hyphens: none;
    hyphens: none;
    padding: 1em;
    margin: .5em 0;
    overflow: auto;
    background: var(--vscode-editor-background);

    &::selection,
    & *::selection {
        text-shadow: none;
        background: var(--vscode-editor-selectionBackground);
    }

    @media print {
        text-shadow: none;
    }

    & > code[class*="language-"] {
        position: relative;
        z-index: 1;
    }
`;

export const StyledCode = styled.code`
    color: var(--vscode-editor-foreground);
    font-size: 13px;
    text-shadow: none;
    font-family: Menlo, Monaco, Consolas, "Andale Mono", "Ubuntu Mono", "Courier New", monospace;
    direction: ltr;
    text-align: left;
    white-space: pre;
    word-spacing: normal;
    word-break: normal;
    line-height: 1.5;
    -moz-tab-size: 4;
    -o-tab-size: 4;
    tab-size: 4;
    -webkit-hyphens: none;
    -moz-hyphens: none;
    -ms-hyphens: none;
    hyphens: none;

    &::selection {
        text-shadow: none;
        background: var(--vscode-editor-selectionBackground);
    }

    &:not(pre) > & {
        padding: .1em .3em;
        border-radius: .3em;
        color: var(--vscode-terminal-ansiBrightRed);
        background: var(--vscode-editor-background);
    }

    /* Token styles */
    .namespace {
        opacity: 0.7;
    }

    .token.doctype .token.doctype-tag {
	    color: var(--vscode-debugView-valueChangedHighlight);
    }

    .token.doctype .token.name {
        color: var(--vscode-debugConsole-infoForeground);
    }

    .token.comment,
    .token.prolog {
        color: var(--vscode-gitDecoration-addedResourceForeground);
    }

    .language-javascript .language-jsx .language-typescript .language-tsx {
        color: var(--vscode-debugIcon-stepOverForeground);
    }

    .language-css .language-css {
        color: var(--vscode-debugTokenExpression-string);
    }
    .language-html .token.punctuation{
        color: var(--vscode-editor-foreground);
    }

    .token.punctuation,
    .language-html .language-css .token.punctuation,
    .language-html .language-javascript .token.punctuation {
        color: var(--vscode-editor-foreground);
    }

    .token.property,
    .token.tag,
    .token.boolean,
    .token.number,
    .token.constant,
    .token.symbol,
    .token.inserted,
    .token.unit {
        color: var(--vscode-debugTokenExpression-number);
    }

    .token.selector,
    .token.attr-name,
    .token.string,
    .token.char,
    .token.builtin,
    .token.deleted {
        color: var(--vscode-debugTokenExpression-string);
    }

    .language-css .token.string.url {
        text-decoration: underline;
    }

    .token.operator,
    .token.entity {
        color: var(--vscode-editorSuggestWidget-foreground);
    }

    .token.operator.arrow {
        color: var(--vscode-debugView-valueChangedHighlight);
    }

    .token.atrule {
        color: var(--vscode-debugTokenExpression-string);
    }

    .token.atrule .token.rule {
        color: var(--vscode-debugTokenExpression-name);
    }

    .token.atrule .token.url {
        color: var(--vscode-debugIcon-stepBackForeground);
    }

    .token.atrule .token.url .token.function {
        color: var(--vscode-debugTokenExpression-number);
    }

    .token.atrule .token.url .token.punctuation {
        color: var(--vscode-editorSuggestWidget-foreground);
    }

    .token.keyword {
        color: var(--vscode-debugView-valueChangedHighlight);
    }

    .token.keyword.module,
    .token.keyword.control-flow {
        color: var(--vscode-debugTokenExpression-name);
    }

    .token.function,
    .token.function .token.maybe-class-name {
        color: var(--vscode-debugTokenExpression-number);
    }

    .token.regex {
        color: var(--vscode-terminal-ansiBrightRed);
    }

    .token.important {
        color: var(--vscode-debugView-valueChangedHighlight);
    }

    .token.italic {
        font-style: italic;
    }

    .token.constant {
        color: var(--vscode-debugConsole-infoForeground);
    }

    .token.class-name,
    .token.maybe-class-name {
        color: var(--vscode-terminal-ansiGreen);
    }

    .token.console {
        color: var(--vscode-debugConsole-infoForeground);
    }

    .token.parameter {
        color: var(--vscode-debugConsole-infoForeground);
    }

    .token.interpolation {
        color: var(--vscode-debugConsole-infoForeground);
    }

    .token.punctuation.interpolation-punctuation {
        color: var(--vscode-debugView-valueChangedHighlight);
    }

    .token.boolean {
        color: var(--vscode-debugView-valueChangedHighlight);
    }

    .token.property,
    .token.variable,
    .token.imports .token.maybe-class-name,
    .token.exports .token.maybe-class-name {
        color: var(--vscode-debugConsole-infoForeground);
    }

    .token.selector {
        color: var(--vscode-textPreformat-foreground);
    }

    .token.escape {
        color: var(--vscode-textPreformat-foreground)
    }

    .token.tag {
        color: var(--vscode-debugView-valueChangedHighlight);
    }

    .token.tag .token.punctuation {
        color: var(--vscode-list-deemphasizedForeground);
    }

    .token.cdata {
        color: var(--vscode-list-deemphasizedForeground);
    }

    .token.attr-name {
        color: var(--vscode-list-deemphasizedForeground);
    }

    .token.attr-value,
    .token.attr-value .token.punctuation {
        color: var(--vscode-debugTokenExpression-string);
    }

    .token.attr-value .token.punctuation.attr-equals {
        color: var(--vscode-editor-foreground);
    }

    .token.entity {
        color: var(--vscode-debugView-valueChangedHighlight);
    }

    .token.namespace {
        color: var(--vscode-notebookStatusSuccessIcon-foreground);
    }
`;
