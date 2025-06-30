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
import { useEffect, useState } from "react";
import { TextField, FormCheckBox, FormGroup, Button, FormActions } from "@wso2/ui-toolkit";
import { useVisualizerContext } from "@wso2/mi-rpc-client";

export interface TestConnectionFormProps {
    renderProps: any;
    watch: any;
    setValue: any;
    control: any;
    handleSubmit: any;
    onBack: any;
    onSubmit: any;
    isEditDatasource: boolean;
    fromDatasourceForm?: boolean;
}

export function TestConnectionForm(props: TestConnectionFormProps) {

    const { rpcClient } = useVisualizerContext();

    const [connectionSuccess, setConnectionSuccess] = useState(null);
    const [isEnableURLEdit, setIsEnableURLEdit] = useState(false);

    useEffect(() => {
        if (props.watch('rdbms.useSecretAlias')) {
            props.setValue('rdbms.password', '');
        } else {
            props.setValue('rdbms.secretAlias', '');
        }
    }, [props.watch('rdbms.useSecretAlias')]);

    const testConnection = async (values: any) => {
        const testResponse = await rpcClient.getMiDiagramRpcClient().testDbConnection({
            url: props.watch('url') ?? props.watch('rdbms.url'),
            className: props.watch('driverClassName') ?? props.watch('rdbms.driverClassName'),
            username: props.watch('username') ?? props.watch('rdbms.username'),
            password: props.watch('password') ?? props.watch('rdbms.password'),
            dbName: "",
            dbType: "",
            host: "",
            port: ""
        });

        setConnectionSuccess(testResponse.success);
    }

    const handleModifyURL = () => {
        setIsEnableURLEdit(!isEnableURLEdit);
    }

    return (
        <>
            <FormGroup title="Test Connection" isCollapsed={false}>
                <TextField
                    label="URL"
                    required
                    size={100}
                    disabled={!isEnableURLEdit}
                    {...(props.fromDatasourceForm ? props.renderProps('url') : props.renderProps('rdbms.url'))}
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <Button
                        appearance="secondary"
                        onClick={handleModifyURL}>
                        Modify URL
                    </Button>
                </div>
                <TextField
                    label="Username"
                    size={100}
                    {...(props.fromDatasourceForm ? props.renderProps('username') : props.renderProps('rdbms.username'))}
                />
                <TextField
                    label="Password"
                    size={100}
                    type="password"
                    {...(props.fromDatasourceForm ? props.renderProps('password') : props.renderProps('rdbms.password'))}
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '15px' }}>
                    <Button
                        appearance="secondary"
                        onClick={testConnection}>
                        Test Connection
                    </Button>
                    {connectionSuccess !== null && (
                        connectionSuccess ? (
                            <span style={{ color: 'green' }}>Connection Success!</span>
                        ) : (
                            <span style={{ color: 'red' }}>Connection Failed!</span>
                        )
                    )}
                </div>
            </FormGroup>
            <FormActions>
                <Button
                    appearance="secondary"
                    onClick={props.onBack}>
                    Back
                </Button>
                <Button
                    appearance="primary"
                    onClick={props.handleSubmit(props.onSubmit)}
                >
                    {props.isEditDatasource ? "Update" : "Create"}
                </Button>
            </FormActions>
        </>
    );
}
