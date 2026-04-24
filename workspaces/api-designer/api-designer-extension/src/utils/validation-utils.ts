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

import * as yaml from 'js-yaml';
import { Spectral, Document } from '@stoplight/spectral-core';
import { oas, asyncapi } from '@stoplight/spectral-rulesets';
import * as Parsers from '@stoplight/spectral-parsers';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import * as spectralFunctions from '@stoplight/spectral-functions';
import * as spectralFormats from '@stoplight/spectral-formats';
import { logDebug, logWarning, logError } from '../util/logger';
import {
    AiReadinessMetrics as CoreAiReadinessMetrics,
    buildAiReadinessSummary,
    GetGovernanceResponse,
    loadYaml
} from '@wso2/api-designer-core';
import { AiReadinessMetricsCollector, createAiReadinessFunctions, applyAiReadinessFunctionsToRuleset } from './ai-readiness-functions';
import type { AiReadinessMetrics as CollectorAiReadinessMetrics } from './ai-readiness-functions';

const convertCollectorMetricsToCore = (
    metrics?: CollectorAiReadinessMetrics | null
): CoreAiReadinessMetrics | undefined => {
    if (!metrics || !metrics.categories) {
        return undefined;
    }

    const categories: CoreAiReadinessMetrics['categories'] = {};
    for (const [key, value] of Object.entries(metrics.categories)) {
        categories[key] = {
            total: value.total,
            passed: value.passed,
            failed: value.failed,
            passedPaths: value.passedPaths.map(path => path.map(segment => String(segment))),
            failedPaths: value.failedPaths.map(path => path.map(segment => String(segment)))
        };
    }

    return { categories };
};

/**
 * Map function names to actual Spectral function implementations
 */
const functionMap: Record<string, any> = {
    truthy: spectralFunctions.truthy,
    pattern: spectralFunctions.pattern,
    length: spectralFunctions.length,
    schema: spectralFunctions.schema,
    undefined: spectralFunctions.undefined,
    defined: spectralFunctions.defined,
    falsy: spectralFunctions.falsy,
    alphabetical: spectralFunctions.alphabetical,
    xor: spectralFunctions.xor,
    casing: spectralFunctions.casing,
    enumeration: spectralFunctions.enumeration,
};

/**
 * Convert severity string to numeric value
 * error=0, warn=1, info=3, hint=2
 */
function convertSeverity(severity: string | number): number {
    if (typeof severity === 'number') {
        return severity;
    }
    
    switch (severity) {
        case 'error': return 0;
        case 'warn': return 1;
        case 'info': return 3;
        case 'hint': return 2;
        default: return 1; // Default to warning
    }
}

/**
 * Process format references - convert format strings to Spectral format objects
 */
function processFormats(formats: any[]): any[] {
    if (!Array.isArray(formats)) {
        return formats;
    }
    
    return formats.map(format => {
        if (typeof format === 'string' && (spectralFormats as any)[format]) {
            return (spectralFormats as any)[format];
        }
        return format;
    });
}

/**
 * Process aliases from the ruleset
 */
function processAliases(aliases: any): any {
    if (!aliases || typeof aliases !== 'object') {
        return {};
    }
    
    const processedAliases: any = {};
    
    for (const [aliasName, aliasConfig] of Object.entries(aliases)) {
        const processedAlias: any = { ...(aliasConfig as any) };
        
        // Process formats in alias targets
        if (processedAlias.targets && Array.isArray(processedAlias.targets)) {
            processedAlias.targets = processedAlias.targets.map((target: any) => {
                const processedTarget = { ...target };
                if (target.formats) {
                    processedTarget.formats = processFormats(target.formats);
                }
                return processedTarget;
            });
        }
        
        processedAliases[aliasName] = processedAlias;
    }
    
    return processedAliases;
}

/**
 * Process extends property - handle spectral:oas references
 */
