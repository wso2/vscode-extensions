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

# [Configurable] Google sheet OAuth2 application configuration.
type MenuSheet record {|
    # OAuth2 token endpoint
    string tokenUrl;
    # OAuth 2 refresh token
    string refreshToken;
    # OAuth2 client ID
    string clientId;
    # OAuth2 client secret
    string clientSecret;
    # Sheet ID
    string sheetId;
    # Sheet name
    string sheetName;
    # Worksheet ID
    int worksheetId;
    # Sheet range for menu item
    int sheetRangeItem;
    # Sheet range for menu description
    int sheetRangeDescription;
    # Sheet name for feedbacks
    string mealFeedbackSheetName;
|};

# Meta Data.
public type MetaData record {|
    # Title
    string title;
    # Description
    string description;
|};

# Menu Items.
public type Menu record {|
    # Meal date
    string date;
    # Breakfast item
    MetaData breakfast;
    # Juice item
    MetaData juice;
    # Lunch item
    MetaData lunch;
    # Dessert item
    MetaData dessert;
    # Snack item
    MetaData snack;
|};

# Meal enum.
public enum Meal {
    LUNCH = "Lunch"
}

# Lunch feedback record.
public type Feedback record {|
    # Feedback message
    string message;
    # Meal type
    Meal meal = LUNCH;
|};

# [Configurable] Google sheet OAuth2 application configuration.
type DodSheet record {|
    # OAuth2 token endpoint
    string tokenUrl;
    # OAuth 2 refresh token
    string refreshToken;
    # OAuth2 client ID
    string clientId;
    # OAuth2 client secret
    string clientSecret;
    # Sheet ID
    string sheetId;
    # Sheet name
    string sheetName;
    # Worksheet ID
    int worksheetId;
    # Sheet range
    string sheetRange;
|};

# Dinner request data.
public type DinnerRequest record {|
    # Request Id 
    int id?;
    # Meal option
    string mealOption;
    # Date of meal request
    string date;
    # Department of employee
    string department;
    # Team of employee
    string? team;
    # Manager email
    string managerEmail;
    # Timestamp of the request
    string timestamp?;
|};
