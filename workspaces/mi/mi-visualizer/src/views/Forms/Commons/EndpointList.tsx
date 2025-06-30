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

import styled from "@emotion/styled";
import Endpoint from "./Endpoint";

const Container = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: "15px 30px",
    border: "1px solid #e0e0e0",
    borderRadius: "5px",
    marginTop: 20,
});

const HeadingRow = styled.div({
    display: 'grid',
    gridTemplateColumns: '1fr 4fr',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    padding: '10px 0',
    borderBottom: "1px solid #e0e0e0",
});

const CustomLabel = styled.p`
    margin: 10px 0;
`;

const EndpointList = ({ endpoints, setEndpoints, setEndpointUpdated }: any) => {

    const handleEndpointsChange = (index: number, endpoint: any) => {
        const newEndpoints = [...endpoints];
        newEndpoints[index] = { ...endpoint };
        setEndpoints(newEndpoints);
        setEndpointUpdated(true);
    }

    const onEndpointDelete = (index: number) => {
        const newEndpoints = [...endpoints];
        newEndpoints.splice(index, 1);
        setEndpoints(newEndpoints);
        setEndpointUpdated(true);
    }

    return (
        <Container>
            <HeadingRow>
                <span>Type</span>
                <span>Value</span>
            </HeadingRow>
            {endpoints.length > 0 ? endpoints.map((endpoint: any, index: number) => (
                <Endpoint
                    key={index}
                    endpoint={endpoint}
                    handleEndpointChange={handleEndpointsChange}
                    onDeleteClick={onEndpointDelete}
                    index={index}
                    last={endpoints.length - 1}
                />
            )) : (
                <CustomLabel>No Endpoints to display</CustomLabel>
            )}
        </Container>
    )
}

export default EndpointList;
