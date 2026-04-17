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
import menu_app.people;

import ballerina/http;
import ballerina/time;

# Response for fetching user information.
public type UserInfo record {|
    *people:Employee;
    # Array of privileges assigned to the user
    int[] privileges;
    json...;
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

# Meta Data.
public type MetaData record {|
    # Title
    string title;
    # Description
    string description;
|};

# App Server Error Response.
public type AppServerErrorResponse record {|
    *http:InternalServerError;
    # Message body
    record {|
        string message;
    |} body;
|};

# 401 Unauthorized response.
public type AppUnauthorizedErrorResponse record {|
    *http:Unauthorized;
    # Message body
    record {|
        string message;
    |} body;
|};

# App Server Success Response.
public type AppServerSuccessResponse record {|
    *http:Created;
    # Message body
    record {|
        string message;
    |} body;
|};

# Lunch feedback record.
public type Feedback record {|
    # Feedback message
    string message;
    # Meal type
    Meal meal = LUNCH;
|};

# Meta information.
public type MetaInfo record {|
    # Start time for lunch feedback
    time:TimeOfDay lunchFeedbackStartTime;
    # End time for lunch feedback
    time:TimeOfDay lunchFeedbackEndTime;
|};

# Meal enum.
public enum Meal {
    LUNCH = "Lunch"
}

# Dinner request data.
public type DinnerRequest record {|
    # Request ID
    int id;
    # User email
    string userEmail;
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

# Dinner request payload data.
public type DinnerRequestPayload record {|
    # Request ID
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
