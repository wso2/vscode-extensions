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

import { CancellationToken, CodeLens, TextDocument } from "vscode";
import { CodeLensMiddleware, ProvideCodeLensesSignature } from "vscode-languageclient/node";
import { SHARED_COMMANDS } from "@wso2/ballerina-core";
import { isSubmoduleFile } from "./file-utils";

export const SUBMODULE_NOT_SUPPORTED_TOOLTIP =
    "Visualizing submodules is not supported yet. Move this construct to the default module of the package to " +
    "visualize it.";

/**
 * Middleware over the code lenses of the language server.
 *
 * The language server offers a `Visualize` lens for every function, service, class and type of a document, and it
 * derives them from the syntax tree alone. The visualizer navigates by the project artifacts instead, which
 * `ArtifactsGenerator` reports for the default module alone. A construct of a submodule therefore matches no artifact,
 * and the command silently lands on the package overview rather than on the view of the construct.
 *
 * The lens of such a construct is disabled here rather than removed, so that the reason is reported to the user
 * instead of the affordance disappearing without an explanation.
 *
 * TODO: Remove this middleware, along with `isSubmoduleFile()`, once the visualizer supports submodules.
 * It is not the intended design: `isSubmoduleFile()` re-derives from the file system what the language server already knows
 * through `Module.isDefaultModule()`, and it hardcodes the `modules` and `generated` convention. The durable fix belongs
 * on the server, where `VisualizeCodeLensProvider` and `ArtifactsGenerator` should share one notion of what can be
 * visualized, so that a lens is offered only where an artifact is reported..
 */
export const codeLensMiddleware: CodeLensMiddleware = {
    provideCodeLenses: async (document: TextDocument, token: CancellationToken,
                              next: ProvideCodeLensesSignature): Promise<CodeLens[] | null | undefined> => {
        const lenses = await next(document, token);
        if (!lenses || !isSubmoduleFile(document.uri.fsPath)) {
            return lenses;
        }
        lenses.forEach(disableVisualizeLens);
        return lenses;
    }
};

/**
 * Renders the given lens as plain text when it is a `Visualize` lens, and leaves it untouched otherwise.
 *
 * An empty command identifier is what disables a lens: VS Code renders an anchor for a lens that holds a command
 * identifier, and a span for one that does not, so the title is shown without the styling and the behaviour of a link.
 * The reason is carried in the tooltip, which the language server cannot set, since the `Command` of the protocol
 * holds a title, an identifier and the arguments alone.
 *
 * The lens is mutated rather than replaced, so that it remains the `ProtocolCodeLens` of the client along with the
 * data that a resolve request would carry, should the language server offer one later.
 */
function disableVisualizeLens(lens: CodeLens): void {
    if (lens.command?.command !== SHARED_COMMANDS.SHOW_VISUALIZER) {
        return;
    }
    lens.command = {
        title: lens.command.title,
        command: "",
        tooltip: SUBMODULE_NOT_SUPPORTED_TOOLTIP
    };
}
