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

import styled from '@emotion/styled';
import { CheckBox, Dropdown, TextField } from '@wso2/ui-toolkit';

const Container = styled.div({
    marginBottom: "20px",
})

const ParamField = ({ field, id, stateValue, handleOnChange, handleOnError }: any) => {
    const { name, type, value, items } = field;

    const getParameterName = (id: string) => {
        return id.split(".").map((word: string) =>
            word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
    }

    return (
        <Container>
            {type === "text" ? (
                <TextField
                    value={stateValue ?? value ?? ""}
                    id={id}
                    label={name ?? getParameterName(id)}
                    onTextChange={(text: string) => handleOnChange(id, text)}
                    errorMsg={handleOnError ? handleOnError(id) : undefined}
                />
            ) : type === "checkbox" ? (
                <CheckBox
                    label={name ?? getParameterName(id)}
                    value={stateValue ?? value}
                    checked={!!(stateValue ?? value)}
                    onChange={(checked: boolean) => handleOnChange(id, checked)}
                />
            ) : type === "dropdown" ? (
                <>
                    <span>{name ?? getParameterName(id)}</span>
                    <Dropdown
                        id={id}
                        value={stateValue ?? value}
                        onValueChange={(text: string) => handleOnChange(id, text)}
                        items={items}
                    />
                </>
            ) : <></>}
        </Container>
    );
};

export default ParamField;
