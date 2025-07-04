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

// In React, error boundaries do not catch errors inside event handlers.
// React's error boundaries are designed to catch errors in the rendering phase,
// in lifecycle methods, and in constructors of the whole tree below them. 
import React, { ReactNode, forwardRef } from "react";
import { ErrorScreen } from "./Error/Error";

export interface ErrorBoundaryProps {
    errorMsg?: string;
    children?: ReactNode;
    issueUrl?: string;
    goHome?: () => void;
}

import { ErrorBoundary as EB } from "react-error-boundary";

export const ErrorBoundary = forwardRef<any, ErrorBoundaryProps>((props, ref) => {
    const Fallback = () => <ErrorScreen errorMsg={props.errorMsg} issueUrl={props.issueUrl} goHome={props.goHome} />;
    return (
        <EB FallbackComponent={Fallback} ref={ref}>
            {props.children}
        </EB>
    );
});

ErrorBoundary.displayName = "ErrorBoundary";

