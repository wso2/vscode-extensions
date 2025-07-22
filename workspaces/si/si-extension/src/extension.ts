/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import * as vscode from "vscode";
import { activateVisualizer } from './visualizer/activate';
import { activateDebugger } from "./debugger/activate";
import { StateMachine } from "./stateMachine";
import { RPCLayer } from './RPCLayer';
import { extension } from "./SIExtensionContext";

export async function activate(context: vscode.ExtensionContext) {
  extension.context = context;
  RPCLayer.init(); 
  activateDebugger(context);
  activateVisualizer(context);
  StateMachine.initialize();
}
