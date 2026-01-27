/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

export const colors = {
    "GET": '#3d7eff',
    "PUT": '#fca130',
    "POST": '#49cc90',
    "DELETE": '#f93e3e',
    "PATCH": '#986ee2',
    "OPTIONS": '#0d5aa7',
    "HEAD": '#9012fe'
};

// Slighly darker shades of the above colors
export const darkerColors = {
    "GET": '#2b5aa6',
    "PUT": '#d08e0f',
    "POST": '#3c9e6f',
    "DELETE": '#d12d2d',
    "PATCH": '#7d4dbb',
    "OPTIONS": '#0b3f7d',
    "HEAD": '#6d0fcb'
};

// Media Types used in postman
export const MediaTypes = [
    "application/json",
    "application/xml",
    "application/vnd.api+json",
    "application/x-www-form-urlencoded",
    "application/octet-stream",
    "multipart/form-data",
    "text/plain",
    "text/html",
    "application/EDI-X12",
    "application/EDIFACT",
    "application/atom+xml",
    "application/font-woff",
    "application/gzip",
    "application/javascript",
    "application/ogg",
    "application/pdf",
    "application/postscript",
    "application/soap+xml",
    "application/bitTorrent",
    "application/x-tex",
    "application/xhtml+xml",
    "application/xslt+xml",
    "application/xml-dtd",
    "application/xop+xml",
    "application/zip",
    "application/x-www-form-urlencoded"
];

// https://www.iana.org/assignments/http-status-codes/http-status-codes.xhtml 
// Add status codes accroding to the above link
export const StatusCodes = {
    "100": "Continue",
    "101": "Switching Protocols",
    "102": "Processing",
    "103": "Early Hints",
    "200": "OK",
    "201": "Created",
    "202": "Accepted",
    "203": "Non-Authoritative Information",
    "204": "No Content",
    "205": "Reset Content",
    "206": "Partial Content",
    "207": "Multi-Status",
    "208": "Already Reported",
    "226": "IM Used",
    "300": "Multiple Choices",
    "301": "Moved Permanently",
    "302": "Found",
    "303": "See Other",
    "304": "Not Modified",
    "305": "Use Proxy",
    "306": "(Unused)",
    "307": "Temporary Redirect",
    "308": "Permanent Redirect",
    "400": "Bad Request",
    "401": "Unauthorized",
    "402": "Payment Required",
    "403": "Forbidden",
    "404": "Not Found",
    "405": "Method Not Allowed",
    "406": "Not Acceptable",
    "407": "Proxy Authentication Required",
    "408": "Request Timeout",
    "409": "Conflict",
    "410": "Gone",
    "411": "Length Required",
    "412": "Precondition Failed",
    "413": "Payload Too Large",
    "414": "URI Too Long",
    "415": "Unsupported Media Type",
    "416": "Range Not Satisfiable",
    "417": "Expectation Failed",
    "418": "I'm a teapot",
    "421": "Misdirected Request",
    "422": "Unprocessable Entity",
    "423": "Locked",
    "424": "Failed Dependency",
    "425": "Too Early",
    "426": "Upgrade Required",
    "428": "Precondition Required",
    "429": "Too Many Requests",
    "431": "Request Header Fields Too Large",
    "451": "Unavailable For Legal Reasons",
    "500": "Internal Server Error",
    "501": "Not Implemented",
    "502": "Bad Gateway",
    "503": "Service Unavailable",
    "504": "Gateway Timeout",
    "505": "HTTP Version Not Supported",
    "506": "Variant Also Negotiates",
    "507": "Insufficient Storage",
    "508": "Loop Detected",
    "510": "Not Extended",
    "511": "Network Authentication Required"
};

export const BaseTypes = [
    "string",
    "number",
    "integer",
    "boolean",
    "array",
    "object",
];

export type ParameterSchemaTypes = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null' | ('string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null')[];

export const SchemaTypes = [
    "string",
    "number",
    "integer",
    "boolean",
    "array",
    "object",
    "any",
];

export const APIResources = [
    "get", "post", "put", "delete", "patch", "head", "options", "trace"
];

export enum Views {
    READ_ONLY = "READ_ONLY",
    EDIT = "EDIT"
}

export enum PathID {
    OVERVIEW = "Overview",
    PATHS = "Paths",
    SCHEMAS = "Schemas",
    PARAMETERS = "Parameters",
    REQUEST_BODY = "RequestBody",
    RESPONSES = "Responses",
    PATHS_RESOURCES = "Paths#-Resources",
    PATHS_COMPONENTS = "Paths#-Components",
    OVERVIEW_COMPONENT = "Overview#-Component",
    COMPONENTS_COMPONENTS = "Components#-Components",
    SCHEMA_COMPONENTS = "Schemas#-Components",
    PARAMETERS_COMPONENTS = "Parameters#-Components",
    REQUEST_BODY_COMPONENTS = "RequestBody#-Components",
    RESPONSE_COMPONENTS = "Responses#-Components",
    SEPERATOR = "#-",
}
