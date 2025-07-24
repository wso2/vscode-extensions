import { MACHINE_VIEW } from "@wso2/ballerina-core";
import { commands, Uri, workspace } from "vscode";

export function setGoToSourceContext(view: MACHINE_VIEW) {
    switch (view) {
        case MACHINE_VIEW.Overview:
        // case MACHINE_VIEW.FunctionForm:
        case MACHINE_VIEW.AddConnectionWizard:
        case MACHINE_VIEW.ViewConfigVariables:
        // case MACHINE_VIEW.ServiceWizard:
        case MACHINE_VIEW.ERDiagram:
            commands.executeCommand("setContext", "showGoToSource", false);
            break;
        default:
            commands.executeCommand("setContext", "showGoToSource", true);
    }
}

// basepath/project/persist/model.bal
export function checkIsPersistModelFile(fileUri: Uri): boolean {
    const fileUriString = fileUri.toString();
    const uriParts = fileUriString.split("/");
    const parentProjectDir = fileUriString.substring(0, fileUriString.indexOf("/persist"));
    const workspaceFolder = workspace.workspaceFolders.find((f) => f.uri.toString() === parentProjectDir);
    console.log("checking persist: ", {
        "1": fileUriString,
        "2": uriParts,
        "3": uriParts[uriParts.length - 2],
        "4": workspaceFolder,
    });
    return uriParts[uriParts.length - 2] === "persist" && !!workspaceFolder;
}
