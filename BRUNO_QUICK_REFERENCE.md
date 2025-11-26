# Bruno Integration - Quick Reference

## What Changed?

The Try It feature now uses **Bruno** instead of **httpyac/httpBook**.

## Installation

Bruno extension is automatically offered for installation when you use Try It:
- Extension ID: `bruno-api-client.bruno`
- Installed on-demand when you first use Try It with an HTTP service
- Can also be manually installed from VS Code marketplace

## Generated Files

When you use Try It, Bruno creates a collection structure:

```
{serviceName}/
├── bruno.json                    # Collection metadata
├── environments/
│   └── Local.bru                 # Environment with base URL
├── getUsers.bru                  # Individual request files
├── createUser.bru
├── updateUser.bru
└── deleteUser.bru
```

## File Format: .bru Files

Bruno uses a human-readable markup format:

```bru
meta {
  name: Get User by ID
  type: http-request
  seq: 1
}

get {
  url: {{baseUrl}}/users/{{userId}}
}

params:query {
  include: profile
  expand: true
}

headers {
  Accept: application/json
  Authorization: Bearer {{token}}
}

body:json {
  {
    "name": "John Doe",
    "email": "john@example.com"
  }
}

docs {
  Get a specific user by their ID.
  
  Expected schema:
  - userId: integer
  - include: string
}
```

## Environment Variables

The `Local.bru` environment file contains:

```bru
vars {
  baseUrl: http://localhost:9090/api/v1
}
```

## How to Use

1. **Open Ballerina Service**
   - Open your Ballerina service file
   - Make sure the service is running

2. **Trigger Try It**
   - Run the "Try It" command
   - Bruno collection opens in VS Code

3. **Execute Requests**
   - Click on any `.bru` file
   - Bruno will display the request details
   - Click "Send" to execute
   - View response in the panel

4. **Modify Requests**
   - Edit parameters directly in the `.bru` file
   - Change URLs, headers, or body
   - Save and re-execute

## Key Features

✅ **Separate Files**: Each endpoint is a separate file for better Git tracking
✅ **Plain Text**: Human-readable format, no JSON parsing needed
✅ **Environments**: Switch between Local, Dev, Production easily
✅ **Variables**: Use `{{variableName}}` for dynamic values
✅ **Documentation**: Inline docs support with `docs` block
✅ **Offline-First**: All data stored locally, no cloud dependencies

## Comparison with httpyac

| Feature | httpyac (Old) | Bruno (New) |
|---------|---------------|-------------|
| File Format | `.http` | `.bru` |
| Organization | Single file | File per endpoint |
| Syntax | HTTP syntax | Bru markup |
| Git-Friendly | Medium | Excellent |
| Templating | Handlebars | Native variables |
| Environments | JSON config | `.bru` files |

## Common Tasks

### Add Custom Header
```bru
headers {
  Custom-Header: custom-value
  X-API-Key: {{apiKey}}
}
```

### Add Query Parameters
```bru
params:query {
  filter: active
  sort: name
  limit: 10
}
```

### Add Path Parameters
```bru
get {
  url: {{baseUrl}}/users/{{userId}}/orders/{{orderId}}
}
```

### Add JSON Body
```bru
body:json {
  {
    "name": "{{userName}}",
    "age": 25,
    "active": true
  }
}
```

### Add Form Data
```bru
body:form-urlencoded {
  username: john
  password: secret
}
```

## Environment Management

### Switch Environments
1. Click on environment dropdown (top of Bruno panel)
2. Select "Local" or create new environment
3. Requests will use variables from selected environment

### Create New Environment
1. Create new file in `environments/` folder
2. Name it `{EnvName}.bru`
3. Add variables:
```bru
vars {
  baseUrl: https://api.production.com
  apiKey: prod-key-123
}
```

## Troubleshooting

### Collection Not Opening
- Verify Bruno extension is installed: `bruno-api-client.bruno`
- Check if collection directory was created
- Restart VS Code

### Requests Not Working
- Verify Ballerina service is running
- Check `baseUrl` in `Local.bru` matches service port
- Ensure path parameters are provided

### Variables Not Resolving
- Check variable is defined in environment file
- Verify correct environment is selected
- Use `{{variableName}}` syntax (double curly braces)

## Migration Notes

If you have existing `.http` files from httpyac:
- They are **not** automatically converted
- You need to re-generate Try It to create Bruno collections
- Old `.http` files can be deleted

## Advanced Usage

### Pre-request Scripts
Bruno supports JavaScript in requests:

```bru
script:pre-request {
  const timestamp = Date.now();
  bru.setVar("timestamp", timestamp);
}
```

### Post-response Scripts
```bru
script:post-response {
  if (res.status === 200) {
    const userId = res.body.id;
    bru.setVar("userId", userId);
  }
}
```

### Tests/Assertions
```bru
tests {
  test("Status is 200", function() {
    expect(res.status).to.equal(200);
  });
  
  test("Response has user", function() {
    expect(res.body).to.have.property("user");
  });
}
```

## Resources

- Bruno Documentation: https://docs.usebruno.com/
- Bruno GitHub: https://github.com/usebruno/bruno
- Bru Language Spec: https://github.com/usebruno/bruno/blob/main/docs/bru-lang.md
