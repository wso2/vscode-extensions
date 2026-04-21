import type { IFunction, IFunctionResult } from '@stoplight/spectral-core';

export type AiReadinessCategory =
    | 'summaries'
    | 'descriptions'
    | 'examples'
    | 'errorResponses';

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

export const createAiReadinessFunctions = (collector: AiReadinessMetricsCollector): Record<string, IFunction> => ({
    aiReadinessFieldCoverage: fieldCoverageFunction(collector),
    aiReadinessErrorResponseCoverage: errorResponseCoverageFunction(collector)
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
        clonedRule.then = rule.then.map(thenClause => replaceFunctionInThen(thenClause, functions));
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

