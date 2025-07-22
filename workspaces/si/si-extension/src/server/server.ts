/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import { ServerOptions } from "vscode-languageclient/node";
import { debug, log } from "../utils/logger";
import * as path from "path";
import { getJavaHomeFromConfig } from "../utils/onboardingUtils";
import { getClassPath } from "../utils/utils";
import * as fs from "fs";
const child_process = require("child_process");

const main: string = "io.siddhi.langserver.launcher.StdioLauncher";

export function getServerOptions(CARBON_HOME: string): ServerOptions {
    debug(`Using Siddhi distribution at ${CARBON_HOME} for Language server.`);

    const runtimePath = path.join(String(CARBON_HOME), "wso2", "server");
    const keyStorePath = path.join(String(CARBON_HOME), "resources", "security", "wso2carbon.jks");
    const trustStorePath = path.join(String(CARBON_HOME), "resources", "security", "client-truststore.jks");

    let executable: string = path.join(String(getJavaHomeFromConfig()), "bin", "java");
    let args: string[] = [...getClassPath(CARBON_HOME)];

    if (process.env.LSDEBUG === "true") {
        args.push("-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,address=5005,quiet=y,");
        debug("Language Server is starting in debug mode.");
    }

    args.push(
        `-Djavax.net.ssl.keyStore=${keyStorePath}`,
        "-Djavax.net.ssl.keyStorePassword=wso2carbon",
        `-Djavax.net.ssl.trustStore=${trustStorePath}`,
        "-Djavax.net.ssl.trustStorePassword=wso2carbon",
        `-Dcarbon.home=${CARBON_HOME}`,
        `-Dwso2.runtime.path=${runtimePath}`,
        `-Dwso2.runtime=server`,
    );

    let serverOptions: ServerOptions = {
        command: executable,
        args: [...args, main],
        options: {
            env: {
                ...process.env,
                CARBON_HOME,
                RUNTIME_PATH: runtimePath,
            },
        },
    };
    return serverOptions;
}

export function installJars(carbonHome: string) {
    let javaExecutable: string = path.join(String(getJavaHomeFromConfig()), "bin", "java");
    const RUNTIME_PATH = path.join(String(carbonHome), "wso2", "server");

    const toolDir = path.join(carbonHome, "bin", "tools");
    let separator = process.platform === "win32" ? ";" : ":";
    let classPath = "";

    fs.readdirSync(toolDir).forEach(function (file) {
        if (file.endsWith(".jar")) {
            var filePath = path.join(toolDir, file);
            classPath = classPath.concat(separator).concat(filePath);
        }
    });
    // Prepare Java arguments
    const args = [
        "-cp",
        classPath,
        "-Dwso2.carbon.tool=install-jars",
        "-Djdk.util.jar.enableMultiRelease=force", // Changed from 'true' to 'force'
        "org.wso2.carbon.tools.CarbonToolExecutor",
        carbonHome,
    ];

    // Spawn the Java process
    const javaProcess = child_process.spawn(javaExecutable, args, {
        stdio: ["pipe", "pipe", "pipe"],
        shell: true,
        env: {
            ...process.env,
            CARBON_HOME: carbonHome,
            RUNTIME_PATH,
        },
    });

    // Handle stdout
    javaProcess.stdout.on("data", (data) => {
        log(data);
    });

    // Handle stderr
    javaProcess.stderr.on("data", (data) => {
        debug(`Error while installing jars: ${data}`);
    });

    // Handle process exit
    javaProcess.on("close", (code) => {
        debug(`Installing jars completed.`);
    });
}
