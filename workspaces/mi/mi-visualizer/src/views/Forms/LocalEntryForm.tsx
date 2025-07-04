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
import { useEffect, useState } from "react";
import { Button, TextField, FormView, FormActions, FormCheckBox } from "@wso2/ui-toolkit";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import CodeMirror from "@uiw/react-codemirror";
import { xml } from "@codemirror/lang-xml";
import { oneDark } from "@codemirror/theme-one-dark";
import { CreateLocalEntryRequest, CreateLocalEntryResponse, EVENT_TYPE, MACHINE_VIEW } from "@wso2/mi-core";
import { XMLValidator } from "fast-xml-parser";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import CardWrapper from "./Commons/CardWrapper";
import AddToRegistry, { formatRegistryPath, getArtifactNamesAndRegistryPaths, saveToRegistry } from "./AddToRegistry";
import { TypeChip } from "./Commons";
import { compareVersions } from "@wso2/mi-diagram/lib/utils/commons";
import { RUNTIME_VERSION_440 } from "../../constants";

const SourceURLContainer = styled.div({
    display: "flex", 
    alignItems: "end", 
    justifyContetnt: "end", 
    gap: "10px",
    width: "100%"
})
const BrowseBtnContainer = styled.div({
    marginBottom: "1px"
});

export interface Region {
    label: string;
    value: string;
}

export interface LocalEntryWizardProps {
    path: string
}

type InputsFields = {
    name?: string;
    type?: string;
    inLineTextValue?: string;
    inLineXmlValue?: string;
    saveInReg?: boolean;
    sourceURL?: string;
    //reg form
    artifactName?: string;
    registryPath?: string
    registryType?: "gov" | "conf";
};

