/* eslint-disable @typescript-eslint/no-explicit-any */
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

import { DiagramService, Range, TagRange } from '@wso2/mi-syntax-tree/lib/src';
import { Diagnostic, Position, TextDocumentIdentifier, TextEdit } from "vscode-languageserver-types";
import { HelperPaneData } from '../../interfaces/mi-diagram';

interface Record {
    name: string;
    value: string;
}

export interface ApplyEditRequest {
    text: string;
    documentUri: string;
    range: Range;
    disableFormatting?: boolean;
    disableUndoRedo?: boolean;
    addNewLine?: boolean;
    waitForEdits?: boolean;
}

export interface ApplyEditsRequest {
    documentUri: string;
    edits: ExtendedTextEdit[];
    disableFormatting?: boolean;
    disableUndoRedo?: boolean;
    addNewLine?: boolean;
    waitForEdits?: boolean;
}

export interface ApplyEditResponse {
    status: boolean;
}

export interface CreateAPIRequest {
    artifactDir: string;
    name: string;
    xmlData?: string;
    version?: string;
    context?: string;
    versionType?: string;
    saveSwaggerDef?: boolean;
    swaggerDefPath?: string;
    wsdlType?: "file" | "url";
    wsdlDefPath?: string;
    wsdlEndpointName?: string;
    projectDir?: string;
}

export interface EditAPIRequest {
    documentUri: string;
    apiName: string;
    version?: string;
    xmlData: string;
    handlersXmlData: string;
    apiRange: Range;
    handlersRange: Range;
}

export interface GetInboundEpDirRequest {
    path: string;

}

export interface CreateEndpointRequest {
    directory: string;
    name: string;
    type: string;
    configuration: string;
    address: string;
    uriTemplate: string;
    method: string;
    wsdlUri: string;
    wsdlService: string;
    wsdlPort: string;
    targetTemplate: string;
    uri: string;
}

export interface CreateEndpointResponse {
    path: string;
}

export interface UpdateLoadBalanceEPRequest {
    directory: string;
    name: string;
    algorithm: string;
    failover: string;
    buildMessage: string;
    sessionManagement: string;
    sessionTimeout: number;
    description: string;
    endpoints: { type: string; value: string; }[];
    properties: { name: string; value: string; scope: string; }[];
    getContentOnly: boolean;
}

export interface UpdateLoadBalanceEPResponse {
    path: string;
    content: string;
}

export interface GetLoadBalanceEPRequest {
    path: string;
}

export interface GetLoadBalanceEPResponse {
    name: string;
    algorithm: string;
    failover: string;
    buildMessage: string;
    sessionManagement: string;
    sessionTimeout: number;
    description: string;
    endpoints: { type: string; value: string; }[];
    properties: { name: string; value: string; scope: string; }[];
}

export interface UpdateFailoverEPRequest {
    directory: string;
    name: string;
    buildMessage: string;
    description: string;
    endpoints: { type: string; value: string; }[];
    properties: { name: string; value: string; scope: string; }[];
    getContentOnly: boolean;
}

export interface UpdateFailoverEPResponse {
    path: string;
    content: string;
}

export interface GetFailoverEPRequest {
    path: string;
}

export interface GetFailoverEPResponse {
    name: string;
    buildMessage: string;
    description: string;
    endpoints: { type: string; value: string; }[];
    properties: { name: string; value: string; scope: string; }[];
}

export interface UpdateRecipientEPRequest {
    directory: string;
    name: string;
    description: string;
    endpoints: { type: string; value: string; }[];
    properties: { name: string; value: string; scope: string; }[];
    getContentOnly: boolean;
}

export interface UpdateRecipientEPResponse {
    path: string;
    content: string;
}

export interface GetRecipientEPRequest {
    path: string;
}

export interface GetRecipientEPResponse {
    name: string;
    description: string;
    endpoints: { type: string; value: string; }[];
    properties: { name: string; value: string; scope: string; }[];
}

export interface UpdateTemplateEPRequest {
    directory: string;
    name: string;
    uri: string;
    template: string;
    description: string;
    parameters: { name: string; value: string; }[];
    getContentOnly: boolean;
}

export interface UpdateTemplateEPResponse {
    path: string;
    content: string;
}

export interface GetTemplateEPRequest {
    path: string;
}

export interface GetTemplateEPResponse {
    name: string;
    uri: string;
    template: string;
    description: string;
    parameters: { name: string; value: string; }[];
}

export interface CreateInboundEndpointRequest {
    directory: string;
    attributes: { [name: string]: string | number | boolean };
    parameters: { [key: string]: string | number | boolean };
}

export interface CreateInboundEndpointResponse {
    path: string;
}

export interface GetInboundEndpointResponse {
    name: string;
    type: string;
    sequence: string;
    errorSequence: string;
    suspend?: boolean;
    trace?: boolean;
    statistics?: boolean;
    parameters: { [key: string]: string | number | boolean };
}

export interface GetInboundEndpointRequest {
    path: string;
}

export interface CreateLocalEntryRequest {
    directory: string;
    name: string;
    type: string;
    value: string;
    URL: string;
    getContentOnly: boolean;
}

export interface CreateLocalEntryResponse {
    fileContent: string;
    filePath: string;
}

export interface GetLocalEntryRequest {
    path: string;
}

export interface GetLocalEntryResponse {
    name: string;
    type: string;
    inLineTextValue: string;
    inLineXmlValue: string;
    sourceURL: string;
}
export interface FileDirResponse {
    path: string;
}

export interface CreateMessageStoreRequest {
    directory: string;
    name: string;
    type: string;
    initialContextFactory: string;
    providerURL: string;
    connectionFactory: string;
    jndiQueueName: string;
    userName: string;
    password: string;
    cacheConnection: boolean;
    jmsAPIVersion: string;
    rabbitMQServerHostName: string;
    rabbitMQServerPort: string;
    sslEnabled: boolean;
    trustStoreLocation: string;
    trustStoreType: string;
    trustStorePassword: string;
    keyStoreLocation: string;
    keyStoreType: string;
    keyStorePassword: string;
    sslVersion: string;
    rabbitMQQueueName: string;
    rabbitMQExchangeName: string;
    routineKey: string;
    virtualHost: string;
    dataBaseTable: string;
    driver: string;
    url: string;
    user: string;
    dataSourceName: string;
    queueConnectionFactory: string;
    pollingCount: string;
    xPath: string;
    enableProducerGuaranteedDelivery: boolean;
    providerClass: string;
    customParameters: Record[];
    failOverMessageStore: string;
    namespaces: any;
}

