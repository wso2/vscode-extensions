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
import { Button, Codicon } from "@wso2/ui-toolkit";
import EditableDiv from "../EditableDiv/EditableDiv";
import { ThemeColors } from "@wso2/ui-toolkit";
import { VSCodeColors } from "../../../resources/constants";

// Styles
const State = {
    Selected: {
        PrimaryButton: {
            border: "1px solid var(--focus-border)",
            backgroundColor: VSCodeColors.PRIMARY_BUTTON,
            borderRadius: "2px",
        },
        SecondaryButton: {
            border: "1px solid var(--button-border)",
            backgroundColor: VSCodeColors.SECONDARY_BG_BUTTON,
            borderRadius: "2px",
        },
        SecondaryIcon: {
            color: VSCodeColors.SECONDARY_ICON,
        },
        PrimaryIcon: {
            color: VSCodeColors.PRIMARY_ICON,
        },
    },
} as const;

interface Props {
    isGenerating: boolean;
    inputGenerate: string;
    generatedFormDetails: Record<string, any>;
    isClickedDropDown: boolean;
    generatingError: boolean;
    isAutoFillBtnClicked: boolean;
    isSendButtonClicked: boolean;
    followUp: string;
    handleGenerateAi: () => void;
    handleRejectAll: () => void;
    handleAcceptAll: () => void;
    setInputGenerate: (value: string) => void;
    setFollowUp: (value: string) => void;
    setIsClickedDropDown: (value: boolean) => void;
    setGeneratedFormDetails: (value: Record<string,any>) => void;
    setVisibleDetails: (value: { [key: string]: boolean }) => void;
    setIsAutoFillBtnClicked: (value: boolean) => void;
    setIsSendButtonClicked: (value: boolean) => void;
    setGeneratingError: (value: boolean) => void;
    setShowGeneratedValuesIdenticalMessage: (value: boolean) => void;
    numberOfDifferent: number;
    showGeneratedValuesIdenticalMessage: boolean;
    isGeneratedValuesIdentical: boolean;
}

