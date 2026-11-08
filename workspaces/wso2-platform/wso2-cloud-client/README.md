# @wso2/wso2-cloud-client

The WSO2 Cloud Integration Platform, as a TypeScript client for the VS Code
extensions: sign-in to ThunderID, a typed client for the `ipaas-service` API
and the observability proxy, and the contract WSO2 Integrator exports to the
Ballerina extension. It replaces the bundled Choreo CLI the extensions used
to drive over JSON-RPC.

No runtime dependencies. `vscode` is an optional peer, needed only by the
`./vscode` entry point.

## Entry points

| Import | What it holds |
| --- | --- |
| `@wso2/wso2-cloud-client` | Environments, errors, JWT helpers, the OAuth login flow and session manager, the API client (`createCloudClient`), the v2 extension contract and the `.wso2/context.yaml` document. |
| `@wso2/wso2-cloud-client/vscode` | The `wso2-cloud` authentication provider, a SecretStorage session store, the URI callback receiver, settings readers and `createPlatformClients`, which wires all of it for an extension host. |
| `@wso2/wso2-cloud-client/contract` | The v2 extension contract, its vocabulary, `buildConsoleUrl` and the context document only: no Node built-ins, so a webview bundle can import it. The root entry pulls in the loopback listener and the token sources, which need `node:http`, `node:crypto` and `node:fs`, and webpack refuses those in a browser target. |
| `@wso2/wso2-cloud-client/openapi` | The types generated from the platform's OpenAPI document. |

## How the pieces fit

```
extension host ──createPlatformClients()──▶ PlatformClients { sessions, tokenSource, cloud, auth }
                                                 │                  │
                            vscode.authentication "wso2-cloud" ◀────┘   CloudClient.{projects, components, builds, deployments, ...}
                                                                               │
                                           ThunderID (PKCE, refresh) ◀─────────┼─────▶ ipaas-service, observability proxy
```

The API client mirrors the `ws intg` command module one resource per file
(`src/api/*.ts`), including the routes' quirks (a 500 for an unknown build, an
empty body for "never deployed", `?projectName=` disambiguation). Types come
from the OpenAPI document under `spec/` through `openapi-typescript`; run
`pnpm generate` after updating the spec and commit the result.

The platform has no counterpart for some of what the old CLI did; a host
implementing the contract throws `NotSupportedError` for those rather than
guessing.

## Environments

`CLOUD_ENV` (also `WSO2_CLOUD_ENV`) or the setting
`integrator.advanced.cloudEnv` picks `prod`, `stage` or `dev`. Production and
staging hosts are built in. The development deployment is internal, so its
hosts are not in this repository: with `CLOUD_ENV=dev`, set

| Variable | Overrides |
| --- | --- |
| `WSO2_CLOUD_API_URL` | the API base URL (also the hidden setting `integrator.advanced.cloudApiBaseUrl`) |
| `WSO2_CLOUD_ISSUER` | the ThunderID issuer |
| `WSO2_CLOUD_OBSERVABILITY_URL` | the observability proxy |
| `WSO2_CLOUD_CONSOLE_URL` | the console, for links |
| `WSO2_CLOUD_CLIENT_ID` | the OAuth client id (also `integrator.advanced.cloudClientId`) |

The same variables override the built-in values for any environment.

A token injected by the cloud editor (`WSO2_CLOUD_TOKEN_FILE`, re-read on every
call, or `WSO2_CLOUD_TOKEN`) replaces the
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
the `./contract`, `./vscode` and `./openapi` subpaths to their declarations.