export interface CreateMessageStoreResponse {
    path: string;
}

export interface GetMessageStoreResponse {
    name: string;
    type: string;
    initialContextFactory: string;
    providerURL: string;
    connectionFactory: string;
    jndiQueueName: string;
    userName: string;
    password: string;
    cacheConnection: boolean;
    jmsAPIVersion: string;
    rabbitMQServerHostName: string;
    rabbitMQServerPort: string;
    sslEnabled: boolean;
    trustStoreLocation: string;
    trustStoreType: string;
    trustStorePassword: string;
    keyStoreLocation: string;
    keyStoreType: string;
    keyStorePassword: string;
    sslVersion: string;
    rabbitMQQueueName: string;
    rabbitMQExchangeName: string;
    routineKey: string;
    virtualHost: string;
    dataBaseTable: string;
    driver: string;
    url: string;
    user: string;
    dataSourceName: string;
    queueConnectionFactory: string;
    pollingCount: string;
    xPath: string;
    enableProducerGuaranteedDelivery: boolean;
    providerClass: string;
    customParameters: Record[];
    failOverMessageStore: string;
    connectionInformationType?: string;
    namespaces: any;
}

export interface GetMessageStoreRequest {
    path: string;
}

export interface CreateProjectRequest {
    directory: string;
    name: string;
    open: boolean;
    groupID?: string;
    artifactID?: string;
    version?: string;
    miVersion: string;
}

export interface ImportProjectRequest {
    source: string;
    directory: string;
    open: boolean;
}

export interface MigrateProjectRequest {
    dir: string;
    sources: string[];
}

export interface Connector {
    path: string;
    name: string;
    description: string;
    icon: string;
}

export interface ConnectorOperation {
    name: string;
    description: string;
    isHidden: boolean;
}
export interface ConnectorsResponse {
    data: Connector[];
}

export interface UpdatePOMRequest {
    documentUri: string;
    groupId: string;
    artifactId: string;
    version: string;
}

export interface UpdatePOMResponse {
    textEdits: TextEdit[];
}

export interface ESBConfigsResponse {
    data: string[];
}

export interface CommandsRequest {
    commands: any[];
}

export interface CommandsResponse {
    data: string;
}

export interface GetSTFromUriRequest {
    documentUri: string;
}

export type ArtifactType = "api" | "data-services" | "data-sources" | "endpoints" | "inbound-endpoints" | "local-entries" | "message-processors" | "message-stores" | "proxy-services" | "sequences" | "tasks" | "templates";

export type GetSTFromArtifactRequest = {
    artifactType: ArtifactType;
    artifactName: string;
}

export type getSTRequest = GetSTFromUriRequest | GetSTFromArtifactRequest;

export interface getSTResponse {
    syntaxTree: any;
    defFilePath: string;
}

export interface GetProjectRootRequest {
    path: string;

}

export interface ConnectorRequest {
    path: string;
}
export interface ConnectorResponse {
    data: string[];
}

export interface ApiDirectoryResponse {
    data: string;
}

export interface EndpointDirectoryResponse {
    data: string;
}

export interface ShowErrorMessageRequest {
    message: string;
}

export interface OpenDiagramRequest {
    path: string;
    beside?: boolean;
    line?: number;
}

export interface CreateAPIResponse {
    path: string;
}

export interface EditAPIResponse {
    path: string;
}

export interface EndpointsAndSequencesResponse {
    data: any;
}

export interface TemplatesResponse {
    data: any;
}

export interface SequenceDirectoryResponse {
    data: string;
}

export interface CreateSequenceRequest {
    directory: string;
    name: string;
    endpoint: string;
    onErrorSequence: string;
    getContentOnly: boolean;
    statistics: boolean;
    trace: boolean;
}
export interface CreateSequenceResponse {
    fileContent: string;
    filePath: string;
}

export interface CreateMessageProcessorRequest {
    directory: string;
    messageProcessorName: string;
    messageProcessorType: string;
    messageStoreType: string;
    failMessageStoreType: string;
    sourceMessageStoreType: string;
    targetMessageStoreType: string;
    processorState: string;
    dropMessageOption: string;
    quartzConfigPath: string;
    cron: string;
    forwardingInterval: number | null;
    retryInterval: number | null;
    maxRedeliveryAttempts: number | null;
    maxConnectionAttempts: number | null;
    connectionAttemptInterval: number | null;
    taskCount: number | null;
    statusCodes: string;
    clientRepository: string;
    axis2Config: string;
    endpointType: string;
    sequenceType: string;
    replySequenceType: string;
    faultSequenceType: string;
    deactivateSequenceType: string;
    endpoint: string;
    sequence: string;
    replySequence: string;
    faultSequence: string;
    deactivateSequence: string;
    samplingInterval: number | null;
    samplingConcurrency: number | null;
    providerClass: string;
    properties: any;
}

export interface CreateMessageProcessorResponse {
    path: string;
}

export interface RetrieveMessageProcessorRequest {
    path: string;
}

export interface RetrieveMessageProcessorResponse {
    messageProcessorName: string;
    messageProcessorType: string;
    messageStoreType: string;
    failMessageStoreType: string;
    sourceMessageStoreType: string;
    targetMessageStoreType: string;
    processorState: string;
    dropMessageOption: string;
    quartzConfigPath: string;
    cron: string;
    forwardingInterval: number | null;
    retryInterval: number | null;
    maxRedeliveryAttempts: number | null;
    maxConnectionAttempts: number | null;
    connectionAttemptInterval: number | null;
    taskCount: number | null;
    statusCodes: string;
    clientRepository: string;
    axis2Config: string;
    endpointType: string;
    sequenceType: string;
    replySequenceType: string;
    faultSequenceType: string;
    deactivateSequenceType: string;
    endpoint: string;
    sequence: string;
    replySequence: string;
    faultSequence: string;
    deactivateSequence: string;
    samplingInterval: number | null;
    samplingConcurrency: number | null;
    providerClass: string;
    properties: any;
    hasCustomProperties: boolean;
}

