/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { OpenAPI } from '../definitions/ServiceDefinitions';

export type DocumentTemplateType = 
    | 'getting-started'
    | 'api-reference'
    | 'examples'
    | 'architecture'
    | 'integration'
    | 'changelog'
    | 'blank';

export interface DocumentTemplate {
    id: DocumentTemplateType;
    name: string;
    description: string;
    icon: string;
    format: 'markdown' | 'text';
    generateContent: (openAPI?: OpenAPI, apiTitle?: string, apiVersion?: string, specFilePath?: string) => string;
    defaultFileName: (apiTitle?: string) => string;
}

// Markers for spec-derived content that can be auto-updated
// Using markdown link reference format which is invisible when rendered
// Using simple text markers that won't break MDXEditor
export const SPEC_START_MARKER = '';
export const SPEC_END_MARKER = '';

// Escaped versions for regex
const SPEC_START_REGEX = '\\[//\\]: # \\(OPENAPI_SPEC_START\\)';
const SPEC_END_REGEX = '\\[//\\]: # \\(OPENAPI_SPEC_END\\)';

/**
 * Check if a markdown document has spec-derived sections
 */
export const hasSpecSections = (content: string): boolean => {
    // Markers disabled for MDXEditor compatibility
    return false;
};

/**
 * Extract spec sections from document for comparison
 */
export const extractSpecSections = (content: string): string[] => {
    const sections: string[] = [];
    const regex = new RegExp(`${SPEC_START_REGEX}([\\s\\S]*?)${SPEC_END_REGEX}`, 'g');
    let match;
    while ((match = regex.exec(content)) !== null) {
        sections.push(match[1].trim());
    }
    return sections;
};

/**
 * Update spec-derived sections in a document while preserving user edits
 */
export const updateSpecSections = (
    existingContent: string,
    newContent: string
): string => {
    // Extract new spec sections
    const newSections: string[] = [];
    const newRegex = new RegExp(`${SPEC_START_REGEX}([\\s\\S]*?)${SPEC_END_REGEX}`, 'g');
    let match;
    while ((match = newRegex.exec(newContent)) !== null) {
        newSections.push(match[1]);
    }

    // Replace spec sections in existing content
    let sectionIndex = 0;
    const updatedContent = existingContent.replace(
        new RegExp(`${SPEC_START_REGEX}[\\s\\S]*?${SPEC_END_REGEX}`, 'g'),
        () => {
            const replacement = `${SPEC_START_MARKER}${newSections[sectionIndex] || ''}${SPEC_END_MARKER}`;
            sectionIndex++;
            return replacement;
        }
    );

    return updatedContent;
};

// Helper to generate authentication section from security schemes
const generateAuthSection = (openAPI?: OpenAPI, baseUrl?: string): string => {
    const securitySchemes = openAPI?.components?.securitySchemes || {};
    const schemes = Object.entries(securitySchemes);
    
    if (schemes.length === 0) {
        return `To use this API, you'll need to authenticate your requests. 

\`\`\`bash
# Example: Include your API key in the request header
curl -H "Authorization: Bearer YOUR_API_KEY" \\
     -H "Content-Type: application/json" \\
     ${baseUrl || 'https://api.example.com'}/endpoint
\`\`\``;
    }

    let authContent = 'This API supports the following authentication methods:\n\n';
    schemes.forEach(([name, scheme]: [string, any]) => {
        if (scheme.type === 'apiKey') {
            authContent += `### ${name} (API Key)\n`;
            authContent += `- **Location:** ${scheme.in}\n`;
            authContent += `- **Parameter:** \`${scheme.name}\`\n\n`;
        } else if (scheme.type === 'http') {
            authContent += `### ${name} (${scheme.scheme})\n`;
            if (scheme.scheme === 'bearer') {
                authContent += `Include a Bearer token in the Authorization header:\n`;
                authContent += `\`\`\`\nAuthorization: Bearer <your-token>\n\`\`\`\n\n`;
            } else if (scheme.scheme === 'basic') {
                authContent += `Include Basic auth credentials in the Authorization header.\n\n`;
            }
        } else if (scheme.type === 'oauth2') {
            authContent += `### ${name} (OAuth 2.0)\n`;
            authContent += `This API uses OAuth 2.0 for authentication.\n\n`;
        }
    });
    return authContent;
};

