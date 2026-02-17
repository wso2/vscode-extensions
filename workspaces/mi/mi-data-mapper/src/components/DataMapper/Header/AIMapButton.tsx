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
import React, { useEffect, useState } from "react";
import styled from "@emotion/styled";
import { Button } from "@wso2/ui-toolkit";
import { Codicon } from "@wso2/ui-toolkit";
import { useVisualizerContext } from '@wso2/mi-rpc-client';

interface AIMapButtonProps {
  onClick: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

const ButtonContainer = styled.div`
  display: flex;
  align-items: center;
  margin-left: 5px;
`;

const StyledButton = styled(Button) <{ isLoading: boolean }>`
  box-sizing: border-box;
  box-shadow: 0px 1px 2px var(--vscode-widget-shadow);
  border-radius: 3px;
  color: ${({ isLoading }) => (isLoading ? "var(--vscode-button-foreground)" : "var(--vscode-editor-foreground)")};
  font-size: smaller;
  height: 30px;
  font-weight: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  min-width: 80px;
`;

const AIMapButton: React.FC<AIMapButtonProps> = ({ onClick, isLoading, disabled = false }) => {
  var [remainingTokenLessThanOne, setRemainingTokenLessThanOne] = useState(false);
  var [remainingTokenPercentage, setRemainingTokenPercentage] = useState<number | "Unlimited" | null>(null);
  var [usageResetText, setUsageResetText] = useState<string>("");

  const { rpcClient } = useVisualizerContext();

  useEffect(() => {
    rpcClient.getAIVisualizerState()
      .then((machineView: any) => {
        const userTokens = machineView?.userTokens ?? machineView?.usage;
        if (userTokens) {
          const remainingUsagePercentage = userTokens.remainingUsagePercentage;
          if (remainingUsagePercentage === -1) {
            setRemainingTokenPercentage("Unlimited");
            setRemainingTokenLessThanOne(false);
            setUsageResetText("");
          } else {
            const percentage = typeof remainingUsagePercentage === "number"
              ? Math.max(0, Math.min(100, remainingUsagePercentage))
              : NaN;
            if (percentage < 1 && percentage > 0) {
              setRemainingTokenLessThanOne(true);
            } else {
              setRemainingTokenLessThanOne(false);
            }
            setRemainingTokenPercentage(Number.isNaN(percentage) ? null : Math.round(percentage));

            const resetsIn = userTokens.resetsIn;
            if (typeof resetsIn === "number" && resetsIn > 0) {
              const days = Math.ceil(resetsIn / (60 * 60 * 24));
              setUsageResetText(`${days} day${days === 1 ? "" : "s"}`);
            } else {
              setUsageResetText("");
            }
          }
        } else {
          // Handle the case when machineView or userTokens is undefined
          setRemainingTokenPercentage(null);
          setRemainingTokenLessThanOne(false);
          setUsageResetText("");
        }
      })
      .catch((error) => {
        // Handle errors from the API call
        console.error("Error fetching AI Visualizer State:", error);
        setRemainingTokenPercentage(null);
        setRemainingTokenLessThanOne(false);
        setUsageResetText("");
      });
  }, []);

  var tokenUsageText =
    remainingTokenPercentage === "Unlimited"
      ? "Unlimited"
      : (remainingTokenLessThanOne && typeof remainingTokenPercentage === "number" && remainingTokenPercentage > 0)
        ? "<1%"
        : (typeof remainingTokenPercentage === "number" && Number.isFinite(remainingTokenPercentage))
          ? `${remainingTokenPercentage}%`
          : "Not Available";

  return (
    <ButtonContainer>
      <StyledButton
        appearance="secondary"
        tooltip={`Generate Mapping using AI.\nRemaining Free Usage: ${tokenUsageText}${usageResetText ? `\nResets in: ${usageResetText}` : ''}`}
        onClick={async () => {
          if (!isLoading && !disabled) {
            await onClick();
          }
        }}
        disabled={isLoading || disabled}
        isLoading={isLoading}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <Codicon name="wand" />
          <span style={{ marginLeft: "3px" }}>Map</span>
        </div>
      </StyledButton>
    </ButtonContainer>
  );
};

export default AIMapButton;
