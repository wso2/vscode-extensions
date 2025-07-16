import { languages } from "vscode";
import { ExecutorCodeLensProvider } from "./code-lens-provider";
import { BallerinaExtension } from "../../core/extension";
import { LANGUAGE } from "../../core/extension";
import { WEB_IDE_SCHEME } from "../fs/activateFs";

export function activateEditorSupport(ballerinaExtInstance: BallerinaExtension) {
    if (!ballerinaExtInstance.context || !ballerinaExtInstance.langClient) {
        return;
    }

    // Register code lens provider
    languages.registerCodeLensProvider(
        [{ language: LANGUAGE.BALLERINA, scheme: WEB_IDE_SCHEME }],
        new ExecutorCodeLensProvider(ballerinaExtInstance)
    );
}
