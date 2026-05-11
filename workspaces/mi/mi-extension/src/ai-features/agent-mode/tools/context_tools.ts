/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { AI_CONNECTOR_DOCUMENTATION } from '../context/connectors_guide';
import {
    SYNAPSE_EXPRESSION_SPEC_FULL,
    SYNAPSE_EXPRESSION_SPEC_SECTIONS,
} from '../context/synapse-core/synapse_expression_spec';
import {
    SYNAPSE_FUNCTION_REFERENCE_FULL,
    SYNAPSE_FUNCTION_REFERENCE_SECTIONS,
} from '../context/synapse-core/synapse_function_reference';
import {
    SYNAPSE_VARIABLE_RESOLUTION_FULL,
    SYNAPSE_VARIABLE_RESOLUTION_SECTIONS,
} from '../context/synapse-core/synapse_variable_resolution';
import {
    SYNAPSE_MEDIATOR_EXPRESSION_MATRIX_FULL,
    SYNAPSE_MEDIATOR_EXPRESSION_MATRIX_SECTIONS,
} from '../context/synapse-core/synapse_mediator_expression_matrix';
import {
    SYNAPSE_EDGE_CASES_FULL,
    SYNAPSE_EDGE_CASES_SECTIONS,
} from '../context/synapse-core/synapse_edge_cases';
import {
    SYNAPSE_ENDPOINT_REFERENCE_FULL,
    SYNAPSE_ENDPOINT_REFERENCE_SECTIONS,
} from '../context/synapse-core/synapse_endpoint_reference';
import {
    SYNAPSE_MEDIATOR_REFERENCE_FULL,
    SYNAPSE_MEDIATOR_REFERENCE_SECTIONS,
} from '../context/synapse-core/synapse_mediator_reference';
import {
    SYNAPSE_PAYLOAD_PATTERNS_FULL,
    SYNAPSE_PAYLOAD_PATTERNS_SECTIONS,
} from '../context/synapse-core/synapse_payload_patterns';
import {
    SYNAPSE_PROPERTY_REFERENCE_FULL,
    SYNAPSE_PROPERTY_REFERENCE_SECTIONS,
} from '../context/synapse-core/synapse_property_reference';
import {
    SYNAPSE_SOAP_NAMESPACE_GUIDE_FULL,
    SYNAPSE_SOAP_NAMESPACE_GUIDE_SECTIONS,
} from '../context/synapse-core/synapse_soap_namespace_guide';
import {
    SYNAPSE_REGISTRY_RESOURCE_GUIDE_FULL,
    SYNAPSE_REGISTRY_RESOURCE_GUIDE_SECTIONS,
} from '../context/synapse-core/synapse_registry_resource_guide';
import {
    SYNAPSE_ARTIFACT_REFERENCE_FULL,
    SYNAPSE_ARTIFACT_REFERENCE_SECTIONS,
} from '../context/synapse-core/synapse_artifact_reference';
import {
    SYNAPSE_ASYNC_REFERENCE_FULL,
    SYNAPSE_ASYNC_REFERENCE_SECTIONS,
} from '../context/synapse-core/synapse_async_reference';
import {
    SYNAPSE_HTTP_CONNECTOR_GUIDE_FULL,
    SYNAPSE_HTTP_CONNECTOR_GUIDE_SECTIONS,
} from '../context/synapse-core/synapse_http_connector_guide';
import {
    UNIT_TEST_REFERENCE_FULL,
    UNIT_TEST_REFERENCE_SECTIONS,
} from '../context/unit-tests/unit_test_reference';
import {
    DATA_MAPPER_REFERENCE_FULL,
    DATA_MAPPER_REFERENCE_SECTIONS,
} from '../context/data_mapper_reference';
import { logDebug, logWarn } from '../../copilot/logger';
import { ContextExecuteFn, ToolResult } from './types';
import { getRuntimeVersionFromPom } from './connector_store_cache';
import { compareVersions } from '../../../util/onboardingUtils';
import { RUNTIME_VERSION_440 } from '../../../constants';

interface ContextDefinition {
    name: string;
    description: string;
    content: string;
    sections?: Record<string, string>;
    minRuntimeVersion?: string;
    aliases?: string[];
}

