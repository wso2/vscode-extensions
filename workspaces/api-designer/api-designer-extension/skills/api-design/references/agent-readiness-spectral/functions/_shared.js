const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']);

const isObject = (value) => typeof value === 'object' && value !== null;
const isNonEmpty = (value, minLength) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return minLength ? trimmed.length >= minLength : trimmed.length > 0;
  }
  if (Array.isArray(value)) return value.length > 0;
  if (isObject(value)) return Object.keys(value).length > 0;
  return true;
};

const makeMessage = (context, fallback) => (context && context.rule && context.rule.message) || fallback;

exports.aiReadinessFieldCoverage = (targetVal, rawOpts = {}, context = {}) => {
  const opts = rawOpts || {};
  const fields = Array.isArray(opts.fields) && opts.fields.length > 0
    ? opts.fields
    : (opts.field ? [opts.field] : []);

  let passes = false;
  let selectedField;

  for (const field of fields) {
    const value = isObject(targetVal) ? targetVal[field] : undefined;
    if (isNonEmpty(value, opts.minLength)) {
      passes = true;
      selectedField = field;
      break;
    }
  }

  if (!passes && fields.length === 0) {
    passes = isNonEmpty(targetVal, opts.minLength);
  }

  if (passes) return [];
  const basePath = Array.isArray(context.path) ? context.path : [];
  const path = selectedField ? [...basePath, selectedField] : [...basePath];
  return [{ message: makeMessage(context, 'Field is missing or empty'), path }];
};

exports.aiReadinessErrorResponseCoverage = (targetVal, rawOpts = {}, context = {}) => {
  const opts = rawOpts || {};
  const requiredCodes = Array.isArray(opts.requiredCodes) && opts.requiredCodes.length > 0
    ? opts.requiredCodes.map(String)
    : ['400', '401', '403', '404', '422', '429'];

  const responses = isObject(targetVal) && isObject(targetVal.responses) ? targetVal.responses : undefined;
  const hasRequired = !!responses && requiredCodes.some((code) => Object.prototype.hasOwnProperty.call(responses, code));

  if (hasRequired) return [];
  const basePath = Array.isArray(context.path) ? context.path : [];
  return [{ message: makeMessage(context, 'Missing required error responses'), path: [...basePath, 'responses'] }];
};

exports.aiReadinessSchemaTyping = (targetVal, _opts = {}, context = {}) => {
  const schema = isObject(targetVal) ? targetVal : {};
  const hasType = typeof schema.type === 'string' && schema.type.trim().length > 0;
  const hasRef = typeof schema.$ref === 'string';
  if (hasType || hasRef) return [];
  const path = Array.isArray(context.path) ? context.path : [];
  return [{ message: makeMessage(context, 'Schema must have an explicit type defined'), path: [...path] }];
};

const responseCodeFromPath = (path) => {
  if (!Array.isArray(path)) return undefined;
  const idx = path.findIndex((segment) => String(segment) === 'responses');
  if (idx < 0 || idx + 1 >= path.length) return undefined;
  return String(path[idx + 1]);
};

exports.aiReadinessErrorSchemaStructure = (targetVal, rawOpts = {}, context = {}) => {
  const opts = rawOpts || {};
  if (opts.responseCodePattern) {
    const code = responseCodeFromPath(context.path);
    if (!code || !(new RegExp(opts.responseCodePattern).test(code))) return [];
  }

  const requiredFields = Array.isArray(opts.requiredFields) && opts.requiredFields.length > 0
    ? opts.requiredFields
    : ['message'];

  const schema = isObject(targetVal) ? targetVal : {};
  const properties = isObject(schema.properties) ? schema.properties : {};
  const missing = requiredFields.filter((f) => !Object.prototype.hasOwnProperty.call(properties, f));
  if (missing.length === 0) return [];
  const path = Array.isArray(context.path) ? context.path : [];
  return [{ message: makeMessage(context, `Error schema missing fields: ${missing.join(', ')}`), path: [...path] }];
};

