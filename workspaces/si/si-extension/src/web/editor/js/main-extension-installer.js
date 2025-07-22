/**
 * Copyright (c) 2019, WSO2 Inc. (http://www.wso2.org)  Apache License, Version 2.0  http://www.apache.org/licenses/LICENSE-2.0
 */
define([
  "require",
  "jquery",
  "lodash",
  "backbone",
  "utils",
  'nano_scroller',
  "dialogs",
  "operator_finder"
], function (
  require,
  $,
  _,
  Backbone,
  Utils,
  NanoScroller,
  Dialogs,
  OperatorFinder
) {
  var Application = Backbone.View.extend(
    /** @lends Application.prototype */
    {
      /**
       * @augments Backbone.View
       * @constructs
       * @class Application wraps all the application logic and it is the main starting point.
       * @param {Object} config configuration options for the application
       */
      initialize: function (config) {
        this.config = config;
        this.vscode = acquireVsCodeApi();

        var self = this;
        var pathSeparator;
        this.initComponents();
        $(".nano").nanoScroller();
      },

      getTabContainer: function () {
        var container = $(_.get(this.config, "tab_controller.container"));
        return container.find(
          _.get(this.config, "tab_controller.tabs.container")
        );
      },

      initComponents: function () {
        this.utils = new Utils(this.vscode);
        var app = {};
        app.utils = this.utils;

        app.config = this.config;
      },

      render: function () {
        $("#loadingScreen").show();
        window.addEventListener('message', event => {
          const message = event.data;
          if (message.command === 'sendExtensionStatuses') {
              self.JSONObject = message.payload;
                  this.utils = this.utils || {};
                  this.utils.extensionData = new Map(Object.entries(self.JSONObject));
                  var operatorFinderOpts = _.get(this.config, 'operator_finder');
                  _.set(operatorFinderOpts, 'application', this);
                  this.operatorFinder = new OperatorFinder.OperatorFinder(operatorFinderOpts);
                  this.openExtensionInstallDialog();
                  $("#loadingScreen").hide();
          } 
      });
      },

      openExtensionInstallDialog: function () {
        if (_.isNil(this._ExtensionInstallDialog)) {
            this._ExtensionInstallDialog = new Dialogs.ExtensionInstallDialog(this);
        }
        this._ExtensionInstallDialog.render();
        // this._ExtensionInstallDialog.show();
    },

    }
  );

  return Application;
});
