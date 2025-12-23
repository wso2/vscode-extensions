import type { StorybookConfig } from "@storybook/react-webpack5";

import { join, dirname, resolve } from "path";

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string): any {
  return dirname(require.resolve(join(value, "package.json")));
}

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    getAbsolutePath("@storybook/addon-links"),
    getAbsolutePath("@storybook/addon-essentials"),
  ],
  framework: {
    name: getAbsolutePath("@storybook/react-webpack5"),
    options: {},
  },
  docs: {
    autodocs: false,
  },
  webpackFinal: async (config) => {
    config!.resolve!.alias = {
      ...config!.resolve!.alias,
      react: resolve(__dirname, '../node_modules/react'),
      'react-dom': resolve(__dirname, '../node_modules/react-dom'),
    };
    
    // Ensure TypeScript files are handled properly
    config!.resolve!.extensions = ['.ts', '.tsx', '.js', '.jsx'];
    
    // Add Node.js polyfills fallback (set to false to exclude them)
    config!.resolve!.fallback = {
      ...config!.resolve!.fallback,
      tty: false,
      os: false,
    };
    
    // Add ts-loader for TypeScript files
    config!.module!.rules!.push({
      test: /\.(ts|tsx)$/,
      exclude: /node_modules/,
      use: [
        {
          loader: require.resolve('ts-loader'),
          options: {
            transpileOnly: true,
          },
        },
      ],
    });
    
    return config;
  },
};

export default config;
