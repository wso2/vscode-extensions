/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import { getServerOptions, installJars } from "../server/server";
import { LanguageClientOptions, RevealOutputChannelOn, Trace } from "vscode-languageclient/node";
import { ExtendedLanguageClient } from "./ExtendedLanguageClient";
import { getServerPathFromConfig } from "../utils/onboardingUtils";
import { INVALID_SERVER_PATH_MSG, LANGUAGE_CLIENT_ID, LANGUAGE_CLIENT_NAME } from "../constants";
import { outputChannel } from "../utils/logger";

export class SIExtension {
    private clientOptions: LanguageClientOptions;
    public langClient?: ExtendedLanguageClient;

    constructor() {
        this.clientOptions = {
            documentSelector: [{ scheme: "file", language: "siddhi" }],
            outputChannel: outputChannel,
            revealOutputChannelOn: RevealOutputChannelOn.Never,
            traceOutputChannel: outputChannel,
        };
    }

    async init(): Promise<void> {
        try {
            let siHome = getServerPathFromConfig();
            if (siHome == null) {
                return Promise.reject(INVALID_SERVER_PATH_MSG);
            }
  
            installJars(siHome)
            this.langClient = new ExtendedLanguageClient(
                LANGUAGE_CLIENT_ID,
                LANGUAGE_CLIENT_NAME,
                getServerOptions(siHome),
                this.clientOptions
            );
            this.langClient.setTrace(Trace.Verbose);
            this.langClient.start();
        } catch (exception) {
            const errorMessage = exception instanceof Error ? exception.message : String(exception);
            return Promise.reject(errorMessage);
        }
    }
}

export const siExtensionInstance = new SIExtension();
