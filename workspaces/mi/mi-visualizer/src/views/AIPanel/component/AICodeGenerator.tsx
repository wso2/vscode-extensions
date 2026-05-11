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

import { useRef, useState, useEffect } from "react";
import { useMICopilotContext } from "./MICopilotContext";
import { WelcomeMessage } from './WelcomeMessage';
import AIChatHeader from './AIChatHeader';
import AIChatFooter from './AIChatFooter';
import AIChatMessage from './AIChatMessage';
import SettingsPanel from './SettingsPanel';
import CheckpointIndicator from './CheckpointIndicator';
import FileChangesSegment from './FileChangesSegment';
import { AIChatView } from '../styles';
import { LoginMethod, Role } from "@wso2/mi-core";


interface AICodeGeneratorProps {
  isUsageExceeded?: boolean;
}

/**
 * Main chat component with integrated MICopilot Context provider
 */
export function AICodeGenerator({ isUsageExceeded = false }: AICodeGeneratorProps) {
  const { messages, pendingReview, rpcClient, backendRequestTriggered } = useMICopilotContext();
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isByok, setIsByok] = useState(false);
  // Bedrock specifically — used by SettingsPanel to gate the Tavily/web-search controls.
  // Distinct from isByok (which is true for any "pays-per-request" auth method).
  const [isAwsBedrock, setIsAwsBedrock] = useState(false);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Ignore scroll events produced by our own scrollIntoView so smooth-scroll
  // animation ticks don't flip isAtBottom=false mid-stream and freeze the UI.
  const programmaticScrollRef = useRef(false);
  const programmaticScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check BYOK status for settings panel
  useEffect(() => {
      let cancelled = false;
      const checkByok = async () => {
          if (!rpcClient) {
              return;
          }
          try {
              const [hasApiKey, machineView] = await Promise.all([
                  rpcClient.getMiAiPanelRpcClient().hasAnthropicApiKey(),
                  rpcClient.getAIVisualizerState(),
              ]);
              if (cancelled) {
                  return;
              }
              const isBedrock = machineView?.loginMethod === LoginMethod.AWS_BEDROCK;
              setIsByok(!!hasApiKey || isBedrock);
              setIsAwsBedrock(isBedrock);
          } catch (error) {
              console.error('[AICodeGenerator] Failed to resolve BYOK / Bedrock state', error);
          }
      };
      checkByok();
      return () => {
          cancelled = true;
      };
  }, [rpcClient]);

  const beginProgrammaticScroll = (durationMs: number) => {
      programmaticScrollRef.current = true;
      if (programmaticScrollTimerRef.current) {
          clearTimeout(programmaticScrollTimerRef.current);
      }
      programmaticScrollTimerRef.current = setTimeout(() => {
          programmaticScrollRef.current = false;
          programmaticScrollTimerRef.current = null;
      }, durationMs);
  };

  useEffect(() => {
      return () => {
          if (programmaticScrollTimerRef.current) {
              clearTimeout(programmaticScrollTimerRef.current);
          }
      };
  }, []);

  // Check if the chat is scrolled to the bottom
  useEffect(() => {
      const container = mainContainerRef.current;
      if (!container) return;

      const handleScroll = () => {
          // Suppression is cleared by the explicit user-intent listeners below,
          // so a real scroll seen while suppression is still active is some
          // element's residual settle and can be ignored.
          if (programmaticScrollRef.current) return;
          const { scrollTop, scrollHeight, clientHeight } = container;
          if (scrollHeight - scrollTop <= clientHeight + 50) {
              setIsAtBottom(true);
          } else {
              setIsAtBottom(false);
          }
      };

      // Explicit user-intent listeners. scrollIntoView emits trusted scroll
      // events too, so `event.isTrusted` can't distinguish user vs programmatic
      // scrolls. Wheel/touchstart/pointerdown are only ever fired by real user
      // input, so we use them to cancel suppression immediately.
      const cancelSuppression = () => {
          if (programmaticScrollTimerRef.current) {
              clearTimeout(programmaticScrollTimerRef.current);
              programmaticScrollTimerRef.current = null;
          }
          programmaticScrollRef.current = false;
      };

      container.addEventListener("scroll", handleScroll, { passive: true });
      container.addEventListener("wheel", cancelSuppression, { passive: true });
      container.addEventListener("touchstart", cancelSuppression, { passive: true });
      container.addEventListener("pointerdown", cancelSuppression, { passive: true });
      return () => {
          container.removeEventListener("scroll", handleScroll);
          container.removeEventListener("wheel", cancelSuppression);
          container.removeEventListener("touchstart", cancelSuppression);
          container.removeEventListener("pointerdown", cancelSuppression);
      };
  }, []);

  // Scroll to the bottom of the chat when new messages are added.
  // Use instant scroll while streaming to avoid the smooth-scroll race that
  // otherwise lets rapid content growth flip isAtBottom=false mid-animation.
  useEffect(() => {
      if (!isAtBottom || !messagesEndRef.current) return;
      const behavior: ScrollBehavior = backendRequestTriggered ? "auto" : "smooth";
      beginProgrammaticScroll(behavior === "smooth" ? 500 : 80);
      messagesEndRef.current.scrollIntoView({ behavior, block: "end" });
  }, [messages, pendingReview, isAtBottom, backendRequestTriggered]);

  // Keep the viewport pinned to the bottom when async content (markdown,
  // syntax-highlighted code blocks, thinking segments) grows the container
  // without firing a scroll event. We observe the inner content wrapper
  // because the outer <main> has fixed flex:1 dimensions — its size doesn't
  // change when children grow, so a ResizeObserver on it wouldn't fire for
  // scrollHeight changes.
  useEffect(() => {
      const content = contentRef.current;
      if (!content || !isAtBottom) return;
      const ro = new ResizeObserver(() => {
          if (!messagesEndRef.current) return;
          beginProgrammaticScroll(80);
          messagesEndRef.current.scrollIntoView({ block: "end" });
      });
      ro.observe(content);
      return () => ro.disconnect();
  }, [isAtBottom]);

  const handleJumpToLatest = () => {
      setIsAtBottom(true);
      if (messagesEndRef.current) {
          beginProgrammaticScroll(80);
          messagesEndRef.current.scrollIntoView({ block: "end" });
      }
  };

  // Full-panel settings view
  if (showSettings) {
      return (
          <AIChatView>
              <SettingsPanel onClose={() => setShowSettings(false)} isByok={isByok} isAwsBedrock={isAwsBedrock} />
          </AIChatView>
      );
  }

  return (
          <AIChatView>
              <AIChatHeader onOpenSettings={() => setShowSettings(true)} />

              <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                  <main style={{ flex: 1, overflowY: "auto" }} ref={mainContainerRef}>
                      <div ref={contentRef}>
                          {Array.isArray(messages) && messages.length === 0 && <WelcomeMessage />}

                          {Array.isArray(messages) && messages.map((message, index) => {
                              const checkpointId = message.role === Role.MIUser
                                  ? message.checkpointAnchorId
                                  : undefined;

                              return (
                                  <div key={`${typeof message.id === "number" ? message.id : "msg"}-${message.role}-${index}`} className="group/turn">
                                      {checkpointId && <CheckpointIndicator targetCheckpointId={checkpointId} />}
                                      <AIChatMessage
                                          message={message}
                                          index={index}
                                      />
                                  </div>
                              );
                          })}

                          <FileChangesSegment />
                          <div ref={messagesEndRef} />
                      </div>
                  </main>

                  {!isAtBottom && (
                      <button
                          type="button"
                          onClick={handleJumpToLatest}
                          title="Jump to latest"
                          aria-label="Jump to latest messages"
                          style={{
                              position: "absolute",
                              bottom: 12,
                              right: 16,
                              padding: "4px 10px",
                              borderRadius: 12,
                              background: "var(--vscode-button-background)",
                              color: "var(--vscode-button-foreground)",
                              border: "1px solid var(--vscode-button-border, transparent)",
                              cursor: "pointer",
                              fontSize: 11,
                              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.25)",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              zIndex: 10,
                          }}
                      >
                          <span className="codicon codicon-arrow-down" style={{ fontSize: 12 }} />
                          Jump to latest
                      </button>
                  )}
              </div>

              <AIChatFooter isUsageExceeded={isUsageExceeded} />
          </AIChatView>
  );
}

export default AICodeGenerator;
