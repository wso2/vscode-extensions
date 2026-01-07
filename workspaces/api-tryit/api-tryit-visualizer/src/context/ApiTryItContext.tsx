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

import React, { ReactNode, createContext, useContext, useMemo } from "react";
import { ApiTryItRpcClient } from "@wso2/api-tryit-rpc-client";

export interface ApiTryItContext {
    rpcClient: ApiTryItRpcClient | null;
}

const Context = createContext<ApiTryItContext | undefined>(undefined);

export function ApiTryItContextProvider({ children }: { children: ReactNode }) {
    // Since we can't directly import Messenger in the visualizer,
    // we create a placeholder that will be properly initialized
    // when the visualizer is loaded in the VS Code webview context
    const contextValue: ApiTryItContext = useMemo(() => ({
        rpcClient: null, // Will be null for now, proper implementation needs Messenger from vscode-messenger-webview
    }), []);

    return (
        <Context.Provider value={contextValue}>
            {children}
        </Context.Provider>
    );
}

export function useApiTryItContext(): ApiTryItContext {
    const context = useContext(Context);
    if (!context) {
        throw new Error("useApiTryItContext must be used within ApiTryItContextProvider");
    }
    return context;
}