function processExtends(extendsArray: any): any[] {
    if (!extendsArray || !Array.isArray(extendsArray)) {
        return [];
    }
    
    const processedExtends: any[] = [];
    
    for (const extendItem of extendsArray) {
        if (Array.isArray(extendItem)) {
            // Handle [[spectral:oas, off]] format
            const [rulesetName, severity] = extendItem;
            if (rulesetName === 'spectral:oas') {
                processedExtends.push([oas, severity]);
            } else {
                processedExtends.push(extendItem);
            }
        } else if (typeof extendItem === 'string') {
            // Handle simple string format
            if (extendItem === 'spectral:oas') {
                processedExtends.push([oas, 'recommended']);
            } else {
                processedExtends.push(extendItem);
            }
        } else {
            processedExtends.push(extendItem);
        }
    }
    
    return processedExtends;
}

/**
 * Process a single 'then' clause to resolve function references
 */
function processThenClause(thenClause: any): any {
    if (!thenClause || typeof thenClause !== 'object') {
        return thenClause;
    }
    
    const processed = { ...thenClause };
    
    if (thenClause.function) {
        const functionName = thenClause.function;
        
        // If it's a string, try to resolve it
        if (typeof functionName === 'string') {
            if (functionMap[functionName]) {
                processed.function = functionMap[functionName];
            } else if (!functionName.startsWith('aiReadiness')) {
                logWarning(`Could not resolve function: ${functionName}`);
            }
        }
    }
    
    return processed;
}

/**
 * Process rules from the ruleset
 */
function processRulesInternal(rules: any): any {
    if (!rules || typeof rules !== 'object') {
        return {};
    }
    
    const processedRules: any = {};
    
    for (const [ruleName, ruleConfig] of Object.entries(rules)) {
        const rule = ruleConfig as any;
        const processedRule: any = {
            description: rule.description,
            message: rule.message,
            given: rule.given,
            severity: convertSeverity(rule.severity),
        };
        
        // Add optional fields if present
        if (rule.resolved !== undefined) {
            processedRule.resolved = rule.resolved;
        }
        
        if (rule.formats) {
            processedRule.formats = processFormats(rule.formats);
        }
        
        if (rule.recommended !== undefined) {
            processedRule.recommended = rule.recommended;
        }

        if (typeof rule.fixSuggestion === 'string' && rule.fixSuggestion.trim() !== '') {
            processedRule.fixSuggestion = rule.fixSuggestion;
        }
        
        // Handle 'then' - can be an array or single object
        if (Array.isArray(rule.then)) {
            processedRule.then = rule.then.map((thenItem: any) => processThenClause(thenItem));
        } else if (rule.then) {
            processedRule.then = processThenClause(rule.then);
        }
        
        processedRules[ruleName] = processedRule;
    }
    
    return processedRules;
}

/**
 * Process a complete ruleset from YAML object to Spectral format
 * Handles WSO2 ruleset structure with metadata and rulesetContent
 * 
 * @param rulesetObject - The parsed YAML object (may contain metadata + rulesetContent)
 * @returns Processed ruleset ready for Spectral
 */
function processRuleset(rulesetObject: any): any {
    try {
        // Extract the ruleset content from nested structure if present
        let rulesetContent = rulesetObject;
        
        if (rulesetObject.rulesetContent) {
            rulesetContent = rulesetObject.rulesetContent;
        }
        
        // Validate that we have rules
        if (!rulesetContent.rules || typeof rulesetContent.rules !== 'object') {
            throw new Error('Ruleset must contain a "rules" property');
        }
        
        // Build the processed ruleset
        const finalRuleset: any = {
            rules: processRulesInternal(rulesetContent.rules)
        };
        
        // Process aliases if they exist
        if (rulesetContent.aliases) {
            const processedAliases = processAliases(rulesetContent.aliases);
            if (Object.keys(processedAliases).length > 0) {
                finalRuleset.aliases = processedAliases;
            }
        }
        
        // Process extends if present
        if (rulesetContent.extends) {
            const processedExtends = processExtends(rulesetContent.extends);
            if (processedExtends.length > 0) {
                finalRuleset.extends = processedExtends;
            }
        }
        
        return finalRuleset;
        
    } catch (error: any) {
        logError('Error processing ruleset:', error);
        throw error;
    }
}

