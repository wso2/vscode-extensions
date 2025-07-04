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

const AIMapButton: React.FC<AIMapButtonProps> = ({ onClick, isLoading }) => {
  var [remaingTokenLessThanOne, setRemainingTokenLessThanOne] = useState(false);
  var [remainingTokenPercentage, setRemainingTokenPercentage] = useState<string | number>("");

  const { rpcClient } = useVisualizerContext();

  useEffect(() => {
    rpcClient.getAIVisualizerState()
      .then((machineView: any) => {
        if (machineView && machineView.userTokens) {
          const maxTokens = machineView.userTokens.max_usage;
          if (maxTokens === -1) {
            setRemainingTokenPercentage("Unlimited");
          } else {
            const remainingTokens = machineView.userTokens.remaining_tokens;
            const percentage = (remainingTokens / maxTokens) * 100;
            if (percentage < 1 && percentage > 0) {
              setRemainingTokenLessThanOne(true);
            } else {
              setRemainingTokenLessThanOne(false);
            }
            setRemainingTokenPercentage(Math.round(percentage));
          }
        } else {
          // Handle the case when machineView or userTokens is undefined
          setRemainingTokenPercentage("Not Available");
        }
      })
      .catch((error) => {
        // Handle errors from the API call
        console.error("Error fetching AI Visualizer State:", error);
        setRemainingTokenPercentage("Not Available");
      });
  }, []);

  var tokenUsageText = remainingTokenPercentage === 'Unlimited' ? remainingTokenPercentage : (remaingTokenLessThanOne ? '<1%' : `${remainingTokenPercentage}%`);

  return (
    <ButtonContainer>
      <StyledButton
        appearance="secondary"
        tooltip={`Generate Mapping using AI.\nRemaining Free Usage: ${tokenUsageText}`}
        onClick={async () => {
          if (!isLoading) {
            await onClick();
          }
        }}
        disabled={isLoading}
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
