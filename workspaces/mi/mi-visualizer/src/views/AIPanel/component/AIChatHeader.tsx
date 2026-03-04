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
import { LoginMethod } from "@wso2/mi-core";
import { Badge, Header, HeaderButtons, ResetsInBadge } from '../styles';
import { useMICopilotContext } from "./MICopilotContext";
import SessionSwitcher from "./SessionSwitcher";

/**
 * Header component for the chat interface
 * Shows session switcher, token information, and action buttons
 */
const AIChatHeader: React.FC = () => {
  const {
    rpcClient,
    tokenInfo,
    backendRequestTriggered,
    // Session management
    currentSessionId,
    currentSessionTitle,
    sessions,
    isSessionsLoading,
    refreshSessions,
    switchToSession,
    createNewSession,
    deleteSession
  } = useMICopilotContext();
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isAwsBedrock, setIsAwsBedrock] = useState(false);

  const handleLogout = async () => {
    await rpcClient?.getMiDiagramRpcClient().logoutFromMIAccount();
  };

  const checkApiKey = async () => {
    const hasApiKey = await rpcClient?.getMiAiPanelRpcClient().hasAnthropicApiKey();
    setHasApiKey(hasApiKey);
    // Check if specifically using AWS Bedrock
    const machineView = await rpcClient?.getAIVisualizerState();
    setIsAwsBedrock(machineView?.loginMethod === LoginMethod.AWS_BEDROCK);
  };

  // Check for API key on component mount
  useEffect(() => {
    checkApiKey();
  }, [rpcClient]);

  const isLoading = backendRequestTriggered || isSessionsLoading;

  return (
      <Header>
          <Badge>
              {hasApiKey ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Codicon name="key" />
                          {isAwsBedrock ? "Copilot is using your AWS Bedrock Account" : "Copilot is using your API Key"}
                      </div>
                      <ResetsInBadge>{isAwsBedrock ? "Logout to clear the credentials" : "Logout to clear the API key"}</ResetsInBadge>
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
              <SessionSwitcher
                  currentSessionId={currentSessionId}
                  sessions={sessions}
                  currentSessionTitle={currentSessionTitle}
                  isLoading={isLoading}
                  onSessionSwitch={switchToSession}
                  onNewSession={createNewSession}
                  onDeleteSession={deleteSession}
                  onRefresh={refreshSessions}
              />
              <Button appearance="icon" onClick={handleLogout} tooltip="Logout" disabled={isLoading}>
                  <Codicon name="sign-out" />
                  &nbsp;&nbsp;Logout
              </Button>
          </HeaderButtons>
      </Header>
  );
};

export default AIChatHeader;
