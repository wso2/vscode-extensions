/**
 * Copyright (c) 2019, WSO2 Inc. (http://www.wso2.org)  Apache License, Version 2.0  http://www.apache.org/licenses/LICENSE-2.0
 */
define(['require', 'elementUtils'],
    function (require, ElementUtils) {

        /**
         * @class ConfigurationData
         * @constructor
         * @class ConfigurationData  Holds the configuration data for a given Siddhi app
         * @param {Object} siddhiAppConfig Siddhi App Data
         * @param {object} application Current Application data
         */
        var ConfigurationData = function (siddhiAppConfig, application, rawExtensions) {
            this.siddhiAppConfig = siddhiAppConfig;
            this.edgeList = [];
            // checks whether still the graph is drawing from the JSON sent from backend when switching from code
            // to design
            this.isStillDrawingGraph = false;
            this.isDesignViewContentChanged = false;
            this.application = application;
            this.rawExtensions = rawExtensions;
        };

        ConfigurationData.prototype.addEdge = function (edge) {
            this.edgeList.push(edge);
        };

        ConfigurationData.prototype.removeEdge = function (edgeId) {
            ElementUtils.prototype.removeElement(this.edgeList, edgeId);
        };

        ConfigurationData.prototype.getSiddhiAppConfig = function () {
            return this.siddhiAppConfig;
        };

        ConfigurationData.prototype.getEdge = function (edgeId) {
            return ElementUtils.prototype.getElement(this.edgeList, edgeId);
        };
        ConfigurationData.prototype.getEdgeList = function () {
            return this.edgeList;
        };

        ConfigurationData.prototype.getIsStillDrawingGraph = function () {
            return this.isStillDrawingGraph;
        };

        ConfigurationData.prototype.getIsDesignViewContentChanged = function () {
            return this.isDesignViewContentChanged;
        };

        ConfigurationData.prototype.setSiddhiAppConfig = function (siddhiAppConfig) {
            this.siddhiAppConfig = siddhiAppConfig;
        };

        ConfigurationData.prototype.setIsStillDrawingGraph = function (isStillDrawingGraph) {
            this.isStillDrawingGraph = isStillDrawingGraph;
        };

        ConfigurationData.prototype.setIsDesignViewContentChanged = function (isDesignViewContentChanged) {
            var self = this;

            function removeUnnecessaryFieldsFromJSON(object) {
                if (object.hasOwnProperty('rawExtensions')) {
                    delete object['rawExtensions'];
                }
                if (object.hasOwnProperty('application')) {
                    delete object['application'];
                }
                if (object.hasOwnProperty('isStillDrawingGraph')) {
                    delete object['isStillDrawingGraph'];
                }
                if (object.hasOwnProperty('isDesignViewContentChanged')) {
                    delete object['isDesignViewContentChanged'];
                }
                _.forEach(object.siddhiAppConfig.queryLists.PATTERN, function (patternQuery) {
                    if (patternQuery.queryInput !== undefined) {
                        if (patternQuery.queryInput.hasOwnProperty('connectedElementNameList')) {
                            delete patternQuery.queryInput['connectedElementNameList'];
                        }
                    }
                });
                _.forEach(object.siddhiAppConfig.queryLists.SEQUENCE, function (sequenceQuery) {
                    if (sequenceQuery.queryInput !== undefined) {
                        if (sequenceQuery.queryInput.hasOwnProperty('connectedElementNameList')) {
                            delete sequenceQuery.queryInput['connectedElementNameList'];
                        }
                    }
                });
                _.forEach(object.siddhiAppConfig.queryLists.JOIN, function (joinQuery) {
                    if (joinQuery.queryInput !== undefined) {
                        if (joinQuery.queryInput.hasOwnProperty('firstConnectedElement')) {
                            delete joinQuery.queryInput['firstConnectedElement'];
                        }
                        if (joinQuery.queryInput.hasOwnProperty('secondConnectedElement')) {
                            delete joinQuery.queryInput['secondConnectedElement'];
                        }
                    }
                });
            }

            self.isDesignViewContentChanged = isDesignViewContentChanged;
            if (isDesignViewContentChanged) {
                var configurationCopy = _.cloneDeep(this);

                // validate json before sending to backend to get the code view
                if (!this.application.designView.validateJSONBeforeSendingToBackend(configurationCopy.getSiddhiAppConfig())) {
                    return;
                }

                removeUnnecessaryFieldsFromJSON(configurationCopy);
                var sendingString = JSON.stringify(configurationCopy);
                this.application.vscode.postMessage({
                    command: 'submitDesign',
                    payload: sendingString
                });
                isDesignViewContentChanged = false;
            }
        };

        return ConfigurationData;
    });