const generateGettingStartedContent = (openAPI?: OpenAPI, apiTitle?: string, apiVersion?: string): string => {
    const title = apiTitle || openAPI?.info?.title || 'API';
    const version = apiVersion || openAPI?.info?.version || '1.0.0';
    const description = openAPI?.info?.description || '';
    const servers = openAPI?.servers || [];
    const baseUrl = servers.length > 0 ? servers[0].url : 'https://api.example.com';
    const contact = openAPI?.info?.contact;
    const license = openAPI?.info?.license;

    // Generate spec-derived content block
    const specContent = `
**API Version:** ${version}  
**Base URL:** \`${baseUrl}\`${contact?.email ? `  \n**Contact:** ${contact.email}` : ''}${license?.name ? `  \n**License:** ${license.name}` : ''}

${description || `The ${title} API provides a comprehensive set of endpoints for interacting with our services.`}`;

    return `# Getting Started with ${title}

Welcome to the ${title} API! This guide will help you get up and running quickly.

## Overview

${SPEC_START_MARKER}
${specContent}
${SPEC_END_MARKER}

## Prerequisites

Before you begin, make sure you have:

- An API key or authentication credentials
- Access to the API environment
- Basic understanding of REST APIs

## Authentication

${SPEC_START_MARKER}
${generateAuthSection(openAPI, baseUrl)}
${SPEC_END_MARKER}

## Quick Start

### 1. Get Your API Key

Contact your administrator to obtain your API key.

### 2. Make Your First Request

Here's a simple example to get you started:

${SPEC_START_MARKER}
\`\`\`bash
curl -X GET \\
     -H "Authorization: Bearer YOUR_API_KEY" \\
     ${baseUrl}/health
\`\`\`
${SPEC_END_MARKER}

### 3. Explore the API

- Check out the [API Reference](./api-reference.md) for detailed endpoint documentation
- Review [Examples](./examples.md) for code samples in different languages
- Read the [Integration Guide](./integration.md) for platform-specific instructions

## Rate Limits

Please be mindful of rate limits when making requests. Contact support if you need higher limits.

## Support

Need help? Check out our:
- [API Reference](./api-reference.md)
- [Examples & Tutorials](./examples.md)
${contact?.email ? `- Contact support: ${contact.email}` : '- Contact support: support@example.com'}

## Next Steps

- [Read the API Reference](./api-reference.md)
- [Try the Examples](./examples.md)
- [Set up Integration](./integration.md)
`;
};

