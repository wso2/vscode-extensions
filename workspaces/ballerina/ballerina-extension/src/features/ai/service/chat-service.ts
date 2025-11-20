// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { ExtensionContext } from 'vscode';
import { v4 as uuidv4 } from 'uuid';

const REQUEST_ID_KEY = 'ballerina.ai.requestId';

export class ChatService {
    private context: ExtensionContext;

    constructor(context: ExtensionContext) {
        this.context = context;
    }

    public async createrequestId(): Promise<string> {
        const requestId = uuidv4();
        await this.context.globalState.update(REQUEST_ID_KEY, requestId);
        console.log(`Created new chat ID: ${requestId}`);
        return requestId;
    }

    public async getrequestId(): Promise<string> {
        return this.context.globalState.get<string>(REQUEST_ID_KEY);
    }

    public async clearrequestId(): Promise<void> {
        await this.context.globalState.update(REQUEST_ID_KEY, undefined);
        console.log('Cleared chat ID');
    }
}
