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

export const HorizontalListContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
`;

export const HorizontalListItem = styled.div`
    display: flex;
    width: 100%;
    gap: 3px;
    justify-content: space-between;
    align-items: center;
`;

export const HorizontalListItemLeftContent = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;