const generateAPIReferenceContent = (openAPI?: OpenAPI, apiTitle?: string, apiVersion?: string): string => {
    const title = apiTitle || openAPI?.info?.title || 'API';
    const servers = openAPI?.servers || [];
    const baseUrl = servers.length > 0 ? servers[0].url : 'https://api.example.com';
    const paths = openAPI?.paths || {};
    const pathEntries = Object.entries(paths);

    // Generate full endpoints documentation
    let endpointsSection = '';
    if (pathEntries.length > 0) {
        pathEntries.forEach(([path, pathItem]) => {
            const methods = Object.keys(pathItem as object).filter(m => 
                ['get', 'post', 'put', 'delete', 'patch'].includes(m.toLowerCase())
            );
            methods.forEach(method => {
                const operation = (pathItem as any)[method];
                const summary = operation?.summary || '';
                const description = operation?.description || '';
                const operationId = operation?.operationId || '';
                const tags = operation?.tags || [];
                const parameters = operation?.parameters || [];
                const requestBody = operation?.requestBody;
                const responses = operation?.responses || {};

                // Helper to escape < and > for MDX compatibility
                const escapeForMdx = (text: string) => text.replace(/</g, '‹').replace(/>/g, '›');
                
                endpointsSection += `### ${method.toUpperCase()} \`${path}\`\n\n`;
                if (summary) endpointsSection += `**${escapeForMdx(summary)}**\n\n`;
                if (description) endpointsSection += `${escapeForMdx(description)}\n\n`;
                if (tags.length > 0) endpointsSection += `**Tags:** ${tags.join(', ')}\n\n`;

                // Parameters
                if (parameters.length > 0) {
                    endpointsSection += `**Parameters:**\n\n`;
                    endpointsSection += `| Name | In | Type | Required | Description |\n`;
                    endpointsSection += `|------|-----|------|----------|-------------|\n`;
                    parameters.forEach((param: any) => {
                        const paramType = param.schema?.type || 'string';
                        const required = param.required ? 'Yes' : 'No';
                        // Escape special characters in description for table cell and MDX compatibility
                        const desc = (param.description || '-').replace(/\|/g, '\\|').replace(/\n/g, ' ').replace(/</g, '‹').replace(/>/g, '›');
                        const name = (param.name || '').replace(/\|/g, '\\|');
                        endpointsSection += `| ${name} | ${param.in} | ${paramType} | ${required} | ${desc} |\n`;
                    });
                    endpointsSection += '\n';
                }

                // Request Body
                if (requestBody) {
                    endpointsSection += `**Request Body:** ${requestBody.required ? '(required)' : '(optional)'}\n\n`;
                    const content = requestBody.content;
                    if (content?.['application/json']?.schema) {
                        endpointsSection += `Content-Type: \`application/json\`\n\n`;
                    }
                }

                // Responses
                const responseEntries = Object.entries(responses);
                if (responseEntries.length > 0) {
                    endpointsSection += `**Responses:**\n\n`;
                    responseEntries.forEach(([code, resp]: [string, any]) => {
                        const respDesc = (resp.description || 'No description').replace(/</g, '‹').replace(/>/g, '›');
                        endpointsSection += `- **${code}**: ${respDesc}\n`;
                    });
                    endpointsSection += '\n';
                }

                endpointsSection += `---\n\n`;
            });
        });
    } else {
        endpointsSection = 'No endpoints defined in the specification.\n\n';
    }

    return `# ${title} API Reference

This document provides detailed information about all available endpoints in the ${title} API.

## Base URL

${SPEC_START_MARKER}
All API requests should be made to: \`${baseUrl}\`
${SPEC_END_MARKER}

## Authentication

${SPEC_START_MARKER}
${generateAuthSection(openAPI, baseUrl)}
${SPEC_END_MARKER}

## Content Types

The API accepts and returns JSON by default. Set the \`Content-Type\` header to \`application/json\`.

## Endpoints

${SPEC_START_MARKER}
${endpointsSection}
${SPEC_END_MARKER}

## Response Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 201  | Created |
| 400  | Bad Request |
| 401  | Unauthorized |
| 404  | Not Found |
| 500  | Internal Server Error |

## Error Handling

When an error occurs, the API returns an error object with the following structure:

\`\`\`json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
\`\`\`

## Rate Limiting

API requests are subject to rate limiting. Rate limit information is included in response headers.

## Pagination

List endpoints support pagination. Use query parameters to control page size and navigation.
`;
};

