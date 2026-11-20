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
| `@wso2/wso2-cloud-client` | Environments, errors, JWT helpers, the OAuth login flow and session manager, the API client (`createCloudClient`), the extension contract and the `.wso2/context.yaml` document. |
| `@wso2/wso2-cloud-client/vscode` | The `wso2-cloud` authentication provider, a SecretStorage session store, the URI callback receiver, settings readers and `createPlatformClients`, which wires all of it for an extension host. |
| `@wso2/wso2-cloud-client/contract` | The extension contract, its vocabulary, `buildConsoleUrl` and the context document only: no Node built-ins, so a webview bundle can import it. The root entry pulls in the loopback listener and the token sources, which need `node:http`, `node:crypto` and `node:fs`, and webpack refuses those in a browser target. |
| `@wso2/wso2-cloud-client/openapi` | The types generated from the platform's OpenAPI document. |

## How the pieces fit

```
extension host ──createPlatformClients()──▶ PlatformClients { sessions, tokenSource, cloud, auth, apiKeys }
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

### Other extensions and the exported API

A host exports the contract's `IWso2PlatformExtensionGate` (WSO2 Integrator as
`cloudAPIs`). Exports carry no caller identity, so everything past the gate
answers only to a key: the `wso2-cloud` provider's sessions carry that key
(`apiKeys`) as their `accessToken`, never the WSO2 Cloud token, and an
extension gets one with
`vscode.authentication.getSession("wso2-cloud", ["env:<env>"])` (any region of
the deployment answers with the region in use, so `env:prod` serves Europe
too), where VS Code checks that extension's access (an editor build can trust extensions up front
with `trustedExtensionAuthAccess` in its `product.json`). It then calls
`cloudAPIs.connect(session.accessToken)`. The key is random, lives in the
window's memory, and is replaced when the person, the organization or the
window changes; VS Code reports the session change, and calls with the old key
fail with `api_key_invalid`. The WSO2 Cloud token stays in the host: a service
that needs its own token gets it through `exchangeToken`, at an endpoint the
host allows for that target, and other WSO2 Cloud services are called through
`request`, by a name the host resolves.

### The sign-in callback URI

`createPlatformClients` returns a `uriReceiver` when the sign-in comes back
through a `vscode://` URI (whenever the editor's scheme is one the identity
provider knows; a desktop fork with another scheme uses the loopback listener),
but it does not register a URI handler: an
extension has only one, and the host may already have its own. The host
registers (or extends) its `vscode.window.registerUriHandler` and forwards the
callback URIs to `uriReceiver.pushUri(uri)`, which answers `true` for one it
took:

```ts
const clients = createPlatformClients({ extensionId: "wso2.wso2-integrator", context });
context.subscriptions.push(
	vscode.window.registerUriHandler({
		handleUri(uri) {
			if (clients.uriReceiver?.pushUri(uri)) {
				return;
			}
			// The host's own URIs.
		},
	}),
);
```

Without it, a sign-in that comes back by URI waits until it times out.

## Environments

The environment, `prod`, `prod-eu`, `stage` or `dev`, is the first of these
that names one:

1. the environment variable `WSO2_CLOUD_ENV`,
2. the environment variable `CLOUD_ENV`,
3. the user setting `integrator.advanced.cloudEnv`, which names a deployment
   (`prod`, `stage` or `dev`) and no region (a workspace or folder value is
   ignored, so a cloned repository cannot choose it),
4. `prod`.

Production runs in two regions, each with its own identity provider, API and
hosts: `prod` in the United States and `prod-eu` in Europe. The host can move
between them while the editor runs (`PlatformClients.switchEnvironment`, with
`regions` listing the choice). Each region keeps its own session, so a person
can be signed in to both and a token only ever goes to the region that issued
it. The person selects the region when signing in; the region switched to is
kept in `globalState` and used on the next start,
as long as the settings still name the same environment. A variable that names
the environment, a URL or client id override, or an injected token fixes the
environment as it is, and `regions` then holds only it.

Production and staging hosts are built in, the Copilot backend among them for
production (staging has none yet). The development deployment is
internal, so its hosts are not in this repository: with `dev`, set

| Variable | Overrides |
| --- | --- |
| `WSO2_CLOUD_API_URL` | the API base URL |
| `WSO2_CLOUD_ISSUER` | the ThunderID issuer |
| `WSO2_CLOUD_OBSERVABILITY_URL` | the observability proxy |
| `WSO2_CLOUD_CONSOLE_URL` | the console, for links |
| `WSO2_CLOUD_COPILOT_URL` | the WSO2 Integrator Copilot backend: where the WSO2 Cloud token is exchanged for a Copilot token, and Copilot requests go |
| `WSO2_CLOUD_CLIENT_ID` | the OAuth client id |

The same variables override the built-in values for any environment. A URL
override must be `https` (`http` only for localhost); the client id is not a
URL and is taken as it is. When the configuration
cannot be used, `createPlatformClients` does not throw: it warns and uses the
chosen environment without overrides, or `prod` when that environment has no
built-in hosts (`dev`).

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
