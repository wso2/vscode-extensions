import type { IFunction, IFunctionResult } from '@stoplight/spectral-core';

export type AiReadinessCategory =
    | 'summaries'
    | 'descriptions'
    | 'examples'
    | 'errorResponses'
    | 'typing'
    | 'errorSemantics'
    | 'headers'
    | 'pagination'
    | 'security'
    | 'idempotency';

type PathTuple = Array<string | number>;

export interface AiReadinessCoverageStats {
    total: number;
    passed: number;
    failed: number;
    passedPaths: PathTuple[];
    failedPaths: PathTuple[];
}

export interface AiReadinessMetrics {
    categories: Record<AiReadinessCategory | string, AiReadinessCoverageStats>;
}

interface RecordOptions {
    recordPath?: PathTuple;
}

export class AiReadinessMetricsCollector {
    private readonly categories = new Map<string, AiReadinessCoverageStats>();

    private ensureCategory(category: string): AiReadinessCoverageStats {
        let stats = this.categories.get(category);
        if (!stats) {
            stats = {
                total: 0,
                passed: 0,
                failed: 0,
                passedPaths: [],
                failedPaths: []
            };
            this.categories.set(category, stats);
        }
        return stats;
    }

    record(category: string, passed: boolean, options?: RecordOptions): void {
        const stats = this.ensureCategory(category);
        stats.total += 1;
        const path = options?.recordPath ? [...options.recordPath] : undefined;

        if (passed) {
            stats.passed += 1;
            if (path) {
                stats.passedPaths.push(path);
            }
        } else {
            stats.failed += 1;
            if (path) {
                stats.failedPaths.push(path);
            }
        }
    }

    export(): AiReadinessMetrics {
        const categories: Record<string, AiReadinessCoverageStats> = {};
        for (const [key, value] of this.categories.entries()) {
            categories[key] = {
                total: value.total,
                passed: value.passed,
                failed: value.failed,
                passedPaths: value.passedPaths.map(path => [...path]),
                failedPaths: value.failedPaths.map(path => [...path])
            };
        }
        return { categories };
    }
}

interface FieldCoverageOptions {
    category: string;
    field?: string;
    fields?: string[];
    minLength?: number;
}

interface ErrorResponseOptions {
    category: string;
    requiredCodes?: string[];
}

const isNonEmpty = (value: unknown, minLength?: number): boolean => {
    if (value === null || value === undefined) {
        return false;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        return minLength ? trimmed.length >= minLength : trimmed.length > 0;
    }

    if (Array.isArray(value)) {
        return value.length > 0;
    }

    if (typeof value === 'object') {
        return Object.keys(value as Record<string, unknown>).length > 0;
    }

    return true;
};

const resolveFieldValue = (target: unknown, field: string | undefined): unknown => {
    if (!field || typeof target !== 'object' || target === null) {
        return undefined;
    }
    return (target as Record<string, unknown>)[field];
};

const fieldCoverageFunction = (collector: AiReadinessMetricsCollector): IFunction =>
    function aiReadinessFieldCoverage(targetVal, rawOpts, context): IFunctionResult[] {
        const opts = (rawOpts || {}) as FieldCoverageOptions;
        const fields = opts.fields && opts.fields.length > 0
            ? opts.fields
            : (opts.field ? [opts.field] : []);

        let passes = false;
        let selectedField: string | undefined;
        let value: unknown;

        for (const field of fields) {
            value = resolveFieldValue(targetVal, field);
            if (isNonEmpty(value, opts.minLength)) {
                passes = true;
                selectedField = field;
                break;
            }
        }

        // Fallback: if no specific field matched, but value exists directly
        if (!passes && fields.length === 0) {
            passes = isNonEmpty(targetVal, opts.minLength);
        }

        const path: PathTuple = selectedField
            ? [...context.path, selectedField]
            : [...context.path];

        collector.record(opts.category, passes, { recordPath: path });

        if (passes) {
            return [];
        }

        return [
            {
                message: context.rule.message ?? 'Field is missing or empty',
                path
            }
        ];
    };

