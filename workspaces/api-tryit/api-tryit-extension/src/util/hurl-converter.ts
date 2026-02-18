/**
 * Convert Hurl content to ApiRequestItem for API TryIt
 * Mirrors the existing curl-converter.ts behaviour but uses HurlFormatAdapter
 */
import { ApiRequestItem, ApiRequest } from '@wso2/api-tryit-core';
import { HurlFormatAdapter } from './hurl-format-adapter';

function generateId(): string {
	return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function hurlToApiRequestItem(hurlContent: string): ApiRequestItem {
	if (!hurlContent || typeof hurlContent !== 'string') {
		throw new Error('Invalid hurl content provided');
	}

	const parsed = HurlFormatAdapter.parseHurlContent(hurlContent, '<from-input>');
	if (!parsed || !parsed.request) {
		throw new Error('Could not parse Hurl content');
	}

	// Parsed.request is already in ApiRequest shape; ensure id/name
	const req: ApiRequest = {
		...parsed.request,
		id: parsed.request.id || `new-${generateId()}`,
		name: parsed.request.name || `${parsed.request.method} ${parsed.request.url}`
	};

	const id = req.id ?? `new-${generateId()}`;
	const name = req.name ?? `${req.method} ${req.url}`;

	return {
		id,
		name,
		request: req
	};
}
