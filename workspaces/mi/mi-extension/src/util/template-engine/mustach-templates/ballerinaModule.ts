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

import { render } from "mustache";

export interface GetBallerinaTemplatesArgs {
    name: string;
    version: string;
}

export function getBalModuleMustacheTemplate() {
    return `import wso2/mi;

@mi:Operation
public function calculateTotal(xml invoice) returns xml {
    xml<xml:Element> prices = invoice/**/<price>;
    int total = from xml:Element element in prices
        let int|error price = int:fromString(element.data())
        where price is int
        collect sum(price);
    return xml \`<total>\${total}</total>\`;
}`;
}

export function getBalConfigMustacheTemplate() {
    return `[package]
org = "miSdk"
name = "{{name}}"
version = "{{version}}"
distribution = "2201.11.0"
`;
}

export function getBallerinaModuleContent() {
    return render(getBalModuleMustacheTemplate(), {});
}

export function getBallerinaConfigContent(data: GetBallerinaTemplatesArgs) {
    return render(getBalConfigMustacheTemplate(), { name: data.name, version: data.version });
}
