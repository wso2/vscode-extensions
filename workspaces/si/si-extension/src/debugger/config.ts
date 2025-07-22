/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

export class DebuggerConfig {
    private static envVariables: { [key: string]: string } = {};
    private static vmArgs: string[] = [];

    public static getEnvVariables(): { [key: string]: string } {
        return this.envVariables;
    }

    public static setEnvVariables(envVariables: { [key: string]: string }): void {
        this.envVariables = envVariables;
    }

    public static getVmArgs(): string[] {
        return this.vmArgs;
    }

    public static setVmArgs(vmArgs: string[]): void {
        this.vmArgs = vmArgs;
    }
}