exports.aiReadinessRateLimitHeader = (targetVal, _rawOpts = {}, context = {}) => {
  const response = isObject(targetVal) ? targetVal : {};
  const headers = isObject(response.headers) ? response.headers : {};
  const names = Object.keys(headers).map((h) => h.toLowerCase());
  const passed = names.includes('retry-after') || names.some((h) => h.startsWith('x-ratelimit-') || h.startsWith('x-rate-limit-'));
  if (passed) return [];
  const path = Array.isArray(context.path) ? context.path : [];
  return [{ message: makeMessage(context, '429 response must include Retry-After or X-RateLimit-* headers'), path: [...path] }];
};

exports.aiReadinessPaginationParams = (targetVal, _rawOpts = {}, context = {}) => {
  const operation = isObject(targetVal) ? targetVal : {};
  const parameters = Array.isArray(operation.parameters) ? operation.parameters : [];
  const names = parameters.map((p) => (isObject(p) && typeof p.name === 'string' ? p.name.toLowerCase() : ''));
  const hasCursorOrPage = names.includes('cursor') || names.includes('page') || names.includes('offset');
  const hasLimit = names.includes('limit') || names.includes('page_size') || names.includes('pagesize') || names.includes('per_page');
  if (hasCursorOrPage && hasLimit) return [];
  const path = Array.isArray(context.path) ? context.path : [];
  return [{ message: makeMessage(context, 'List endpoint should have pagination parameters (cursor/page and limit)'), path: [...path] }];
};

exports.aiReadinessPaginationMeta = (targetVal, _rawOpts = {}, context = {}) => {
  const schema = isObject(targetVal) ? targetVal : {};
  const props = isObject(schema.properties) ? Object.keys(schema.properties).map((k) => k.toLowerCase()) : [];
  const hasMore = props.some((p) => ['has_more', 'hasmore', 'has_next', 'hasnext', 'is_last', 'islast'].includes(p));
  const hasCursor = props.some((p) => ['next_cursor', 'nextcursor', 'next_page', 'nextpage', 'cursor', 'next', 'page_token', 'nextpagetoken', 'continuation_token'].includes(p));
  const hasTotal = props.some((p) => ['total', 'total_count', 'totalcount', 'count', 'total_items', 'totalitems'].includes(p));
  if (hasMore || hasCursor || hasTotal) return [];
  const path = Array.isArray(context.path) ? context.path : [];
  return [{ message: makeMessage(context, 'List response schema should include pagination metadata (has_more, next_cursor, or total)'), path: [...path] }];
};

exports.aiReadinessSecurityScheme = (targetVal, _rawOpts = {}, context = {}) => {
  const scheme = isObject(targetVal) ? targetVal : {};
  let hasInteractiveFlow = false;
  if (scheme.type === 'oauth2') {
    const flows = isObject(scheme.flows) ? scheme.flows : {};
    hasInteractiveFlow = Object.prototype.hasOwnProperty.call(flows, 'implicit') || Object.prototype.hasOwnProperty.call(flows, 'authorizationCode');
  }
  if (!hasInteractiveFlow) return [];
  const path = Array.isArray(context.path) ? context.path : [];
  return [{ message: makeMessage(context, 'Security scheme uses interactive OAuth flow not suitable for AI agents'), path: [...path] }];
};

exports.aiReadinessIdempotency = (targetVal, _rawOpts = {}, context = {}) => {
  const operation = isObject(targetVal) ? targetVal : {};
  const parameters = Array.isArray(operation.parameters) ? operation.parameters : [];
  const passed = parameters.some((p) => isObject(p) && p.in === 'header' && typeof p.name === 'string' && p.name.toLowerCase() === 'idempotency-key');
  if (passed) return [];
  const path = Array.isArray(context.path) ? context.path : [];
  return [{ message: makeMessage(context, 'Mutating operation should support Idempotency-Key header for safe retries'), path: [...path] }];
};

exports.aiReadinessSchemaNoEmptyObject = (targetVal, _rawOpts = {}, context = {}) => {
  const schema = isObject(targetVal) ? targetVal : {};
  if (schema.type !== 'object') return [];
  const hasRef = typeof schema.$ref === 'string';
  const hasComposition = Array.isArray(schema.allOf) || Array.isArray(schema.oneOf) || Array.isArray(schema.anyOf);
  const hasProperties = isObject(schema.properties) && Object.keys(schema.properties).length > 0;
  const hasAdditional = schema.additionalProperties !== undefined;
  if (hasRef || hasComposition || hasProperties || hasAdditional) return [];
  const path = Array.isArray(context.path) ? context.path : [];
  return [{ message: makeMessage(context, 'Object schema must define properties or additionalProperties - empty object types are ambiguous for AI'), path: [...path] }];
};