/**
 * Check if a path is a URL
 */
function isUrl(pathOrUrl: string): boolean {
    if (!pathOrUrl || typeof pathOrUrl !== 'string') {
        return false;
    }
    const trimmed = pathOrUrl.trim();
    return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('https:/');
}

/**
 * Download and parse ruleset content from URL
 */
async function downloadRulesetContent(url: string, rulesetContentPath: string, authToken?: string): Promise<string> {
    try {
        // Convert GitHub blob URLs to raw URLs
        const rawUrl = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
        
        logDebug(`Downloading from URL: ${rawUrl}`);
        
        // Try without auth first (works for public repos)
        let headers: Record<string, string> = {};
        let response = await fetch(rawUrl, { headers });
        
        // If request fails with 401/403 and we have an auth token, retry with auth
        if (!response.ok && (response.status === 401 || response.status === 403) && authToken) {
            logDebug('Request failed with auth error, retrying with authentication...');
            headers['Authorization'] = `token ${authToken}`;
            response = await fetch(rawUrl, { headers });
        }
        
        if (!response.ok) {
            throw new Error(`Failed to fetch from ${rawUrl}: ${response.status} ${response.statusText}`);
        }
        
        const content = await response.text();
        
        return content;
    } catch (error: any) {
        logError(`Error downloading from ${url}:`, error);
        throw new Error(`Failed to download ruleset: ${error.message}`);
    }
}

/**
 * Extract rulesetContent from a YAML string if present
 */
function extractRulesetContent(yamlText: string, rulesetContentPath: string): string {
    try {
        const doc = loadYaml(yamlText);
        if (doc && typeof doc === 'object' && (doc as any)[rulesetContentPath]) {
            // Extract and return just the rulesetContent
            return yaml.dump((doc as any)[rulesetContentPath], { noRefs: true });
        }
    } catch (e) {
        logError(`Error extracting ruleset content: ${e}`);
        throw new Error(`Error extracting ruleset content: ${e}`);
    }
    throw new Error(`Ruleset content not found at path: ${rulesetContentPath}`);
}

/**
 * Fetch and parse a spectral ruleset from a URL or local file
 */
