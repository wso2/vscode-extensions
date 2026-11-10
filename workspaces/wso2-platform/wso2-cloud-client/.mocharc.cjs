// The tests compile with tsconfig.test.json (mocha globals, test folder included).
process.env.TS_NODE_PROJECT ??= "tsconfig.test.json";
module.exports = { require: ["ts-node/register", "./test/vscode-hook.cjs"], spec: "test/**/*.test.ts", extension: ["ts"], timeout: 10000 };
