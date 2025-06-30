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

import React from "react";
import SwaggerUI from "swagger-ui-react";
import { parse } from "yaml";
import { View } from "./components/View";
import '@wso2/ui-toolkit/src/styles/swagger/main.scss';
import { SwaggerData, Request, Response } from "@wso2/mi-core";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import styled from "@emotion/styled";

interface SwaggerPanelProps {
    swaggerData?: SwaggerData
}

const ViewWrapper = styled.div({
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'scroll',
});

export function SwaggerPanel(props: SwaggerPanelProps) {
    const { rpcClient } = useVisualizerContext();
    const { generatedSwagger, port } = props?.swaggerData;

    const proxy = `http://localhost:${port}/`;

    const openapiSpec = parse(generatedSwagger);
    let response: Response;

    async function requestInterceptor(req: any) {
        const request: Request = {
            url: req.url,
            method: req.method,
            headers: req.headers,
            body: req.body,
        }

        const proxyResponse = await rpcClient.getMiVisualizerRpcClient()
            .sendSwaggerProxyRequest({ command: 'swaggerRequest', request: request }).then((swaggerReponse) => {
                if (swaggerReponse?.isResponse && swaggerReponse?.response !== undefined) {
                    response = swaggerReponse.response;
                    req.url = proxy;
                    return req;
                }
            });

        if (proxyResponse) {
            req.url = proxy;
            return req;
        }
    }

    function responseInterceptor(res: any) {
        res.ok = true;
        res.status = response.status;
        res.statusText = response.statusText;
        res.text = response.text;
        res.data = response.data;
        res.body = response.body;
        res.obj = response.obj;
        res.headers = response.headers;
        delete res.parseError
        return res;
    }

    return (
        <ViewWrapper>
            <div style={{ padding:'20px', height: '100%' }}>
                <SwaggerUI requestInterceptor={requestInterceptor}
                    responseInterceptor={responseInterceptor} spec={openapiSpec} showMutatedRequest={false} />
            </div>
        </ViewWrapper>
    );
}
