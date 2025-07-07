/**
 * Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

//@ts-check

'use strict';

const path = require('path');
const dotenv = require('dotenv');
const webpack = require('webpack');
const { createEnvDefinePlugin } = require('../../../common/scripts/env-webpack-helper');

const envPath = path.resolve(__dirname, '.env');
const env = dotenv.config({ path: envPath }).parsed;

let envKeys;
try {
  envKeys = createEnvDefinePlugin(env);
} catch (error) {
  console.warn('\n⚠️  Environment Variable Configuration Warning:');
  console.warn(error.message);
  console.warn('Continuing build with empty environment variables...');
  envKeys = {};
}

/** @type {import('webpack').Configuration} */
module.exports = {
  target: 'node',
	mode: 'none',

  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  externals: {
    vscode: 'commonjs vscode'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  },
  plugins: [
      new webpack.DefinePlugin(envKeys),
  ],
  devtool: 'nosources-source-map',
  infrastructureLogging: {
    level: "log",
  },
};
