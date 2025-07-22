/**
 * Copyright (c) 2019, WSO2 Inc. (http://www.wso2.org)  Apache License, Version 2.0  http://www.apache.org/licenses/LICENSE-2.0
 */
define(['jquery', 'lodash', 'log', 'remarkable',  'constants', 'alerts'],
    function ($, _, log, Remarkable, Constants, alerts) {
        /**
         * Flashes copied to clipboard message.
         *
         * @param messageBox Message box element.
         */
        var alertCopyToClipboardMessage = function (messageBox) {
            messageBox.show();
            setTimeout(function () {
                messageBox.fadeOut();
            }, 2000);
        };

        /**
         * replacing the pipeline and newline character for md conversation.
         * @param data string variable
         * @returns {""} retrun string data
         */
        var sanitiseString = function (data) {
            return data.replace(/[|]/g, '&#124;').replace(/[\n]/g, '<br/>');
        };

        /**
         * Checks if the source view is active.
         *
         * @returns {jQuery} Status
         */
        var isSourceView = function () {
            return $('.source-container').is(':visible');
        };

        /**
         * Toggles add to source button in the result pane.
         *
         * @param disable Is disabled
         */
        var toggleAddToSource = function (disable) {
            var elements = $('#operator-finder').find('.result-content a.add-to-source');
            if (disable) {
                elements.addClass('disabled');
            } else {
                elements.removeClass('disabled');
            }
        };

        var self;
        /**
         * Initializes the module.
         *
         * @param options Options
         * @constructor
         */
        var OperatorFinder = function (options) {
            self = this;
            this._options = options;
            this._application = options.application;
            this._activateBtn = $(options.activateBtn);
            this._container = $(options.container);
            this._containerToAdjust = $(this._options.containerToAdjust);
            this._verticalSeparator = $(this._options.separator);
            this._notInstalledExtensionArray = getNotInstalledExtensionDetails();
            this._installedExtensionArray = getInstalledExtensionDetails();
            this._partiallyInstalledExtensionArray = getPartiallyInstalledExtensionDetails();
            // Restart is required for extensions only after an installation/un-installation. Hence, the array is empty.
            this._restartRequiredExtensionArray = [];
            // Register listener for changes in extension installation statuses.
            this._application.utils.extensionStatusListener = this;
        };

        /**
         * Checks if the welcome page is active.
         *
         * @returns {boolean} Status
         */
        OperatorFinder.prototype.isWelcomePageSelected = function () {
            if (!this._activeTab) {
                this._activeTab = this._application.tabController.getActiveTab();
            }
            return !this._activeTab || this._activeTab.getTitle() === 'welcome-page';
        };


        /**
         * Marks the given extension's status as restart required.
         *
         * @param extension     Extension object.
         */
        OperatorFinder.prototype.markAsRestartRequired = function (extension) {
            this._application.utils.extensionData.set(extension.extensionInfo.name, extension);
            var currentArray = this.getCurrentArray(extension);
            self.moveInstallationUpdatedExtension(extension, currentArray, this._restartRequiredExtensionArray);
            extension.extensionStatus = Constants.RESTART_REQUIRED;
        };

        /**
         * Returns the array in which, the given extension exists.
         *
         * @param extension Extension object.
         * @returns {Array} The array in which, the given extension exists.
         */
        OperatorFinder.prototype.getCurrentArray = function (extension) {
            var filteredExtensions;
            filteredExtensions = _.filter(
                this._installedExtensionArray,
                function (ext) {
                    return ext.extensionInfo.name === extension.extensionInfo.name
                });
            if (filteredExtensions.length > 0) {
                return this._installedExtensionArray;
            }
            filteredExtensions = _.filter(
                this._partiallyInstalledExtensionArray,
                function (ext) {
                    return ext.extensionInfo.name === extension.extensionInfo.name
                });
            if (filteredExtensions.length > 0) {
                return this._partiallyInstalledExtensionArray;
            }
            return this._notInstalledExtensionArray;
        };

        /**
         * Moves the given extension from the given current array to the given target array.
         *
         * @param extension     Extension object to be moved.
         * @param currentArray  Current array of the extension object.
         * @param targetArray   Destination array for the extension object.
         */
        OperatorFinder.prototype.moveInstallationUpdatedExtension = function (extension, currentArray, targetArray) {
            var index = currentArray.indexOf(extension);
            if (index > -1) {
                currentArray.splice(index, 1);
                targetArray.push(extension);
            }
        };

        /**
         * functions to get the not installed extension array details.
         */
        var getNotInstalledExtensionDetails = function () {
            var notInstalledExtension = [];
            self._application.utils.extensionData.forEach(function (extension) {
                if (extension.extensionStatus === 1) {
                    notInstalledExtension.push(extension);
                }
            });
            return notInstalledExtension;
        };
        /**
         *get the partial install extension details.
         * @returns {[array]}
         */
        var getPartiallyInstalledExtensionDetails = function () {
            var partiallyInstalledExtension = [];
            self._application.utils.extensionData.forEach(function (extension) {
                if (extension.extensionStatus === 2) {
                    partiallyInstalledExtension.push(extension);
                }
            });
            return partiallyInstalledExtension;
        };
        /**
         *get the Installed extension details
         * @returns {*}
         */
        var getInstalledExtensionDetails = function () {
            var installedExtension = [];
            self._application.utils.extensionData.forEach(function (extension) {
                if (extension.extensionStatus === 0) {
                    installedExtension.push(extension);
                }
            });
            return installedExtension;
        };

        /**
         * Get restart required extension details.
         *
         * @returns {Array}
         */
        var getRestartRequiredExtensionDetails = function () {
            var restartRequiredExtensions = [];
            self._application.utils.extensionData.forEach(function (extension) {
                if (extension.extensionStatus.trim().toUpperCase() === Constants.RESTART_REQUIRED) {
                    restartRequiredExtensions.push(extension);
                }
            });
            return restartRequiredExtensions;
        };


        /**
         * get the partial intall extension object.
         * @param operatorExtension
         * @returns {Array}
         */
        var getPartiallyInstalledExtensionObject = function (operatorExtension) {
            for (var extension of self._partiallyInstalledExtensionArray) {
                if (((operatorExtension.name.trim().toLowerCase()).indexOf(extension.extensionInfo.name.trim().toLowerCase())) > -1) {return extension;}
            }
        };
        /**
         * get the installed extension object
         * @param operatorExtension
         */
        var getInstalledExtensionObject = function (operatorExtension) {
            for (var extension of self._installedExtensionArray) {
                if (((operatorExtension.name.trim().toLowerCase()).indexOf(extension.extensionInfo.name.trim().toLowerCase())) > -1) {return extension;}
            }
        };
        /**
         * get the not-installed extension object based on extension name.
         * @param operatorExtensionName
         * @returns {extension Object}
         */
        var getNotInstalledExtensionObject = function (operatorExtension) {
            for (var extension of self._notInstalledExtensionArray) {
                if (((operatorExtension.name.trim().toLowerCase()).indexOf(extension.extensionInfo.name.trim().toLowerCase())) > -1) {return extension;}
            }
        };

        /**
         * Get restart required extension objects based on extension name
         * @param operatorExtension
         * @returns {*}
         */
        var getRestartRequiredExtensionObject = function (operatorExtension) {
            for (var extension of self._restartRequiredExtensionArray) {
                if (((operatorExtension.name.trim().toLowerCase()).indexOf(extension.extensionInfo.name.trim().toLowerCase())) > -1) {return extension;}
            }
        };


        /**
         * check the whether operator extension is installed or not.
         * @param operatorExtensionName
         * return true/false.
         */
        var isNotInstalledExtension = function (operatorExtension) {
            for (var extension of self._notInstalledExtensionArray) {
                if (((operatorExtension.name.trim().toLowerCase()).indexOf(extension.extensionInfo.name.trim().toLowerCase())) > -1) {return true;}
            }
        };

        /**
         * check the whether operator extension is partially installed or not.
         * @param operatorExtension
         * @returns {boolean}
         */
        var isPartialInstalledExtension = function (operatorExtension) {
            for (var extension of self._partiallyInstalledExtensionArray) {
                if ( ( (operatorExtension.name.trim().toLowerCase()).indexOf(extension.extensionInfo.name.trim().toLowerCase())) > -1) {return true;}
            }
        };
        /**
         * check the whether operator extension  installed or not.
         * @param operatorExtension
         * @returns {boolean}
         */
        var isInstalledExtension = function (operatorExtension) {
            var installedExtensionArray = getInstalledExtensionDetails();
            for (var extension of installedExtensionArray) {
                if (((operatorExtension.name.trim().toLowerCase()).indexOf(extension.extensionInfo.name.trim().toLowerCase())) > -1) {return true;}
            }
        };

        /**
         * check the whether operator extension  installed or not.
         * @param operatorExtension
         * @returns {boolean}
         */
        var isRestartRequiredExtension = function (operatorExtension) {
            var restartRequiredExtensionArray = getRestartRequiredExtensionDetails();
            for (var extension of restartRequiredExtensionArray) {
                if (((operatorExtension.name.trim().toLowerCase()).indexOf(extension.extensionInfo.name.trim().toLowerCase())) > -1) {return true;}
            }
        };

        /**
         * Adds syntax to the cursor point in the source view.
         *
         * @param index Operator index
         */
        OperatorFinder.prototype.addToSource = function (index) {
            if (this._operators[index]) {
                var syntax = this._operators[index].syntax[0].clipboardSyntax;
                var aceEditor = this._activeTab.getSiddhiFileEditor().getSourceView().getEditor();
                aceEditor.session.insert(aceEditor.getCursorPosition(), syntax);
            }
        };

        /**
         * copy the each clipboard syntax of extension.
         *
         * @param index Operator index
         * @param exIndex clipboard syntax
         * @param container container Current container to find the context
         */
        OperatorFinder.prototype.copyToClipboard = function (index, exIndex, container) {
            if (this._operators[index]) {
                var syntax = this._operators[index].syntax[exIndex].clipboardSyntax;
                container.find('.copyable-text').val(syntax).select();
                document.execCommand('copy');
            }
        };

        /**
         * Updates the given button as 'loading', during an extension's installation.
         *
         * @param button    Install/Un-install button.
         */
        OperatorFinder.prototype.handleExtensionInstallationInProgress = function (button) {
            button.empty();
            button.addClass('fw-loader5');
            button.addClass('fw-spin');
        };

        /**
         * Renders the interface.
         */
        OperatorFinder.prototype.render = function () {
            var self = this;

            // Initialize sidebar panel.
            this._container.append(this._templates.container());
            var resultContent = $('#operator-finder').find('.result-content');
            var detailsModal = $('#modalOperatorDetails').clone();
            var modalContent = detailsModal.find('.modal-content');

            // Event handler to modal shown event.
            detailsModal.on('shown.bs.modal', function () {
                $('.nano').nanoScroller();
            });

            // Event handler for modal's extension syntax copy to clipboard event.
            modalContent.on('click', '.copy-to-clipboard', function () {
                var index = detailsModal.find('#operator-name').data('index');
                var exIndex = $(this).data('clip-index');
                self.copyToClipboard(index, exIndex, modalContent);
                alertCopyToClipboardMessage(modalContent.find('.copy-status-msg'));
            });

            // Event handler for modal's add to source event.
            modalContent.on('click', '#btn-add-to-source', function () {
                var index = detailsModal.find('#operator-name').data('index');
                self.addToSource(index);
            });


            // Event handler for extension installation.
            resultContent.on('click', 'a.extension-install-btn', function (e) {
                var innerSelf = this;
                e.preventDefault();
                var handleCallback = function (extension) {
                    self.markAsRestartRequired(extension);
                };
                var extensionObject = getNotInstalledExtensionObject({name: $(this).data('extension-name')});
                self._application.utils.installOrUnInstallExtension(
                    extensionObject,
                    self._application,
                    self.handleExtensionInstallationInProgress,
                    handleCallback,
                    $(this),
                    Constants.INSTALL,
                    innerSelf);
            });

            // Event handler for extension un-installation.
            resultContent.on('click', 'a.extension-un-install-btn', function (e) {
                var innerSelf = this;
                e.preventDefault();
                var handleCallback = function (extension) {
                    self.markAsRestartRequired(extension);
                };
                var extensionObject = getInstalledExtensionObject({name: $(this).data('extension-name')});
                self._application.utils.installOrUnInstallExtension(
                    extensionObject,
                    self._application,
                    self.handleExtensionInstallationInProgress,
                    handleCallback,
                    $(this),
                    Constants.UNINSTALL,
                    innerSelf);
            });

            // Event handler for partially installed extension.
            resultContent.on('click', 'a.partial-extension-install-btn', function (e) {
                e.preventDefault();
                var extensionName = {name: $(this).data('extension-names')};
                var extension = getPartiallyInstalledExtensionObject(extensionName);
                self._partialModel = $(
                    '<div class="modal fade" id="' + extension.extensionInfo.name + '">' +
                    '<div class="modal-dialog">' +
                    '<div class="modal-content">' +
                    '<div class="modal-header">' +
                    "<button type='button' class='close' data-dismiss='modal' aria-label='Close'>" +
                    "<i class=\"fw fw-cancel  about-dialog-close\"></i>" +
                    "</button>" +
                    '<h2 class="modal-title file-dialog-title" id="partialExtenName">'
                    + extension.extensionInfo.name +
                    '</h2>' +
                    '<hr class="style1">' +
                    '</div>' +
                    '<div id="modalBodyId" class="modal-body">' +
                    '</div>' +
                    '<div class="modal-footer">' +
                    '<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>' +
                    '</div>' +
                    '</div>' +
                    '</div>' +
                    '</div>');

                var modalBody = self._partialModel.find("div").filter("#modalBodyId");

                if (extension.manuallyInstall) {
                    modalBody.append($('<div style="text-align:justify">' +
                        'The following dependencies should be manually installed.</div>'));
                    extension.manuallyInstall.forEach(function (dependency) {
                        var instructions = dependency.download.instructions ?
                            (`<h4>Instructions</h4><div id="partialExtenDescription" style = "text-align:justify">` +
                                `${dependency.download.instructions}</div>`) :
                            ('<div id="partialExtenDescription" style="text-align:justify">' +
                                'No instructions found.</div>');
                        var usages = (`<h4>Installation Locations</h4>` +
                            `<div id="partialExtenDescription" style = "text-align:justify">` +
                            `<ol>${dependency.usages.map(usage => 
                                    `<li>${usage.type.toLowerCase()} in ${usage.usedBy.toLowerCase()}</li>`
                                )}</ol></div>`);

                        modalBody.append($(`<h3>${dependency.name}</h3>` +
                            `<div style="padding-left:10px">${instructions}<br/>${usages}</div>`));
                    });
                }
                self._partialModel.modal('show');

                }
            );

            resultContent.on('click', 'a.more-info', function (e) {
                e.preventDefault();
                var index = $(this).closest('.result').data('index');
                var data = _.clone(self._operators[index]);

                data.hasSyntax = (data.syntax || []).length > 0;
                data.hasExamples = (data.examples || []).length > 0;
                data.hasParameters = (data.parameters || []).length > 0;
                data.hasReturnAttributes = (data.returnAttributes || []).length > 0;
                data.index = index;
                data.enableAddToSource = !self.isWelcomePageSelected() && isSourceView();
                modalContent.html(self._templates.moreDetails(data));
                detailsModal.modal('show');
            });

            // Event handler to expand description.
            resultContent.on('click', 'a.expand-description', function (e) {
                e.preventDefault();
                var container = $(this).closest('.result');
                if (container.hasClass('less')) {
                    $(this).text('Less...');
                    container.removeClass('less');
                } else {
                    $(this).text('More...');
                    container.addClass('less');
                }
            });

            // Event handler for add to source button.
            resultContent.on('click', 'a.add-to-source', function (e) {
                e.preventDefault();
                if (self.isWelcomePageSelected()) {
                    return;
                }
                var index = $(this).closest('.result').data('index');
                self.addToSource(index);
            });

            // Event handler for copy syntax to clipboard.
            resultContent.on('click', 'a.copy-to-clipboard', function (e) {
                e.preventDefault();
                var resultElement = $(this).closest('.result');
                self.copyToClipboard(resultElement.data('index'), 0, $('#operator-finder'));
                alertCopyToClipboardMessage(resultElement.find('.copy-status-msg'));
            });

            // Event handler for active tab change event.
            self._application.tabController.on('active-tab-changed', function (e) {
                self._activeTab = e.newActiveTab;
                toggleAddToSource(self.isWelcomePageSelected() || !isSourceView());
            }, this);

            var shortcutPath = 'command.shortcuts.' + (this._application.isRunningOnMacOS() ? 'mac' : 'other') + '.label';
            this._activateBtn
                .attr('title', 'Operator Finder (' + _.get(self._options, shortcutPath) + ')')
                .tooltip();
        };
        return {
            OperatorFinder: OperatorFinder,
            toggleAddToSource: toggleAddToSource
        };
    });
