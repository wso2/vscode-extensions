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

import styled from "@emotion/styled";
import { AI_EVENT_TYPE, LoginMethod } from "@wso2/mi-core";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { useState } from "react";
import { Codicon } from "@wso2/ui-toolkit";
import { VSCodeButton, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";

// Minimum length for Anthropic API key validation
const MIN_ANTHROPIC_API_KEY_LENGTH = 20;

const Container = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 10px;
    gap: 8px;
`;

// AlertBox-style container for consistency
const AlertContainer = styled.div<{ variant: "primary" | "secondary" }>`
    border-left: 0.3rem solid
        var(
            ${(props: { variant: string }) =>
                props.variant === "secondary" ? "--vscode-editorWidget-border" : "--vscode-focusBorder"}
        );
    background: var(
        ${(props: { variant: string }) =>
            props.variant === "secondary" ? "transparent" : "--vscode-inputValidation-infoBackground"}
    );
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 1rem;
    gap: 12px;
    margin-bottom: 15px;
    width: -webkit-fill-available;
`;

const Title = styled.div`
    color: var(--vscode-foreground);
    font-weight: 500;
`;

const SubTitle = styled.div`
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
    font-weight: 400;
    line-height: 1.5;
`;

const InputContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 2px 4px;
    border: 1px solid var(--vscode-editorWidget-border);
    border-radius: 4px;
    background-color: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    width: 100%;
    box-sizing: border-box;
    min-height: 32px;
    &:focus-within {
        border-color: var(--vscode-button-background);
    }
`;

const InputRow = styled.div`
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 28px;
    gap: 8px;
`;

const StyledTextField = styled(VSCodeTextField)`
    flex: 1;
    border: none;
    background: transparent;
    height: 28px;
    min-height: 28px;
    display: flex;
    align-items: center;
    width: 100%;
    &::part(control) {
        border: none !important;
        background: transparent !important;
        padding: 0 4px;
        outline: none !important;
        box-shadow: none !important;
        height: 28px !important;
        min-height: 28px !important;
        line-height: 28px !important;
        display: flex !important;
        align-items: center !important;
        width: 100% !important;
        flex: 1 !important;
    }
    &::part(control):focus {
        outline: none !important;
        box-shadow: none !important;
        border: none !important;
    }
    &::part(root) {
        border: none !important;
        background: transparent !important;
        height: 28px !important;
        min-height: 28px !important;
        display: flex !important;
        align-items: center !important;
        width: 100% !important;
        flex: 1 !important;
    }
`;

const EyeButton = styled.button`
    width: 24px;
    height: 24px;
    background-color: transparent;
    color: var(--vscode-icon-foreground);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
    box-sizing: border-box;
    flex-shrink: 0;
    &:hover {
        background-color: var(--vscode-toolbar-hoverBackground);
    }
    &:active {
        background-color: var(--vscode-toolbar-activeBackground);
    }
`;

const ButtonContainer = styled.div`
    display: flex;
    gap: 8px;
    align-self: flex-start;
`;

const ErrorMessage = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    color: var(--vscode-errorForeground);
    font-size: 12px;
    font-weight: 400;
    line-height: 1.5;
    width: 100%;
`;

const WaitingMessage = styled.div`
    border-left: 0.3rem solid var(--vscode-focusBorder);
    background: var(--vscode-inputValidation-infoBackground);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 1rem;
    gap: 12px;
    margin-bottom: 15px;
    width: -webkit-fill-available;
`;

interface WaitingForLoginProps {
    loginMethod?: LoginMethod;
    isValidating?: boolean;
    errorMessage?: string;
}

export const WaitingForLoginSection = ({ loginMethod, isValidating = false, errorMessage }: WaitingForLoginProps) => {
    const { rpcClient } = useVisualizerContext();
    const [apiKey, setApiKey] = useState("");
    const [showApiKey, setShowApiKey] = useState(false);
    const [clientError, setClientError] = useState<string>("");
    const [awsCredentials, setAwsCredentials] = useState({
        accessKeyId: "",
        secretAccessKey: "",
        region: "",
        sessionToken: ""
    });
    const [showAwsSecretKey, setShowAwsSecretKey] = useState(false);
    const [showAwsAccessKey, setShowAwsAccessKey] = useState(false);
    const [showAwsSessionToken, setShowAwsSessionToken] = useState(false);

    const cancelLogin = () => {
        rpcClient.sendAIStateEvent(AI_EVENT_TYPE.CANCEL_LOGIN);
    };

    const connectWithKey = () => {
        // Clear any previous client-side errors
        setClientError("");
        
        // Validate API key format on client side
        const trimmedKey = apiKey.trim();
        
        if (!trimmedKey) {
            setClientError("Please enter your Anthropic API key");
            return;
        }
        
        if (!trimmedKey.startsWith('sk-ant-')) {
            setClientError("Invalid API key format. Anthropic API keys start with 'sk-ant-'");
            return;
        }
        
        if (trimmedKey.length < MIN_ANTHROPIC_API_KEY_LENGTH) {
            setClientError("API key seems too short. Please check and try again.");
            return;
        }
        
        // Send the API key to the state machine for validation
        rpcClient.sendAIStateEvent({
            type: AI_EVENT_TYPE.SUBMIT_API_KEY,
            payload: { apiKey: trimmedKey },
        } as any);
    };

    const handleApiKeyChange = (e: any) => {
        // VSCodeTextField emits the value directly in the event
        const value = e.target?.value ?? '';
        setApiKey(value);
        // Clear client error when user starts typing
        if (clientError) {
            setClientError("");
        }
    };

    const toggleApiKeyVisibility = () => {
        setShowApiKey(!showApiKey);
    };

    const handleAwsCredentialChange = (field: string) => (e: any) => {
        const value = e.target?.value ?? '';
        setAwsCredentials(prev => ({ ...prev, [field]: value }));
        if (clientError) {
            setClientError("");
        }
    };

    const connectWithAwsBedrock = () => {
        setClientError("");
        const { accessKeyId, secretAccessKey, region, sessionToken } = awsCredentials;

        if (!accessKeyId.trim()) {
            setClientError("Please enter your AWS Access Key ID");
            return;
        }
        if (!secretAccessKey.trim()) {
            setClientError("Please enter your AWS Secret Access Key");
            return;
        }
        if (!region.trim()) {
            setClientError("Please enter your AWS Region");
            return;
        }

        rpcClient.sendAIStateEvent({
            type: AI_EVENT_TYPE.SUBMIT_AWS_CREDENTIALS,
            payload: {
                accessKeyId: accessKeyId.trim(),
                secretAccessKey: secretAccessKey.trim(),
                region: region.trim(),
                sessionToken: sessionToken.trim() || undefined
            },
        } as any);
    };
    
    // Show either server error (from validation) or client error (from form validation)
    const displayError = errorMessage || clientError;

    if (loginMethod === LoginMethod.ANTHROPIC_KEY) {
        return (
            <Container>
                <AlertContainer variant="primary">
                    <Title>Connect with Anthropic API Key</Title>
                    <SubTitle>
                        Enter your Anthropic API key to connect to MI Copilot. Your API key will be securely stored
                        and used for authentication.
                    </SubTitle>

                    <InputContainer>
                        <InputRow>
                            <StyledTextField
                                type={showApiKey ? "text" : "password"}
                                placeholder="Enter your Anthropic API key"
                                value={apiKey}
                                onChange={handleApiKeyChange}
                                {...(isValidating ? { disabled: true } : {})}
                            />
                            <EyeButton
                                type="button"
                                onClick={toggleApiKeyVisibility}
                                title={showApiKey ? "Hide API key" : "Show API key"}
                                {...(isValidating ? { disabled: true } : {})}
                            >
                                <Codicon name={showApiKey ? "eye-closed" : "eye"} />
                            </EyeButton>
                        </InputRow>
                    </InputContainer>

                    {displayError && (
                        <ErrorMessage>
                            <Codicon name="error" />
                            <span>{displayError}</span>
                        </ErrorMessage>
                    )}

                    <ButtonContainer>
                        <VSCodeButton
                            appearance="primary"
                            onClick={connectWithKey}
                            {...(isValidating ? { disabled: true } : {})}
                        >
                            {isValidating ? "Validating..." : "Connect with Key"}
                        </VSCodeButton>
                        <VSCodeButton
                            appearance="secondary"
                            onClick={cancelLogin}
                            {...(isValidating ? { disabled: true } : {})}
                        >
                            Cancel
                        </VSCodeButton>
                    </ButtonContainer>
                </AlertContainer>
            </Container>
        );
    }

    if (loginMethod === LoginMethod.AWS_BEDROCK) {
        return (
            <Container>
                <AlertContainer variant="primary">
                    <Title>Connect with AWS Bedrock</Title>
                    <SubTitle>
                        Enter your AWS credentials to connect to MI Copilot via Amazon Bedrock.
                        Your credentials will be securely stored and used for authentication.
                    </SubTitle>

                    {/* AWS Access Key ID */}
                    <InputContainer>
                        <InputRow>
                            <StyledTextField
                                type={showAwsAccessKey ? "text" : "password"}
                                placeholder="AWS Access Key ID"
                                value={awsCredentials.accessKeyId}
                                onChange={handleAwsCredentialChange('accessKeyId')}
                                {...(isValidating ? { disabled: true } : {})}
                            />
                            <EyeButton
                                type="button"
                                onClick={() => setShowAwsAccessKey(!showAwsAccessKey)}
                                title={showAwsAccessKey ? "Hide" : "Show"}
                                {...(isValidating ? { disabled: true } : {})}
                            >
                                <Codicon name={showAwsAccessKey ? "eye-closed" : "eye"} />
                            </EyeButton>
                        </InputRow>
                    </InputContainer>

                    {/* AWS Secret Access Key */}
                    <InputContainer>
                        <InputRow>
                            <StyledTextField
                                type={showAwsSecretKey ? "text" : "password"}
                                placeholder="AWS Secret Access Key"
                                value={awsCredentials.secretAccessKey}
                                onChange={handleAwsCredentialChange('secretAccessKey')}
                                {...(isValidating ? { disabled: true } : {})}
                            />
                            <EyeButton
                                type="button"
                                onClick={() => setShowAwsSecretKey(!showAwsSecretKey)}
                                title={showAwsSecretKey ? "Hide" : "Show"}
                                {...(isValidating ? { disabled: true } : {})}
                            >
                                <Codicon name={showAwsSecretKey ? "eye-closed" : "eye"} />
                            </EyeButton>
                        </InputRow>
                    </InputContainer>

                    {/* AWS Region */}
                    <InputContainer>
                        <InputRow>
                            <StyledTextField
                                type="text"
                                placeholder="AWS Region (e.g., us-east-1)"
                                value={awsCredentials.region}
                                onChange={handleAwsCredentialChange('region')}
                                {...(isValidating ? { disabled: true } : {})}
                            />
                        </InputRow>
                    </InputContainer>

                    {/* Session Token (Optional) */}
                    <InputContainer>
                        <InputRow>
                            <StyledTextField
                                type={showAwsSessionToken ? "text" : "password"}
                                placeholder="Session Token (Optional)"
                                value={awsCredentials.sessionToken}
                                onChange={handleAwsCredentialChange('sessionToken')}
                                {...(isValidating ? { disabled: true } : {})}
                            />
                            <EyeButton
                                type="button"
                                onClick={() => setShowAwsSessionToken(!showAwsSessionToken)}
                                title={showAwsSessionToken ? "Hide" : "Show"}
                                {...(isValidating ? { disabled: true } : {})}
                            >
                                <Codicon name={showAwsSessionToken ? "eye-closed" : "eye"} />
                            </EyeButton>
                        </InputRow>
                    </InputContainer>

                    {displayError && (
                        <ErrorMessage>
                            <Codicon name="error" />
                            <span>{displayError}</span>
                        </ErrorMessage>
                    )}

                    <ButtonContainer>
                        <VSCodeButton
                            appearance="primary"
                            onClick={connectWithAwsBedrock}
                            {...(isValidating ? { disabled: true } : {})}
                        >
                            {isValidating ? "Validating..." : "Connect with AWS Bedrock"}
                        </VSCodeButton>
                        <VSCodeButton
                            appearance="secondary"
                            onClick={cancelLogin}
                            {...(isValidating ? { disabled: true } : {})}
                        >
                            Cancel
                        </VSCodeButton>
                    </ButtonContainer>
                </AlertContainer>
            </Container>
        );
    }

    // Default: MI_INTEL login method
    return (
        <Container>
            <WaitingMessage>
                <Title>Waiting for Login</Title>
                <SubTitle>
                    Waiting for Devant sign-in. Complete your login in the WSO2 Platform extension to continue with MI Copilot.
                </SubTitle>
                <ButtonContainer>
                    <VSCodeButton appearance="secondary" onClick={cancelLogin}>
                        Cancel
                    </VSCodeButton>
                </ButtonContainer>
            </WaitingMessage>
        </Container>
    );
};
