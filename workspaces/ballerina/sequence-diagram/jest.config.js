/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

module.exports = {
    preset: 'ts-jest/presets/js-with-ts',
    testEnvironment: 'jsdom',
    transform: {
        '^.+\\.(js|jsx)$': 'babel-jest',
        '^.+\\.(ts|tsx)$': 'ts-jest',
    },
    globals: {
        'ts-jest': {
            isolatedModules: true,
            tsconfig: {
                jsx: 'react',
                esModuleInterop: true,
                allowSyntheticDefaultImports: true,
            }
        },
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    testMatch: ['**/?(*.)+(spec|test).ts?(x)'],
    moduleNameMapper: {
        '^@vscode/codicons/dist/codicon\\.css$': 'identity-obj-proxy',
        '\\.css$': 'identity-obj-proxy',
        '\\.(less|sass|scss)$': 'identity-obj-proxy',
        '\\.(svg|png|jpg|jpeg|gif)$': 'identity-obj-proxy',
        '^react$': require.resolve('react'),
        '^react-dom$': require.resolve('react-dom'),
        '^react/jsx-runtime$': require.resolve('react/jsx-runtime'),
        '^@wso2/ui-toolkit$': '<rootDir>/../../common-libs/ui-toolkit/src/index.ts',
        '^@wso2/ballerina-core$': '<rootDir>/../ballerina-core/src/index.ts',
        '^@wso2/ballerina-rpc-client$': '<rootDir>/../ballerina-rpc-client/src/index.ts',
        '^@wso2/syntax-tree$': '<rootDir>/../syntax-tree/src/index.ts',
    },
    setupFilesAfterEnv: [
        '<rootDir>/src/test/jest.env.ts',
    ],
    setupFiles: ['<rootDir>/src/test/matchMedia.ts'],
    transformIgnorePatterns: [
        '<rootDir>/node_modules/(?!(@wso2)/)' // Only transform @wso2 packages
    ],
    moduleDirectories: ['node_modules', '<rootDir>/../../../node_modules'],
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/*.stories.{ts,tsx}',
        '!src/test/**/*'
    ]
};
