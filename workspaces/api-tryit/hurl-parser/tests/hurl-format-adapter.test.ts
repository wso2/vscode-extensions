/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import { HurlFormatAdapter } from '../src/hurl-format-adapter';
import type { ApiRequest } from '@wso2/api-tryit-core';

describe('HurlFormatAdapter serialization order', () => {
	describe('serializeRequest', () => {
		it('places HTTP response line after JSON body, not before', () => {
			const request: ApiRequest = {
				id: 'update-post',
				name: 'Update post',
				method: 'PUT',
				url: 'https://jsonplaceholder.typicode.com/posts/1',
				headers: [
					{ id: 'h1', key: 'Content-Type', value: 'application/json' }
				],
				queryParameters: [],
				body: '{"id":1,"title":"updated","body":"bar","userId":1}'
			};

			const assertions = ['HTTP 200', 'status == 200'];

			const result = HurlFormatAdapter.serializeRequest(request, undefined, assertions);

			// Verify order: headers -> body -> HTTP -> [Asserts]
			const lines = result.split('\n');
			const contentTypeLine = lines.findIndex(l => l.includes('Content-Type:'));
			const bodyLine = lines.findIndex(l => l.includes('{"id"'));
			const httpLine = lines.findIndex(l => /^HTTP\s+200/.test(l));
			const assertsLine = lines.findIndex(l => /^\[Asserts\]/.test(l));
			const statusLine = lines.findIndex(l => /^status\s+==\s+200/.test(l));

			expect(contentTypeLine).toBeGreaterThan(-1);
			expect(bodyLine).toBeGreaterThan(contentTypeLine);
			expect(httpLine).toBeGreaterThan(bodyLine);
			expect(assertsLine).toBeGreaterThan(httpLine);
			expect(statusLine).toBeGreaterThan(assertsLine);

			// Verify HTTP does not appear before body (already checked by httpLine > bodyLine above)
		});

		it('places HTTP response line after Multipart body', () => {
			const request: ApiRequest = {
				id: 'test-multipart',
				name: 'Test Multipart',
				method: 'POST',
				url: 'https://example.com/upload',
				headers: [
					{ id: 'h1', key: 'Content-Type', value: 'application/json' }
				],
				queryParameters: [],
				bodyFormData: [
					{ id: 'f1', key: 'keyq', value: 'valueqd', contentType: '' },
					{ id: 'f2', key: 'key', filePath: 'tests.zip', contentType: 'application/octet-stream' }
				]
			};

			const assertions = ['HTTP 201'];

			const result = HurlFormatAdapter.serializeRequest(request, undefined, assertions);

			const lines = result.split('\n');
			const multipartLine = lines.findIndex(l => /^\[Multipart\]/.test(l));
			const httpLine = lines.findIndex(l => /^HTTP\s+201/.test(l));

			expect(multipartLine).toBeGreaterThan(-1);
			expect(httpLine).toBeGreaterThan(multipartLine);
		});

		it('places HTTP response line after Form body', () => {
			const request: ApiRequest = {
				id: 'test-form',
				name: 'Test Form',
				method: 'POST',
				url: 'https://example.com/form',
				headers: [
					{ id: 'h1', key: 'Content-Type', value: 'application/x-www-form-urlencoded' }
				],
				queryParameters: [],
				bodyFormUrlEncoded: [
					{ id: 'f1', key: 'name', value: 'John' },
					{ id: 'f2', key: 'email', value: 'john@example.com' }
				]
			};

			const assertions = ['HTTP 200'];

			const result = HurlFormatAdapter.serializeRequest(request, undefined, assertions);

			const lines = result.split('\n');
			const formLine = lines.findIndex(l => /^\[Form\]/.test(l));
			const httpLine = lines.findIndex(l => /^HTTP\s+200/.test(l));

			expect(formLine).toBeGreaterThan(-1);
			expect(httpLine).toBeGreaterThan(formLine);
		});

		it('places custom asserts after HTTP response line in [Asserts] section', () => {
			const request: ApiRequest = {
				id: 'create-post',
				name: 'Create post',
				method: 'POST',
				url: 'https://jsonplaceholder.typicode.com/posts',
				headers: [
					{ id: 'h1', key: 'Content-Type', value: 'application/json' }
				],
				queryParameters: [],
				body: '{"title":"foommm","body":"bar","userId":1}'
			};

			const assertions = [
				'HTTP 201',
				'status == 202',
				'headers.Content-Type == application/json'
			];

			const result = HurlFormatAdapter.serializeRequest(request, undefined, assertions);

			const lines = result.split('\n');
			const httpLine = lines.findIndex(l => /^HTTP\s+201/.test(l));
			const assertsLine = lines.findIndex(l => /^\[Asserts\]/.test(l));

			expect(httpLine).toBeGreaterThan(-1);
			expect(assertsLine).toBeGreaterThan(httpLine);

			// Verify [Asserts] contains the custom assertions
			const assertsContent = lines.slice(assertsLine + 1).join('\n');
			expect(assertsContent).toContain('status == 202');
			expect(assertsContent).toContain('header "Content-Type"');
		});

		it('handles requests without body (GET) correctly', () => {
			const request: ApiRequest = {
				id: 'head-request',
				name: 'Head Request',
				method: 'HEAD',
				url: 'https://jsonplaceholder.typicode.com/posts/1',
				headers: [
					{ id: 'h1', key: 'Content-Type', value: 'application/json' }
				],
				queryParameters: [
					{ id: 'q1', key: 'key', value: 'value' }
				]
			};

			const assertions = ['HTTP 200'];

			const result = HurlFormatAdapter.serializeRequest(request, undefined, assertions);

			const lines = result.split('\n');
			const requestLine = lines.findIndex(l => /^HEAD\s+https:/.test(l));
			const httpLine = lines.findIndex(l => /^HTTP\s+200/.test(l));

			expect(requestLine).toBeGreaterThan(-1);
			expect(httpLine).toBeGreaterThan(-1);
			// For requests without body, HTTP can come right after headers
			expect(httpLine).toBeGreaterThan(requestLine);
		});

		it('correctly serializes the problematic update post scenario', () => {
			// This is the exact case from the user's bug report
			const request: ApiRequest = {
				id: 'update-post',
				name: 'Update post',
				method: 'PUT',
				url: 'https://jsonplaceholder.typicode.com/posts/1',
				headers: [
					{ id: 'h1', key: 'Content-Type', value: 'application/json' }
				],
				queryParameters: [],
				body: '{"id":1,"title":"updated","body":"bar","userId":1}'
			};

			const assertions = ['HTTP 200', 'status == 200'];

			const result = HurlFormatAdapter.serializeRequest(request, undefined, assertions);

			// Expected structure:
			// # @name Update post
			// PUT https://jsonplaceholder.typicode.com/posts/1
			// Content-Type: application/json
			//
			// {"id":1,"title":"updated","body":"bar","userId":1}
			//
			// HTTP 200
			//
			// [Asserts]
			// status == 200

			expect(result).toContain('# @name Update post');
			expect(result).toContain('PUT https://jsonplaceholder.typicode.com/posts/1');
			expect(result).toContain('Content-Type: application/json');
			expect(result).toContain('{"id":1,"title":"updated","body":"bar","userId":1}');

			// The critical check: HTTP should come AFTER the body
			const bodyIndex = result.indexOf('{"id"');
			const httpIndex = result.indexOf('HTTP 200');
			expect(httpIndex).toBeGreaterThan(bodyIndex);

			// Verify the [Asserts] section comes after HTTP
			const assetsIndex = result.indexOf('[Asserts]');
			expect(assetsIndex).toBeGreaterThan(httpIndex);
		});
	});
});
