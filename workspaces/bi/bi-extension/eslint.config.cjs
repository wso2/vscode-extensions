/* eslint-disable */
const { FlatCompat } = require("@eslint/eslintrc");
const { defineConfig } = require("eslint/config");
const tsParser = require("@typescript-eslint/parser");
const js = require("@eslint/js");

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

module.exports = defineConfig([
    ...compat.config(require("./.eslintrc.json")),
    {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                project: ["./tsconfig.json"],
                tsconfigRootDir: __dirname,
            },
        },
    },
    {
        rules: {
            "@typescript-eslint/naming-convention": "off",
        },
    },
]);
