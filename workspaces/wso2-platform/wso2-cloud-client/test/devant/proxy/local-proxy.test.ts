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

import assert from "node:assert/strict";
import { request } from "node:http";
import type { LocalProxyOptions } from "../../../src/devant/proxy/local-proxy";
import { LocalProxy } from "../../../src/devant/proxy/local-proxy";
import type { FakeBridge } from "./support";
import { fakeBridge, json, recordingLogger, viaProxy } from "./support";

describe("Devant local proxy", () => {
	let bridge: FakeBridge;
	let proxy: LocalProxy | undefined;
	let keyFetches: number;

	beforeEach(async () => {
		bridge = await fakeBridge();
		keyFetches = 0;
	});

	afterEach(async () => {
		await proxy?.close();
		proxy = undefined;
		await bridge.close();
	});

	async function start(overrides: Partial<LocalProxyOptions> = {}): Promise<LocalProxy> {
		proxy = await LocalProxy.start({
			bridgeUrl: bridge.url,
			apiKeyHeader: "Api-Key",
			fetchApiKey: async () => {
				keyFetches++;
				return { apiKey: `key-${keyFetches}`, validityTime: 3600 };
			},
			secureHosts: new Set(["secure.internal"]),
			...overrides,
		});
		return proxy;
	}

	it("listens on the loopback interface only, on a port of its own", async () => {
		const started = await start();
		assert.equal(started.address, "127.0.0.1");
		assert.ok(started.port > 0);
	});

	it("posts each request to the bridge as JSON with the key, and writes back the bridge's answer", async () => {
		bridge.answer = (_request, res) =>
			json(res, 200, { request_id: "", status_code: 201, headers: { "X-Reply": "yes", "Content-Length": "999" }, body: "créé" });
		const { port } = await start();

		const answer = await viaProxy(port, "http://api.internal:8080/v1/items/a%20b?tag=x&tag=y&q=1+2", {
			method: "PUT",
			headers: { "content-type": "text/plain", "x-custom": "first", host: "api.internal:8080" },
			body: "payload",
		});

		assert.equal(answer.status, 201);
		assert.equal(answer.headers["x-reply"], "yes");
		assert.equal(answer.body, "créé");

		assert.equal(bridge.received.length, 1);
		const sent = bridge.received[0];
		assert.equal(sent.method, "POST");
		assert.equal(sent.url, "/handle-client-req");
		assert.equal(sent.headers["content-type"], "application/json");
		assert.equal(sent.headers["api-key"], "key-1");
		const details = JSON.parse(sent.body);
		assert.deepEqual(Object.keys(details), ["request_id", "method", "domain", "path", "headers", "query", "body", "port", "isSecure"]);
		assert.equal(details.request_id, "");
		assert.equal(details.method, "PUT");
		assert.equal(details.domain, "api.internal");
		assert.equal(details.path, "/v1/items/a b");
		assert.deepEqual(details.query, { tag: "x", q: "1 2" });
		assert.equal(details.body, "payload");
		assert.equal(details.port, "8080");
		assert.equal(details.isSecure, false);
		assert.equal(details.headers["Content-Type"], "text/plain");
		assert.equal(details.headers["X-Custom"], "first");
		assert.equal(details.headers.Host, undefined);
	});

	it("marks a secure host's request secure, dropping an explicit port 80", async () => {
		const { port } = await start();
		await viaProxy(port, "http://secure.internal:80/health");
		const details = JSON.parse(bridge.received[0].body);
		assert.equal(details.domain, "secure.internal");
		assert.equal(details.isSecure, true);
		assert.equal(details.port, "");
		assert.equal(details.path, "/health");
	});

	it("refuses a request that names no host in its request line, whatever its Host header says", async () => {
		const { port } = await start();
		const answer = await viaProxy(port, "/direct", { method: "POST", body: "x", headers: { host: "plain.internal:9090" } });
		assert.equal(answer.status, 400);
		assert.match(answer.body, /absolute form/);
		assert.equal(bridge.received.length, 0);
		assert.equal(keyFetches, 0);
	});

	it("fetches the key once for many requests", async () => {
		const { port } = await start();
		await viaProxy(port, "http://a.internal/1");
		await viaProxy(port, "http://a.internal/2");
		assert.equal(keyFetches, 1);
		assert.deepEqual(
			bridge.received.map((item) => item.headers["api-key"]),
			["key-1", "key-1"],
		);
	});

	it("fetches the key again once when the bridge refuses it", async () => {
		bridge.answer = (request, res) =>
			request.headers["api-key"] === "key-1"
				? json(res, 401, { message: "Invalid Credentials" })
				: json(res, 200, { request_id: "", status_code: 200, headers: {}, body: "ok" });
		const { port } = await start();
		const answer = await viaProxy(port, "http://a.internal/x");
		assert.equal(answer.status, 200);
		assert.equal(answer.body, "ok");
		assert.equal(keyFetches, 2);
		assert.deepEqual(
			bridge.received.map((item) => item.headers["api-key"]),
			["key-1", "key-2"],
		);
	});

	it("does not retry past one refresh: a bridge that keeps refusing is answered 502", async () => {
		bridge.answer = (_request, res) => json(res, 403, { message: "Forbidden" });
		const { port } = await start();
		const answer = await viaProxy(port, "http://a.internal/x");
		assert.equal(answer.status, 502);
		assert.equal(bridge.received.length, 2);
		assert.equal(keyFetches, 2);
	});

	it("fetches a key again when the one held expires", async () => {
		let now = 0;
		const { port } = await start({
			now: () => now,
			fetchApiKey: async () => {
				keyFetches++;
				return { apiKey: `key-${keyFetches}`, validityTime: 60 };
			},
		});
		await viaProxy(port, "http://a.internal/1");
		now = 39_000;
		await viaProxy(port, "http://a.internal/2");
		now = 41_000;
		await viaProxy(port, "http://a.internal/3");
		assert.equal(keyFetches, 2);
	});

	it("answers 413 for a body over the limit, without calling the bridge", async () => {
		const { port } = await start({ maxBodyBytes: 16 });
		const chunked = await viaProxy(port, "http://a.internal/upload", {
			method: "POST",
			headers: { "transfer-encoding": "chunked" },
			body: "x".repeat(64),
		});
		assert.equal(chunked.status, 413);
		const declared = await viaProxy(port, "http://a.internal/upload", { method: "POST", body: "y".repeat(64) });
		assert.equal(declared.status, 413);
		const fits = await viaProxy(port, "http://a.internal/upload", { method: "POST", body: "z".repeat(16) });
		assert.equal(fits.status, 200);
		assert.equal(bridge.received.length, 1);
	});

	it("answers 502 when the bridge cannot be reached, logging neither the key nor the body", async () => {
		const logger = recordingLogger();
		const unreachable = await fakeBridge();
		await unreachable.close();
		const { port } = await start({ bridgeUrl: unreachable.url, logger });
		const answer = await viaProxy(port, "http://a.internal/x", { method: "POST", body: "secret-body" });
		assert.equal(answer.status, 502);
		assert.ok(logger.lines.length > 0);
		assert.ok(logger.lines.every((line) => !line.includes("key-1") && !line.includes("secret-body")));
	});

	it("answers 502 when the bridge answers something that is not a response to relay", async () => {
		const { port } = await start();
		const answers = [
			(res: Parameters<FakeBridge["answer"]>[1]) => {
				res.writeHead(200, { "content-type": "text/html" });
				res.end("<html>gateway</html>");
			},
			(res: Parameters<FakeBridge["answer"]>[1]) => json(res, 200, { message: "no status" }),
			(res: Parameters<FakeBridge["answer"]>[1]) => json(res, 200, { status_code: 200, headers: { "X-N": 1 }, body: "" }),
			(res: Parameters<FakeBridge["answer"]>[1]) => json(res, 200, { status_code: 200, headers: { "Bad Header": "v" }, body: "" }),
		];
		for (const write of answers) {
			bridge.answer = (_request, res) => write(res);
			const answer = await viaProxy(port, "http://a.internal/x");
			assert.equal(answer.status, 502);
		}
	});

	it("answers 502 when no key can be had for the bridge", async () => {
		const { port } = await start({
			fetchApiKey: async () => {
				throw new Error("publisher down");
			},
		});
		const answer = await viaProxy(port, "http://a.internal/x");
		assert.equal(answer.status, 502);
		assert.equal(bridge.received.length, 0);
	});

	it("answers 405 to CONNECT", async () => {
		const { port } = await start();
		const status = await new Promise<number>((resolve, reject) => {
			const req = request({ host: "127.0.0.1", port, method: "CONNECT", path: "secure.internal:443", agent: false });
			req.on("connect", (res, socket) => {
				socket.destroy();
				resolve(res.statusCode ?? 0);
			});
			req.on("response", (res) => resolve(res.statusCode ?? 0));
			req.on("error", reject);
			req.end();
		});
		assert.equal(status, 405);
		assert.equal(bridge.received.length, 0);
	});

	it("refuses connections once closed", async () => {
		const started = await start();
		const { port } = started;
		await started.close();
		proxy = undefined;
		await assert.rejects(viaProxy(port, "http://a.internal/x"), /ECONNREFUSED/);
	});
});
