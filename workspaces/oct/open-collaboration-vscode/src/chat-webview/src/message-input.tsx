// ******************************************************************************
// Copyright 2026 TypeFox GmbH
// This program and the accompanying materials are made available under the
// terms of the MIT License, which is available in the project root.
// ******************************************************************************
import * as React from 'react';
import { ChatMessage, getUsers, isWriting, sendMessage, usersChanged } from '../messages';
import { Messenger } from 'vscode-messenger-webview';
import { Button, ButtonGroup, Menu, MenuItem, TextArea } from 'baukasten-ui';
import { useState } from 'react';
import { PeerWithColor } from '../../collaboration-instance';
import { getColorCss } from './utils';
import { throttle } from 'lodash';
import { IoSend } from 'react-icons/io5';

const MAX_INPUT_ROWS = 4;

const WRITING_NOTIFICATION_DEBOUNCE_MS = 2000;
const WRITING_NOTIFICATION_SEND_THROTTLE_MS = 1000;

export type MessageInputProps = {
    messenger: Messenger;
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
};

export function MessageInput({ messenger, setMessages }: MessageInputProps) {
    const [input, setInput] = useState('');
    const [directMessageOpen, setDirectMessageOpen] = useState(false);
    const [selectedTarget, setSelectedTarget] = useState<string | undefined>(undefined);
    const [users, setUsers] = useState<PeerWithColor[]>([]);
    const [usersWriting, setUsersWriting] = useState<Record<string, NodeJS.Timeout>>({});

    React.useEffect(() => {

        messenger.sendRequest(getUsers, { type: 'extension' }).then((users) => {
            setUsers(users);
        });

        const onUsersChanged = messenger.onNotification(
            usersChanged,
            (users) => {
                setUsers(users);
            },
        );

        const onIsWriting = messenger.onNotification(
            isWriting,
            (userId) => {
                if(!userId) {
                    return;
                }

                setUsersWriting((prev) => {
                    if (prev[userId]) {
                        clearTimeout(prev[userId]);
                    }
                    const timeout = setTimeout(() => {
                        setUsersWriting((prev) => {
                            const newState = { ...prev };
                            delete newState[userId];
                            return newState;
                        });
                    }, WRITING_NOTIFICATION_DEBOUNCE_MS);
                    return { ...prev, [userId]: timeout };
                });
            });

        return () => {
            onUsersChanged.dispose();
            onIsWriting.dispose();
        };
    }, []);

    const sendChatMessage = React.useCallback(
        (target?: string) => {
            const trimmed = input.trim();
            if (trimmed) {
                messenger.sendNotification(
                    sendMessage,
                    { type: 'extension' },
                    { message: trimmed, target },
                );
                setMessages((prev) => [
                    ...prev,
                    { user: 'me', message: trimmed, isDirect: !!target, timestamp: Date.now() },
                ]);
                setInput('');
            }
        },
        [input, messenger],
    );
    
    const sendWritingNotification = React.useCallback(throttle(() => {
        messenger.sendNotification(isWriting, { type: 'extension' });
    }, WRITING_NOTIFICATION_SEND_THROTTLE_MS), [messenger]);

    return (
        <div className="messageInputContainer">
            <div className='inputArea'>
                <div className="recipientRow">
                    <span className="recipientLabel">To:</span>
                    <ButtonGroup.Dropdown
                        variant="secondary"
                        className="recipientDropdown"
                        open={directMessageOpen}
                        onOpenChange={setDirectMessageOpen}
                        content={
                            <Menu>
                                <MenuItem
                                    key="everyone"
                                    onClick={() => {
                                        setSelectedTarget(undefined);
                                        setDirectMessageOpen(false);
                                    }}
                                >
                                    Everyone
                                </MenuItem>
                                {users.map((user) => (
                                    <MenuItem
                                        key={user.id}
                                        onClick={() => {
                                            setSelectedTarget(user.id);
                                            setDirectMessageOpen(false);
                                        }}
                                    >
                                        <span
                                            style={{
                                                color: getColorCss(user.color),
                                            }}
                                        >
                                            {user.name}
                                        </span>
                                    </MenuItem>
                                ))}
                            </Menu>
                        }
                    >
                        {selectedTarget ? users.find((u) => u.id === selectedTarget)?.name ?? 'Everyone' : 'Everyone'}
                    </ButtonGroup.Dropdown>
                </div>
                {Object.keys(usersWriting).length > 0 && (
                    <div className="writingIndicator">
                        {Object.keys(usersWriting).map((userId) => {
                            const user = users.find((u) => u.id === userId);
                            return user ? user.name : 'Unknown';
                        }).join(', ')}
                        {Object.keys(usersWriting).length === 1 ? ' is writing...' : ' are writing...'}
                    </div>
                )}
                <TextArea
                    className="messageInput"
                    value={input}
                    resize="none"
                    rows={Math.min(MAX_INPUT_ROWS, input.split('\n').length || 1)}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                        setInput(e.target.value);
                        sendWritingNotification();
                    }}
                    onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                        if (e.key === 'Enter') {           
                            // Shift+Enter -> newline (do nothing)
                            if (e.shiftKey) {
                                return;
                            }

                            // Enter (or Ctrl+Enter) -> send
                            e.preventDefault();
                            sendChatMessage(selectedTarget);
                        }
                    }}
                    placeholder="Type a message..."
                ></TextArea>
            </div>
            <ButtonGroup className="sendButtonGroup">
                <Button
                    className="sendButton"
                    onClick={() => sendChatMessage(selectedTarget)}
                    aria-label="Send"
                    title="Send"
                >
                    <IoSend aria-hidden="true" />
                </Button>
            </ButtonGroup>
        </div>
    );
}