const errorResponseCoverageFunction = (collector: AiReadinessMetricsCollector): IFunction =>
    function aiReadinessErrorResponseCoverage(targetVal, rawOpts, context): IFunctionResult[] {
        const opts = (rawOpts || {}) as ErrorResponseOptions;
        const requiredCodes = opts.requiredCodes && opts.requiredCodes.length > 0
            ? opts.requiredCodes
            : ['400', '401', '403', '404', '422', '429'];

        let responses: Record<string, unknown> | undefined;
        if (typeof targetVal === 'object' && targetVal !== null) {
            responses = (targetVal as Record<string, unknown>).responses as Record<string, unknown>;
        }

        const hasResponses = responses && typeof responses === 'object';
        const hasRequired = hasResponses
            ? requiredCodes.some(code => responses && Object.prototype.hasOwnProperty.call(responses, code))
            : false;

        collector.record(opts.category, !!hasRequired, { recordPath: [...context.path, 'responses'] });

        if (hasRequired) {
            return [];
        }

        return [
            {
                message: context.rule.message ?? 'Missing required error responses',
                path: [...context.path, 'responses']
            }
        ];
    };

interface SchemaTypingOptions {
    category: string;
}

const schemaTypingFunction = (collector: AiReadinessMetricsCollector): IFunction =>
    function aiReadinessSchemaTyping(targetVal, rawOpts, context): IFunctionResult[] {
        const opts = (rawOpts || {}) as SchemaTypingOptions;
        const schema = typeof targetVal === 'object' && targetVal !== null
            ? targetVal as Record<string, unknown>
            : {};
        const hasType = typeof schema.type === 'string' && schema.type.trim().length > 0;
        const hasRef = typeof schema.$ref === 'string';
        const passed = hasType || hasRef;
        collector.record(opts.category, passed, { recordPath: [...context.path] });
        if (passed) return [];
        return [{ message: context.rule.message ?? 'Schema must have an explicit type defined', path: [...context.path] }];
    };

interface ErrorSchemaStructureOptions {
    category: string;
    requiredFields?: string[];
    responseCodePattern?: string;
}

const extractResponseCodeFromPath = (path: Array<string | number>): string | undefined => {
    const idx = path.findIndex((segment) => String(segment) === 'responses');
    if (idx < 0 || idx + 1 >= path.length) {
        return undefined;
    }
    return String(path[idx + 1]);
};

const errorSchemaStructureFunction = (collector: AiReadinessMetricsCollector): IFunction =>
    function aiReadinessErrorSchemaStructure(targetVal, rawOpts, context): IFunctionResult[] {
        const opts = (rawOpts || {}) as ErrorSchemaStructureOptions;
        // Only apply response-code filtering when the caller provides an explicit pattern.
        // When the YAML `given` path already scopes to error responses, no pattern is needed.
        if (opts.responseCodePattern) {
            const responseCode = extractResponseCodeFromPath(context.path);
            if (!responseCode || !new RegExp(opts.responseCodePattern).test(responseCode)) {
                return [];
            }
        }
        const requiredFields = opts.requiredFields && opts.requiredFields.length > 0
            ? opts.requiredFields
            : ['message'];
        const schema = typeof targetVal === 'object' && targetVal !== null
            ? targetVal as Record<string, unknown>
            : {};
        const properties = typeof schema.properties === 'object' && schema.properties !== null
            ? schema.properties as Record<string, unknown>
            : {};
        const missingFields = requiredFields.filter(f => !(f in properties));
        const passed = missingFields.length === 0;
        collector.record(opts.category, passed, { recordPath: [...context.path] });
        if (passed) return [];
        return [{ message: context.rule.message ?? `Error schema missing fields: ${missingFields.join(', ')}`, path: [...context.path] }];
    };

interface RateLimitHeaderOptions {
    category: string;
}

const rateLimitHeaderFunction = (collector: AiReadinessMetricsCollector): IFunction =>
    function aiReadinessRateLimitHeader(targetVal, rawOpts, context): IFunctionResult[] {
        const opts = (rawOpts || {}) as RateLimitHeaderOptions;
        const response = typeof targetVal === 'object' && targetVal !== null
            ? targetVal as Record<string, unknown>
            : {};
        const headers = typeof response.headers === 'object' && response.headers !== null
            ? response.headers as Record<string, unknown>
            : {};
        const headerNames = Object.keys(headers).map(h => h.toLowerCase());
        const passed = headerNames.includes('retry-after') ||
            headerNames.some(h => h.startsWith('x-ratelimit-') || h.startsWith('x-rate-limit-'));
        collector.record(opts.category, passed, { recordPath: [...context.path] });
        if (passed) return [];
        return [{ message: context.rule.message ?? '429 response must include Retry-After or X-RateLimit-* headers', path: [...context.path] }];
    };

