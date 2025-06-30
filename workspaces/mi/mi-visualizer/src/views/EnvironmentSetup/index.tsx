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

import React, { useEffect, useState } from "react";
import styled from "@emotion/styled";
import { Button, FormGroup, OptionProps, Dropdown } from "@wso2/ui-toolkit";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { DownloadProgressData, EVENT_TYPE, PathDetailsResponse } from "@wso2/mi-core";
import { ButtonWithDescription, DownloadComponent, RuntimeStatus, Row, Column, StepDescription } from "./Components";
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";
import { EULALicenseForm } from "./EULALicense";
import { ProgressRing } from "@wso2/ui-toolkit";

const Container = styled.div`
    display: flex;
    flex-direction: column;
    max-width: 800px;
    height: 90%;
    margin: 2em auto 0;
    padding: 0 32px;
    gap: 32px;
    box-sizing: border-box;
    overflow-y: auto; 

    @media (max-width: 768px) {
        max-width: fit-content;
    }
`;

const TitlePanel = styled.div`
    display: flex;
    flex-direction: column;
`;

const Headline = styled.h1`
    font-size: 2.7em;
    font-weight: 400;
    white-space: nowrap;
`;

const HeadlineSecondary = styled.h2`
    font-size: 1.5em;
    font-weight: 400;
    white-space: nowrap;
`;

const ErrorMessage = styled.div`
    color: red;
`;

const StepContainer = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 20px;
`;

const LoadingContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
    position: fixed;
    top: 0;
    left: 0;
    backdrop-filter: blur(5px);
    background-color: rgba(0, 0, 0, 0.1);
    pointer-events: auto;
    z-index: 1000;
`;


