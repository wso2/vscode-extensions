/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * WSO2 MI Data Mapper Reference
 * Shared reference for the .ts mapping file format, dmUtils helper API, and
 * TypeScript pitfalls (TS2556 dynamic-array spread).
 *
 * Loaded by:
 * - The data mapper sub-agent (via DATA_MAPPER_SYSTEM_TEMPLATE) for generation
 * - The main agent on demand via load_context_reference("data-mapper-reference")
 *   when editing existing .ts mapping files without going through the
 *   generate_data_mapping tool.
 *
 * Section-based exports for granular context loading.
 * Usage: DATA_MAPPER_REFERENCE_SECTIONS["dynamic_arrays"] for the TS2556 spread rule.
 *        DATA_MAPPER_REFERENCE_FULL for the entire reference.
 */

export const DATA_MAPPER_REFERENCE_SECTIONS: Record<string, string> = {

overview: `## Data Mapper Overview

Data mappers transform data between input and output schemas using TypeScript. They pair with the \`<datamapper>\` mediator in Synapse integrations.

**Runtime requirement:** \`<datamapper>\` and data mapper artifacts require MI runtime \`4.4.0\` or newer. On older runtimes, fall back to PayloadFactory / Enrich / XSLT.

**Folder Structure:**
Each data mapper lives at \`src/main/wso2mi/resources/datamapper/{name}/\` containing:
- \`{name}.ts\` — TypeScript mapping file with input/output interfaces and \`mapFunction\`
- \`dm-utils.ts\` — Helper functions (arithmetic, string, type conversion); imported as \`dmUtils\`

**TypeScript Mapping File Skeleton:**
\`\`\`typescript
import * as dmUtils from "./dm-utils";
declare var DM_PROPERTIES: any;

/**
 * inputType:JSON
 * title:"InputSchemaName"
 */
interface InputRoot {
    // Input schema fields
}

/**
 * outputType:JSON
 * title:"OutputSchemaName"
 */
interface OutputRoot {
    // Output schema fields
}

export function mapFunction(input: InputRoot): OutputRoot {
    return {
        // Field mappings: outputField: input.inputField
    };
}
\`\`\`

**Using Data Mapper in Synapse XML:**
\`\`\`xml
<datamapper
    config="resources:/datamapper/{name}/{name}.dmc"
    inputSchema="resources:/datamapper/{name}/{name}_inputSchema.json"
    inputType="JSON"
    outputSchema="resources:/datamapper/{name}/{name}_outputSchema.json"
    outputType="JSON"/>
\`\`\``,

typescript_rules: `## Critical TypeScript Rules

- **Use explicit returns in arrow functions:**
  \`\`\`typescript
  // ✅ Correct
  input.items.map(item => { return { id: item.id, qty: item.qty }; })
  // ❌ Wrong — concise object-literal arrow without braces breaks the data mapper compiler
  input.items.map(item => ({ id: item.id, qty: item.qty }))
  \`\`\`
- **Preserve exact field names from schemas.** For fields containing spaces, hyphens, or other special characters, enclose them in quotes:
  \`\`\`typescript
  return { "first-name": input.firstName, "Order Total": input.total };
  \`\`\`
- **Don't re-import dmUtils.** The file already imports it: \`import * as dmUtils from "./dm-utils";\` — leave that line untouched.
- **Don't redeclare \`DM_PROPERTIES\`.** It's declared once at the top of the file and is available globally inside \`mapFunction\` for accessing \`<property>\` mediator values via \`dmUtils.getPropertyValue\`.`,

dmutils_functions: `## dmUtils Helper Functions

The \`dmUtils\` module exposes the following helpers. **Use these instead of raw JavaScript operators when appropriate** for clarity and consistency.

**Arithmetic Operations:**
- \`dmUtils.sum(num1, ...nums)\` — Sum a fixed list of numbers (requires at least one positional argument)
  Example: \`dmUtils.sum(item.price, item.tax, item.shipping)\`
- \`dmUtils.average(num1, ...nums)\` — Average a fixed list of numbers (requires at least one positional argument)
  Example: \`dmUtils.average(input.score1, input.score2, input.score3)\`
- \`dmUtils.max(num1, ...nums)\` — Find maximum value
- \`dmUtils.min(num1, ...nums)\` — Find minimum value
- \`dmUtils.ceiling(num)\` — Round up to nearest integer
- \`dmUtils.floor(num)\` — Round down to nearest integer
- \`dmUtils.round(num)\` — Round to nearest integer

**Type Conversions:**
- \`dmUtils.toNumber(str)\` — Convert string to number
  Example: \`dmUtils.toNumber(input.quantity)\`
- \`dmUtils.toBoolean(str)\` — Convert string to boolean ("true" → true)
- \`dmUtils.numberToString(num)\` — Convert number to string
- \`dmUtils.booleanToString(bool)\` — Convert boolean to string

**String Operations:**
- \`dmUtils.concat(str1, ...strs)\` — Concatenate multiple strings
  Example: \`dmUtils.concat(input.firstName, " ", input.lastName)\`
- \`dmUtils.split(str, separator)\` — Split string into array
  Example: \`dmUtils.split(input.fullName, " ")\`
- \`dmUtils.toUppercase(str)\` — Convert to uppercase
- \`dmUtils.toLowercase(str)\` — Convert to lowercase
- \`dmUtils.stringLength(str)\` — Get string length
- \`dmUtils.startsWith(str, prefix)\` — Check if string starts with prefix
- \`dmUtils.endsWith(str, suffix)\` — Check if string ends with suffix
- \`dmUtils.substring(str, start, end)\` — Extract substring
- \`dmUtils.trim(str)\` — Remove leading/trailing whitespace
- \`dmUtils.replaceFirst(str, target, replacement)\` — Replace first occurrence
- \`dmUtils.match(str, regex)\` — Test if string matches regex pattern

**Property Access:**
- \`dmUtils.getPropertyValue(scope, name)\` — Read a Synapse property by scope/name (e.g. \`dmUtils.getPropertyValue("default", "user.id")\`)`,

dynamic_arrays: `## Aggregating Dynamic Arrays (CRITICAL — TS2556)

\`dmUtils.sum\`/\`average\`/\`max\`/\`min\` are typed as \`(num1: number, ...rest: number[])\` and require at least one positional argument. **Spreading a dynamically-sized array into them fails TypeScript compilation** with:

\`\`\`
error TS2556: A spread argument must either have a tuple type or be passed to a rest parameter.
\`\`\`

This is the canonical mistake — keep it out of generated mappings.

- ❌ **Do NOT** spread arrays of unknown length:
  \`\`\`typescript
  const totalAmount = dmUtils.sum(...lineItems.map(i => i.lineTotal)); // TS2556
  \`\`\`
- ❌ **Do NOT** spread \`.map()\` / \`.filter()\` results into dmUtils aggregation functions.
- ✅ **For totalling/averaging across an array, use \`reduce\`:**
  \`\`\`typescript
  // Sum
  const totalAmount = input.lineItems.reduce((acc, item) => acc + item.lineTotal, 0);

  // Average (guard the empty-array case)
  const avgScore = input.scores.length === 0
      ? 0
      : input.scores.reduce((acc, n) => acc + n, 0) / input.scores.length;

  // Max / min
  const maxPrice = input.items.reduce((acc, item) => Math.max(acc, item.price), -Infinity);
  const minPrice = input.items.reduce((acc, item) => Math.min(acc, item.price), Infinity);
  \`\`\`
- ✅ **Use \`dmUtils.sum\`/\`average\` only when summing a known, fixed set of fields**, e.g. \`dmUtils.sum(input.subtotal, input.tax, input.shipping)\`.

**Workaround (if dmUtils.sum must be used over an array):**
\`\`\`typescript
const totals = lineItems.map(item => item.lineTotal);
const totalAmount = totals.length === 0 ? 0 : dmUtils.sum(totals[0], ...totals.slice(1));
\`\`\`
This satisfies the rest-parameter requirement but is harder to read than \`reduce\` — prefer \`reduce\`.`,

when_to_use_dmutils: `## When to Use dmUtils vs Raw Operators

| Operation | Use dmUtils when… | Use raw operators when… |
|-----------|-------------------|-------------------------|
| String concat | Joining 2+ strings | (always prefer \`dmUtils.concat\`) |
| Sum / average | A **fixed** set of fields (\`subtotal + tax + shipping\`) | Aggregating a **dynamic array** — use \`reduce\` |
| Max / min | A fixed set of fields | A dynamic array — use \`reduce\` with \`Math.max\`/\`Math.min\` |
| Type conversion | Always (\`toNumber\`, \`toBoolean\`, \`numberToString\`, \`booleanToString\`) | (n/a) |
| String transforms | Always (\`toUppercase\`, \`trim\`, \`substring\`, etc.) | (n/a) |

**Rule of thumb:** Prefer dmUtils for clarity and consistency, but fall back to native \`reduce\` / \`map\` / \`filter\` when the input is a dynamically-sized array. Never spread an array into \`dmUtils.sum/average/max/min\`.`,

array_handling: `## Array Handling Patterns

**Input array → output single object:** Pick a representative element.
\`\`\`typescript
// First element
primaryItem: input.items[0]
// Conditional pick
primaryAddress: input.addresses.find(addr => addr.type === "billing")
\`\`\`

**Input array → output array:** Use \`.map()\` with explicit returns.
\`\`\`typescript
items: input.orders.map(order => {
    return {
        id: order.orderId,
        total: dmUtils.sum(order.subtotal, order.tax),
        itemCount: order.items.length
    };
})
\`\`\`

**Input single object → output array (wrap):**
\`\`\`typescript
items: [{ id: input.id, name: input.name }]
\`\`\`

**Input array → output count / aggregate:**
\`\`\`typescript
itemCount: input.lineItems.length,
totalAmount: input.lineItems.reduce((acc, item) => acc + item.lineTotal, 0)
\`\`\`

**Filter then map:**
\`\`\`typescript
activeUsers: input.users
    .filter(u => u.status === "active")
    .map(u => {
        return { id: u.id, name: u.name };
    })
\`\`\``,

tool_usage: `## Generating and Editing Mappings — Tool Guidance

The agent has dedicated tools for data mapper work. Prefer them over hand-writing mapping files unless the user has explicitly asked you to edit an existing one.

- **\`create_data_mapper\`** — Use this to create a new data mapper. It scaffolds the folder, the \`.ts\` file with empty interfaces, and the \`dm-utils.ts\` helper module. Do NOT create these files manually with \`file_write\`.
- **\`generate_data_mapping\`** — Use this to fill in the \`mapFunction\` body for a new or partially-mapped \`.ts\` file. It runs a specialized Haiku sub-agent that already understands the dmUtils API and the TS2556 dynamic-array pitfall. Prefer this over \`file_edit\` for non-trivial mapping work.

**When to edit the \`.ts\` file directly with \`file_edit\` instead of calling \`generate_data_mapping\`:**
- Targeted single-field tweaks (rename, change a default value, fix one mapping).
- Adding a calculated field where the formula is dictated by the user verbatim.
- Fixing a TS2556 spread error reported by the user (replace \`dmUtils.sum(...arr)\` with \`arr.reduce(...)\`).

For broader mapping changes (mapping new schema fields, restructuring nested mappings, large-scale rewrites), call \`generate_data_mapping\` — it's faster and avoids the dmUtils pitfalls catalogued above.`,

};

// Build full reference by joining all sections
export const DATA_MAPPER_REFERENCE_FULL = `# WSO2 MI Data Mapper Reference

${Object.values(DATA_MAPPER_REFERENCE_SECTIONS).join('\n\n')}`;
