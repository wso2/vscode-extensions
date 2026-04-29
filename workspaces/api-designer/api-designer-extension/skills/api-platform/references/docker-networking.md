# Docker Networking: Upstream URLs

## The Problem

When the WSO2 gateway runs in Docker and your backend service runs on your host machine, `localhost` inside the container refers to the container itself — not your host machine. Using `localhost` as the upstream URL will result in connection refused errors, even though your backend is running fine.

**Wrong:**
```yaml
upstream:
  main:
    url: http://localhost:8081   # This points to inside the Docker container
```

**Correct:**
```yaml
upstream:
  main:
    url: http://192.168.1.42:8081  # Your host machine's actual IP
```

---

## Solution 1: Detect the Host IP (Most Reliable)

This works on all Docker environments: Docker Desktop, Rancher Desktop, Colima, Linux native Docker Engine.

**macOS:**
```bash
ipconfig getifaddr en0
# or
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Linux:**
```bash
ip route | grep default | awk '{print $3}'
# or
hostname -I | awk '{print $1}'
```

Use the returned IP directly in the upstream URL:
```yaml
upstream:
  main:
    url: http://192.168.1.42:8081
```

---

## Solution 2: host.docker.internal (Convenient but Limited)

`host.docker.internal` is a DNS name that resolves to the host machine's IP — but only on some Docker runtimes:

| Runtime | Supported? |
|---------|-----------|
| Docker Desktop (macOS / Windows) | ✓ Yes |
| Rancher Desktop | ✓ Yes |
| Colima | ✓ Yes |
| Linux native Docker Engine | ✗ No (unless manually configured) |

```yaml
upstream:
  main:
    url: http://host.docker.internal:8081
```

---

## Which to Use

**Default to Solution 1** (actual IP). It works everywhere without guessing the runtime.

Only use `host.docker.internal` if:
- The user confirms they're on Docker Desktop, Rancher Desktop, or Colima, AND
- You want a URL that stays stable across IP changes (e.g., switching networks)

---

## When the Backend is Also in Docker

If the user's backend service is itself running in a Docker container (not on the host), use the container name or Docker network hostname:

```bash
docker network inspect gateway_gateway-network
# Look for the backend container's name/IP
```

```yaml
upstream:
  main:
    url: http://my-backend-container:8081   # Container name on shared network
```

The backend container must be on the same Docker network as the gateway (`gateway_gateway-network` by default).
