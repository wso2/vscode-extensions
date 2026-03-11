/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
import { OpenAiIcon } from "./OpenAiIcon";
import { AzureOpenAiIcon } from "./AzureOpenAiIcon";
import { AnthropicIcon } from "./AnthropicIcon";
import { OllamaIcon } from "./OllamaIcon";
import { MistralAIIcon } from "./MistralAIIcon";
import { DeepseekIcon } from "./DeepseekIcon";
import { Icon } from "../Icon/Icon";

interface AIModuleIconConfig {
    component?: React.FC<{ size?: number }>;
    iconName?: string;
    iconColor?: string;
}

const AI_MODULE_ICON_MAP: Record<string, AIModuleIconConfig> = {
    // OpenAI
    "OpenAiProvider": { component: OpenAiIcon },
    "ai.openai": { component: OpenAiIcon },
    // Azure OpenAI
    "AzureOpenAiProvider": { component: AzureOpenAiIcon },
    "OpenAiModelProvider": { component: AzureOpenAiIcon },
    "ai.azure": { component: AzureOpenAiIcon },
    // Anthropic
    "AnthropicProvider": { component: AnthropicIcon },
    "ai.anthropic": { component: AnthropicIcon },
    // Ollama
    "OllamaProvider": { component: OllamaIcon },
    "ai.ollama": { component: OllamaIcon },
    // Mistral
    "MistralAiProvider": { component: MistralAIIcon },
    "ai.mistral": { component: MistralAIIcon },
    // Deepseek
    "DeepseekProvider": { component: DeepseekIcon },
    "ai.deepseek": { component: DeepseekIcon },
    // WSO2
    "Wso2ModelProvider": { iconName: "bi-wso2" },
    // Vector stores
    "ai.milvus": { iconName: "bi-milvus", iconColor: "#4fc4f9" },
    "ai.pinecone": { iconName: "bi-pinecone" },
    "ai.pgvector": { iconName: "bi-postgresql" },
};

export function getAIModuleIcon(moduleType: string, size: number = 24): React.ReactElement | null {
    const config = AI_MODULE_ICON_MAP[moduleType];
    if (!config) {
        return null;
    }

    if (config.component) {
        const IconComponent = config.component;
        return <IconComponent size={size} />;
    }

    if (config.iconName) {
        return (
            <Icon
                name={config.iconName}
                sx={{ width: size, height: size, fontSize: size, ...(config.iconColor && { color: config.iconColor }) }}
            />
        );
    }

    return null;
}

export const AI_MODULE_TYPES = Object.keys(AI_MODULE_ICON_MAP);