export interface CreateProxyServiceRequest {
    directory: string;
    proxyServiceName: string;
    proxyServiceType: string;
    selectedTransports: string;
    endpointType: string;
    endpoint: string;
    requestLogLevel: string;
    responseLogLevel: string;
    securityPolicy: string;
    requestXslt: string;
    responseXslt: string;
    transformResponse: string;
    wsdlUri: string;
    wsdlService: string;
    wsdlPort: number | null;
    publishContract: string;
}

export interface CreateProxyServiceResponse {
    path: string;
}

export interface UpdateHttpEndpointRequest {
    directory: string;
    endpointName: string;
    traceEnabled: string;
    statisticsEnabled: string;
    uriTemplate: string;
    httpMethod: string;
    description: string;
    requireProperties: boolean;
    properties: any;
    authType: string;
    basicAuthUsername: string;
    basicAuthPassword: string;
    authMode: string;
    grantType: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    tokenUrl: string;
    username: string;
    password: string;
    requireOauthParameters: boolean;
    oauthProperties: any;
    addressingEnabled: string;
    addressingVersion: string;
    addressListener: string;
    securityEnabled: string;
    seperatePolicies: boolean;
    policyKey: string;
    inboundPolicyKey: string;
    outboundPolicyKey: string;
    suspendErrorCodes: string;
    initialDuration: number;
    maximumDuration: number;
    progressionFactor: number;
    retryErrorCodes: string;
    retryCount: number;
    retryDelay: number;
    timeoutDuration: number;
    timeoutAction: string;
    templateName: string;
    requireTemplateParameters: boolean;
    templateParameters: any;
    getContentOnly: boolean;
}

export interface UpdateHttpEndpointResponse {
    path: string;
    content: string;
}

export interface RetrieveHttpEndpointRequest {
    path: string;
}

export interface RetrieveHttpEndpointResponse {
    endpointName: string;
    traceEnabled: string;
    statisticsEnabled: string;
    uriTemplate: string;
    httpMethod: string;
    description: string;
    requireProperties: boolean;
    properties: any;
    authType: string;
    basicAuthUsername: string;
    basicAuthPassword: string;
    authMode: string;
    grantType: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    tokenUrl: string;
    username: string;
    password: string;
    requireOauthParameters: boolean;
    oauthProperties: any;
    addressingEnabled: string;
    addressingVersion: string;
    addressListener: string;
    securityEnabled: string;
    seperatePolicies: boolean;
    policyKey: string;
    inboundPolicyKey: string;
    outboundPolicyKey: string;
    suspendErrorCodes: string;
    initialDuration: number;
    maximumDuration: number;
    progressionFactor: number;
    retryErrorCodes: string;
    retryCount: number;
    retryDelay: number;
    timeoutDuration: number;
    timeoutAction: string;
    templateName: string;
    requireTemplateParameters: boolean;
    templateParameters: any;
}

export interface UpdateAddressEndpointRequest {
    directory: string;
    endpointName: string;
    format: string;
    traceEnabled: string;
    statisticsEnabled: string;
    uri: string;
    optimize: string;
    description: string;
    requireProperties: boolean;
    properties: any;
    addressingEnabled: string;
    addressingVersion: string;
    addressListener: string;
    securityEnabled: string;
    seperatePolicies: boolean;
    policyKey: string;
    inboundPolicyKey: string;
    outboundPolicyKey: string;
    suspendErrorCodes: string;
    initialDuration: number;
    maximumDuration: number;
    progressionFactor: number;
    retryErrorCodes: string;
    retryCount: number;
    retryDelay: number;
    timeoutDuration: number;
    timeoutAction: string;
    templateName: string;
    requireTemplateParameters: boolean;
    templateParameters: any;
    getContentOnly: boolean;
    isPopup: boolean;
}

export interface UpdateAddressEndpointResponse {
    path: string;
    content: string;
}

export interface RetrieveAddressEndpointRequest {
    path: string;
}

export interface RetrieveAddressEndpointResponse {
    endpointName: string;
    format: string;
    traceEnabled: string;
    statisticsEnabled: string;
    uri: string;
    optimize: string;
    description: string;
    requireProperties: boolean;
    properties: any;
    addressingEnabled: string;
    addressingVersion: string;
    addressListener: string;
    securityEnabled: string;
    seperatePolicies: boolean;
    policyKey: string;
    inboundPolicyKey: string;
    outboundPolicyKey: string;
    suspendErrorCodes: string;
    initialDuration: number;
    maximumDuration: number;
    progressionFactor: number;
    retryErrorCodes: string;
    retryCount: number;
    retryDelay: number;
    timeoutDuration: number;
    timeoutAction: string;
    templateName: string;
    requireTemplateParameters: boolean;
    templateParameters: any;
}

export interface UpdateWsdlEndpointRequest {
    directory: string;
    endpointName: string;
    format: string;
    traceEnabled: string;
    statisticsEnabled: string;
    optimize: string;
    description: string;
    wsdlUri: string;
    wsdlService: string;
    wsdlPort: string;
    requireProperties: boolean;
    properties: any;
    addressingEnabled: string;
    addressingVersion: string;
    addressListener: string;
    securityEnabled: string;
    seperatePolicies: boolean;
    policyKey: string;
    inboundPolicyKey: string;
    outboundPolicyKey: string;
    suspendErrorCodes: string;
    initialDuration: number;
    maximumDuration: number;
    progressionFactor: number;
    retryErrorCodes: string;
    retryCount: number;
    retryDelay: number;
    timeoutDuration: number;
    timeoutAction: string;
    templateName: string;
    requireTemplateParameters: boolean;
    templateParameters: any;
    getContentOnly: boolean;
}

export interface UpdateWsdlEndpointResponse {
    path: string;
    content: string;
}

