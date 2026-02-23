/**
 * Convert Hurl content to ApiRequestItem for API TryIt
 */
import { ApiRequestItem } from '@wso2/api-tryit-core';
import { hurlToApiRequestItem as parseHurlRequestItem } from '@wso2/api-tryit-hurl-parser';

export function hurlToApiRequestItem(hurlContent: string): ApiRequestItem {
	return parseHurlRequestItem(hurlContent);
}
