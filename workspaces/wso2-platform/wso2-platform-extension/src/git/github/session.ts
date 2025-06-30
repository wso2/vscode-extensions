import { type AuthenticationSession, authentication } from "vscode";

const scopes = ["repo", "workflow", "user:email", "read:user"];

export async function getSession(): Promise<AuthenticationSession> {
	return await authentication.getSession("github", scopes, { createIfNone: true });
}