export interface RetrieveWsdlEndpointRequest {
    path: string;
}

export interface RetrieveWsdlEndpointResponse {
    endpointName: string;
    format: string;
    traceEnabled: string;
    statisticsEnabled: string;
    optimize: string;
    description: string;
    wsdlUri: string;
    wsdlService: string;
    wsdlPort: string;
    requireProperties: boolean;
    properties: any;
    addressingEnabled: string;
    addressingVersion: string;
    addressListener: string;
    securityEnabled: string;
    seperatePolicies: boolean;
    policyKey: string;
    inboundPolicyKey: string;
    outboundPolicyKey: string;
    suspendErrorCodes: string;
    initialDuration: number;
    maximumDuration: number;
    progressionFactor: number;
    retryErrorCodes: string;
    retryCount: number;
    retryDelay: number;
    timeoutDuration: number;
    timeoutAction: string;
    templateName: string;
    requireTemplateParameters: boolean;
    templateParameters: any;
}

export interface UpdateDefaultEndpointRequest {
    directory: string;
    endpointName: string;
    format: string;
    traceEnabled: string;
    statisticsEnabled: string;
    optimize: string;
    description: string;
    requireProperties: boolean;
    properties: any;
    addressingEnabled: string;
    addressingVersion: string;
    addressListener: string;
    securityEnabled: string;
    seperatePolicies: boolean;
    policyKey: string;
    inboundPolicyKey: string;
    outboundPolicyKey: string;
    suspendErrorCodes: string;
    initialDuration: number;
    maximumDuration: number;
    progressionFactor: number;
    retryErrorCodes: string;
    retryCount: number;
    retryDelay: number;
    timeoutDuration: number;
    timeoutAction: string;
    templateName: string;
    requireTemplateParameters: boolean;
    templateParameters: any;
    getContentOnly: boolean;
}

export interface UpdateDefaultEndpointResponse {
    path: string;
    content: string;
}

export interface RetrieveDefaultEndpointRequest {
    path: string;
}

export interface RetrieveDefaultEndpointResponse {
    endpointName: string;
    format: string;
    traceEnabled: string;
    statisticsEnabled: string;
    optimize: string;
    description: string;
    requireProperties: boolean;
    properties: any;
    addressingEnabled: string;
    addressingVersion: string;
    addressListener: string;
    securityEnabled: string;
    seperatePolicies: boolean;
    policyKey: string;
    inboundPolicyKey: string;
    outboundPolicyKey: string;
    suspendErrorCodes: string;
    initialDuration: number;
    maximumDuration: number;
    progressionFactor: number;
    retryErrorCodes: string;
    retryCount: number;
    retryDelay: number;
    timeoutDuration: number;
    timeoutAction: string;
    templateName: string;
    requireTemplateParameters: boolean;
    templateParameters: any;
}

export interface CreateTaskRequest {
    directory: string;
    name: string;
    group: string;
    implementation: string;
    pinnedServers: string;
    triggerType: "simple" | "cron";
    triggerCount: number | null;
    triggerInterval: number;
    triggerCron: string;
    taskProperties: taskProperty[];
    customProperties: any[];
    sequence: CreateSequenceRequest | undefined;
}

export interface taskProperty {
    key: string;
    value: string;
    isLiteral: boolean
}

export interface CreateTaskResponse {
    path: string;
}

export interface GetTaskRequest {
    path: string;
}

export interface GetTaskResponse {
    name: string;
    group: string;
    implementation: string;
    pinnedServers: string;
    triggerType: "simple" | "cron";
    triggerCount: number | null;
    triggerInterval: number;
    triggerCron: string;
    taskProperties: taskProperty[];
}

export interface CreateTemplateRequest {
    directory: string;
    templateName: string;
    templateType: string;
    address: string;
    uriTemplate: string;
    httpMethod: string;
    wsdlUri: string;
    wsdlService: string;
    wsdlPort: number | null;
    traceEnabled: boolean;
    statisticsEnabled: boolean;
    parameters: any;
    getContentOnly: boolean;
    isEdit: boolean;
    range?: Range;
}

export interface CreateTemplateResponse {
    path: string;
    content: string;
}

export interface RetrieveTemplateRequest {
    path: string;
}

export interface RetrieveTemplateResponse {
    templateName: string;
    templateType: string;
    address: string;
    uriTemplate: string;
    httpMethod: string;
    wsdlUri: string;
    wsdlService: string;
    wsdlPort: number | null;
    traceEnabled: boolean;
    statisticsEnabled: boolean;
    parameters: any;
}

export interface CreateDataServiceRequest {
    directory: string;
    dataServiceName: string;
    dataServiceNamespace: string;
    serviceGroup: string;
    selectedTransports: string;
    publishSwagger?: string;
    jndiName?: string;
    enableBoxcarring: boolean | null;
    enableBatchRequests: boolean | null;
    serviceStatus: string | null;
    disableLegacyBoxcarringMode: boolean | null;
    enableStreaming: boolean | null;
    description?: string;
    datasources: Datasource[];
    authProviderClass?: string;
    authProperties: Property[];
    queries?: Query[];
    operations?: Operation[];
    resources?: Resource[];
}

export interface CreateDataServiceResponse {
    path: string;
}

export interface RetrieveDataServiceRequest {
    path: string;
}

export interface RetrieveDataServiceResponse {
    dataServiceName: string;
    dataServiceNamespace: string;
    serviceGroup: string;
    selectedTransports: string;
    publishSwagger?: string;
    jndiName?: string;
    enableBoxcarring: boolean | null;
    enableBatchRequests: boolean | null;
    serviceStatus: boolean | null;
    disableLegacyBoxcarringMode: boolean | null;
    enableStreaming: boolean | null;
    description?: string;
    datasources: Datasource[];
    authProviderClass?: string;
    authProperties: Property[];
    http: boolean | null;
    https: boolean | null;
    jms: boolean | null;
    local: boolean | null;
}

export interface CreateDssDataSourceRequest {
    directory: string;
    type: string;
    dataSourceName: string;
    enableOData: boolean | null;
    dynamicUserAuthClass?: string;
    datasourceProperties: Property[];
    datasourceConfigurations: Configuration[];
    dynamicUserAuthMapping?: boolean | null;
}

