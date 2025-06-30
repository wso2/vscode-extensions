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
import * as React from "react";

import { useStyles } from "./style";
import { Typography } from "../../Typography/Typography";
import { Codicon } from "../../Codicon/Codicon";
import { useErrorBoundary } from "react-error-boundary";
import { Button } from "../../Button/Button";
import { Icon } from "../../Icon/Icon";

export interface ErrorProps {
    errorMsg?: string;
    issueUrl?: string;
    goHome?: () => void;
}

export function ErrorScreen(props: ErrorProps) {
    const classes = useStyles();
    const { resetBoundary } = useErrorBoundary();
    const issueUrl = props.issueUrl || "https://github.com/wso2/ballerina-plugin-vscode/issues";

    return (
        <div className={classes.root}>
            <Codicon name="error" sx={{ height: "100px", width: "100px" }} iconSx={{ fontSize: 100, color: "var(--vscode-errorForeground)" }} />
            <Typography variant="h4" className={classes.errorTitle}>
                {props.errorMsg ? props.errorMsg : "A problem occurred."}
            </Typography>
            <div className={classes.iconContainer}>
                <Button appearance="icon" onClick={resetBoundary}>
                    <Icon name="refresh" isCodicon sx={{ width: 24, height: 24 }} iconSx={{ fontSize: 24 }} />
                </Button>
                {props.goHome && (
                    <Button appearance="icon" onClick={() => props.goHome() }>
                        <Icon name="home" isCodicon sx={{ width: 24, height: 24 }} iconSx={{ fontSize: 24 }} />
                    </Button>
                )}
            </div>
            <Typography variant="body2" className={classes.errorMsg}>
                Please raise an issue in our <a href={issueUrl}>issue tracker</a>
            </Typography>
        </div>
    );
}
