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
import { css } from "@emotion/css";

export const useStyles = () => ({
    warningContainer: css({
        marginTop: 20,
        marginLeft: 16,
        marginRight: 16,
        backgroundColor: 'var(--vscode-editorWidget-background)',
        color: 'var(--vscode-sideBarSectionHeader-foreground)',
        padding: 10,
        minWidth: 120,
        width: 'fit-content',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'row',
        height: 'fit-content',
    }),
    warningIcon: css({
        display: 'flex',
        alignItems: 'center',
        position: 'absolute',
        top: '50%',
        color: 'var(--vscode-editorWarning-foreground)'
    }),
    warningBody: css({
        marginLeft: 35
    })
});
