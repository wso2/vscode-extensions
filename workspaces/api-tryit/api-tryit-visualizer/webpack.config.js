const path = require("path");
const webpack = require("webpack");

module.exports = {
    entry: "./src/index.tsx",
    target: "web",
    devtool: !process.env.CI ? "eval-source-map" : undefined,
    mode: !process.env.CI ? "development" : "production",
    output: {
        path: path.resolve(__dirname, "build"),
        filename: "ApiTryItVisualizer.js",
        library: {
            name: "apiTryItVisualizerWebview",
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
              'vscode': path.resolve(__dirname, 'node_modules/vscode-uri'),
              "crypto": false,
              "net": false,
              "os": false,
              "fs": false,
              "child_process": false,
            },
        fallback: { 'process/browser': require.resolve('process/browser'), }
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
                use: [
                    'style-loader',
                    'css-loader'
                ]
            }
        ]
    },
    plugins: [
        new webpack.DefinePlugin({
            "process.env": JSON.stringify(process.env),
        }),
    ],
    devServer: {
        port: 9092,
        hot: true,
        liveReload: true,
        allowedHosts: 'all',
        headers: {
            'Access-Control-Allow-Origin': '*',
        },
    },
};
