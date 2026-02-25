/**
 * Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

const { generateFonts } = require('@twbs/fantasticon');
const fs = require('fs');
const path = require('path');

async function generateIconFont() {
  try {
    // Ensure dist directory exists
    const distDir = path.join(__dirname, '..', '..', 'dist');
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    console.log('Generating icon font...');
    
    // Fantasticon configuration
    const config = {
      inputDir: path.join(__dirname, '..', 'icons'),
      outputDir: distDir,
      fontTypes: ['eot', 'woff2', 'woff'],
      assetTypes: ['css', 'html', 'json', 'ts'],
      name: 'wso2-vscode',
      prefix: 'fw',
      normalize: true,
      formatOptions: {
        json: {
          indent: 2
        }
      }
    };

    await generateFonts(config);
    console.log('✅ Icon font generated successfully!');
    
  } catch (error) {
    console.error('❌ Error generating icon font:', error);
    process.exit(1);
  }
}

generateIconFont();
