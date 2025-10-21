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

import React, { useState, useEffect } from "react";
import { Button, Codicon } from "@wso2/ui-toolkit";
import { Badge, Header, HeaderButtons, ResetsInBadge } from '../styles';
import { useMICopilotContext } from "./MICopilotContext";

/**
 * Header component for the chat interface
 * Shows token information and action buttons
 */
const AIChatHeader: React.FC = () => {
  const { rpcClient, setChatClearEventTriggered, tokenInfo, chatClearEventTriggered, backendRequestTriggered} = useMICopilotContext();
  const [hasApiKey, setHasApiKey] = useState(false);

  const handleLogout = async () => {
    await rpcClient?.getMiDiagramRpcClient().logoutFromMIAccount();
  };

  const handleSetApiKey = async () => {
    await rpcClient?.getMiAiPanelRpcClient().setAnthropicApiKey();
    // Check again after setting the API key
    checkApiKey();
  };

  const checkApiKey = async () => {
    const hasApiKey = await rpcClient?.getMiAiPanelRpcClient().hasAnthropicApiKey();
    setHasApiKey(hasApiKey);
  };

  // Check for API key on component mount
  useEffect(() => {
    checkApiKey();
  }, [rpcClient]);

  const isLoading = chatClearEventTriggered || backendRequestTriggered;

  return (
      <Header>
          <Badge>
              {hasApiKey ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Codicon name="key" />
                          Copilot is using your API Key
                      </div>
                      <ResetsInBadge>Logout to clear the API key</ResetsInBadge>
                  </div>
              ) : (
                  <>
                      Remaining Free Usage:{" "}
                      {tokenInfo.remainingPercentage === -1
                          ? "Unlimited"
                          : tokenInfo.isLessThanOne
                          ? "<1%"
                          : `${tokenInfo.remainingPercentage}%`}
                      <br />
                      <ResetsInBadge>
                          {tokenInfo.remainingPercentage !== -1 &&
                              `Resets in: ${
                                  tokenInfo.timeToReset < 1 ? "< 1 day" : `${Math.round(tokenInfo.timeToReset)} days`
                              }`}
                      </ResetsInBadge>
                  </>
              )}
          </Badge>
          <HeaderButtons>
              <Button
                  appearance="icon"
                  onClick={() => setChatClearEventTriggered(true)}
                  tooltip="Clear Chat"
                  disabled={isLoading}
              >
                  <Codicon name="clear-all" />
                  &nbsp;&nbsp;Clear
              </Button>
              <Button 
                  appearance="icon" 
                  onClick={handleSetApiKey} 
                  tooltip="Set Anthropic API Key for Unlimited Usage" 
                  disabled={isLoading}
              >
                  <Codicon name="key" />
                  &nbsp;&nbsp;API Key
              </Button>
              <Button appearance="icon" onClick={handleLogout} tooltip="Logout" disabled={isLoading}>
                  <Codicon name="sign-out" />
                  &nbsp;&nbsp;Logout
              </Button>
          </HeaderButtons>
      </Header>
  );
};

export default AIChatHeader;
