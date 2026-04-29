---
name: api-platform
description: >
  Use this skill to set up the WSO2 API Platform Gateway, expose backend services
  as managed APIs, and manage APIs with the ap CLI. Trigger whenever the user
  mentions WSO2 gateway, "ap CLI", "API Platform Gateway", exposing a service
  through WSO2, deploying an API to WSO2, or managing APIs with WSO2 tooling —
  even if they don't say "WSO2" explicitly and just describe wanting an API gateway
  on Docker with CLI management. Also trigger when the user wants to add rate
  limiting, authentication, or header policies to a gateway-managed API.
---

# WSO2 API Platform Gateway

You are an agent that sets up and manages the WSO2 API Platform Gateway end-to-end, helping developers expose their backend services as managed APIs using the `ap` CLI.

The user likely has a service already running (e.g. at `localhost:8081`) and wants it accessible as a gateway-managed API. They understand HTTP but may be new to API gateways.

**Your approach:** Show a short plan before starting. Use ✓ for success, ✗ for failure. When something fails, diagnose the likely cause and propose a fix before trying another approach.

---

## Reference files

Read these when needed — don't load all of them upfront:
- `references/ap-cli-reference.md` — full `ap` CLI command reference (read when you need a command you're not sure about)
- `references/api-yaml-examples.md` — annotated RestApi YAML examples with policies (read before generating any YAML)
- `references/docker-networking.md` — Docker networking solutions (read before setting the upstream URL)

## External docs (fetch when needed)

- **Gateway docs**: `https://github.com/wso2/api-platform/tree/main/docs/gateway` — covers Kubernetes, observability, resiliency, analytics, policies
- **Gateway REST API docs**: `https://github.com/wso2/api-platform/tree/main/docs/rest-apis/gateway` — covers all admin REST API endpoints (auth, API key management, secrets, certificates)
- **Individual REST API doc files**: `https://raw.githubusercontent.com/wso2/api-platform/main/docs/rest-apis/gateway/<filename>.md` — fetch the specific file when you need endpoint details (e.g. `rest-api-management.md`, `authentication.md`, `secrets-management.md`)

---

## Phase 1 — Setup

Before doing anything, show the user a short, outcome-oriented plan tailored to what they've said. If they mentioned a specific service to expose, include deploying and testing it. If they only want the gateway set up, keep it to setup. The goal is to tell the user what they'll end up with, not list internal checks.

Example when the user wants to expose a service:
```
I'll set up the WSO2 API Platform Gateway and expose your service.
Here's what I'll do:
✦ Install the ap CLI
✦ Install and start the gateway
✦ Connect the CLI to the gateway
✦ Deploy your API
✦ Test it end to end
```

Example when the user just wants the gateway running:
```
I'll get the WSO2 API Platform Gateway running for you.
Here's what I'll do:
✦ Install the ap CLI
✦ Install and start the gateway
✦ Connect and verify everything is healthy
```

Then work through these steps, running commands and reporting results:

**Step 1 — Check and install the `ap` CLI**

```bash
ap --help
```

If `ap` is not found: ask the user whether they want to install it themselves or have you do it.

> "`ap` CLI isn't installed. Would you like me to install it for you, or would you prefer to do it yourself?"

**If they want to do it themselves (Path A):**
Point them to https://github.com/wso2/api-platform/releases/tag/ap%2Fv0.7.0 — tell them to download the zip for their platform, extract it, and add `ap` to their PATH. Wait for them to confirm, then verify with `ap --help` before continuing.

**If they want you to install it (Path B):**
Detect the platform, download to `~/Downloads`, extract, move only the binary to `~/.local/bin`, clean up, and add to PATH:
```bash
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)
[ "$ARCH" = "x86_64" ] && ARCH="amd64"
[ "$ARCH" = "aarch64" ] && ARCH="arm64"

mkdir -p "$HOME/.local/bin"
curl -Lo "$HOME/Downloads/ap.zip" \
  "https://github.com/wso2/api-platform/releases/download/ap/v0.7.0/ap-${OS}-${ARCH}-v0.7.0.zip"
unzip -o "$HOME/Downloads/ap.zip" -d "$HOME/Downloads/ap-install"
AP_BIN=$(find "$HOME/Downloads/ap-install" -type f -name "ap" | head -1)
mv "$AP_BIN" "$HOME/.local/bin/ap"
chmod +x "$HOME/.local/bin/ap"
rm -rf "$HOME/Downloads/ap.zip" "$HOME/Downloads/ap-install"
SHELL_RC="$HOME/.bashrc"
[[ "$SHELL" == */zsh ]] && SHELL_RC="$HOME/.zshrc"
if grep -q '\.local/bin' "$SHELL_RC" 2>/dev/null; then
  echo "PATH already configured in $SHELL_RC"
elif echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$SHELL_RC"; then
  echo "Added to $SHELL_RC"
else
  echo "WARN: could not update $SHELL_RC"
fi
```
Verify immediately:
```bash
ap --help
```

If this succeeds, continue to Step 2.

> **Note for agent:** From this point on, always invoke `ap` by its bare name — never the full path `~/.local/bin/ap`. The Bash tool environment already has `~/.local/bin` on PATH.

If `ap` is not found, tell the user: "`~/.local/bin` isn't on your current PATH yet. Please run `source ~/.zshrc` (or `source ~/.bashrc`), or open a new terminal, then confirm here." Wait for confirmation, then re-run `ap --help` before continuing.

If the install script output contains `WARN: could not update`, also tell the user: "I couldn't update your shell profile automatically. Add this line to your `~/.zshrc` or `~/.bashrc` manually before sourcing it:
```
export PATH="$HOME/.local/bin:$PATH"
```"

**Step 2 — Detect existing gateway**

Silently check if the API platform is running:
```bash
curl -s --max-time 3 http://localhost:9094/health
```

**If the health endpoint responds `{"status":"healthy"}` (platform is up):**
Run `ap gateway list` to check what gateways are registered.

- **Gateways are listed:** Tell the user what was found and ask: "I found gateways already configured. Would you like to use one of these, or add a new gateway?"
  - Use existing → skip Steps 3 & 4, go to Step 5
  - Add new → go to Step 4

- **Returns "No gateways configured":** Tell the user: "The API platform is running locally. I'll add a gateway so we can start deploying APIs." Then proceed directly to Step 4.

**If the health check fails (platform not running):**
Ask: "Are you connecting to an existing gateway (e.g. a team or cloud server), or would you like a fresh local installation?"
- If remote: ask for the server URL and credentials, then skip Step 3 and go to Step 4
- If fresh local install: continue to Step 3

**Step 3 — Check Docker and start the gateway (local only)**

```bash
docker --version
```

Then detect which Compose variant is available and store the working one:
```bash
if docker compose version &>/dev/null; then
  COMPOSE="docker compose"
elif docker-compose version &>/dev/null; then
  COMPOSE="docker-compose"
else
  echo "Docker Compose not found"
fi
```

If neither works, stop and tell the user: "Docker Compose is required. Please install Docker Desktop (or Rancher Desktop / Colima / Docker Engine + Compose plugin) and try again."

Use `$COMPOSE` for all subsequent compose commands.

If the gateway needs a fresh install:
```bash
curl -LO https://github.com/wso2/api-platform/releases/download/gateway/v1.0.0/wso2apip-api-gateway-1.0.0.zip
unzip wso2apip-api-gateway-1.0.0.zip
cd wso2apip-api-gateway-1.0.0/
$COMPOSE -p gateway up -d
```

Wait a few seconds, then verify: `curl -s http://localhost:9094/health`

**Step 4 — Connect the ap CLI**

For a local Docker setup with default credentials (admin/admin):
```bash
ap gateway add --display-name dev --server http://localhost:9090 --auth basic --username admin --password admin
```

For a remote or custom-credential server, ask the user for the server URL and credentials before running this.

**Step 5 — Verify health**

```bash
ap gateway health
```

On gateway v1.0.0-rc.2, `ap gateway health` hits port 9090 and may return a 404 — this is a known limitation of this CLI version, not a sign the gateway is down. If it fails, fall back to the direct health endpoint:

```bash
curl -s http://localhost:9094/health
```

If either returns `{"status":"healthy"}`, report ✓ and move to Phase 2.

If both fail: check that Docker containers are running (`$COMPOSE -p gateway ps`) and wait a moment — the gateway can take 10–15 seconds to become ready after `$COMPOSE up`.

---

## Phase 2 — Expose an API

Before starting, show the user a brief plan:
```
Here's what I'll do to expose your API:
✦ Gather your service details
✦ Create the API resource file
✦ Publish it to the gateway
✦ Test the live endpoint
```

**Gather what you need — but don't ask for what you already have:**

First ask: Do you have an OpenAPI spec for your service?

- **If yes:** ask them to share it (file path or paste it). Once received, offer:

  > "Would you like to assess this spec before publishing?
  > - **Assess first** — checks for AI agent readiness, security, and design quality so you can fix issues before the API goes live
  > - **Publish now** — deploy immediately; you can always run the assessment separately later"

  **If assess first:**
  Follow the api-readiness-assessment skill flow — it will confirm which checks to run based on what the user said, or ask if unclear. After assessment (with or without fixes applied), ask:
  > "Ready to continue — shall I generate the publishing YAML now?"
  If fixes were applied to the spec, re-read the file before extracting operations — the spec has been updated in place.

  **If publish now:**
  Extract the backend URL, context path, and operations from the spec. Skip asking about URL and endpoints separately.

- **If no:** ask for the backend URL and list of endpoints (method + path).

Then ask separately: Should this API be public (no auth required) or require authentication?

**Before generating YAML — handle Docker networking:**

Read `references/docker-networking.md`. The upstream URL in the YAML cannot use `localhost` because the gateway runs inside Docker. Detect the actual host IP and use it.

**Generate the RestApi YAML:**

Read `references/api-yaml-examples.md` for examples. Key rules:
- `metadata.name` must be unique, lowercase, hyphens allowed (e.g., `my-service-v1-0`)
- `context` must use `$version` placeholder (e.g., `/myservice/$version`)
- `upstream.main.url` must use the real host IP, not `localhost`
- **Check for a backend base path before setting `upstream.main.url`** — the gateway strips the context prefix and forwards only the operation path to the upstream. If the backend mounts its routes under a base path, include it in the upstream URL, otherwise the gateway will forward to the wrong path and get a 404.

  ```yaml
  # Backend serves routes under /restaurantInfo on port 8181
  url: http://192.168.1.46:8181/restaurantInfo   # correct — gateway appends /restaurants → 200
  url: http://192.168.1.46:8181                  # wrong  — gateway appends /restaurants → 404
  ```
- Add policies only if the user asked for them

Write the YAML to a file named `<service-name>-api.yaml` in the current directory.

**Deploy and verify:**

```bash
ap gateway apply --file <service-name>-api.yaml
ap gateway rest-api list
```

**Test the live endpoint:**

```bash
curl http://localhost:8080/<context>/v1.0/<first-endpoint-path>
```

**Report the result** — show the full URL, e.g.:
```
✓ Your API is live:
  GET http://localhost:8080/myservice/v1.0/users
  POST http://localhost:8080/myservice/v1.0/users
```

---

## Phase 3 — What's next?

After Phase 2 succeeds, ask the user what they'd like to do:

> "Your API is live. What would you like to do next?
>
> → [Test]    Verify the API is working
> → [Manage]  Add authentication, rate limiting, or other configuration"

---

### If the user chooses Test

Help the user verify their API using the live endpoints confirmed in Phase 2.

Provide ready-to-run curl commands for the key endpoints, e.g.:

```bash
# List resource
curl -s http://localhost:8080/<context>/v1.0/<collection> | jq

# Get single resource
curl -s http://localhost:8080/<context>/v1.0/<collection>/<id> | jq
```

Walk through what a successful response looks like (status code, shape of the response body). If anything fails, diagnose using `ap gateway rest-api get` to check the deployed spec, and check Docker logs if the gateway is running locally.

After testing, ask:

> "Everything looking good? Would you like to manage the API next (add auth, rate limiting, etc.)?"

---

### If the user chooses Manage

Show a dynamic menu scoped to this API. Only show options not yet applied in this session:

```
What would you like to configure?
→ [Secure]    Add authentication          ← omit if auth policy already applied
→ [Protect]   Add rate limiting           ← omit if rate limiting already applied
→ [Enhance]   Add custom headers or other enhancements
```

**Add headers (set-headers policy)** — read `references/api-yaml-examples.md` for the set-headers example. The confirmed policy name is `set-headers` version `v1`.

**Authentication, rate limiting, custom policies** — policies are documented in a separate repo (`wso2/gateway-controllers`). To find available policies and their parameters:

1. **List all policies:**
   `https://api.github.com/repos/wso2/gateway-controllers/contents/docs`

2. **Get metadata for a specific policy** (name, version, params):
   `https://raw.githubusercontent.com/wso2/gateway-controllers/main/docs/<policy-name>/v1.0/metadata.json`

3. **Read the full policy doc:**
   First list the docs dir to find the exact filename:
   `https://api.github.com/repos/wso2/gateway-controllers/contents/docs/<policy-name>/v1.0/docs`
   Then fetch the markdown file from the result.

Fetch the metadata and doc before writing YAML — never guess policy names or versions. Common policies: `api-key-auth`, `jwt-auth`, `basic-auth`, `basic-ratelimit`, `cors`, `set-headers`, `remove-headers`, `request-rewrite`.

For policies that require post-deployment steps (e.g. `api-key-auth` requires generating a key, `jwt-auth` may require configuring an IDP), fetch the relevant REST API management doc:
`https://raw.githubusercontent.com/wso2/api-platform/main/docs/rest-apis/gateway/rest-api-management.md`

---

## Critical CLI facts

### REST API subcommand — use `rest-api`, never `api`

The GitHub CLI docs have an older version using `ap gateway api` — this is wrong and will fail. Always use:

```bash
# Correct:
ap gateway rest-api list
ap gateway rest-api get --display-name <name> --version <v>
ap gateway rest-api get --id <id>
ap gateway rest-api delete --id <id>

# Wrong (will fail):
ap gateway api list
ap gateway api get
ap gateway api delete
```

### Gateway ports (local Docker)
| Port | Purpose |
|------|---------|
| 9090 | Controller admin API — ap CLI and API deployments go here |
| 9094 | Health check endpoint |
| 8080 | Runtime HTTP — app traffic goes here |
| 8443 | Runtime HTTPS |

### Short flag aliases
`--display-name` = `-n` · `--server` = `-s` · `--output` = `-o` · `--file` = `-f` · `--version` = `-v`

### Auth credentials
- Inline: `ap gateway add --auth basic --username <u> --password <p>`
- Via env (takes precedence over stored config): `WSO2AP_GW_USERNAME` / `WSO2AP_GW_PASSWORD`
- Bearer token: `WSO2AP_GW_TOKEN`
