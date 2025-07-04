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

import React from "react";
import { Button, Codicon } from "@wso2/ui-toolkit";
import { Badge, Header, HeaderButtons, ResetsInBadge } from '../styles';
import { useMICopilotContext } from "./MICopilotContext";

/**
 * Header component for the chat interface
 * Shows token information and action buttons
 */
const AIChatHeader: React.FC = () => {
  const { rpcClient, setChatClearEventTriggered, tokenInfo, chatClearEventTriggered, backendRequestTriggered} = useMICopilotContext();

  const handleLogout = async () => {
    await rpcClient?.getMiDiagramRpcClient().logoutFromMIAccount();
  };

  const isLoading = chatClearEventTriggered || backendRequestTriggered;

  return (
      <Header>
          <Badge>
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
              <Button appearance="icon" onClick={handleLogout} tooltip="Logout" disabled={isLoading}>
                  <Codicon name="sign-out" />
                  &nbsp;&nbsp;Logout
              </Button>
          </HeaderButtons>
      </Header>
  );
};

export default AIChatHeader;
