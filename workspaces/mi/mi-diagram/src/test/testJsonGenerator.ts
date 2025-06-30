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
import path from 'path';
import fs from 'fs';
import { LanguageClient } from './lang-service/client';
import { APIResource } from '@wso2/mi-syntax-tree/lib/src';

export async function generateJsonFromXml() {
    const langClient = new LanguageClient();
    await langClient.start();

    const dataRoot = path.join(__dirname, 'data', 'input-xml');
    const files = fs.readdirSync(dataRoot).filter(file => file.endsWith('.xml'));
    const result = [];

    for (const file of files) {
        const uri = path.join(dataRoot, file);
        const syntaxTree = await langClient.getSyntaxTree({
            documentIdentifier: { uri }
        });

        if (syntaxTree.syntaxTree.api.resource && syntaxTree.syntaxTree.api.resource.length > 0) {
            const resources = syntaxTree.syntaxTree.api.resource;
            const resourcePaths = resources.map((resource: APIResource) => ({
                path: resource.uriTemplate || resource.urlMapping,
                methods: resource.methods
            }));
            result.push({ file, resources: resourcePaths });
        }
    }

    langClient.stop();
    fs.writeFileSync(path.join(__dirname, 'data', 'files.json'), JSON.stringify(result, null, 2));
}
