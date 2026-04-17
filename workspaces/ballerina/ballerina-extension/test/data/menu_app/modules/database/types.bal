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
import ballerina/sql;

# [Configurable] Database configuration.
#
public type DatabaseConfig record {|
    # Database Host
    string host;
    # Database User
    string user;
    # Database Password
    string password;
    # Database Name
    string name;
    # Database Port
    int port;
|};

# Dinner request data.
public type DinnerRequest record {|
    # Request Id 
    int id;
    # User email
    @sql:Column {name: "email"}
    string userEmail;
    # Meal option
    @sql:Column {name: "meal_option"}
    string mealOption;
    # Date of meal request
    string date;
    # Department of employee
    string department;
    # Team of employee
    string? team;
    # Manager email
    @sql:Column {name: "manager_email"}
    string managerEmail;
    # Timestamp of the request
    @sql:Column {name: "_timestamp"}
    string timestamp?;
|};

# Dinner request payload data.
public type DinnerRequestPayload record {|
    # Request Id 
    int id?;
    # Meal option
    @sql:Column {name: "meal_option"}
    string mealOption;
    # Date of meal request
    string date;
    # Department of employee
    string department;
    # Team of employee
    string? team;
    # Manager email
    @sql:Column {name: "manager_email"}
    string managerEmail;
    # Timestamp of the request
    @sql:Column {name: "_timestamp"}
    string timestamp?;
|};


# Employee information.
public type Employee record {|
    # Employee first name
    string firstName;
    # Employee last name
    string lastName;
    # Employee ID
    string employeeId;
    # Employee thumbnail
    string? employeeThumbnail?;
    # Employee work emails
    string workEmail;
    # Employee job role
    string jobRole;
    # Team of the employee
    string? team;
    # Department of the employee
    string department?;
    # Employee manager email
    string managerEmail;
|};