const generateExamplesContent = (openAPI?: OpenAPI, apiTitle?: string, apiVersion?: string): string => {
    const title = apiTitle || openAPI?.info?.title || 'API';
    const servers = openAPI?.servers || [];
    const baseUrl = servers.length > 0 ? servers[0].url : 'https://api.example.com';
    const paths = openAPI?.paths || {};
    
    // Find first GET and POST endpoints for examples
    let getEndpoint = '/endpoint';
    let postEndpoint = '/endpoint';
    Object.entries(paths).forEach(([path, pathItem]: [string, any]) => {
        if (pathItem.get && getEndpoint === '/endpoint') getEndpoint = path;
        if (pathItem.post && postEndpoint === '/endpoint') postEndpoint = path;
    });

    return `# ${title} - Examples & Tutorials

This guide provides practical examples for using the ${title} API in various programming languages and scenarios.

## Table of Contents

- [cURL Examples](#curl-examples)
- [JavaScript/Node.js](#javascriptnodejs)
- [Python](#python)
- [Java](#java)
- [Common Use Cases](#common-use-cases)

## cURL Examples

${SPEC_START_MARKER}
### Basic GET Request

\`\`\`bash
curl -X GET \\
     -H "Authorization: Bearer YOUR_API_KEY" \\
     -H "Content-Type: application/json" \\
     ${baseUrl}${getEndpoint}
\`\`\`

### POST Request with Body

\`\`\`bash
curl -X POST \\
     -H "Authorization: Bearer YOUR_API_KEY" \\
     -H "Content-Type: application/json" \\
     -d '{"key": "value"}' \\
     ${baseUrl}${postEndpoint}
\`\`\`
${SPEC_END_MARKER}

## JavaScript/Node.js

${SPEC_START_MARKER}
### Using Fetch API

\`\`\`javascript
const response = await fetch('${baseUrl}${getEndpoint}', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data);
\`\`\`

### Using Axios

\`\`\`javascript
const axios = require('axios');

const response = await axios.get('${baseUrl}${getEndpoint}', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
});

console.log(response.data);
\`\`\`
${SPEC_END_MARKER}

## Python

${SPEC_START_MARKER}
### Using requests library

\`\`\`python
import requests

headers = {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
}

response = requests.get('${baseUrl}${getEndpoint}', headers=headers)
data = response.json()
print(data)
\`\`\`
${SPEC_END_MARKER}

## Java

${SPEC_START_MARKER}
### Using HttpURLConnection

\`\`\`java
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.BufferedReader;
import java.io.InputStreamReader;

URL url = new URL("${baseUrl}${getEndpoint}");
HttpURLConnection conn = (HttpURLConnection) url.openConnection();
conn.setRequestMethod("GET");
conn.setRequestProperty("Authorization", "Bearer YOUR_API_KEY");
conn.setRequestProperty("Content-Type", "application/json");

BufferedReader in = new BufferedReader(
    new InputStreamReader(conn.getInputStream())
);
String inputLine;
StringBuffer response = new StringBuffer();
while ((inputLine = in.readLine()) != null) {
    response.append(inputLine);
}
in.close();
\`\`\`
${SPEC_END_MARKER}

## Common Use Cases

### Authentication Flow

${SPEC_START_MARKER}
\`\`\`javascript
// Step 1: Authenticate and get token
const authResponse = await fetch('${baseUrl}/auth', {
  method: 'POST',
  body: JSON.stringify({ username, password })
});
const { token } = await authResponse.json();

// Step 2: Use token for subsequent requests
const dataResponse = await fetch('${baseUrl}/data', {
  headers: { 'Authorization': \`Bearer \${token}\` }
});
\`\`\`
${SPEC_END_MARKER}

### Error Handling

\`\`\`javascript
try {
  const response = await fetch('YOUR_API_URL/endpoint');
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  const data = await response.json();
} catch (error) {
  console.error('API Error:', error.message);
}
\`\`\`

## Best Practices

1. **Always handle errors**: Check response status codes and handle errors appropriately
2. **Use environment variables**: Store API keys securely, never commit them to version control
3. **Implement retry logic**: Handle transient failures with exponential backoff
4. **Respect rate limits**: Implement rate limiting on the client side
5. **Cache when appropriate**: Cache responses that don't change frequently
`;
};

