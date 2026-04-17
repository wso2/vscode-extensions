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

# OAuth2 client auth configurations.
public type ClientAuthConfig record {|
    # Token URL
    string tokenUrl;
    # Client Id
    string clientId;
    # Client Secret
    string clientSecret;
|};

# Retry config for the graphql client.
public type GraphQlRetryConfig record {|
    # Retry count
    int count = RETRY_COUNT;
    # Retry interval
    decimal interval = RETRY_INTERVAL;
    # Retry backOff factor
    float backOffFactor = RETRY_BACKOFF_FACTOR;
    # Retry max interval
    decimal maxWaitInterval = RETRY_MAX_INTERVAL;
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
    string department;
    # Employee manager email
    string managerEmail;
|};

# Employee information.
public type EmployeeData record {|
    # Employee object
    Employee employee;
|};

# Response when fetching employee.
public type EmployeeResponse record {|
    # Employee data fetched
    EmployeeData data;
|};
