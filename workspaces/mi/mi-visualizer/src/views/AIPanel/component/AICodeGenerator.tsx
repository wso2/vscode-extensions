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
import { AIChatView } from '../styles';
import { LoginMethod, Role } from "@wso2/mi-core";


interface AICodeGeneratorProps {
  isUsageExceeded?: boolean;
}

/**
 * Main chat component with integrated MICopilot Context provider
 */
export function AICodeGenerator({ isUsageExceeded = false }: AICodeGeneratorProps) {
  const { messages, rpcClient } = useMICopilotContext();
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isByok, setIsByok] = useState(false);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check BYOK status for settings panel
  useEffect(() => {
      const checkByok = async () => {
          const hasApiKey = await rpcClient?.getMiAiPanelRpcClient().hasAnthropicApiKey();
          if (hasApiKey) {
              setIsByok(true);
          } else {
              const machineView = await rpcClient?.getAIVisualizerState();
              setIsByok(machineView?.loginMethod === LoginMethod.AWS_BEDROCK);
          }
      };
      checkByok();
  }, [rpcClient]);

  // Check if the chat is scrolled to the bottom
  useEffect(() => {
      const container = mainContainerRef.current;
      if (container) {
          const handleScroll = () => {
              const { scrollTop, scrollHeight, clientHeight } = container;
              if (scrollHeight - scrollTop <= clientHeight + 50) {
                  setIsAtBottom(true);
              } else {
                  setIsAtBottom(false);
              }
          };

          container.addEventListener("scroll", handleScroll);
          return () => {
              container.removeEventListener("scroll", handleScroll);
          };
      }
  }, []);

  // Scroll to the bottom of the chat when new messages are added
  useEffect(() => {
      if (isAtBottom && messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      }
  }, [messages, isAtBottom]);

  // Full-panel settings view
  if (showSettings) {
      return (
          <AIChatView>
              <SettingsPanel onClose={() => setShowSettings(false)} isByok={isByok} />
          </AIChatView>
      );
  }

  return (
          <AIChatView>
              <AIChatHeader onOpenSettings={() => setShowSettings(true)} />

              <main style={{ flex: 1, overflowY: "auto" }} ref={mainContainerRef}>
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

                  <div ref={messagesEndRef} />
              </main>

              <AIChatFooter isUsageExceeded={isUsageExceeded} />
          </AIChatView>
  );
}

export default AICodeGenerator;
