/**
 * Copyright (c) 2019, WSO2 Inc. (http://www.wso2.org)  Apache License, Version 2.0  http://www.apache.org/licenses/LICENSE-2.0
 */
define(["jquery"], function (jQuery) {

    "use strict";   // JS strict mode

    var self = {};
    var vscode = acquireVsCodeApi();

    self.HTTP_GET = "GET";
    self.HTTP_POST = "POST";
    self.HTTP_PUT = "PUT";
    self.HTTP_DELETE = "DELETE";
    self.simulatorUrl = window.location.protocol + "//" + window.location.host + "/simulation";
    self.editorUrl = window.location.protocol + "//" + window.location.host + '/editor';

    /**
     * Helper function to parse array string response from server
     * Removes brackets and splits comma-separated values, trimming quotes
     * @param {string} arrayString - String representation of array like "[item1, item2, item3]"
     * @returns {Array} - Parsed array with cleaned items
     */
    function parseArrayString(arrayString) {
        if (!arrayString || typeof arrayString !== 'string') {
            return [];
        }
        return arrayString
            .slice(1, -1) // remove '[' and ']'
            .split(',')
            .map(item => item.trim().replace(/^"|"$/g, ''));
    }

    self.retrieveSiddhiAppNames = function (successCallback, errorCallback) {
        vscode.postMessage({
            command: 'retrieveSiddhiAppNames'
        });

        const handler = (event) => {
            const message = event.data;
            if (message.command === 'retrieveSiddhiAppNamesResponse') {
                window.removeEventListener('message', handler);
                successCallback(message.payload);
            }
        };
    
        window.addEventListener('message', handler);
    };

    self.retrieveStreamNames = function (siddhiAppName, successCallback, errorCallback) {
        if (siddhiAppName === null || siddhiAppName.length === 0) {
            console.error("Siddhi app name is required to retrieve stream names.")
        }
        vscode.postMessage({
            command: 'retrieveStreamNames',
            payload: siddhiAppName
        });

        const handler = (event) => {
            const message = event.data;
            if (message.command === 'retrieveStreamNamesResponse') {
                window.removeEventListener('message', handler);
                successCallback(message.payload);
            }
        };
    
        window.addEventListener('message', handler);


        
    };

    self.retrieveStreamAttributes = function (siddhiAppName, streamName, successCallback, errorCallback) {
        if (siddhiAppName === null || siddhiAppName.length === 0) {
            console.error("Siddhi app name is required to retrieve stream attributes.")
        }
        if (streamName === null || streamName.length === 0) {
            console.error("Stream name is required to retrieve stream attributes.")
        }
        if (siddhiAppName !== null && siddhiAppName.length > 0
            && streamName !== null && streamName.length > 0) {
            vscode.postMessage({
                command: 'retrieveStreamAttributes',
                siddhiAppName: siddhiAppName, 
                streamName: streamName
            });
        }
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'retrieveStreamAttributesResponse') {
                console.log("retrieved streams: " + message.payload)
                successCallback(message.payload);
            } 
        });
    };

    self.singleEvent = function (siddhiAppName, singleEventConfig, successCallback, errorCallback) {
        if (!singleEventConfig || singleEventConfig.length === 0) {
            console.error("Single event configuration is required.");
            return;
        }
 
        vscode.postMessage({
            command: 'singleEvent',
            siddhiAppName,
            singleEventConfig
        });
    
        window.addEventListener('message', function handler(event) {
            const message = event.data;
            if (message.command === 'singleEventResponse') {
                window.removeEventListener('message', handler);
                if (typeof successCallback === 'function') {
                    successCallback(message.payload);
                } else if (typeof errorCallback === 'function') {
                    errorCallback(message.payload);
                }
            }
        });
    };

    self.uploadSimulation = function (simulationConfig, successCallback, errorCallback) {
        vscode.postMessage({
            command: 'uploadSimulation',
            payload: simulationConfig
        });

        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'uploadSimulationResponse') {
                const payload = message.payload;
                if (typeof successCallback === 'function' && payload.success)
                    successCallback(payload);
                else if (typeof errorCallback === 'function')
                    errorCallback(payload.message)
            }
        });
    };

    self.getFeedSimulations = function (successCallback, errorCallback) {
        vscode.postMessage({ command: 'getFeedSimulations' });
    
        window.addEventListener('message', function handler(event) {
            const message = event.data;
            if (message.command === 'getFeedSimulationsResponse' && message.payload.simulatorResponse.success) {
                window.removeEventListener('message', handler);
                const payload = message.payload;
                if (payload.simulatorResponse.success) {
                    successCallback(payload.result);
                } else if (typeof errorCallback === 'function') {
                    errorCallback("Failed to retrieve feed simulations: ");
                }
            }
        });
    };

    self.updateSimulation = function (simulationName, simulationConfig, successCallback, errorCallback) {
        vscode.postMessage({
            command: 'updateSimulation',
            payload: { simulationName, simulationConfig }
        });
    
        window.addEventListener('message', function handler(event) {
            const message = event.data;
            if (message.command === 'updateSimulationResponse') {
                window.removeEventListener('message', handler);
                const payload = message.payload;
                if (typeof successCallback === 'function' && payload.success) {
                    successCallback(payload);
                } else if (typeof errorCallback === 'function') {
                    errorCallback(payload.message);
                }
            }
        });
    };
    
    self.deleteSimulation = function (simulationName, successCallback, errorCallback) {
        vscode.postMessage({
            command: 'deleteSimulation',
            payload: { simulationName }
        });
    
        window.addEventListener('message', function handler(event) {
            const message = event.data;
            if (message.command === 'deleteSimulationResponse') {
                window.removeEventListener('message', handler);
                const payload = message.payload;
                if (typeof successCallback === 'function' && payload.success) {
                    successCallback(payload);
                } else if (typeof errorCallback === 'function') {
                    errorCallback(payload.message);
                }
            }
        });
    };

    self.getFeedSimulationStatus = function (simulationName, successCallback, errorCallback, async) {
        vscode.postMessage({
            command: 'getFeedSimulationStatus',
            payload: { simulationName, async: !!async }
        });
    
        window.addEventListener('message', function handler(event) {
            const message = event.data;
            if (message.command === 'getFeedSimulationStatusResponse') {
                window.removeEventListener('message', handler);
                const payload = message.payload;
                if (typeof successCallback === 'function' && payload.simulatorResponse.success) {
                    successCallback(payload);
                } else if (typeof errorCallback === 'function') {
                    errorCallback("an error occurred while retrieving the simulation status: " + payload.simulatorResponse.message);
                }
            }
        });
    };
    
    self.retrieveCSVFileNames = function (successCallback, errorCallback) {
        vscode.postMessage({ command: 'retrieveCSVFileNames' });
    
        window.addEventListener('message', function handler(event) {
            const message = event.data;
            if (message.command === 'retrieveCSVFileNamesResponse') {
                window.removeEventListener('message', handler);
                const payload = message.payload;
                if (typeof successCallback === 'function' && payload.simulatorResponse.success) {
                    const array = parseArrayString(payload.result);
                    successCallback(array);
                } else if (typeof errorCallback === 'function') {
                    errorCallback(payload.simulatorResponse.message);
                }
            }
        });
    };
    
    self.uploadCSVFile = function (successCallback, errorCallback) {
        vscode.postMessage({command: 'uploadCSVFile'});
    
        window.addEventListener('message', function handler(event) {
            const message = event.data;
            if (message.command === 'uploadCSVFileResponse') {
                window.removeEventListener('message', handler);
                if (typeof successCallback === 'function'  && message.payload.success) {
                    successCallback(message.payload);
                } else if (typeof errorCallback === 'function') {
                    errorCallback(message.payload.message);
                }
            }
        });
    };
    
    self.testDatabaseConnectivity = function (connectionDetails, successCallback, errorCallback) {
        if (!connectionDetails || connectionDetails.length === 0) return;
    
        vscode.postMessage({
            command: 'testDatabaseConnectivity',
            payload: connectionDetails
        });
    
        window.addEventListener('message', function handler(event) {
            const message = event.data;
            if (message.command === 'testDatabaseConnectivityResponse') {
                window.removeEventListener('message', handler);
                if (typeof successCallback === 'function' && message.payload.success) {
                    successCallback(message.payload.message);
                } else if (typeof errorCallback === 'function') {
                    errorCallback(message.payload.message);
                }
            }
        });
    };
    
    self.retrieveTableNames = function (connectionDetails, successCallback, errorCallback) {
        if (!connectionDetails || connectionDetails.length === 0) return;
    
        vscode.postMessage({
            command: 'retrieveTableNames',
            payload: connectionDetails
        });
    
        window.addEventListener('message', function handler(event) {
            const message = event.data;
            if (message.command === 'retrieveTableNamesResponse') {
                window.removeEventListener('message', handler);
                if (typeof successCallback === 'function' && message.payload.simulatorResponse.success) {
                    const array = parseArrayString(message.payload.result);
                    successCallback(array);
                } else if (typeof errorCallback === 'function') {
                    errorCallback(message.payload.simulatorResponse.message);
                }
            }
        });
    };
    
    self.retrieveColumnNames = function (connectionDetails, tableName, successCallback, errorCallback) {
        if (!connectionDetails || connectionDetails.length === 0 || !tableName || tableName.length === 0) return;
    
        vscode.postMessage({
            command: 'retrieveColumnNames',
            payload: { connectionDetails, tableName }
        });
    
        window.addEventListener('message', function handler(event) {
            const message = event.data;
            if (message.command === 'retrieveColumnNamesResponse' && message.payload.simulatorResponse.success) {
                window.removeEventListener('message', handler);
                if (typeof successCallback === 'function') {
                    const array = parseArrayString(message.payload.result);
                    successCallback(array);
                } else if (typeof errorCallback === 'function') {
                    errorCallback(message.payload.simulatorResponse);
                }
            }
        });
    };
    
    
    
    self.simulationAction = function (siddhiAppName, simulationName, action, successCallback, errorCallback, async) {
        vscode.postMessage({
            command: 'simulationAction',
            payload: { siddhiAppName, simulationName, action, async: !!async }
        });
    
        window.addEventListener('message', function handler(event) {
            const message = event.data;
            if (message.command === 'simulationActionResponse') {
                window.removeEventListener('message', handler);
                if (typeof successCallback === 'function') {
                    successCallback(message.payload);
                } else if (typeof errorCallback === 'function') {
                    errorCallback(message.payload);
                }
            }
        });
    };

    return self;
});