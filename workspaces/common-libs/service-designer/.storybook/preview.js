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
import React from "react";
export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
}
export const decorators = [
    (Story, context) => {
      if (context.globals.theme === 'Dark_Theme') {
        import('../.storybook/darkTheme.css');
      } else if (context.globals.theme === 'Light_Theme') {
        import('../.storybook/lightTheme.css');
      }
      import ("./fonts/@wso2/font-wso2-vscode/dist/wso2-vscode.css");
      import ("./fonts/@vscode/codicons/dist/codicon.css");
      return <Story />
    }
];

export const globalTypes = {
  theme: {
    name: 'Theme',
    description: 'Global theme for components',
    defaultValue: 'Light_Theme',
    toolbar: {
      icon: 'circlehollow',
      items: ['Light_Theme', 'Dark_Theme'],
    },
  },
};
