/**
 * Copyright (c) 2019, WSO2 Inc. (http://www.wso2.org)  Apache License, Version 2.0  http://www.apache.org/licenses/LICENSE-2.0
 */
define(['require', 'jquery', 'constants'],
    function (require, $, Constants) {
        var self = this;
        var Utils = function (vscode) {
            self.vscode = vscode;
        };

        var rest_client_constants = {
            HTTP_GET: "GET",
            HTTP_POST: "POST",
            HTTP_PUT: "PUT",
            HTTP_DELETE: "DELETE",
            simulatorUrl: 'http://localhost:3000' + "/simulation",
            editorUrl: 'http://localhost:3000' + '/editor'
        };

        var global_constants = {
            VIEW_ETL_FLOW_WIZARD: "etl-wizard-view"
        };

        Utils.prototype.getGlobalConstnts = function () {
            return global_constants;
        };

        /**
         * Installs or un-installs an extension.
         *
         * @param extension             Extension object.
         * @param app                   Reference of the app.
         * @param handleLoading         Function which handles the 'loading' state of the installation.
         * @param handleCallback        Callback function after a successful installation.
         * @param callerObject          The object which calls this method.
         * @param requestedActionText   The requested action, i.e: either install or un-install.
         * @param callerScope           Scope of the caller.
         */
        Utils.prototype.installOrUnInstallExtension = function (extension,
                                                                app,
                                                                handleLoading,
                                                                handleCallback,
                                                                callerObject,
                                                                requestedActionText,
                                                                callerScope) {
            self.extensionInstallUninstallAlertModal = $(
                "<div class='modal fade' id='extensionAlertModal' tabindex='-1' role='dialog'" +
                " aria-tydden='true' style='overflow:scroll'>" +
                "<div class='modal-dialog file-dialog' role='document'>" +
                "<div class='modal-content'>" +
                "<div class='modal-header'>" +
                "<button type='button' class='close' data-dismiss='modal' aria-label='Close'>" +
                "<i class='fw fw-cancel about-dialog-close'> </i> " +
                "</button>" +
                "<h4 class='modal-title file-dialog-title' id='newConfigModalLabel'>Confirmation<" +
                "/h4>" +
                "<hr class='style1'>" +
                "</div>" +
                "<div class='modal-body'>" +
                "<div class='container-fluid'>" +
                "<form class='form-horizontal' onsubmit='return false'>" +
                "<div class='form-group'>" +
                "<label for='configName' class='col-sm-9 file-dialog-label'>" + "Are you sure you want to " +
                requestedActionText.toLowerCase() + " <b>" + extension.extensionInfo.name + "</b>?" +
                "</label>" +
                "</div>" +
                "<div class='form-group'>" +
                "<div class='file-dialog-form-btn'>" +
                "<button id='installUninstallId' type='button' class='btn btn-primary'>" +
                requestedActionText + "</button>" +
                "<div class='divider'/>" +
                "<button type='cancelButton' class='btn btn-default' data-dismiss='modal'>cancel</button>" +
                "</div>" +
                "</form>" +
                "</div>" +
                "</div>" +
                "</div>" +
                "</div>" +
                "</div>"
            ).modal('show');

            self.extensionInstallUninstallAlertModal.find("button").filter("#installUninstallId").click(function () {
                self.extensionInstallUninstallAlertModal.modal('hide');
                var action = requestedActionText;

                if (action === Constants.INSTALL) {
                    self.performInstallOrUnInstall(
                        self.vscode, extension, app, handleLoading, handleCallback, callerObject, action, callerScope);
                } else if (action === Constants.UNINSTALL) {
                    self.vscode.postMessage({
                        command: 'getDependencySharingExtensions',
                        payload: extension.extensionInfo.name
                    });
            
                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.command === 'getDependencySharingExtensionsResponse') {
                            const payload = message.payload;
                            if (("doesShareDependencies" in payload)) {
                                if (payload.doesShareDependencies) {
                                    // Some dependencies are shared. Proceed or not based on user's selection.
                                    self.performDependencySharingUnInstallation(
                                        payload.sharesWith,
                                        extension,
                                        app,
                                        handleLoading,
                                        handleCallback,
                                        callerObject,
                                        action,
                                        callerScope);
                                } else {
                                    // No dependencies are shared. Proceed with un-installation.
                                    self.performInstallOrUnInstall(
                                        self.vscode, extension, app, handleLoading, handleCallback, callerObject, action, callerScope);
                                }
                            }
                            else {
                                var errMessage = 'Unable to get dependency sharing information for the extension. ' +
                                'Please check editor console for further information.';
                                alerts.error(errMessage);
                                throw errMessage;
                            }
                        }
                    });
                }
            });
        };

        /**
         * Displays a popup with the information about extensions - that share dependencies with the given
         * extension (if any), during un-installation.
         * Un-installation will be continued or not, respectively when the user confirms or cancels the popup.
         *
         * @param sharesWith        Information about dependency sharing extensions, obtained from the response.
         * @param extension         Configuration of an extension.
         * @param app               Reference of the app.
         * @param handleLoading     Function which handles the 'loading' state of the installation.
         * @param handleCallback    Callback function after a successful installation.
         * @param callerObject      The object which calls this method.
         * @param action            The requested action, i.e: either install or un-install.
         * @param callerScope       Scope of the caller.
         */
        this.performDependencySharingUnInstallation = function (sharesWith,
                                                                extension,
                                                                app,
                                                                handleLoading,
                                                                handleCallback,
                                                                callerObject,
                                                                action,
                                                                callerScope) {
            var extensionListElements = "";
            for (var extensionName in sharesWith) {
                var dependencies = "";
                if (sharesWith.hasOwnProperty(extensionName)) {
                    var sharedDependencies = sharesWith[extensionName];
                    sharedDependencies.forEach(function(dependency) {
                        dependencies += `<li>&nbsp;${dependency.name} ${dependency.version}</li>`;
                    });
                }
                extensionListElements += `<li><b>${extensionName}</b><ul>${dependencies}</ul></li><br/>`;
            }

            self.extensionInstallUninstallAlertModal = $(
                "<div class='modal fade' id='extensionAlertModal' tabindex='-1' role='dialog'" +
                " aria-tydden='true'>" +
                "<div class='modal-dialog file-dialog' role='document'>" +
                "<div class='modal-content'>" +
                "<div class='modal-header'>" +
                "<button type='button' class='close' data-dismiss='modal' aria-label='Close'>" +
                "<i class='fw fw-cancel about-dialog-close'> </i> " +
                "</button>" +
                "<h4 class='modal-title file-dialog-title' id='newConfigModalLabel'>Shared Dependencies Exist</h4>" +
                "<hr class='style1'>" +
                "</div>" +
                "<div class='modal-body'>" +
                "<div class='container-fluid'>" +
                "<form class='form-horizontal' onsubmit='return false'>" +
                "<div class='form-group'>" +
                "<label for='configName' class='col-sm-9 file-dialog-label'>" +
                "The extension shares some of its dependencies with the following extensions. " +
                "Are you sure you want to un-install?" +
                "</label>" +
                "<label for='configName' class='col-sm-9 file-dialog-label'>" +
                `<ul>${extensionListElements}</ul>` +
                "</label>" +
                "</div>" +
                "<div class='form-group'>" +
                "<div class='file-dialog-form-btn'>" +
                "<button id='confirmUnInstall' type='button' class='btn btn-primary'>Confirm</button>" +
                "<div class='divider'/>" +
                "<button type='cancel' class='btn btn-default' data-dismiss='modal'>Cancel</button>" +
                "</div>" +
                "</form>" +
                "</div>" +
                "</div>" +
                "</div>" +
                "</div>" +
                "</div>"
            ).modal('show');

            // Confirm un-installation.
            self.extensionInstallUninstallAlertModal.find("button").filter("#confirmUnInstall").click(function () {
                self.extensionInstallUninstallAlertModal.modal('hide');
                self.performInstallOrUnInstall(
                    self.vscode, extension, app, handleLoading, handleCallback, callerObject, action, callerScope);
            });
        };

        this.performInstallOrUnInstall = function (vscode, extension,
                                                   app,
                                                   handleLoading,
                                                   handleCallback,
                                                   callerObject,
                                                   action,
                                                   callerScope) {
            // Wait until installation completes.
            if (handleLoading) {
                var actionStatus = action + 'ing';
                actionStatus = actionStatus.charAt(0).toUpperCase() + actionStatus.substr(1).toLowerCase();
                handleLoading(callerObject, extension, actionStatus, callerScope);
            }

            if (action.toLowerCase() === 'install') {
                vscode.postMessage({
                    command: 'installDependencies',
                    payload: extension.extensionInfo.name
                });
            } else if (action.toLowerCase() === 'uninstall') {
                vscode.postMessage({
                    command: 'uninstallDependencies',
                    payload: extension.extensionInfo.name
                });
            }

            window.addEventListener('message', event => {
                const message = event.data;
                if (message.command === 'installDependenciesResponse' || message.command === 'uninstallDependenciesResponse') {
                    const payload = message.payload;
                    if ("completed" in payload) {
                        handleCallback(extension, payload.status, callerObject, payload, callerScope);
                        app.utils.extensionStatusListener.markAsRestartRequired(extension);
                        self.displayRestartPopup(extension, action);
                    }
                    else {
                        var errMessage = `Unable to ${action.toLowerCase()} the extension. ` +
                        `Please check editor console for further information.`;
                        alerts.error(errMessage);
                        throw errMessage;
                    }
                }
            });
        };

        /**
         * Displays a popup that instructs to restart the editor.
         *
         * @param extension
         * @param action
         */
        this.displayRestartPopup = function (extension, action) {
            self.extensionInstallUninstallAlertModal = $(
                "<div class='modal fade' id='extensionAlertModal' tabindex='-1' role='dialog'" +
                " aria-tydden='true'>" +
                "<div class='modal-dialog file-dialog' role='document'>" +
                "<div class='modal-content'>" +
                "<div class='modal-header'>" +
                "<button type='button' class='close' data-dismiss='modal' aria-label='Close'>" +
                "<i class='fw fw-cancel about-dialog-close'> </i> " +
                "</button>" +
                "<h4 class='modal-title file-dialog-title' id='newConfigModalLabel'>Restart Required</h4>" +
                "<hr class='style1'>" +
                "</div>" +
                "<div class='modal-body'>" +
                "<div class='container-fluid'>" +
                "<form class='form-horizontal' onsubmit='return false'>" +
                "<div class='form-group'>" +
                "<label for='configName' class='col-sm-9 file-dialog-label'>" +
                `Extension was successfully ${action.toLowerCase()}ed. Please restart the editor.` +
                "</label>" +
                "</div>" +
                "<div class='form-group'>" +
                "<div class='file-dialog-form-btn'>" +
                "<button type='cancelButton' class='btn btn-primary' data-dismiss='modal'>Close</button>" +
                "</div>" +
                "</form>" +
                "</div>" +
                "</div>" +
                "</div>" +
                "</div>" +
                "</div>"
            ).modal('show');
        };

        Utils.prototype.retrieveSiddhiAppNames = function (successCallback, errorCallback, context) {
            self.vscode.postMessage({
                command: 'retrieveSiddhiAppNames'
            });
    
            window.addEventListener('message', event => {
                const message = event.data;
                if (message.command === 'retrieveSiddhiAppNamesResponse') {
                    successCallback(message.payload);
                } 
            });

        };

        /**
         * Usage:  encode a string in base64 while converting into unicode.
         * @param {string} str - string value to be encoded
         */
        Utils.prototype.base64EncodeUnicode = function (str) {
            // First we escape the string using encodeURIComponent to get the UTF-8 encoding of the characters,
            // then we convert the percent encodings into raw bytes, and finally feed it to btoa() function.
            var utf8Bytes = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
                function(match, p1) {
                    return String.fromCharCode('0x' + p1);
                });

            return btoa(utf8Bytes);
        };

        Utils.prototype.b64DecodeUnicode = function (str) {
            // Going backwards: from bytestream, to percent-encoding, to original string.
            return decodeURIComponent(atob(str).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
        };

        Utils.prototype.retrieveEnvVariables = function () {
            var variableMap = {};
            var localVarObj = JSON.parse(localStorage.getItem("templatedAttributeList"));
            Object.keys(localVarObj).forEach(function(key, index, array) {
                var name = extractPlaceHolderName(key);
                if (localVarObj[key] !== undefined   && localVarObj[key] !== '') {
                    variableMap[name] = localVarObj[key];
                }
            });
            return variableMap;
        };

        function extractPlaceHolderName(name) {
            var textMatch = name.match("\\$\\{(.*?)\\}");
            if (textMatch) {
                return textMatch[1];
            } else {
                return '';
            }
        }

        return Utils;
    });
