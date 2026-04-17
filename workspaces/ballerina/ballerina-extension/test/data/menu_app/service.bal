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

import menu_app.authentication;
import menu_app.database;
import menu_app.sheets;
import menu_app.people;

import ballerina/cache;
import ballerina/http;
import ballerina/log;
import ballerina/time;

configurable time:TimeOfDay lunchFeedbackStartTime = {hour: 12, minute: 0, second: 0};
configurable time:TimeOfDay lunchFeedbackEndTime = {hour: 16, minute: 15, second: 0};

final cache:Cache cache = new ({
    defaultMaxAge: 300.0,
    evictionFactor: 0.2
});

@display {
    label: "Menu Application",
    id: "menu-application"
}
service http:InterceptableService / on new http:Listener(9090) {

    public function createInterceptors() returns authentication:JwtInterceptor {
        return new authentication:JwtInterceptor();
    }

    function init() {
        Menu|error menu = sheets:getMenu();
        if menu is error {
            log:printError("Error retrieving menu data", menu);
        }

        log:printInfo("Menu Application service started.");
    }

    # Fetch logged-in user's details.
    #
    # + return - User information or InternalServerError
    resource function get user\-info(http:RequestContext ctx) returns http:InternalServerError|http:NotFound|UserInfo {
        authentication:CustomJwtPayload|error userInfo = ctx.getWithType(authentication:HEADER_USER_INFO);
        if userInfo is error {
            log:printError(USER_NOT_FOUND_ERROR, userInfo);
            return <http:InternalServerError>{
                body: {
                    message: USER_NOT_FOUND_ERROR
                }
            };
        }

        // Check if the user-info is already cached
        if cache.hasKey(userInfo.email) {
            UserInfo|error cachedUserInfo = cache.get(userInfo.email).ensureType();
            if cachedUserInfo is UserInfo {
                return cachedUserInfo;
            }
        }

        people:Employee|error? employee = people:fetchEmployee(userInfo.email);
        if employee is error {
            string customError = string `Error occurred while fetching user information`;
            log:printError(string `${customError} for user : ${userInfo.email}`, employee);
            return <http:InternalServerError>{
                body: {
                    message: customError
                }
            };
        }

        if employee is () {
            log:printError(string `No employee information found for the user: ${userInfo.email}`);
            return <http:NotFound>{
                body: {
                    message: "No user found!"
                }
            };
        }

        // Fetch the user's privileges based on the roles.
        int[] privileges = [];
        if authentication:checkPermissions([authentication:authorizedRoles.EMPLOYEE_ROLE], userInfo.groups) {
            privileges.push(authentication:EMPLOYEE_PRIVILEGE);
        }
        if authentication:checkPermissions([authentication:authorizedRoles.ADMIN_ROLE], userInfo.groups) {
            privileges.push(authentication:ADMIN_PRIVILEGE);
        }

        UserInfo userInfoResponse = {...employee, privileges};

        error? cacheError = cache.put(userInfo.email, userInfoResponse);
        if cacheError is error {
            string customError = string `An error occurred while writing user info to the cache for user: ${userInfo.email}`;
            log:printError(customError, cacheError);
        }
        return userInfoResponse;
    }

    # Fetch meta info.
    #
    # + return - Meta info
    isolated resource function get meta\-info() returns MetaInfo => {
        lunchFeedbackStartTime,
        lunchFeedbackEndTime
    };

    # Retrieve list of menu items.
    #
    # + return - Menu items or error response
    isolated resource function get menu() returns http:InternalServerError|Menu {
        Menu|error menu = sheets:getMenu();
        if menu is error {
            log:printError("Error retrieving menu data", menu);
            return <http:InternalServerError>{
                body: {message: "Error retrieving menu data"}
            };
        }
        return menu;
    }

    # Add feedback to a sheet.
    #
    # + return - Successful feedback or an error
    isolated resource function post feedback(Feedback feedback)
        returns http:InternalServerError|http:BadRequest|http:Created {

        Menu|error menu = sheets:getMenu();
        if menu is error {
            string customErr = "Error retrieving menu data when getting vendor for the feedback";
            log:printError(customErr, menu);
            return <http:InternalServerError>{
                body: {message: customErr}
            };
        }

        // Checks if current time is within the given time period to add feedbacks
        boolean|error isFeedbackPeriod = isWithinTimeRange(menu.date, lunchFeedbackStartTime, lunchFeedbackEndTime);
        if isFeedbackPeriod is error {
            string customErr = "Error occurred while checking the feedback period";
            log:printError(customErr, isFeedbackPeriod);
            return <http:InternalServerError>{
                body: {message: customErr}
            };
        }

        if !isFeedbackPeriod {
            string errorMessage = string `Lunch feedback can only be submitted on ${menu.date} between ${
                lunchFeedbackStartTime.hour.toString().padStart(2, "0")}:${
                lunchFeedbackStartTime.minute.toString().padStart(2, "0")} and ${
                lunchFeedbackEndTime.hour.toString().padStart(2, "0")}:${
                lunchFeedbackEndTime.minute.toString().padStart(2, "0")}`;
            log:printWarn(errorMessage);
            return <http:BadRequest>{
                body: {
                    message: errorMessage
                }
            };
        }

        int|error feedbackId = sheets:addFeedback(feedback, menu.lunch.title);
        if feedbackId is error {
            string customErr = "Error occurred while inserting the lunch feedback";
            log:printError(customErr, feedbackId);
            return <http:InternalServerError>{
                body: {message: customErr}
            };
        }

        return http:CREATED;
    }

    # Retrieve dinner requests for employee.
    #
    # + return - Dinner request for employee or error response
    resource function get dinner(http:RequestContext ctx) 
        returns http:BadRequest|http:Ok|http:InternalServerError|DinnerRequest {

        string|http:BadRequest userEmail = authentication:getUserEmailFromRequestContext(ctx);
        if userEmail is http:BadRequest {
            return userEmail;
        }

        DinnerRequest|error? dinnerRequest = database:getDinnerRequestByEmail(userEmail);
        if dinnerRequest is () {
            log:printInfo(string`${DINNER_REQUEST_NOT_AVAILABLE} for ${userEmail}.`);
            return <http:Ok>{
                body: {message: DINNER_REQUEST_NOT_AVAILABLE}
            };
        }

        if dinnerRequest is error {
            log:printError(DINNER_REQUEST_RETRIEVAL_ERROR, dinnerRequest, dinnerRequest.stackTrace());
            return <http:InternalServerError>{
                body: {message: DINNER_REQUEST_RETRIEVAL_ERROR}
            };
        }
        return dinnerRequest;
    }

    # Upsert dinner requests.
    #
    # + payload - Dinner request data (email, date, meal option)
    # + return - Dinner request success response or error response
    resource function post dinner(http:RequestContext ctx, @http:Payload DinnerRequestPayload payload) 
        returns http:BadRequest|http:InternalServerError|http:Forbidden|http:Created {

        string|http:BadRequest userEmail = authentication:getUserEmailFromRequestContext(ctx);
        if userEmail is http:BadRequest {
            return userEmail;
        }

        // Validate that the dinner request exists before updating
        // This prevents creating duplicate records with invalid IDs during upsert operations
        int? requestId = payload.id;
        if requestId != () {
            DinnerRequest|error? existingDinnerRequest = database:getDinnerRequestById(requestId);
            
            if existingDinnerRequest is error {
                log:printError(string `Error retrieving dinner request with ID ${requestId} for user ${userEmail}`, 
                    existingDinnerRequest);
                return <http:InternalServerError> {
                    body:  {
                        message: "Failed to retrieve existing dinner request for update."
                    }
                };
            }

            if existingDinnerRequest is () {
                log:printError(string `Dinner request with ID ${requestId} not found for user ${userEmail}`);
                return <http:BadRequest> {
                    body:  {
                        message: "Dinner request not found. Invalid request ID provided."
                    }
                };
            }

            // Ensure the authenticated user owns the dinner request they're trying to update
            if userEmail !== existingDinnerRequest.userEmail {
                log:printWarn(string `Authorization failed: User ${userEmail} attempted to modify dinner request ${
                    requestId} belonging to ${existingDinnerRequest.userEmail}`);
                return <http:Forbidden> {
                    body:  {
                        message: "You are not authorized to modify this dinner request."
                    }
                };
            }
        }

        transaction {
            check database:upsertDinnerRequest(payload, userEmail);
            check sheets:upsertDinnerRequest(payload, userEmail);
            check commit;
            
            return <http:Created>{
                body: {message: DINNER_REQUEST_SUCCESS}
            };
        } on fail error transactionError {
            log:printError(string `Failed to place dinner order for ${userEmail} on ${payload.date}.`, 
                transactionError, transactionError.stackTrace());

            return <http:InternalServerError>{
                body: {message: INTERNAL_ERROR}
            };
        }
    }

    # Cancel dinner requests.
    #
    # + return - Dinner request success response or error response
    resource function delete dinner(http:RequestContext ctx) 
        returns http:BadRequest|http:InternalServerError|http:Ok {

        string|http:BadRequest userEmail = authentication:getUserEmailFromRequestContext(ctx);
        if userEmail is http:BadRequest {
            return userEmail;
        }

        DinnerRequest|error? dinnerRequestResult = database:getDinnerRequestByEmail(userEmail);
        if dinnerRequestResult is error {
            log:printError(string `${DINNER_REQUEST_ERROR} for user ${userEmail}`, dinnerRequestResult, 
                dinnerRequestResult.stackTrace());

            return <http:InternalServerError>{
                body: {message: DINNER_REQUEST_ERROR}
            };
        }

        if dinnerRequestResult is () {
            string errorMessage = string`${DINNER_REQUEST_NOT_AVAILABLE} for ${userEmail}. There is nothing to cancel.`;
            log:printError(errorMessage);
            return <http:BadRequest>{
                body: {message: errorMessage}
            };
        }

        transaction {
            check database:cancelDinnerRequest(userEmail);
            check sheets:cancelDinnerRequest(userEmail);
            check commit;

            return <http:Ok>{
                body: {message: string`${DINNER_REQUEST_CANCELLED} for date ${dinnerRequestResult.date}`}
            };
        } on fail error transactionError {
            log:printError(string`${DINNER_REQUEST_CANCELLED_ERROR} for ${userEmail}`, transactionError, 
                transactionError.stackTrace());

            return <http:InternalServerError>{
                body: {message: DINNER_REQUEST_CANCELLED_ERROR}
            };
        }
    }
}