const generateArchitectureContent = (openAPI?: OpenAPI, apiTitle?: string, apiVersion?: string): string => {
    const title = apiTitle || 'API';

    return `# ${title} - Architecture Overview

This document describes the architecture, design decisions, and technical implementation details of the ${title} API.

## System Architecture

### High-Level Overview

\`\`\`
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  API Gateway│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  API Server │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Database   │
└─────────────┘
\`\`\`

## Components

### API Gateway

The API Gateway handles:
- Request routing
- Authentication and authorization
- Rate limiting
- Request/response transformation

### API Server

The core API server implements:
- Business logic
- Data validation
- Database interactions
- Response formatting

### Database

The database layer provides:
- Data persistence
- Transaction management
- Query optimization

## Design Principles

1. **RESTful Design**: Follows REST principles for resource-based URLs
2. **Stateless**: Each request contains all necessary information
3. **Scalable**: Designed to handle high traffic loads
4. **Secure**: Implements industry-standard security practices

## Technology Stack

- **API Framework**: [Specify framework]
- **Database**: [Specify database]
- **Authentication**: [Specify auth method]
- **Deployment**: [Specify deployment platform]

## Data Flow

1. Client sends authenticated request
2. API Gateway validates and routes request
3. API Server processes business logic
4. Database operations are performed
5. Response is formatted and returned

## Security

- All communications use HTTPS
- API keys are required for authentication
- Rate limiting prevents abuse
- Input validation prevents injection attacks

## Scalability

The architecture supports:
- Horizontal scaling of API servers
- Database replication for high availability
- Caching layer for improved performance
- Load balancing across multiple instances

## Monitoring & Observability

- Request logging and metrics
- Error tracking and alerting
- Performance monitoring
- Usage analytics
`;
};

const generateIntegrationContent = (openAPI?: OpenAPI, apiTitle?: string, apiVersion?: string): string => {
    const title = apiTitle || 'API';
    const servers = openAPI?.servers || [];
    const baseUrl = servers.length > 0 ? servers[0].url : 'https://api.example.com';

    return `# ${title} - Integration Guide

This guide provides platform-specific instructions for integrating with the ${title} API.

## Table of Contents

- [Postman Collection](#postman-collection)
- [API Client Libraries](#api-client-libraries)
- [Webhook Setup](#webhook-setup)
- [SDK Installation](#sdk-installation)

## Postman Collection

### Import Collection

1. Download the Postman collection from [link]
2. Import into Postman
3. Set environment variables:
   - \`baseUrl\`: ${baseUrl}
   - \`apiKey\`: Your API key

### Using the Collection

1. Select your environment
2. Set your API key in the collection variables
3. Start making requests!

## API Client Libraries

### Official SDKs

We provide official SDKs for popular languages:

- **JavaScript/TypeScript**: \`npm install @yourcompany/api-sdk\`
- **Python**: \`pip install yourcompany-api\`
- **Java**: Add Maven dependency
- **Go**: \`go get github.com/yourcompany/api-sdk\`

### Using the JavaScript SDK

\`\`\`javascript
import { APIClient } from '@yourcompany/api-sdk';

const client = new APIClient({
  apiKey: 'YOUR_API_KEY',
  baseUrl: '${baseUrl}'
});

// Make a request
const data = await client.get('/endpoint');
\`\`\`

## Webhook Setup

### Configuring Webhooks

1. Navigate to your account settings
2. Go to Webhooks section
3. Add a new webhook URL
4. Select events to subscribe to
5. Save configuration

### Webhook Payload

\`\`\`json
{
  "event": "event.type",
  "timestamp": "2025-01-01T00:00:00Z",
  "data": {
    // Event-specific data
  }
}
\`\`\`

### Verifying Webhooks

Always verify webhook signatures to ensure authenticity:

\`\`\`javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return hash === signature;
}
\`\`\`

## SDK Installation

### Node.js

\`\`\`bash
npm install @yourcompany/api-sdk
\`\`\`

### Python

\`\`\`bash
pip install yourcompany-api
\`\`\`

### Java

Add to your \`pom.xml\`:

\`\`\`xml
<dependency>
  <groupId>com.yourcompany</groupId>
  <artifactId>api-sdk</artifactId>
  <version>1.0.0</version>
</dependency>
\`\`\`

## Testing

### Sandbox Environment

Use the sandbox environment for testing:

- **Sandbox URL**: https://sandbox.api.example.com
- **Test API Key**: Available in your developer dashboard

### Integration Checklist

- [ ] Obtain API credentials
- [ ] Set up development environment
- [ ] Install SDK or configure HTTP client
- [ ] Test authentication
- [ ] Test core endpoints
- [ ] Handle errors appropriately
- [ ] Implement retry logic
- [ ] Set up monitoring

## Support

For integration support:
- Email: integrations@example.com
- Documentation: https://docs.example.com
- Community: https://community.example.com
`;
};

