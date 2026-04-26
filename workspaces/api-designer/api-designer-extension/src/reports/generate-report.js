/**
 * Turn Spectral-style validation output (violations + scores) into a full analyze report
 * (violations by id, overview, breakdown, issue explorer filters). Used by API Designer
 * and other consumers.
 *
 * @module @wso2/wso2-spectral/reports/generate-report
 */

const OWASP_CATEGORIES = [
  { key: 'API1:2023',  label: 'Broken Object Level Authorization',              docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/' },
  { key: 'API2:2023',  label: 'Broken Authentication',                          docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa2-broken-authentication/' },
  { key: 'API3:2023',  label: 'Broken Object Property Level Authorization',     docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/' },
  { key: 'API4:2023',  label: 'Unrestricted Resource Consumption',              docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/' },
  { key: 'API5:2023',  label: 'Broken Function Level Authorization',            docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa5-broken-function-level-authorization/' },
  { key: 'API6:2023',  label: 'Unrestricted Access to Sensitive Business Flows',docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa6-unrestricted-access-to-sensitive-business-flows/' },
  { key: 'API7:2023',  label: 'Server Side Request Forgery',                    docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa7-server-side-request-forgery/' },
  { key: 'API8:2023',  label: 'Security Misconfiguration',                      docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa8-security-misconfiguration/' },
  { key: 'API9:2023',  label: 'Improper Inventory Management',                  docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa9-improper-inventory-management/' },
  { key: 'API10:2023', label: 'Unsafe Consumption of APIs',                     docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xaa-unsafe-consumption-of-apis/' },
];

/**
 * AI Readiness: 4 top-level dimensions, each with sub-buckets.
 * Mirrors the structure used in the API Designer extension.
 */
const AI_DIMENSIONS = [
  {
    id: 'discovery',
    title: 'Semantic Discovery',
    description: 'Can AI agents find the right endpoint and understand its intent?',
    whyItMatters: 'AI agents rely on summaries, descriptions, and stable operation identifiers to select the right tool for a task. Without them, agents must infer behavior through trial and error, leading to incorrect calls and hallucinated responses.',
    subBuckets: [
      { id: 'summaries',    title: 'Summaries',     description: 'Clear operation summaries help agents pick the right endpoint quickly.' },
      { id: 'descriptions', title: 'Descriptions',  description: 'Detailed descriptions reduce ambiguity in agent execution flows.' },
      { id: 'operationIds', title: 'Operation IDs', description: 'Stable operation IDs improve deterministic tool calling for agents.' },
    ],
  },
  {
    id: 'contract',
    title: 'Contract Integrity',
    description: 'Can AI agents construct valid requests and interpret responses without guessing?',
    whyItMatters: 'Agents generate payloads based on schemas and examples. Ambiguous types, missing required fields, or absent examples cause invalid requests or misinterpretation of responses.',
    subBuckets: [
      { id: 'examples', title: 'Examples',      description: 'Request and response examples help agents construct valid payloads.' },
      { id: 'typing',   title: 'Strict Typing', description: 'Strong typing keeps agent-generated requests aligned with schema constraints.' },
      { id: 'errors',   title: 'Responses',     description: 'Defined success and error responses help agents interpret outcomes.' },
    ],
  },
  {
    id: 'resilience',
    title: 'Resilience & Recovery',
    description: 'Can AI agents handle failures, rate limits, and large datasets gracefully?',
    whyItMatters: 'Autonomous agents operate without human supervision. Error schemas enable self-correction, rate limit headers prevent hammering, and pagination metadata indicates when to stop iterating.',
    subBuckets: [
      { id: 'errorSemantics', title: 'Error Semantics',    description: 'Structured, actionable error details for AI self-correction.' },
      { id: 'headers',        title: 'Rate Limit Headers', description: 'Rate limit and retry headers prevent unsafe autonomous request bursts.' },
      { id: 'pagination',     title: 'Pagination',         description: 'Pagination metadata helps agents iterate large datasets safely.' },
    ],
  },
  {
    id: 'security',
    title: 'Security & Integrity',
    description: 'Is the API safe for autonomous agent access over the long term?',
    whyItMatters: 'Agents cannot complete interactive OAuth flows. Undefined security risks unintended state changes. Idempotency prevents duplicate side-effects on retries.',
    subBuckets: [
      { id: 'security',    title: 'Agent Auth',   description: 'Explicit security requirements reduce risk in autonomous access.' },
      { id: 'idempotency', title: 'Idempotency',  description: 'Idempotency protection avoids duplicate side effects on retries.' },
    ],
  },
];

/** Maps every ai-readiness rule name to its sub-bucket id. */
const AI_RULE_CATEGORY = {
  // summaries
  'ai-readiness-operation-summary':             'summaries',
  'ai-readiness-callback-operation-summary':    'summaries',
  'ai-readiness-webhook-operation-summary':     'summaries',
  'ai-readiness-path-item-summary':             'summaries',
  // descriptions
  'ai-readiness-api-description':               'descriptions',
  'ai-readiness-server-description':            'descriptions',
  'ai-readiness-path-item-description':         'descriptions',
  'ai-readiness-operation-description':         'descriptions',
  'ai-readiness-operation-tags':                'descriptions',
  'ai-readiness-parameter-description':         'descriptions',
  'ai-readiness-parameter-description-length':  'descriptions',
  'ai-readiness-request-body-description':      'descriptions',
  'ai-readiness-response-description':          'descriptions',
  'ai-readiness-schema-description':            'descriptions',
  'ai-readiness-schema-description-length':     'descriptions',
  'ai-readiness-schema-title':                  'descriptions',
  'ai-readiness-schema-property-description':   'descriptions',
  'ai-readiness-schema-enum-description':       'descriptions',
  'ai-readiness-tags-description':              'descriptions',
  'ai-readiness-tags-external-docs':            'descriptions',
  'ai-readiness-deprecation-notice':            'descriptions',
  // operationIds
  'ai-readiness-operation-id':                  'operationIds',
  'ai-readiness-operation-id-casing':           'operationIds',
  'ai-readiness-operation-id-unique':           'operationIds',
  // examples
  'ai-readiness-parameter-example':             'examples',
  'ai-readiness-path-parameter-example':        'examples',
  'ai-readiness-parameter-content-example':     'examples',
  'ai-readiness-path-parameter-content-example':'examples',
  'ai-readiness-request-body-example':          'examples',
  'ai-readiness-response-example':              'examples',
  'ai-readiness-response-header-example':       'examples',
  'ai-readiness-schema-example':                'examples',
  'ai-readiness-schema-property-example':       'examples',
  'ai-readiness-component-header-example':      'examples',
  // typing
  'ai-readiness-request-body-schema-typed':          'typing',
  'ai-readiness-request-body-schema-required':       'typing',
  'ai-readiness-response-schema-typed':              'typing',
  'ai-readiness-schema-property-type':               'typing',
  'ai-readiness-parameter-schema-type':              'typing',
  'ai-readiness-schema-string-format':               'typing',
  'ai-readiness-schema-no-empty-object':             'typing',
  'ai-readiness-schema-property-no-empty-object':    'typing',
  'ai-readiness-array-items-defined':                'typing',
  'ai-readiness-array-property-items-defined':       'typing',
  'ai-readiness-schema-validation-constraints':      'typing',
  'ai-readiness-discriminator':                      'typing',
  // errors (responses)
  'ai-readiness-success-response':                   'errors',
  'ai-readiness-success-response-content':           'errors',
  'ai-readiness-success-response-json-schema':       'errors',
  'ai-readiness-error-responses-4xx':                'errors',
  'ai-readiness-error-responses-5xx':                'errors',
  'ai-readiness-error-response-content':             'errors',
  'ai-readiness-error-response-json-schema':         'errors',
  'ai-readiness-response-content-type':              'errors',
  'ai-readiness-error-response-schema':              'errors',
  'ai-readiness-error-response-description-length':  'descriptions',
  // errorSemantics
  'ai-readiness-error-schema-fields':      'errorSemantics',
  'ai-readiness-error-schema-rfc7807':     'errorSemantics',
  'ai-readiness-error-schema-details':     'errorSemantics',
  'ai-readiness-error-schema-actionable':  'errorSemantics',
  // headers
  'ai-readiness-429-rate-limit-headers':   'headers',
  // pagination
  'ai-readiness-list-pagination-params':   'pagination',
  'ai-readiness-pagination-response-meta': 'pagination',
  // security (agent auth)
  'ai-readiness-api-contact':              'security',
  'ai-readiness-no-interactive-auth':      'security',
  'ai-readiness-security-defined':         'security',
  'ai-readiness-security-description':     'security',
  'ai-readiness-security-on-mutating-ops': 'security',
  // idempotency
  'ai-readiness-idempotency-key':          'idempotency',
};

// Flat list of all sub-buckets (for backwards-compat exports)
const AI_CATEGORIES = AI_DIMENSIONS.flatMap((d) => d.subBuckets);

/** Total rule count per sub-bucket — used to compute per-bucket pass percentages. */
const AI_SUB_BUCKET_RULE_COUNTS = Object.values(AI_RULE_CATEGORY).reduce((acc, catId) => {
  acc[catId] = (acc[catId] || 0) + 1;
  return acc;
}, {});

/**
 * Per-sub-bucket importance weights (mirrors the extension's SUB_BUCKET_WEIGHTS).
 * Used when computing a dimension's weighted arithmetic mean score.
 */
const AI_SUB_BUCKET_WEIGHTS = {
  summaries:      1.2,
  descriptions:   1.0,
  operationIds:   1.3,
  examples:       1.0,
  typing:         1.1,
  errors:         1.25,
  errorSemantics: 1.35,
  headers:        1.15,
  pagination:     1.1,
  security:       1.5,
  idempotency:    1.4,
};

/**
 * Per-dimension aggregation weights (mirrors the extension's aggregationWeight).
 * Used when computing the overall score via weighted harmonic mean.
 */
const AI_DIMENSION_WEIGHTS = {
  discovery:  0.26,
  contract:   0.26,
  resilience: 0.24,
  security:   0.24,
};

const _HARMONIC_EPS = 1e-6;

/**
 * Weighted arithmetic mean — used for dimension scores.
 * @param {Array<{value:number, weight:number}>} items
 */
function _weightedArithmeticMean(items) {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const { value, weight } of items) {
    if (weight <= 0) continue;
    weightedSum += value * weight;
    totalWeight += weight;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Weighted harmonic mean — used for the overall AI readiness score.
 * Penalises low-scoring dimensions more heavily than an arithmetic mean would.
 * @param {Array<{value:number, weight:number}>} items
 */
function _weightedHarmonicMean(items) {
  let sumW = 0;
  let denom = 0;
  for (const { value, weight } of items) {
    if (weight <= 0) continue;
    sumW += weight;
    denom += weight / Math.max(_HARMONIC_EPS, value + _HARMONIC_EPS);
  }
  if (sumW <= 0 || denom <= 0) return 0;
  return Math.min(100, Math.max(0, sumW / denom));
}

const WSO2_THEMES = [
  { id: 'resource-design', title: 'Resource Design', description: 'How clear and predictable resource paths and REST nouns are.', keywords: ['resource', 'path', 'uri', 'url', 'noun', 'plural', 'hierarchy'] },
  { id: 'operations-methods', title: 'Operations & Methods', description: 'Whether HTTP methods and operation shapes follow REST semantics.', keywords: ['method', 'http', 'operation', 'get', 'post', 'put', 'patch', 'delete', 'idempotent'] },
  { id: 'contracts-responses', title: 'Contracts & Responses', description: 'Consistency of status codes, response models, and payload contracts.', keywords: ['response', 'status', 'schema', 'contract', 'payload', 'content-type', 'example'] },
  { id: 'documentation', title: 'Documentation Quality', description: 'How usable the API is from summaries, descriptions, and examples.', keywords: ['summary', 'description', 'document', 'docs', 'example', 'title', 'operationid'] },
  { id: 'security-governance', title: 'Security & Governance', description: 'Authentication, authorization, and governance controls for safe APIs.', keywords: ['security', 'auth', 'oauth', 'scope', 'token', 'header', 'https', 'tls'] },
  { id: 'versioning-lifecycle', title: 'Versioning & Lifecycle', description: 'Version strategy and lifecycle clarity for consumers.', keywords: ['version', 'deprecated', 'sunset', 'lifecycle', 'compatibility'] },
];

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']);

/**
 * @param {string} rulesetName
 * @returns {'ai-readiness' | 'owasp' | 'rest-api-readiness'}
 */
function getReportKind(rulesetName) {
  const lower = String(rulesetName).toLowerCase();
  if (lower.includes('ai') && lower.includes('readiness')) return 'ai-readiness';
  if (lower.includes('owasp') || lower.includes('security')) return 'owasp';
  return 'rest-api-readiness';
}

function normalizePath(path) {
  if (Array.isArray(path)) return path.map((segment) => String(segment));
  if (typeof path === 'string') return path.split('>').map((segment) => segment.trim()).filter(Boolean);
  return [];
}

/**
 * @param {string[]} pathSegments
 * @returns {{ endpoint: string, method: string }}
 */
function extractEndpoint(pathSegments) {
  const pathsIndex = pathSegments.indexOf('paths');
  if (pathsIndex >= 0) {
    const endpoint = pathSegments[pathsIndex + 1] || 'global';
    const methodRaw = (pathSegments[pathsIndex + 2] || '').toLowerCase();
    const method = HTTP_METHODS.has(methodRaw) ? methodRaw.toUpperCase() : 'GLOBAL';
    return { endpoint, method };
  }
  return { endpoint: 'global', method: 'GLOBAL' };
}

/**
 * @param {string} rule
 * @param {string} message
 * @returns {(typeof WSO2_THEMES)[number]}
 */
function pickWso2Theme(rule, message) {
  const haystack = `${rule} ${message}`.toLowerCase();
  let bestTheme = WSO2_THEMES[0];
  let bestScore = 0;
  for (const theme of WSO2_THEMES) {
    const score = theme.keywords.reduce((sum, keyword) => sum + (haystack.includes(keyword) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestTheme = theme;
    }
  }
  return bestScore > 0 ? bestTheme : WSO2_THEMES[0];
}

/**
 * Build a full governance/analyze report from raw Spectral (or similar) results.
 * @param {string} rulesetName – display name; drives report type (OWASP / AI / REST) and `title`
 * @param {{ violations?: Array<Record<string, unknown>>, score?: number, passedChecks?: number, totalChecks?: number }} input
 * @returns {Object} — see `GeneratedReport` in `generate-report.d.ts`
 */
function generateReport(rulesetName, input) {
  const reportId = getReportKind(rulesetName);
  const rawViolations = (input && input.violations) || [];
  /** @type {Record<string, any>} */
  const violationsById = {};
  const categoryBuckets = new Map();

  rawViolations.forEach((violation, index) => {
    const pathSegments = normalizePath(violation.path);
    const displayPath = pathSegments.length > 0 ? pathSegments.join(' > ') : 'Unknown path';
    const { endpoint, method } = extractEndpoint(pathSegments);
    const id = `${violation.rule || violation.code || 'unknown'}:${index}`;
    const normalizedSeverity = (violation.severity === 'error' || violation.severity === 'warn' || violation.severity === 'hint' || violation.severity === 'info')
      ? violation.severity
      : 'info';

    let breakdownKeys = [];
    if (reportId === 'owasp') {
      const m = (violation.rule || '').toUpperCase().match(/API\d+(?::\d{4})?/);
      const raw = (m && m[0]) || 'GENERAL';
      const key = raw.includes(':') ? raw : `${raw}:2023`;
      breakdownKeys = [key];
      if (!categoryBuckets.has(key)) {
        const category = OWASP_CATEGORIES.find((item) => item.key === key);
        categoryBuckets.set(key, { label: (category && category.label) || key, docsUrl: undefined, violationIds: [] });
      }
      categoryBuckets.get(key).violationIds.push(id);
    } else if (reportId === 'rest-api-readiness') {
      const theme = pickWso2Theme(violation.rule || '', violation.message || '');
      breakdownKeys = [theme.id];
      if (!categoryBuckets.has(theme.id)) {
        categoryBuckets.set(theme.id, { label: theme.title, description: theme.description, violationIds: [] });
      }
      categoryBuckets.get(theme.id).violationIds.push(id);
    } else if (reportId === 'ai-readiness') {
      const catId = AI_RULE_CATEGORY[violation.rule || ''] || 'descriptions';
      breakdownKeys = [catId];
      if (!categoryBuckets.has(catId)) {
        categoryBuckets.set(catId, { violationIds: [], failingRules: new Set() });
      }
      const bkt = categoryBuckets.get(catId);
      bkt.violationIds.push(id);
      bkt.failingRules.add(violation.rule || '');
    }

    violationsById[id] = {
      id,
      rule: violation.rule || violation.code || 'unknown-rule',
      message: violation.message || 'No message provided',
      description: violation.description,
      fixSuggestion: violation.fixSuggestion,
      severity: normalizedSeverity,
      code: violation.code,
      pathSegments,
      displayPath,
      endpoint,
      method,
      line: (violation.range && violation.range.start ? violation.range.start.line : -1) + 1,
      range: violation.range,
      breakdownKeys,
    };
  });

  const vList = Object.keys(violationsById).map((k) => violationsById[k]);
  const endpointCount = new Set(
    vList
      .filter((v) => v.endpoint !== 'global' && v.method !== 'GLOBAL')
      .map((v) => `${v.method}:${v.endpoint}`),
  ).size;
  const errors = vList.filter((v) => v.severity === 'error').length;
  const warnings = vList.filter((v) => v.severity === 'warn').length;

  let categories = [];
  if (reportId === 'owasp') {
    categories = OWASP_CATEGORIES.map((item) => {
      const bucket = categoryBuckets.get(item.key);
      const ids = (bucket && bucket.violationIds) || [];
      const total = ids.length;
      const categoryErrors = ids.filter((id) => (violationsById[id] && violationsById[id].severity) === 'error').length;
      const categoryWarnings = ids.filter((id) => (violationsById[id] && violationsById[id].severity) === 'warn').length;
      return {
        id: item.key,
        label: item.label,
        status: total > 0 ? 'failed' : 'passed',
        total,
        errors: categoryErrors,
        warnings: categoryWarnings,
        percentage: rawViolations.length > 0 ? Math.round((total / rawViolations.length) * 100) : 0,
        affectedEndpoints: new Set(ids.map((id) => {
          const o = violationsById[id];
          return `${(o && o.method) || ''} ${(o && o.endpoint) || ''}`;
        })).size,
        docsUrl: item.docsUrl || 'https://owasp.org/API-Security/editions/2023/',
        viewIssuesFilter: { key: item.key, label: item.label },
      };
    });
  } else if (reportId === 'ai-readiness') {
    categories = AI_DIMENSIONS.map((dim) => {
      const subBuckets = dim.subBuckets.map((sub) => {
        const bucket = categoryBuckets.get(sub.id);
        const ids = (bucket && bucket.violationIds) || [];
        const total = ids.length;
        const totalRulesInBucket = AI_SUB_BUCKET_RULE_COUNTS[sub.id] || 1;
        const failingRulesCount = bucket && bucket.failingRules ? bucket.failingRules.size : 0;
        const passPercentage = Math.round(((totalRulesInBucket - failingRulesCount) / totalRulesInBucket) * 100);
        return {
          id: sub.id,
          label: sub.title,
          description: sub.description,
          status: total > 0 ? 'failed' : 'passed',
          total,
          passPercentage,
          errors: ids.filter((id) => (violationsById[id] && violationsById[id].severity) === 'error').length,
          warnings: ids.filter((id) => (violationsById[id] && violationsById[id].severity) === 'warn').length,
          viewIssuesFilter: { key: sub.id, label: sub.title },
        };
      });
      const dimTotal = subBuckets.reduce((s, b) => s + b.total, 0);
      // Weighted arithmetic mean — matches extension's dimensionScoreFromSubBuckets()
      const dimPassPercentage = Math.round(Math.max(0, Math.min(100,
        _weightedArithmeticMean(subBuckets.map((b) => ({
          value: b.passPercentage,
          weight: AI_SUB_BUCKET_WEIGHTS[b.id] || 1,
        })))
      )));
      return {
        id: dim.id,
        label: dim.title,
        description: dim.description,
        whyItMatters: dim.whyItMatters,
        status: dimTotal > 0 ? 'failed' : 'passed',
        total: dimTotal,
        passPercentage: dimPassPercentage,
        subBuckets,
        viewIssuesFilter: { key: dim.id, label: dim.title },
      };
    });
  } else if (reportId === 'rest-api-readiness') {
    categories = WSO2_THEMES.map((theme) => {
      const bucket = categoryBuckets.get(theme.id);
      const ids = (bucket && bucket.violationIds) || [];
      const total = ids.length;
      const categoryErrors = ids.filter((id) => (violationsById[id] && violationsById[id].severity) === 'error').length;
      const categoryWarnings = ids.filter((id) => (violationsById[id] && violationsById[id].severity) === 'warn').length;
      const ruleCounts = new Map();
      ids.forEach((id) => {
        const rule = (violationsById[id] && violationsById[id].rule) || '';
        ruleCounts.set(rule, (ruleCounts.get(rule) || 0) + 1);
      });
      return {
        id: theme.id,
        label: theme.title,
        description: theme.description,
        status: total > 0 ? 'failed' : 'passed',
        total,
        errors: categoryErrors,
        warnings: categoryWarnings,
        percentage: rawViolations.length > 0 ? Math.round((total / rawViolations.length) * 100) : 0,
        affectedEndpoints: new Set(ids.map((id) => {
          const o = violationsById[id];
          return `${(o && o.method) || ''} ${(o && o.endpoint) || ''}`;
        })).size,
        viewIssuesFilter: { key: theme.id, label: theme.title },
        topRules: Array.from(ruleCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([rule]) => rule),
      };
    });
  }

  // For AI readiness, derive the overall score from dimension scores using the same
  // weighted harmonic mean the extension uses, instead of the simple pass-rate from
  // the formatter.  For OWASP / REST readiness, keep the caller-supplied score.
  let overviewScore = input && input.score != null ? input.score : 0;
  if (reportId === 'ai-readiness' && categories.length > 0) {
    overviewScore = Math.round(_weightedHarmonicMean(
      categories.map((dim) => ({
        value: dim.passPercentage,
        weight: AI_DIMENSION_WEIGHTS[dim.id] || 0.25,
      }))
    ));
  }

  return {
    schemaVersion: '1',
    reportId,
    title: rulesetName,
    violationsById,
    overview: {
      score: overviewScore,
      passedChecks: input && input.passedChecks != null ? input.passedChecks : 0,
      totalChecks: input && input.totalChecks != null ? input.totalChecks : 0,
      metrics: [
        { id: 'errors', label: 'Errors', value: errors, accent: 'error' },
        { id: 'warnings', label: 'Warnings', value: warnings, accent: 'warning' },
        { id: 'operations', label: 'Operations affected', value: endpointCount, accent: 'info' },
      ],
    },
    breakdown: {
      title: reportId === 'owasp' ? 'OWASP Breakdown' : reportId === 'rest-api-readiness' ? 'WSO2 REST Guidelines Breakdown' : 'AI Readiness Breakdown',
      categories,
    },
    issueExplorer: {
      breakdownFilterOptions: reportId === 'ai-readiness'
        ? categories.flatMap((dim) => (dim.subBuckets || []).map((sub) => ({
            key: sub.viewIssuesFilter.key,
            label: sub.viewIssuesFilter.label,
          })))
        : categories.map((category) => ({
            key: category.viewIssuesFilter.key,
            label: category.viewIssuesFilter.label,
          })),
    },
  };
}

module.exports = {
  generateReport,
  getReportKind,
  OWASP_CATEGORIES,
  WSO2_THEMES,
  AI_CATEGORIES,
  AI_RULE_CATEGORY,
};
