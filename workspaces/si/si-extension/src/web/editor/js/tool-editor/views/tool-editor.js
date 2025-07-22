/**
 * Copyright (c) 2019, WSO2 Inc. (http://www.wso2.org)  Apache License, Version 2.0  http://www.apache.org/licenses/LICENSE-2.0
 */
define(['require', 'jquery', 'backbone', 'lodash', 'log', 'design_view'],

    function (require, $, Backbone, _, log, DesignView) {

        const ENTER_KEY = 13;

        var ServicePreview = Backbone.View.extend(
            /** @lends ServicePreview.prototype */
            {
                /**
                 * @augments Backbone.View
                 * @constructs
                 * @class ServicePreview Represents the view for siddhi samples
                 * @param {Object} options Rendering options for the view
                 */
                initialize: function (options, vscode) {
                    this.vscode = vscode;
                    if (!_.has(options, 'container')) {
                        throw "container is not defined."
                    }
                    var container = $(_.get(options, 'container'));
                    if (!container.length > 0) {
                        throw "container not found."
                    }
                    this._$parent_el = container;
                    this.options = options;
                    this._file = _.get(options, 'file');
                },

                render: function () {
                    var self = this;
                    var canvasContainer = this._$parent_el.find(_.get(this.options, 'canvas.container'));
                    var previewContainer = this._$parent_el.find(_.get(this.options, 'preview.container'));
                    var loadingScreen = this._$parent_el.find(_.get(this.options, 'loading_screen.container'));
                    var designContainer = this._$parent_el.find(_.get(this.options, 'design_view.container'));
                    var tabContentContainer = $(_.get(this.options, 'tabs_container'));

                    if (!canvasContainer.length > 0) {
                        var errMsg = 'cannot find container to render svg';
                        log.error(errMsg);
                        throw errMsg;
                    }

                    // check whether design container element exists in dom
                    if (!designContainer.length > 0) {
                        errMsg = 'unable to find container for file composer with selector: '
                            + _.get(this.options, 'design_view.container');
                        log.error(errMsg);
                    }

                    var designViewDynamicId = "design-container-" + this._$parent_el.attr('id');
                    designContainer.attr('id', designViewDynamicId);


                    var toggleControlsContainer = self._$parent_el.find('.toggle-controls-container');
                    var codeViewButton = self._$parent_el.find('.asyncbtn-to-code-view');
                    codeViewButton.addClass('hide-div');

                    /*
                    * Use the below line to assign dynamic id for design grid container and pass the id to initialize
                    * jsPlumb.
                    *
                    * NOTE: jsPlumb is loaded via the index.html as a common script for the entire program. When a new
                    * tab is created, that tab is initialised with a dedicated jsPlumb instance.
                    * */
                    var designGridDynamicId = "design-grid-container-" + this._$parent_el.attr('id');
                    var designViewGridContainer =
                        this._$parent_el.find(_.get(this.options, 'design_view.grid_container'));
                    designViewGridContainer.attr('id', designGridDynamicId);

                    // initialise jsPlumb instance for design grid
                    this.jsPlumbInstance = jsPlumb.getInstance({
                        Container: designGridDynamicId
                    });


                    canvasContainer.removeClass('show-div').addClass('hide-div');
                    previewContainer.removeClass('show-div').addClass('hide-div');
                    tabContentContainer.removeClass('tab-content-default');

                    var application = self.options.application;
                    var designView = new DesignView(self.options, application, this.jsPlumbInstance);
                    this._designView = designView;
                    designView.renderToolPalette();

                    loadingScreen.show();
                    designContainer.hide(); // Hide design container initially

                    var toggleViewButton = this._$parent_el.find(_.get(this.options, 'toggle_controls.toggle_view'));
                    var toggleViewButtonDynamicId = "toggle-view-button-" + this._$parent_el.attr('id');
                    toggleViewButton.attr('id', toggleViewButtonDynamicId);

                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.command === 'sendDesign') {
                            self.JSONObject = message.payload.data;
                            setTimeout(function () {
                                designView.emptyDesignViewGridContainer();
                                designContainer.show();
                                designView.setRawExtensions(message.payload.metaData);
                                designView.renderDesignGrid(self.JSONObject);
                                loadingScreen.hide();
                                self.trigger("view-switch", { view: 'design' });
                            }, 100);
                        } 
                    });

                    toggleViewButton.keydown(function (key) {
                        if (key.keyCode == ENTER_KEY) {
                            toggleViewButton.click();
                        }
                    });
                    toggleViewButton.focus(function () {
                        toggleViewButton.addClass("selected-button");
                    });
                    toggleViewButton.focusout(function () {
                        toggleViewButton.removeClass("selected-button");
                    });
                },

            

                canTranslateToWizard: function(model) {
                    var config = model.siddhiAppConfig;
                    return (config.streamList.length == 2 && config.tableList.length == 0 && config.sinkList.filter(s => s.type !== 'log').length == 1
                        || config.streamList.length==1 && config.tableList.length == 1) &&
                        config.sourceList.length == 1 &&
                        config.aggregationList.length == 0 &&
                        config.functionList.length == 0 &&
                        config.partitionList.length == 0 &&
                        config.triggerList.length == 0 &&
                        config.windowList.length == 0 &&
                        config.queryLists.JOIN.length == 0 &&
                        config.queryLists.PATTERN.length == 0 &&
                        config.queryLists.SEQUENCE.length == 0;
                },

                getDesignView: function () {
                    return this._designView;
                },


                getLineNumber: function (queryIndex, queryTerminal) {
                    var self = this;
                    var key = queryIndex + '_' + queryTerminal;
                    key = key.toLowerCase();
                    if (self._lineIndex.hasOwnProperty(key)) {
                        return self._lineIndex[key];
                    } else {
                        return null;
                    }
                },

                getUndoManager: function () {
                    var self = this;
                    return self._undoManager;
                },

            });

        String.prototype.replaceAll = function (search, replacement) {
            var target = this;
            return target.replace(new RegExp(search, 'g'), replacement);
        };

        return ServicePreview;
    });
