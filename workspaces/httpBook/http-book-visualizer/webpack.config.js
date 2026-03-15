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

const path = require("path");

module.exports = {
    entry: "./src/index.tsx",
    target: "web",
    devtool: !process.env.CI ? "source-map" : undefined,
    mode: !process.env.CI ? "development" : "production",
    output: {
        path: path.resolve(__dirname, "build"),
        filename: "HttpBookVisualizer.js",
        library: {
            name: "httpBookWebview",
            type: "var",
        },
        devtoolModuleFilenameTemplate: function (info) {
            return "file:///" + encodeURI(info.absoluteResourcePath);
        },
        publicPath: 'auto'
    },
    resolve: {
        extensions: [".js", ".jsx", ".json", ".ts", ".tsx"],
        alias: {
            'react': path.resolve(__dirname, 'node_modules/react'),
            'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
            'vscode-webview-network-bridge/webview': path.resolve(__dirname, 'node_modules/vscode-webview-network-bridge/dist/webview.js'),
            'vscode-webview-network-bridge/extension': path.resolve(__dirname, 'node_modules/vscode-webview-network-bridge/dist/extension.js'),
            'vscode-webview-network-bridge/router': path.resolve(__dirname, 'node_modules/vscode-webview-network-bridge/dist/router.js'),
            "crypto": false,
            "net": false,
            "os": false,
            "fs": false,
            "child_process": false,
        },
        fallback: { 'process/browser': require.resolve('process/browser') }
    },
    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/,
                loader: "ts-loader",
                exclude: '/node_modules/',
            },
            {
                enforce: "pre",
                test: /\.js$/,
                exclude: /node_modules\/(?!typescript)/,
                loader: "source-map-loader"
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            },
            {
                test: /\.(ttf|woff|woff2|eot)$/,
                type: 'asset/inline'
            }
        ]
    },
    plugins: [],
    devServer: {
        port: 9095,
        hot: true,
        liveReload: true,
        allowedHosts: 'all',
        headers: {
            'Access-Control-Allow-Origin': '*',
        },
    },
};
