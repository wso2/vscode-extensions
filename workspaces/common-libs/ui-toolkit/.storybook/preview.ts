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
import type { Preview } from '@storybook/react-vite';

const preview: Preview = {
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Light Theme' },
          { value: 'dark', title: 'Dark Theme' }
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      // Remove any existing theme style
      const id = 'vscode-theme-style';
      const existing = document.getElementById(id);
      if (existing) existing.remove();
      // Add the correct theme CSS
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = context.globals.theme === 'dark'
        ? '/.storybook/darkTheme.css'
        : '/.storybook/lightTheme.css';
      document.head.appendChild(link);
      return Story();
    }
  ],
};

export default preview;
