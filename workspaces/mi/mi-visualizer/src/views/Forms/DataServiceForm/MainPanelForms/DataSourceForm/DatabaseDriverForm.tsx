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
import { FormGroup, Button, CheckBox, FormActions, Codicon, ProgressRing, Alert } from "@wso2/ui-toolkit";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import styled from "@emotion/styled";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";

const BrowseBtn = styled(VSCodeButton)`
    width: fit-content;
`;

export interface DatabaseDriverFormProps {
    renderProps: any;
    watch: any;
    setValue: any;
    control: any;
    handleSubmit: any;
    onNext: any;
    onBack: any;
    onSubmit: any;
    isEditDatasource: boolean;
}

export function DatabaseDriverForm(props: DatabaseDriverFormProps) {

    const { rpcClient } = useVisualizerContext();

    const [driverAvailable, setDriverAvailable] = useState("");
    const [isDriverValid, setIsDriverValid] = useState(null);
    const [continueWithoutDriver, setContinueWithoutDriver] = useState(false);
    const [isFetchingDriver, setIsFetchingDriver] = useState(true);

    const isFormValid = continueWithoutDriver || isDriverValid || driverAvailable;
    const className = props.watch('driverClassName') ?? props.watch('rdbms.driverClassName')

    useEffect(() => {
        const fetchDriverData = async () => {
            setIsFetchingDriver(true);
            await fetchDBDriver();
            setIsFetchingDriver(false);
        };
        fetchDriverData();
    }, []);

    useEffect(() => {
        if (props.watch('rdbms.useSecretAlias')) {
            props.setValue('rdbms.password', '');
        } else {
            props.setValue('rdbms.secretAlias', '');
        }
    }, [props.watch('rdbms.useSecretAlias')]);

    const fetchDBDriver = async () => {
        const dbDriverResponse = await rpcClient.getMiDiagramRpcClient().checkDBDriver(className);
        setDriverAvailable(dbDriverResponse.isDriverAvailable ? dbDriverResponse.driverVersion : "");
    };

    const handleAddDriver = async () => {
        const driveDir = await handleDriverDirSelection();
        if (driveDir) {
            const driverPath = await rpcClient.getMiDiagramRpcClient().addDriverToLib({ url: driveDir });
            const validDriverAdded = await rpcClient.getMiDiagramRpcClient().addDBDriver({
                addDriverPath: driverPath.path,
                removeDriverPath: "",
                className: className
            });
            setIsDriverValid(validDriverAdded);
            if (validDriverAdded) {
                const dbDriverResponse = await rpcClient.getMiDiagramRpcClient().checkDBDriver(className);
                setDriverAvailable(dbDriverResponse.isDriverAvailable ? dbDriverResponse.driverVersion : "");
            }
        }
    }

    const handleDriverDirSelection = async () => {
        const projectDirectory = await rpcClient.getMiDiagramRpcClient().askDriverPath();
        props.setValue("driverPath", projectDirectory.path);
        return projectDirectory.path;
    }

    const removeDriver = async () => {
        const currentDriverPath = (await rpcClient.getMiDiagramRpcClient().checkDBDriver(className)).driverPath;
        const removeResponse = await rpcClient.getMiDiagramRpcClient().removeDBDriver({
            addDriverPath: "",
            removeDriverPath: currentDriverPath,
            className: ""
        });
        if (removeResponse) {
            await rpcClient.getMiDiagramRpcClient().deleteDriverFromLib({ url: currentDriverPath });
            props.setValue("driverPath", null);
            setDriverAvailable("");
            isDriverValid(null);
        }
    }

    const removeInvalidDriver = async () => {
        await rpcClient.getMiDiagramRpcClient().deleteDriverFromLib({ url: props.watch('driverPath') });
        props.setValue("driverPath", null);
        setIsDriverValid(null);
    }

    const modifyDriver = async () => {
        const currentDriverPath = (await rpcClient.getMiDiagramRpcClient().checkDBDriver(className)).driverPath;
        const newDriverPath = await handleDriverDirSelection();
        const newDriverLibPath = (await rpcClient.getMiDiagramRpcClient().addDriverToLib({ url: newDriverPath })).path;
        if (newDriverPath) {
            const removeResponse = await rpcClient.getMiDiagramRpcClient().modifyDBDriver({
                addDriverPath: newDriverLibPath,
                removeDriverPath: currentDriverPath,
                className: className
            });

            await rpcClient.getMiDiagramRpcClient().deleteDriverFromLib({ url: currentDriverPath });
            setIsDriverValid(removeResponse);

            if (removeResponse) {
                props.setValue("driverPath", newDriverLibPath);
                const dbDriverResponse = await rpcClient.getMiDiagramRpcClient().checkDBDriver(className);
                setDriverAvailable(dbDriverResponse.isDriverAvailable ? dbDriverResponse.driverVersion : "");
            } else {
                setDriverAvailable("");
            }
        }
    }

    return (
        <>
            {isFetchingDriver ? (
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '20px' }}>
                    <ProgressRing />
                </div>
            ) : driverAvailable ? (
                <FormGroup title="Select Database Driver" isCollapsed={continueWithoutDriver}>
                    <span>A driver is available
                        <br />
                        {/* <b>Driver Path:</b> {props.watch('driverPath')} */}
                        <br />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <b>Driver Version: </b> {driverAvailable}
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <BrowseBtn appearance="secondary" id="file-selector-btn" onClick={modifyDriver}>
                                    {<Codicon name="edit" iconSx={{ fontSize: 15, color: "green" }} />}
                                </BrowseBtn>
                                <Button
                                    appearance="secondary"
                                    onClick={removeDriver}
                                    disabled={!driverAvailable}
                                >
                                    <Codicon name="trash" iconSx={{ fontSize: 15, color: "red" }} />
                                </Button>
                            </div>
                        </div>
                        <br />
                    </span>
                </FormGroup>
            ) : (
                <>
                    <FormGroup title="Select Database Driver" isCollapsed={continueWithoutDriver}>
                        {isDriverValid === false ? (
                            <>
                                <span>Error!</span>
                                <span>The database driver selected does not contain the relevant driver
                                    class of the datasource</span>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <Button
                                        appearance="secondary"
                                        onClick={removeInvalidDriver}>
                                        Remove
                                    </Button>
                                </div>
                            </>
                        ) :
                            <>
                                <Button
                                    appearance="primary"
                                    onClick={handleAddDriver}>
                                    Select Driver Location
                                </Button>
                                <Alert
                                    subTitle={
                                        "These drivers will only be used in the developer environment to enhance the developer experience and therefore make sure to add them to the production environment when deploying the carbon application."
                                    }
                                    title={"Note: "}
                                    variant="secondary"
                                />
                            </>
                        }
                    </FormGroup>
                    {isDriverValid === null && (
                        <CheckBox
                            checked={continueWithoutDriver}
                            label={"Continue without any database driver"}
                            onChange={(checked) => {
                                setContinueWithoutDriver(checked);
                            }}
                        />
                    )}
                    {continueWithoutDriver && (
                        <>
                            <Alert
                                subTitle={
                                    "You will not be able to test the database connection and perform resource generation for data services such inbuilt features as the relevant drivers does not exist in the developer environment."
                                }
                                title={"Note: "}
                                variant="warning"
                            />
                        </>
                    )}
                </>
            )}

            <FormActions>
                <Button
                    appearance="secondary"
                    onClick={props.onBack}>
                    Back
                </Button>
                <Button
                    appearance="primary"
                    onClick={continueWithoutDriver ? props.handleSubmit(props.onSubmit) : props.onNext}
                    disabled={!isFormValid}
                >
                    {continueWithoutDriver ? (props.isEditDatasource ? "Update" : "Create") : 'Next'}
                </Button>
            </FormActions>
        </>
    );
}
