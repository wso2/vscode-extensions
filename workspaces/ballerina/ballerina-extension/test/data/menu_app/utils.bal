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
import ballerina/time;

# Checks whether current time falls within the given time range to add feedbacks.
#
# + date - The date stored in the sheet to be checked
# + startTime - Start time in HH:MM format
# + endTime - End time in HH:MM format
# + return - True if the current time falls within the range false otherwise
isolated function isWithinTimeRange(string date, time:TimeOfDay startTime, time:TimeOfDay endTime)
    returns boolean|error {

    string formattedDate = re `/`.replaceAll(date, "-"); // Convert date from YYYY/MM/DD to YYYY-MM-DD
    time:Utc sheetDateUtc = check time:utcFromString(formattedDate + DEFAULT_TIME_OF_DAY);
    time:Utc startTimeUtc = time:utcAddSeconds(sheetDateUtc, startTime.hour * 3600 + startTime.minute * 60);
    time:Utc endTimeUtc = time:utcAddSeconds(sheetDateUtc, endTime.hour * 3600 + endTime.minute * 60);
    time:Utc currentTimeUtc = time:utcNow();
    time:Utc currentTimeUserLocal = time:utcAddSeconds(currentTimeUtc, DEFAULT_TIME_OFFSET * 3600);
    return currentTimeUserLocal >= startTimeUtc && currentTimeUserLocal <= endTimeUtc;
}

# Validates whether all provided user groups exist in the list of valid user groups.
#
# + userGroups - Array of user group names to validate
# + validUserGroups - Array of allowed user group names from the database
# + return - true if all provided groups are valid or if no groups provided, false if any group is invalid
public isolated function checkUserGroups(string[] userGroups, string[] validUserGroups) returns boolean {
    if userGroups.length() === 0 {
        return true;
    }

    final string[] & readonly validUserGroupsReadOnly = validUserGroups.cloneReadOnly();
    return userGroups.every(group => validUserGroupsReadOnly.indexOf(group) !is ());
}
