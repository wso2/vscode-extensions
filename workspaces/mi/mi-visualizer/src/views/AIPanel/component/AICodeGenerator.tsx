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
import { AIChatView } from '../styles';


interface AICodeGeneratorProps {
  isUsageExceeded?: boolean;
}

/**
 * Main chat component with integrated MICopilot Context provider
 */
export function AICodeGenerator({ isUsageExceeded = false }: AICodeGeneratorProps) {
  const { messages } = useMICopilotContext();
  const [isAtBottom, setIsAtBottom] = useState(true);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  return (
          <AIChatView>
              <AIChatHeader />

              <main style={{ flex: 1, overflowY: "auto" }} ref={mainContainerRef}>
                  {Array.isArray(messages) && messages.length === 0 && <WelcomeMessage />}

                  {Array.isArray(messages) && messages.map((message, index) => (
                      <AIChatMessage
                          key={`${typeof message.id === "number" ? message.id : "msg"}-${message.role}-${index}`}
                          message={message}
                          index={index}
                      />
                  ))}

                  <div ref={messagesEndRef} />
              </main>

              <AIChatFooter isUsageExceeded={isUsageExceeded} />
          </AIChatView>
  );
}

export default AICodeGenerator;