const CONTEXT_REFERENCES: ContextDefinition[] = [
    {
        name: 'ai-connector-app-development',
        description: 'Developing AI-powered apps with AI connector (chat, RAG, knowledge base, and agent tools). Supported only for MI runtime 4.4.0 and above.',
        content: AI_CONNECTOR_DOCUMENTATION,
        minRuntimeVersion: RUNTIME_VERSION_440,
        aliases: ['ai_connector_app_development'],
    },
    {
        name: 'synapse-expression-spec',
        description: 'Formal Synapse expression language spec (operators, type system, coercion, null handling, JSONPath, and expression contexts).',
        content: SYNAPSE_EXPRESSION_SPEC_FULL,
        sections: SYNAPSE_EXPRESSION_SPEC_SECTIONS,
    },
    {
        name: 'synapse-function-reference',
        description: 'Comprehensive Synapse function reference (string, math, type-check, conversion, datetime, access, and failure behavior).',
        content: SYNAPSE_FUNCTION_REFERENCE_FULL,
        sections: SYNAPSE_FUNCTION_REFERENCE_SECTIONS,
    },
    {
        name: 'synapse-variable-resolution',
        description: 'Variable/path resolution behavior across payload, vars, headers, props, params, configs, and registry.',
        content: SYNAPSE_VARIABLE_RESOLUTION_FULL,
        sections: SYNAPSE_VARIABLE_RESOLUTION_SECTIONS,
    },
    {
        name: 'synapse-mediator-expression-matrix',
        description: 'Mediator-by-mediator expression integration matrix, including payload-state transitions and anti-patterns.',
        content: SYNAPSE_MEDIATOR_EXPRESSION_MATRIX_FULL,
        sections: SYNAPSE_MEDIATOR_EXPRESSION_MATRIX_SECTIONS,
    },
    {
        name: 'synapse-edge-cases',
        description: 'Edge-case catalog and validated patterns for expression/runtime troubleshooting.',
        content: SYNAPSE_EDGE_CASES_FULL,
        sections: SYNAPSE_EDGE_CASES_SECTIONS,
    },
    {
        name: 'synapse-endpoint-reference',
        description: 'Complete Synapse endpoint type reference with schema details, attributes, and runtime behavior.',
        content: SYNAPSE_ENDPOINT_REFERENCE_FULL,
        sections: SYNAPSE_ENDPOINT_REFERENCE_SECTIONS,
    },
    {
        name: 'synapse-mediator-reference',
        description: 'Deep reference for mediator attributes, semantics, and validated behavior patterns. Includes script mediator (GraalJS payload/variable access), forEach V2 (MessageContext isolation and aggregation attributes), variable mediator type="JSON" coercion, cache mediator paired request/response, call/send/loopback semantics, and the consolidated fault handling hierarchy with ERROR_* property lifecycle.',
        content: SYNAPSE_MEDIATOR_REFERENCE_FULL,
        sections: SYNAPSE_MEDIATOR_REFERENCE_SECTIONS,
    },
    {
        name: 'synapse-artifact-reference',
        description: 'Artifact-level reference: REST APIs (<api>/<resource> attributes, versioning, CORS handlers), proxy services (legacy SOAP shape), inbound endpoints (protocol list, parameter schemas for HTTP/JMS/File, coordination semantics), scheduled tasks (MessageInjector, simple/cron triggers), and local entries (inline, URI-referenced, connection-init forms).',
        content: SYNAPSE_ARTIFACT_REFERENCE_FULL,
        sections: SYNAPSE_ARTIFACT_REFERENCE_SECTIONS,
        aliases: ['synapse_artifact_reference', 'artifact-reference'],
    },
    {
        name: 'synapse-async-reference',
        description: 'Async processing reference: message stores (InMemory/JMS/RabbitMQ/JDBC fully-qualified class names and parameters), message processors (Sampling vs ScheduledMessageForwarding), the <store> mediator (which TERMINATES mediation), and the dead-letter-queue pattern with a paired forwarder + DLQ store.',
        content: SYNAPSE_ASYNC_REFERENCE_FULL,
        sections: SYNAPSE_ASYNC_REFERENCE_SECTIONS,
        aliases: ['synapse_async_reference', 'message-stores', 'message-processors'],
    },
    {
        name: 'synapse-payload-patterns',
        description: 'Payload transformation cookbook with practical JSON/XML and mixed-payload construction patterns.',
        content: SYNAPSE_PAYLOAD_PATTERNS_FULL,
        sections: SYNAPSE_PAYLOAD_PATTERNS_SECTIONS,
    },
    {
        name: 'synapse-property-reference',
        description: 'Reference for runtime-controlling Synapse and Axis2 properties, scopes, and usage patterns.',
        content: SYNAPSE_PROPERTY_REFERENCE_FULL,
        sections: SYNAPSE_PROPERTY_REFERENCE_SECTIONS,
    },
    {
        name: 'synapse-soap-namespace-guide',
        description: 'SOAP call and namespace handling guide, including WSDL namespace rules and response extraction patterns.',
        content: SYNAPSE_SOAP_NAMESPACE_GUIDE_FULL,
        sections: SYNAPSE_SOAP_NAMESPACE_GUIDE_SECTIONS,
    },
    {
        name: 'http-connector-guide',
        description: 'HTTP connector deep reference: error response handling (nonErrorHttpStatusCodes, fault sequences, HTTP_SC branching), transport-level faults (connection refused / timeout — require timeoutDuration + onError fault handler), authentication patterns (Basic, Bearer, OAuth2 client credentials), transport properties, payload types (JSON/XML/TEXT), chunking/Content-Length control, and responseVariable pattern.',
        content: SYNAPSE_HTTP_CONNECTOR_GUIDE_FULL,
        sections: SYNAPSE_HTTP_CONNECTOR_GUIDE_SECTIONS,
        aliases: ['http_connector_guide', 'http-error-handling'],
    },
    {
        name: 'registry-resource-guide',
        description: 'Registry resource management: artifact.xml format, naming conventions, media types, registry paths (gov:/conf:), access patterns from Synapse configs, resource properties, common patterns (JSON, XSLT, scripts, WSDL), config.properties registration as a config/property artifact for ${configs.*} access, and secure vault (wso2:vault-lookup alias syntax) for encrypted secret resolution.',
        content: SYNAPSE_REGISTRY_RESOURCE_GUIDE_FULL,
        sections: SYNAPSE_REGISTRY_RESOURCE_GUIDE_SECTIONS,
        aliases: ['registry_resource_guide', 'registry-resources'],
    },
    {
        name: 'unit-test-reference',
        description: 'MI unit test guide: XSD schema, assertions by artifact type (API vs Sequence), mock services (rules, naming, port 9090), supporting artifacts, connector resources, and working examples.',
        content: UNIT_TEST_REFERENCE_FULL,
        sections: UNIT_TEST_REFERENCE_SECTIONS,
        aliases: ['unit_test_reference', 'unit-test-guide'],
    },
    {
        name: 'data-mapper-reference',
        description: 'TypeScript data mapper reference: .ts file skeleton, dmUtils helper API (sum/average/max/min/concat/toNumber/etc with signatures), the TS2556 dynamic-array spread pitfall (use array.reduce(...), never dmUtils.sum(...arr)), array handling patterns, and tool-routing guidance (prefer create_data_mapper / generate_data_mapping over hand-written mappings). Load before editing existing .ts mapping files. Requires MI runtime 4.4.0+.',
        content: DATA_MAPPER_REFERENCE_FULL,
        sections: DATA_MAPPER_REFERENCE_SECTIONS,
        minRuntimeVersion: RUNTIME_VERSION_440,
        aliases: ['data_mapper_reference', 'datamapper-reference', 'dmutils-reference'],
    },
];

