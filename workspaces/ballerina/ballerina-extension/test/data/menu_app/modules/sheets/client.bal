// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.
import ballerinax/googleapis.sheets as sheets;

# Create Google Sheets client for menu app.
configurable MenuSheet menuSheetClientConfig = ?;

final sheets:ConnectionConfig menuSheetsConfig = {
    auth: {
        clientId: menuSheetClientConfig.clientId,
        clientSecret: menuSheetClientConfig.clientSecret,
        refreshToken: menuSheetClientConfig.refreshToken,
        refreshUrl: menuSheetClientConfig.tokenUrl
    },
    retryConfig: {
        count: GSHEET_CONFIG_RETRY_COUNT,
        interval: GSHEET_CONFIG_RETRY_INTERVAL
    }
};

public final sheets:Client menuSpreadsheetClient = check new (menuSheetsConfig);

# Create Google Sheets client for dod app.
configurable DodSheet dodSheetClientConfig = ?;

final sheets:ConnectionConfig dodSheetsConfig = {
    auth: {
        clientId: dodSheetClientConfig.clientId,
        clientSecret: dodSheetClientConfig.clientSecret,
        refreshToken: dodSheetClientConfig.refreshToken,
        refreshUrl: dodSheetClientConfig.tokenUrl
    },
    retryConfig: {
        count: GSHEET_CONFIG_RETRY_COUNT,
        interval: GSHEET_CONFIG_RETRY_INTERVAL
    }
};

public final sheets:Client dodSpreadsheetClient = check new (dodSheetsConfig);
