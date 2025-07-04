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
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { Button, FormView, FormActions, FormCheckBox } from "@wso2/ui-toolkit";
import { EVENT_TYPE, MACHINE_VIEW, POPUP_EVENT_TYPE, UpdateHttpEndpointRequest } from "@wso2/mi-core";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { initialEndpoint, InputsFields, paramTemplateConfigs, propertiesConfigs, oauthPropertiesConfigs } from "./Types";
import { TypeChip } from "../Commons";
import Form from "./Form";
import AddToRegistry, { formatRegistryPath, getArtifactNamesAndRegistryPaths, saveToRegistry } from "../AddToRegistry";
import { compareVersions } from "@wso2/mi-diagram/lib/utils/commons";
import { RUNTIME_VERSION_440 } from "../../../constants";

export interface HttpEndpointWizardProps {
    path: string;
    type: string;
    isPopup?: boolean;
    handlePopupClose?: () => void;
    handleChangeType?: () => void;
}

export function HttpEndpointWizard(props: HttpEndpointWizardProps) {

    const schema = yup.object({
        endpointName: props.type === 'endpoint' ? yup.string().required("Endpoint Name is required")
                .matches(/^[^@\\^+;:!%&,=*#[\]?'"<>{}() /]*$/, "Invalid characters in Endpoint Name")
                .test('validateEndpointName',
                    'An artifact with same name already exists', value => {
                        return !isNewEndpoint ? !(workspaceFileNames.includes(value) && value !== savedEPName) : !workspaceFileNames.includes(value);
                    })
                .test('validateEndpointArtifactName',
                    'A registry resource with this artifact name already exists', value => {
                        return !isNewEndpoint ? !(artifactNames.includes(value) && value !== savedEPName) : !artifactNames.includes(value);
                    }) :
            yup.string().required("Endpoint Name is required")
                .matches(/^[^@\\^+;:!%&,=*#[\]?'"<>{}() /]*$/, "Invalid characters in Endpoint Name"),
        traceEnabled: yup.string(),
        statisticsEnabled: yup.string(),
        uriTemplate: yup.string().required("URI template is required")
            .matches(/^\$.+$|^\{.+\}$|^\w\w+:\/.*|file:.*|mailto:.*|vfs:.*|jdbc:.*/, "Invalid URI format"),
        httpMethod: yup.string().required("HTTP method is required"),
        description: yup.string(),
        requireProperties: yup.boolean(),
        properties: yup.array(),
        authType: yup.string(),
        basicAuthUsername: yup.string().when('authType', {
            is: 'Basic Auth',
            then: (schema) => schema.required('Basic Auth Username is required'),
            otherwise: (schema) => schema.notRequired(),
        }),
        basicAuthPassword: yup.string().when('authType', {
            is: 'Basic Auth',
            then: (schema) => schema.required('Basic Auth Password is required'),
            otherwise: (schema) => schema.notRequired(),
        }),
        authMode: yup.string(),
        grantType: yup.string(),
        clientId: yup.string().when('authType', {
            is: 'OAuth',
            then: (schema) => schema.required('Client ID is required'),
            otherwise: (schema) => schema.notRequired(),
        }),
        clientSecret: yup.string().when('authType', {
            is: 'OAuth',
            then: (schema) => schema.required('Client Secret is required'),
            otherwise: (schema) => schema.notRequired(),
        }),
        tokenUrl: yup.string().when('authType', {
            is: 'OAuth',
            then: (schema) => schema.required('Token URL is required'),
            otherwise: (schema) => schema.notRequired(),
        }),
        refreshToken: yup.string().when(['authType', 'grantType'], {
            is: (authType: any, grantType: any) => grantType === 'Authorization Code' && authType === 'OAuth',
            then: (schema) => schema.required('Refresh token is required'),
            otherwise: (schema) => schema.notRequired(),
        }),
        username: yup.string().when('grantType', {
            is: 'Password',
            then: (schema) => schema.required('Username is required'),
            otherwise: (schema) => schema.notRequired(),
        }),
        password: yup.string().when('grantType', {
            is: 'Password',
            then: (schema) => schema.required('Password is required'),
            otherwise: (schema) => schema.notRequired(),
        }),
        requireOauthParameters: yup.boolean(),
        oauthProperties: yup.array(),
        addressingEnabled: yup.string(),
        addressingVersion: yup.string(),
        addressListener: yup.string(),
        securityEnabled: yup.string(),
        seperatePolicies: yup.boolean().notRequired().default(false),
        policyKey: yup.string().notRequired().default(""),
        inboundPolicyKey: yup.string().notRequired().default(""),
        outboundPolicyKey: yup.string().notRequired().default(""),
        suspendErrorCodes: yup.string().notRequired()
            .test(
                'validateNumericOrEmpty',
                'Suspend Error Codes must be a comma-separated list of error codes',
                value => {
                    if (value === '') return true;
                    return /^(\d+)(,\d+)*$/.test(value);
                }
            ),
        initialDuration: yup.number().typeError('Initial Duration must be a number'),
        maximumDuration: yup.number().typeError('Maximum Duration must be a number').min(0, "Maximum Duration must be greater than or equal to 0"),
        progressionFactor: yup.number().typeError('Progression Factor must be a number'),
        retryErrorCodes: yup.string().notRequired()
            .test(
                'validateNumericOrEmpty',
                'Retry Error Codes must be a comma-separated list of error codes',
                value => {
                    if (value === '') return true;
                    return /^(\d+)(,\d+)*$/.test(value);
                }
            ),
        retryCount: yup.number().typeError('Retry Count must be a number').min(0, "Retry Count must be greater than or equal to 0"),
        retryDelay: yup.number().typeError('Retry Delay must be a number').min(0, "Retry Delay must be greater than or equal to 0"),
        timeoutDuration: yup.number().typeError('Timeout Duration must be a number').min(0, "Timeout Duration must be greater than or equal to 0"),
        timeoutAction: yup.string(),
        templateName: props.type === 'template' ? yup.string().required("Template Name is required")
                .matches(/^[^@\\^+;:!%&,=*#[\]?'"<>{}() /]*$/, "Invalid characters in Template Name")
                .test('validateTemplateName',
                    'An artifact with same name already exists', value => {
                        return !isNewEndpoint ? !(workspaceFileNames.includes(value) && value !== savedEPName) : !workspaceFileNames.includes(value);
                    })
                .test('validateTemplateArtifactName',
                    'A registry resource with this artifact name already exists', value => {
                        return !isNewEndpoint ? !(artifactNames.includes(value) && value !== savedEPName) : !artifactNames.includes(value);
                    }) :
            yup.string().notRequired().default(""),
        requireTemplateParameters: yup.boolean(),
        templateParameters: yup.array(),
        basicUsernameExpression: yup.boolean().notRequired().default(false),
        basicPasswordExpression: yup.boolean().notRequired().default(false),
        usernameExpression: yup.boolean().notRequired().default(false),
        passwordExpression: yup.boolean().notRequired().default(false),
        clientIdExpression: yup.boolean().notRequired().default(false),
        clientSecretExpression: yup.boolean().notRequired().default(false),
        tokenUrlExpression: yup.boolean().notRequired().default(false),
        refreshTokenExpression: yup.boolean().notRequired().default(false),
        saveInReg: yup.boolean(),
        artifactName: yup.string().when('saveInReg', {
            is: false,
            then: () =>
                yup.string().notRequired(),
            otherwise: () =>
                yup.string().required("Artifact Name is required")
                    .test('validateArtifactName',
                        'Artifact name already exists', value => {
                            return !artifactNames.includes(value);
                        })
                    .test('validateFileName',
                        'A file already exists in the workspace with this artifact name', value => {
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
                        const formattedPath = formatRegistryPath(value, getValues("registryType"), getValues("endpointName"));
                        if (formattedPath === undefined) return true;
                        return !(registryPaths.includes(formattedPath) || registryPaths.includes(formattedPath + "/"));
                    }),
        }),
        registryType: yup.mixed<"gov" | "conf">().oneOf(["gov", "conf"])
    });

    const {
        reset,
        register,
        formState: { errors, isDirty },
        handleSubmit,
        watch,
        setValue,
        control,
        getValues
    } = useForm({
        resolver: yupResolver(schema),
        mode: "onChange"
    });

    const { rpcClient } = useVisualizerContext();
    const isNewEndpoint = !props.path.endsWith(".xml");
    const isTemplate = props.type === 'template';
    const [templateParams, setTemplateParams] = useState(paramTemplateConfigs);
    const [additionalParams, setAdditionalParams] = useState(propertiesConfigs);
    const [additionalOauthParams, setAdditionalOauthParams] = useState(oauthPropertiesConfigs);
    const [artifactNames, setArtifactNames] = useState([]);
    const [registryPaths, setRegistryPaths] = useState([]);
    const [savedEPName, setSavedEPName] = useState<string>("");
    const [workspaceFileNames, setWorkspaceFileNames] = useState([]);
    const [prevName, setPrevName] = useState<string | null>(null);
    const [isRegistryContentVisible, setIsRegistryContentVisible] = useState(false);

    useEffect(() => {
        (async () => {
            if (!isNewEndpoint) {
                const existingEndpoint = await rpcClient.getMiDiagramRpcClient().getHttpEndpoint({ path: props.path });
                setTemplateParams((prev: any) => ({
                    paramFields: prev.paramFields,
                    paramValues: existingEndpoint.templateParameters.map((param: any, index: number) => ({
                        id: prev.paramValues.length + index,
                        paramValues: [{ value: param}],
                        key: index + 1,
                        value: param,
                    }))
                }));

                setAdditionalParams((prev: any) => ({
                    paramFields: prev.paramFields,
                    paramValues: existingEndpoint.properties.map((param: any, index: number) => ({
                        id: prev.paramValues.length + index,
                        paramValues: [
                            { value: param.name },
                            { value: param.value },
                            { value: param.scope }
                        ],
                        key: param.name,
                        value: "value:" + param.value + "; scope:" + param.scope + ";",
                    }))
                }));

                setAdditionalOauthParams((prev: any) => ({
                    paramFields: prev.paramFields,
                    paramValues: existingEndpoint.oauthProperties.map((param: any, index: number) => ({
                        id: prev.paramValues.length + index,
                        paramValues: [
                            { value: param.key },
                            { value: param.value }
                        ],
                        key: param.key,
                        value: param.value,
                    }))
                }));
                reset(existingEndpoint);
                setValue('basicAuthUsername', removeBraces(watch('basicAuthUsername'), 'basicUsernameExpression'));
                setValue('basicAuthPassword', removeBraces(watch('basicAuthPassword'), 'basicPasswordExpression'));
                setValue('username', removeBraces(watch('username'), 'usernameExpression'));
                setValue('password', removeBraces(watch('password'), 'passwordExpression'));
                setValue('clientId', removeBraces(watch('clientId'), 'clientIdExpression'));
                setValue('clientSecret', removeBraces(watch('clientSecret'), 'clientSecretExpression'));
                setValue('tokenUrl', removeBraces(watch('tokenUrl'), 'tokenUrlExpression'));
                setValue('refreshToken', removeBraces(watch('refreshToken'), 'refreshTokenExpression'));
                setSavedEPName(isTemplate ? existingEndpoint.templateName : existingEndpoint.endpointName);
                setValue('saveInReg', false);
                setValue('timeoutAction', existingEndpoint.timeoutAction === '' ? 'Never' :
                    existingEndpoint.timeoutAction.charAt(0).toUpperCase() + existingEndpoint.timeoutAction.slice(1)
                );
            } else {
                reset(initialEndpoint);
                isTemplate ? setValue("endpointName", "$name") : setValue("endpointName", "");
            }

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
        setPrevName(isTemplate ? watch("templateName") : watch("endpointName"));
        if (prevName === watch("artifactName")) {
            setValue("artifactName", isTemplate ? watch("templateName") : watch("endpointName"));
        }
    }, [isTemplate ? watch("templateName") : watch("endpointName")]);

    const handleUpdateHttpEndpoint = async (values: any) => {
        const updateHttpEndpointParams: UpdateHttpEndpointRequest = {
            directory: props.path,
            getContentOnly: watch("saveInReg"),
            ...values,
            basicAuthUsername: addBracesIfExpressionNotBlank(values.basicUsernameExpression, values.basicAuthUsername),
            basicAuthPassword: addBracesIfExpressionNotBlank(values.basicPasswordExpression, values.basicAuthPassword),
            username: addBracesIfExpressionNotBlank(values.usernameExpression, values.username),
            password: addBracesIfExpressionNotBlank(values.passwordExpression, values.password),
            clientId: addBracesIfExpressionNotBlank(values.clientIdExpression, values.clientId),
            clientSecret: addBracesIfExpressionNotBlank(values.clientSecretExpression, values.clientSecret),
            tokenUrl: addBracesIfExpressionNotBlank(values.tokenUrlExpression, values.tokenUrl),
            refreshToken: addBracesIfExpressionNotBlank(values.refreshTokenExpression, values.refreshToken)
        }

        const result = await rpcClient.getMiDiagramRpcClient().updateHttpEndpoint(updateHttpEndpointParams);
        if (watch("saveInReg")) {
            await saveToRegistry(rpcClient, props.path, values.registryType,
                isTemplate ? values.templateName : values.endpointName,
                result.content, values.registryPath, values.artifactName);
        }

        if (props.isPopup) {
            rpcClient.getMiVisualizerRpcClient().openView({
                type: POPUP_EVENT_TYPE.CLOSE_VIEW,
                location: { view: null, recentIdentifier: getValues("endpointName") },
                isPopup: true
            });
        } else {
            openOverview();
        }
    };

    const renderProps = (fieldName: keyof InputsFields) => {
        return {
            id: fieldName,
            ...register(fieldName),
            errorMsg: errors[fieldName] && errors[fieldName].message.toString()
        }
    };

    const isNotBlank = (value: string) => {
        return value !== undefined && value !== null && value !== "";
    }

    const addBracesIfExpressionNotBlank = (condition: boolean | undefined, value: string | undefined | null): string | undefined | null => {
        if (condition && isNotBlank(value)) {
            return `{${value}}`;
        }
        return value;
    };

    const removeBraces = (value: string, expressionName: keyof InputsFields): string => {
        if (isNotBlank(value)) {
            if (value.length > 1 && value[0] === '{' && value[value.length - 1] === '}') {
                setValue(expressionName, true);
                return value.substring(1, value.length - 1);
            }
        }
        setValue(expressionName, false);
        return value;
    }

    const changeType = () => {
        if (props.handleChangeType) {
            props.handleChangeType();
            return;
        }
        rpcClient.getMiVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: isTemplate ? MACHINE_VIEW.TemplateForm : MACHINE_VIEW.EndPointForm,
                documentUri: props.path,
                customProps: { type: isTemplate ? 'template' : 'endpoint' }
            },
            isPopup: props.isPopup
        });
    }

    const openOverview = () => {
        rpcClient.getMiVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: { view: MACHINE_VIEW.Overview },
            isPopup: props.isPopup
        });
    };

    const handleCloseButtonClick = () => {
        if (props.handlePopupClose) {
            props.handlePopupClose();
        } else {
            openOverview();
        }
    };

    return (
        <FormView
            title={isTemplate ? 'Template' : 'Endpoint'}
            onClose={props.handlePopupClose ?? openOverview}
        >
            <TypeChip
                type={isTemplate ? "HTTP Endpoint Template" : "HTTP Endpoint"}
                onClick={changeType}
                showButton={isNewEndpoint}
            />
            <Form
                renderProps={renderProps}
                register={register}
                watch={watch}
                setValue={setValue}
                control={control}
                path={props.path}
                errors={errors}
                isTemplate={isTemplate}
                templateParams={templateParams}
                setTemplateParams={setTemplateParams}
                additionalParams={additionalParams}
                setAdditionalParams={setAdditionalParams}
                additionalOauthParams={additionalOauthParams}
                setAdditionalOauthParams={setAdditionalOauthParams}
            />
            {isRegistryContentVisible && isNewEndpoint && (
                <>
                    <FormCheckBox
                        label="Save the endpoint in registry"
                        {...register("saveInReg")}
                        control={control as any}
                    />
                    {watch("saveInReg") && (<>
                        <AddToRegistry path={props.path}
                            fileName={isTemplate ? watch("templateName") : watch("endpointName")}
                            register={register} errors={errors} getValues={getValues} />
                    </>)}
                </>
            )}
            <FormActions>
                <Button
                    appearance="secondary"
                    onClick={handleCloseButtonClick}
                >
                    Cancel
                </Button>
                <Button
                    data-testid="create-button"
                    appearance="primary"
                    onClick={handleSubmit(handleUpdateHttpEndpoint)}
                    disabled={!isDirty}
                >
                    {isNewEndpoint ? "Create" : "Save Changes"}
                </Button>
            </FormActions>
        </FormView>
    );
}
