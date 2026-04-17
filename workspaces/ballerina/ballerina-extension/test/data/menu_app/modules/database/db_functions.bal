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
import menu_app.people;

# Get dinner requests by email.
#
# + email - Employee email
# + return - Dinner request for employee
public isolated function getDinnerRequestByEmail(string email) returns DinnerRequest|error? {
    DinnerRequest|error dinnerRequestResult = databaseClient->queryRow(getDinnerRequestByEmailQuery(email));
    return dinnerRequestResult is sql:NoRowsError ? () : dinnerRequestResult;
}

# Get all Dinner Requests for a particular day.
# 
# + return - All dinner requests
public isolated function getDinnerRequests() returns DinnerRequest[]|error {
    stream<DinnerRequest, sql:Error?> dinnerRequestResultStream = databaseClient->query(getAllDinnerRequestsQuery());
    return from var result in dinnerRequestResultStream select result;
}

# Insert dinner request.
#
# + dinnerRequest - Dinner request payload
# + email - Employee email
# + return - Success result
public isolated function upsertDinnerRequest(DinnerRequestPayload dinnerRequest, string email) returns error? {
    _ = check databaseClient->execute(upsertDinnerRequestQuery(email, dinnerRequest, check people:fetchEmployee(email)));
}

# Cancel dinner request.
#
# + email - Dinner request email
# + return - Success result
public isolated function cancelDinnerRequest(string email) returns error? {
    _ = check databaseClient->execute(cancelDinnerRequestQuery(email));
}

# Get dinner request by ID.
#
# + id - Dinner request ID
# + return - Dinner request or error
public isolated function getDinnerRequestById(int id) returns DinnerRequest|error? {
    DinnerRequest|error dinnerRequest = databaseClient->queryRow(getDinnerRequestByIdQuery(id));
    return dinnerRequest is sql:NoRowsError ? () : dinnerRequest;
}
