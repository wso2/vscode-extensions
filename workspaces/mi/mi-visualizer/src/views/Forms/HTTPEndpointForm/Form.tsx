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

import { TextField, Dropdown, RadioButtonGroup, FormGroup, FormCheckBox, Typography } from "@wso2/ui-toolkit";
import { FormKeylookup, ParamManager } from "@wso2/mi-diagram";
import styled from "@emotion/styled";
import { Colors } from "@wso2/mi-diagram/lib/resources/constants";

interface OptionProps {
    value: string;
}

const ExButtonWrapper = styled.div<{ isActive: boolean }>`
    margin-left: -14px;
    margin-top: -2px;
    padding: 3px;
    cursor: pointer;
    background-color: ${(props: { isActive: any; }) => props.isActive ? Colors.INPUT_OPTION_ACTIVE : Colors.INPUT_OPTION_INACTIVE};
    border: 1px solid ${(props: { isActive: any; }) => props.isActive ? Colors.INPUT_OPTION_ACTIVE_BORDER : "transparent"};
    &:hover {
        background-color: ${(props: { isActive: any; }) => props.isActive ? Colors.INPUT_OPTION_ACTIVE : Colors.INPUT_OPTION_HOVER};
    }
`;

const ExButton = (props: { isActive: boolean, onClick: () => void }) => {
    return (
        <ExButtonWrapper isActive={props.isActive} onClick={props.onClick}>
            <Typography sx={
                {
                    textAlign: "center",
                    margin: 0
                }} variant="h6">EX</Typography>
        </ExButtonWrapper>
    );
}

