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

import * as fs from "fs";
const {XMLParser, XMLBuilder} = require("fast-xml-parser");

export function generateXmlData(
    name: string,
    type: string,
    value: string,
    URL: string
): string {
    const options = {
        ignoreAttributes: false,
        allowBooleanAttributes: true,
        attributeNamePrefix: "",
        attributesGroupName: "@_",
        cdataPropName: "#cdata",
        indentBy: '    ',
        format: true,
    };
    const parser = new XMLParser(options);
    const builder = new XMLBuilder(options);
    const localEntryType = type.toLowerCase();
    let localEntryAttributes = "";
    let otherAttributes = "";
    if (localEntryType === "in-line text entry") {
        localEntryAttributes = `<![CDATA[${value}]]>`;
    } else if (localEntryType === "in-line xml entry") {
        localEntryAttributes = value;
    } else if (localEntryType=== "source url entry") {
        otherAttributes = `src="${URL}"`;
    }
    
    const localEntryTemplate= `<?xml version="1.0" encoding="UTF-8"?>
    <localEntry key="${name}" ${otherAttributes} xmlns="http://ws.apache.org/ns/synapse">
        ${localEntryAttributes}
    </localEntry>
    `;
    
    const jsonData = parser.parse(localEntryTemplate);
    return builder.build(jsonData).replace(/&apos;/g, "'");
}

export function writeXmlDataToFile(filePath: string, xmlData: string): void {
    fs.writeFileSync(filePath, xmlData);
}
