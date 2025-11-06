//@ts-check

'use strict';

const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
  target: 'node', // VS Code extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
	mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')

  entry: './src/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'out' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, 'out'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    vscode: 'commonjs vscode' // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    // modules added here also need to be added in the .vscodeignore file
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
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
  devtool: 'nosources-source-map',
  infrastructureLogging: {
    level: "log", // enables logging required for problem matchers
  },
};

/** @type WebpackConfig */
const inspectorServerConfig = {
  target: 'node',
  mode: 'none',
  entry: './node_modules/@modelcontextprotocol/inspector/server/build/index.js',
  output: {
    path: path.resolve(__dirname, 'out', 'inspector'),
    filename: 'server.js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    // Native modules that can't be bundled
    'bufferutil': 'commonjs bufferutil',
    'utf-8-validate': 'commonjs utf-8-validate',
  },
  resolve: {
    extensions: ['.js', '.json']
  },
  devtool: 'nosources-source-map',
};

/** @type WebpackConfig */
const inspectorClientConfig = {
  target: 'node',
  mode: 'none',
  // Use our custom wrapper that has the correct path to client-dist
  entry: './src/client-wrapper.js',
  output: {
    path: path.resolve(__dirname, 'out', 'inspector'),
    filename: 'client.js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    // Native modules that can't be bundled
    'bufferutil': 'commonjs bufferutil',
    'utf-8-validate': 'commonjs utf-8-validate',
  },
  resolve: {
    extensions: ['.js', '.json']
  },
  plugins: [
    // Copy the client's static files (HTML, CSS, JS, assets)
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'node_modules/@modelcontextprotocol/inspector/client/dist',
          to: path.resolve(__dirname, 'out', 'inspector', 'client-dist'),
        },
      ],
    }),
  ],
  devtool: 'nosources-source-map',
  node: {
    // Preserve __dirname and __filename as-is (don't let webpack modify them)
    // This is critical for the client server to find the dist folder
    __dirname: false,
    __filename: false,
  },
};

module.exports = [ extensionConfig, inspectorServerConfig, inspectorClientConfig ];
