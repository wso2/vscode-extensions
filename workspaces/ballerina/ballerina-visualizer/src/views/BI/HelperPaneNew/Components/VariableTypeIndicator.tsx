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

import styled from "@emotion/styled";
import { VSCodeTag } from "@vscode/webview-ui-toolkit/react";
import { ThemeColors } from "@wso2/ui-toolkit";

export const VariableTypeIndicator = styled(VSCodeTag)`
    ::part(control) {
        text-transform: none;
        font-size: 10px;
        height: 11px;
        max-width: 60px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        padding: 0px 2px 5px 2px;
    }

    &:hover::part(control) {
        background-color: ${ThemeColors.PRIMARY};
        cursor: pointer;
    }
`;
