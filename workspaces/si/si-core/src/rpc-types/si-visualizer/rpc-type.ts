/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import {
    OpenExternalRequest,
    OpenExternalResponse,
    OpenViewRequest,
    SetupDetails,
    SetPathRequest,
    PathDetailsResponse,
    DownloadSIRequest,
} from "./types";
import { RequestType, NotificationType } from "vscode-messenger-common";

const _preFix = "si-visualizer";

export const downloadJavaFromSI: RequestType<string, string> = { method: `${_preFix}/downloadJavaFromSI` };
export const downloadSI: RequestType<DownloadSIRequest, string> = { method: `${_preFix}/downloadSI` };
export const openExternal: RequestType<OpenExternalRequest, OpenExternalResponse> = {
    method: `${_preFix}/openExternal`,
};
export const openView: NotificationType<OpenViewRequest> = { method: `${_preFix}/openView` };
export const getSetupDetails: RequestType<void, SetupDetails> = { method: `${_preFix}/getSetupDetails` };
export const selectFolder: RequestType<string, string | undefined> = { method: `${_preFix}/selectFolder` };
export const setPathsInConfiguration: RequestType<SetPathRequest, PathDetailsResponse> = {
    method: `${_preFix}/setPathsInConfiguration`,
};
export const createNewSiddhiFile: RequestType<void, PathDetailsResponse> = { method: `${_preFix}/createNewSiddhiFile` };
export const getEULALicense: RequestType<void, string> = { method: `${_preFix}/getEULALicense` };
