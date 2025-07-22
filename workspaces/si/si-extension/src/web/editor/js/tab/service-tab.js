/**
 * Copyright (c) 2019, WSO2 Inc. (http://www.wso2.org)  Apache License, Version 2.0  http://www.apache.org/licenses/LICENSE-2.0
 */
define([
  "require",
  "jquery",
  "lodash",
  "./tab",
  "toolEditor",
], function (require, jquery, _, Tab, ToolEditor) {
  var ServiceTab;

  ServiceTab = Tab.extend({
    initialize: function (options) {
      Tab.prototype.initialize.call(this, options);
      this.app = options.application;
      this.options = options;
      _.set(options.application, "tabId", this.cid);
    },

    render: function () {
      var self = this;
      Tab.prototype.render.call(this);
      var initOpts = _.get(this.options, "editor");
      _.set(initOpts, "container", this.$el.get(0));
      _.set(initOpts, "tabs_container", _.get(this.options, "tabs_container"));
      _.set(initOpts, "application", self.app);

      var toolEditor = new ToolEditor.Views.ToolEditor(initOpts, this.app.vscode);
      this._fileEditor = toolEditor;

      toolEditor.on(
        "dispatch-command",
        function (id) {
          this.app.commandManager.dispatch(id);
        },
        this
      );

      toolEditor.render();

    },

    getSiddhiFileEditor: function () {
      return this._fileEditor;
    },
  });

  return ServiceTab;
});