exports.aiReadinessArrayItemsDefined = (targetVal, _rawOpts = {}, context = {}) => {
  const schema = isObject(targetVal) ? targetVal : {};
  if (schema.type !== 'array') return [];
  if (schema.items !== undefined && schema.items !== null) return [];
  const path = Array.isArray(context.path) ? context.path : [];
  return [{ message: makeMessage(context, 'Array schema must define an items schema - untyped arrays are ambiguous for AI'), path: [...path] }];
};

const detectStyle = (operationId) => {
  if (/^[a-z][a-zA-Z0-9]*$/.test(operationId)) return 'camel';
  if (/^[A-Z][a-zA-Z0-9]*$/.test(operationId)) return 'pascal';
  if (/^[a-z][a-z0-9_]*$/.test(operationId)) return 'snake';
  if (/^[a-z][a-z0-9-]*$/.test(operationId)) return 'kebab';
  return 'other';
};

exports.aiReadinessOperationIdConsistency = (targetVal, rawOpts = {}) => {
  const opts = rawOpts || {};
  const doc = isObject(targetVal) ? targetVal : {};
  const paths = isObject(doc.paths) ? doc.paths : {};
  const allowed = new Set(Array.isArray(opts.allowedStyles) && opts.allowedStyles.length > 0
    ? opts.allowedStyles
    : ['camel', 'pascal', 'snake', 'kebab']);

  const operationIds = [];
  for (const [pathKey, pathItem] of Object.entries(paths)) {
    if (!isObject(pathItem)) continue;
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method) || !isObject(operation)) continue;
      const operationId = operation.operationId;
      if (typeof operationId !== 'string' || operationId.trim().length === 0) continue;
      operationIds.push({ operationId, style: detectStyle(operationId), path: ['paths', pathKey, method, 'operationId'] });
    }
  }

  if (operationIds.length <= 1) return [];

  const counts = new Map();
  operationIds.forEach(({ style }) => {
    if (!allowed.has(style)) return;
    counts.set(style, (counts.get(style) || 0) + 1);
  });

  const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!dominant) return [];

  const violations = [];
  operationIds.forEach((entry) => {
    const passed = entry.style === dominant || !allowed.has(entry.style);
    if (!passed) {
      violations.push({
        message: `operationId '${entry.operationId}' uses '${entry.style}' style while the API primarily uses '${dominant}' style`,
        path: entry.path
      });
    }
  });
  return violations;
};

exports.aiReadinessOperationIdUnique = (targetVal) => {
  const root = isObject(targetVal) ? targetVal : {};
  const pathsObj = isObject(root.paths) ? root.paths : {};
  const occurrences = new Map();

  for (const [pathKey, pathItem] of Object.entries(pathsObj)) {
    if (!isObject(pathItem)) continue;
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!isObject(operation)) continue;
      const opId = typeof operation.operationId === 'string' ? operation.operationId.trim() : '';
      if (!opId) continue;
      const opPath = ['paths', pathKey, method, 'operationId'];
      const list = occurrences.get(opId) || [];
      list.push(opPath);
      occurrences.set(opId, list);
    }
  }

  const violations = [];
  occurrences.forEach((paths, operationId) => {
    if (paths.length > 1) {
      paths.forEach((path) => {
        violations.push({ message: `operationId '${operationId}' is duplicated across multiple operations`, path });
      });
    }
  });

  return violations;
};

exports.aiReadinessSchemaHasConstraints = (targetVal, _rawOpts = {}, context = {}) => {
  const schema = isObject(targetVal) ? targetVal : {};
  const schemaType = typeof schema.type === 'string' ? schema.type : undefined;

  let passed = true;
  if (schemaType === 'string') {
    passed = schema.pattern !== undefined || schema.minLength !== undefined || schema.maxLength !== undefined;
  } else if (schemaType === 'number' || schemaType === 'integer') {
    passed = schema.minimum !== undefined || schema.maximum !== undefined;
  }

  if (passed) return [];
  const path = Array.isArray(context.path) ? context.path : [];
  return [{
    message: makeMessage(context, 'Scalar schema should define validation constraints for deterministic AI generation'),
    path: [...path]
  }];
};