export const EnvironmentSetup = () => {
    const { rpcClient } = useVisualizerContext();
    const [projectUri, setProjectUri] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [recommendedVersions, setRecommendedVersions] = useState<{ miVersion: string, javaVersion: string }>({ miVersion: "", javaVersion: "" });
    const [miVersionStatus, setMiVersionStatus] = useState<"valid" | "valid-not-updated" | "missing" | "not-valid">("not-valid");
    const [isJavaDownloading, setIsJavaDownloading] = useState(false);
    const [isMIDownloading, setIsMIDownloading] = useState(false);
    const [javaProgress, setJavaProgress] = useState<number>(0);
    const [miProgress, setMiProgress] = useState<number>(0);
    const [error, setError] = useState<string>();
    const [javaPathDetails, setJavaPathDetails] = useState<PathDetailsResponse>({ status: "not-valid" });
    const [miPathDetails, setPathDetails] = useState<PathDetailsResponse>({ status: "not-valid" });
    const [supportedMIVersions, setSupportedMIVersions] = useState<OptionProps[]>([]);
    const [selectedRuntimeVersion, setSelectedRuntimeVersion] = useState<string>('');
    const [showDownloadButtons, setShowDownloadButtons] = useState<boolean>(false);
    const [isDownloadUpdatedPack, setIsDownloadUpdatedPack] = useState<boolean>(false);
    const [isLicenseAccepted, setIsLicenseAccepted] = useState<boolean>(false);
    const [showLicense, setShowLicense] = useState<boolean>(false);
    
    useEffect(() => {
        const fetchMIVersionAndSetup = async () => {
            const { projectUri } = await rpcClient.getVisualizerState();
            setProjectUri(projectUri);

            const { recommendedVersions, javaDetails, miDetails, miVersionStatus, showDownloadButtons } =
                await rpcClient.getMiVisualizerRpcClient().getProjectSetupDetails();
            if (miDetails?.version === "4.4.0") {
                setIsDownloadUpdatedPack(true);
            }
            setMiVersionStatus(miVersionStatus);
            if (miVersionStatus === "valid") {
                setRecommendedVersions(recommendedVersions);
                setJavaPathDetails(javaDetails);
                setPathDetails(miDetails);
                setShowDownloadButtons(showDownloadButtons);
            } else {
                const supportedVersions = await rpcClient.getMiVisualizerRpcClient().getSupportedMIVersionsHigherThan('');
                const supportedMIVersions = supportedVersions.map((version: string) => ({ value: version, content: version }));
                setSupportedMIVersions(supportedMIVersions);
                setSelectedRuntimeVersion(supportedMIVersions[0].value);
            }
            setIsLoading(false);
        };
        fetchMIVersionAndSetup();
    }, [rpcClient]);

    useEffect(() => {
        if (isLicenseAccepted && !showLicense) {
            handleMIDownload();
        }
    }, [showLicense]);

    const handleDownload = async () => {
        if (javaPathDetails?.status === "not-valid") {
            await handleJavaDownload();
        }
        if (miPathDetails?.status === "not-valid") {
            await handleMIDownload();
        }

        rpcClient.getMiVisualizerRpcClient().openView({
            type: EVENT_TYPE.REFRESH_ENVIRONMENT,
            location: {},
        });
    }

    const handleJavaDownload = async () => {
        setIsJavaDownloading(true);
        setError(undefined);
        try {
            rpcClient.onDownloadProgress((data: DownloadProgressData) => {
                setJavaProgress(data.percentage);
            });
            const javaPath = await rpcClient.getMiVisualizerRpcClient().downloadJavaFromMI(recommendedVersions.miVersion);
            const javaDetails = await rpcClient.getMiVisualizerRpcClient().setPathsInWorkSpace({ projectUri, type: 'JAVA', path: javaPath });
            setJavaPathDetails(javaDetails);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsJavaDownloading(false);
        }
    }
    const handleMIDownload = async () => {
        if (!isLicenseAccepted && isDownloadUpdatedPack) {
            setShowLicense(true);
            return;
        }
        setIsMIDownloading(true);
        setError(undefined);
        try {
            rpcClient.onDownloadProgress((data: DownloadProgressData) => {
                setMiProgress(data.percentage);
            });
            const miPath = await rpcClient.getMiVisualizerRpcClient().downloadMI({ version: recommendedVersions.miVersion, isUpdatedPack: isDownloadUpdatedPack });
            const miDetails = await rpcClient.getMiVisualizerRpcClient().setPathsInWorkSpace({ projectUri, type: 'MI', path: miPath });
            setPathDetails(miDetails);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsMIDownloading(false);
        }
    }

    const selectMIPath = async () => {
        const selectedMIPath = await rpcClient.getMiVisualizerRpcClient().selectFolder("Select the Micro Integrator runtime path");
        if (selectedMIPath) {
            const miDetails = await rpcClient.getMiVisualizerRpcClient().setPathsInWorkSpace({ projectUri, type: 'MI', path: selectedMIPath });
            if (miDetails.status !== "not-valid") {
                setPathDetails(miDetails);
            }
        }
    }

    const selectJavaHome = async () => {
        const selectedJavaHome = await rpcClient.getMiVisualizerRpcClient().selectFolder("Select the Java Home path");
        if (selectedJavaHome) {
            const javaDetails = await rpcClient.getMiVisualizerRpcClient().setPathsInWorkSpace({ projectUri, type: 'JAVA', path: selectedJavaHome });
            if (javaDetails.status !== "not-valid") {
                setJavaPathDetails(javaDetails);
            }
        }
    }
    function renderJava() {
        const javaStatus = javaPathDetails?.status;
        const miStatus = miPathDetails?.status;
        const bothNotFound = javaStatus === "not-valid" && miStatus === "not-valid";
        if (isJavaDownloading) {
            return <DownloadComponent title="Java" description="Fetching the Java runtime required to run MI." progress={javaProgress} />;
        }
        return <RuntimeStatus
            type="JAVA"
            pathDetails={javaPathDetails}
            recommendedVersion={recommendedVersions.javaVersion}
            showInlineDownloadButton={!bothNotFound}
            handleDownload={handleJavaDownload}
            isDownloading={isJavaDownloading || isMIDownloading}
        />
    }

    function renderMI() {
        const javaStatus = javaPathDetails?.status;
        const miStatus = miPathDetails?.status;
        const bothNotFound = javaStatus === "not-valid" && miStatus === "not-valid";
        if (isMIDownloading) {
            return <DownloadComponent title="Micro Integrator" description="Fetching the MI runtime required to run MI." progress={miProgress} />;
        }
        if (miStatus === "not-valid" && miPathDetails?.version === "4.4.0") {
            return (
                <RuntimeStatus
                    type="MI"
                    pathDetails={miPathDetails}
                    recommendedVersion={recommendedVersions.miVersion}
                    showInlineDownloadButton={showDownloadButtons && !bothNotFound}
                    handleDownload={handleMIDownload}
                    isDownloading={isJavaDownloading || isMIDownloading}
                >
                    {showDownloadButtons && (
                        <VSCodeCheckbox
                            checked={isDownloadUpdatedPack}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsDownloadUpdatedPack(e.target.checked)}>
                            Download Latest Pack
                        </VSCodeCheckbox>)}
                </RuntimeStatus>
            );
        }
        if (miStatus === "not-valid") {
            return (<RuntimeStatus
                type="MI"
                pathDetails={miPathDetails}
                recommendedVersion={recommendedVersions.miVersion}
                showInlineDownloadButton={showDownloadButtons && !bothNotFound}
                handleDownload={handleMIDownload}
                isDownloading={isJavaDownloading || isMIDownloading}
            />
            );
        }
        return <RuntimeStatus
            type="MI"
            pathDetails={miPathDetails}
            recommendedVersion={recommendedVersions.miVersion}
            showInlineDownloadButton={showDownloadButtons && !bothNotFound}
            handleDownload={handleMIDownload}
            isDownloading={isJavaDownloading || isMIDownloading}
        />
    }

    function renderContinue() {
        const javaStatus = javaPathDetails?.status;
        const miStatus = miPathDetails?.status;
        const canContinue = javaStatus !== "not-valid" && miStatus !== "not-valid";
        const isProperlySetup = javaStatus === "valid" && miStatus === "valid";
        const bothNotFound = javaStatus === "not-valid" && miStatus === "not-valid";

        if (isProperlySetup) {
            return <ButtonWithDescription
                onClick={refreshProject}
                buttonText="Continue"
                description="Project is properly setup. Click continue to open the project."
            />
        }
        if (canContinue) {
            const javaDescription = "Warning: The recommended Java version for the runtime has not been used. While you can continue, please note that the project may not function as expected without the proper version."
            const miDescription = "Warning: The runtime version configured in the developer environment does not match with the runtime version configured for the project. While you can continue, please note that the project may not function as expected without the proper version."
            return <ButtonWithDescription
                onClick={refreshProject}
                buttonText="Continue Anyway"
                description={miStatus !== "valid" ? miDescription : javaDescription}
                appearance="secondary"
            />
        }

        if (bothNotFound && showDownloadButtons) {
            return <ButtonWithDescription buttonDisabled={isJavaDownloading || isMIDownloading}
                onClick={handleDownload}
                buttonText="Download Java & MI"
                description="Download and setup the Java and Micro Integrator runtime."
            />
        }

        return <ButtonWithDescription buttonDisabled={true}
            onClick={refreshProject}
            buttonText="Continue"
            description="Configure the Java and Micro Integrator runtime to continue."
        />

    }

    const refreshProject = async () => {
        let isJavaSet = javaPathDetails?.status !== "not-valid";
        let isMISet = miPathDetails?.status !== "not-valid";

        if (isJavaSet && isMISet) {
            await rpcClient.getMiVisualizerRpcClient().setPathsInWorkSpace({ projectUri, type: 'MI', path: miPathDetails.path });
            await rpcClient.getMiVisualizerRpcClient().setPathsInWorkSpace({ projectUri, type: 'JAVA', path: javaPathDetails.path });
            rpcClient.getMiVisualizerRpcClient().openView({
                type: EVENT_TYPE.REFRESH_ENVIRONMENT,
                location: {},
            });
        } else {
            setError("Java or MI paths are not set properly.");
        }
    }

    const getHeadlineDescription = () => {
        let javaStatus = javaPathDetails?.status;
        let miStatus = miPathDetails?.status;

        if (javaStatus === "valid" && miStatus === "valid") {
            return `Micro Integrator ${recommendedVersions.miVersion} project is setup.`;
        } else if (javaStatus !== "not-valid" && miStatus !== "not-valid") {
            return `Micro Integrator ${recommendedVersions.miVersion} project in not properly setup.`;
        } else {
            return `Micro Integrator ${recommendedVersions.miVersion} is not setup.`;
        }
    }

    if (isLoading) {
        return (<div>
            <LoadingContainer>
                <ProgressRing />
            </LoadingContainer>
        </div>)
    }

    if (showLicense) {
        return (<EULALicenseForm setLicenseAccepted={setIsLicenseAccepted} setShowLicense={setShowLicense} setError={setError} />);
    }

    return (
        <Container>
            <TitlePanel>
                <Headline>Micro Integrator (MI) for VS Code</Headline>
                <HeadlineSecondary>{getHeadlineDescription()}</HeadlineSecondary>
            </TitlePanel>

            {(miVersionStatus === "valid" || miVersionStatus === "valid-not-updated") ? (
                <>
                    <StepContainer>
                        {renderContinue()}
                        <hr style={{ flexGrow: 1, margin: '0 10px', borderColor: 'var(--vscode-editorIndentGuide-background)' }} />
                        {renderJava()}
                        {renderMI()}
                        {(javaPathDetails.status !== "valid" || miPathDetails.status !== "valid") &&
                            <FormGroup title="Advanced Options" isCollapsed={showDownloadButtons}>
                                <React.Fragment>
                                    {javaPathDetails?.status !== "valid" &&
                                        <>
                                            <Row>
                                                <StepDescription>
                                                    Java {recommendedVersions.javaVersion} is required. Select Java Home path if you have already installed.
                                                </StepDescription>
                                            </Row>
                                            <Row>
                                                <Column>
                                                    <Button appearance="secondary" disabled={isMIDownloading || isJavaDownloading} onClick={() => selectJavaHome()}>
                                                        Select Java Home
                                                    </Button>
                                                </Column>
                                            </Row>
                                            <hr style={{ flexGrow: 1, margin: '0 10px', borderColor: 'var(--vscode-editorIndentGuide-background)' }} />
                                        </>
                                    }
                                    {miPathDetails?.status !== "valid" && (
                                        <>
                                            <Row>
                                                <StepDescription>
                                                    Micro Integrator runtime {recommendedVersions.miVersion} is required. Select MI path if you have already installed.
                                                    <br />
                                                    <strong>Note:</strong> All the artifacts in the server will be cleaned in this selected runtime.
                                                </StepDescription>
                                            </Row>
                                            <Row>
                                                <Column>
                                                    <Button appearance="secondary" disabled={isMIDownloading || isJavaDownloading} onClick={() => selectMIPath()}>
                                                        Select MI Path
                                                    </Button>
                                                </Column>
                                            </Row>
                                            <hr style={{ flexGrow: 1, margin: '0 10px', borderColor: 'var(--vscode-editorIndentGuide-background)' }} />
                                        </>
                                    )}
                                </React.Fragment>
                            </FormGroup>}
                    </StepContainer>
                </>
            ) : (
                <>
                    <div>
                        {miVersionStatus === "not-valid" && <p>Unsupported runtime version detected in the project configurations.</p>}
                        {miVersionStatus === "missing" && <p>Runtime version not found in the project configurations.</p>}
                        <p>Select the runtime version for the project</p>
                    </div>

                    <Dropdown
                        id='miVersion'
                        label="Micro Integrator runtime version"
                        isRequired={true}
                        items={supportedMIVersions}
                        onChange={(e) => setSelectedRuntimeVersion(e.target.value)}
                    />
                    <Button onClick={() => {
                        if (selectedRuntimeVersion) {
                            rpcClient.getMiVisualizerRpcClient().updateRuntimeVersionsInPom(selectedRuntimeVersion).then((result) => {
                                if (result) {
                                    rpcClient.getMiVisualizerRpcClient().reloadWindow();
                                }
                            }).catch((error) => {
                                setError((error as Error).message);
                            });
                        }
                    }}
                    >
                        Save
                    </Button>
                </>
            )}
            {error && <ErrorMessage>{error}</ErrorMessage>}
        </Container>
    );
};