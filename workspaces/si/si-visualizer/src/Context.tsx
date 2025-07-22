/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import React, { ReactNode, useState } from "react";
import { Context, VisualizerContext } from "@wso2/si-rpc-client";
import { RpcClient } from "@wso2/si-rpc-client/lib/RpcClient";
import { MACHINE_VIEW, VisualizerLocation } from "@wso2/si-core";


export function VisualizerContextProvider({ children }: { children: ReactNode }) {

  const setView = (view: VisualizerLocation) => {
    setVisualizerState((prevState: VisualizerContext) => ({
      ...prevState,
      viewLocation: view,
    }));
  };

  const setIsLoading = (isLoading: boolean) => {
    setVisualizerState((prevState: VisualizerContext) => ({
      ...prevState,
      isLoading
    }));
  }

  const [visualizerState, setVisualizerState] = useState<VisualizerContext>({
    viewLocation: { view: MACHINE_VIEW.Overview },
    setViewLocation: setView,
    rpcClient: new RpcClient(), // Create the root RPC layer client object
    isLoggedIn: false,
    isLoading: true,
    setIsLoading: setIsLoading,
  });

  return (
    <Context.Provider value={visualizerState}>
      {children}
    </Context.Provider>
  );
}
