import type { Schema } from '../views/DesignView/components/schema/SchemaEditor';

function getPrimitiveType(value: unknown): Schema['type'] {
    if (value === null) return 'null';
    const valueType = typeof value;
    if (valueType === 'string') return 'string';
    if (valueType === 'boolean') return 'boolean';
    if (valueType === 'number') return Number.isInteger(value) ? 'integer' : 'number';
    return 'string';
}

function schemaSignature(schema: Schema): string {
    if (schema.$ref) return `ref:${schema.$ref}`;
    if (schema.oneOf?.length) return `oneOf:${schema.oneOf.map(schemaSignature).sort().join('|')}`;
    if (schema.type === 'object') {
        const props = schema.properties || {};
        const propSig = Object.keys(props)
            .sort()
            .map((key) => `${key}:${schemaSignature(props[key])}`)
            .join(',');
        return `object:${propSig}`;
    }
    if (schema.type === 'array') {
        if (!schema.items || Array.isArray(schema.items)) return 'array:any';
        return `array:${schemaSignature(schema.items)}`;
    }
    return `type:${String(schema.type || 'unknown')}`;
}

function mergeSchemas(a: Schema, b: Schema): Schema {
    if (schemaSignature(a) === schemaSignature(b)) return a;
    if (a.type === 'object' && b.type === 'object') {
        const aProps = a.properties || {};
        const bProps = b.properties || {};
        const allKeys = Array.from(new Set([...Object.keys(aProps), ...Object.keys(bProps)]));
        const mergedProperties: Record<string, Schema> = {};
        allKeys.forEach((key) => {
            const left = aProps[key];
            const right = bProps[key];
            if (left && right) {
                mergedProperties[key] = mergeSchemas(left, right);
            } else {
                mergedProperties[key] = (left || right)!;
            }
        });
        const aReq = new Set(a.required || []);
        const bReq = new Set(b.required || []);
        const mergedRequired = Array.from(aReq).filter((key) => bReq.has(key));
        return {
            type: 'object',
            properties: mergedProperties,
            ...(mergedRequired.length > 0 ? { required: mergedRequired } : {})
        };
    }
    if (a.type === 'array' && b.type === 'array' && a.items && b.items && !Array.isArray(a.items) && !Array.isArray(b.items)) {
        return {
            type: 'array',
            items: mergeSchemas(a.items, b.items)
        };
    }

    const variants = [...(a.oneOf || [a]), ...(b.oneOf || [b])];
    const deduped: Schema[] = [];
    const seen = new Set<string>();
    variants.forEach((schema) => {
        const sig = schemaSignature(schema);
        if (!seen.has(sig)) {
            seen.add(sig);
            deduped.push(schema);
        }
    });
    return deduped.length === 1 ? deduped[0] : { oneOf: deduped };
}

export function inferSchemaFromJsonSample(value: unknown): Schema {
    if (Array.isArray(value)) {
        if (value.length === 0) {
            return { type: 'array', items: { type: 'string' } };
        }
        const itemSchema = value
            .map((item) => inferSchemaFromJsonSample(item))
            .reduce((acc, next) => mergeSchemas(acc, next));
        return { type: 'array', items: itemSchema };
    }

    if (value !== null && typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>);
        const properties: Record<string, Schema> = {};
        entries.forEach(([key, item]) => {
            properties[key] = inferSchemaFromJsonSample(item);
        });
        return {
            type: 'object',
            properties,
            ...(entries.length > 0 ? { required: entries.map(([key]) => key) } : {})
        };
    }

    return { type: getPrimitiveType(value) };
}
