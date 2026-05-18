const path = require("path");
const webpack = require("webpack");
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

module.exports = {
    entry: "./src/index.tsx",
    target: "web",
    devtool: !process.env.CI ? "eval-source-map" : undefined,
    mode: !process.env.CI ? "development" : "production",
    output: {
        path: path.resolve(__dirname, "build"),
        filename: "Visualizer.js",
        library: "visualizerWebview",
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
              'vscode': path.resolve(__dirname, 'node_modules/vscode-uri'),
              "crypto": false,
              "net": false,
              "os": false,
              "fs": false,
              "child_process": false,
            },
        fallback: { 'process/browser': require.resolve('process/browser'), },
        fullySpecified: false
    },
    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/,
                loader: "ts-loader",
                exclude: '/node_modules/',
            },
            {
                test: /\.m?js$/,
                resolve: {
                    fullySpecified: false
                }
            },
            {
                enforce: "pre",
                test: /\.js$/,
                exclude: /node_modules\/(?!typescript)/, // Exclude all node_modules except typescript,
                loader: "source-map-loader"
            },
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader'
                ]
            },
            {
                test: /\.s[ac]ss$/i,
                use: ["style-loader", "css-loader", "sass-loader"],
            },
            {
                test: /\.(woff|woff2|ttf|eot)$/,
                type: 'asset/inline',
            },
            {
                test: /\.(svg|png)$/,
                type: 'asset/resource',
                generator: {
                    filename: './images/[name][ext]',
                },
            },
             {
                test:/pdf\.worker\.mjs$/,
                type: "asset/resource",
                generator: {
                    filename: 'workers/[name][ext]',
                },
            } 

        ],
        noParse: [require.resolve("@ts-morph/common/dist/typescript.js")],
    },
    devServer: {
        allowedHosts: 'all',
        port: 9000,
        headers: {
            'Access-Control-Allow-Origin': '*',
        },
        devMiddleware: {
            mimeTypes: { 'text/css': ['css'] },
        },
        hot: true,
    },
    plugins: [
        new webpack.ProvidePlugin({
            process: "process/browser",
        }),
        !process.env.CI & new ReactRefreshWebpackPlugin(),
    ].filter(Boolean),
};
