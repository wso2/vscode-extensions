const path = require("path");
const webpack = require("webpack");

// Shared configuration used by both bundles
const sharedConfig = {
    target: "web",
    devtool: "source-map",
    mode: "development",
    resolve: {
        extensions: [".js", ".jsx", ".json", ".ts", ".tsx"],
        alias: {
            'react': path.resolve(__dirname, 'node_modules/react'),
            'react-dom': path.resolve(__dirname, 'node_modules/react-dom')
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
            }
        ],
        noParse: [require.resolve("@ts-morph/common/dist/typescript.js")],
    },
    plugins: [
        new webpack.ProvidePlugin({
            process: "process/browser",
        }),
    ],
};

module.exports = [
    // 1. Visualizer bundle (existing)
    {
        ...sharedConfig,
        entry: "./src/index.tsx",
        output: {
            path: path.resolve(__dirname, "build"),
            filename: "Visualizer.js",
            library: "visualizerWebview",
        },
        devServer: {
            host: 'localhost',
            allowedHosts: 'all',
            port: 9000,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            devMiddleware: {
                mimeTypes: { 'text/css': ['css'] },
            },
            client: {
                webSocketURL: 'ws://localhost:9000/ws',
            },
        },
    },
    // 2. MCP Playground bundle (new)
    {
        ...sharedConfig,
        entry: "./src/mcpPlaygroundIndex.tsx",
        output: {
            path: path.resolve(__dirname, "build"),
            filename: "MCPPlayground.js",
            library: "mcpPlayground",
        },
    },
];
