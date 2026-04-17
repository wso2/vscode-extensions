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
import ballerina/http;

# Check permissions.
#
# + requiredRoles - Required Role list
# + userRoles - Roles list, The user has
# + return - Allow or not
public isolated function checkPermissions(string[] requiredRoles, string[] userRoles) returns boolean {
    if userRoles.length() == 0 && requiredRoles.length() > 0 {
        return false;
    }

    final string[] & readonly userRolesReadOnly = userRoles.cloneReadOnly();
    return requiredRoles.every(role => userRolesReadOnly.indexOf(role) !is ());
}

# Get user email from the request context.
#
# + ctx - request context
# + return - email string or error response
public isolated function getUserEmailFromRequestContext(http:RequestContext ctx) returns http:BadRequest|string {
    CustomJwtPayload|error userInfo = ctx.getWithType(HEADER_USER_INFO);
    if userInfo is error {
        return <http:BadRequest>{
            body:  {
                message: USER_NOT_FOUND_ERROR
            }
        };
    }

    string email = userInfo.email;
    if !email.matches(WSO2_EMAIL) {
        return <http:BadRequest> {
            body: {message: "Invalid email"}
        };
    }

    return email;
}
