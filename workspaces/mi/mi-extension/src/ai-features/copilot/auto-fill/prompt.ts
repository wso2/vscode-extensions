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

export const PROMPT = `
{{#if payloads}}
### Pre-defined Payloads
These are pre-defined user payloads in JSON format for this project.
Use these payloads to populate form fields using the 'insertText' values.

#### How to use payloads:
1. Access payload values using Synapse expressions with the \${} syntax
2. Use the exact 'insert_text' path provided in the payload structure
3. For nested objects, use dot notation to access child properties

#### Example:
For a payload structure like:
\`\`\`json
[
  {"children": [], "label": "name", "insert_text": "payload.name"},
  {"children": [], "label": "email", "insertT_text": "payload.email"},
  {"children": [
    {"children": [], "label": "street", "insert_text": "payload.address.street"},
    {"children": [], "label": "city", "insert_text": "payload.address.city"}
  ], "label": "address", "insert_text": "payload.address"}
]
\`\`\`

Access values as:
- Name: \${payload.name}
- Email: \${payload.email}
- Street Address: \${payload.address.street}
- City: \${payload.address.city}

<PRE_DEFINED_PAYLOADS>
{{#each payloads}}
{{{this}}}
{{/each}}
</PRE_DEFINED_PAYLOADS>
{{/if}}

{{#if variables}}
### Pre-defined Variables
These are pre-defined user variables for this project.
Use these variables to populate form fields using the 'insert_text' values.

#### How to use variables:
1. Access variable values using Synapse expressions with the \${} syntax
2. Use the exact 'insert_text' path provided in the variable structure

<PRE_DEFINED_VARIABLES>
{{#each variables}}
{{{this}}}
{{/each}}
</PRE_DEFINED_VARIABLES>
{{/if}}

{{#if params}}
### Pre-defined Parameters
These are pre-defined user parameters for this project.
Use these parameters to populate form fields using the 'insert_text' values.

#### How to use parameters:
1. Access parameter values using Synapse expressions with the \${} syntax
2. Use the exact 'insert_text' path provided in the parameter structure

<PRE_DEFINED_PARAMS>
{{#each params}}
{{{this}}}
{{/each}}
</PRE_DEFINED_PARAMS>
{{/if}}

{{#if properties}}
### Pre-defined Properties
These are pre-defined user properties for this project.
Use these properties to populate form fields using the 'insert_text' values.

#### How to use properties:
1. Access property values using Synapse expressions with the \${} syntax
2. Use the exact 'insert_text' path provided in the property structure

<PRE_DEFINED_PROPERTIES>
{{#each properties}}
{{{this}}}
{{/each}}
</PRE_DEFINED_PROPERTIES>
{{/if}}

{{#if headers}}
### Pre-defined Headers
These are pre-defined user headers for this project.
Use these headers to populate form fields using the 'insert_text' values.
#### How to use headers:
1. Access header values using Synapse expressions with the \${} syntax
2. Use the exact 'insert_text' path provided in the header structure
<PRE_DEFINED_HEADERS>
{{#each headers}}
{{{this}}}
{{/each}}
</PRE_DEFINED_HEADERS>
{{/if}}

{{#if configs}}
### Pre-defined Configurations
These are pre-defined user configurations for this project.
Use these configurations to populate form fields using the 'insert_text' values.
#### How to use configurations:
1. Access configuration values using Synapse expressions with the \${} syntax
2. Use the exact 'insert_text' path provided in the configuration structure
<PRE_DEFINED_CONFIGURATIONS>
{{#each configs}}
{{{this}}}
{{/each}}
</PRE_DEFINED_CONFIGURATIONS>
{{/if}}


{{#if connection_names}}
### Pre-defined Connections
These are pre-defined user connections for this project.
Use these connections specifically when populating 'config_key' fields.

#### How to use connections:
Always select from the provided connection names

<PRE_DEFINED_CONNECTIONS>
{{#each connection_names}}
{{{this}}}
{{/each}}
</PRE_DEFINED_CONNECTIONS>
{{/if}}

{{#if form_details}}
### Form Details
This is the current form structure and its requirements.
Use these details to understand the context and required fields.

<FORM_DETAILS>
{{{form_details}}}
</FORM_DETAILS>
{{/if}}

{{#if current_values}}
### Current Values 
These are the current values of the form fields.
{{{current_values}}}
{{/if}}

### User Query Processing

{{#if question}}
Now you are operating in User Prompt Mode. You will receive a user query that may contain specific instructions or values.
When processing the user query:
1. Analyze it thoroughly to extract specific instructions and values
2. Analyze user query thoroughly and in great detail.
3. Prioritize user query information over default predictions
4. Use user query context to inform your field completions

This is the user query. Use it to fill the form fields with the most relevant values using the given information.
<USER_QUERY>
{{{question}}}
</USER_QUERY>
Start creating your response now.
{{else}}
Now you are operating in User Prompt Mode. You will not receive a user query.
Now populate the form fields with the highest-confidence values based on the given information.
{{/if}}
`;
