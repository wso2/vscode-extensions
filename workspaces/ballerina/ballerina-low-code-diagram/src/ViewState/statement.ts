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
import { FunctionDefinition } from "@wso2/syntax-tree";

import { ActionViewState } from "./action";
import { EndpointViewState } from "./endpoint";
import { SimpleBBox } from "./simple-bbox";
import { ViewState } from "./view-state";

export class StatementViewState extends ViewState {
    public isCallerAction: boolean = false;
    public isAction: boolean = false;
    public isEndpoint: boolean = false;
    public endpoint: EndpointViewState = new EndpointViewState();
    public dataProcess: SimpleBBox = new SimpleBBox();
    public variableName: SimpleBBox = new SimpleBBox();
    public variableAssignment: SimpleBBox = new SimpleBBox();
    public conditionAssignment: SimpleBBox = new SimpleBBox();
    public action: ActionViewState = new ActionViewState();
    public isReached: boolean;
    public isReceive: boolean;
    public isSend: boolean;
    public arrowFrom: 'Left' | 'Right';
    public functionNodeExpanded: boolean;
    public functionNode: FunctionDefinition;
    public parentAction?: boolean;
    public expandOffSet?: number = 0;

    constructor() {
        super();
        this.isAction = false;
        this.isEndpoint = false;
    }

}
