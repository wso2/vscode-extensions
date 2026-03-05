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

import {
	apiCollectionToHurl,
	hurlToApiRequestItem,
	normalizeHurlCollectionPayload,
	parseHurlCollection,
} from '../src';
import type { ApiCollection } from '@wso2/api-tryit-core';
import { parseHurlDocument } from '../src';

// verify that the utility for splitting Hurl documents is available

describe('parseHurlDocument helper', () => {
	it('splits a multi-request Hurl string into blocks preserving response lines', () => {
		const input = [
			'# @name A',
			'GET https://example.com/foo',
			'HTTP 200',
			'[Asserts]',
			'status == 200',
			'',
			'# @name B',
			'POST https://example.com/bar',
			'HTTP 201',
			'[Asserts]',
			'status == 201',
		].join('\n');

		const { header, blocks } = parseHurlDocument(input);
		expect(header).toBe('');
		expect(blocks).toHaveLength(2);
		expect(blocks[0].text).toContain('GET https://example.com/foo');
		expect(blocks[0].text).toContain('HTTP 200');
		expect(blocks[1].text).toContain('POST https://example.com/bar');
		expect(blocks[1].text).toContain('HTTP 201');
	});
});


describe('parseHurlCollection', () => {
	it('parses a single Hurl request into an ApiCollection model', () => {
		const input = 'GET https://jsonplaceholder.typicode.com/posts\nHTTP 200\n\n[Asserts]\nstatus == 200';

		const collection = parseHurlCollection(input, {
			collectionName: 'sample-hurl',
		});

		expect(collection.name).toBe('sample-hurl');
		expect(collection.folders).toHaveLength(0);
		expect(collection.rootItems).toHaveLength(1);

		const first = collection.rootItems?.[0];
		expect(first?.request.method).toBe('GET');
		expect(first?.request.url).toBe('https://jsonplaceholder.typicode.com/posts');
		expect(first?.assertions).toEqual(['HTTP 200', 'status == 200']);
	});

	it('parses multiple requests from one hurl string as a single collection', () => {
		const input = [
			'# @name List Posts',
			'GET https://jsonplaceholder.typicode.com/posts?userId=1',
			'HTTP 200',
			'',
			'# @id create-post',
			'# @name Create Post',
			'POST https://jsonplaceholder.typicode.com/posts',
			'Content-Type: application/json',
			'',
			'{"title":"foo"}',
			'HTTP 201',
			'[Asserts]',
			'status == 201',
		].join('\n');

		const collection = parseHurlCollection(input, {
			collectionName: 'my-requests',
		});

		expect(collection.rootItems).toHaveLength(2);

		const first = collection.rootItems?.[0];
		expect(first?.name).toBe('List Posts');
		expect(first?.request.queryParameters).toEqual([
			{ id: 'query-1-1', key: 'userId', value: '1' },
		]);

		const second = collection.rootItems?.[1];
		expect(second?.id).toBe('create-post');
		expect(second?.request.method).toBe('POST');
		expect(second?.request.headers).toEqual([
			{ id: 'header-2-1', key: 'Content-Type', value: 'application/json' },
		]);
		expect(second?.request.body).toBe('{"title":"foo"}');
		expect(second?.assertions).toEqual(['HTTP 201', 'status == 201']);
	});

	it('parses grammar sections for query, auth, cookies, form and response asserts', () => {
		const input = [
			'POST https://example.com/users?source=url',
			'[Query]',
			'page: 1',
			'size: 20',
			'[BasicAuth]',
			'username: demo',
			'password: secret',
			'[Cookies]',
			'session: abc123',
			'[Form]',
			'name: Alice',
			'role: admin',
			'HTTP/1.1 201',
			'Content-Type: application/json',
			'[Captures]',
			'userId: jsonpath "$.id"',
			'[Asserts]',
			'jsonpath "$.ok" == true',
		].join('\n');

		const collection = parseHurlCollection(input);
		const request = collection.rootItems?.[0]?.request;
		const assertions = collection.rootItems?.[0]?.assertions;

		expect(request?.queryParameters).toEqual([
			{ id: 'query-1-1', key: 'source', value: 'url' },
			{ id: 'query-1-2', key: 'page', value: '1' },
			{ id: 'query-1-3', key: 'size', value: '20' },
		]);

		expect(request?.headers).toEqual([
			{ id: 'header-1-1', key: 'Cookie', value: 'session=abc123' },
			{ id: 'header-1-2', key: 'Authorization', value: 'Basic ZGVtbzpzZWNyZXQ=' },
		]);

		expect(request?.bodyFormUrlEncoded).toEqual([
			{ id: 'form-1-1', key: 'name', value: 'Alice' },
			{ id: 'form-1-2', key: 'role', value: 'admin' },
		]);

		expect(assertions).toEqual([
			'HTTP 201',
			'headers.Content-Type == application/json',
			'jsonpath "$.ok" == true',
		]);
	});

	it('parses multipart section and allows non-standard methods from grammar', () => {
		const input = [
			'TRACE https://example.com/upload',
			'[Multipart]',
			'file: file,/tmp/a.txt; text/plain',
			'label: doc-a',
			'HTTP 200',
		].join('\n');

		const collection = parseHurlCollection(input);
		const request = collection.rootItems?.[0]?.request;

		expect(request?.method).toBe('TRACE');
		expect(request?.bodyFormData).toEqual([
			{
				id: 'multipart-1-1',
				key: 'file',
				contentType: 'text/plain',
				filePath: '/tmp/a.txt',
			},
			{
				id: 'multipart-1-2',
				key: 'label',
				value: 'doc-a',
				contentType: '',
			},
		]);
	});

	it('supports escaped newline input', () => {
		const input = 'GET https://example.com\\nHTTP 200\\n\\n[Asserts]\\nstatus == 200';
		const collection = parseHurlCollection(input);

		expect(collection.rootItems).toHaveLength(1);
		expect(collection.rootItems?.[0]?.assertions).toEqual(['HTTP 200', 'status == 200']);
	});

	it('throws when no hurl request exists', () => {
		expect(() => parseHurlCollection('status == 200')).toThrow(
			'Could not parse Hurl content: no request entries found'
		);
	});
});

