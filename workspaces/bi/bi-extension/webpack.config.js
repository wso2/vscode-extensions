/* eslint-disable @typescript-eslint/naming-convention */
//@ts-check

'use strict';

const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

const CopyPlugin = require("copy-webpack-plugin");
const PermissionsOutputPlugin = require('webpack-permissions-plugin');

const webpack = require('webpack');

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
  target: 'node',
  mode: 'none',

  entry: {
    extension: './src/extension.ts'
  },
  output: {
    path: path.resolve(__dirname, 'out'),
    filename: '[name].js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  externals: {
    keytar: "commonjs keytar",
    vscode: 'commonjs vscode',
    bufferutil: 'commonjs bufferutil',
    'utf-8-validate': 'commonjs utf-8-validate'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [{
      test: /\.ts$/,
      exclude: /node_modules/,
      use: [{
        loader: 'ts-loader',
        options: {
          logLevel: "info"
        }
      }]
    }]
  },
  devtool: 'source-map',
  infrastructureLogging: {
    level: "log",
  },
  optimization: {
    minimizer: [
      // @ts-ignore
      new TerserPlugin({
        terserOptions: {
          // https://github.com/webpack-contrib/terser-webpack-plugin/

          // Don't mangle class names.  Otherwise parseError() will not recognize user cancelled errors (because their constructor name
          // will match the mangled name, not UserCancelledError).  Also makes debugging easier in minified code.
          keep_classnames: true,

          // Don't mangle function names. https://github.com/microsoft/vscode-azurestorage/issues/525
          keep_fnames: true,
        }
      })
    ]
  },
  plugins: [
    new PermissionsOutputPlugin({
      buildFolders: [{
        path: path.resolve(__dirname, 'out/'), // Everything under resources/ gets these modes
        fileMode: '755',
        dirMode: '755'
      } ]
    })
  ],

};
const webExtensionConfig=
  {
    watch: false,
    target: 'webworker', // Web target,
    mode: 'none',
    entry: {
      'extension': './src/extension.ts'
    }, // Same entry point for both desktop and web
    output: {
      path: path.resolve(__dirname, 'dist/web'),
      filename: 'extension.js',
      libraryTarget: 'commonjs2',
      devtoolModuleFilenameTemplate: '../[resource-path]',
    },
    devtool: 'source-map',
  
    externals: {
      vscode: 'commonjs vscode' ,  
    },
      plugins: [
        new webpack.ProvidePlugin({
          process: 'process/browser',
        }),
        new webpack.optimize.LimitChunkCountPlugin({
          maxChunks: 1 // disable chunks by default since web extensions must be a single bundle
        }),
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer']
        })
      ],
    resolve: {
      mainFields: ['browser', 'module', 'main'],
      extensions: ['.ts', '.js'],
      fallback: {
      "path": require.resolve("path-browserify"),
      "fs": false, // Explicitly disable fs
      "os": require.resolve("os-browserify/browser"),
       "crypto": require.resolve("crypto-browserify"),
       "buffer": require.resolve("buffer/"),
      "assert": require.resolve("assert/"),
      stream: require.resolve('stream-browserify'),
      process: require.resolve('process/browser'),
      net:false,
    }
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: 'ts-loader',
          
        },
      ],
    }
  }
module.exports = [extensionConfig,webExtensionConfig];
