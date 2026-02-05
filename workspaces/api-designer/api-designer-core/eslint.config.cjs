/* eslint-disable */
const { FlatCompat } = require("@eslint/eslintrc");
const { defineConfig } = require("eslint/config");
const js = require("@eslint/js");

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

module.exports = defineConfig([
    ...compat.config(require("./.eslintrc.js")),
    {
        rules: {
            "@typescript-eslint/no-unsafe-declaration-merging": "off",
        },
    },
]);
