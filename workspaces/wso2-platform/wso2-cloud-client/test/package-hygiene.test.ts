import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** Every TypeScript file under `src`, the sources of the emitted declarations. */
function sources(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const file = join(dir, name);
		return statSync(file).isDirectory() ? sources(file) : file.endsWith(".ts") ? [file] : [];
	});
}

describe("package hygiene", () => {
	it("uses import type statements, never the inline modifier a TypeScript 4.2 consumer cannot parse", () => {
		const root = join(__dirname, "..", "src");
		const offenders = sources(root).filter((file) => /(import|export) \{[^}]*\btype /.test(readFileSync(file, "utf8")));
		assert.deepEqual(offenders, []);
	});
});
