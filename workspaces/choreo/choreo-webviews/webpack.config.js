const path = require("path");

class RunTailwindCSSPlugin {
	apply(compiler) {
		compiler.hooks.beforeCompile.tap("RunTailwindCSSPlugin", () => {
			// Run npx tailwindcss
			const execSync = require("node:child_process").execSync;
			execSync("npx tailwindcss -i ./src/style.css -o ./build/output.css");
		});
	}
}

module.exports = {
	entry: "./src/index.tsx",
	target: "web",
	devtool: "source-map",
	mode: "development",
	output: {
		path: path.resolve(__dirname, "build"),
		filename: "main.js",
		library: "choreoWebviews",
	},
	ignoreWarnings: [{ module: /autolinker/, message: /Failed to parse source map/ }],
	resolve: {
		extensions: [".ts", ".tsx", ".js"],
		alias: {
			handlebars: "handlebars/dist/handlebars.min.js",
			react: path.resolve(__dirname, "node_modules/react"),
			"react-dom": path.resolve(__dirname, "node_modules/react-dom"),
			crypto: false,
			net: false,
			os: false,
			path: false,
			fs: false,
			child_process: false,
		},
	},
	module: {
		rules: [
			{
				test: /\.(ts|tsx)$/,
				loader: "ts-loader",
				exclude: "/node_modules/",
			},
			{
				enforce: "pre",
				test: /\.js$/,
				loader: "source-map-loader",
			},
			{
				test: /\.css$/i,
				use: ["style-loader", "css-loader", "postcss-loader"],
			},
			{
				test: /\.s[ac]ss$/i,
				use: ["style-loader", "css-loader", "sass-loader"],
			},
			{
				test: /\.(woff|woff2|ttf|eot|svg)$/,
				type: "asset/inline",
			},
			{
				test: /\.png$/,
				use: ["file-loader"],
			},
		],
	},
	devServer: {
		allowedHosts: "all",
		headers: {
			"Access-Control-Allow-Origin": "*",
		},
		devMiddleware: {
			mimeTypes: { "text/css": ["css"] },
		},
		static: path.join(__dirname, "build"),
		port: 3000,
	},
	plugins: [new RunTailwindCSSPlugin()],
};
