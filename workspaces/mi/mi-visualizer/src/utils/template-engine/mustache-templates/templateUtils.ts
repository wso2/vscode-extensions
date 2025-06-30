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

import Mustache from "mustache";
import { ARTIFACT_TEMPLATES, DSS_TEMPLATES } from "../../../constants";
import {
    getAddAPIResourceTemplate,
    getEditAPIResourceTemplate,
    getEditProxyTemplate,
    getEditSequenceTemplate,
    getEditAPITemplate,
    getHandlersTemplate,
    getAddAPITemplate
} from "./core/api";
import {
    getAddOperationTemplate,
    getAddResourceTemplate,
    getEditOperationTemplate,
    getEditResourceTemplate,
    getEditDescriptionTemplate,
    getAddQuery
} from "./core/DSS";

export function getXML(name: string, data: { [key: string]: any }) {
    switch (name) {
        case ARTIFACT_TEMPLATES.ADD_API:
            return Mustache.render(getAddAPITemplate(), data);
        case ARTIFACT_TEMPLATES.EDIT_API:
            return Mustache.render(getEditAPITemplate(), data);
        case ARTIFACT_TEMPLATES.ADD_RESOURCE:
            return Mustache.render(getAddAPIResourceTemplate(), data);
        case ARTIFACT_TEMPLATES.EDIT_RESOURCE:
            return Mustache.render(getEditAPIResourceTemplate(), data);
        case ARTIFACT_TEMPLATES.EDIT_SEQUENCE:
            return Mustache.render(getEditSequenceTemplate(), data);
        case ARTIFACT_TEMPLATES.EDIT_PROXY:
            return Mustache.render(getEditProxyTemplate(data.tag), data);    
        case ARTIFACT_TEMPLATES.EDIT_HANDLERS:
            return Mustache.render(getHandlersTemplate(), data);
        case DSS_TEMPLATES.ADD_RESOURCE:
            return Mustache.render(getAddResourceTemplate(), data);
        case DSS_TEMPLATES.EDIT_RESOURCE:
            return Mustache.render(getEditResourceTemplate(), data);
        case DSS_TEMPLATES.ADD_OPERATION:
            return Mustache.render(getAddOperationTemplate(), data);
        case DSS_TEMPLATES.EDIT_OPERATION:
            return Mustache.render(getEditOperationTemplate(), data);
        case DSS_TEMPLATES.EDIT_DESCRIPTION:
            return Mustache.render(getEditDescriptionTemplate(), data);
        case DSS_TEMPLATES.ADD_QUERY:
            return Mustache.render(getAddQuery(), data);
        default:
            return "";
    }
}

