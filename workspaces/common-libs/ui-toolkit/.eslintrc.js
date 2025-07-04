module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'react', 'react-hooks'],
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:react/recommended', 'plugin:react-hooks/recommended', 'plugin:storybook/recommended', 'plugin:storybook/recommended'],
    settings: {
        react: {
            version: 'detect',
        },
    },
    ignorePatterns: [
        "lib",
        ".eslintrc.js",
        "**/*.d.ts"
    ],
    rules: {
        // Best Practices
        'no-use-before-define': 'error',
        'no-redeclare': 'error',
        'no-else-return': 'error',
        'eqeqeq': 'error',

        // Stylistic Issues
        'indent': ['error', 4, { 'SwitchCase': 1 }],

        // ES6 Rules
        'arrow-parens': ['error', 'as-needed'],
        'prefer-const': 'error',
        'no-var': 'error',

        // React Rules
        'react/jsx-uses-vars': 'error',
        'react/jsx-uses-react': 'error',
        'react/jsx-indent': ['error', 4],
        'react/jsx-indent-props': ['error', 4],
        'react/self-closing-comp': 'error',

        '@typescript-eslint/no-namespace': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        'react-hooks/exhaustive-deps': 'error',
    },
};
