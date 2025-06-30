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
import { Dropdown, TextField, Codicon } from "@wso2/ui-toolkit";

const Row = styled.div({
    display: 'grid',
    gridTemplateColumns: '1fr 2fr 1fr 0.2fr',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
}, (props: any) => ({
    paddingTop: 5,
    paddingBottom: props["is-last"] ? 0 : 5,
    borderBottom: props["is-last"] ? 0 : "1px solid #e0e0e0",
}));

const HeadingRow = styled(Row)`
    padding: 10px 0;
    border-bottom: 1px solid #e0e0e0;
`;

const Table = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10;
    padding: 15px 30px;
    border: 1px solid #e0e0e0;
    border-radius: 5px;
    margin-top: 20px;
`;

const CenteredSpan = styled.span`
    text-align: center;
`;

const CustomLabel = styled.p`
    margin: 10px 0;
`;

const PropertiesTable = ({ properties, setProperties }: any) => {
    const scopes = [
        { content: 'Default', value: 'default' },
        { content: 'Transport', value: 'transport' },
        { content: 'Axis2', value: 'axis2' },
        { content: 'Axis2-Client', value: 'axis2-client' },
    ];

    const handlePropertyChange = (index: number, field: string, value: string) => {
        const newProperties = [...properties];
        newProperties[index] = { ...newProperties[index], [field]: value };
        setProperties(newProperties);
    }

    const handlePropertyDelete = (index: number) => {
        const newProperties = [...properties];
        newProperties.splice(index, 1);
        setProperties(newProperties);
    }

    return (
        <div>
            <Table>
                <HeadingRow>
                    <CenteredSpan>Name</CenteredSpan>
                    <CenteredSpan>Value</CenteredSpan>
                    <CenteredSpan>Scope</CenteredSpan>
                    <CenteredSpan>Remove</CenteredSpan>
                </HeadingRow>
                {properties.length > 0 ? properties.map((property: any, index: number) => (
                    <Row is-last={index === properties.length - 1}>
                        <TextField
                            id='property-name'
                            value={property.name}
                            placeholder="Property name"
                            onTextChange={(text: string) => handlePropertyChange(index, "name", text)}
                            sx={{ marginTop: '-2px' }}
                        />
                        <TextField
                            id='property-value'
                            value={property.value}
                            placeholder="Property value"
                            onTextChange={(text: string) => handlePropertyChange(index, "value", text)}
                            sx={{ marginTop: '-2px' }}
                        />
                        <Dropdown
                            id="property-scope"
                            value={property.scope}
                            onValueChange={(text: string) => handlePropertyChange(index, "scope", text)}
                            items={scopes}
                        />
                        <Codicon iconSx={{ fontSize: 18 }} name='trash' onClick={() => handlePropertyDelete(index)} />
                    </Row>
                )) : (
                    <CustomLabel>No Properties to display</CustomLabel>
                )}
            </Table>
        </div>
    )
}

export default PropertiesTable;
