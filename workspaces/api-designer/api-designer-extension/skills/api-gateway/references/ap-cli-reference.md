# ap CLI Reference — WSO2 API Platform

## Official Documentation

Fetch these when you need command syntax, flags, or installation steps — they are the authoritative source:

| Document | Raw URL |
|----------|---------|
| Quick Start Guide | `https://raw.githubusercontent.com/wso2/api-platform/main/docs/cli/quick-start-guide.md` |
| Full CLI Reference | `https://raw.githubusercontent.com/wso2/api-platform/main/docs/cli/reference.md` |
| Customizing Gateway Policies | `https://raw.githubusercontent.com/wso2/api-platform/main/docs/cli/customizing-gateway-policies.md` |

The CLI reference covers all 15 gateway sub-commands (add, list, use, current, health, remove, apply, api, mcp, image build, etc.), short flag aliases, and authentication setup.

---

## Critical Corrections

### REST API subcommand — use `rest-api`, NOT `api`

The official `reference.md` shows `ap gateway api list/get/delete` — **this is outdated and will fail**. Always use `rest-api`:

```bash
# Correct:
ap gateway rest-api list
ap gateway rest-api get --display-name <name> --version <v> --format yaml
ap gateway rest-api get --id <id> --format json
ap gateway rest-api delete --id <id>

# Wrong (will fail):
ap gateway api list
ap gateway api get
ap gateway api delete
```

---

## Supplements (not in official docs)

### Gateway ports (local Docker)

| Port | Purpose |
|------|---------|
| 9090 | Controller admin API — `ap` CLI and API deployments |
| 9094 | Health check endpoint |
| 8080 | Runtime HTTP — app traffic |
| 8443 | Runtime HTTPS |

