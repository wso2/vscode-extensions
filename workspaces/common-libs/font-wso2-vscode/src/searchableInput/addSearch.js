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
const fs = require('fs');

// Read the generated HTML file
const htmlFilePath = 'dist/wso2-vscode.html'; // Adjust the path to your generated HTML file
const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');

let modifiedHtml = htmlContent.replace(
    '<h1>wso2-vscode</h1>',
    `<h1>WSO2 VS Code Font</h1> <div> <input type="text" id="searchInput" placeholder="Seach Icon"> </div>`
);

modifiedHtml = modifiedHtml.replace(
    '</body>',
    `<script>
    // JavaScript to handle the label filtering
    document.getElementById('searchInput').addEventListener('input', function () {
        const searchText = this.value.toLowerCase();
        const previews = document.querySelectorAll('.preview');

        previews.forEach(function (preview) {
            const label = preview.querySelector('.label');
            const labelText = label.textContent.toLowerCase();

            if (labelText.includes(searchText)) {
                preview.style.display = 'inline-block';
            } else {
                preview.style.display = 'none';
            }
        });
    });
</script>
</body>`
);

// Write the modified HTML file
fs.writeFileSync(htmlFilePath, modifiedHtml);