interface PaginationOptions {
    category: string;
}

const paginationParamsFunction = (collector: AiReadinessMetricsCollector): IFunction =>
    function aiReadinessPaginationParams(targetVal, rawOpts, context): IFunctionResult[] {
        const opts = (rawOpts || {}) as PaginationOptions;
        const operation = typeof targetVal === 'object' && targetVal !== null
            ? targetVal as Record<string, unknown>
            : {};
        const parameters = Array.isArray(operation.parameters) ? operation.parameters : [];
        const paramNames = parameters.map((p: unknown) => {
            if (typeof p === 'object' && p !== null) {
                const name = (p as Record<string, unknown>).name;
                return typeof name === 'string' ? name.toLowerCase() : '';
            }
            return '';
        });
        const hasCursorOrPage = paramNames.includes('cursor') || paramNames.includes('page') || paramNames.includes('offset');
        const hasLimit = paramNames.includes('limit') || paramNames.includes('page_size') ||
            paramNames.includes('pagesize') || paramNames.includes('per_page');
        const passed = hasCursorOrPage && hasLimit;
        collector.record(opts.category, passed, { recordPath: [...context.path] });
        if (passed) return [];
        return [{ message: context.rule.message ?? 'List endpoint should have pagination parameters (cursor/page and limit)', path: [...context.path] }];
    };

interface SecuritySchemeOptions {
    category: string;
}

const securitySchemeFunction = (collector: AiReadinessMetricsCollector): IFunction =>
    function aiReadinessSecurityScheme(targetVal, rawOpts, context): IFunctionResult[] {
        const opts = (rawOpts || {}) as SecuritySchemeOptions;
        const scheme = typeof targetVal === 'object' && targetVal !== null
            ? targetVal as Record<string, unknown>
            : {};
        let hasInteractiveFlow = false;
        if (scheme.type === 'oauth2') {
            const flows = typeof scheme.flows === 'object' && scheme.flows !== null
                ? scheme.flows as Record<string, unknown>
                : {};
            hasInteractiveFlow = ('implicit' in flows) || ('authorizationCode' in flows);
        }
        const passed = !hasInteractiveFlow;
        collector.record(opts.category, passed, { recordPath: [...context.path] });
        if (passed) return [];
        return [{ message: context.rule.message ?? 'Security scheme uses interactive OAuth flow not suitable for AI agents', path: [...context.path] }];
    };

interface IdempotencyOptions {
    category: string;
}

const idempotencyFunction = (collector: AiReadinessMetricsCollector): IFunction =>
    function aiReadinessIdempotency(targetVal, rawOpts, context): IFunctionResult[] {
        const opts = (rawOpts || {}) as IdempotencyOptions;
        const operation = typeof targetVal === 'object' && targetVal !== null
            ? targetVal as Record<string, unknown>
            : {};
        const parameters = Array.isArray(operation.parameters) ? operation.parameters : [];
        const passed = parameters.some((p: unknown) => {
            if (typeof p !== 'object' || p === null) return false;
            const param = p as Record<string, unknown>;
            return param.in === 'header' &&
                typeof param.name === 'string' &&
                param.name.toLowerCase() === 'idempotency-key';
        });
        collector.record(opts.category, passed, { recordPath: [...context.path] });
        if (passed) return [];
        return [{ message: context.rule.message ?? 'Mutating operation should support Idempotency-Key header for safe retries', path: [...context.path] }];
    };

interface ErrorSchemaAnyFieldsOptions {
    category: string;
    anyFields?: string[];
    responseCodes?: string[];
}

