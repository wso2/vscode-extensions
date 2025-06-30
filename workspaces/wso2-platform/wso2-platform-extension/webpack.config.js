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

const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const fs = require('fs');
const CopyPlugin = require("copy-webpack-plugin");
const PermissionsOutputPlugin = require("webpack-permissions-plugin");
const webpack = require('webpack');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '.env');
const env = dotenv.config({ path: envPath }).parsed;

const mergedEnv = { ...env, ...process.env };

const envKeys = Object.fromEntries(
  Object.entries(mergedEnv).map(([key, value]) => [
    `process.env.${key}`,
    JSON.stringify(value),
  ])
);

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
	target: "node",
	mode: "none",

	entry: {
		extension: "./src/extension.ts",
		"askpass-main": "./src/git/askpass-main.ts",
	},
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "[name].js",
		libraryTarget: "commonjs2",
		devtoolModuleFilenameTemplate: "../[resource-path]",
	},
	externals: {
		keytar: "commonjs keytar",
		vscode: "commonjs vscode",
	},
	resolve: {
		extensions: [".ts", ".js"],
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				exclude: /node_modules/,
				use: [
					{
						loader: "ts-loader",
					},
				],
			},
			{
				test: /\.m?js$/,
				type: "javascript/auto",
				resolve: {
					fullySpecified: false,
				},
			},
		],
	},
	devtool: "source-map",
	infrastructureLogging: {
		level: "log",
	},
	optimization: {
		minimizer: [
			new TerserPlugin({
				terserOptions: {
					// https://github.com/webpack-contrib/terser-webpack-plugin/

					// Don't mangle class names.  Otherwise parseError() will not recognize user cancelled errors (because their constructor name
					// will match the mangled name, not UserCancelledError).  Also makes debugging easier in minified code.
					keep_classnames: true,

					// Don't mangle function names. https://github.com/microsoft/vscode-azurestorage/issues/525
					keep_fnames: true,
				},
			}),
		],
	},
	plugins: [
		new webpack.DefinePlugin(envKeys),
		new CopyPlugin({
			patterns: [{ from: "src/git/*.sh", to: "[name][ext]" }],
		}),
		new PermissionsOutputPlugin({
			buildFolders: [path.resolve(__dirname, "dist/")],
		}),
	],
};
module.exports = [extensionConfig];
