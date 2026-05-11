// ******************************************************************************
// Copyright 2026 TypeFox GmbH
// This program and the accompanying materials are made available under the
// terms of the MIT License, which is available in the project root.
// ******************************************************************************

import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Messenger, VsCodeApi } from 'vscode-messenger-webview';
import {
    ChatMessage,
    getHistory,
    messageReceived,
} from '../messages';
import '../../../../../node_modules/baukasten-ui/dist/baukasten-base.css';
import '../../../../../node_modules/baukasten-ui/dist/baukasten-vscode.css';
import './styles.css';
import { MessageInput } from './message-input';
import { getColorCss } from './utils';

declare const acquireVsCodeApi: () => VsCodeApi;

const vscodeApi = acquireVsCodeApi();
const messenger = new Messenger(vscodeApi);
messenger.start();

window.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('root');
    if (container) {
        const root = createRoot(container);
        root.render(<App />);
    }
});

const SCROLL_THRESHOLD_PX = 80;

let inSetupStage = true;

function App() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const messagesRef = useRef<HTMLDivElement>(null);

    const formatTime = (ts?: number) => {
        if (!ts) return '';
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    useEffect(() => {
        messenger
            .sendRequest(getHistory, { type: 'extension' })
            .then((history) => {
                // ensure history items have a timestamp (fallback to now)
                setMessages(history.map(h => ({ ...h, timestamp: h.timestamp ?? Date.now() })));
            });

        const onMessage =  messenger.onNotification(
            messageReceived,
            (message) => {
                inSetupStage = false;
                const msg = { ...message, timestamp: message.timestamp ?? Date.now() };
                setMessages((prev) => [...prev, msg]);
            },
        );

        return () => onMessage.dispose();
    }, []);

    React.useEffect(() => {
        if (messagesRef.current) {
            const isAtBottom =
                messagesRef.current.scrollHeight -
                    messagesRef.current.scrollTop <=
                messagesRef.current.clientHeight + SCROLL_THRESHOLD_PX;
            // only scroll to bottom if the message is ours or scroll was already at bottom
            if (
                inSetupStage ||
                messages[messages.length - 1]?.user === 'me' ||
                isAtBottom
            ) {
                messagesRef.current.scroll({
                    top: messagesRef.current.scrollHeight,
                    behavior: inSetupStage ? 'instant' : 'smooth',
                });
            }
        }
    }, [messages]);

    return (
        <div className="chat-container">
            <h2 className="title">Session Chat</h2>
            <div className="messages-container" ref={messagesRef}>
                {messages.map((msg, idx) => {
                    const prev = messages[idx - 1];
                    const showHeader = !prev || prev.user !== msg.user;
                    return (
                        <div key={idx} className={`message ${msg.user === 'me' ? 'me' : 'other'}`}>
                            {showHeader && (
                                <div className="message-header">
                                    {msg.user === 'me' ? (
                                        <span className="time">{formatTime(msg.timestamp)}</span>
                                    ) : (
                                        <>
                                            <span className="sender" style={{ color: getColorCss(msg.color) }}>{msg.user}{msg.isDirect ? '*' : ''}</span>
                                            <span className="time">{formatTime(msg.timestamp)}</span>
                                        </>
                                    )}
                                </div>
                            )}
                            <pre>{msg.message}</pre>
                        </div>
                    );
                })}
            </div>
            <MessageInput messenger={messenger} setMessages={setMessages} />
        </div>
    );
}