function normalizeContextName(value: string): string {
    return value.trim().toLowerCase().replace(/[_\s]+/g, '-');
}

function normalizeSectionName(value: string): string {
    return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function parseContextSelector(selector: string): { contextName: string; sectionName?: string } {
    const trimmed = selector.trim();
    const separatorIndex = trimmed.indexOf(':');
    if (separatorIndex < 0) {
        return { contextName: trimmed };
    }

    const contextName = trimmed.slice(0, separatorIndex).trim();
    const sectionName = trimmed.slice(separatorIndex + 1).trim();
    return sectionName ? { contextName, sectionName } : { contextName };
}

function findContext(contextName: string): ContextDefinition | undefined {
    const target = normalizeContextName(contextName);
    return CONTEXT_REFERENCES.find((context) =>
        normalizeContextName(context.name) === target
        || (context.aliases ?? []).some((alias) => normalizeContextName(alias) === target)
    );
}

function resolveContextSection(
    context: ContextDefinition,
    sectionName?: string
): { selectedContent: string; selectedSectionName?: string } | { error: string } {
    if (!sectionName) {
        return { selectedContent: context.content };
    }

    const sections = context.sections ?? {};
    const sectionMap = new Map<string, string>();
    for (const key of Object.keys(sections)) {
        sectionMap.set(normalizeSectionName(key), key);
    }

    const normalizedSection = normalizeSectionName(sectionName);
    const selectedSectionKey = sectionMap.get(normalizedSection);
    if (!selectedSectionKey) {
        const availableSections = Object.keys(sections);
        return {
            error: availableSections.length > 0
                ? `Unknown section '${sectionName}' for context '${context.name}'. Available sections: ${availableSections.join(', ')}`
                : `Context '${context.name}' does not expose sections. Request it without ':section'.`,
        };
    }

    return {
        selectedContent: sections[selectedSectionKey],
        selectedSectionName: selectedSectionKey,
    };
}

export function getAvailableContexts(): Array<{ name: string; description: string; sections?: string[] }> {
    return CONTEXT_REFERENCES.map((context) => ({
        name: context.name,
        description: context.description,
        sections: context.sections ? Object.keys(context.sections) : undefined,
    }));
}

export function createContextExecute(projectPath: string): ContextExecuteFn {
    return async (args: { context_name: string }): Promise<ToolResult> => {
        const selectorInput = args.context_name.trim();
        if (!selectorInput) {
            return {
                success: false,
                message: 'Missing context selector. Provide context_name as "topic" or "topic:section".',
                error: 'Error: Missing context selector',
            };
        }

        const selector = parseContextSelector(selectorInput);
        const context = findContext(selector.contextName);
        if (!context) {
            const available = getAvailableContexts()
                .map((item) => item.name)
                .join(', ');
            return {
                success: false,
                message: `Unknown context '${selector.contextName}'. Available contexts: ${available}`,
                error: 'Error: Unknown context',
            };
        }

        if (context.minRuntimeVersion) {
            const runtimeVersion = await getRuntimeVersionFromPom(projectPath);
            if (!runtimeVersion) {
                logWarn(
                    `[ContextTool] Context '${context.name}' requires MI runtime ${context.minRuntimeVersion}+ ` +
                    `but runtime version could not be determined.`
                );
                return {
                    success: false,
                    message: `Context '${context.name}' requires MI runtime ${context.minRuntimeVersion} or newer, ` +
                        `but the project's MI runtime version could not be determined. ` +
                        `Ensure pom.xml contains a valid MI runtime version.`,
                    error: 'Error: Unable to determine MI runtime version',
                };
            }
            if (compareVersions(runtimeVersion, context.minRuntimeVersion) < 0) {
                logWarn(
                    `[ContextTool] Context '${context.name}' is not supported for runtime ${runtimeVersion}. ` +
                    `Minimum required runtime is ${context.minRuntimeVersion}.`
                );
                return {
                    success: false,
                    message: `Context '${context.name}' is not supported for MI runtime ${runtimeVersion}. ` +
                        `Use MI runtime ${context.minRuntimeVersion} or newer.`,
                    error: 'Error: Unsupported MI runtime',
                };
            }
        }

        const sectionResult = resolveContextSection(context, selector.sectionName);
        if ('error' in sectionResult) {
            return {
                success: false,
                message: sectionResult.error,
                error: 'Error: Unknown context section',
            };
        }

        logDebug(
            `[ContextTool] Loaded context: ${context.name}` +
            (sectionResult.selectedSectionName ? ` (section: ${sectionResult.selectedSectionName})` : '')
        );

        const availableSections = context.sections ? Object.keys(context.sections) : [];
        const selectionLabel = sectionResult.selectedSectionName
            ? `${context.name}:${sectionResult.selectedSectionName}`
            : context.name;

        return {
            success: true,
            message: [
                `Loaded context reference '${selectionLabel}'.`,
                `Description: ${context.description}`,
                ...(
                    !sectionResult.selectedSectionName && availableSections.length > 0
                        ? [`Sections: ${availableSections.join(', ')}`]
                        : []
                ),
                '',
                '<CONTEXT_REFERENCE>',
                sectionResult.selectedContent,
                '</CONTEXT_REFERENCE>',
            ].join('\n'),
        };
    };
}

const contextInputSchema = z.object({
    context_name: z.string().describe('Context selector in the form "topic" or "topic:section".'),
});

export function createContextTool(execute: ContextExecuteFn) {
    return (tool as any)({
        description: `Loads deep reference context on demand to avoid prompt bloat.
            Use context_name in the form "topic" or "topic:section".
            Example: "synapse-expression-spec:type_coercion".
            Note: Some contexts are runtime-gated and require the MI runtime version specified by their minRuntimeVersion (e.g., MI runtime ${RUNTIME_VERSION_440} or newer).`,
        inputSchema: contextInputSchema,
        execute,
    });
}