export interface CreateDssDataSourceResponse {
    path: string;
}

export interface Datasource {
    dataSourceName: string;
    enableOData: boolean | null;
    dynamicUserAuthClass?: string;
    datasourceProperties: Property[];
    datasourceConfigurations: Configuration[];
}

export interface DriverPathResponse {
    path: string;
}

export interface AddDriverToLibRequest {
    url: string;
}

export interface AddDriverToLibResponse {
    path: string;
}

export interface Property {
    key: string;
    value: any;
}

export interface Configuration {
    carbonUsername: string;
    username: string;
    password: string;
}

export interface Query {
    queryName: string;
    datasource: string;
    sqlQuery?: string;
    expression?: string;
    returnGeneratedKeys: boolean | null;
    keyColumns?: string;
    returnUpdatedRowCount: boolean | null;
    queryProperties: Property[];
    hasQueryProperties: boolean | null;
    queryParams: QueryParam[];
    result?: Result;
}

export interface QueryParam {
    paramName: string;
    paramType: string;
    sqlType: string;
    defaultValue?: string;
    type: string;
    ordinal?: string;
    optional: boolean;
    validators: Validator[];
}

export interface Validator {
    validationType: string;
    minimum?: string;
    maximum?: string;
    pattern?: string;
}

export interface Result {
    useColumnNumbers: boolean | null;
    escapeNonPrintableChar: boolean | null;
    defaultNamespace?: string;
    xsltPath?: string;
    rdfBaseURI?: string;
    element?: string;
    rowName?: string
    outputType?: string;
    jsonPayload?: string;
    elements: ElementResult[];
    complexElements: ComplexElementResult[];
    attributes: AttributeResult[];
    queries: QueryResult[];
}

export interface ElementResult {
    elementName: string;
    elementNamespace?: string;
    datasourceColumn?: string;
    queryParam?: string;
    arrayName?: string;
    xsdType: string;
    optional: boolean;
    exportName?: string;
    exportType?: string;
    requiredRoles: string;
}

export interface ComplexElementResult {
    elementName: string;
    elementNamespace?: string;
    arrayName?: string;
    childElements?: string;
    requiredRoles: string;
}

export interface AttributeResult {
    attributeName: string;
    datasourceColumn?: string;
    queryParam?: string;
    xsdType: string;
    optional: boolean;
    exportName?: string;
    exportType?: string;
    requiredRoles: string;
}

export interface QueryResult {
    query: string;
    requiredRoles: string;
    queryParams: any[];
    hasQueryParams: boolean | null;
}

export interface Operation {
    operationName: string;
    returnRequestStatus: boolean | null;
    disableStreaming: boolean | null;
    operationDescription?: string;
    query: string;
    queryParams: Property[];
    hasQueryParams: boolean | null;
}

export interface Resource {
    method: string;
    path: string;
    returnRequestStatus: boolean | null;
    disableStreaming: boolean | null;
    resourceDescription?: string;
    query: string;
    queryParams: Property[];
    hasQueryParams: boolean | null;
}

export interface ProjectRootResponse {
    path: string;
}

export interface ProjectDirResponse {
    path: string;
}

export interface CreateProjectResponse {
    filePath: string;
}

export interface ImportProjectResponse {
    filePath: string;
}

export interface MigrateProjectResponse {
    filePaths: string[];
}

export interface FileStructure {
    [key: string]: string | FileStructure;
}

export interface ChatEntry {
    role: string;
    content: string;
}

export interface AIUserInput {
    chat_history: ChatEntry[];
}

export interface WriteContentToFileRequest {
    content: string[];
}

export interface WriteContentToFileResponse {
    status: boolean;
}

export interface HandleFileRequest {
    operation : "read" | "write" | "delete" | "exists";
    fileName : string;
    filePath : string;
    content?: string;
}

export interface HandleFileResponse {
    status: boolean;
    content?: string;
}

export interface WriteIdpSchemaFileToRegistryRequest {
    fileContent?: string;
    schemaName:string;
    imageOrPdf?: string;
    writeToArtifactFile?: boolean;
}

export interface WriteIdpSchemaFileToRegistryResponse {
    status: boolean;
}

export interface GetIdpSchemaFilesResponse {
    schemaFiles:  {fileName: string; documentUriWithFileName?: string}[];
}

export interface ReadIdpSchemaFileContentRequest{
    filePath: string;
}

export interface ReadIdpSchemaFileContentResponse{
    fileContent: string;
    base64Content?: string;
}

export interface HighlightCodeRequest {
    range: Range;
    force?: boolean;
}


export interface GetWorkspaceContextResponse {
    context: string[];
    rootPath: string;
}

export interface GetSelectiveWorkspaceContextResponse {
    context: string[];
    rootPath: string;
}

export interface GetSelectiveArtifactsRequest {
    path: string;
}

export interface GetSelectiveArtifactsResponse {
    artifacts: string[];
}
export interface GetProjectUuidResponse {
    uuid: string;
}

export interface UndoRedoParams {
    path: string;
}

export interface GetDefinitionRequest {
    document: TextDocumentIdentifier;
    position: Position;
}

export interface GetDefinitionResponse {
    uri: string,
    range: Range,
    fromDependency: boolean;
}

export interface GetTextAtRangeRequest {
    documentUri: string;
    range: Range;
}

export interface GetTextAtRangeResponse {
    text: string | undefined;
}

export interface GetDiagnosticsReqeust {
    documentUri: string;
}

export interface GetDiagnosticsResponse {
    documentUri: string;
    diagnostics: Diagnostic[];
}

export interface CreateRegistryResourceRequest {
    projectDirectory: string;
    templateType: string;
    filePath: string;
    resourceName: string;
    artifactName: string;
    registryPath: string;
    registryRoot: string;
    createOption: string;
    content?: string;
    roles?: string;
}

export interface CreateRegistryResourceResponse {
    path: string;
}

export interface GetRegistryMetadataRequest {
    projectDirectory: string;
}

