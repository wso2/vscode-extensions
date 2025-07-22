/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import React, { useEffect, useState } from "react";
import styled from "@emotion/styled";
import { Button, FormGroup } from "@wso2/ui-toolkit";
import { useVisualizerContext } from "@wso2/si-rpc-client";
import { DownloadProgressData, EVENT_TYPE, PathDetailsResponse } from "@wso2/si-core";
import { ButtonWithDescription, DownloadComponent, RuntimeStatus, Row, Column, StepDescription } from "./Components";
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";
import { EULALicenseForm } from "./EULALicense";
import { ProgressRing } from "@wso2/ui-toolkit";
import { MACHINE_VIEW } from "@wso2/si-core";

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
    const [isLoading, setIsLoading] = useState(true);
    const [recommendedVersions, setRecommendedVersions] = useState<{ siVersion: string, javaVersion: string }>({ siVersion: "", javaVersion: "" });
    const [isJavaDownloading, setIsJavaDownloading] = useState(false);
    const [isSIDownloading, setIsSIDownloading] = useState(false);
    const [javaProgress, setJavaProgress] = useState<number>(0);
    const [siProgress, setSiProgress] = useState<number>(0);
    const [error, setError] = useState<string>();
    const [javaPathDetails, setJavaPathDetails] = useState<PathDetailsResponse>({ status: "not-valid" });
    const [siPathDetails, setPathDetails] = useState<PathDetailsResponse>({ status: "not-valid" });
    const [showDownloadButtons, setShowDownloadButtons] = useState<boolean>(true);
    const [isDownloadUpdatedPack, setIsDownloadUpdatedPack] = useState<boolean>(false);
    const [isLicenseAccepted, setIsLicenseAccepted] = useState<boolean>(false);
    const [showLicense, setShowLicense] = useState<boolean>(false);
    const SI_LATEST_VERSION = "4.3.0";
    
    useEffect(() => {
        const fetchSIVersionAndSetup = async () => {
            const { recommendedVersions, javaDetails, siDetails, siVersionStatus, showDownloadButtons } = await rpcClient.getSiVisualizerRpcClient().getSetupDetails();
            setRecommendedVersions(recommendedVersions);
            setJavaPathDetails(javaDetails);
            setPathDetails(siDetails);
            setShowDownloadButtons(showDownloadButtons);
            setIsLoading(false);
        };
        fetchSIVersionAndSetup();
    }, []);

    useEffect(() => {
        if (isLicenseAccepted && !showLicense) {
            handleSIDownload();
        }
    }, [showLicense]);

    const handleDownload = async () => {
        if (javaPathDetails?.status === "not-valid") {
            await handleJavaDownload();
        }
        if (siPathDetails?.status === "not-valid") {
            await handleSIDownload();
        }

        rpcClient.getSiVisualizerRpcClient().openView({
            type: EVENT_TYPE.REFRESH_ENVIRONMENT,
            location: {
                view: MACHINE_VIEW.Overview
            }
        });
    }

    const handleJavaDownload = async () => {
        setIsJavaDownloading(true);
        setError(undefined);
        try {
            rpcClient.onDownloadProgress((data: DownloadProgressData) => {
                setJavaProgress(data.percentage);
            });
            const javaPath = await rpcClient.getSiVisualizerRpcClient().downloadJavaFromSI(recommendedVersions.siVersion);
            const javaDetails = await rpcClient.getSiVisualizerRpcClient().setPathsInConfiguration({ type: 'JAVA', path: javaPath });
            setJavaPathDetails(javaDetails);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsJavaDownloading(false);
        }
    }
    
    const handleSIDownload = async () => {
        if (!isLicenseAccepted) {
            setShowLicense(true);
            return;
        }
        setIsSIDownloading(true);
        setError(undefined);
        try {
            rpcClient.onDownloadProgress((data: DownloadProgressData) => {
                setSiProgress(data.percentage);
            });
            const siPath = await rpcClient.getSiVisualizerRpcClient().downloadSI({ version: recommendedVersions.siVersion, isUpdatedPack: isDownloadUpdatedPack });
            const siDetails = await rpcClient.getSiVisualizerRpcClient().setPathsInConfiguration({ type: 'SI', path: siPath });
            setPathDetails(siDetails);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsSIDownloading(false);
        }
    }

    const selectSIPath = async () => {
        const selectedSIPath = await rpcClient.getSiVisualizerRpcClient().selectFolder("Select the WSO2 Integrator: SI runtime path");
        if (selectedSIPath) {
            const siDetails = await rpcClient.getSiVisualizerRpcClient().setPathsInConfiguration({ type: 'SI', path: selectedSIPath });
            if (siDetails.status !== "not-valid") {
                setPathDetails(siDetails);
            }
        }
    }

    const selectJavaHome = async () => {
        const selectedJavaHome = await rpcClient.getSiVisualizerRpcClient().selectFolder("Select the Java Home path");
        if (selectedJavaHome) {
            const javaDetails = await rpcClient.getSiVisualizerRpcClient().setPathsInConfiguration({ type: 'JAVA', path: selectedJavaHome });
            if (javaDetails.status !== "not-valid") {
                setJavaPathDetails(javaDetails);
            }
        }
    }

    function renderJava() {
        const javaStatus = javaPathDetails?.status;
        const siStatus = siPathDetails?.status;
        const bothNotFound = javaStatus === "not-valid" && siStatus === "not-valid";
        if (isJavaDownloading) {
            return <DownloadComponent title="Java" description="Fetching the Java runtime required to run SI." progress={javaProgress} />;
        }
        return <RuntimeStatus
            type="JAVA"
            pathDetails={javaPathDetails}
            recommendedVersion={recommendedVersions.javaVersion}
            showInlineDownloadButton={!bothNotFound}
            handleDownload={handleJavaDownload}
            isDownloading={isJavaDownloading || isSIDownloading}
        />
    }

    function renderSI() {
        const javaStatus = javaPathDetails?.status;
        const siStatus = siPathDetails?.status;
        const bothNotFound = javaStatus === "not-valid" && siStatus === "not-valid";
        if (isSIDownloading) {
            return <DownloadComponent title="WSO2 Integrator: SI" description="Fetching the SI runtime required to run SI." progress={siProgress} />;
        }
        if (siStatus === "not-valid" && siPathDetails?.version === SI_LATEST_VERSION) {
            return (
                <RuntimeStatus
                    type="SI"
                    pathDetails={siPathDetails}
                    recommendedVersion={recommendedVersions.siVersion}
                    showInlineDownloadButton={showDownloadButtons && !bothNotFound}
                    handleDownload={handleSIDownload}
                    isDownloading={isJavaDownloading || isSIDownloading}
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
        if (siStatus === "not-valid") {
            return (<RuntimeStatus
                type="SI"
                pathDetails={siPathDetails}
                recommendedVersion={recommendedVersions.siVersion}
                showInlineDownloadButton={showDownloadButtons && !bothNotFound}
                handleDownload={handleSIDownload}
                isDownloading={isJavaDownloading || isSIDownloading}
            />
            );
        }
        return <RuntimeStatus
            type="SI"
            pathDetails={siPathDetails}
            recommendedVersion={recommendedVersions.siVersion}
            showInlineDownloadButton={showDownloadButtons && !bothNotFound}
            handleDownload={handleSIDownload}
            isDownloading={isJavaDownloading || isSIDownloading}
        />
    }

    function renderContinue() {
        const javaStatus = javaPathDetails?.status;
        const siStatus = siPathDetails?.status;
        const canContinue = javaStatus !== "not-valid" && siStatus !== "not-valid";
        const isProperlySetup = javaStatus === "valid" && siStatus === "valid";
        const bothNotFound = javaStatus === "not-valid" && siStatus === "not-valid";

        if (isProperlySetup) {
            return <ButtonWithDescription 
                onClick={refreshProject}
                buttonText="Continue"
                description="WSO2 Integrator: SI is properly setup. Click here to continue."
            />
        }
        if (canContinue) {
            const javaDescription = "Warning: The recommended Java version for the runtime has not been used. While you can continue, please note that the application may not function as expected without the proper version."
            const siDescription = "Warning: The runtime version configured in the developer environment does not match with the runtime version configured for the application. While you can continue, please note that the application may not function as expected without the proper version."
            return <ButtonWithDescription 
                onClick={refreshProject}
                buttonText="Continue Anyway"
                description={siStatus !== "valid" ? siDescription : javaDescription}
                appearance="secondary"
            />
        }

        if (bothNotFound && showDownloadButtons) {
            return <ButtonWithDescription buttonDisabled={isJavaDownloading || isSIDownloading}
                onClick={handleDownload}
                buttonText="Download Java & SI"
                description="Download and setup the Java and WSO2 Integrator: SI runtime."
            />
        }

        return <ButtonWithDescription buttonDisabled={true}
            onClick={refreshProject}
            buttonText="Continue"
            description="Configure the Java and WSO2 Integrator: SI runtime to continue."
        />

    }

    const refreshProject = async () => {
        let isJavaSet = javaPathDetails?.status !== "not-valid";
        let isSISet = siPathDetails?.status !== "not-valid";

        if (isJavaSet && isSISet) {
            rpcClient.getSiVisualizerRpcClient().openView({
                type: EVENT_TYPE.REFRESH_ENVIRONMENT,
                location: {
                    view: MACHINE_VIEW.Overview
                },
            });
        } else {
            setError("Java or SI paths are not set properly.");
        }
    }

    const getHeadlineDescription = () => {
        let javaStatus = javaPathDetails?.status;
        let siStatus = siPathDetails?.status;

        if (javaStatus === "valid" && siStatus === "valid") {
            return `WSO2 Integrator: SI ${recommendedVersions.siVersion} is setup.`;
        } else if (javaStatus !== "not-valid" && siStatus !== "not-valid") {
            return `WSO2 Integrator: SI ${recommendedVersions.siVersion} in not properly setup.`;
        } else {
            return `WSO2 Integrator: SI ${recommendedVersions.siVersion} is not setup.`;
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
                <Headline>WSO2 Integrator: SI for VS Code</Headline>
                <HeadlineSecondary>{getHeadlineDescription()}</HeadlineSecondary>
            </TitlePanel>
            <>
                <StepContainer>
                    {renderContinue()}
                    <hr style={{ flexGrow: 1, margin: '0 10px', borderColor: 'var(--vscode-editorIndentGuide-background)' }} />
                    {renderJava()}
                    {renderSI()}
                    {(javaPathDetails.status !== "valid" || siPathDetails.status !== "valid") &&
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
                                                <Button appearance="secondary" disabled={isSIDownloading || isJavaDownloading} onClick={() => selectJavaHome()}>
                                                    Select Java Home
                                                </Button>
                                            </Column>
                                        </Row>
                                        <hr style={{ flexGrow: 1, margin: '0 10px', borderColor: 'var(--vscode-editorIndentGuide-background)' }} />
                                    </>
                                }
                                {siPathDetails?.status !== "valid" && (
                                    <>
                                        <Row>
                                            <StepDescription>
                                                WSO2 Integrator: SI runtime {recommendedVersions.siVersion} is required. Select SI path if you have already installed.
                                                <br />
                                                <strong>Note:</strong> All the artifacts in the server will be cleaned in this selected runtime.
                                            </StepDescription>
                                        </Row>
                                        <Row>
                                            <Column>
                                                <Button appearance="secondary" disabled={isSIDownloading || isJavaDownloading} onClick={() => selectSIPath()}>
                                                    Select SI Path
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
            {error && <ErrorMessage>{error}</ErrorMessage>}
        </Container>
    );
};