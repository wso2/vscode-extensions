/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { ReactNode } from "react";
import { ENDPOINTS, MEDIATORS } from "../../constants";
import { Icon } from "@wso2/ui-toolkit";

export function getMostPopularIconColor() {
    return "#ff7f36";
}

export function getMediatorIconsFromFont(mediator: string, isMostPopular?: boolean) {
    let icon: ReactNode = null;
    let color: string;

    // get icon color
    switch (mediator?.toLowerCase()) {
        case MEDIATORS.LOG.toLowerCase():
        case MEDIATORS.RESPOND.toLowerCase():
        case MEDIATORS.PROPERTY.toLowerCase():
        case MEDIATORS.VARIABLE.toLowerCase():
        case MEDIATORS.DROP.toLowerCase():
        case MEDIATORS.SEQUENCE.toLowerCase():
        case "target":    
        case MEDIATORS.RESOURCE.toLowerCase():
        case MEDIATORS.CACHE.toLowerCase():
        case MEDIATORS.THROTTLE.toLowerCase():
        case MEDIATORS.STORE.toLowerCase():
        case MEDIATORS.THROWERROR.toLowerCase():
            color = "#3e97d3";
            break;

        case MEDIATORS.PAYLOAD.toLowerCase():
        case MEDIATORS.DATAMAPPER.toLowerCase():
        case MEDIATORS.XSLT.toLowerCase():
        case MEDIATORS.ENRICH.toLowerCase():
        case MEDIATORS.HEADER.toLowerCase():
        case MEDIATORS.JSONTRANSFORM.toLowerCase():
        case MEDIATORS.FAULT.toLowerCase():
            color = "#955ba5";
            break;

        case MEDIATORS.FILTER.toLowerCase():
        case MEDIATORS.SWITCH.toLowerCase():
        case MEDIATORS.SCATTERGATHER.toLowerCase():
        case MEDIATORS.FOREACHMEDIATOR.toLowerCase():
        case MEDIATORS.VALIDATE.toLowerCase():
            color = "#26b99a";
            break;

        case MEDIATORS.CLASS.toLowerCase():
        case MEDIATORS.SCRIPT.toLowerCase():
            color = "#ff69d0";
            break;

        case MEDIATORS.DATASERVICECALL.toLowerCase():
        case MEDIATORS.DBLOOKUP.toLowerCase():
        case MEDIATORS.DBREPORT.toLowerCase():
            color = "#8ddefb";
            break;

        case MEDIATORS.SEND.toLowerCase():
        case MEDIATORS.CALLOUT.toLowerCase():
        case MEDIATORS.SMOOKS.toLowerCase():
        case MEDIATORS.TRANSACTION.toLowerCase():
        case MEDIATORS.BUILDER.toLowerCase():
        case MEDIATORS.RULE.toLowerCase():
        case MEDIATORS.LOOPBACK.toLowerCase():
        case MEDIATORS.PUBLISHEVENT.toLowerCase():
        case MEDIATORS.FASTXSLT.toLowerCase():
        case MEDIATORS.REWRITE.toLowerCase():
        case MEDIATORS.XQUERY.toLowerCase():
        case MEDIATORS.EVENT.toLowerCase():
        case MEDIATORS.ENQUEUE.toLowerCase():
        case MEDIATORS.BEAN.toLowerCase():
        case MEDIATORS.COMMAND.toLowerCase():
        case MEDIATORS.EJB.toLowerCase():
        case MEDIATORS.SPRING.toLowerCase():
        case MEDIATORS.CONDITIONALROUTER.toLowerCase():
        case MEDIATORS.BAM.toLowerCase():
        case MEDIATORS.CLONE.toLowerCase():
        case MEDIATORS.ITERATE.toLowerCase():
        case MEDIATORS.AGGREGATE.toLowerCase():
        case MEDIATORS.PROPERTYGROUP.toLowerCase():
        case MEDIATORS.CALL.toLowerCase():
        case MEDIATORS.CALLTEMPLATE.toLowerCase():
        case MEDIATORS.ENTITLEMENT.toLowerCase():
        case MEDIATORS.OAUTH.toLowerCase():
        case MEDIATORS.NTLM.toLowerCase():
            color = "#e0e0d8";
            break;
        default:
            color = "#FFB02E";
    }

    if (isMostPopular) {
        color = getMostPopularIconColor();
    }

    // get Mediators
    switch (mediator?.toLowerCase()) {
        case MEDIATORS.AGGREGATE.toLowerCase():
            icon = (<Icon name="Aggregate" sx={{ height: 25, width: 25, fontSize: 23, color: color }} />);
            break;
        case MEDIATORS.BUILDER.toLowerCase():
            icon = (<Icon name="Builder" sx={{ height: 25, width: 25, fontSize: 22, color: color }} />);
            break;
        case MEDIATORS.CACHE.toLowerCase():
            icon = (<Icon name="Cache" sx={{ height: 30, width: 25, fontSize: 25, color: color }} />);
            break;
        case MEDIATORS.CALL.toLowerCase():
            icon = (<Icon name="Call" sx={{ height: 27, width: 25, fontSize: 24, color: color }} />);
            break;
        case MEDIATORS.CALLOUT.toLowerCase():
            icon = (<Icon name="Callout" sx={{ height: 25, width: 25, fontSize: 22, color: color }} />);
            break;
        case MEDIATORS.CALLTEMPLATE.toLowerCase():
            icon = (<Icon name="CallTemplate" sx={{ height: 30, width: 25, fontSize: 25, color: color }} />);
            break;
        case MEDIATORS.CLONE.toLowerCase():
            icon = (<Icon name="Clone" sx={{ height: 25, width: 25, fontSize: 24, color: color }} />);
            break;
        case MEDIATORS.SCATTERGATHER.toLowerCase():
            icon = (<Icon name="ScatterGather" sx={{ height: 25, width: 25, fontSize: 24, color: color }} />);
            break;
        case MEDIATORS.DATAMAPPER.toLowerCase():
            icon = (<Icon name="dataMapper" sx={{ height: 25, width: 25, fontSize: 24, color: color }} />);
            break;
        case MEDIATORS.DATASERVICECALL.toLowerCase():
            icon = (<Icon name="DataServiceCall" sx={{ height: 32, width: 25, fontSize: 25, color: color }} />);
            break;
        case MEDIATORS.DBLOOKUP.toLowerCase():
            icon = (<Icon name="DBLookup" sx={{ height: 25, width: 25, fontSize: 23, color: color }} />);
            break;
        case MEDIATORS.DBREPORT.toLowerCase():
            icon = (<Icon name="DBReport" sx={{ height: 25, width: 25, fontSize: 23, color: color }} />);
            break;
        case MEDIATORS.DROP.toLowerCase():
            icon = (<Icon name="Drop" sx={{ height: 35, width: 25, fontSize: 25, color: color }} />);
            break;
        case MEDIATORS.ENRICH.toLowerCase():
            icon = (<Icon name="Enrich" sx={{ height: 30, width: 25, fontSize: 25, color: color }} />);
            break;
        case MEDIATORS.ENTITLEMENT.toLowerCase():
            icon = (<Icon name="Entitlement" sx={{ height: 25, width: 25, fontSize: 24, color: color }} />);
            break;
        case MEDIATORS.FASTXSLT.toLowerCase():
            icon = (<Icon name="FastXSLT" sx={{ height: 25, width: 25, fontSize: 23, color: color }} />);
            break;
        case MEDIATORS.FAULT.toLowerCase():
            icon = (<Icon name="Fault" sx={{ height: 30, width: 25, fontSize: 25, color: color }} />);
            break;
        case MEDIATORS.FILTER.toLowerCase():
            icon = (<Icon name="Filter" sx={{ height: 25, width: 25, fontSize: 23, color: color }} />);
            break;
        case MEDIATORS.FOREACHMEDIATOR.toLowerCase():
            icon = (<Icon name="ForEach" sx={{ height: 25, width: 25, fontSize: 24, color: color }} />);
            break;
        case MEDIATORS.HEADER.toLowerCase():
            icon = (<Icon name="header" sx={{ height: 25, width: 25, fontSize: 23, color: color }} />);
            break;
        case MEDIATORS.ITERATE.toLowerCase():
            icon = (<Icon name="Iterate" sx={{ height: 30, width: 25, fontSize: 25, color: color }} />);
            break;
        case MEDIATORS.JSONTRANSFORM.toLowerCase():
            icon = (<Icon name="JSONTransform" sx={{ height: 30, width: 25, fontSize: 25, color: color }} />);
            break;
        case MEDIATORS.LOG.toLowerCase():
            icon = (<Icon name="Log" sx={{ height: 25, width: 25, fontSize: 25, color: color }} />);
            break;
        case MEDIATORS.LOOPBACK.toLowerCase():
            icon = (<Icon name="LoopBack" sx={{ height: 30, width: 25, fontSize: 25, color: color }} />);
            break;
        case MEDIATORS.NTLM.toLowerCase():
            icon = (<Icon name="NTLM" sx={{ height: 25, width: 25, fontSize: 22, color: color }} />);
            break;
        case MEDIATORS.OAUTH.toLowerCase():
            icon = (<Icon name="OAuth" sx={{ height: 32, width: 25, fontSize: 25, color: color }} />);
            break;
        case MEDIATORS.PAYLOAD.toLowerCase():
            icon = (<Icon name="PayloadFactory" sx={{ height: 27, width: 25, fontSize: 24, color: color }} />);
            break;
        case MEDIATORS.PROPERTY.toLowerCase():
            icon = (<Icon name="Property" sx={{ height: 30, width: 25, fontSize: 25, color: color }} />);
            break;
        case MEDIATORS.VARIABLE.toLowerCase():
            icon = (<Icon name="Variable" sx={{ height: 27, width: 27, fontSize: 27, color: color }} />);
            break;
        case MEDIATORS.PROPERTYGROUP.toLowerCase():
            icon = (<Icon name="PropertyGroup" sx={{ height: 30, width: 25, fontSize: 25, color: color }} />);
            break;
        case MEDIATORS.PUBLISHEVENT.toLowerCase():
            icon = (<Icon name="PublishEvent" sx={{ height: 30, width: 25, fontSize: 25, color: color }} />);
            break;
        case MEDIATORS.RESPOND.toLowerCase():
            icon = (<Icon name="Respond" sx={{ height: 25, width: 25, fontSize: 25, color: color }} />);
            break;
        case MEDIATORS.REWRITE.toLowerCase():
            icon = (<Icon name="URLRewrite" sx={{ height: 25, width: 25, fontSize: 23, color: color }} />);
            break;
        case MEDIATORS.RULE.toLowerCase():
            icon = (<Icon name="Rule" sx={{ height: 25, width: 25, fontSize: 23, color: color }} />);
            break;
        case MEDIATORS.SEND.toLowerCase():
            icon = (<Icon name="Send" sx={{ height: 30, width: 25, fontSize: 25, color: color }} />);
            break;
        case MEDIATORS.SEQUENCE.toLowerCase():
        case MEDIATORS.RESOURCE.toLowerCase():
        case "target":
            icon = (<Icon name="CallSequence" sx={{ height: 25, width: 25, fontSize: 25, color: color }} />);
            break;
        case MEDIATORS.SMOOKS.toLowerCase():
            icon = (<Icon name="Smooks" sx={{ height: 25, width: 25, fontSize: 22, color: color }} />);
            break;
        case MEDIATORS.STORE.toLowerCase():
            icon = (<Icon name="Store" sx={{ height: 25, width: 25, fontSize: 25, color: color }} />);
            break;
        case MEDIATORS.SWITCH.toLowerCase():
            icon = (<Icon name="Switch" sx={{ height: 30, width: 25, fontSize: 25, color: color }} />);
            break;
        case MEDIATORS.THROTTLE.toLowerCase():
            icon = (<Icon name="Throttle" sx={{ height: 30, width: 25, fontSize: 25, color: color }} />);
            break;
        case MEDIATORS.VALIDATE.toLowerCase():
            icon = (<Icon name="Validate" sx={{ height: 25, width: 25, fontSize: 23, color: color }} />);
            break;
        case MEDIATORS.XQUERY.toLowerCase():
            icon = (<Icon name="XQuery" sx={{ height: 25, width: 25, fontSize: 23, color: color }} />);
            break;
        case MEDIATORS.XSLT.toLowerCase():
            icon = (<Icon name="XSLT" sx={{ height: 25, width: 25, fontSize: 23, color: color }} />);
            break;
        case MEDIATORS.CONDITIONALROUTER.toLowerCase():
            icon = (<Icon name="ConditionalRouter" sx={{ height: 25, width: 25, fontSize: 23, color: color }} />);
            break;
        case MEDIATORS.ENQUEUE.toLowerCase():
            icon = (<Icon name="Enqueue" sx={{ height: 25, width: 25, fontSize: 22, color: color }} />);
            break;
        case MEDIATORS.EVENT.toLowerCase():
            icon = (<Icon name="Event" sx={{ height: 30, width: 25, fontSize: 25, color: color }} />);
            break;
        case MEDIATORS.TRANSACTION.toLowerCase():
            icon = (<Icon name="Transaction" sx={{ height: 30, width: 25, fontSize: 25, color: color }} />);
            break;
        case MEDIATORS.BEAN.toLowerCase():
            icon = (<Icon name="Bean" sx={{ height: 25, width: 25, fontSize: 24, color: color }} />);
            break;
        case MEDIATORS.CLASS.toLowerCase():
            icon = (<Icon name="class-icon" sx={{ height: 25, width: 25, fontSize: 25, color: color }} />);
            break;
        case MEDIATORS.COMMAND.toLowerCase():
            icon = (<Icon name="Command" sx={{ height: 25, width: 25, fontSize: 24, color: color }} />);
            break;
        case MEDIATORS.EJB.toLowerCase():
            icon = (<Icon name="EJB" sx={{ height: 25, width: 25, fontSize: 24, color: color }} />);
            break;
        case MEDIATORS.SCRIPT.toLowerCase():
            icon = (<Icon name="Script" sx={{ height: 28, width: 25, fontSize: 25, color: color }} />);
            break;
        case MEDIATORS.SPRING.toLowerCase():
            icon = (<Icon name="Spring" sx={{ height: 25, width: 25, fontSize: 23, color: color }} />);
            break;
        case MEDIATORS.BAM.toLowerCase():
            icon = (<Icon name="BAM" sx={{ height: 25, width: 25, fontSize: 25, color: color }} />);
            break;
        case MEDIATORS.THROWERROR.toLowerCase():
            icon = (<Icon name="ThrowError" sx={{ height: 25, width: 25, fontSize: 25, color: color }} />);
            break;

        // Endpoints
        case ENDPOINTS.ADDRESS.toLowerCase():
            icon = (<Icon name="AddressEndPoint" sx={{ height: 25, width: 25, fontSize: 25, color: color }} />);
            break;
        case ENDPOINTS.DEFAULT.toLowerCase():
            icon = (<Icon name="DefaultEndPoint" sx={{ height: 25, width: 25, fontSize: 25, color: color }} />);
            break;
        // case ENDPOINTS.FAILOVER.toLowerCase():
        //     icon = require("./FailoverEndpoint.svg");
        //     break;
        case ENDPOINTS.HTTP.toLowerCase():
            icon = (<Icon name="HTTPEndpoint" sx={{ height: 25, width: 25, fontSize: 25, color: color }} />);
            break;
        case ENDPOINTS.LOADBALANCE.toLowerCase():
            icon = (<Icon name="LoadBalanceEndPoint" sx={{ height: 25, width: 25, fontSize: 25, color: color }} />);
            break;
        case ENDPOINTS.NAMED.toLowerCase():
            icon = (<Icon name="NamedEndpoint" sx={{ height: 25, width: 25, fontSize: 25, color: color }} />);
            break;
        default:
            icon = (<Icon name="Default" sx={{ height: 25, width: 25, fontSize: 25, color: color }} />);
    }
    return icon;
}
