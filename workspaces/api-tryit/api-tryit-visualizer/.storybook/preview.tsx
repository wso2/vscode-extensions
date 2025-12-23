import React from 'react';
import type { Preview } from "@storybook/react";

const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};

const decorators = [
  (Story, context) => {
    if (context.globals.theme === "Dark_Theme") {
      require("./darkTheme.css");
    } else if (context.globals.theme === "Light_Theme") {
      require("./lightTheme.css");
    }
    return <Story />;
  },
];

const globalTypes = {
  theme: {
    name: "Theme",
    description: "Global theme for components",
    defaultValue: "Light_Theme",
    toolbar: {
      icon: "circlehollow",
      items: ["Light_Theme", "Dark_Theme"],
    },
  },
};

const preview: Preview = {
  parameters: parameters,
  decorators: decorators,
  globalTypes: globalTypes
};

export default preview;
