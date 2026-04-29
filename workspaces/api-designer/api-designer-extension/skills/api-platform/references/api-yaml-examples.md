# RestApi YAML Examples

## Naming Rules

- `metadata.name` must be **unique**, **lowercase**, hyphens allowed — e.g., `restaurant-api-v1-0`
- `spec.version` is a string — use `v1.0`, `v2`, etc.
- `spec.context` must include the `$version` placeholder — the gateway substitutes it with the version string so the URL becomes `/myapi/v1.0/...`
- `upstream.main.url` must point to the real backend host — see `docker-networking.md` for why `localhost` won't work

---

## Example 1: Minimal Public API

The simplest possible deployment — no policies, single endpoint, fully public.

```yaml
apiVersion: gateway.api-platform.wso2.com/v1alpha1
kind: RestApi
metadata:
  name: users-api-v1-0          # Unique ID for this resource. Lowercase + hyphens only.
spec:
  displayName: Users API         # Human-readable name shown in listings
  version: v1.0                  # Version string — also appears in the URL
  context: /users/$version       # URL prefix. $version becomes "v1.0", so: /users/v1.0/...
  upstream:
    main:
      url: http://192.168.1.42:8081  # Backend URL — must NOT be localhost (see docker-networking.md)
  operations:
    - method: GET
      path: /users
    - method: GET
      path: /users/{id}
```

**Resulting URLs on the gateway:**
- `GET http://localhost:8080/users/v1.0/users`
- `GET http://localhost:8080/users/v1.0/users/{id}`

---

## Example 2: API with Request and Response Header Manipulation

Uses the `set-headers` policy (confirmed name: `set-headers`, version `v1`) to add headers to both the forwarded request and the response returned to the caller.

```yaml
apiVersion: gateway.api-platform.wso2.com/v1alpha1
kind: RestApi
metadata:
  name: weather-api-v1-0
spec:
  displayName: Weather API
  version: v1.0
  context: /weather/$version
  upstream:
    main:
      url: http://192.168.1.42:5000
  policies:
    - name: set-headers            # Policy name — must match exactly
      version: v1                  # Policy version
      params:
        request:                   # Headers added to the request sent to the backend
          headers:
            - name: x-api-source
              value: wso2-gateway
            - name: x-request-id
              value: gateway-req
        response:                  # Headers added to the response returned to the client
          headers:
            - name: x-powered-by
              value: wso2-gateway
  operations:
    - method: GET
      path: /{country_code}/{city}
    - method: GET
      path: /alerts/active
```

To add only request headers (no response headers), omit the `response` block entirely. Same for response-only.

---

## Example 3: Multiple HTTP Methods on the Same Path

```yaml
apiVersion: gateway.api-platform.wso2.com/v1alpha1
kind: RestApi
metadata:
  name: products-api-v1-0
spec:
  displayName: Products API
  version: v1.0
  context: /products/$version
  upstream:
    main:
      url: http://192.168.1.42:3000
  operations:
    - method: GET
      path: /products
    - method: POST
      path: /products
    - method: GET
      path: /products/{id}
    - method: PUT
      path: /products/{id}
    - method: DELETE
      path: /products/{id}
```

---

## Example 4: API with Path Parameters

Path parameters use curly brace syntax `{param}` — same as OpenAPI.

```yaml
apiVersion: gateway.api-platform.wso2.com/v1alpha1
kind: RestApi
metadata:
  name: orders-api-v1-0
spec:
  displayName: Orders API
  version: v1.0
  context: /orders/$version
  upstream:
    main:
      url: http://192.168.1.42:8082
  operations:
    - method: GET
      path: /orders
    - method: POST
      path: /orders
    - method: GET
      path: /orders/{orderId}
    - method: GET
      path: /orders/{orderId}/items
```

**How $version works in practice:**

The context `/orders/$version` with version `v1.0` means:
- Gateway listens at: `http://localhost:8080/orders/v1.0/...`
- Forwards to backend at: `http://<host-ip>:8082/orders/{orderId}/...`

This lets you run v1.0 and v2.0 of the same API side-by-side by deploying two YAML files with different names, versions, and contexts.

---

## Updating an Existing API

To update a deployed API, retrieve the current YAML, modify it, and re-apply:

```bash
ap gateway rest-api get --display-name "Orders API" --version v1.0 --format yaml > orders-api.yaml
# Edit orders-api.yaml as needed
ap gateway apply --file orders-api.yaml
```

Re-applying with the same `metadata.name` updates the existing resource.

---

## Common Mistakes

| Mistake | Correct approach |
|---------|-----------------|
| `upstream.url: http://localhost:8081` | Use actual host IP — see docker-networking.md |
| `metadata.name: My Orders API` | Must be lowercase, no spaces: `my-orders-api` |
| `context: /orders/v1.0` | Must use placeholder: `context: /orders/$version` |
| Guessing a policy name | Only `set-headers v1` is confirmed. For others, check the Policy Hub or ask the user. |