const AIAutoFillBox: React.FC<Props> = ({
    isGenerating,
    inputGenerate,
    generatedFormDetails,
    isClickedDropDown,
    generatingError,
    isAutoFillBtnClicked,
    isSendButtonClicked,
    followUp,
    handleGenerateAi,
    handleRejectAll,
    handleAcceptAll,
    setInputGenerate,
    setFollowUp,
    setIsClickedDropDown,
    setGeneratedFormDetails,
    setVisibleDetails,
    setIsAutoFillBtnClicked,
    setIsSendButtonClicked,
    setGeneratingError,
    setShowGeneratedValuesIdenticalMessage,
    numberOfDifferent,
    showGeneratedValuesIdenticalMessage,
    isGeneratedValuesIdentical,
}) => {
    return (
        !isGenerating && (
            <div>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        padding: "3px 8px",
                        position: "relative",
                        boxShadow: "rgba(218, 216, 216, 0.1) 0px -2px 5px",
                        backgroundColor: "var(--vscode-editorHoverWidget-background)",
                        borderRadius: "8px",
                        border: "calc(var(--border-width) * 1px) solid var(--dropdown-border)",
                    }}>
                    {/* first row  */}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: generatedFormDetails ? "5px" : "0px",
                            gap: "10px",
                        }}>
                        <span
                            style={{
                                fontSize: "14px",
                                fontWeight: "bold",
                                color: "var(--vscode-editor-foreground)",
                            }}>
                            Fill With AI
                        </span>
                    <div>
                        {/* Wand Icon with dropdown */}
                        {!generatedFormDetails && (
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                }}>
                                {inputGenerate.trim() === "" && (
                                    <Button
                                        appearance="secondary"
                                        tooltip="Auto Fill"
                                        onClick={handleGenerateAi}>
                                        <Codicon
                                            name="wand"
                                            iconSx={{ color: "var(--vscode-editor-foreground)" }}
                                        />
                                    </Button>
                                )}
                                {!isClickedDropDown && !generatedFormDetails && (
                                    <Button
                                        appearance="icon"
                                        tooltip="With User Prompt"
                                        onClick={() => {
                                            setGeneratingError(false);
                                            setIsClickedDropDown(!isClickedDropDown);
                                            setIsAutoFillBtnClicked(false);
                                            setIsSendButtonClicked(false);
                                            setGeneratedFormDetails(null);
                                            setVisibleDetails({});
                                        }}>
                                        <Codicon
                                            name="chevron-down"
                                            sx={{ color: "var(--vscode-editor-foreground)" }}
                                        />
                                    </Button>
                                )}
                                {isClickedDropDown && !generatedFormDetails && (
                                    <Button
                                        appearance="icon"
                                        onClick={() => {
                                            setGeneratingError(false);
                                            setIsClickedDropDown(!isClickedDropDown);
                                            setIsAutoFillBtnClicked(false);
                                            setIsSendButtonClicked(false);
                                            setGeneratedFormDetails(null);
                                            setVisibleDetails({});
                                            setInputGenerate("");
                                        }}
                                        tooltip="Close">
                                        <Codicon
                                            name="chevron-up"
                                            sx={{ color: "var(--vscode-editor-foreground)" }}
                                        />
                                    </Button>
                                )}
                                </div>
                            )}
                            {/* close icon */}
                            {generatedFormDetails && numberOfDifferent === 0 && (
                                <div>
                                    <Button
                                        appearance="icon"
                                        sx={{
                                            position: "absolute",
                                            right: "0",
                                            top: "0",
                                            color: "var(--vscode-editor-foreground)",
                                            cursor: "pointer",
                                            zIndex: "10",
                                        }}
                                        onClick={() => {
                                            setIsClickedDropDown(false);
                                            setInputGenerate("");
                                            setIsAutoFillBtnClicked(false);
                                            setGeneratedFormDetails(null);
                                            setVisibleDetails({});
                                            setShowGeneratedValuesIdenticalMessage(false);
                                            setGeneratingError(false);
                                        }}>
                                        <Codicon
                                            name="chrome-close"
                                            iconSx={{
                                                fontSize: "8px",
                                            }}></Codicon>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* second row  */}
                    {!generatingError && !isAutoFillBtnClicked && !showGeneratedValuesIdenticalMessage && !generatingError && (isClickedDropDown || (generatedFormDetails && !isClickedDropDown)) && (
                            <div
                                style={{
                                    position: "relative",
                                    padding: "3px",
                                }}>
                                <EditableDiv
                                    placeholder="Enter your prompt here"
                                    value={inputGenerate}
                                    onChange={(value) => { setInputGenerate(value)}}
                                    contentEditable={ generatedFormDetails && (isAutoFillBtnClicked || isSendButtonClicked)? false: true}
                                />
                            </div>
                        )}
                    {/* third row */}
                    {!generatingError && (
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "row",
                                justifyContent: "flex-start",
                                alignItems: "flex-end",
                                gap: "10px",
                                width: "100%",
                                position: "relative",
                            }}>
                            {/* follow up instructions... */}
                            {generatedFormDetails && !showGeneratedValuesIdenticalMessage && !generatingError ? (
                                <div
                                    style={{
                                        width: "100%",
                                        padding: "2px",
                                        fontSize: "12px",
                                    }}>
                                    <EditableDiv
                                        placeholder="Follow up instructions..."
                                        value={followUp}
                                        onChange={(value) => {setFollowUp(value)}}
                                        contentEditable={true}
                                    />
                                </div>
                            ) : <div style={{width: "90%"}}></div>}
                            {/* run button  */}
                            {(followUp.trim() !== "" ||(followUp.trim() !== "" && inputGenerate.trim() !== "") ||(isClickedDropDown && inputGenerate.trim() !== "")) && !showGeneratedValuesIdenticalMessage && !generatingError && (
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "row",
                                            justifyContent: "flex-end",
                                            alignItems: "flex-end",
                                        }}>
                                        <Button appearance="icon" onClick={handleGenerateAi}>
                                            <Codicon
                                                name="send"
                                                sx={{
                                                    padding: "2px",
                                                    color: "var(--vscode-editor-foreground)",
                                                }}
                                            />
                                        </Button>
                                    </div>
                                )}
                            {/* Accept All reject all */}
                            {generatedFormDetails && followUp.trim() === "" && !isGeneratedValuesIdentical && !showGeneratedValuesIdenticalMessage && !generatingError && numberOfDifferent !== 0 && (
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "row",
                                            justifyContent: "flex-end",
                                            alignItems: "flex-end",
                                            width: "100%",
                                            gap: "5px",
                                        }}>
                                        <Button
                                            appearance="icon"
                                            sx={{
                                                height: "20px",
                                                width: "60px",
                                                ...State.Selected.SecondaryButton,
                                            }}
                                            buttonSx={{
                                                height: "20px",
                                                width: "60px",
                                                borderRadius: "2px",
                                                fontSize: "bold",
                                            }}
                                            onClick={handleRejectAll}>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    ...State.Selected.SecondaryIcon,
                                                }}>
                                                <Codicon name="clear-all" iconSx={{ fontSize: "10px" }} />
                                                <span style={{ fontSize: "8px" }}> Reject All</span>
                                            </div>
                                        </Button>
                                        <Button
                                            appearance="icon"
                                            onClick={handleAcceptAll}
                                            sx={{
                                                height: "20px",
                                                width: "60px",
                                                ...State.Selected.PrimaryButton,
                                            }}
                                            buttonSx={{
                                                height: "20px",
                                                width: "60px",
                                                borderRadius: "2px",
                                            }}>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    ...State.Selected.PrimaryIcon,
                                                }}>
                                                <Codicon name="check-all" iconSx={{ fontSize: "10px" }} />
                                                <span style={{ fontSize: "8px" }}> Accept All</span>
                                            </div>
                                        </Button>
                                    </div>
                                )}
                        </div>
                    )}
                    {generatingError && (
                        <div>
                            <div
                                style={{
                                    color: ThemeColors.ERROR,
                                    fontSize: "14px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                }}>
                                <div
                                    style={{
                                        gap: "5px",
                                        display: "flex",
                                        alignItems: "center",
                                    }}>
                                    <Codicon name="error" iconSx={{ fontSize: "14px" }} />
                                    <span>Error with generating values.</span>
                                </div>
                                <Button
                                    onClick={() => {
                                        setGeneratingError(false);
                                    }}
                                    appearance="icon"
                                    buttonSx={{ color: ThemeColors.ERROR }}>
                                    <Codicon name="chrome-close" iconSx={{ fontSize: "14px" }} />
                                </Button>
                            </div>
                        </div>
                    )}
                    {showGeneratedValuesIdenticalMessage && (
                        <div>
                            <div
                                style={{
                                    color: "var(--vscode-editor-foreground)",
                                    fontSize: "14px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                }}>
                                <div
                                    style={{
                                        gap: "5px",
                                        display: "flex",
                                        alignItems: "center",
                                    }}>
                                    <Codicon name="report" iconSx={{ fontSize: "14px" }} />
                                    <span>No changes detected.</span>
                                </div>
                                <Button
                                    onClick={() => { setShowGeneratedValuesIdenticalMessage(false)}}
                                    appearance="icon"
                                    buttonSx={{ color: "var(--vscode-editor-foreground)" }}>
                                    <Codicon name="chrome-close" iconSx={{ fontSize: "14px" }} />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
                <br/>
            </div>
        )
    );
};

export default AIAutoFillBox;