describe('hurlToApiRequestItem', () => {
	it('returns the first request item for compatibility paths', () => {
		const input = [
			'GET https://example.com/one',
			'HTTP 200',
			'',
			'GET https://example.com/two',
			'HTTP 200',
		].join('\n');

		const item = hurlToApiRequestItem(input);
		expect(item.request.url).toBe('https://example.com/one');
		expect(item.assertions).toEqual(['HTTP 200']);
	});
});

describe('normalizeHurlCollectionPayload', () => {
	it('normalizes and validates payload content', () => {
		const normalized = normalizeHurlCollectionPayload({
			name: 'payload collection',
			requests: [
				{
					name: 'List',
					content: 'GET https://example.com/list\nHTTP 200',
				},
			],
			folders: [
				{
					name: 'Folder A',
					items: ['GET https://example.com/folder\nHTTP 200'],
				},
			],
		});

		expect(normalized.name).toBe('payload collection');
		expect(normalized.requests).toHaveLength(1);
		expect(normalized.folders).toHaveLength(1);
		expect(normalized.folders?.[0].items).toHaveLength(1);
	});
});

describe('apiCollectionToHurl', () => {
	it('serializes ApiCollection with multiple requests into one hurl string', () => {
		const collection: ApiCollection = {
			id: 'c-1',
			name: 'Collection',
			folders: [],
			rootItems: [
				{
					id: 'req-1',
					name: 'List users',
					request: {
						id: 'req-1',
						name: 'List users',
						method: 'GET',
						url: 'https://example.com/users',
						queryParameters: [{ id: 'q-1', key: 'page', value: '1' }],
						headers: [{ id: 'h-1', key: 'Accept', value: 'application/json' }],
						assertions: ['HTTP 200', 'status == 200'],
					},
					assertions: ['HTTP 200', 'status == 200'],
				},
				{
					id: 'req-2',
					name: 'Create user',
					request: {
						id: 'req-2',
						name: 'Create user',
						method: 'POST',
						url: 'https://example.com/users',
						queryParameters: [],
						headers: [{ id: 'h-2', key: 'Content-Type', value: 'application/json' }],
						body: '{"name":"Alice"}',
						assertions: ['HTTP 201'],
					},
					assertions: ['HTTP 201'],
				},
			],
		};

		const output = apiCollectionToHurl(collection);

		expect(output).toContain('# @id req-1');
		expect(output).toContain('# @name List users');
		expect(output).toContain('GET https://example.com/users?page=1');
		expect(output).toContain('Accept: application/json');
		expect(output).toContain('HTTP 200');
		expect(output).toContain('[Asserts]\nstatus == 200');
		expect(output).toContain('# @id req-2');
		expect(output).toContain('POST https://example.com/users');
		expect(output).toContain('{"name":"Alice"}');
		expect(output).toContain('HTTP 201');
	});

	it('serializes form and multipart sections', () => {
		const collection: ApiCollection = {
			id: 'c-2',
			name: 'Sections',
			folders: [],
			rootItems: [
				{
					id: 'req-1',
					name: 'Upload',
					request: {
						id: 'req-1',
						name: 'Upload',
						method: 'POST',
						url: 'https://example.com/upload',
						queryParameters: [],
						headers: [],
						bodyFormUrlEncoded: [{ id: 'f-1', key: 'name', value: 'Alice' }],
						bodyFormData: [{ id: 'm-1', key: 'file', filePath: '/tmp/a.txt', contentType: 'text/plain' }],
					},
				},
			],
		};

		const output = apiCollectionToHurl(collection);

		expect(output).toContain('[Form]\nname: Alice');
		expect(output).toContain('[Multipart]\nfile: file,/tmp/a.txt; text/plain');
	});

	it('round-trips parse -> serialize -> parse for major fields', () => {
		const input = [
			'# @id r1',
			'# @name One',
			'GET https://example.com/a?x=1',
			'HTTP 200',
			'[Asserts]',
			'status == 200',
			'',
			'# @id r2',
			'# @name Two',
			'POST https://example.com/b',
			'[Form]',
			'name: alice',
			'HTTP 201',
		].join('\n');

		const parsed1 = parseHurlCollection(input, { collectionName: 'rt' });
		const serialized = apiCollectionToHurl(parsed1);
		const parsed2 = parseHurlCollection(serialized, { collectionName: 'rt' });

		expect(parsed2.rootItems?.length).toBe(parsed1.rootItems?.length);
		expect(parsed2.rootItems?.[0]?.request.method).toBe('GET');
		expect(parsed2.rootItems?.[0]?.request.url).toBe('https://example.com/a');
		expect(parsed2.rootItems?.[0]?.request.queryParameters?.[0]?.key).toBe('x');
		expect(parsed2.rootItems?.[0]?.assertions).toContain('HTTP 200');
		expect(parsed2.rootItems?.[1]?.request.method).toBe('POST');
		expect(parsed2.rootItems?.[1]?.request.bodyFormUrlEncoded?.[0]?.key).toBe('name');
	});

	it('preserves assertions for multi-request collection with HTTP status lines', () => {
		const input = [
			'# @name Create post',
			'POST https://jsonplaceholder.typicode.com/posts?key=value&key2=val2',
			'Content-Type: application/json',
			'',
			'{"title":"foommm","body":"bar","userId":1}',
			'HTTP 201',
			'[Asserts]',
			'status == 202',
			'',
			'# @name Delete post',
			'DELETE https://jsonplaceholder.typicode.com/posts/1',
			'Content-Type: application/json',
			'HTTP 200',
			'[Asserts]',
			'status == 200',
			'',
			'# @name Update post',
			'PUT https://jsonplaceholder.typicode.com/posts/1',
			'Content-Type: application/json',
			'',
			'{"id":1,"title":"updated","body":"bar","userId":1}',
			'HTTP 200',
			'[Asserts]',
			'status == 200',
		].join('\n');

		const collection = parseHurlCollection(input, { collectionName: 'Multi Demo' });

		expect(collection.rootItems).toHaveLength(3);

		const createPost = collection.rootItems?.[0];
		expect(createPost?.name).toBe('Create post');
		expect(createPost?.request.method).toBe('POST');
		expect(createPost?.assertions).toContain('HTTP 201');
		expect(createPost?.assertions).toContain('status == 202');

		const deletePost = collection.rootItems?.[1];
		expect(deletePost?.name).toBe('Delete post');
		expect(deletePost?.request.method).toBe('DELETE');
		expect(deletePost?.assertions).toContain('HTTP 200');
		expect(deletePost?.assertions).toContain('status == 200');

		const updatePost = collection.rootItems?.[2];
		expect(updatePost?.name).toBe('Update post');
		expect(updatePost?.request.method).toBe('PUT');
		expect(updatePost?.assertions).toContain('HTTP 200');
		expect(updatePost?.assertions).toContain('status == 200');
	});

	it('preserves assertions for requests with Multipart sections', () => {
		const input = [
			'# @name Test',
			'POST https://jsonplaceholder.typicode.com/posts?key=value',
			'Content-Type: application/json',
			'[Multipart]',
			'keyq: valueqd',
			'key: file,tests.zip; application/octet-stream',
			'HTTP 200',
			'[Asserts]',
			'status == 200',
			'',
			'# @name Head Request',
			'HEAD https://jsonplaceholder.typicode.com/posts/1?key=value&keyds=value88888',
			'Content-Type: application/json',
		].join('\n');

		const collection = parseHurlCollection(input);

		expect(collection.rootItems).toHaveLength(2);

		const test = collection.rootItems?.[0];
		expect(test?.name).toBe('Test');
		expect(test?.request.method).toBe('POST');
		expect(test?.request.bodyFormData).toHaveLength(2);
		expect(test?.assertions).toContain('HTTP 200');
		expect(test?.assertions).toContain('status == 200');

		const head = collection.rootItems?.[1];
		expect(head?.name).toBe('Head Request');
		expect(head?.request.method).toBe('HEAD');
		expect(head?.assertions ?? []).toHaveLength(0);
	});

	it('keeps assertions attached to correct request when HTTP status line is followed by [Asserts]', () => {
		const input = [
			'# @name Create post',
			'POST https://jsonplaceholder.typicode.com/posts?key=value',
			'Content-Type: application/json',
			'',
			'{"title":"foommm","body":"bar","userId":1}',
			'HTTP 201',
			'[Asserts]',
			'status == 202',
			'',
			'# @name Delete post',
			'DELETE https://jsonplaceholder.typicode.com/posts/1',
			'HTTP 200',
			'[Asserts]',
			'status == 200'
		].join('\n');

		const collection = parseHurlCollection(input, { collectionName: 'Multi Demo' });

		expect(collection.rootItems).toHaveLength(2);

		const createPost = collection.rootItems?.[0];
		expect(createPost?.name).toBe('Create post');
		expect(createPost?.request.method).toBe('POST');
		expect(createPost?.assertions).toContain('HTTP 201');
		expect(createPost?.assertions).toContain('status == 202');

		const deletePost = collection.rootItems?.[1];
		expect(deletePost?.name).toBe('Delete post');
		expect(deletePost?.request.method).toBe('DELETE');
		expect(deletePost?.assertions).toContain('HTTP 200');
		expect(deletePost?.assertions).toContain('status == 200');
	});

	it('does not treat HTTP status line as a new request block', () => {
		const input = [
			'GET https://example.com/users',
			'HTTP 200',
			'',
			'POST https://example.com/posts',
			'HTTP 201'
		].join('\n');

		const collection = parseHurlCollection(input);

		expect(collection.rootItems).toHaveLength(2);

		const get = collection.rootItems?.[0];
		expect(get?.request.method).toBe('GET');
		expect(get?.assertions).toContain('HTTP 200');

		const post = collection.rootItems?.[1];
		expect(post?.request.method).toBe('POST');
		expect(post?.assertions).toContain('HTTP 201');
	});
});
