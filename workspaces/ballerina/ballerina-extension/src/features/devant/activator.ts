/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import { BallerinaExtension } from "src/core";
import { commands } from "vscode";


export function activate(ballerinaExtInstance: BallerinaExtension) {
    const connectionToken = process.env.CONNECTION_TOKEN;
    if (connectionToken) {
        // Set the connection token context
        commands.executeCommand('setContext', 'devant.editor', connectionToken);
    }
}