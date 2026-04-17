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

# Get the current date and time in readable IST format.
#
# + return - Return the date and time in IST format as a string
isolated function getDateTimeInReadableFormat() returns string {
    // currentTime = Fri, 25 Jul 2025 21:39:46 +0000
    time:Utc currentTime = time:utcAddSeconds(time:utcNow(), 19800);
    string[] splitTime = re ` `.split(time:utcToEmailString(currentTime));

    // return Fri, 25 Jul 2025 21:39:46 
    if splitTime.length() > 5 {
        return string:'join(" ", splitTime[0], splitTime[1], splitTime[2], splitTime[3], splitTime[4]);
    }

    return currentTime.toString(); // return Fri, 25 Jul 2025 21:39:46 +0000 for fallback
}

# Convert a array of union types to a string array.
#
# + values - Row values from the sheet
# + return - Converted string array
isolated function toString((int|string|decimal)[] values) returns string[] =>
    values.'map(value => value.toString());