async function fetchSpectralRuleset(filePathOrUrl: string, rulesetContentPath: string, gitRootPath?: string, authToken?: string): Promise<{ ruleset: any }> {
    try {
        // Fix corrupted URLs (https:/ -> https://)
        let cleanedPathOrUrl = filePathOrUrl;
        if (filePathOrUrl.includes('https:/') && !filePathOrUrl.includes('https://')) {
            cleanedPathOrUrl = filePathOrUrl.replace(/https:\//g, 'https://');
        }
        
        let rulesetContent: string;
        
        // Handle URLs - download content directly
        if (isUrl(cleanedPathOrUrl)) {
            rulesetContent = await downloadRulesetContent(cleanedPathOrUrl, rulesetContentPath, authToken);
        } else {
            // Resolve local file paths (relative paths are resolved from git root if available)
            let rulesetPath = cleanedPathOrUrl;
            if (gitRootPath && !filePathOrUrl.startsWith('/')) {
                rulesetPath = path.join(gitRootPath, filePathOrUrl);
            }
            
            // Read local file content
            rulesetContent = await fsPromises.readFile(rulesetPath, 'utf8');
        }

        // Extract rulesetContent if present
        rulesetContent = extractRulesetContent(rulesetContent, rulesetContentPath);
        
        // Parse the YAML content to get the ruleset object
        const rulesetObject = loadYaml(rulesetContent) as any;
        
        if (!rulesetObject) {
            throw new Error('Failed to parse ruleset: content is empty or invalid');
        }
        
        if (typeof rulesetObject !== 'object') {
            logError(`Ruleset content preview: ${rulesetContent.substring(0, 500)}`);
            throw new Error(`Invalid ruleset format: expected object, got ${typeof rulesetObject}`);
        }
        
        // Process the ruleset using the dedicated processor
        const processedRuleset = processRuleset(rulesetObject);
        
        return { ruleset: processedRuleset };
    } catch (error: any) {
        logError(`Error fetching spectral ruleset:`, error);
        logError('Error stack:', error.stack);
        throw error;
    }
}

/**
 * Spectral does not document custom rule keys; strip WSO2-only metadata before linting.
 * The original ruleset object is unchanged so violations can still read e.g. fixSuggestion.
 */
function rulesetForSpectralEngine(ruleset: any): any {
    if (!ruleset?.rules || typeof ruleset.rules !== 'object') {
        return ruleset;
    }
    const rules: Record<string, unknown> = {};
    for (const [name, cfg] of Object.entries(ruleset.rules)) {
        if (cfg && typeof cfg === 'object' && !Array.isArray(cfg)) {
            const { fixSuggestion: _fs, ...rest } = cfg as Record<string, unknown>;
            rules[name] = rest;
        } else {
            rules[name] = cfg;
        }
    }
    return { ...ruleset, rules };
}

/**
 * Run Spectral linting with a processed ruleset
 */
async function runSpectralLinting(
    specContent: string,
    ruleset: any,
    options: { metricsCollector?: AiReadinessMetricsCollector } = {}
): Promise<{ results: any[]; metadata?: { aiReadiness?: ReturnType<AiReadinessMetricsCollector['export']> } }> {
    try {
        const spectral = new Spectral();
        
        // Validate ruleset structure
        if (!ruleset || typeof ruleset !== 'object') {
            throw new Error('Invalid ruleset: must be an object');
        }
        
        if (!ruleset.rules || typeof ruleset.rules !== 'object') {
            throw new Error('Invalid ruleset: missing or invalid "rules" property');
        }
        
        spectral.setRuleset(rulesetForSpectralEngine(ruleset));
        
        const document = new Document(
            specContent,
            Parsers.Yaml
        );
        
        const results = await spectral.run(document);

        logDebug('Spectral results:', JSON.stringify(results, null, 2));
        
        const metadata = options.metricsCollector
            ? { aiReadiness: options.metricsCollector.export() }
            : undefined;
        
        return { results, metadata };
    } catch (error: any) {
        logError('Spectral error details:', error);
        if (error.message) {
            logError('Error message:', error.message);
        }
        if (error.errors && Array.isArray(error.errors)) {
            logError('Aggregate errors:');
            error.errors.forEach((err: any, index: number) => {
                logError(`  [${index}]:`, err.message || err);
            });
        }
        throw error;
    }
}

/**
 * Validates API specification (OpenAPI or AsyncAPI) with a dynamic Spectral ruleset
 */
export async function validateWithSpectralRuleset(
    apiSpec: string,
    rulesetName: string,
    fileUrl: string,
    rulesetContentPath: string,
    gitRootPath?: string,
    authToken?: string
): Promise<any> {
    try {
        
        // Fetch the ruleset from the URL or local file
        const { ruleset } = await fetchSpectralRuleset(fileUrl, rulesetContentPath, gitRootPath, authToken);
        
        const isAiReadinessRuleset = typeof rulesetName === 'string'
            && rulesetName.toLowerCase().includes('ai readiness');
        
        const metricsCollector = isAiReadinessRuleset ? new AiReadinessMetricsCollector() : undefined;
        const customFunctions = metricsCollector ? createAiReadinessFunctions(metricsCollector) : undefined;
        const preparedRuleset = metricsCollector && customFunctions
            ? applyAiReadinessFunctionsToRuleset(ruleset, customFunctions)
            : ruleset;
        
        // Run Spectral validation
        const { results, metadata } = await runSpectralLinting(apiSpec, preparedRuleset, {
            metricsCollector
        });
        
        // Count unique rules that failed and aggregate severity data
        const uniqueFailedRules = new Set<string>();
        const severityRuleSets = {
            error: new Set<string>(),
            warning: new Set<string>(),
            info: new Set<string>(),
            hint: new Set<string>()
        };
        const severityViolationCounts = {
            error: 0,
            warn: 0,
            info: 0,
            hint: 0
        };

        results.forEach(result => {
            const ruleCode = result.code;
            if (ruleCode) {
                uniqueFailedRules.add(ruleCode);
            }

            const severityIndex = typeof result.severity === 'number' ? result.severity : 2;
            const severity = ['error', 'warn', 'info', 'hint'][severityIndex] || 'info';
            if (severity === 'error') {
                severityViolationCounts.error += 1;
            } else if (severity === 'warn') {
                severityViolationCounts.warn += 1;
            } else if (severity === 'info') {
                severityViolationCounts.info += 1;
            } else if (severity === 'hint') {
                severityViolationCounts.hint += 1;
            }
            if (ruleCode) {
                if (severity === 'error') {
                    severityRuleSets.error.add(ruleCode);
                } else if (severity === 'warn') {
                    severityRuleSets.warning.add(ruleCode);
                } else if (severity === 'info') {
                    severityRuleSets.info.add(ruleCode);
                } else if (severity === 'hint') {
                    severityRuleSets.hint.add(ruleCode);
                }
            }
        });
        
        const failedRuleCodes = new Set<string>([
            ...severityRuleSets.error,
            ...severityRuleSets.warning,
            ...severityRuleSets.info,
            ...severityRuleSets.hint
        ]);

        const totalRules = Object.keys(ruleset.rules || {}).length || 1;
        const failedRuleCount = Math.min(totalRules, failedRuleCodes.size);
        const passedRuleCount = Math.max(0, totalRules - failedRuleCount);
        const score = Math.round((passedRuleCount / totalRules) * 100);
        
        // Format violations — include description and source range for inline YAML preview
        const violations = results.map(result => {
            const ruleName = result.code || 'unknown';
            const ruleDef = ruleset.rules?.[ruleName];
            const description: string | undefined =
                ruleDef && typeof ruleDef === 'object' ? (ruleDef as any).description ?? undefined : undefined;
            const fixSuggestion: string | undefined =
                ruleDef && typeof ruleDef === 'object' && typeof (ruleDef as any).fixSuggestion === 'string'
                    ? (ruleDef as any).fixSuggestion
                    : undefined;
            return {
                rule: ruleName,
                message: result.message || 'No message provided',
                ...(description ? { description } : {}),
                ...(fixSuggestion ? { fixSuggestion } : {}),
                severity: ['error', 'warn', 'info', 'hint'][result.severity as number] || 'info',
                path: result.path || [],
                ...(result.range ? {
                    range: {
                        start: { line: result.range.start.line, character: result.range.start.character },
                        end: { line: result.range.end.line, character: result.range.end.character }
                    }
                } : {})
            };
        });

        const violationSummary = {
            totalViolations: results.length,
            errorRules: severityRuleSets.error.size,
            warningRules: severityRuleSets.warning.size,
            infoRules: severityRuleSets.info.size,
            hintRules: severityRuleSets.hint.size,
            errorViolations: severityViolationCounts.error,
            warningViolations: severityViolationCounts.warn,
            infoViolations: severityViolationCounts.info,
            hintViolations: severityViolationCounts.hint
        };
        
        const aiReadinessMetrics = convertCollectorMetricsToCore(metadata?.aiReadiness ?? null);

        const passedRules = Object.entries(ruleset.rules || {}).reduce<
            Array<{ rule: string; message: string; description?: string; fixSuggestion?: string; severity: string }>
        >(
            (acc, [ruleName, ruleConfig]) => {
                if (failedRuleCodes.has(ruleName)) {
                    return acc;
                }
                const ruleDef =
                    ruleConfig && typeof ruleConfig === 'object' ? (ruleConfig as Record<string, unknown>) : null;
                const description =
                    ruleDef && typeof ruleDef.description === 'string' ? ruleDef.description : undefined;
                const yamlMessage =
                    ruleDef && typeof ruleDef.message === 'string' ? ruleDef.message : undefined;
                const fixSuggestion =
                    ruleDef && typeof ruleDef.fixSuggestion === 'string' ? ruleDef.fixSuggestion : undefined;
                // Message: Spectral `message` (what the rule enforces) — distinct from `description` in the ruleset.
                const message =
                    yamlMessage ??
                    'This rule passed — no matching issues in your API.';
                acc.push({
                    rule: ruleName,
                    message,
                    ...(description ? { description } : {}),
                    ...(fixSuggestion ? { fixSuggestion } : {}),
                    severity: 'passed'
                });
                return acc;
            },
            []
        );

        const response: GetGovernanceResponse = {
            score: score,
            totalChecks: totalRules,
            passedChecks: passedRuleCount,
            failedChecks: failedRuleCount,
            violationSummary,
            violations: violations,
            passed: passedRules
        };

        const summary = buildAiReadinessSummary({
            ...response,
            aiReadinessMetrics
        } as GetGovernanceResponse);
        if (summary) {
            response.aiReadinessSummary = summary;
        }

        return response;
    } catch (error: any) {
        logError(`Error validating with dynamic ruleset ${rulesetName}:`, error);
        throw new Error(`Failed to validate with ${rulesetName}: ${error.message}`);
    }
}

/**
 * Validates API specification (OpenAPI or AsyncAPI) using Spectral with appropriate ruleset
 */
export async function validateAPISpec(apiSpec: any): Promise<any> {
    const specContent = typeof apiSpec === 'string' ? apiSpec : yaml.dump(apiSpec);
    
    // Use spec service to get appropriate validation ruleset
    const { SpecificationFactory } = await import('@wso2/api-designer-core');
    const specService = SpecificationFactory.getServiceFromContent(specContent);
    
    if (!specService) {
        logError('Unable to detect specification type for validation');
        return {
            isValid: false,
            errors: [{
                path: [''],
                message: 'Unable to detect specification type',
                severity: 'error',
                code: 'spec-detection-error'
            }],
            warnings: [],
            errorCount: 1,
            warningCount: 0
        };
    }
    
    // Get the default validation ruleset for this spec type
    const rulesetName = specService.getDefaultValidationRuleset();
    const rulesetDisplayName = specService.getDefaultValidationRulesetName();
    
    // Run Spectral linting with appropriate ruleset
    let spectralResults: any[] = [];
    try {
        const spectral = new Spectral();
        
        // Use appropriate ruleset based on spec type
        if (rulesetName === 'asyncapi') {
            await spectral.setRuleset(asyncapi as any);
            logDebug(`Using ${rulesetDisplayName} ruleset for validation`);
        } else {
            await spectral.setRuleset(oas as any);
            logDebug(`Using ${rulesetDisplayName} ruleset for validation`);
        }
        
        const document = new Document(specContent, Parsers.Yaml);
        
        spectralResults = await spectral.run(document);
    } catch (err) {
        logError('Spectral validation error:', err);
        return {
            isValid: false,
            errors: [{
                path: [''],
                message: `Validation failed: ${(err as Error).message}`,
                severity: 'error',
                code: 'validation-error'
            }],
            warnings: [],
            errorCount: 1,
            warningCount: 0
        };
    }
    
    // Convert Spectral results to ValidationError format
    const errors: any[] = [];
    const warnings: any[] = [];
    
    spectralResults.forEach((result) => {
        const rawPath: any[] = Array.isArray(result.path) ? result.path : [];
        const pathArray = rawPath
            .map((segment) => (typeof segment === 'string' ? segment : String(segment)))
            .filter((segment: string) => segment !== '');
        
        const error = {
            path: pathArray,
            message: result.message || 'Unknown validation error',
            severity: result.severity === 0 ? 'error' : result.severity === 1 ? 'warning' : 'info',
            code: result.code || 'unknown',
            range: result.range ? {
                start: { line: result.range.start.line, character: result.range.start.character },
                end: { line: result.range.end.line, character: result.range.end.character }
            } : undefined
        };
        
        if (error.severity === 'error') {
            errors.push(error);
        } else if (error.severity === 'warning') {
            warnings.push(error);
        }
    });
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        errorCount: errors.length,
        warningCount: warnings.length
    };
}