const errorSchemaAnyFieldsFunction = (collector: AiReadinessMetricsCollector): IFunction =>
    function aiReadinessErrorSchemaAnyFields(targetVal, rawOpts, context): IFunctionResult[] {
        const opts = (rawOpts || {}) as ErrorSchemaAnyFieldsOptions;
        // Only filter by response code when the caller explicitly provides codes.
        // When the YAML `given` path already scopes to a specific status code, no filtering is needed.
        if (opts.responseCodes && opts.responseCodes.length > 0) {
            const responseCode = extractResponseCodeFromPath(context.path);
            const responseCodes = opts.responseCodes.map((code) => String(code));
            if (!responseCode || !responseCodes.includes(responseCode)) {
                return [];
            }
        }
        const anyFields = opts.anyFields && opts.anyFields.length > 0 ? opts.anyFields : [];
        const schema = typeof targetVal === 'object' && targetVal !== null
            ? targetVal as Record<string, unknown>
            : {};
        const properties = typeof schema.properties === 'object' && schema.properties !== null
            ? schema.properties as Record<string, unknown>
            : {};
        const passed = anyFields.length === 0 || anyFields.some(f => f in properties);
        collector.record(opts.category, passed, { recordPath: [...context.path] });
        if (passed) return [];
        return [{ message: context.rule.message ?? `Error schema should include one of: ${anyFields.join(', ')}`, path: [...context.path] }];
    };

const paginationMetaFunction = (collector: AiReadinessMetricsCollector): IFunction =>
    function aiReadinessPaginationMeta(targetVal, rawOpts, context): IFunctionResult[] {
        const opts = (rawOpts || {}) as PaginationOptions;
        const schema = typeof targetVal === 'object' && targetVal !== null
            ? targetVal as Record<string, unknown>
            : {};
        const properties = typeof schema.properties === 'object' && schema.properties !== null
            ? Object.keys(schema.properties as Record<string, unknown>).map(k => k.toLowerCase())
            : [];
        const hasMoreField = properties.some(p =>
            ['has_more', 'hasmore', 'has_next', 'hasnext', 'is_last', 'islast'].includes(p)
        );
        const hasCursorField = properties.some(p =>
            ['next_cursor', 'nextcursor', 'next_page', 'nextpage', 'cursor', 'next', 'page_token', 'nextpagetoken', 'continuation_token'].includes(p)
        );
        const hasTotalField = properties.some(p =>
            ['total', 'total_count', 'totalcount', 'count', 'total_items', 'totalitems'].includes(p)
        );
        const passed = hasMoreField || hasCursorField || hasTotalField;
        collector.record(opts.category, passed, { recordPath: [...context.path] });
        if (passed) return [];
        return [{ message: context.rule.message ?? 'List response schema should include pagination metadata (has_more, next_cursor, or total)', path: [...context.path] }];
    };

const schemaNoEmptyObjectFunction = (collector: AiReadinessMetricsCollector): IFunction =>
    function aiReadinessSchemaNoEmptyObject(targetVal, rawOpts, context): IFunctionResult[] {
        const opts = (rawOpts || {}) as SchemaTypingOptions;
        const schema = typeof targetVal === 'object' && targetVal !== null
            ? targetVal as Record<string, unknown>
            : {};
        if (schema.type !== 'object') return [];
        const hasRef = typeof schema.$ref === 'string';
        const hasComposition = Array.isArray(schema.allOf) || Array.isArray(schema.oneOf) || Array.isArray(schema.anyOf);
        const hasProperties = typeof schema.properties === 'object' && schema.properties !== null
            && Object.keys(schema.properties as Record<string, unknown>).length > 0;
        const hasAdditional = schema.additionalProperties !== undefined;
        const passed = hasRef || hasComposition || hasProperties || hasAdditional;
        collector.record(opts.category, passed, { recordPath: [...context.path] });
        if (passed) return [];
        return [{ message: context.rule.message ?? 'Object schema must define properties or additionalProperties — empty object types are ambiguous for AI', path: [...context.path] }];
    };

const arrayItemsDefinedFunction = (collector: AiReadinessMetricsCollector): IFunction =>
    function aiReadinessArrayItemsDefined(targetVal, rawOpts, context): IFunctionResult[] {
        const opts = (rawOpts || {}) as SchemaTypingOptions;
        const schema = typeof targetVal === 'object' && targetVal !== null
            ? targetVal as Record<string, unknown>
            : {};
        if (schema.type !== 'array') return [];
        const passed = schema.items !== undefined && schema.items !== null;
        collector.record(opts.category, passed, { recordPath: [...context.path] });
        if (passed) return [];
        return [{ message: context.rule.message ?? 'Array schema must define an items schema — untyped arrays are ambiguous for AI', path: [...context.path] }];
    };

interface ServersDefinedOptions {
    category?: string;
}

