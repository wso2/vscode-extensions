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

# Upsert dinner request (insert or update if exists).
#
# + email - Employee email
# + dinnerRequest - Dinner request data
# + employee - Employee data
# + return - SQL parameterized query
isolated function upsertDinnerRequestQuery(string email, DinnerRequestPayload dinnerRequest, Employee employee) 
    returns sql:ParameterizedQuery => `
        INSERT INTO dinner_bookings (
            id,
            email, 
            meal_option, 
            date,
            department,
            team,
            manager_email,
            is_active
        ) VALUES (
            ${dinnerRequest.id},
            ${email}, 
            ${dinnerRequest.mealOption}, 
            ${dinnerRequest.date}, 
            ${employee.department?: null}, 
            ${employee.team?: null},
            ${employee.managerEmail},
            1
        )
        ON DUPLICATE KEY UPDATE
            meal_option = VALUES(meal_option),
            is_active = 1,
            _timestamp = CURRENT_TIMESTAMP
    `;

# Cancel dinner request.
#
# + email - Dinner request email
# + return - SQL parameterized query
isolated function cancelDinnerRequestQuery(string email) returns sql:ParameterizedQuery => `   
    UPDATE dinner_bookings 
    SET is_active = 0
    WHERE email = ${email} AND is_active = 1 AND date >= CURRENT_DATE 
`;

# Retrieve dinner request by email.
#
# + email - Employee email
# + return - SQL parameterized query
isolated function getDinnerRequestByEmailQuery(string email) returns sql:ParameterizedQuery => `
    SELECT 
        id,
        email,
        meal_option,
        date,
        department,
        team,
        manager_email,
        _timestamp
    FROM 
        dinner_bookings 
    WHERE 
        email = ${email} AND is_active = 1 AND date >= CURRENT_DATE 
`;

# Retrieve dinner request by id.
#
# + id - Dinner ID
# + return - SQL parameterized query
isolated function getDinnerRequestByIdQuery(int id) returns sql:ParameterizedQuery => `
    SELECT 
        id,
        email,
        meal_option,
        date,
        department,
        team,
        manager_email,
        _timestamp
    FROM 
        dinner_bookings 
    WHERE 
        id = ${id} AND is_active = 1 AND date >= CURRENT_DATE 
`;

# Retrieve all dinner requests.
# 
# + return - SQL parameterized query
isolated function getAllDinnerRequestsQuery() returns sql:ParameterizedQuery => `
    SELECT 
        email,
        meal_option,
        date,
        department,
        team,
        manager_email,
        _timestamp
    FROM 
        dinner_bookings 
    WHERE 
        is_active = 1 AND date >= CURRENT_DATE;
`;