/**
 * Helper to format version string to vX.Y format
 */
function formatVersion(version?: string): string {
    if (!version) return 'v1.0';
    
    // Remove existing 'v' prefix if present
    let clean = version.toLowerCase().startsWith('v') ? version.substring(1) : version;
    
    // Split by dots and take first two parts
    const parts = clean.split('.');
    const major = parts[0] || '1';
    const minor = parts[1] || '0';
    
    return `v${major}.${minor}`;
}

/**
 * Converts an OpenAPI specification to WSO2 API Platform YAML format
 */
export function convertOpenAPIToWSO2YAML(
    apiSpec: any, 
    existingArtifact?: any,
    userProvidedName?: string,
    userProvidedVersion?: string,
    userProvidedContext?: string,
    userProvidedDescription?: string,
    userProvidedMainEndpoint?: string,
    userProvidedSandboxEndpoint?: string
): string {
    // Parse the API spec if it's a string
    const spec = typeof apiSpec === 'string' ? loadYaml(apiSpec) : apiSpec;
    
    // Use user-provided values if available, otherwise extract from OpenAPI
    const apiName = userProvidedName || spec.info?.title || 'Untitled API';
    const apiVersion = userProvidedVersion ? formatVersion(userProvidedVersion) : formatVersion(spec.info?.version);
    const apiDescription = userProvidedDescription || spec.info?.description || '';
    
    // Extract operations from paths
    const operations: any[] = [];
    
    if (spec.paths) {
        for (const [pathKey, pathValue] of Object.entries(spec.paths)) {
            const pathObj = pathValue as any;
            
            // Iterate through HTTP methods
            const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace'];
            for (const method of methods) {
                if (pathObj[method]) {
                    operations.push({
                        method: method.toUpperCase(),
                        path: pathKey
                    });
                }
            }
        }
    }
    
    // If existing artifact exists, merge only specific fields
    if (existingArtifact && existingArtifact.spec) {
        logDebug('Merging with existing artifact - updating name, version, description, context, and operations');
        
        const existingOperations = Array.isArray(existingArtifact.spec.operations)
            ? existingArtifact.spec.operations
            : [];
        const existingOpMap = new Map<string, any>();
        existingOperations.forEach((op: any) => {
            if (op?.method && op?.path) {
                const key = `${String(op.method).toUpperCase()}::${op.path}`;
                existingOpMap.set(key, op);
            }
        });

        const mergedOperations = operations.map(op => {
            const key = `${op.method}::${op.path}`;
            if (existingOpMap.has(key)) {
                return existingOpMap.get(key);
            }
            return op;
        });
        
        // Use user-provided endpoints or extract from OpenAPI spec or existing artifact
        let mainEndpointUrl = userProvidedMainEndpoint || '';
        let sandboxEndpointUrl = userProvidedSandboxEndpoint || '';
        
        // Try to extract from existing artifact if not provided
        if (!mainEndpointUrl && existingArtifact.spec.upstream) {
            mainEndpointUrl = existingArtifact.spec.upstream.main?.url || '';
        }
        if (!sandboxEndpointUrl && existingArtifact.spec.upstream) {
            sandboxEndpointUrl = existingArtifact.spec.upstream.sandbox?.url || '';
        }
        
        // Fallback to spec servers if no main endpoint provided
        if (!mainEndpointUrl && spec.servers && spec.servers.length > 0) {
            mainEndpointUrl = spec.servers[0].url || '';
        }
        
        // Build upstream object
        const upstream: any = {};
        if (mainEndpointUrl) {
            upstream.main = { url: mainEndpointUrl };
        }
        if (sandboxEndpointUrl) {
            upstream.sandbox = { url: sandboxEndpointUrl };
        }
        
        // Generate kebab-case name for metadata
        const metadataName = (userProvidedName || existingArtifact.metadata?.name || apiName)
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .trim();

        const mergedConfig = {
            ...existingArtifact,
            apiVersion: 'gateway.api-platform.wso2.com/v1alpha1',
            kind: 'RestApi',
            metadata: {
                ...existingArtifact.metadata,
                name: metadataName
            },
            spec: {
                ...existingArtifact.spec,
                displayName: apiName,
                version: apiVersion,
                ...(apiDescription && { description: apiDescription }),
                ...(userProvidedContext && { context: userProvidedContext }),
                upstream: Object.keys(upstream).length > 0 ? upstream : (existingArtifact.spec.upstream || {}),
                operations: mergedOperations
            }
        };
        
        return yaml.dump(mergedConfig, {
            indent: 2,
            lineWidth: -1,
            noRefs: true
        });
    }
    
    // No existing file - create new artifact with defaults
    logDebug('Creating new WSO2 artifact from scratch');
    
    // Use user-provided context or extract from servers or generate from API name
    let context = userProvidedContext || '/api';
    if (!userProvidedContext) {
        if (spec.info && typeof spec.info.title === 'string') {
            const cleanTitle = spec.info.title
                .replace(/[^\w\s]/g, '')
                .replace(/\s+/g, ' ')
                .trim();

            if (cleanTitle) {
                context = '/' + cleanTitle.replace(/\s+/g, '-').toLowerCase();
            }
        }
    }
    
    // Use user-provided endpoints or extract from spec
    let mainEndpointUrl = userProvidedMainEndpoint || '';
    let sandboxEndpointUrl = userProvidedSandboxEndpoint || '';
    
    if (!mainEndpointUrl && spec.servers && spec.servers.length > 0) {
        const firstServer = spec.servers[0];
        mainEndpointUrl = firstServer.url || '';
        
        if (!userProvidedContext) {
            try {
                const url = new URL(firstServer.url);
                context = url.pathname || '/api';
            } catch {
                if (firstServer.url && firstServer.url.startsWith('/')) {
                    context = firstServer.url;
                }
            }
        }
    }
    
    // Build upstream object
    const upstream: any = {};
    if (mainEndpointUrl) {
        upstream.main = { url: mainEndpointUrl };
    }
    if (sandboxEndpointUrl) {
        upstream.sandbox = { url: sandboxEndpointUrl };
    }
    
    // Generate kebab-case name for metadata
    const metadataName = apiName
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .trim();

    // Build the WSO2 API Platform YAML structure
    const wso2ApiConfig: any = {
        apiVersion: 'gateway.api-platform.wso2.com/v1alpha1',
        kind: 'RestApi',
        metadata: {
            name: metadataName
        },
        spec: {
            displayName: apiName,
            version: apiVersion,
            context: context,
            ...(apiDescription && { description: apiDescription }),
            upstream: upstream,
            operations: operations
        }
    };
    
    return yaml.dump(wso2ApiConfig, {
        indent: 2,
        lineWidth: -1,
        noRefs: true
    });
}
