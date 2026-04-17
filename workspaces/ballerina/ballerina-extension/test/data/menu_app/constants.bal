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

public const DEFAULT_TIME_OF_DAY = "T00:00:00.00Z";
public const DEFAULT_TIME_OFFSET = 5.5d;

public const USER_NOT_FOUND_ERROR = "User information header not found!";
public const HEADER_USER_INFO = "user-info";

public final string:RegExp WSO2_EMAIL = re `^[a-zA-Z][\p{L}_\-]+@wso2\.com$`;

public const ACCEPT_HEADER = "Accept";
public const ALL_ORIGINS = "*";
public const JWT_DECODE_ERROR = "Error while decoding JWT";
public const EMAIL_RETRIEVAL_ERROR = "Error while retrieving the user email from jwt payload";
public const READING_JWT_HEADER_ERROR = "Error while reading JWT header";
public const USER_UNAUTHORIZED = "You are Unauthorized for this action/page. Try Logging in again. If this issue persists please contact internal-apps team.";
public const USER_FORBIDDEN = "You are Forbidden for this action/page. Try Logging in again. If this issue persists please contact internal-apps team.";
public const USER_EMAIL = "user-email";
public const CANNOT_RETRIEVE_EMAIL = "Cannot retrieve email from the jwt Id token";
public const X_JWT_ASSERTION = "x-jwt-assertion";

public const INTERNAL_ERROR = "Something went wrong. Unable to process your dinner order at this time. If this issue persists please contact the internal apps team";
public const DINNER_REQUEST_ALREADY_EXISTS = "You have already placed a dinner request.";
public const DINNER_REQUEST_NOT_AVAILABLE = "No dinner request has been made.";
public const DINNER_REQUEST_ERROR = "Unable to verify existing dinner request. Please try again later.";
public const DINNER_REQUEST_SUCCESS = "Dinner request made successfully.";
public const DINNER_REQUEST_CANCELLED = "Your dinner order has been successfully cancelled.";
public const DINNER_REQUEST_CANCELLED_ERROR = "Failed to cancel dinner request.";
public const DINNER_REQUEST_RETRIEVAL_ERROR = "Error retrieving dinner request for employee.";
