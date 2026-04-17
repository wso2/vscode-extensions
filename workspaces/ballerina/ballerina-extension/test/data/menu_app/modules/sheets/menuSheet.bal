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
import ballerina/cache;
import ballerinax/googleapis.sheets as sheets;

isolated cache:Cache menuShortTermCache = new (capacity = 3, defaultMaxAge = 600, evictionFactor = 0.2);
isolated cache:Cache menuLongTermCache = new (capacity = 3, defaultMaxAge = 43200, evictionFactor = 0.2);

# Get menu from cache or sheet.
#
# + return - Menu or error
public isolated function getMenu() returns Menu|error {
    lock {
        string[] sortedKeys = menuShortTermCache.keys().sort("descending");
        if sortedKeys.length() > 0 {
            any|cache:Error shortTermCacheValue = menuShortTermCache.get(sortedKeys[0]);
            if shortTermCacheValue is Menu {
                return shortTermCacheValue.cloneReadOnly();
            }
        }
    }

    future<Menu|error> menuDataFuture = start getMenuData();
    lock {
        string[] sortedKeys = menuLongTermCache.keys().sort("descending");
        if sortedKeys.length() > 0 {
            any|cache:Error longTermCacheValue = menuLongTermCache.get(sortedKeys[0]);
            if longTermCacheValue is Menu {
                return longTermCacheValue.cloneReadOnly();
            }
        }
    }

    return wait menuDataFuture;
}

# Retrieve menu data from sheet.
#
# + return - string[]|error
isolated function getMenuData() returns Menu|error {
    future<string[]|error> menuItemsFuture = start getRowData(menuSheetClientConfig.sheetRangeItem);
    future<string[]|error> menuDescriptionsFuture = start getRowData(menuSheetClientConfig.sheetRangeDescription);
    string[] menuItems = check wait menuItemsFuture;
    string[] menuDescriptions = check wait menuDescriptionsFuture;
    if menuItems.length() < 6 || menuDescriptions.length() < 6 {
        return error("Error retrieving menu data.", menuItemsLength = menuItems.length(),
            menuDescriptionsLength = menuDescriptions.length());
    }

    final readonly & string date = menuItems[0];
    final readonly & Menu menu = {
        date,
        breakfast: {title: menuItems[1], description: menuDescriptions[1]},
        juice: {title: menuItems[2], description: menuDescriptions[2]},
        lunch: {title: menuItems[3], description: menuDescriptions[3]},
        dessert: {title: menuItems[4], description: menuDescriptions[4]},
        snack: {title: menuItems[5], description: menuDescriptions[5]}
    };

    lock {
        _ = check menuShortTermCache.put(date, menu);
    }

    lock {
        _ = check menuLongTermCache.put(date, menu);
    }

    return menu;
};

# Retrieve menu description from sheet.
#
# + sheetRange - Sheet range
# + return - string[]|error
isolated function getRowData(int sheetRange) returns string[]|error {
    sheets:Row row = check menuSpreadsheetClient->getRow(
        menuSheetClientConfig.sheetId,
        menuSheetClientConfig.sheetName,
        sheetRange
    );

    return toString(row.values);
}

# Add feedback to a separate sheet.
#
# + feedback - Lunch feedback
# + vendor - Vendor name
# + return - Return the updated row position or an error
public isolated function addFeedback(Feedback feedback, string vendor) returns int|error {
    sheets:ValueRange result = check menuSpreadsheetClient->appendValue(
        menuSheetClientConfig.sheetId,
        [getDateTimeInReadableFormat(), vendor, feedback.message],
        {sheetName: menuSheetClientConfig.mealFeedbackSheetName}
    );

    return result.rowPosition;
}
