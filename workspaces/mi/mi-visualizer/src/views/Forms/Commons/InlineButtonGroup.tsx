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
import { Button } from "@wso2/ui-toolkit";

const Container = styled.div({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
});

const ButtonContainer = styled.div({
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10
});

const InlineButtonGroup = ({ label, isHide, onShowHideToggle, addNewFunction, required }: any) => {
    return (
        <Container>
            <b>{label}{required && <span style={{ color: "red" }}>*</span>}</b>
            <ButtonContainer>
                <Button
                    appearance="secondary"
                    onClick={onShowHideToggle}
                >
                    {isHide ? `Hide ${label}` : `Show ${label}`}
                </Button>
                <Button
                    appearance="primary"
                    onClick={addNewFunction}
                >
                    {`Add new ${label.slice(0, label.length - 1)}`}
                </Button>
            </ButtonContainer>
        </Container>
    )
}

export default InlineButtonGroup;
