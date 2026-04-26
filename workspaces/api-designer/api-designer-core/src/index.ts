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

// export * from "./rpc";
export * from "./constants/default-spectral-rulesets";
export * from "./state-machine-types";
export * from "./vscode";
// ------ History class and interface -------->
export * from "./history";

export * from "./rpc-types/api-designer-visualizer/index";
export * from "./rpc-types/api-designer-visualizer/rpc-type";
export * from "./rpc-types/api-designer-visualizer/types";
// Explicit exports for RPC method names
export {
    getAPISpecContent,
    writeAPISpecContent,
    validateApiSpec,
    fetchRulesetsFromFolder,
    getApplicableRulesets,
    readFile,
    writeFile,
    deleteFile,
    getWorkspaceFileTree,
    checkAIAvailability,
    getAllSpectralRulesets,
    getGovernance,
} from "./rpc-types/api-designer-visualizer/rpc-type";

// ------ Copilot RPC types -------->
export * from "./utils/ai-readiness";
export * from "./utils/yaml-utils";
// Export error handling utilities with explicit exports to avoid conflicts
export {
    APIDesignerError,
    FileOperationError,
    APIDesignerValidationError,
    RPCError,
    getErrorMessage,
    getErrorCode,
    isAPIDesignerError,
    withErrorHandling
} from "./utils/error-handling";

// ------ AI Prompts -------->
export * from "./utils/ai-prompts";
// Explicit exports for new prompt functions to ensure they're available
export {
    buildFixValidationIssuesPrompt,
    buildGenericEditPrompt
} from "./utils/ai-prompts";
export type {
    ValidationFixContext,
    GenericEditContext
} from "./utils/ai-prompts";

// ------ Core Utilities -------->
export * from "./utils/spec-type-utils";
export * from "./utils/spec-helpers";

// ------ API Specification Support (OpenAPI) -------->
export * from "./specs/constants";
export * from "./specs/detector";
export * from "./specs/specification-service";
export * from "./specs/openapi-service";
export * from "./specs/specification-factory";
export * from "./specs/specification-service";
// Explicit exports for commonly used functions and types
export { detectSpecType, detectSpecTypeFromPath } from "./specs/detector";
export { ApiSpecType } from "./specs/constants";
// Export types with explicit re-exports to avoid conflicts
export type {
    ApiSpecification,
    SpecInfo,
    SpecParseResult,
    SpecValidationResult,
    SpecComparisonResult,
    SpecDifference
} from "./specs/types";
export type {
    Info,
    Contact,
    License,
    Server,
    ServerVariable,
    Schema,
    ReferenceObject,
    SecurityScheme,
    OAuthFlows,
    OAuthFlow,
    SpecMetadata
} from "./specs/common-types";
export type {
    OpenAPISpec,
    Paths,
    PathItem,
    Operation as OpenAPIOperation,
    Parameter as OpenAPIParameter,
    RequestBody,
    Responses,
    Response,
    MediaType,
    Example,
    Header,
    Link,
    EncodingProperty,
    Components,
    Callback,
    SecurityRequirement,
    Tag as OpenAPITag,
    ExternalDocumentation as OpenAPIExternalDocumentation
} from "./specs/openapi-types";
