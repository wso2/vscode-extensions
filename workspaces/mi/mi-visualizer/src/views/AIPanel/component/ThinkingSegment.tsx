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

interface ThinkingSegmentProps {
    text: string;
    loading?: boolean;
}

const ThinkingSegment: React.FC<ThinkingSegmentProps> = ({ text, loading = false }) => {
    const [expanded, setExpanded] = useState(false);
    const hasText = text.trim().length > 0;
    const startTimeRef = useRef<number>(Date.now());
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    // Track elapsed time while thinking
    useEffect(() => {
        if (loading) {
            startTimeRef.current = Date.now();
            const interval = setInterval(() => {
                setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [loading]);

    // Active thinking state
    if (loading) {
        return (
            <div className="flex items-center gap-2 my-1.5" style={{ fontSize: "12.5px", color: "var(--vscode-descriptionForeground)" }}>
                <span className={`codicon codicon-chevron-right`} style={{ fontSize: "13px" }} />
                <span>
                    Thinking
                    <span className="inline-flex w-4 ml-0.5">
                        <span className="animate-fade-dot">.</span>
                        <span className="animate-fade-dot" style={{ animationDelay: "0.2s" }}>.</span>
                        <span className="animate-fade-dot" style={{ animationDelay: "0.4s" }}>.</span>
                    </span>
                </span>
            </div>
        );
    }

    // Completed thinking state - collapsible
    return (
        <div className="my-1.5">
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 border-none bg-transparent cursor-pointer transition-colors"
                style={{ fontSize: "12.5px", color: "var(--vscode-descriptionForeground)", padding: 0 }}
            >
                <span className={`codicon codicon-chevron-${expanded ? "down" : "right"}`} style={{ fontSize: "13px" }} />
                <span>Thought for {Math.max(1, elapsedSeconds)}s</span>
            </button>
            {expanded && (
                <div
                    className="ml-6 mt-2 pl-3 space-y-2 leading-relaxed"
                    style={{
                        fontSize: "12.5px",
                        color: "var(--vscode-descriptionForeground)",
                        borderLeft: "2px solid var(--vscode-panel-border)",
                    }}
                >
                    {hasText ? (
                        <p style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>{text.trim()}</p>
                    ) : (
                        <p style={{ fontStyle: "italic", margin: 0 }}>No reasoning details.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default ThinkingSegment;
