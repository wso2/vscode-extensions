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

import React, { useState, useRef, useEffect } from "react";
import styled from "@emotion/styled";
import { Codicon } from "@wso2/ui-toolkit";

// Session types (will be imported from @wso2/mi-rpc-client after build)
export interface SessionSummary {
    sessionId: string;
    title: string;
    createdAt: string;
    lastModifiedAt: string;
    messageCount: number;
    isCurrentSession: boolean;
}

export interface GroupedSessions {
    today: SessionSummary[];
    yesterday: SessionSummary[];
    pastWeek: SessionSummary[];
    older: SessionSummary[];
}

// Styled components for session switcher
const SwitcherContainer = styled.div`
    position: relative;
    display: inline-block;
`;

const DropdownTrigger = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-widget-border, var(--vscode-input-border));
    border-radius: 8px;
    color: var(--vscode-foreground);
    cursor: pointer;
    font-size: 12px;
    max-width: 240px;
    transition: border-color 0.15s ease, background 0.15s ease;

    &:hover {
        background: var(--vscode-list-hoverBackground);
        border-color: var(--vscode-focusBorder);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const TriggerText = styled.span`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 185px;
    font-weight: 500;
`;

const Dropdown = styled.div<{ isOpen: boolean }>`
    position: absolute;
    top: 100%;
    right: 0;
    width: min(360px, calc(100vw - 40px));
    max-height: 430px;
    display: flex;
    flex-direction: column;
    background: var(--vscode-dropdown-background);
    border: 1px solid var(--vscode-widget-border, var(--vscode-dropdown-border));
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.22);
    z-index: 1000;
    display: ${(props: { isOpen: boolean }) => props.isOpen ? 'flex' : 'none'};
    margin-top: 4px;
    overflow: hidden;
`;

const SearchInput = styled.input`
    width: 100%;
    padding: 10px 12px;
    border: none;
    border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    font-size: 13px;
    box-sizing: border-box;

    &::placeholder {
        color: var(--vscode-input-placeholderForeground);
    }

    &:focus {
        outline: none;
    }
`;

const SessionList = styled.div`
    overflow-y: auto;
    max-height: 320px;

    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-thumb {
        background-color: var(--vscode-scrollbarSlider-background);
        border-radius: 3px;
    }
`;

const GroupHeader = styled.div`
    padding: 8px 12px;
    font-size: 10px;
    font-weight: 600;
    color: var(--vscode-descriptionForeground);
    background: var(--vscode-editorWidget-background);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-top: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
`;

const SessionItem = styled.div<{ isActive?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 9px 12px;
    cursor: pointer;
    border-left: 2px solid ${(props: { isActive?: boolean }) => props.isActive ? 'var(--vscode-focusBorder)' : 'transparent'};
    background: ${(props: { isActive?: boolean }) =>
        props.isActive ? 'var(--vscode-list-activeSelectionBackground)' : 'transparent'};
    color: ${(props: { isActive?: boolean }) =>
        props.isActive ? 'var(--vscode-list-activeSelectionForeground)' : 'inherit'};

    &:hover {
        background: ${(props: { isActive?: boolean }) =>
            props.isActive ? 'var(--vscode-list-activeSelectionBackground)' : 'var(--vscode-list-hoverBackground)'};
    }

    &:hover .delete-btn {
        opacity: 1;
    }
`;

const SessionMarker = styled.span<{ isActive?: boolean }>`
    display: inline-flex;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    background: ${(props: { isActive?: boolean }) =>
        props.isActive ? 'var(--vscode-focusBorder)' : 'var(--vscode-descriptionForeground)'};
    opacity: ${(props: { isActive?: boolean }) => props.isActive ? 1 : 0.5};
`;

const SessionInfo = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const SessionTitle = styled.span`
    font-size: 13px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const SessionTimestamp = styled.span`
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
`;

const DeleteButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    background: transparent;
    border: none;
    color: var(--vscode-descriptionForeground);
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s ease, color 0.15s ease;

    &:hover {
        color: var(--vscode-errorForeground);
    }
`;

const NewChatButton = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 11px 12px;
    border: none;
    border-top: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    background: transparent;
    color: var(--vscode-textLink-foreground);
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;

    &:hover {
        background: var(--vscode-list-hoverBackground);
    }
`;

const EmptyState = styled.div`
    padding: 22px 12px;
    text-align: center;
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
`;

interface SessionSwitcherProps {
    currentSessionId: string | null;
    sessions: GroupedSessions | null;
    currentSessionTitle: string;
    isLoading: boolean;
    onSessionSwitch: (sessionId: string) => void;
    onNewSession: () => void;
    onDeleteSession: (sessionId: string) => void;
    onRefresh: () => void;
}

/**
 * Format relative timestamp for display
 */
function formatRelativeTime(isoTimestamp: string): string {
    const date = new Date(isoTimestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;

    return date.toLocaleDateString();
}

/**
 * Session Switcher Component
 * Dropdown UI for browsing and switching between chat sessions
 */
const SessionSwitcher: React.FC<SessionSwitcherProps> = ({
    currentSessionId,
    sessions,
    currentSessionTitle,
    isLoading,
    onSessionSwitch,
    onNewSession,
    onDeleteSession,
    onRefresh
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    // Refresh sessions when dropdown opens
    useEffect(() => {
        if (isOpen) {
            onRefresh();
        }
    }, [isOpen]);

    const handleToggle = () => {
        if (!isLoading) {
            setIsOpen(!isOpen);
            setSearchQuery('');
        }
    };

    const handleSessionClick = (sessionId: string) => {
        onSessionSwitch(sessionId);
        setIsOpen(false);
    };

    const handleNewSession = () => {
        onNewSession();
        setIsOpen(false);
    };

    const handleDeleteClick = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        onDeleteSession(sessionId);
    };

    // Filter sessions by search query
    const filterSessions = (sessionList: SessionSummary[]): SessionSummary[] => {
        if (!searchQuery) return sessionList;
        const query = searchQuery.toLowerCase();
        return sessionList.filter(s => s.title.toLowerCase().includes(query));
    };

    const filteredSessions = sessions ? {
        today: filterSessions(sessions.today),
        yesterday: filterSessions(sessions.yesterday),
        pastWeek: filterSessions(sessions.pastWeek),
        older: filterSessions(sessions.older)
    } : null;

    const totalFiltered = filteredSessions
        ? filteredSessions.today.length + filteredSessions.yesterday.length +
          filteredSessions.pastWeek.length + filteredSessions.older.length
        : 0;

    const renderSessionGroup = (title: string, sessionList: SessionSummary[]) => {
        if (sessionList.length === 0) return null;

        return (
            <React.Fragment key={title}>
                <GroupHeader>{title}</GroupHeader>
                {sessionList.map(session => (
                    <SessionItem
                        key={session.sessionId}
                        isActive={session.isCurrentSession}
                        onClick={() => handleSessionClick(session.sessionId)}
                    >
                        <SessionMarker isActive={session.isCurrentSession} />
                        <SessionInfo>
                            <SessionTitle>{session.title}</SessionTitle>
                            <SessionTimestamp>
                                {formatRelativeTime(session.lastModifiedAt)}
                            </SessionTimestamp>
                        </SessionInfo>
                        {!session.isCurrentSession && (
                            <DeleteButton
                                className="delete-btn"
                                onClick={(e) => handleDeleteClick(e, session.sessionId)}
                                title="Delete session"
                            >
                                <Codicon name="trash" />
                            </DeleteButton>
                        )}
                    </SessionItem>
                ))}
            </React.Fragment>
        );
    };

    return (
        <SwitcherContainer ref={containerRef}>
            <DropdownTrigger onClick={handleToggle} disabled={isLoading}>
                <Codicon name="comment-discussion" />
                <TriggerText>{currentSessionTitle || 'New Chat'}</TriggerText>
                <Codicon name={isOpen ? 'chevron-up' : 'chevron-down'} />
            </DropdownTrigger>

            <Dropdown isOpen={isOpen}>
                <SearchInput
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search sessions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />

                <SessionList>
                    {filteredSessions && totalFiltered > 0 ? (
                        <>
                            {renderSessionGroup('Today', filteredSessions.today)}
                            {renderSessionGroup('Yesterday', filteredSessions.yesterday)}
                            {renderSessionGroup('Past Week', filteredSessions.pastWeek)}
                            {renderSessionGroup('Older', filteredSessions.older)}
                        </>
                    ) : (
                        <EmptyState>
                            {searchQuery ? 'No sessions match your search' : 'No chat sessions yet'}
                        </EmptyState>
                    )}
                </SessionList>

                <NewChatButton onClick={handleNewSession}>
                    <Codicon name="add" />
                    New Chat
                </NewChatButton>
            </Dropdown>
        </SwitcherContainer>
    );
};

export default SessionSwitcher;
