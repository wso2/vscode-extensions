# Hurl Parser Library Specification

## 1. Overview

`@wso2/api-tryit-hurl-parser` parses Hurl text into API TryIt visualizer models.

Primary objective:
- Convert one `.hurl` content string into one `ApiCollection`.
- Support multiple requests in a single Hurl document.
- Produce output directly usable by API TryIt extension and visualizer.

## 2. Package

- Name: `@wso2/api-tryit-hurl-parser`
- Location: `workspaces/api-tryit/hurl-parser`
- Language: TypeScript
- Test framework: Jest

## 3. Public API

### 3.1 `parseHurlCollection`

```ts
parseHurlCollection(hurlContent: string, options?: ParseHurlCollectionOptions): ApiCollection
```

Behavior:
- Parses Hurl string input into `ApiCollection`.
- One Hurl document maps to one `ApiCollection`.
- Multiple Hurl requests map to `collection.rootItems[]`.

`ParseHurlCollectionOptions`:
- `collectionId?: string`
- `collectionName?: string`
- `sourceFilePath?: string`

### 3.2 `hurlToApiRequestItem`

```ts
hurlToApiRequestItem(hurlContent: string): ApiRequestItem
```

Behavior:
- Compatibility API for existing extension paths.
- Returns the first request item from `parseHurlCollection(...)`.

### 3.3 `normalizeHurlCollectionPayload`

```ts
normalizeHurlCollectionPayload(input: unknown): HurlCollectionPayload
```

Behavior:
- Normalizes and validates collection import payloads where each entry contains Hurl text.

## 4. Input Contract

Input is expected to be valid Hurl text. The parser accepts:
- Native newlines (`\n`, `\r\n`)
- Escaped newlines in single-line input (`\\n`)

If input is empty or no request line is found, parser throws.

## 5. Output Contract

Output model is `ApiCollection` from `@wso2/api-tryit-core`:
- `id`: derived from `options.collectionId`, `sourceFilePath`, or generated fallback.
- `name`: derived from `options.collectionName` or source name fallback.
- `folders`: always empty for direct Hurl parsing.
- `rootItems`: parsed requests.

Each request item includes:
- `id`, `name`, `request`
- Optional `assertions`

## 6. Grammar Coverage

The parser targets Hurl grammar-compatible request/response blocks and section markers.

### 6.1 Request line

Supported:
- `METHOD URL` (uppercase method token, e.g., `GET`, `POST`, `TRACE`, etc.)

### 6.2 Request headers/body

Supported:
- Header lines: `Key: Value`
- Raw body (non-section lines after headers)

### 6.3 Request sections

Supported sections:
- `[Query]`, `[QueryStringParams]`
- `[Form]`, `[FormParams]`
- `[Multipart]`, `[MultipartFormData]`
- `[Cookies]`
- `[BasicAuth]`
- `[Options]` (accepted; currently ignored in output model)

### 6.4 Response line and sections

Supported:
- Response line forms:
  - `HTTP 200`
  - `HTTP/1.1 200`
  - `HTTP/2 200`
- `[Asserts]`
- `[Captures]` (accepted; ignored in output model)

### 6.5 Assertion conversion

Supported conversions:
- Keeps `status ...` assertions
- Keeps `HTTP ...` assertions
- Converts Hurl header assertion syntax to internal style:
  - `header "Content-Type" == "application/json"`
  - `header Content-Type == application/json`
  - mapped to `headers.Content-Type == application/json`

## 7. Mapping Rules

### 7.1 Query parameters

Merged from:
- URL query string
- `[Query]`/`[QueryStringParams]`

### 7.2 Form payloads

`[Form]`/`[FormParams]` -> `request.bodyFormUrlEncoded`

### 7.3 Multipart payloads

`[Multipart]`/`[MultipartFormData]` -> `request.bodyFormData`

Supported multipart forms:
- `key: value`
- `key: file,/path/file.ext; content/type`

### 7.4 Cookies

`[Cookies]` entries are combined into:
- Header `Cookie: k1=v1; k2=v2`

### 7.5 Basic auth

`[BasicAuth]` entries are combined into:
- Header `Authorization: Basic <base64(username:password)>`

### 7.6 Response assertions

Generated from:
- Response status line (`HTTP ...`)
- Response headers before sections (`headers.<k> == <v>`)
- `[Asserts]` content

## 8. Error Handling

Throws on:
- Empty or invalid input type
- No valid request line found
- Invalid request entries in payload normalizer

Error messages are intended to be user-displayable by extension command handlers.

## 9. Unsupported/Deferred Areas

Current parser intentionally does not persist the following into API TryIt model (no native fields yet):
- `[Captures]` values
- `[Options]` values
- Detailed response body checks as structured model fields

These can be supported in future by extending `@wso2/api-tryit-core` model.

## 10. Testing Requirements

Jest coverage MUST include:
- Single-request parse
- Multi-request parse in one Hurl string
- Escaped newline input
- Section parsing: Query, Form, Multipart, Cookies, BasicAuth
- Response line + asserts parsing
- Invalid/no-request input behavior
- Payload normalization behavior

## 11. Acceptance Criteria

1. Parser returns `ApiCollection` with expected request count for multi-request Hurl.
2. Section markers map to expected request model fields.
3. Extension compiles with parser dependency integrated.
4. `pnpm -C workspaces/api-tryit/hurl-parser test` passes.
5. `pnpm -C workspaces/api-tryit/hurl-parser build` passes.

## 12. Versioning and Compatibility

- Keep `hurlToApiRequestItem` for backward compatibility.
- Prefer `parseHurlCollection` for all new integrations.
- Non-breaking updates should preserve current return shapes and section mapping semantics.
