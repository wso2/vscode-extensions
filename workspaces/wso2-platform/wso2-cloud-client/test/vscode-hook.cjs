// Tests run outside an editor: `require("vscode")` loads the stand-in in test/doubles.
const Module = require("node:module");
const path = require("node:path");

const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
	if (request === "vscode") {
		return path.join(__dirname, "doubles", "vscode.ts");
	}
	return resolve.call(this, request, ...rest);
};
