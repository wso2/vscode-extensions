/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

/**
 * Escape a value so the shell treats it as a literal string,
 * preventing command injection via file names, paths, or user input.
 *
 * On POSIX the value is single-quoted (single quotes block all expansion,
 * including $(...) and backticks, which survive inside double quotes).
 *
 * On Windows the value is double-quoted for cmd.exe, with embedded quotes
 * doubled ("") — cmd does not understand \" and would treat the quote as
 * closing the quoted region. Values containing % or control characters are
 * rejected: cmd expands %VAR% even inside double quotes and offers no escape
 * for it on a `cmd /c` command line, so such values cannot be passed safely.
 */
export function escapeShellArg(arg: string): string {
    if (process.platform === "win32") {
        if (/[%\x00-\x1f]/.test(arg)) {
            throw new Error(`Argument cannot be safely passed to the Windows shell (contains '%' or control characters): ${arg}`);
        }
        return `"${arg.replace(/"/g, '""')}"`;
    }
    return `'${arg.replace(/'/g, `'\\''`)}'`;
}

/**
 * Escape a value for interpolation into a PowerShell -Command string.
 * Single quotes are literal in PowerShell (no $(...) or variable expansion);
 * embedded single quotes are escaped by doubling.
 */
export function escapePowerShellArg(arg: string): string {
    return `'${arg.replace(/'/g, "''")}'`;
}
