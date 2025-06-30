import { type AuthState, CommandIds, type ContextStoreState, type WebviewState } from "@wso2/wso2-platform-core";
import { type ExtensionContext, StatusBarAlignment, type StatusBarItem, window } from "vscode";
import { authStore } from "./stores/auth-store";
import { contextStore } from "./stores/context-store";
import { webviewStateStore } from "./stores/webview-state-store";

let statusBarItem: StatusBarItem;

export function activateStatusbar({ subscriptions }: ExtensionContext) {
	statusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 120);
	// myStatusBarItem.command = myCommandId;
	subscriptions.push(statusBarItem);

	let webviewState: WebviewState = webviewStateStore.getState()?.state;
	let authState: AuthState | null = authStore.getState()?.state;
	let contextStoreState: ContextStoreState | null = contextStore.getState()?.state;
	webviewStateStore.subscribe((state) => {
		webviewState = state.state;
		updateStatusBarItem(webviewState, authState, contextStoreState);
	});

	authStore.subscribe((state) => {
		authState = state.state;
		updateStatusBarItem(webviewState, authState, contextStoreState);
	});
	contextStore.subscribe((state) => {
		contextStoreState = state.state;
		updateStatusBarItem(webviewState, authState, contextStoreState);
	});

	// update status bar item once at start
	updateStatusBarItem(webviewState, authState, contextStoreState);
}

function updateStatusBarItem(webviewState: WebviewState | null, authState?: AuthState | null, contextStoreState?: ContextStoreState | null): void {
	statusBarItem.command = CommandIds.ManageDirectoryContext;
	if (authState?.userInfo) {
		statusBarItem.text = "WSO2";
		if(contextStoreState?.selected){
			statusBarItem.tooltip = `Logged in as ${authState.userInfo?.userEmail}.\n\nDirectory associated with:\n- Organization: ${contextStoreState?.selected?.org?.name}\n- Project: ${contextStoreState?.selected?.project?.name}`
		}else{
			statusBarItem.tooltip = `Logged in as ${authState.userInfo?.userEmail}.\n\nDirectory not associated with any WSO2 Projects.`
		}
		statusBarItem.show();
	} else {
		statusBarItem.hide();
	}
}
