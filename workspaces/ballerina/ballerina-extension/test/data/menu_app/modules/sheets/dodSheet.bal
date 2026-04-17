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
import ballerina/log;

# Insert dinner requests by email to sheet.
#
# + payload - Employee dinner request data
# + email - Employee email
# + return - Dinner request for employee
public isolated function insertDinnerRequest(DinnerRequest payload, string email) returns error? {
    string[] values = [payload.date, payload.team?: "null", payload.managerEmail, payload.mealOption, email];
    _ = check dodSpreadsheetClient->appendValue(dodSheetClientConfig.sheetId, values, <sheets:A1Range>{sheetName: 
        dodSheetClientConfig.sheetName});
}

# Upsert dinner request - update if exists, insert if new.
#
# + payload - Employee dinner request data containing date, meal option, etc.
# + email - Employee email to match against existing records
# + return - Error if operation fails, null on success
public isolated function upsertDinnerRequest(DinnerRequest payload, string email) returns error? {
    sheets:Range range = check dodSpreadsheetClient->getRange(
        dodSheetClientConfig.sheetId,
        dodSheetClientConfig.sheetName, 
        "A:E"
    );

    int rowIndex = 0;
    int? targetRow = ();
    
    foreach (int|string|decimal)[] row in range.values {
        if row.length() >= 4 && row[0].toString() == payload.date && row[4].toString() == email {
            targetRow = rowIndex;
            break;
        }
        rowIndex += 1;
    }

    if targetRow is int {
        string actualRow = "D" + (targetRow + 1).toString();

        sheets:Cell|error receivedCell = dodSpreadsheetClient->getCell(
            dodSheetClientConfig.sheetId,
            dodSheetClientConfig.sheetName, 
            actualRow
        );

        if receivedCell is error {
            string errorMessage = "Error when retrieving cell for targeted row";
            log:printError(string `${errorMessage} for targeted row: ${actualRow}`, receivedCell);
            return error(errorMessage);
        }

        error? setCell = dodSpreadsheetClient->setCell(
            dodSheetClientConfig.sheetId,
            dodSheetClientConfig.sheetName, 
            actualRow,
            payload.mealOption
        );

        if setCell is error {
            string errorMessage = "Error when setting updated cell value";
            log:printError(string `${errorMessage} for targeted row: ${actualRow}`, setCell);
            return error(errorMessage);
        }
        
        log:printInfo("Successfully updated meal option to: " + payload.mealOption);
    } 
    else {
        log:printWarn("No match found, appending new row");
        
        string[] values = [payload.date, payload.team ?: "null", payload.managerEmail, payload.mealOption, email];
        
        sheets:ValueRange|error appendedValue = dodSpreadsheetClient->appendValue(
            dodSheetClientConfig.sheetId, 
            values, 
            <sheets:A1Range>{sheetName: dodSheetClientConfig.sheetName}
        );

        if appendedValue is error {
            string errorMessage = "Error when appending cell value";
            log:printError(errorMessage, appendedValue);
            return error(errorMessage);
        }
        
        log:printInfo("Successfully appended new row" + appendedValue.toString());
    }
}

# Cancel dinner requests by email to sheet.
# 
# + email - Employee email
# + return - Error || Null
public isolated function cancelDinnerRequest(string email) returns error? {
    int index = 1;
    sheets:Range range = check dodSpreadsheetClient->getRange(
        dodSheetClientConfig.sheetId,
        dodSheetClientConfig.sheetName, 
        dodSheetClientConfig.sheetRange
    );
    foreach (int|string|decimal)[] row in range.values {
        if row[0] == email {
            _ = check dodSpreadsheetClient->deleteRows(dodSheetClientConfig.sheetId, dodSheetClientConfig.worksheetId, index, 1);
        }
        index += 1;
    }
}
