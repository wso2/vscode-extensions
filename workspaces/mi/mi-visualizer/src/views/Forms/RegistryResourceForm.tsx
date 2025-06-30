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

import { ReactNode, useEffect, useState } from "react";
import { Dropdown, Button, TextField, FormView, FormActions, RadioButtonGroup, Icon, Typography } from "@wso2/ui-toolkit";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { EVENT_TYPE, MACHINE_VIEW, CreateRegistryResourceRequest, POPUP_EVENT_TYPE, getProjectDetails } from "@wso2/mi-core";
import { yupResolver } from "@hookform/resolvers/yup"
import * as yup from "yup";
import { useForm } from "react-hook-form";
import { colors } from "@wso2/ui-toolkit";
import { RUNTIME_VERSION_440 } from "../../constants";
import { compareVersions } from "@wso2/mi-diagram/lib/utils/commons";
import path from "path";

export interface RegistryWizardProps {
    path: string;
    isPopup?: boolean;
    handlePopupClose?: () => void;
    type?: string[];
}

const templates = [{ value: "Data Mapper" }, { value: "Javascript File" }, { value: "JSON File" }, { value: "WSDL File" },
{ value: "WS-Policy" }, { value: "XSD File" }, { value: "XSL File" }, { value: "XSLT File" }, { value: "YAML File" }, { value: "TEXT File" }, { value: "XML File" },
{ value: "RB File" }, { value: "GROOVY File" }];

type InputsFields = {
    templateType?: string;
    filePath?: string;
    resourceName?: string;
    artifactName?: string;
    registryPath?: string;
    createOption?: "new" | "import";
    registryType?: string;
};

const canCreateTemplateForType = (type: string) => {
    if (!type) {
        return true;
    }
    const allowedTypes = ["xslt", "xsl", "xsd", "wsdl", "yaml", "json", "js", "dmc", "xml", "txt"];
    return allowedTypes.includes(type);
}

const filterTemplateCreatableTypes = (types: string[]): string[] => {
    const result: string[] = [];
    if (!types || types.length === 0) {
        return result;
    }
    types.forEach(type => {
        if (canCreateTemplateForType(type)) {
            result.push(type);
        }
    });
    return result;
};

const getInitialResource = (type: string): InputsFields => ({
    templateType: getTemplateType(type),
    filePath: "Please select a file",
    resourceName: "",
    artifactName: "",
    registryPath: type ? type : "xslt",
    createOption: canCreateTemplateForType(type) ? "new" : "import",
    registryType: "gov"
});

const getTemplateType = (type: string) => {
    switch (type) {
        case "xslt":
            return "XSLT File";
        case "xsl":
            return "XSL File";
        case "xsd":
            return "XSD File";
        case "wsdl":
            return "WSDL File";
        case "yaml":
            return "YAML File";
        case "json":
            return "JSON File";
        case "js":
            return "Javascript File";
        case "dmc":
            return "Data Mapper";
        case "txt":
            return "TEXT File";
        case "xml":
            return "XML File";
        case "crt":
            return "CRT File";
        case "rb":
            return "RB File";
        case "groovy":
            return "GROOVY File";
        default:
            return "XSLT File";
    }
};

const getFileExtension = (type: string) => {
    switch (type) {
        case "Data Mapper":
            return ".dmc";
        case "Javascript File":
            return ".js";
        case "JSON File":
            return ".json";
        case "YAML File":
            return ".yaml";
        case "WSDL File":
            return ".wsdl";
        case "XSD File":
            return ".xsd";
        case "XSL File":
            return ".xsl";
        case "XSLT File":
            return ".xslt";
        case "TEXT File":
            return ".txt";
        case "XML File":
            return ".xml";
        case "CRT File":
            return ".crt";
        case "RB File":
            return ".rb";
        case "GROOVY File":
            return ".groovy";
        default:
            return ".xml";
    }
}