const Form = ({
    renderProps,
    register,
    watch,
    setValue,
    control,
    path,
    errors,
    isTemplate,
    templateParams,
    setTemplateParams,
    additionalParams,
    setAdditionalParams,
    additionalOauthParams,
    setAdditionalOauthParams
}: any) => {
    const addressingVersions: OptionProps[] = [
        { value: "final" },
        { value: "submission" },
    ];

    const grantTypes: OptionProps[] = [
        { value: "Authorization Code" },
        { value: "Client Credentials" },
        { value: "Password" }
    ];

    const authorizationModes: OptionProps[] = [
        { value: "Header" },
        { value: "Payload" },
    ];

    const authTypes: OptionProps[] = [
        { value: "None" },
        { value: "Basic Auth" },
        { value: "OAuth" }
    ];

    const timeoutOptions: OptionProps[] = [
        { value: "Never" },
        { value: "Discard" },
        { value: "Fault" }
    ];

    const httpMethods: OptionProps[] = [
        { value: "GET" },
        { value: "POST" },
        { value: "PUT" },
        { value: "DELETE" },
        { value: "HEAD" },
        { value: "OPTIONS" },
        { value: "PATCH" },
        { value: "leave_as_is" }
    ];

    const generateDisplayValue = (paramValues: any) => {
        const result: string = "value:" + paramValues.paramValues[1].value + "; scope:" + paramValues.paramValues[2].value + ";";
        return result.trim();
    };

    const handleTemplateParametersChange = (params: any) => {
        const modifiedParams = {
            paramFields: params.paramFields,
            paramValues: params.paramValues.map((param: any, index: number) => {
                return {
                    ...param,
                    key: index + 1,
                    value: param.paramValues[0].value
                }
            })
        };
        setTemplateParams(modifiedParams);

        const templateParameters: any = [];
        modifiedParams.paramValues.map((param: any) => {
            templateParameters.push(param.paramValues[0].value);
        })
        setValue('templateParameters', templateParameters)
    };

    const handleAdditionalPropertiesChange = (params: any) => {
        const modifiedParams = {
            paramFields: params.paramFields,
            paramValues: params.paramValues.map((param: any) => {
                return {
                    ...param,
                    key: param.paramValues[0].value,
                    value: generateDisplayValue(param)
                }
            })
        };
        setAdditionalParams(modifiedParams);

        const endpointProperties: any = [];
        modifiedParams.paramValues.map((param: any) => {
            endpointProperties.push({
                name: param.paramValues[0].value,
                value: param.paramValues[1].value,
                scope: param.paramValues[2].value
            });
        });
        setValue('properties', endpointProperties);
    };

    const handleOauthParametersChange = (params: any) => {
        const modifiedParams = {
            paramFields: params.paramFields,
            paramValues: params.paramValues.map((param: any) => {
                return {
                    ...param,
                    key: param.paramValues[0].value,
                    value: param.paramValues[1].value
                }
            })
        };
        setAdditionalOauthParams(modifiedParams);

        const oauthProperties: any = [];
        modifiedParams.paramValues.map((param: any) => {
            oauthProperties.push({
                key: param.paramValues[0].value,
                value: param.paramValues[1].value
            });
        });
        setValue('oauthProperties', oauthProperties);
    };

    return (
        <>
            {isTemplate && (
                <FormGroup title="Template Properties" isCollapsed={false}>
                    <TextField
                        required
                        autoFocus
                        label="Template Name"
                        placeholder="Template Name"
                        {...renderProps("templateName")}
                    />
                    <RadioButtonGroup
                        label="Require Template Parameters"
                        options={[{ content: "Yes", value: true }, { content: "No", value: false }]}
                        {...register("requireTemplateParameters")}
                    />
                    {watch('requireTemplateParameters') && (
                        <ParamManager
                            paramConfigs={templateParams}
                            readonly={false}
                            onChange={handleTemplateParametersChange}
                        />
                    )}
                </FormGroup>
            )}
            <FormGroup title="Basic Properties" isCollapsed={false}>
                <TextField
                    required
                    autoFocus
                    label="Endpoint Name"
                    placeholder="Endpoint Name"
                    {...renderProps("endpointName")}
                    size={100}
                />
                <TextField
                    required
                    label="URI Template"
                    placeholder="URI Template"
                    {...renderProps("uriTemplate")}
                />
                <Dropdown
                    required
                    label="HTTP Method"
                    items={httpMethods}
                    {...renderProps("httpMethod")}
                />
                <RadioButtonGroup
                    label="Trace Enabled"
                    options={[{ content: "Enable", value: "enable" }, { content: "Disable", value: "disable" }]}
                    {...renderProps("traceEnabled")}
                />
                <RadioButtonGroup
                    label="Statistics Enabled"
                    options={[{ content: "Enable", value: "enable" }, { content: "Disable", value: "disable" }]}
                    {...renderProps("statisticsEnabled")}
                />
            </FormGroup>
            <FormGroup title="Miscellaneous Properties" isCollapsed={true}>
                <TextField
                    label="Description"
                    placeholder="Description"
                    {...renderProps("description")}
                />
                <RadioButtonGroup
                    label="Require Additional Properties"
                    options={[{ content: "Yes", value: true }, { content: "No", value: false }]}
                    {...register("requireProperties")}
                />
                {watch('requireProperties') && (
                    <ParamManager
                        paramConfigs={additionalParams}
                        readonly={false}
                        onChange={handleAdditionalPropertiesChange}
                    />
                )}
            </FormGroup>
            <FormGroup title="Auth Configuration" isCollapsed={true}>
                <Dropdown
                    label="Auth Type"
                    items={authTypes}
                    {...renderProps("authType")}
                />
                {watch('authType') === 'Basic Auth' && <>
                    <TextField
                        required
                        label="Basic Auth Username"
                        placeholder="Username"
                        {...renderProps("basicAuthUsername")}
                        icon={{
                            iconComponent: <ExButton isActive={watch("basicUsernameExpression")} onClick={() => {
                                setValue("basicUsernameExpression", !watch("basicUsernameExpression"));
                            }} />,
                            position: "end"
                        }}
                    />
                    <TextField
                        required
                        label="Basic Auth Password"
                        placeholder="Password"
                        {...renderProps("basicAuthPassword")}
                        icon={{
                            iconComponent: <ExButton isActive={watch("basicPasswordExpression")} onClick={() => {
                                setValue("basicPasswordExpression", !watch("basicPasswordExpression"));
                            }} />,
                            position: "end"
                        }}
                    />
                </>}
                {watch('authType') === 'OAuth' && <>
                    <Dropdown
                        label="OAuth Authorization Mode"
                        items={authorizationModes}
                        {...renderProps("authMode")}
                    />
                    <Dropdown
                        label="OAuth Grant Type"
                        items={grantTypes}
                        {...renderProps("grantType")}
                    />
                    <TextField
                        required
                        label="Client ID"
                        placeholder="Client ID"
                        {...renderProps("clientId")}
                        icon={{
                            iconComponent: <ExButton isActive={watch("clientIdExpression")} onClick={() => {
                                setValue("clientIdExpression", !watch("clientIdExpression"));
                            }} />,
                            position: "end"
                        }}
                    />
                    <TextField
                        required
                        label="Client Secret"
                        placeholder="Client Secret"
                        {...renderProps("clientSecret")}
                        icon={{
                            iconComponent: <ExButton isActive={watch("clientSecretExpression")} onClick={() => {
                                setValue("clientSecretExpression", !watch("clientSecretExpression"));
                            }} />,
                            position: "end"
                        }}
                    />
                    <TextField
                        required
                        label="Token Url"
                        placeholder="Token Url"
                        {...renderProps("tokenUrl")}
                        icon={{
                            iconComponent: <ExButton isActive={watch("tokenUrlExpression")} onClick={() => {
                                setValue("tokenUrlExpression", !watch("tokenUrlExpression"));
                            }} />,
                            position: "end"
                        }}
                    />
                    {watch('grantType') === 'Authorization Code' && (
                        <TextField
                            required
                            label="Refresh Token"
                            placeholder="Refresh Token"
                            {...renderProps("refreshToken")}
                            icon={{
                                iconComponent: <ExButton isActive={watch("refreshTokenExpression")} onClick={() => {
                                    setValue("refreshTokenExpression", !watch("refreshTokenExpression"));
                                }} />,
                                position: "end"
                            }}
                        />
                    )}
                    {watch('grantType') === 'Password' && <>
                        <TextField
                            required
                            label="Username"
                            placeholder="Username"
                            {...renderProps("username")}
                            icon={{
                                iconComponent: <ExButton isActive={watch("usernameExpression")} onClick={() => {
                                    setValue("usernameExpression", !watch("usernameExpression"));
                                }} />,
                                position: "end"
                            }}
                        />
                        <TextField
                            required
                            label="Password"
                            placeholder="Password"
                            {...renderProps("password")}
                            icon={{
                                iconComponent: <ExButton isActive={watch("passwordExpression")} onClick={() => {
                                    setValue("passwordExpression", !watch("passwordExpression"));
                                }} />,
                                position: "end"
                            }}
                        />
                    </>}
                    <RadioButtonGroup
                        label="Require Additional OAuth Properties"
                        options={[{ content: "Yes", value: true }, { content: "No", value: false }]}
                        {...renderProps("requireOauthParameters")}
                    />
                    {watch('requireOauthParameters') && (
                        <ParamManager
                            paramConfigs={additionalOauthParams}
                            readonly={false}
                            onChange={handleOauthParametersChange}
                        />
                    )}
                </>}
            </FormGroup>
            <FormGroup title="Quality of Service Properties" isCollapsed={true}>
                <RadioButtonGroup
                    label="Addressing"
                    options={[{ content: "Enable", value: "enable" }, { content: "Disable", value: "disable" }]}
                    {...renderProps("addressingEnabled")}
                />
                {watch('addressingEnabled') === 'enable' && <>
                    <Dropdown
                        label="Addressing Version"
                        items={addressingVersions}
                        {...renderProps("addressingVersion")}
                    />
                    <RadioButtonGroup
                        label="Addressing Separate Listener"
                        options={[{ content: "Enable", value: "enable" }, { content: "Disable", value: "disable" }]}
                        {...renderProps("addressListener")}
                    />
                </>}
                <RadioButtonGroup
                    label="Security"
                    options={[{ content: "Enable", value: "enable" }, { content: "Disable", value: "disable" }]}
                    {...renderProps("securityEnabled")}
                />
                {watch('securityEnabled') === 'enable' && <>
                    <FormCheckBox
                        name="seperatePolicies"
                        label="Specify as Inbound and Outbound Policies"
                        control={control}
                    />
                    {watch("seperatePolicies") ? <>
                        <FormKeylookup
                            control={control}
                            label="Inbound Policy Key"
                            name="inboundPolicyKey"
                            filterType="ws_policy"
                            path={path}
                            errorMsg={errors.inboundPolicyKey?.message.toString()}
                            {...register("inboundPolicyKey")}
                        />
                        <FormKeylookup
                            control={control}
                            label="Outbound Policy Key"
                            name="outboundPolicyKey"
                            filterType="ws_policy"
                            path={path}
                            errorMsg={errors.outboundPolicyKey?.message.toString()}
                            {...register("outboundPolicyKey")}
                        />
                    </> : (
                        <FormKeylookup
                            control={control}
                            label="Policy Key"
                            name="policyKey"
                            filterType="ws_policy"
                            path={path}
                            errorMsg={errors.policyKey?.message.toString()}
                            {...register("policyKey")}
                        />
                    )}
                </>}
            </FormGroup>
            <FormGroup title="Endpoint Error Handling" isCollapsed={true}>
                <TextField
                    label="Suspend Error Codes"
                    placeholder="304,305"
                    {...renderProps("suspendErrorCodes")}
                />
                <TextField
                    label="Suspend Initial Duration"
                    placeholder="-1"
                    {...renderProps("initialDuration")}
                />
                <TextField
                    label="Suspend Maximum Duration"
                    placeholder="1000"
                    {...renderProps("maximumDuration")}
                />
                <TextField
                    label="Suspend Progression Factor"
                    placeholder="1"
                    {...renderProps("progressionFactor")}
                />
                <TextField
                    label="Retry Error Codes"
                    placeholder="304,305"
                    {...renderProps("retryErrorCodes")}
                />
                <TextField
                    label="Retry Count"
                    placeholder="10"
                    {...renderProps("retryCount")}
                />
                <TextField
                    label="Retry Delay"
                    placeholder="1000"
                    {...renderProps("retryDelay")}
                />
                <TextField
                    label="Timeout Duration"
                    placeholder="1000"
                    {...renderProps("timeoutDuration")}
                />
                <Dropdown
                    label="Timeout Action"
                    items={timeoutOptions}
                    {...renderProps("timeoutAction")}
                />
            </FormGroup>
        </>
    )
}

export default Form;
