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

import * as fs from 'fs';
import * as path from 'path';

interface TelemetryEvent {
    timestamp: string;
    type: 'event';
    eventName: string;
    componentName: string;
    customDimensions: { [key: string]: string };
    measurements: { [key: string]: number };
}

interface TelemetryException {
    timestamp: string;
    type: 'exception';
    error: {
        name: string;
        message: string;
        stack?: string;
    };
    componentName: string;
    params: { [key: string]: string };
}

type TelemetryEntry = TelemetryEvent | TelemetryException;

const TELEMETRY_FILE_PATH = path.join(__dirname, '../src/features/telemetry/telemetry-events.json');

/**
 * Initialize the telemetry JSON file if it doesn't exist
 */
function initializeTelemetryFile(): void {
    if (!fs.existsSync(TELEMETRY_FILE_PATH)) {
        fs.writeFileSync(TELEMETRY_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
    }
}

/**
 * Read existing telemetry data from the JSON file
 */
function readTelemetryData(): TelemetryEntry[] {
    try {
        initializeTelemetryFile();
        const fileContent = fs.readFileSync(TELEMETRY_FILE_PATH, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error('Error reading telemetry file:', error);
        return [];
    }
}

/**
 * Write telemetry data to the JSON file
 */
function writeTelemetryData(data: TelemetryEntry[]): void {
    try {
        fs.writeFileSync(TELEMETRY_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error('Error writing telemetry file:', error);
    }
}

/**
 * Log a telemetry event to the local JSON file
 */
export function logTelemetryEventLocally(
    eventName: string,
    componentName: string,
    customDimensions: { [key: string]: string } = {},
    measurements: { [key: string]: number } = {}
): void {
    const telemetryData = readTelemetryData();

    const event: TelemetryEvent = {
        timestamp: new Date().toISOString(),
        type: 'event',
        eventName,
        componentName,
        customDimensions,
        measurements
    };

    telemetryData.push(event);
    writeTelemetryData(telemetryData);
}

/**
 * Log a telemetry exception to the local JSON file
 */
export function logTelemetryExceptionLocally(
    error: Error,
    componentName: string,
    params: { [key: string]: string } = {}
): void {
    const telemetryData = readTelemetryData();

    const exception: TelemetryException = {
        timestamp: new Date().toISOString(),
        type: 'exception',
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack
        },
        componentName,
        params
    };

    telemetryData.push(exception);
    writeTelemetryData(telemetryData);
}

/**
 * Clear all telemetry data from the local JSON file
 */
export function clearLocalTelemetryData(): void {
    writeTelemetryData([]);
}