const serversDefinedFunction = (collector: AiReadinessMetricsCollector): IFunction =>
    function aiReadinessServersDefined(targetVal, rawOpts, context): IFunctionResult[] {
        const opts = (rawOpts || {}) as ServersDefinedOptions;
        const doc = typeof targetVal === 'object' && targetVal !== null
            ? targetVal as Record<string, unknown>
            : {};
        const servers = doc.servers;
        const passed = Array.isArray(servers) && servers.length > 0 &&
            (servers as unknown[]).some(s => {
                if (typeof s !== 'object' || s === null) return false;
                const url = (s as Record<string, unknown>).url;
                return typeof url === 'string' && url.trim().length > 0;
            });
        if (opts.category) {
            collector.record(opts.category, passed, { recordPath: [...context.path, 'servers'] });
        }
        if (passed) return [];
        return [{ message: context.rule.message ?? 'API must define at least one non-empty server URL', path: [...context.path, 'servers'] }];
    };

interface OperationIdConsistencyOptions {
    category?: string;
    allowedStyles?: string[];
}

interface SchemaConstraintsOptions {
    category: string;
}

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']);

const detectOperationIdStyle = (operationId: string): string => {
    if (/^[a-z][a-zA-Z0-9]*$/.test(operationId)) return 'camel';
    if (/^[A-Z][a-zA-Z0-9]*$/.test(operationId)) return 'pascal';
    if (/^[a-z][a-z0-9_]*$/.test(operationId)) return 'snake';
    if (/^[a-z][a-z0-9-]*$/.test(operationId)) return 'kebab';
    return 'other';
};

const operationIdConsistencyFunction = (collector: AiReadinessMetricsCollector): IFunction =>
    function aiReadinessOperationIdConsistency(targetVal, rawOpts, context): IFunctionResult[] {
        const opts = (rawOpts || {}) as OperationIdConsistencyOptions;
        const doc = typeof targetVal === 'object' && targetVal !== null
            ? targetVal as Record<string, unknown>
            : {};
        const paths = typeof doc.paths === 'object' && doc.paths !== null
            ? doc.paths as Record<string, unknown>
            : {};

        const allowedStyles = new Set((opts.allowedStyles && opts.allowedStyles.length > 0)
            ? opts.allowedStyles
            : ['camel', 'pascal', 'snake', 'kebab']);

        const operationIds: Array<{ operationId: string; style: string; path: PathTuple }> = [];
        Object.entries(paths).forEach(([pathKey, pathItem]) => {
            if (!pathItem || typeof pathItem !== 'object') return;
            Object.entries(pathItem as Record<string, unknown>).forEach(([method, operation]) => {
                if (!HTTP_METHODS.has(method) || !operation || typeof operation !== 'object') return;
                const operationId = (operation as Record<string, unknown>).operationId;
                if (typeof operationId !== 'string' || operationId.trim().length === 0) return;
                operationIds.push({
                    operationId,
                    style: detectOperationIdStyle(operationId),
                    path: ['paths', pathKey, method, 'operationId']
                });
            });
        });

        if (operationIds.length <= 1) {
            operationIds.forEach((entry) => {
                if (opts.category) {
                    collector.record(opts.category, true, { recordPath: entry.path });
                }
            });
            return [];
        }

        const styleCounts = new Map<string, number>();
        operationIds.forEach(({ style }) => {
            if (!allowedStyles.has(style)) return;
            styleCounts.set(style, (styleCounts.get(style) ?? 0) + 1);
        });

        const dominantStyle = Array.from(styleCounts.entries())
            .sort((a, b) => b[1] - a[1])[0]?.[0];

        if (!dominantStyle) {
            operationIds.forEach((entry) => {
                if (opts.category) {
                    collector.record(opts.category, true, { recordPath: entry.path });
                }
            });
            return [];
        }

        const violations: IFunctionResult[] = [];
        operationIds.forEach((entry) => {
            const passed = entry.style === dominantStyle || !allowedStyles.has(entry.style);
            if (opts.category) {
                collector.record(opts.category, passed, { recordPath: entry.path });
            }
            if (!passed) {
                violations.push({
                    message: `operationId '${entry.operationId}' uses '${entry.style}' style while the API primarily uses '${dominantStyle}' style`,
                    path: entry.path
                });
            }
        });

        return violations;
    };

