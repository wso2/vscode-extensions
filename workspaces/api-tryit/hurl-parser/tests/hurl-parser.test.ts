import {
	hurlToApiRequestItem,
	normalizeHurlCollectionPayload,
	parseHurlCollection,
} from '../src';

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
