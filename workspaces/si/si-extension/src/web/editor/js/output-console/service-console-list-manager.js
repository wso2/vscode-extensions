/**
 * Copyright (c) 2019, WSO2 Inc. (http://www.wso2.org)  Apache License, Version 2.0  http://www.apache.org/licenses/LICENSE-2.0
 */
define([
  "jquery",
  "lodash",
  "output_console_list",
  "service_console",
], function ($, _, ConsoleList, ServiceConsole) {
  const CONSOLE_TYPE_FORM = "FORM";
  const CONSOLE_TYPE_DEBUG = "DEBUG";
  var OutputConsoleList = ConsoleList.extend(
    /** @lends ConsoleList.prototype */
    {
      initialize: function (options) {
        _.set(options, "consoleModel", ServiceConsole);
        ConsoleList.prototype.initialize.call(this, options);
        this._activateBtn = $(_.get(options, "activateBtn"));
        this._openConsoleBtn = $(_.get(options, "openConsoleBtn"));
        this._closeConsoleBtn = $(_.get(options, "closeConsoleBtn"));
        this._clearConsoleBtn = $(_.get(options, "cleanConsoleBtn"));
        this._reloadConsoleBtn = $(_.get(options, "reloadConsoleBtn"));
        this.application = _.get(options, "application");
        this._options = options;
        var self = this;
        this._activateBtn.on("click", function (e) {
          if (!self.activeConsole || !self.activeConsole.options) {
            return; // or handle the missing console appropriately
          }
          if (self.activeConsole.options._type === "FORM") {
            $(self.activeConsole).trigger("close-button-in-form-clicked");
          } else {
            e.preventDefault();
            e.stopPropagation();
            self.application.commandManager.dispatch(
              _.get(self._options, "command.id")
            );
          }
        });
        this._clearConsoleBtn.on("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          self.application.commandManager.dispatch(
            _.get(self._options, "commandClearConsole.id")
          );
        });
        this._reloadConsoleBtn.on("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
        });
        if (this.application.isRunningOnMacOS()) {
          this._closeConsoleBtn
            .attr(
              "title",
              "Close (" +
                _.get(self._options, "command.shortcuts.mac.label") +
                ") "
            )
            .tooltip();
          this._openConsoleBtn
            .attr(
              "title",
              "Open Console (" +
                _.get(self._options, "command.shortcuts.mac.label") +
                ") "
            )
            .tooltip();
        } else {
          this._closeConsoleBtn
            .attr(
              "title",
              "Close  (" +
                _.get(self._options, "command.shortcuts.other.label") +
                ") "
            )
            .tooltip();
          this._openConsoleBtn
            .attr(
              "title",
              "Open Console  (" +
                _.get(self._options, "command.shortcuts.other.label") +
                ") "
            )
            .tooltip();
        }
        // register command
        this.application.commandManager.registerCommand(options.command.id, {
          shortcuts: options.command.shortcuts,
        });
        this.application.commandManager.registerHandler(
          options.command.id,
          this.toggleOutputConsole,
          this
        );
        this.application.commandManager.registerCommand(
          options.commandClearConsole.id,
          { shortcuts: options.commandClearConsole.shortcuts }
        );
        this.application.commandManager.registerHandler(
          options.commandClearConsole.id,
          this.clearConsole,
          this
        );
      },
      isActive: function () {
        return this._activateBtn.parent("li").hasClass("active");
      },
      toggleOutputConsole: function () {
        var activeTab = this.application.tabController.getActiveTab();
        var file = undefined;
        var console = this.getGlobalConsole();
        var serviceWrapper = $("#service-tabs-wrapper");
        if (console !== undefined) {
          if (this.isActive()) {
            this._activateBtn.parent("li").removeClass("active");
            this.hideAllConsoles();
            if (serviceWrapper.is(".ui-resizable")) {
              serviceWrapper.resizable("destroy");
            }
            if (activeTab._title != "welcome-page") {
              if (activeTab.getSiddhiFileEditor().isInSourceView()) {
                activeTab.getSiddhiFileEditor().getSourceView().editorResize();
              } else {
                ConsoleList.prototype.removePoppedUpElement();
              }
            }
          } else {
            this._activateBtn.parent("li").addClass("active");
            this.showAllConsoles();
          }
        }
      },
      makeInactiveActivateButton: function () {
        if (this.isActive()) {
          this._activateBtn.parent("li").removeClass("active");
        }
      },
      render: function () {
        ConsoleList.prototype.render.call(this);
      },
      setActiveConsole: function (console) {
        ConsoleList.prototype.setActiveConsole.call(this, console);
      },
      addConsole: function (console) {
        ConsoleList.prototype.addConsole.call(this, console);
      },
      removeConsole: function (console) {
        if (self.activeConsole.options._type === CONSOLE_TYPE_FORM) {
          $(self.activeConsole).trigger("close-button-in-form-clicked");
        } else {
          var commandManager = _.get(
            this,
            "options.application.commandManager"
          );
          var self = this;
          var remove = function () {
            ConsoleList.prototype.removeConsole.call(self, console);
            if (console instanceof ServiceConsole) {
              console.trigger("console-removed");
            }
          };

          remove();
        }
      },
      newConsole: function (opts) {
        var options = opts || {};
        return ConsoleList.prototype.newConsole.call(this, options);
      },
      getBrowserStorage: function () {},
      hasFilesInWorkingSet: function () {
        return !_.isEmpty(this._workingFileSet);
      },
      getConsoleForType: function (type, uniqueId) {
        return _.find(this._consoles, function (console) {
          if (type === CONSOLE_TYPE_DEBUG) {
            if (console._uniqueId === uniqueId) {
              return console;
            }
          } else if (type === CONSOLE_TYPE_FORM) {
            if (console._uniqueId === uniqueId) {
              return console;
            }
          } else {
            if (console.getType() === type) {
              return console;
            }
          }
        });
      },
      hideAllConsoles: function () {
        ConsoleList.prototype.hideConsoleComponents.call(this);
        this._activateBtn.parent("li").removeClass("active");
      },
      showAllConsoles: function () {
        ConsoleList.prototype.showConsoleComponents.call(this);
      },
      showConsoleByTitle: function (title, type) {
        ConsoleList.prototype.enableConsoleByTitle.call(this, title, type);
      },
      getConsoleActivateBtn: function () {
        return this._activateBtn;
      },
      clearConsole: function () {
        var console =
          this._options.application.outputController.getGlobalConsole();
        console.clear();
      },
    }
  );
  return OutputConsoleList;
});

/**
 *enable the reconnect button when  backend is unavailable.
 * @param link
 */
var enableLink = function (link) {
  link.removeAttribute("style");
  link.classList.remove("console-sync-btn-disable");
  link.href = link.getAttribute("data-href");
  link.removeAttribute("aria-disabled");
};

/**
 *disable the reconnect button when backend is available.
 * @param link
 */
var disableLink = function (link) {
  link.classList.add("console-sync-btn-disable");
  link.setAttribute("style", "color: rgb(80, 80, 80)");
  link.setAttribute("data-href", link.href);
  link.href = "";
  link.setAttribute("aria-disabled", "true");
};