export interface GetRegistryMetadataResponse {
    metadata: RegistryArtifact | undefined;
}

export interface UpdateRegistryMetadataRequest {
    projectDirectory: string;
    registryPath: string;
    mediaType: string;
    properties: { [key: string]: string };
}

export interface UpdateRegistryMetadataResponse {
    message: string;
}

export interface BrowseFileResponse {
    filePath: string;
}

export interface BrowseFileRequest {
    canSelectFiles: boolean;
    canSelectFolders: boolean;
    canSelectMany: boolean;
    defaultUri: string;
    title: string;
    openLabel?: string;
    filters?: { [key: string]: string[] };
}

export type ResourceType =
    | "sequence"
    | "endpoint"
    | "api"
    | "messageStore"
    | "messageProcessor"
    | "task"
    | "sequenceTemplate"
    | "endpointTemplate"
    | "proxyService"
    | "dataService"
    | "dataSource"
    | "localEntry"
    | "dataMapper"
    | "js"
    | "json"
    | "smooksConfig"
    | "swagger"
    | "wsdl"
    | "ws_policy"
    | "xsd"
    | "xsl"
    | "xslt"
    | "yaml"
    | "crt"
    | "registry";

export interface MultipleResourceType {
    type: ResourceType;
    needRegistry?: boolean;
}

export interface GetAvailableResourcesRequest {
    documentIdentifier: string | undefined;
    resourceType: ResourceType | MultipleResourceType[];
    isDebugFlow?: boolean;
}

export interface GetAvailableResourcesResponse {
    resources: { [key: string]: any }[]
    registryResources: { [key: string]: any }[]
}

export interface CreateClassMediatorRequest {
    projectDirectory: string;
    packageName: string;
    className: string;
}

export interface CreateClassMediatorResponse {
    path: string;
}

export interface CreateBallerinaModuleRequest {
    projectDirectory: string;
    moduleName: string;
    version: string;
}

export interface CreateBallerinaModuleResponse {
    path: string;
}

export interface ConfigureKubernetesRequest {
    name: string;
    replicas: number;
    targetImage: string;
    ports: Array<{ port: number }>;
    envValues: any[];
}

export interface ConfigureKubernetesResponse {
    path: string;
}

export interface GetProxyRootUrlResponse {
    anthropicUrl: string;
}

export interface ListRegistryArtifactsRequest {
    path: string;
    withAdditionalData?: boolean
}
export interface ListRegistryArtifactsResponse {
    artifacts: RegistryArtifact[];
}
export interface RegistryArtifactNamesResponse {
    artifacts: string[];
    artifactsWithAdditionalData: RegistryArtifact[];
}
export interface RegistryArtifact {
    name: string;
    file: string;
    path: string;
    isCollection: boolean;
    properties?: { key: string, value: string }[];
    mediaType?: string | null;
}
export interface RangeFormatRequest {
    uri: string;
    range?: Range;
    waitForEdits?: boolean;
}

export interface DownloadConnectorRequest {
    url: string;
}

export interface DownloadConnectorResponse {
    path: string;
}

export interface DownloadInboundConnectorRequest {
    url: string;
    isInBuilt?: boolean;
}

export interface DownloadInboundConnectorResponse {
    uischema: any;
}

export interface GetAvailableConnectorRequest {
    documentUri: string;
    connectorName: string | null;
}

export interface connectionUiSchemaRecord {
    [key: string]: string;
}

export interface GetAvailableConnectorResponse {
    connectors?: any[];
    name?: string;
    path?: string;
    uiSchemaPath?: string;
    version?: string;
    iconPath?: string;
    connectionUiSchema?: connectionUiSchemaRecord;
    actions?: any[];
    displayName?: string;
    artifactId?: string;
    connectorZipPath?: string;
}

export interface ConnectorDependency {
    artifactId: string;
    version: string;
    connectorPath?: string;
    isBallerinaModule?: boolean;
    ballerinaModulePath?: string;
}

export interface UpdateConnectorRequest {
    documentUri: string;
}

export interface GetConnectorFormRequest {
    uiSchemaPath: string;
    operation: string;
}

export interface GetConnectorFormResponse {
    formJSON: string;
}

export interface GetConnectionFormRequest {
    uiSchemaPath: string;
}

export interface GetConnectionFormResponse {
    formJSON: string;
}

export interface StoreConnectorJsonResponse {
    outboundConnectors?: any[];
    inboundConnectors?: any[];
    connectors?: any[];
}

export interface GetConnectorIconRequest {
    connectorName: string;
    documentUri: string;
}

export interface GetConnectorIconResponse {
    iconPath: string;
}

export interface LocalInboundConnectorsResponse {
    "inbound-connector-data"?: any;
}

export interface RemoveConnectorRequest {
    connectorPath: string;
}

export interface RemoveConnectorResponse {
    success: boolean;
}

export interface CreateDataSourceResponse {
    path: string;
}

export interface GetDataSourceRequest {
    path: string;
}

export interface DataSourceTemplate {
    name: string;
    projectDirectory: string;
    description?: string;
    jndiConfig?: JNDIDatasource;
    driverClassName?: string;
    url?: string;
    type: string;
    username?: string;
    password?: string;
    dataSourceConfigParameters?: { [key: string]: string | number | boolean };
    dataSourceProperties?: { [key: string]: string | number | boolean };
    externalDSClassName?: string;
    customDSType?: string;
    customDSConfiguration?: string;
}

export interface JNDIDatasource {
    useDataSourceFactory: boolean;
    properties?: { [key: string]: string | number | boolean };
    JNDIConfigName: string;
}

export interface GetIconPathUriRequest {
    path: string;
    name: string;
}

export interface GetIconPathUriResponse {
    uri: any;
}

export interface GetUserAccessTokenResponse {
    token: string;
}

export interface CreateConnectionRequest {
    connectionName: string;
    keyValuesXML: string;
    directory: string;
    filePath?: string;
}

export interface CreateConnectionResponse {
    name: string
}

export interface ConnectorConnection {
    name: string;
    path: string;
    connectionType?: string;
}

export interface GetConnectorConnectionsRequest {
    documentUri: string;
    connectorName: string | null;
}

