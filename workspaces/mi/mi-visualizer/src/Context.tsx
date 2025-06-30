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

import React, { ReactNode, useState } from "react";
import { Context, VisualizerContext } from "@wso2/mi-rpc-client";
import { RpcClient } from "@wso2/mi-rpc-client/lib/RpcClient";
import { MACHINE_VIEW, VisualizerLocation } from "@wso2/mi-core";


export function VisualizerContextProvider({ children }: { children: ReactNode }) {

  const setView = (view: VisualizerLocation) => {
    setVisualizerState((prevState: VisualizerContext) => ({
      ...prevState,
      viewLocation: view,
    }));
  };

  const setLogin = (isLoggedIn: boolean) => {
    setVisualizerState((prevState: VisualizerContext) => ({
      ...prevState,
      isLoggedIn: isLoggedIn,
    }));
  }

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
    setIsLoggedIn: setLogin,
    isLoading: true,
    setIsLoading: setIsLoading,
  });

  return (
    <Context.Provider value={visualizerState}>
      {children}
    </Context.Provider>
  );
}