const generateChangelogContent = (openAPI?: OpenAPI, apiTitle?: string, apiVersion?: string): string => {
    const title = apiTitle || 'API';
    const version = apiVersion || '1.0.0';

    return `# ${title} - Changelog

All notable changes to the ${title} API will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [${version}] - ${new Date().toISOString().split('T')[0]}

### Added
- Initial API release
- Authentication endpoints
- Core resource endpoints

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A

---

## Version History

### ${version} (Current)
- Initial release

---

## Migration Guides

### Upgrading to ${version}

No migration required for initial version.

---

## Deprecation Notices

None at this time.

---

## Breaking Changes

None at this time.
`;
};

const generateBlankContent = (): string => {
    return `# New Document

Start writing your documentation here...

`;
};


export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
    {
        id: 'getting-started',
        name: 'Getting Started Guide',
        description: 'A comprehensive guide to help users get started with your API',
        icon: 'rocket',
        format: 'markdown',
        generateContent: generateGettingStartedContent,
        defaultFileName: (apiTitle?: string) => {
            const slug = apiTitle ? apiTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'api';
            return `${slug}-getting-started`;
        }
    },
    {
        id: 'api-reference',
        name: 'API Reference',
        description: 'Detailed documentation of all API endpoints',
        icon: 'book',
        format: 'markdown',
        generateContent: generateAPIReferenceContent,
        defaultFileName: (apiTitle?: string) => {
            const slug = apiTitle ? apiTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'api';
            return `${slug}-api-reference`;
        }
    },
    {
        id: 'examples',
        name: 'Examples & Tutorials',
        description: 'Code examples and tutorials in multiple languages',
        icon: 'code',
        format: 'markdown',
        generateContent: generateExamplesContent,
        defaultFileName: (apiTitle?: string) => {
            const slug = apiTitle ? apiTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'api';
            return `${slug}-examples`;
        }
    },
    {
        id: 'architecture',
        name: 'Architecture Overview',
        description: 'System architecture and design documentation',
        icon: 'circuit-board',
        format: 'markdown',
        generateContent: generateArchitectureContent,
        defaultFileName: (apiTitle?: string) => {
            const slug = apiTitle ? apiTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'api';
            return `${slug}-architecture`;
        }
    },
    {
        id: 'integration',
        name: 'Integration Guide',
        description: 'Platform-specific integration instructions',
        icon: 'plug',
        format: 'markdown',
        generateContent: generateIntegrationContent,
        defaultFileName: (apiTitle?: string) => {
            const slug = apiTitle ? apiTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'api';
            return `${slug}-integration`;
        }
    },
    {
        id: 'changelog',
        name: 'Changelog',
        description: 'Version history and change documentation',
        icon: 'history',
        format: 'markdown',
        generateContent: generateChangelogContent,
        defaultFileName: () => 'changelog'
    },
    {
        id: 'blank',
        name: 'Blank Document',
        description: 'Start with an empty document',
        icon: 'file',
        format: 'markdown',
        generateContent: generateBlankContent,
        defaultFileName: () => 'document'
    }
];

export const getTemplateById = (id: DocumentTemplateType): DocumentTemplate | undefined => {
    return DOCUMENT_TEMPLATES.find(t => t.id === id);
};

