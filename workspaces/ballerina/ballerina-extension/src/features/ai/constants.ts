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

export const CONFIG_FILE_NAME = "Config.toml";
export const CONFIGURE_DEFAULT_MODEL_COMMAND = "ballerina.configureWso2DefaultModelProvider";
export const CONFIGURE_DEFAULT_DEVANT_CHUNKER_COMMAND = "ballerina.configureDefaultDevantChunker";
export const OPEN_AI_PANEL_COMMAND = "ballerina.open.ai.panel";
export const CLOSE_AI_PANEL_COMMAND = "ballerina.close.ai.panel";
export const SIGN_IN_BI_COPILOT = "Sign in to BI Copilot";
export const PROGRESS_BAR_MESSAGE_FROM_WSO2_DEFAULT_MODEL = "Fetching and saving access token for WSO2 default model provider.";
export const PROGRESS_BAR_MESSAGE_FROM_DEFAULT_DEVANT_CHUNKER = "Fetching and saving access token for default Devant chunker.";
export const ERROR_NO_BALLERINA_SOURCES = "No Ballerina sources";
export const LOGIN_REQUIRED_WARNING = "Please sign in to BI Copilot to use this feature.";
export const LOGIN_REQUIRED_WARNING_FOR_DEFAULT_MODEL = "Please sign in to BI Copilot to configure the WSO2 default model provider.";
export const DEFAULT_PROVIDER_ADDED = "WSO2 default model provider configuration values were added to the Config.toml file.";
export const LOGIN_REQUIRED_WARNING_FOR_DEFAULT_DEVANT_CHUNKER = "Please sign in to BI Copilot to configure the default Devant chunker.";
export const DEFAULT_DEVANT_CHUNKER_ADDED = "Default Devant chunker configuration values were added to the Config.toml file.";

// AI Provider Configuration Constants
export const WSO2_PROVIDER_CONFIG_TABLE = "[ballerina.ai.wso2ProviderConfig]";
export const DEVANT_CHUNKER_CONFIG_TABLE = "[ballerina.ai.devant.chunkerConfig]";
export const DEVANT_CHUNKER_SERVICE_URL = "https://7eff1239-64bb-4663-b256-30a00d187a5c-prod.e1-us-east-azure.choreoapis.dev/rag-agent/rag-ingester/v1.0";
export const CONFIG_KEY_SERVICE_URL = 'serviceUrl';
export const CONFIG_KEY_ACCESS_TOKEN = 'accessToken';

// Datamapper Constants
// Primitive data types supported by the datamapper
export enum PrimitiveType {
  STRING = "string",
  INT = "int",
  FLOAT = "float",
  DECIMAL = "decimal",
  BOOLEAN = "boolean"
}

// Nullable primitive data types
export enum NullablePrimitiveType {
  STRING = "string?",
  INT = "int?",
  FLOAT = "float?",
  DECIMAL = "decimal?",
  BOOLEAN = "boolean?"
}

// Error type
export enum ErrorType {
  ERROR = "error"
}

// Array types for primitive data types
export enum PrimitiveArrayType {
  // Basic array types
  STRING_ARRAY = "string[]",
  STRING_ARRAY_NULLABLE = "string[]?",
  INT_ARRAY = "int[]",
  INT_ARRAY_NULLABLE = "int[]?",
  FLOAT_ARRAY = "float[]",
  FLOAT_ARRAY_NULLABLE = "float[]?",
  DECIMAL_ARRAY = "decimal[]",
  DECIMAL_ARRAY_NULLABLE = "decimal[]?",
  BOOLEAN_ARRAY = "boolean[]",
  BOOLEAN_ARRAY_NULLABLE = "boolean[]?",

  // Arrays with nullable elements
  STRING_OR_NULL_ARRAY = "string?[]",
  STRING_OR_NULL_ARRAY_NULLABLE = "string?[]?",
  INT_OR_NULL_ARRAY = "int?[]",
  INT_OR_NULL_ARRAY_NULLABLE = "int?[]?",
  FLOAT_OR_NULL_ARRAY = "float?[]",
  FLOAT_OR_NULL_ARRAY_NULLABLE = "float?[]?",
  DECIMAL_OR_NULL_ARRAY = "decimal?[]",
  DECIMAL_OR_NULL_ARRAY_NULLABLE = "decimal?[]?",
  BOOLEAN_OR_NULL_ARRAY = "boolean?[]",
  BOOLEAN_OR_NULL_ARRAY_NULLABLE = "boolean?[]?"
}
