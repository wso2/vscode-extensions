/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { VisualizerContextProvider } from "./Context";
import { Visualizer } from "./Visualizer";

const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: 1000,
        cacheTime: 1000,
      },
    },
  });

export function renderWebview(target: HTMLElement, mode: string) {
    const root = createRoot(target);
    root.render(
        <VisualizerContextProvider>
            <QueryClientProvider client={queryClient}>
                <Visualizer mode={mode} />
            </QueryClientProvider>
        </VisualizerContextProvider>
    );
}
