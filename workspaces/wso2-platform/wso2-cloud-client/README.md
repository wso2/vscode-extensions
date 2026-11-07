# @wso2/wso2-cloud-client

The WSO2 Cloud Integration Platform, as a TypeScript client for the VS Code
extensions: sign-in to ThunderID and a typed client for the `ipaas-service`
API and the observability proxy. It replaces the bundled Choreo CLI the
extensions used to drive over JSON-RPC.

No runtime dependencies.

## Entry points

| Import | What it holds |
| --- | --- |
| `@wso2/wso2-cloud-client` | Environments, errors, JWT helpers, the OAuth login flow and session manager, and the API client (`createCloudClient`). |
| `@wso2/wso2-cloud-client/openapi` | The types generated from the platform's OpenAPI document. |

## How the pieces fit

The API client mirrors the `ws intg` command module one resource per file
(`src/api/*.ts`), including the routes' quirks (a 500 for an unknown build, an
empty body for "never deployed", `?projectName=` disambiguation). Types come
from the OpenAPI document under `spec/` through `openapi-typescript`; run
`pnpm generate` after updating the spec and commit the result.

## Environments

`CLOUD_ENV` (also `WSO2_CLOUD_ENV`, legacy `CHOREO_ENV`) picks `prod`,
`stage` or `dev`. Production and
staging hosts are built in. The development deployment is internal, so its
hosts are not in this repository: with `CLOUD_ENV=dev`, set

| Variable | Overrides |
| --- | --- |
| `WSO2_CLOUD_API_URL` | the API base URL |
| `WSO2_CLOUD_ISSUER` | the ThunderID issuer |
| `WSO2_CLOUD_OBSERVABILITY_URL` | the observability proxy |
| `WSO2_CLOUD_CONSOLE_URL` | the console, for links |
| `WSO2_CLOUD_CLIENT_ID` | the OAuth client id |

The same variables override the built-in values for any environment.

A token injected by the cloud editor (`WSO2_CLOUD_TOKEN_FILE`, re-read on every
call, or `WSO2_CLOUD_TOKEN`; `CLOUD_STS_TOKEN` as a legacy name) replaces the
browser sign-in.

## Developing

```sh
pnpm build      # tsc
pnpm test       # mocha + ts-node, no network (in-process doubles in test/doubles)
pnpm lint       # biome
pnpm generate   # regenerate src/api/generated/ipaas.ts from spec/
```

Two constraints come from the consumers. Some packages that compile against
these declarations still run TypeScript 4.2, so the source uses `import type`
and `export type` statements rather than inline `type` modifiers, which older
compilers cannot parse. And the host extensions resolve modules the classic
Node way, which ignores `exports`, so `typesVersions` in package.json maps
the `./openapi` subpath to its declarations.
