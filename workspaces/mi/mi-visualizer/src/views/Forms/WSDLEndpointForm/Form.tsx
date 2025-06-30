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

import { TextField, Dropdown, RadioButtonGroup, FormGroup, FormCheckBox } from "@wso2/ui-toolkit";
import { FormKeylookup, ParamManager } from "@wso2/mi-diagram";

interface OptionProps {
    value: string;
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
}: any) => {
    const addressingVersions: OptionProps[] = [
        { value: "final" },
        { value: "submission" },
    ];

    const timeoutOptions: OptionProps[] = [
        { value: "Never" },
        { value: "Discard" },
        { value: "Fault" }
    ];

    const formatOptions: OptionProps[] = [
        { value: "LEAVE_AS_IS" },
        { value: "SOAP 1.1" },
        { value: "SOAP 1.2" },
        { value: "POX" },
        { value: "GET" },
        { value: "REST" }
    ];

    const optimizeOptions: OptionProps[] = [
        { value: "LEAVE_AS_IS" },
        { value: "MTOM" },
        { value: "SWA" }
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
                    label="WSDL URI"
                    placeholder="WSDL URI"
                    {...renderProps("wsdlUri")}
                />
                <TextField
                    required
                    label="WSDL Service"
                    placeholder="WSDL Service"
                    {...renderProps("wsdlService")}
                />
                <TextField
                    required
                    label="WSDL Port"
                    placeholder="WSDL Port"
                    {...renderProps("wsdlPort")}
                />
                <Dropdown
                    label="Format"
                    items={formatOptions}
                    {...renderProps("format")}
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
                <Dropdown
                    label="Optimize"
                    items={optimizeOptions}
                    {...renderProps("optimize")}
                />
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
            <FormGroup title="Quality of Service Properties" isCollapsed={true}>
                <RadioButtonGroup
                    label="Addressing"
                    options={[{ content: "Enable", value: "enable" }, { content: "Disable", value: "disable" }]}
                    {...renderProps("addressingEnabled")}
                />
                {watch('addressingEnabled') === 'enable' && (
                    <>
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
                    </>
                )}
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
