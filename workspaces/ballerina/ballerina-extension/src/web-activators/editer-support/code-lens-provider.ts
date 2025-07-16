import {
    CancellationToken,
    CodeLens,
    CodeLensProvider,
    Event,
    EventEmitter,
    ProviderResult,
    Range,
    TextDocument,
    Uri,
    window,
    workspace,
} from "vscode";
import { ExecutorPosition, ExecutorPositionsResponse, SyntaxTree } from "@wso2/ballerina-core";
import { traversNode } from "@wso2/syntax-tree";
import { CodeLensProviderVisitor } from "./codelense-provider-visitor";
import { LANGUAGE } from "../../core/extension";
import { BallerinaExtension } from "src/core";
import { WebExtendedLanguageClient } from "../webExtendedLanguageClient";
import { ExtendedLangClient } from "src/core";
import { PALETTE_COMMANDS } from "../constants/constants";

export enum EXEC_POSITION_TYPE {
    SOURCE = "source",
    TEST = "test",
}

enum EXEC_TYPE {
    RUN = "Run",
    DEBUG = "Debug",
}

enum EXEC_ARG {
    TESTS = "--tests",
}

export const INTERNAL_DEBUG_COMMAND = "ballerina.internal.debug";

const SOURCE_DEBUG_COMMAND = "ballerina.source.debug";
const TEST_DEBUG_COMMAND = "ballerina.test.debug";
const FOCUS_DEBUG_CONSOLE_COMMAND = "workbench.debug.action.focusRepl";

export class ExecutorCodeLensProvider implements CodeLensProvider {
    private _onDidChangeCodeLenses: EventEmitter<void> = new EventEmitter<void>();
    public readonly onDidChangeCodeLenses: Event<void> = this._onDidChangeCodeLenses.event;
    private activeTextEditorUri: Uri | undefined;

    private ballerinaExtension: BallerinaExtension;

    constructor(extensionInstance: BallerinaExtension) {
        this.ballerinaExtension = extensionInstance;

        workspace.onDidOpenTextDocument((document) => {
            if (document.languageId === LANGUAGE.BALLERINA || document.fileName.endsWith(LANGUAGE.BAL_TOML)) {
                this._onDidChangeCodeLenses.fire();
            }
        });

        workspace.onDidChangeTextDocument((activatedTextEditor) => {
            if (
                (activatedTextEditor && activatedTextEditor.document.languageId === LANGUAGE.BALLERINA) ||
                activatedTextEditor.document.fileName.endsWith(LANGUAGE.BAL_TOML)
            ) {
                this._onDidChangeCodeLenses.fire();
            }
        });
    }

    provideCodeLenses(_document: TextDocument, _token: CancellationToken): ProviderResult<any[]> {
        if (this.ballerinaExtension.langClient && window.activeTextEditor) {
            return this.getCodeLensList();
        }
        return [];
    }

    private async getCodeLensList(): Promise<CodeLens[]> {
        let codeLenses: CodeLens[] = [];
        let langClient: WebExtendedLanguageClient | ExtendedLangClient | undefined = this.ballerinaExtension.langClient;

        if (!langClient) {
            return codeLenses;
        }

        const activeEditorUri = window.activeTextEditor!.document.uri;
        const fileUri = activeEditorUri.toString();

        try {
            const response = (await langClient!.getExecutorPositions({
                documentIdentifier: {
                    uri: fileUri,
                },
            })) as ExecutorPositionsResponse;
            if (response.executorPositions) {
                response.executorPositions.forEach((position) => {
                    if (position.kind === EXEC_POSITION_TYPE.SOURCE) {
                        codeLenses.push(this.createCodeLens(position, EXEC_TYPE.RUN));
                        codeLenses.push(this.createCodeLens(position, EXEC_TYPE.DEBUG));
                    }
                });
            }
        } catch (error) {}

        // Open in diagram code lenses
        try {
            const syntaxTreeResponse = await langClient!.getSyntaxTree({
                documentIdentifier: {
                    uri: fileUri,
                },
            });
            const response = syntaxTreeResponse as SyntaxTree;
            if (response.parseSuccess && response.syntaxTree) {
                const syntaxTree = response.syntaxTree;

                const visitor = new CodeLensProviderVisitor(activeEditorUri);
                traversNode(syntaxTree, visitor, undefined);
                codeLenses.push(...visitor.getCodeLenses());
            }
        } catch (error) {}

        return codeLenses;
    }

    private createCodeLens(execPosition: ExecutorPosition, execType: EXEC_TYPE): CodeLens {
        const startLine = execPosition.range.startLine.line;
        const startColumn = execPosition.range.startLine.offset;
        const endLine = execPosition.range.endLine.line;
        const endColumn = execPosition.range.endLine.offset;
        const codeLens = new CodeLens(new Range(startLine, startColumn, endLine, endColumn));
        codeLens.command = {
            title: execType.toString(),
            tooltip: `${execType.toString()} ${execPosition.name}`,
            command:
                execPosition.kind === EXEC_POSITION_TYPE.SOURCE
                    ? execType === EXEC_TYPE.RUN
                        ? PALETTE_COMMANDS.RUN
                        : SOURCE_DEBUG_COMMAND
                    : execType === EXEC_TYPE.RUN
                    ? PALETTE_COMMANDS.TEST
                    : TEST_DEBUG_COMMAND,
            arguments:
                execPosition.kind === EXEC_POSITION_TYPE.SOURCE
                    ? []
                    : execType === EXEC_TYPE.RUN
                    ? [EXEC_ARG.TESTS, execPosition.name]
                    : [execPosition.name],
        };
        return codeLens;
    }
}
