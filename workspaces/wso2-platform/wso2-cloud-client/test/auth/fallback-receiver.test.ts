import { strict as assert } from "node:assert";
import { type CloudError, FallbackReceiver, LoopbackReceiver } from "../../src";
import type { CallbackReceiver } from "../../src/auth/callback/types";

class Fixed implements CallbackReceiver {
	started = 0;
	disposed = 0;
	constructor(
		readonly redirectUri: string,
		private readonly failStart?: string,
	) {}
	async start(): Promise<void> {
		this.started++;
		if (this.failStart) {
			throw new Error(this.failStart);
		}
	}
	waitForCode(): Promise<string> {
		return Promise.resolve(`code-from-${this.redirectUri}`);
	}
	dispose(): void {
		this.disposed++;
	}
}

describe("FallbackReceiver", () => {
	it("uses the first receiver that starts and its redirect URI", async () => {
		const loopback = new Fixed("http://127.0.0.1:1/callback");
		const uri = new Fixed("vscode://x/signin");
		const receiver = new FallbackReceiver([loopback, uri]);
		await receiver.start();
		assert.equal(receiver.redirectUri, "http://127.0.0.1:1/callback");
		assert.equal(await receiver.waitForCode("s"), "code-from-http://127.0.0.1:1/callback");
		assert.equal(uri.started, 0);
		receiver.dispose();
		assert.equal(loopback.disposed, 1);
		assert.equal(receiver.current, undefined);
	});

	it("falls back when the first cannot start", async () => {
		const loopback = new Fixed("http://127.0.0.1:1/callback", "ports busy");
		const uri = new Fixed("vscode://x/signin");
		const receiver = new FallbackReceiver([loopback, uri]);
		await receiver.start();
		assert.equal(receiver.redirectUri, "vscode://x/signin");
		assert.equal(receiver.current, uri);
	});

	it("refuses when none starts, naming each failure", async () => {
		const receiver = new FallbackReceiver([new Fixed("a", "one"), new Fixed("b", "two")]);
		await assert.rejects(
			receiver.start(),
			(error: CloudError) => error.code === "login_failed" && error.details.reason === "no_redirect_available" && /one; two/.test(error.message),
		);
		await assert.rejects(receiver.waitForCode("s"), (error: CloudError) => error.details.reason === "no_redirect_available");
	});

	it("falls back to the URI handler when every loopback port is taken", async () => {
		const blocker = new LoopbackReceiver([0]);
		await blocker.start();
		const port = Number(new URL(blocker.redirectUri).port);
		try {
			const uri = new Fixed("vscode://x/signin");
			const receiver = new FallbackReceiver([new LoopbackReceiver([port]), uri]);
			await receiver.start();
			assert.equal(receiver.redirectUri, "vscode://x/signin");
		} finally {
			blocker.dispose();
		}
	});
});