export function RegistryResourceForm(props: RegistryWizardProps) {

    const { rpcClient } = useVisualizerContext();
    const [regArtifactNames, setRegArtifactNames] = useState([]);
    const [registryPaths, setRegistryPaths] = useState([]);
    const [resourcePaths, setResourcePaths] = useState([]);
    const [artifactNames, setArtifactNames] = useState([]);
    const [isResourceContentVisible, setIsResourceContentVisible] = useState(false);
    const templateCreatableTypes = filterTemplateCreatableTypes(props.type);
    const initialResourceType = templateCreatableTypes.length > 0 ? templateCreatableTypes[0] : props.type ? props.type[0] : undefined;

    const schema = yup
        .object({
            createOption: yup.mixed<"new" | "import">().oneOf(["new", "import"]),
            registryPath: yup.string().test('validateRegistryPath', 'Resource already exists', value => {
                if (isResourceContentVisible) {
                    const formattedPath = formatResourcePath(value);
                    return !resourcePaths.includes(formattedPath);
                } else {
                    const formattedPath = formatRegistryPath(value);
                    return !registryPaths.includes(formattedPath);
                }
            }),
            registryType: yup.string().test('validateRegistryType', 'Invalid registry type', value => {
                if (!isResourceContentVisible) {
                    return ['gov', 'conf'].includes(value);
                }
                return true;
            }),
            filePath: yup.string().when('createOption', {
                is: "new",
                then: () =>
                    yup.string().notRequired(),
                otherwise: () =>
                    yup.string().required("File Path is required")
            }),
            templateType: yup.string().when('createOption', {
                is: "new",
                then: () =>
                    yup.string().required("Template type is required"),
                otherwise: () =>
                    yup.string().notRequired(),
            }),
            resourceName: yup.string().when('createOption', {
                is: "new",
                then: () =>
                    yup.string().required("Resource Name is required"),
                otherwise: () =>
                    yup.string().notRequired(),
            }),
        });

    const {
        register,
        formState: { errors, isDirty, isValid, isSubmitting },
        handleSubmit,
        getValues,
        setValue,
        watch
    } = useForm<InputsFields>({
        defaultValues: getInitialResource(initialResourceType),
        resolver: yupResolver(schema),
        mode: "onChange",
    });

    const createOptionValue = watch("createOption", "new") === "new";

    // On templateType change, update registryPath
    useEffect(() => {
        if (createOptionValue) {
            setValue("registryPath", getFileExtension(getValues('templateType')).split('.').pop(), { shouldDirty: true });
        }
    }, [watch("templateType")]);

    useEffect(() => {
        (async () => {
            if (regArtifactNames.length === 0 || registryPaths.length === 0 || resourcePaths.length === 0) {
                const request = {
                    path: props.path
                }
                const response = await rpcClient.getMiVisualizerRpcClient().getProjectDetails();
                const runtimeVersion = response.primaryDetails.runtimeVersion.value;
                setIsResourceContentVisible(compareVersions(runtimeVersion, RUNTIME_VERSION_440) >= 0);
                const tempArtifactNames = await rpcClient.getMiDiagramRpcClient().getAvailableRegistryResources(request);
                setRegArtifactNames(tempArtifactNames.artifacts);
                const res = await rpcClient.getMiDiagramRpcClient().getAllRegistryPaths(request);
                setRegistryPaths(res.registryPaths);
                const resourcePathsResponse = await rpcClient.getMiDiagramRpcClient().getAllResourcePaths();
                setResourcePaths(resourcePathsResponse.resourcePaths);
                const artifactRes = await rpcClient.getMiDiagramRpcClient().getAllArtifacts(request);
                setArtifactNames(artifactRes.artifacts);
            }
        })();
    }, []);

    const formatResourcePath = (resourceDirPath: string) => {
        let resPath = 'resources:';
        resPath = resourceDirPath.startsWith('/') ? resPath + resourceDirPath.substring(1) : resPath + resourceDirPath;
        if (createOptionValue) {
            resPath.endsWith('/') ? resPath = resPath + getValues("resourceName") + getFileExtension(getValues('templateType'))
                : resPath = resPath + '/' + getValues("resourceName") + getFileExtension(getValues('templateType'));
        } else {
            const filename = getValues("filePath").split('/').pop();
            resPath.endsWith('/') ? resPath = resPath + filename : resPath = resPath + '/' + filename;
        }
        return resPath;
    }

    const formatRegistryPath = (path: string) => {
        let regPath = '';
        if (getValues("registryType") === 'gov') {
            regPath = 'gov:';
        } else {
            regPath = 'conf:';
        }
        path.startsWith('/') ? regPath = regPath + path.substring(1) : regPath = regPath + path;
        if (createOptionValue) {
            regPath.endsWith('/') ? regPath = regPath + getValues("resourceName") + getFileExtension(getValues('templateType'))
                : regPath = regPath + '/' + getValues("resourceName") + getFileExtension(getValues('templateType'));
        } else {
            const filename = getValues("filePath").split('/').pop();
            regPath.endsWith('/') ? regPath = regPath + filename : regPath = regPath + '/' + filename;
        }
        return regPath;
    }

    const openOverview = () => {
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });
    };

    const openFile = async () => {
        const request = {
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: { 'types': props.type },
            defaultUri: "",
            title: "Select a file to be imported as a resource"
        }
        await rpcClient.getMiDiagramRpcClient().browseFile(request).then(response => {
            setValue("filePath", response.filePath, { shouldDirty: true });
        }).catch(e => { console.log(e); });
    }

    const openFolder = async () => {
        const request = {
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            defaultUri: "",
            title: "Select a folder to be imported to as a collection"
        }
        await rpcClient.getMiDiagramRpcClient().browseFile(request).then(response => {
            setValue("filePath", response.filePath, { shouldDirty: true });
        }).catch(e => { console.log(e); });
    }

    const canCreateTemplate = (): boolean => {
        if (!props.type || templateCreatableTypes.length > 0) {
            return true;
        }
        return false;
    }

    const getRegistryRoot = (registryType: string, registryPath: string): string => {
        if (isResourceContentVisible) {
            if (registryPath && registryPath.includes(path.join('registry', 'gov'))) {
                return 'gov';
            } else if (registryPath && registryPath.includes(path.join('registry', 'conf'))) {
                return 'conf';
            } else {
                return '';
            }
        }
        return registryType;
    };

    const handleRegistryPathPrefix = (registryPath: string): string => {
        let handledRegistryPath = registryPath.replaceAll(path.join('registry', 'gov'), '');
        handledRegistryPath = handledRegistryPath.replaceAll(path.join('registry', 'conf'), '');
        return handledRegistryPath;
    }

    const handleCreateRegResource = async (values: InputsFields) => {
        const projectDir = props.path ? (await rpcClient.getMiDiagramRpcClient().getProjectRoot({ path: props.path })).path : (await rpcClient.getVisualizerState()).projectUri;
        const regRequest: CreateRegistryResourceRequest = {
            projectDirectory: projectDir,
            templateType: values.templateType,
            filePath: values.filePath,
            resourceName: values.resourceName,
            artifactName: '',
            registryPath: handleRegistryPathPrefix(values.registryPath),
            registryRoot: getRegistryRoot(values.registryType, values.registryPath),
            createOption: values.createOption
        }
        
        const regfilePath = await rpcClient.getMiDiagramRpcClient().createRegistryResource(regRequest);
        if (props.isPopup) {
            rpcClient.getMiVisualizerRpcClient().openView({
                type: POPUP_EVENT_TYPE.CLOSE_VIEW,
                location: { view: null, recentIdentifier: isResourceContentVisible ? formatResourcePath(values.registryPath) : formatRegistryPath(values.registryPath) },
                isPopup: true
            });
        } else {
            rpcClient.getMiDiagramRpcClient().openFile(regfilePath);
            rpcClient.getMiDiagramRpcClient().closeWebView();
        }
    }

    const handleBackButtonClick = () => {
        props.handlePopupClose ? props.handlePopupClose() : rpcClient.getMiVisualizerRpcClient().goBack();
    };

    const resourcesTag: ReactNode = (
        <div
            style={{
                display: "flex",
                flexDirection: "row",
                backgroundColor: colors.vscodeBadgeBackground,
                padding: "2px",
                borderRadius: "3px",
                paddingLeft: "4px",
                paddingRight: "4px"
            }}
        >
            resources:
        </div>
    );

    return (
        <FormView title={ isResourceContentVisible ? "Create New Resource" : "Create New Registry Resource" } onClose={handleBackButtonClick}>
            {canCreateTemplate() && <RadioButtonGroup
                label="Create Options"
                id="createOption"
                options={[{ content: "From existing template", value: "new" }, { content: "Import from file system", value: "import" }]}
                {...register("createOption")}
            />}
            {createOptionValue && (<>
                <TextField
                    label="Resource Name"
                    id="resourceName"
                    required
                    errorMsg={errors.resourceName?.message.toString()}
                    {...register("resourceName")}
                />
                <Dropdown
                    label="Template Type"
                    id="templateType"
                    required
                    items={templates}
                    {...register("templateType")}
                    dropdownContainerSx={{ position: "relative", "z-index": 1000 }}
                />
            </>)}
            {!createOptionValue && (<>
                <div style={{ display: "flex", flexDirection: "row", gap: "10px", alignItems: "center" }}>
                    <Button appearance="secondary" onClick={openFile}>
                        <div style={{ color: colors.editorForeground }}>Browse file</div>
                    </Button>
                    <Typography variant="body3" {...register("filePath")}>
                        {(errors && errors.filePath && errors.filePath.message)
                            ? errors.filePath.message.toString() : watch("filePath")}
                    </Typography>
                </div>
            </>)}
            {!isResourceContentVisible && (<RadioButtonGroup
                label="Select registry type"
                id="registryType"
                options={[{ content: "Governance registry (gov)", value: "gov" }, { content: "Configuration registry (conf)", value: "conf" }]}
                {...register("registryType")}
            />)}
            <TextField
                id='registryPath'
                label={isResourceContentVisible ? "Resource Path" : "Registry Path"}
                errorMsg={errors.registryPath?.message.toString()}
                inputProps={{ startAdornment: isResourceContentVisible ? resourcesTag : "" }}
                {...register("registryPath")}
            />
            <br />
            <br />
            <FormActions>
                <Button
                    appearance="primary"
                    onClick={handleSubmit((values) => {
                        handleCreateRegResource(values);
                    })}
                    disabled={!isDirty || (!createOptionValue
                        && getValues("filePath") === "Please select a file")}
                >
                    Create
                </Button>
                <Button appearance="secondary" onClick={handleBackButtonClick}>
                    Cancel
                </Button>
            </FormActions>
        </FormView>
    );
}