export interface GetConnectorConnectionsResponse {
    connections?: ConnectorConnection[]
}

export interface SaveInboundEPUischemaRequest {
    connectorName: string;
    uiSchema: string;
}

export interface GetInboundEPUischemaRequest {
    documentPath?: string;
    connectorName?: string;
}

export interface GetInboundEPUischemaResponse {
    uiSchema: any;
    connectorName: string;
}

export interface GetAllRegistryPathsRequest {
    path: string;
}

export interface GetAllRegistryPathsResponse {
    registryPaths: string[];
}

export interface GetAllResourcePathsResponse {
    resourcePaths: string[];
}

export interface GetConfigurableEntriesRequest {
    configurableEntryType: string;
}

export interface GetConfigurableEntriesResponse {
    configurableEntries: { name: string; type: string }[];
}

export interface GetAllArtifactsRequest {
    path: string;
}

export interface GetAllArtifactsResponse {
    artifacts: string[]
}

export interface DeleteArtifactRequest {
    path: string;
    enableUndo?: boolean;
}

export interface APIContextsResponse {
    contexts: string[]
}

export interface BuildProjectRequest {
    buildType?: 'docker' | 'capp';
}

export interface DevantMetadata {
    isLoggedIn?: boolean;
    hasComponent?: boolean;
    hasLocalChanges?: boolean;
}

/* eslint-disable-next-line @typescript-eslint/no-empty-object-type */
export interface DeployProjectRequest {
}
export interface DeployProjectResponse {
    success: boolean;
}

export interface ExportProjectRequest {
    projectPath: string;
}

interface GenerateAPIBase {
    apiName: string;
    swaggerOrWsdlPath: string;
}

export type GenerateAPIRequest = GenerateAPIBase & (
    { mode: "create.api.from.swagger"; publishSwaggerPath?: string; wsdlEndpointName?: never; } |
    { mode: "create.api.from.wsdl"; publishSwaggerPath?: never; wsdlEndpointName?: string; }
)

export interface GenerateAPIResponse {
    apiXml: string;
    endpointXml?: string;
}

export interface SwaggerTypeRequest {
    apiName: string;
    apiPath: string;
    generatedSwagger?: string;
    existingSwagger?: string;
    isRuntimeService?: boolean;
}

export interface SwaggerFromAPIResponse {
    generatedSwagger: any;
}

export interface SwaggerFromAPIRequest {
    apiPath: string;
    swaggerPath?: string;
    isJsonIn?: boolean;
    isJsonOut?: boolean;
    host?: string;
    port?: number;
    projectPath?: string;
}

export interface CompareSwaggerAndAPIResponse {
    swaggerExists: boolean;
    isEqual?: boolean;
    generatedSwagger?: string;
    existingSwagger?: string;
}

export interface UpdateAPIFromSwaggerRequest extends SwaggerTypeRequest {
    resources: any[];
    insertPosition: Position;
}

export interface UpdateTestSuiteRequest {
    path?: string;
    content: string;
    artifact?: string;
    name?: string;
}

export interface UpdateTestSuiteResponse {
    path: string;
}

export interface UpdateTestCaseRequest {
    path: string;
    content: string;
    range?: TagRange
}

/* eslint-disable-next-line @typescript-eslint/no-empty-object-type */
export interface UpdateTestCaseResponse {
}

export interface UpdateMockServiceRequest {
    path?: string;
    content: string;
    name?: string;
}

export interface UpdateMockServiceResponse {
    path: string;
}

export interface GetAllTestSuitsResponse {
    testSuites: {
        name: string;
        path: string;
        testCases: {
            name: string;
            range: Range;
        }[];
    }[];
}

export interface GetAllMockServicesResponse {
    mockServices: {
        name: string;
        path: string;
    }[];
}

export interface Dependency {
    groupId: string;
    artifactId: string;
    version: string;
    range?: Range;
}

export interface OpenDependencyPomRequest {
    name: string;
    file: string
}

export interface getAllDependenciesRequest {
    file: string;
}

export interface GetAllDependenciesResponse {
    dependencies: Dependency[];
}

export interface TestDbConnectionRequest {
    dbType: string;
    username: string;
    password: string;
    host: string;
    port: string;
    dbName: string;
    url: string;
    className: string;
}

export interface TestDbConnectionResponse {
    success: boolean;
}

export interface CheckDBDriverResponse {
    isDriverAvailable: boolean;
    driverVersion: string;
    driverPath: string;
}

export interface AddDriverRequest {
    addDriverPath: string;
    removeDriverPath: string;
    className: string;
}

export interface RemoveDBDriverResponse {
    isDriverRemoved: boolean;
    driverFilePath: string;
}

export interface CopyConnectorZipRequest {
    connectorPath: string;
}

export interface CopyConnectorZipResponse {
    success: boolean;
    connectorPath?: string;
}

export interface DSSQueryGenRequest {
    className: string;
    username: string;
    password: string;
    url: string;
    tableData: string;
    datasourceName: string;
}

export interface ExtendedDSSQueryGenRequest extends DSSQueryGenRequest {
    documentUri: string;
    position: Position;
}

export interface DSSQueryGenResponse {
    [tableName: string]: boolean[];
}

export interface DSSFetchTablesRequest {
    className: string;
    username: string;
    password: string;
    url: string;
}

export interface DSSFetchTablesResponse {
    [tableName: string]: boolean[];
}

export interface MarkAsDefaultSequenceRequest {
    path: string;
    remove?: boolean;
    name?: string
}

export const SCOPE = {
    AUTOMATION: 'automation',
    INTEGRATION_AS_API: 'integration-as-api',
    EVENT_INTEGRATION: 'event-integration',
    FILE_INTEGRATION: 'file-integration',
    AI_AGENT: 'ai-agent',
    ANY: 'any'
};

export interface GetSubFoldersRequest {
    path: string;
}

export interface GetSubFoldersResponse {
    folders: string[];
}

export interface FileRenameRequest {
    existingPath: string;
    newPath: string;
}

export interface MiVersionResponse {
    version: string;
}

