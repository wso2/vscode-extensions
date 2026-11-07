# The ThunderID client for the editors

What the identity team needs to register so the WSO2 Integrator extension
(in VS Code, VS Code Insiders and the WSO2 Integrator desktop app) can sign
people in to WSO2 Cloud. One client serves all three editors; they differ
only in the URI scheme the sign-in comes back on. Everything below is what
`@wso2/wso2-cloud-client` sends or checks; the file names where it does.

## Client

| Setting | Value | Why |
| --- | --- | --- |
| Client id | `WSO2_INTEGRATOR_EXTENSION` (one per deployment: dev, stage, prod; registered on dev 2026-11-06) | Built into `src/config/environments.ts`; overridable with `WSO2_CLOUD_CLIENT_ID` or the hidden setting `integrator.advanced.cloudClientId`. |
| Client type | Public, no secret | The code ships in a Marketplace VSIX; a secret cannot be kept. The token endpoint is called with `client_id` only (`src/auth/token-endpoint.ts`). |
| Grant types | `authorization_code`, `refresh_token` | Browser sign-in, then silent refresh. `urn:ietf:params:oauth:grant-type:token-exchange` only if the platform later asks for resource-bound tokens (`tokenExchange: "resource"`, off today). |
| PKCE | Required, `S256` | Every `/authorize` carries `code_challenge` and `code_challenge_method=S256`; the client never sends a plain challenge (`src/auth/pkce.ts`). |
| Response type | `code` | |
| Scopes | `openid offline_access profile email` | `offline_access` for the refresh token; `profile` and `email` for the account label in the VS Code Accounts menu (`LOGIN_SCOPES` in `src/auth/login-flow.ts`). |
| Token endpoint auth | `none` | Public client. |
| Refresh tokens | Issued, rotation allowed | The session manager stores whatever refresh token the last response carried, so rotating is fine. An `invalid_grant` on refresh ends the session and the person is asked to sign in again. |
| Consent | Skip for this first-party client | Otherwise every sign-in shows a consent page. |
| Organization selection | The person picks the organization at sign-in; `prompt=login` must show the picker again | Tokens are organization-scoped, so "switch organization" is sign out plus sign in with `prompt=login` (`src/vscode/auth-provider.ts`). If ThunderID uses another parameter for re-selection, tell us; it is one string. |

## Redirect URIs

Register all of these, exactly:

```
vscode://wso2.wso2-integrator/signin
vscode-insiders://wso2.wso2-integrator/signin
wso2-integrator://wso2.wso2-integrator/signin
http://127.0.0.1:10441/callback
http://127.0.0.1:10442/callback
http://127.0.0.1:10443/callback
http://127.0.0.1:10444/callback
```

- The loopback URIs are what the local desktop editor uses first: the client listens on the first free port of 10441–10444 for one sign-in and closes it, and the page it serves ends the browser tab ("You are signed in"). A `vscode://` redirect cannot do that: the browser hands the URI to the editor without navigating, so the identity provider's page keeps its spinner. The ports are distinct from the `ws` CLI's 10425–10428, so both can sign in at once. (`LOOPBACK_PORTS` in `src/auth/callback/loopback.ts`, `chooseReceivers` in `src/vscode/uri-callback.ts`.)
- The first three are VS Code's URI handler: `<editor scheme>://<extension id>/signin`. The scheme is the editor's (`vscode.env.uriScheme`); `wso2-integrator` is the desktop app's `urlProtocol`. The authority is the extension id `wso2.wso2-integrator`. The editor uses it when all four loopback ports are taken, and always over Remote-SSH, WSL and dev containers, where the loopback would listen on the remote host rather than where the browser is: the local editor receives the URI and routes it to the remote extension host. There the identity provider's tab stays on its spinner after the editor has signed in; closing it is all that is left. (`REGISTERED_URI_SCHEMES` in `src/vscode/uri-callback.ts`.)
- Loopback must be `http://127.0.0.1`, not `localhost`, and the port must be matched exactly unless ThunderID implements RFC 8252's any-port loopback, in which case one entry suffices.

## Tokens

The client reads the access token as a JWT and refuses to use a session whose token lacks any of these claims (`REQUIRED_CLAIMS` in `src/jwt.ts`):

| Claim | Meaning |
| --- | --- |
| `sub` | The person's id. |
| `iss` | The deployment's issuer, which must equal the configured one. |
| `client_id` | `WSO2_INTEGRATOR_EXTENSION`. |
| `ouId`, `ouName`, `ouHandle` | The organization the token is scoped to; `ouHandle` is what the extensions key everything by. |
| `exp` | Drives refresh a minute ahead of expiry. |

The ID token is checked for `iss`, `aud` containing `WSO2_INTEGRATOR_EXTENSION`, the `nonce` the client sent, and `exp` (`src/auth/id-token.ts`). Signatures are not verified in the editor; both tokens arrive straight from the token endpoint over TLS.

The access token is sent as `Bearer` straight to the ipaas-service API and the observability proxy, the way the console does it. On dev the token's `aud` is `urn:wso2:cloud:platform-api`, so services that validate the audience (the Copilot token exchange, the managed-token-service) must accept that value, not the client id. That is why the client and its audience also have to be accepted by those services and by the platform's own (dependency D-2 in [platform-dependencies.md](platform-dependencies.md)).

## Discovery

The client reads `<issuer>/.well-known/openid-configuration` and uses `authorization_endpoint`, `token_endpoint`, and, when present, `revocation_endpoint` (sign-out revokes the refresh token) (`src/auth/discovery.ts`). The document's `issuer` must be the one asked for and every endpoint must be `https`; anything else is refused. The issuer URLs:

| Deployment | Issuer |
| --- | --- |
| prod | `https://accounts.cloud.wso2.com` |
| stage | `https://accounts.stg.cloud.wso2.com` |
| dev | internal; supplied to the editor through `WSO2_CLOUD_ISSUER` |

## Checking a registration

`pnpm check-access` (`scripts/check-access.js`) signs in through the client from a terminal with the loopback redirect and calls the API with the token; it passed on dev on 2026-11-06.

From the editor: 
With the client registered and `CLOUD_ENV` pointing at the deployment, run the WSO2 Integrator command "Sign in to WSO2 Cloud". The browser should land on the ThunderID page and come back to the editor; the Output panel (WSO2 Integrator) logs the redirect URI it chose. A `redirect_uri_mismatch` names the URI to add; an `invalid_client` means the id is not registered on that deployment.
