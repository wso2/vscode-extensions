/**
 * Copyright (c) 2019, WSO2 Inc. (http://www.wso2.org)  Apache License, Version 2.0  http://www.apache.org/licenses/LICENSE-2.0
 */
requirejs.config({
    baseUrl: 'editor',
    paths: {
        lib: `${extensionPath}/editor/commons/lib`,
        app: `${extensionPath}/editor/js`,
        commons_app: `${extensionPath}/editor/commons`,
        /////////////////////////
        // third party modules //
        ////////////////////////
        remarkable:`${extensionPath}/editor/commons/lib/remarkable/remarkable.min`,
        handlebar: `${extensionPath}/editor/commons/lib/handlebar/handlebars-v4.0.11.min`,
        jquery: `${extensionPath}/editor/commons/lib/jquery_v1.9.1/jquery-1.9.1.min`,
        yaml: `${extensionPath}/editor/commons/lib/js-yaml/js-yaml`,
        jquery_ui: `${extensionPath}/editor/commons/lib/jquery-ui_v1.12.1/jquery-ui.min`,
        bootstrap: `${extensionPath}/editor/commons/lib/theme-wso2-2.0.0/js/bootstrap.min`,
        dagre: `${extensionPath}/editor/commons/lib/dagre-0.7.4/dagre.min`,
        dragSelect: `${extensionPath}/editor/commons/lib/dragSelect/ds.min`,
        jquery_validate: `${extensionPath}/editor/commons/lib/jquery_validate/jquery.validate.min`,
        jquery_timepicker: `${extensionPath}/editor/commons/lib/jquery_timepicker/jquery-ui-timepicker-addon.min`,
        log4javascript: `${extensionPath}/editor/commons/lib/log4javascript-1.4.13/log4javascript`,
        lodash: `${extensionPath}/editor/commons/lib/lodash_v4.13.1/lodash.min`,
        backbone: `${extensionPath}/editor/commons/lib/backbone_v1.3.3/backbone.min`,
        file_saver: `${extensionPath}/editor/commons/lib/file_saver/FileSaver`,
        mousetrap: `${extensionPath}/editor/commons/lib/mousetrap_v1.6.0/mousetrap.min`,
        jquery_mousewheel: `${extensionPath}/editor/commons/lib/jquery-mousewheel_v3.1.13/jquery.mousewheel.min`,
        jquery_context_menu: `${extensionPath}/editor/commons/lib/context-menu_v2.4.2/jquery.contextMenu.min`,
        js_tree: `${extensionPath}/editor/commons/lib/js-tree-v3.3.8/jstree.min`,
        render_json: `${extensionPath}/editor/commons/lib/renderjson/renderjson`,
        nano_scroller: `${extensionPath}/editor/commons/lib/nanoscroller_0.8.7/jquery.nanoscroller.min`,
        perfect_scrollbar: `${extensionPath}/editor/commons/lib/perfect-scrollbar-1.4.0/perfect-scrollbar.min`,
        theme_wso2: `${extensionPath}/editor/commons/lib/theme-wso2-2.0.0/js/theme-wso2.min`,
        ace: `${extensionPath}/editor/commons/lib/ace-editor`,
        overlay_scroller: `${extensionPath}/editor/commons/lib/overlay_scroll/js/jquery.overlayScrollbars.min`,
        datatables: `${extensionPath}/editor/commons/lib/data-table/jquery.dataTables.min`,
        datatables_bootstrap: `${extensionPath}/editor/commons/lib/data-table/dataTables.bootstrap.min`,
        datatables_wso2: `${extensionPath}/editor/commons/lib/theme-wso2-2.0.0/extensions/datatables/js/dataTables.wso2`,
        enjoyhint: `${extensionPath}/editor/commons/lib/enjoyhint/enjoyhint.min`,
        smart_wizard: `${extensionPath}/editor/commons/lib/smartWizard/js/jquery.smartWizard.min`,
        pagination: `${extensionPath}/editor/commons/lib/pagination/pagination.min`,
        cronstrue: `${extensionPath}/editor/commons/lib/cronstrue/cronstrue.min`,

        //beautify: `${extensionPath}/editor/commons/lib/beautify`,
        ///////////////////////
        // custom modules ////
        //////////////////////
        output_console_list: `${extensionPath}/editor/js/output-console/console-list`,
        console: `${extensionPath}/editor/js/output-console/console`,
        service_console: `${extensionPath}/editor/js/output-console/service-console-manager`,
        log: `${extensionPath}/editor/commons/js/log/log`,
        tool_palette: `${extensionPath}/editor/js/design-view/tool-palette`,
        tab: `${extensionPath}/editor/js/tab/`,
        toolEditor: `${extensionPath}/editor/js/tool-editor/module`,
        command: `${extensionPath}/editor/commons/js/command/command`,
        alerts: `${extensionPath}/editor/commons/js/utils/alerts`,
        design_view: `${extensionPath}/editor/js/design-view/design-view`,
        initialiseData: `${extensionPath}/editor/js/design-view/initialise-data`,
        jsonValidator: `${extensionPath}/editor/js/design-view/JSON-validator`,
        designViewGrid: `${extensionPath}/editor/js/design-view/design-grid`,
        designViewUtils: `${extensionPath}/editor/js/design-view/util/design-view-utils`,
        dropElements: `${extensionPath}/editor/js/design-view/drop-elements`,
        configurationData: `${extensionPath}/editor/js/design-view/configuration-data/configuration-data`,
        appData: `${extensionPath}/editor/js/design-view/configuration-data/app-data`,
        elementUtils: `${extensionPath}/editor/js/design-view/elements/element-utils`,
        formBuilder: `${extensionPath}/editor/js/design-view/form-builder/form-builder`,
        formUtils: `${extensionPath}/editor/js/design-view/form-builder/form-utils`,
        sourceForm: `${extensionPath}/editor/js/design-view/form-builder/forms/source-form`,
        sinkForm: `${extensionPath}/editor/js/design-view/form-builder/forms/sink-form`,
        streamForm: `${extensionPath}/editor/js/design-view/form-builder/forms/stream-form`,
        tableForm: `${extensionPath}/editor/js/design-view/form-builder/forms/table-form`,
        windowForm: `${extensionPath}/editor/js/design-view/form-builder/forms/window-form`,
        aggregationForm: `${extensionPath}/editor/js/design-view/form-builder/forms/aggregation-form`,
        triggerForm: `${extensionPath}/editor/js/design-view/form-builder/forms/trigger-form`,
        windowFilterProjectionQueryForm: `${extensionPath}/editor/js/design-view/form-builder/forms/window-filter-projection-query-form`,
        patternQueryForm: `${extensionPath}/editor/js/design-view/form-builder/forms/pattern-query-form`,
        sequenceQueryForm: `${extensionPath}/editor/js/design-view/form-builder/forms/sequence-query-form`,
        joinQueryForm: `${extensionPath}/editor/js/design-view/form-builder/forms/join-query-form`,
        partitionForm: `${extensionPath}/editor/js/design-view/form-builder/forms/partition-form`,
        functionForm: `${extensionPath}/editor/js/design-view/form-builder/forms/function-form`,
        appAnnotationForm: `${extensionPath}/editor/js/design-view/form-builder/forms/app-annotation-form`,
        guide: `${extensionPath}/editor/js/guide/guide`,
        utils: `${extensionPath}/editor/commons/js/utils/utils`,
        // element data holding objects starts here
        // annotations
        sourceOrSinkAnnotation: `${extensionPath}/editor/js/design-view/elements/annotations/source-or-sink-annotation`,
        mapAnnotation: `${extensionPath}/editor/js/design-view/elements/annotations/map`,
        storeAnnotation: `${extensionPath}/editor/js/design-view/elements/annotations/store-annotation`,
        payloadOrAttribute: `${extensionPath}/editor/js/design-view/elements/annotations/source-or-sink-annotation-sub-elements/payload-or-attribute`,
        annotationObject: `${extensionPath}/editor/js/design-view/elements/annotation-object`,
        annotationElement: `${extensionPath}/editor/js/design-view/elements/annotation-element`,
        // definitions
        stream: `${extensionPath}/editor/js/design-view/elements/definitions/stream`,
        table: `${extensionPath}/editor/js/design-view/elements/definitions/table`,
        window: `${extensionPath}/editor/js/design-view/elements/definitions/window`,
        trigger: `${extensionPath}/editor/js/design-view/elements/definitions/trigger`,
        aggregation: `${extensionPath}/editor/js/design-view/elements/definitions/aggregation`,
        functionDefinition: `${extensionPath}/editor/js/design-view/elements/definitions/function`,
        aggregateByTimePeriod: `${extensionPath}/editor/js/design-view/elements/definitions/aggregation-definition-sub-elements/aggregate-by-time-period`,
        // query sub elements
        querySelect: `${extensionPath}/editor/js/design-view/elements/queries/query-sub-elements/query-select/query-select`,
        queryOrderByValue: `${extensionPath}/editor/js/design-view/elements/queries/query-sub-elements/query-orderBy/query-orderBy-value`,
        queryOutput: `${extensionPath}/editor/js/design-view/elements/queries/query-sub-elements/query-output/query-output`,
        queryOutputInsert: `${extensionPath}/editor/js/design-view/elements/queries/query-sub-elements/query-output/query-output-types/query-output-insert`,
        queryOutputDelete: `${extensionPath}/editor/js/design-view/elements/queries/query-sub-elements/query-output/query-output-types/query-output-delete`,
        queryOutputUpdate: `${extensionPath}/editor/js/design-view/elements/queries/query-sub-elements/query-output/query-output-types/query-output-update`,
        queryOutputUpdateOrInsertInto: `${extensionPath}/editor/js/design-view/elements/queries/query-sub-elements/query-output/query-output-types/query-output-update-or-insert-into`,
        // queries
        joinQuerySource: `${extensionPath}/editor/js/design-view/elements/queries/query-sub-elements/query-input/join-query-input/sub-elements/join-query-source`,
        joinQueryInput: `${extensionPath}/editor/js/design-view/elements/queries/query-sub-elements/query-input/join-query-input/join-query-input`,
        partition: `${extensionPath}/editor/js/design-view/elements/partitions/partition`,
        partitionWith: `${extensionPath}/editor/js/design-view/elements/partitions/partition-sub-elements/partition-with`,
        patternOrSequenceQueryInput: `${extensionPath}/editor/js/design-view/elements/queries/query-sub-elements/query-input/pattern-or-sequence-query-input/pattern-or-sequence-query-input`,
        patternOrSequenceQueryCondition: `${extensionPath}/editor/js/design-view/elements/queries/query-sub-elements/query-input/pattern-or-sequence-query-input/sub-elements/pattern-or-sequence-query-condition`,
        windowFilterProjectionQueryInput: `${extensionPath}/editor/js/design-view/elements/queries/query-sub-elements/query-input/window-filter-projection-query/window-filter-projection-query-input`,
        queryWindowOrFunction: `${extensionPath}/editor/js/design-view/elements/queries/query-sub-elements/query-input/query-window-or-function`,
        streamHandler: `${extensionPath}/editor/js/design-view/elements/queries/query-sub-elements/query-input/stream-handler`,
        query: `${extensionPath}/editor/js/design-view/elements/queries/query`,
        edge: `${extensionPath}/editor/js/design-view/configuration-data/edge`,
        annotation: `${extensionPath}/editor/js/design-view/elements/annotation`,
        attribute: `${extensionPath}/editor/js/design-view/elements/attribute`,
        // element data holding objects ends here
        //constants
        constants: `${extensionPath}/editor/js/design-view/constants`,
        guideConstants: `${extensionPath}/editor/js/guide/constants`,
             // ETL Wizard Components  <-- end
        cronGenerator: `${extensionPath}/editor/js/design-view/cron-generator/cron-generator`,
        siddhiElementBrowser: `${extensionPath}/editor/js/async-api/siddhi-element-browser`,

    },
    map: {
        "*": {
            // use lodash instead of underscore
            underscore: "lodash",
            jQuery: "jquery",
            'datatables.net': "datatables"
        }
    },
    packages: [
        {
            name: 'tab',
            location: `${extensionPath}/editor/js/tab`,
            main: 'module'
        },
        {
            name: 'event_simulator',
            location: `${extensionPath}/editor/js/event-simulator`,
            main: 'module'
        },
        {
            name: 'dialogs',
            location: `${extensionPath}/editor/commons/js/dialog`,
            main: 'module'
        },
        {
            name: 'operator_finder',
            location: `${extensionPath}/editor/js/operator-finder`,
            main: 'module'
        }
    ]
});
