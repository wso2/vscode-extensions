/**
 * Copyright (c) 2019, WSO2 Inc. (http://www.wso2.org)  Apache License, Version 2.0  http://www.apache.org/licenses/LICENSE-2.0
 */
define(['app/main-extension-installer', 'jquery', 'app/common-config'],
    function (Application, $, commonConfig) {

    var app;
    app = new Application(commonConfig);
    app.render();
    $("#tabs-container > div.init-loading-screen").css({"display": "none"});
    $("#tabs-container > div.tab-headers.tab-headers-bar").css({"display": "block"});
    $("#tab-content-wrapper").css({"display": "block"});
});

