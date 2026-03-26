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

export const DMC_TO_TS_SYSTEM_TEMPLATE = `
**Task Overview**:

Transform the provided DMC (Data Mapping Configuration) file into a complete TypeScript file with interfaces and a \`mapFunction\`. You must return the ENTIRE TypeScript file including all input and output schema interfaces exactly as provided, plus a properly implemented \`mapFunction\` that implements ONLY the mappings found in the DMC file.

---

**Critical Requirements**:

1. **Return Complete TypeScript File**:
   - Include ALL input and output interface definitions exactly as provided in the \`ts_file\`
   - Do NOT modify, add, or remove any fields from the input schema interface
   - For the output schema interface, make fields optional (using \`?\`) only for fields that are NOT mapped in the DMC file
   - Include the complete \`mapFunction\` implementation

2. **Strict DMC Mapping Rules**:
   - **ONLY** implement mappings that are explicitly defined in the DMC file
   - Do NOT infer, assume, or add any mappings not present in the DMC file
   - Do NOT add default values for unmapped fields - simply omit them from the return object
   - If a field is not mapped in the DMC file, do NOT include it in the mapFunction return object

3. **Schema Preservation**:
   - **Input Schema**: Keep exactly as provided, no modifications allowed
   - **Output Schema**: Make fields optional (\`fieldName?: type\`) for fields that are NOT mapped in the DMC file
   - Preserve all field names, types, nested structures, comments, and annotations exactly

4. **Mapping Implementation**:
   - Extract field mappings from the DMC file (e.g., \`outputField = inputField\`)
   - Implement these mappings in the TypeScript \`mapFunction\`
   - Use direct field assignments as specified in the DMC file
   - Preserve any field name swapping or cross-assignments from the DMC file

5. **Code Quality**:
   - Use explicit \`return\` statements within arrow functions, enclosed in braces \`{}\`
   - Handle field annotations and quotation marks correctly
   - Follow TypeScript best practices

---

**Example**:

*Given the following DMC file*:

\`\`\`javascript
function mapFunction(input) {
    return {
        coord: {
            lat: input.coord.lon,
            lon: input.coord.lat
        },
        main: {
            temp_max: input.main.temp_min,
            temp_min: input.main.temp_max,
            grnd_level: input.main.sea_level,
            sea_level: input.main.grnd_level
        },
        sys: {
            sunset: input.sys.sunrise,
            sunrise: input.sys.sunset
        },
        id: input.id,
        name: input.name
    };
}
\`\`\`

*And the TypeScript file (\`ts_file\`) containing*:

\`\`\`typescript
interface Root {
    coord: {
        lon: number
        lat: number
    }
    weather: {
        id: number
        main: string
    }[]
    main: {
        temp: number
        temp_min: number
        temp_max: number
        sea_level: number
        grnd_level: number
    }
    sys: {
        sunrise: number
        sunset: number
    }
    id: number
    name: string
}

interface OutputRoot {
    coord: {
        lon: number
        lat: number
    }
    weather: {
        id: number
        main: string
    }[]
    main: {
        temp: number
        temp_min: number
        temp_max: number
        sea_level: number
        grnd_level: number
    }
    sys: {
        sunrise: number
        sunset: number
    }
    id: number
    name: string
}

export function mapFunction(input: Root): OutputRoot {
    return {}
}
\`\`\`

*Your complete TypeScript output should be*:

\`\`\`typescript
interface Root {
    coord: {
        lon: number
        lat: number
    }
    weather: {
        id: number
        main: string
    }[]
    main: {
        temp: number
        temp_min: number
        temp_max: number
        sea_level: number
        grnd_level: number
    }
    sys: {
        sunrise: number
        sunset: number
    }
    id: number
    name: string
}

interface OutputRoot {
    coord: {
        lon: number
        lat: number
    }
    weather?: {
        id: number
        main: string
    }[]
    main: {
        temp?: number
        temp_min: number
        temp_max: number
        sea_level: number
        grnd_level: number
    }
    sys: {
        sunrise: number
        sunset: number
    }
    id: number
    name: string
}

export function mapFunction(input: Root): OutputRoot {
    return {
        coord: {
            lat: input.coord.lon,
            lon: input.coord.lat
        },
        main: {
            temp_min: input.main.temp_max,
            temp_max: input.main.temp_min,
            sea_level: input.main.grnd_level,
            grnd_level: input.main.sea_level
        },
        sys: {
            sunrise: input.sys.sunset,
            sunset: input.sys.sunrise
        },
        id: input.id,
        name: input.name
    };
}
\`\`\`

---

**Your task** is to apply these guidelines to the provided DMC and TypeScript files. Return the complete TypeScript file with all interfaces and the properly implemented \`mapFunction\` that contains ONLY the mappings found in the DMC file.
`;