const schemaConstraintsFunction = (collector: AiReadinessMetricsCollector): IFunction =>
    function aiReadinessSchemaHasConstraints(targetVal, rawOpts, context): IFunctionResult[] {
        const opts = (rawOpts || {}) as SchemaConstraintsOptions;
        const schema = typeof targetVal === 'object' && targetVal !== null ? targetVal as Record<string, unknown> : {};
        const schemaType = typeof schema.type === 'string' ? schema.type : undefined;

        let passed = true;
        if (schemaType === 'string') {
            passed = schema.pattern !== undefined || schema.minLength !== undefined || schema.maxLength !== undefined;
        } else if (schemaType === 'number' || schemaType === 'integer') {
            passed = schema.minimum !== undefined || schema.maximum !== undefined;
        }

        collector.record(opts.category, passed, { recordPath: [...context.path] });
        if (passed) return [];
        return [{
            message: context.rule.message ?? 'Scalar schema should define validation constraints for deterministic AI generation',
            path: [...context.path]
        }];
    };

export const createAiReadinessFunctions = (collector: AiReadinessMetricsCollector): Record<string, IFunction> => ({
    aiReadinessFieldCoverage: fieldCoverageFunction(collector),
    aiReadinessErrorResponseCoverage: errorResponseCoverageFunction(collector),
    aiReadinessSchemaTyping: schemaTypingFunction(collector),
    aiReadinessErrorSchemaStructure: errorSchemaStructureFunction(collector),
    aiReadinessErrorSchemaAnyFields: errorSchemaAnyFieldsFunction(collector),
    aiReadinessRateLimitHeader: rateLimitHeaderFunction(collector),
    aiReadinessPaginationParams: paginationParamsFunction(collector),
    aiReadinessPaginationMeta: paginationMetaFunction(collector),
    aiReadinessSecurityScheme: securitySchemeFunction(collector),
    aiReadinessIdempotency: idempotencyFunction(collector),
    aiReadinessServersDefined: serversDefinedFunction(collector),
    aiReadinessSchemaNoEmptyObject: schemaNoEmptyObjectFunction(collector),
    aiReadinessArrayItemsDefined: arrayItemsDefinedFunction(collector),
    aiReadinessOperationIdConsistency: operationIdConsistencyFunction(collector),
    aiReadinessSchemaHasConstraints: schemaConstraintsFunction(collector)
});

const replaceFunctionInThen = (thenClause: any, functions: Record<string, IFunction>) => {
    if (!thenClause) {
        return thenClause;
    }

    const cloned = { ...thenClause };
    if (typeof cloned.function === 'string' && functions[cloned.function]) {
        cloned.function = functions[cloned.function];
    }

    return cloned;
};

const replaceFunctionsInRule = (rule: any, functions: Record<string, IFunction>) => {
    if (!rule || typeof rule !== 'object') {
        return rule;
    }

    const clonedRule = { ...rule };

    if (Array.isArray(rule.then)) {
        clonedRule.then = rule.then.map((thenClause: any) => replaceFunctionInThen(thenClause, functions));
    } else if (rule.then) {
        clonedRule.then = replaceFunctionInThen(rule.then, functions);
    }

    return clonedRule;
};

export const applyAiReadinessFunctionsToRuleset = (
    ruleset: any,
    functions: Record<string, IFunction>
): any => {
    if (!ruleset || typeof ruleset !== 'object') {
        return ruleset;
    }

    const clonedRuleset: any = { ...ruleset };

    if (ruleset.rules && typeof ruleset.rules === 'object') {
        clonedRuleset.rules = Object.entries(ruleset.rules).reduce<Record<string, any>>((acc, [name, rule]) => {
            acc[name] = replaceFunctionsInRule(rule, functions);
            return acc;
        }, {});
    }

    if (Array.isArray(ruleset.overrides)) {
        clonedRuleset.overrides = ruleset.overrides.map((override: any) => {
            if (override.rules && typeof override.rules === 'object') {
                return {
                    ...override,
                    rules: Object.entries(override.rules).reduce<Record<string, any>>((acc, [name, rule]) => {
                        acc[name] = replaceFunctionsInRule(rule, functions);
                        return acc;
                    }, {})
                };
            }
            return override;
        });
    }

    return clonedRuleset;
};