const initialLocalEntry: InputsFields = {
    name: "",
    type: "",
    inLineTextValue: "",
    inLineXmlValue: "",
    saveInReg: false,
    sourceURL: "",
    //reg form
    artifactName: "",
    registryPath: "/",
    registryType: "gov"
};
export function LocalEntryWizard(props: LocalEntryWizardProps) {
    const { rpcClient } = useVisualizerContext();
    const [registryPaths, setRegistryPaths] = useState([]);
    const [artifactNames, setArtifactNames] = useState([]);
    const [workspaceFileNames, setWorkspaceFileNames] = useState([]);
    const [savedLocalEntryName, setSavedLocalEntryName] = useState<string>("");
    const [type, setType] = useState("");
    const [xmlErrors, setXmlErrors] = useState({
        code: "",
        col: 0,
        line: 0,
        msg: ""
    });
    const isNewTask = !props.path.endsWith(".xml");
    const [validationMessage, setValidationMessage] = useState(true);
    const [message, setMessage] = useState({
        isError: false,
        text: ""
    });
    const [prevName, setPrevName] = useState<string | null>(null);
    const [isRegistryContentVisible, setIsRegistryContentVisible] = useState(false);

    const schema = yup.object({
        name: yup.string().required("Local Entry Name is required").matches(/^[^@\\^+;:!%&,=*#[\]$?'"<>{}() /]*$/, "Invalid characters in Local Entry name")
            .test('validateSequenceName', 'An artifact with same name already exists', value => {
                return !(workspaceFileNames.includes(value) && savedLocalEntryName !== value)
            })
            .test('validateArtifactName', 'A registry resource with this artifact name already exists', value => {
                return !(artifactNames.includes(value) && savedLocalEntryName !== value)
            }),
        type: yup.string(),
        saveInReg: yup.boolean().default(false),
        inLineTextValue: yup.string().required().when("type", {
            is: "In-Line Text Entry",
            then: (schema) => schema.required("In-Line Text Value is required"),
            otherwise: (schema) => schema.notRequired()
        }),
        inLineXmlValue: yup.string().required().when("type", {
            is: "In-Line XML Entry",
            then: (schema) => schema.required("In-Line XML Value is required"),
            otherwise: (schema) => schema.notRequired()
        }),
        sourceURL: yup.string().required().when("type", {
            is: "Source URL Entry",
            then: (schema) => schema.required("Source URL is required"),
            otherwise: (schema) => schema.notRequired()
        }),
        artifactName: yup.string().when('saveInReg', {
            is: false,
            then: () =>
                yup.string().notRequired(),
            otherwise: () =>
                yup.string().required("Artifact Name is required")
                    .test('validateArtifactName', 'Artifact name already exists', value => {
                        return !artifactNames.includes(value);
                    })
                    .test('validateFileName', 'A file already exists in the workspace with this artifact name', value => {
                        return !workspaceFileNames.includes(value);
                    }),
        }),
        registryPath: yup.string().when('saveInReg', {
            is: false,
            then: () =>
                yup.string().notRequired(),
            otherwise: () =>
                yup.string().required("Registry Path is required")
                    .test('validateRegistryPath', 'Resource already exists in registry', value => {
                    const formattedPath = formatRegistryPath(value, getValues("registryType"), getValues("name"));
                    if (formattedPath === undefined) return true;
                    return !(registryPaths.includes(formattedPath) || registryPaths.includes(formattedPath + "/"));
                }),
        }),
        registryType: yup.mixed<"gov" | "conf">().oneOf(["gov", "conf"]),
    });

    const {
        reset,
        register,
        formState: { errors, isDirty, isValid },
        handleSubmit,
        getValues,
        watch,
        control,
        setValue
    } = useForm<InputsFields>({
        defaultValues: initialLocalEntry,
        resolver: yupResolver(schema),
        mode: "onChange"
    });

    useEffect(() => {
        (async () => {
            const result = await getArtifactNamesAndRegistryPaths(props.path, rpcClient);
            setArtifactNames(result.artifactNamesArr);
            setRegistryPaths(result.registryPaths);
            const artifactRes = await rpcClient.getMiDiagramRpcClient().getAllArtifacts({
                path: props.path,
            });
            const response = await rpcClient.getMiVisualizerRpcClient().getProjectDetails();
            const runtimeVersion = response.primaryDetails.runtimeVersion.value;
            setIsRegistryContentVisible(compareVersions(runtimeVersion, RUNTIME_VERSION_440) < 0);
            setWorkspaceFileNames(artifactRes.artifacts);
        })();
    }, [props.path]);

    useEffect(() => {
        if (props.path.endsWith(".xml")) {
            (async () => {
                const localEntry = await rpcClient.getMiDiagramRpcClient().getLocalEntry({ path: props.path });
                if (localEntry.name) {
                    setType(localEntry.type);
                    setSavedLocalEntryName(localEntry.name);
                    reset(localEntry);
                }
            })();
        } else {
            setType("");
            setSavedLocalEntryName("");
            reset(initialLocalEntry);
        }
    }, [props.path]);

    useEffect(() => {
        setPrevName(watch("name"));
        if (prevName === watch("artifactName")) {
            setValue("artifactName", watch("name"));
        }
    }, [watch("name")]);

    useEffect(() => {
        if (!validationMessage) {
            handleMessage(`Error ${xmlErrors.code} , ${xmlErrors.msg} in line ${xmlErrors.line}, from ${xmlErrors.col} `, true);
        } else {
            handleMessage("", false);
        }
    }, [getValues("inLineXmlValue")]);

    const handleURLDirSelection = async () => {
        const fileDirectory = await rpcClient
            .getMiDiagramRpcClient()
            .askFileDirPath();
        setValue("sourceURL", "file:" + fileDirectory.path);
    };

    const setLocalEntryType = (type: string) => {
        setType(type);
        setValue("type", type);
    }

    const isValidXML = (xmlString: string) => {
        const result = XMLValidator.validate(xmlString);
        if (result !== true) {
            setXmlErrors({ code: result.err.code, col: result.err.col, line: result.err.line, msg: result.err.msg });
            return false;
        }
        let xmlDeclarationLine = findXmlDeclarationLine(xmlString);
        if (xmlDeclarationLine !== -1) {
            setXmlErrors({ code: "Unexpected declaration", col: 0, line: xmlDeclarationLine, msg: "XML declaration is not expected" });
            return false;
        }
        return result;
    };

    const findXmlDeclarationLine = (xmlString: string): number => {
        const xmlDeclarationRegex = /<\?xml\s+version\s*=\s*["']1\.0["']\s+encoding\s*=\s*["']UTF-8["']\s*\?>/i;
        const lines = xmlString.split('\n');

        for (let i = 0; i < lines.length; i++) {
            if (xmlDeclarationRegex.test(lines[i])) {
                return i + 1;
            }
        }

        return -1;
    }

    const handleXMLInputChange = (text: string) => {
        setValue("inLineXmlValue", text);
        setValidationMessage(isValidXML(text));
    }

    const renderProps = (fieldName: keyof InputsFields, value: any = "") => {
        return {
            id: fieldName,
            ...register(fieldName),
            errorMsg: errors[fieldName] && errors[fieldName].message.toString()
        }
    };

    const handleCreateLocalEntry = async (values: InputsFields) => {
        if (getValues("type") === "In-Line XML Entry") {
            if (validationMessage === false) {
                return;
            }
        }
        const createLocalEntryParams: CreateLocalEntryRequest = {
            directory: props.path,
            name: values.name,
            type: values.type,
            value: values.type === "In-Line XML Entry" ? values.inLineXmlValue : values.inLineTextValue,
            URL: values.sourceURL,
            getContentOnly: watch("saveInReg") ?? false,
        };
        const result: CreateLocalEntryResponse = await rpcClient
            .getMiDiagramRpcClient()
            .createLocalEntry(createLocalEntryParams);
        if (watch("saveInReg")) {
            await saveToRegistry(rpcClient, props.path, values.registryType, values.name, result.fileContent, values.registryPath, values.artifactName);
        }
        openOverview();
    };

    const handleMessage = (text: string, isError: boolean = false) => {
        setMessage({ isError, text });
    }

    const handleOnClose = () => {
        rpcClient.getMiVisualizerRpcClient().goBack();
    }

    const handleBackButtonClick = () => {
        setLocalEntryType("");
    }

    const openOverview = () => {
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });
    };

    const title = !props.path.endsWith(".xml") ? "Create New Local Entry" : "Edit Local Entry : "  + getValues("name");
    return (
        <FormView title={title} onClose={handleOnClose}>
            {type === "" ? <CardWrapper cardsType="LOCAL_ENTRY" setType={setLocalEntryType} /> :
                <>
                    <TypeChip type={type} onClick={handleBackButtonClick} showButton={isNewTask} />
                    <TextField
                        {...renderProps("name")}
                        label="Local Entry Name"
                        placeholder="Local Entry Name"
                        required
                    />
                    {getValues("type") === "In-Line Text Entry" && (
                        <TextField
                            {...renderProps("inLineTextValue")}
                            label="In-Line Text Value"
                            placeholder="In-Line Text Value"
                            required
                        />
                    )}
                    {getValues("type") === "In-Line XML Entry" && (
                        <CodeMirror
                            value={getValues("inLineXmlValue")}
                            theme={oneDark}
                            extensions={[xml()]}
                            height="200px"
                            autoFocus
                            indentWithTab={true}
                            onChange={handleXMLInputChange}
                            options={{
                                lineNumbers: true,
                                lint: true,
                                mode: "xml",
                                columns: 100,
                                columnNumbers: true,
                                lineWrapping: true,
                            }}
                        />
                    )}
                    {getValues("type") === "Source URL Entry" && (
                        <SourceURLContainer>
                            <TextField
                                {...renderProps("sourceURL")}
                                label="Source URL"
                                placeholder="Source URL"
                                required
                                size={100}
                            />
                            <BrowseBtnContainer>
                                <Button
                                    onClick={handleURLDirSelection}
                                    id="select-project-dir-btn"
                                >
                                    Browse
                                </Button>
                            </BrowseBtnContainer>
                        </SourceURLContainer>
                    )}
                    {!isNewTask && (
                        <FormActions>
                            <Button
                                appearance="primary"
                                onClick={handleSubmit(handleCreateLocalEntry)}
                                disabled={message.isError && !isDirty}
                            >
                                {isNewTask ? "Create" : "Update"}
                            </Button>
                            <Button
                                appearance="secondary"
                                onClick={openOverview}
                            >
                                Cancel
                            </Button>
                            {message && <span style={{ color: message.isError ? "#f48771" : "" }}>{message.text}</span>}
                        </FormActions>
                    )}
                    {isNewTask && (
                        <>
                            {isRegistryContentVisible && <FormCheckBox
                                label="Save the local entry in registry"
                                {...register("saveInReg")}
                                control={control as any}
                            />}
                            {isRegistryContentVisible && watch("saveInReg") && (<>
                                <AddToRegistry path={props.path} fileName={watch("name")} register={register} errors={errors} getValues={getValues} />
                            </>)}
                            <FormActions>
                                <Button
                                    appearance="secondary"
                                    onClick={openOverview}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    appearance="primary"
                                    onClick={handleSubmit(handleCreateLocalEntry)}
                                    disabled={message.isError && !isDirty && !isValid}
                                >
                                    {isNewTask ? "Create" : "Save Changes"}
                                </Button>
                                {message && <span style={{ color: message.isError ? "#f48771" : "" }}>{message.text}</span>}
                            </FormActions>
                        </>
                    )}
                </>}
        </FormView>
    );
}
