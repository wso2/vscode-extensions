/**
 * Copyright (c) 2019, WSO2 Inc. (http://www.wso2.org)  Apache License, Version 2.0  http://www.apache.org/licenses/LICENSE-2.0
 */
define([
  "require",
  "jquery",
  "lodash",
  "backbone",
  "command",
  "app/tab/service-tab",
  'event_simulator',
  'nano_scroller',
  "app/output-console/service-console-list-manager",
], function (
  require,
  $,
  _,
  Backbone,
  CommandManager,
  ServiceTab,
  EventSimulator,
  NanoScroller,
  OutputController
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
        this.commandManager = new CommandManager(this);
        var app = {};
        app.commandManager = this.commandManager;
        app.utils = this.utils;

        var eventSimulatorOpts = _.get(this.config, "event_simulator");
        _.set(eventSimulatorOpts, 'application', this);
        this.eventSimulator = new EventSimulator(eventSimulatorOpts);
        this.eventSimulator.stopRunningSimulations();

      },

      render: function () {
        this.eventSimulator.render();
      },

      getOperatingSystem: function () {
        var operatingSystem = "Unknown OS";
        if (navigator.appVersion.indexOf("Win") != -1) {
          operatingSystem = "Windows";
        } else if (navigator.appVersion.indexOf("Mac") != -1) {
          operatingSystem = "MacOS";
        } else if (navigator.appVersion.indexOf("X11") != -1) {
          operatingSystem = "UNIX";
        } else if (navigator.appVersion.indexOf("Linux") != -1) {
          operatingSystem = "Linux";
        }
        return operatingSystem;
      },

      isRunningOnMacOS: function () {
        return _.isEqual(this.getOperatingSystem(), "MacOS");
      },

      getPathSeperator: function () {
        if (this.pathSeparator != undefined) {
          return this.pathSeparator;
        } else {
          this.pathSeparator =
            this.workspaceExplorer._serviceClient.readPathSeparator();
          return this.pathSeparator;
        }
      },

      applicationConstants: function () {
        var constants = {
          messageLinkType: {
            OutOnly: 1,
            InOut: 2,
          },
        };

        return constants;
      },
    }
  );

  return Application;
});