export interface MediatorTryOutRequest {
    file: string;
    line: number;
    column: number;
    contentType?: string;
    inputPayload?: string;
    queryParams?: Param[];
    pathParams?: Param[];
    mediatorType?: string;
    mediatorInfo?: MediatorTryOutInfo,
    tryoutId?: string;
    isServerLess: boolean;
    edits?: {
        text: string;
        range: Range;
    }[]
}

export interface Param {
    key: string;
    value: string;
}

export interface MediatorTryOutResponse {
    id: string,
    input: MediatorTryOutInfo;
    output: MediatorTryOutInfo;
    error?: string;
}

export interface MediatorTryOutInfo {
    payload: string;
    headers: Header[];
    params: Params;
    variables: { [key: string]: string };
    properties: MediatorProperties;
}

export interface MediatorProperties {
    synapse: { [key: string]: any };
    axis2: { [key: string]: any };
    axis2Client: { [key: string]: any };
    axis2Transport: { [key: string]: any };
    axis2Operation: { [key: string]: any };
}

export interface Header {
    key: string;
    value: string;
}

export interface Params {
    functionParams: string[];
    queryParams: string[];
    uriParams: string[];
}

export interface SavePayloadRequest {
    payload: any;
    artifactModel: DiagramService;
    defaultPayload: string;
}

export interface GetPayloadsRequest {
    documentUri: string;
    artifactModel: DiagramService;
}

export interface GetPayloadsResponse {
    payloads: InputPayload[];
    defaultPayload: string;
}

export interface InputPayload {
    name: string;
    contentType: string;
    content: string;
    queryParams: { [key: string]: string }[];
    pathParams: { [key: string]: string }[];
}

export interface GetMediatorsRequest {
    documentUri: string;
    position: Position;
}

export interface GetMediatorsResponse {
    [key: string]: {
        items: Mediator[] | MediatorCategory[],
        isConnector?: boolean;
        isSupportCategories?: boolean;
        artifactId?: string;
        version?: string;
        connectorPath?: string;
        isBallerinaModule?: boolean;
        ballerinaModulePath?: string
    };
}

export interface Mediator {
    title: string;
    tag: string;
    type: string;
    description: string;
    icon: string;
    operationName?: string;
    iconPath?: string;
    tooltip?: string;
}

export interface MediatorCategory {
    [key: string]: Mediator[];
}

export interface GetMediatorRequest {
    mediatorType?: string;
    documentUri: string;
    range: Range;
    isEdit?: boolean;
}

export interface GetMediatorResponse {
    form?: any;
    title: string;
    onSubmit?: string;
}

export interface UpdateMediatorRequest {
    documentUri: string;
    range: Range;
    mediatorType: string;
    oldValues?: any;
    values: any;
    dirtyFields?: string[];
    trailingSpace?: string;
}

export interface McpToolsRequest {
    connectionName: string;
}

export interface McpToolsResponse {
    tools: Array<{
        name: string;
        description?: string;
    }>;
    error?: string;
}

export interface UpdateMediatorResponse {
    textEdits: ExtendedTextEdit[];
}

export interface ExtendedTextEdit extends TextEdit {
    documentUri?: string;
    isCreateNewFile?: boolean;
}

export interface GetConnectionSchemaRequest {
    connectorName?: string;
    connectionType?: string;
    documentUri?: string;
}

export interface GetConnectionSchemaResponse {
    form?: any;
}
export interface ExpressionCompletionsRequest {
    documentUri: string;
    expression: string;
    position: Position;
    offset: number;
}

export interface ExpressionCompletionItem {
    label: string;
    kind: number;
    detail: string;
    sortText: string;
    filterText: string;
    insertText: string;
    insertTextFormat: number;
}

export type ExpressionCompletionsResponse = {
    isIncomplete: boolean;
    items: ExpressionCompletionItem[];
};

export interface GenerateConnectorRequest {
    openAPIPath: string;
    connectorProjectPath: string;
}
export interface GenerateConnectorResponse {
    buildStatus: boolean;
    connectorPath: string;
}

export interface GetHelperPaneInfoRequest {
    documentUri: string;
    position: Position;
    needLastMediator?: boolean;
}

export type GetHelperPaneInfoResponse = HelperPaneData;

export interface TestConnectorConnectionRequest {
    connectorName: string;
    connectionType: string;
    parameters: any;
}
export interface TestConnectorConnectionResponse {
    isConnectionTested: boolean;
    isConnectionValid: boolean;
    errorMessage: string;
}

export interface SaveConfigRequest {
    configName: string;
    configType: "string" | "cert";
    configValue: string;
}

export interface SaveConfigResponse {
    success: boolean;
}

export interface CopyArtifactRequest {
    sourceFilePath: string;
    artifactType: string;
    artifactFolder: string;
}

export interface CopyArtifactResponse {
    success: boolean;
    error?: string;
}

export interface GetArtifactTypeRequest {
    filePath: string;
}

export interface GetArtifactTypeResponse {
    artifactType: string;
    artifactFolder: string;
}

export interface XmlCode{
    fileName: string;
    code: string;
}

export interface SubmitFeedbackRequest {
    positive: boolean;
    messages: FeedbackMessage[];
    feedbackText?: string;
    messageIndex?: number;
    conversationId?: string;
    timestamp?: number;
}

export interface SubmitFeedbackResponse {
    success: boolean;
    message?: string;
}

export interface FeedbackMessage {
    content: string;
    role: 'user' | 'assistant';
    id?: number;
    command?: string;
}

export interface GetPomFileContentResponse{
    content: string;
}

export interface GetExternalConnectorDetailsResponse{
    connectors: string[];
}

export interface WriteMockServicesRequest {
    content: string[];
    fileNames?: string[];
}

export interface WriteMockServicesResponse {
    status: boolean;
}

export interface GetMockServicesResponse{
    mockServices: string[];
    mockServiceNames: string[];
}

export interface UpdateRegistryPropertyRequest {
    targetFile: string;
    properties: Property[];
}

export interface GenerateMappingsParamsRequest {
    query: string;
    className?: string;
    url?: string;
    username?: string;
    password?: string;
    type: 'input' | 'output'
}
