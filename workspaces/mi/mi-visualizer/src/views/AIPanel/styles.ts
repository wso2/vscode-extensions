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
import { VSCodeProgressRing, VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { EntryContainerProps } from "./types";

// Styles for the AI Panel
export const LoaderWrapper = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 50vh;
    width: 100%;
`;

export const ProgressRing = styled(VSCodeProgressRing)`
    height: 40px;
    width: 40px;
    margin-top: auto;
    padding: 4px;
`;

export const FadeInContainer = styled.div`
    opacity: 0;
    transition: opacity 0.5s ease-in;

    &.visible {
        opacity: 1;
    }
`;


// Styles for the AI Chat
export const Footer = styled.footer({
    padding: "0",
    backgroundColor: "var(--vscode-editor-background)",
    position: "sticky",
    bottom: "0",
    zIndex: 10,
});

export const FloatingInputContainer = styled.div({
    margin: "0 16px 20px 16px",
    padding: "8px 12px",
    backgroundColor: "var(--vscode-input-background)",
    border: "1px solid var(--vscode-widget-border)",
    borderRadius: "14px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
});

export const FlexRow = styled.div({
    display: "flex",
    flexDirection: "row",
});

export const FlexColumn = styled.div({
    display: "flex",
    flexDirection: "column",
});

export const Question = styled.div({
    marginBottom: "5px",
    padding: "10px",
    border: "0px solid",
    borderColor: "none",
    borderRadius: "5px",
    display: "flex",
    alignItems: "center",
});

export const AIChatView = styled.div({
    display: "flex",
    flexDirection: "column",
    height: "100%",
    position: "relative",
});

export const Header = styled.header({
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: "10px",
    gap: "10px",
});

export const HeaderButtons = styled.div({
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "4px",
    marginRight: "10px",
});

export const Main = styled.main({
    flex: 1,
    flexDirection: "column",
    overflowY: "auto",
    paddingBottom: "10px",
});

export const RoleContainer = styled.div({
    display: "flex",
    flexDirection: "row",
    gap: "6px",
});

export const ChatMessage = styled.div({
    padding: "4px 16px",
    position: "relative",
    "&:hover .edit-delete-buttons": {
        display: "flex",
    },
});

export const UserMessageBox = styled.div({
    backgroundColor: "rgba(128, 128, 128, 0.1)",
    color: "var(--vscode-editor-foreground)",
    borderRadius: "8px",
    padding: "8px 12px",
    fontSize: "var(--vscode-font-size)",
    fontFamily: "var(--vscode-font-family)",
    lineHeight: "1.4",
    maxWidth: "90%",
    marginLeft: "auto",
    "& p": {
        margin: "0",
    },
});

export const EditDeleteButtons = styled.div({
    display: "none",
    position: "absolute",
    bottom: "10px",
    right: "10px",
    gap: "5px",
});

export const Welcome = styled.div({
    padding: "0 20px",
});

export const Badge = styled.div`
    padding: 5px;
    display: inline-block;
    text-align: left;
`;

export const PreviewContainer = styled.div`
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    font-size: 0.8em;
    padding: 2px 5px;
    border-radius: 3px;
    display: inline-block;
    margin-left: 2px;
`;

export const PreviewContainerRole = styled.div`
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    font-size: 0.8em;
    margin-left: 2px;
    padding: 2px 5px;
    border-radius: 3px;
    display: inline-block;
`;

export const StyledContrastButton = styled(VSCodeButton)`
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    font-size: 0.8em;
    padding: 2px 5px;
    border-radius: 3px;
    &:hover {
        background-color: var(--vscode-button-hoverBackground);
    }
`;

export const StyledTransParentButton = styled.button`
    appearance: "secondary";
    font-size: 0.9em;
    padding: 5px;
    border-radius: 3px;
    width: 80px;
    background-color: transparent;
    border: none;
    display: flex;
    justify-content: center;
    align-items: center;

    &:hover {
        background-color: var(--vscode-editorWidget-border);
    }
`;

export const ResetsInBadge = styled.div`
    font-size: 10px;
`;

export const EntryContainer = styled.div<EntryContainerProps>(({ isOpen }: { isOpen: boolean }) => ({
    display: "flex",
    alignItems: "center",
    marginTop: "10px",
    cursor: "pointer",
    padding: "10px",
    backgroundColor: isOpen ? "var(--vscode-list-hoverBackground)" : "var(--vscode-editorHoverWidget-background)",
    "&:hover": {
        backgroundColor: "var(--vscode-list-hoverBackground)",
    },
}));

export const PreviewContainerDefault = styled.div`
    font-size: 0.6em;
    padding: 2px 5px;
    border-radius: 3px;
    display: inline-block;
    position: relative;
    right: 0;
    top: 10px;
    margin-right: -20px;
`;

export const WelcomeStyles = {
    container: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        marginTop: "100px",
    },
    title: {
        display: "inline-flex",
    },
    description: {
        marginBottom: "24px",
        color: "var(--vscode-descriptionForeground)",
        textAlign: "center",
        maxWidth: 350,
        fontSize: 14,
    },
    command: {
        marginBottom: "14px",
        color: "var(--vscode-descriptionForeground)",
        textAlign: "center",
        maxWidth: 350,
        fontSize: 14,
    },
    attachContext: {
        marginBottom: "24px",
        color: "var(--vscode-descriptionForeground)",
        textAlign: "center",
        maxWidth: 350,
        fontSize: 14,
        gap: 10,
        display: "inline-flex",
    },
};

export const StyledTextArea = styled.textarea`
    overflow-y: hidden;
    padding: 10px;
    border-radius: 4px;
    border: none;
    resize: none;
    outline: none;
    color: var(--vscode-input-foreground);
    position: relative;
    font-family: var(--vscode-font-family);
`;

export const RippleLoader = styled.div`
    width: 50px;
    height: 50px;
    display: inline-block;
    overflow: hidden;
    background: transparent;

    .ldio {
        width: 100%;
        height: 100%;
        position: relative;
        transform: translateZ(0) scale(1);
        backface-visibility: hidden;
        transform-origin: 0 0;

        div {
            position: absolute;
            border-width: 1.5px;
            border-style: solid;
            opacity: 1;
            border-radius: 50%;
            animation: ldio-animation 1s cubic-bezier(0, 0.2, 0.8, 1) infinite;
            box-sizing: content-box;
        }

        div:nth-child(1) {
            border-color: #0c93e9;
            animation-delay: 0s;
        }

        div:nth-child(2) {
            border-color: #468af0;
            animation-delay: -0.5s;
        }
    }

    @keyframes ldio-animation {
        0% {
            top: 24px; // Adjusted for smaller size
            left: 24px; // Adjusted for smaller size
            width: 0;
            height: 0;
            opacity: 1;
        }
        100% {
            top: 4.5px; // Adjusted for smaller size
            left: 4.5px; // Adjusted for smaller size
            width: 39px; // Adjusted for smaller size
            height: 39px; // Adjusted for smaller size
            opacity: 0;
        }
    }
`;
