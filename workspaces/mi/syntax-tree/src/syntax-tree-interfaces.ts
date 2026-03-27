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
import { Diagnostic } from "vscode-languageserver-types";

export interface STNode {
    displayName: string;
    hasTextNode: boolean;
    selfClosed: boolean;
    textNode: string;
    range: TagRange;
    spaces: Spaces;
    tag: string;
    namespaces?: { [key: string]: string };
    viewState?: ViewState;
    diagnostics?: Diagnostic[];
    hasBreakpoint?: boolean;
    isActiveBreakpoint?: boolean;
    connectorName?: string;
}

export interface ViewState {
    id?: string;
    x: number;
    y: number;
    w: number;
    h: number;
    fw?: number;
    fh?: number;
    l?: number;
    r?: number;
    subPositions?: { [x: string]: SubPositions; };
    isBrokenLines?: boolean;
    canAddAfter?: boolean;
}

export interface SubPositions extends ViewState {
}

export interface TagRange {
    startTagRange: Range;
    endTagRange: Range;
}

export interface Range {
    start: Position;
    end: Position;
}

export interface Spaces {
    startingTagSpace: TagSpaces;
    endingTagSpace: TagSpaces;
}

export interface TagSpaces {
    leadingSpace: Space;
    trailingSpace: Space;
}

export interface Space {
    space: string;
    range: Range;
}

export interface Position {
    line: number;
    character: number;
}

export interface TBindingOperationFault extends TExtensibleDocumented, STNode {
    name: string;
}

export interface CallSource extends STNode {
    content: any;
    contentType: string;
    type: string;
}

export interface RuleFactsFact extends STNode {
    type: string;
    name: string;
    action: string;
    value: string;
    expression: string;
}

export interface RuleFacts extends STNode {
    fact: RuleFactsFact[];
}

export interface DataServiceCallSource extends STNode {
    type: string;
}

export interface TemplateParameter extends STNode {
    otherAttributes: any;
    content: any[];
    name: string;
    isMandatory: boolean;
    defaultValue: string;
}

export interface WSDLEndpoint extends STNode {
    definitions: TDefinitions;
    description: DescriptionType;
    enableSec: WSDLEndpointEnableSec;
    enableRM: WSDLEndpointEnableRM;
    enableAddressing: WSDLEndpointEnableAddressing;
    timeout: WSDLEndpointTimeout;
    suspendOnFailure: WSDLEndpointSuspendOnFailure;
    markForSuspension: WSDLEndpointMarkForSuspension;
    uri: string;
    service: string;
    port: string;
    format: string;
    optimize: string;
    encoding: string;
    statistics: string;
    trace: string;
}

export interface CalloutEnableSec extends STNode {
    policy: string;
    outboundPolicy: string;
    inboundPolicy: string;
}

export interface WSDLEndpointSuspendOnFailure extends STNode {
    errorCodes: STNode;
    initialDuration: STNode;
    progressionFactor: STNode;
    maximumDuration: STNode;
}

export interface Spring extends STNode {
    bean: string;
    key: string;
    description: string;
}

export interface Task extends STNode {
    trigger: TaskTrigger;
    property: MediatorProperty[];
    clazz: string;
    name: string;
    group: string;
    pinnedServers: string;
    sequence: NamedSequence | undefined;
    sequenceURI: string | undefined;
}

export interface FilterElse extends STNode {
    mediatorList: CallTemplate | Smooks | Spring | Bam | Class | PublishEvent | Header | PojoCommand | Callout | Loopback | Xquery | Foreach | Iterate | FilterSequence | Script | Builder | Store | Enrich | Ejb | FastXSLT | Clone | DbMediator | Log | ConditionalRouter | Bean | Throttle | Switch | Cache | Jsontransform | Filter | Rewrite | Property | OauthService | Validate | Xslt | EntitlementService | Respond | Event | Transaction | Enqueue | PayloadFactory | DataServiceCall | Send | Datamapper | Call | Rule | Drop | Aggregate | PropertyGroup | Makefault;
    sequence: string;
}

export interface Header extends STNode {
    any: any;
    name: string;
    action: string;
    scope: string;
    description: string;
    value: string;
    expression: string;
}

export interface EndpointFailover extends STNode {
    endpoint: EndpointFailoverEndpoint[];
    dynamic: boolean;
    buildMessage: boolean;
}

export interface Foreach extends STNode {
    sequence: Sequence;
    expression: string;
    sequenceAttribute: string;
    id: string;
    description: string;
    version: string;
    collection: string;
    executeParallel: boolean;
    resultTarget: string;
    resultType: string;
    counterVariableName: string;
}

export interface PayloadFactoryFormat extends STNode {
    content: string;
    key: string;
}

export interface BuilderMessageBuilder extends STNode {
    contentType: string;
    clazz: string;
    formatterClass: string;
}

export interface TPort extends TExtensibleDocumented, STNode {
    name: string;
    binding: string;
}

export interface And extends STNode {
    and: And;
    or: Or;
    equal: Equal;
    not: Not;
}

export interface Script extends STNode {
    content: any[];
    include: string[];
    language: string;
    key: string;
    function: string;
    description: string;
}

export interface TOperation extends TExtensibleDocumented, STNode {
    rest: TFault | TParam;
    name: string;
    parameterOrder: any;
}

export interface Datamapper extends STNode {
    config: string;
    inputSchema: string;
    outputSchema: string;
    inputType: string;
    outputType: string;
    xsltStyleSheet: string;
    description: string;
}

export interface ServiceType extends ExtensibleDocumentedType, STNode {
    otherAttributes: any;
    endpointOrAny: EndpointType[];
    name: string;
    _interface: string;
}

export interface PublishEventAttributesArbitrary extends STNode {
    attributes: Attribute[];
}

export interface PublishEvent extends STNode {
    eventSink: any;
    streamName: any;
    streamVersion: any;
    async: boolean;
    timeout: string;
    attributes: PublishEventAttributes;
    description: string;
}

export interface Store extends STNode {
    messageStore: string;
    sequence: string;
    description: string;
}

export interface APIHandlers extends STNode {
    handler: APIHandlersHandler[];
}

export interface Not extends STNode {
    and: And;
    or: Or;
    equal: Equal;
    not: Not;
}

export interface Feature extends STNode {
    name: string;
    value: boolean;
}

export interface TFault extends TExtensibleAttributesDocumented, STNode {
    otherAttributes: any;
    name: string;
    message: string;
}

export interface TypesType extends ExtensibleDocumentedType, STNode {
    otherAttributes: any;
    any: any[];
}

export interface EndpointHttpAuthenticationBasicAuth extends STNode {
    username: STNode;
    password: STNode;
}

export interface TTypes extends TExtensibleDocumented, STNode {
}

export interface Bean extends STNode {
    action: string;
    var: string;
    target: string;
    clazz: string;
    property: string;
    value: string;
    description: string;
}

export interface CorrelateOnOrCompleteConditionOrOnComplete extends STNode {
    correlateOn?: AggregateCorrelateOn;
    completeCondition?: AggregateCompleteCondition;
    onComplete?: AggregateOnComplete;
}

export interface Aggregate extends STNode {
    correlateOnOrCompleteConditionOrOnComplete: CorrelateOnOrCompleteConditionOrOnComplete;
    description: string;
    id: string;
}

export interface RewriteRewriterule extends STNode {
    condition: RewriteRewriteruleCondition;
    action: RewriteRewriteruleAction[];
}

export interface ExtensibleDocumentedType extends DocumentedType, STNode {
    otherAttributes: any;
}

export interface Send extends STNode {
    endpoint: NamedEndpoint;
    receive: string;
    buildmessage: boolean;
    description: string;
}

export interface Log extends STNode {
    property: MediatorProperty[];
    level: LogLevel;
    separator: string;
    category: LogCategory;
    description: string;
}

export interface EndpointHttpAuthentication extends STNode {
    oauth: EndpointHttpAuthenticationOauth;
    basicAuth: EndpointHttpAuthenticationBasicAuth;
}

export interface RuleRulesetCreation extends STNode {
    property: RuleRulesetCreationProperty[];
}

export interface Enrich extends STNode {
    source: SourceEnrich;
    target: TargetEnrich;
    description: string;
}

export interface CalloutTarget extends STNode {
    xpath: string;
    key: string;
}

export interface EntitlementService extends STNode {
    onReject: Sequence;
    onAccept: Sequence;
    advice: EntitlementServiceAdvice;
    obligations: EntitlementServiceObligations;
    remoteServiceUrl: string;
    remoteServiceUserName: string;
    remoteServicePassword: string;
    callbackClass: string;
    client: string;
    thriftHost: string;
    thriftPort: string;
    onRejectAttribute: string;
    onAcceptAttribute: string;
    adviceAttribute: string;
    obligationsAttribute: string;
    description: string;
}

export interface ConditionalRouter extends STNode {
    conditionalRoute: ConditionalRouterRoute[];
    continueAfter: boolean;
    description: string;
}

export interface FilterSequence extends STNode {
    mediatorList: CallTemplate | Smooks | Spring | Bam | FilterSequence | Class | PublishEvent | Header | PojoCommand | Callout | Loopback | Xquery | Foreach | Iterate | Script | Builder | Store | Enrich | Ejb | FastXSLT | Clone | DbMediator | Log | ConditionalRouter | Bean | Throttle | Switch | Cache | Jsontransform | Filter | Rewrite | Property | OauthService | Validate | Xslt | EntitlementService | Respond | Event | Transaction | Enqueue | PayloadFactory | DataServiceCall | Send | Datamapper | Call | Rule | Drop | Aggregate | PropertyGroup | Makefault;
    key: string;
    name: string;
    description: string;
}

export interface Switch extends STNode {
    _case: SwitchCase[];
    _default: SwitchDefault;
    source: string;
    description: string;
}

export interface ProxyTarget extends STNode {
    inSequence: Sequence;
    outSequence: Sequence;
    faultSequence: Sequence;
    endpoint: NamedEndpoint;
    inSequenceAttribute: string;
    outSequenceAttribute: string;
    faultSequenceAttribute: string;
    endpointAttribute: string;
}

export interface TParam extends TExtensibleAttributesDocumented, STNode {
    otherAttributes: any;
    name: string;
    message: string;
}

export interface InboundEndpoint extends STNode {
    parameters: InboundEndpointParameters[];
    name: string;
    sequence: string;
    sequenceModel: NamedSequence | undefined;
    sequenceURI: string | undefined;
    protocol: string;
    onError: string;
    suspend: boolean;
    clazz: string;
    statistics: string;
    trace: string;
    interval: string;
}

export interface SmooksOutput extends STNode {
    type: string;
    property: string;
    action: string;
    expression: string;
}

export interface RuleSession extends STNode {
    type: string;
}

export interface PojoCommandProperty extends STNode {
    any: any[];
    name: string;
    contextName: string;
    action: string;
    value: string;
    expression: string;
}

export interface SourceOrTargetOrConfiguration extends STNode {
    source?: CalloutSource;
    target?: CalloutTarget;
    configuration?: CalloutConfiguration;
    enableSec?: CalloutEnableSec;
}

export interface Callout extends STNode {
    sourceOrTargetOrConfiguration: SourceOrTargetOrConfiguration;
    serviceURL: string;
    action: string;
    initAxis2ClientOptions: boolean;
    endpointKey: string;
    description: string;
}

export interface BindingOperationType extends ExtensibleDocumentedType, STNode {
    otherAttributes: any;
    inputOrOutputOrInfault: BindingOperationFaultType | BindingOperationMessageType;
    ref: string;
}

export interface DataServiceCallTarget extends STNode {
    type: string;
    name: string;
}

export interface Drop extends STNode {
    description: string;
}

export interface Smooks extends STNode {
    input: SmooksInput;
    output: SmooksOutput;
    configKey: string;
    description: string;
}

export interface Ejb extends STNode {
    args: EjbArgs;
    beanstalk: string;
    clazz: string;
    sessionId: string;
    remove: boolean;
    method: string;
    target: string;
    jndiName: string;
    id: string;
    stateful: boolean;
    description: string;
}

export interface Attribute extends STNode {
    name: string;
    dataType: string;
    _default: string;
    value: string;
    expression: string;
}

export interface BamServerProfileStreamConfig extends STNode {
    name: string;
    version: string;
}

export interface DefaultEndpoint extends STNode {
    enableSec: WSDLEndpointEnableSec;
    enableRM: WSDLEndpointEnableRM;
    enableAddressing: WSDLEndpointEnableAddressing;
    timeout: WSDLEndpointTimeout;
    suspendOnFailure: WSDLEndpointSuspendOnFailure;
    markForSuspension: WSDLEndpointMarkForSuspension;
    format: string;
    optimize: string;
    encoding: string;
    statistics: string;
    trace: string;
}

export interface PublishEventAttributesCorrelation extends STNode {
    attributes: Attribute[];
}

export interface EndpointAddress extends DefaultEndpoint, STNode {
    uri: string;
}

export interface ImportType extends ExtensibleDocumentedType, STNode {
    otherAttributes: any;
    any: any[];
    namespace: string;
    location: string;
}

export interface BindingType extends ExtensibleDocumentedType, STNode {
    otherAttributes: any;
    operationOrFaultOrAny: BindingOperationType | BindingFaultType;
    name: string;
    type: string;
    _interface: string;
}

export interface BindingOperationMessageType extends ExtensibleDocumentedType, STNode {
    otherAttributes: any;
    any: any[];
    messageLabel: string;
}

export interface CallTarget extends STNode {
    content: string;
    type: string;
}

export interface Throttle extends STNode {
    policy: ThrottlePolicy;
    onAccept: Sequence;
    onReject: Sequence;
    id: string;
    onAcceptAttribute: string;
    onRejectAttribute: string;
    description: string;
}

export interface MessageStore extends STNode {
    parameter: Parameter[];
    name: string;
    clazz: string;
}

export interface Xquery extends STNode {
    variable: XqueryVariable[];
    key: string;
    target: string;
    description: string;
}

export interface WSDLEndpointEnableAddressing extends STNode {
    version: string;
    separateListener: boolean;
}

export interface XqueryVariable extends STNode {
    name: string;
    type: string;
    expression: string;
    value: string;
    key: string;
}

export interface InterfaceFaultType extends ExtensibleDocumentedType, STNode {
    otherAttributes: any;
    any: any[];
    name: string;
    element: string;
}

export interface ValidateOnFail extends STNode {
    mediatorList: CallTemplate | Smooks | Spring | Bam | Class | PublishEvent | Header | PojoCommand | Callout | Loopback | Xquery | Foreach | Iterate | Script | Builder | Store | Enrich | Ejb | FastXSLT | Clone | DbMediator | Log | ConditionalRouter | Bean | Throttle | Switch | Cache | Jsontransform | Filter | Rewrite | Property | OauthService | Validate | Xslt | EntitlementService | Respond | Event | Transaction | Enqueue | PayloadFactory | DataServiceCall | Send | Datamapper | Call | Rule | Drop | Aggregate | PropertyGroup | FilterSequence | Makefault;
}

export interface CloneTarget extends STNode {
    sequence: Sequence;
    endpoint: NamedEndpoint;
    to: string;
    soapAction: string;
    sequenceAttribute: string;
    endpointAttribute: string;
}

export interface EndpointProperty extends MediatorProperty, STNode {
    otherAttributes: any;
    scope: string;
}

export interface DbMediator extends STNode {
    connection: DbMediatorConnection;
    statement: DbMediatorStatement[];
    useTransaction: boolean;
    description: string;
}

export interface EntitlementServiceAdvice extends STNode {
    any: any;
}

export interface Endpoint extends STNode {
    _default: DefaultEndpoint;
    http: EndpointHttp;
    address: EndpointAddress;
    wsdl: WSDLEndpoint;
    loadbalance: EndpointLoadbalance;
    session: EndpointSession;
    failover: EndpointFailover;
    recipientlist: EndpointRecipientlist;
    property: EndpointProperty[];
    parameter: EndpointParameter[];
    description: string;
    key: string;
    keyExpression: string;
    template: string;
    uri: string;
    type: string;
}

export interface API extends STNode {
    resource: APIResource[];
    handlers: APIHandlers;
    name: string;
    context: string;
    hostname: string;
    port: string;
    version: string;
    versionType: string;
    publishSwagger: string;
    description: string;
    statistics: string;
    trace: string;
}

export interface WSDLEndpointMarkForSuspension extends STNode {
    errorCodes: STNode;
    retriesBeforeSuspension: STNode;
    retryDelay: STNode;
}

export interface APIHandlersHandler extends STNode {
    property: APIHandlersHandlerProperty[];
    clazz: string;
}

export interface RuleResults extends STNode {
    result: RuleResultsResult[];
}

export interface EndpointType extends ExtensibleDocumentedType, STNode {
    otherAttributes: any;
    any: any[];
    name: string;
    binding: string;
    address: string;
}

export interface Resource extends STNode {
    inSequenceAttribute?: string;
    inSequence?: Sequence;
    outSequenceAttribute?: string;
    outSequence?: Sequence;
    faultSequenceAttribute?: string;
    faultSequence?: Sequence;
    location: string;
    key: string;
}

export interface Equal extends STNode {
    type: string;
    source: string;
    value: string;
}

export interface DocumentationType extends STNode {
    otherAttributes: any;
    content: any[];
}

export interface TBindingOperationMessage extends TExtensibleDocumented, STNode {
    name: string;
}

export interface Enqueue extends STNode {
    priority: number;
    sequence: string;
    executor: string;
    description: string;
}

export interface TDocumented extends STNode {
    documentation: TDocumentation;
}

export interface CacheImplementation extends STNode {
    type: string;
    maxSize: number;
}

export interface FilterThen extends STNode {
    mediatorList: CallTemplate | Smooks | Spring | Bam | Class | PublishEvent | Header | PojoCommand | Callout | Loopback | Xquery | Foreach | Iterate | Script | Builder | Store | Enrich | Ejb | FastXSLT | FilterSequence | Clone | DbMediator | Log | ConditionalRouter | Bean | Throttle | Switch | Cache | Jsontransform | Filter | Rewrite | Property | OauthService | Validate | Xslt | EntitlementService | Respond | Event | Transaction | Enqueue | PayloadFactory | DataServiceCall | Send | Datamapper | Call | Rule | Drop | Aggregate | PropertyGroup | Makefault;
    sequence: string;
}

export interface ValidateSchema extends STNode {
    key: string;
}

export interface Validate extends STNode {
    property: ValidateProperty[];
    schema: ValidateSchema[];
    onFail: ValidateOnFail;
    feature: Feature[];
    resource: ValidateResource[];
    cacheSchema: boolean;
    source: string;
    description: string;
}

export interface PayloadFactoryArgs extends STNode {
    arg: PayloadFactoryArgsArg[];
}

export interface Xslt extends STNode {
    property: MediatorProperty[];
    feature: XsltFeature[];
    resource: XsltResource[];
    key: string;
    source: string;
    description: string;
}

export interface TPart extends TExtensibleAttributesDocumented, STNode {
    otherAttributes: any;
    name: string;
    element: string;
    type: string;
}

export interface EvaluatorList extends STNode {
    and?: And;
    or?: Or;
    equal?: Equal;
    not?: Not;
}

export interface Or extends STNode {
    evaluatorList: EvaluatorList[];
}

export interface Filter extends STNode {
    mediatorList: CallTemplate | Smooks | Spring | Bam | Class | PublishEvent | FilterSequence | Header | PojoCommand | Callout | Loopback | Xquery | Foreach | Iterate | Script | Builder | Store | Enrich | Ejb | FastXSLT | Clone | DbMediator | Log | ConditionalRouter | Bean | Throttle | Switch | Cache | Jsontransform | Filter | Rewrite | Property | OauthService | Validate | Xslt | EntitlementService | Respond | Event | Transaction | Enqueue | PayloadFactory | DataServiceCall | Send | Datamapper | Call | Rule | Drop | Aggregate | PropertyGroup | Makefault;
    then: FilterThen;
    else_: FilterElse;
    source: string;
    regex: string;
    xpath: string;
    description: string;
}

export interface TargetEnrich extends STNode {
    action: string;
    type: string;
    xpath: string;
    property: string;
}

export interface MessageRefFaultType extends ExtensibleDocumentedType, STNode {
    otherAttributes: any;
    any: any[];
    ref: string;
    messageLabel: string;
}

export interface CallTemplate extends STNode {
    withParam: WithParam[];
    target: string;
    onError: string;
    description: string;
}

export interface RuleResultsResult extends STNode {
    type: string;
    name: string;
    action: string;
    value: string;
    expression: string;
}

export interface Bam extends STNode {
    serverProfile: BamServerProfile;
    description: string;
}

export interface EndpointParameter extends STNode {
    name: string;
    value: string;
}

export interface EndpointHttpAuthenticationOauthClientCredentials extends STNode {
    clientId: STNode;
    clientSecret: STNode;
    refreshToken: STNode;
    tokenUrl: STNode;
    requestParameters: EndpointHttpAuthenticationOauthRequestParameters;
    authMode: STNode;
}

export interface TBinding extends TExtensibleDocumented, STNode {
    operation: TBindingOperation[];
    name: string;
    type: string;
}

export interface EjbArgsArg extends STNode {
    value: string;
}

export interface ConditionalRouterRoute extends STNode {
    condition: ConditionalRouterRouteCondition;
    target: Target;
    breakRoute: boolean;
    asynchronous: boolean
}

export interface ConditionalRouterRouteCondition {
    equal: Equal;
}

export interface SwitchCase extends STNode {
    mediatorList: FilterSequence | CallTemplate | Smooks | Spring | Bam | Class | PublishEvent | Header | PojoCommand | Callout | Loopback | Xquery | Foreach | Iterate | Script | Builder | Store | Enrich | Ejb | FastXSLT | Clone | DbMediator | Log | ConditionalRouter | Bean | Throttle | Switch | Cache | Jsontransform | Filter | Rewrite | Property | OauthService | Validate | Xslt | EntitlementService | Respond | Event | Transaction | Enqueue | PayloadFactory | DataServiceCall | Send | Datamapper | Call | Rule | Drop | Aggregate | PropertyGroup | Makefault;
    regex: string;
}

export interface CalloutSource extends STNode {
    xpath: string;
    key: string;
    type: string;
}

export interface DescriptionType extends ExtensibleDocumentedType, STNode {
    otherAttributes: any;
    importOrIncludeOrTypes: ServiceType | BindingType | TypesType | IncludeType | ImportType | InterfaceType;
    targetNamespace: string;
}

export interface EndpointLoadbalanceEndpoint extends STNode {
    _default: DefaultEndpoint;
    http: EndpointHttp;
    address: EndpointAddress;
    wsdl: WSDLEndpoint;
    loadbalance: EndpointLoadbalance;
    session: EndpointSession;
    failover: EndpointFailover;
    name: string;
    key: string;
}

export interface SwitchDefault extends STNode {
    mediatorList: CallTemplate | Smooks | Spring | Bam | Class | PublishEvent | Header | PojoCommand | FilterSequence | Callout | Loopback | Xquery | Foreach | Iterate | Script | Builder | Store | Enrich | Ejb | FastXSLT | Clone | DbMediator | Log | ConditionalRouter | Bean | Throttle | Switch | Cache | Jsontransform | Filter | Rewrite | Property | OauthService | Validate | Xslt | EntitlementService | Respond | Event | Transaction | Enqueue | PayloadFactory | DataServiceCall | Send | Datamapper | Call | Rule | Drop | Aggregate | PropertyGroup | Makefault;
}

export interface SmooksInput extends STNode {
    type: string;
    expression: string;
}

export interface NamedEndpoint extends Endpoint, STNode {
    name: string;
}

export interface ProxyPublishWSDL extends STNode {
    definitions: TDefinitions;
    description: DescriptionType;
    inlineWsdl: string;
    resource: Resource[];
    uri: string;
    key: string;
    endpoint: string;
    preservePolicy: boolean;
}

export interface PropertyGroup extends STNode {
    property: Property[];
    description: string;
}

export interface DocumentedType extends STNode {
    documentation: DocumentationType[];
}

export interface DbMediatorConnectionPoolProperty extends STNode {
    name: string;
    value: string;
}

export interface ServiceParameter {
    name: string;
    value: string;
}

export interface ServicePolicy {
    value: string;
}

export interface Proxy extends STNode {
    target: ProxyTarget;
    publishWSDL: ProxyPublishWSDL;
    policies: ProxyPolicy[];
    enableAddressing: STNode;
    enableSec: STNode;
    parameters: Parameter[];
    description: string;
    name: string;
    transports: string;
    pinnedServers: string;
    serviceGroup: string;
    startOnLoad: boolean;
    statistics: string;
    trace: string;
    onError: string;
}

export interface ExtensionElement extends STNode {
    required: boolean;
}

export interface Jsontransform extends STNode {
    property: MediatorProperty[];
    schema: string;
    description: string;
}

export interface Clone extends STNode {
    target: CloneTarget[];
    id: string;
    continueParent: boolean;
    sequential: boolean;
    description: string;
}

export interface Builder extends STNode {
    messageBuilders: BuilderMessageBuilder[];
    description: string;
}

export interface PojoCommand extends STNode {
    property: PojoCommandProperty[];
    name: string;
    description: string;
}

export interface NamedSequence extends STNode {
    mediatorList: CallTemplate | Smooks | Spring | Bam | Class | PublishEvent | Header | PojoCommand | Callout | Loopback | FilterSequence | Xquery | Foreach | Iterate | Script | Builder | Store | Enrich | Ejb | FastXSLT | Clone | DbMediator | Log | ConditionalRouter | Bean | Throttle | Switch | Cache | Jsontransform | Filter | Rewrite | Property | OauthService | Validate | Xslt | EntitlementService | Respond | Event | Transaction | Enqueue | PayloadFactory | DataServiceCall | Send | Datamapper | Call | Rule | Drop | Aggregate | PropertyGroup | Makefault;
    name: string;
    onError: string;
    description: string;
    statistics: string;
    trace: string;
}

export interface Property extends STNode {
    any: any;
    scope: string;
    type: string;
    pattern: string;
    group: number;
    description: string;
    name: string;
    action: string;
    value: string;
    expression: string;
}

export interface Variable extends STNode {
    type: string;
    description: string;
    name: string;
    action: string;
    value: string;
    expression: string;
}

export interface ScatterGather extends STNode {
    targets: CloneTarget[];
    executeParallel: boolean;
    description: string;
    valueExpression: string;
    condition: string;
    resultTarget: string;
    variableName: string;
    contentType: string;
    completeTimeout: string;
    minMessages: string;
    maxMessages: string;
}

export interface ThrowError extends STNode {
    type: string;
    description: string;
    errorMessage: string;
}

export interface APIHandlersHandlerProperty extends STNode {
    name: string;
    value: string;
}

export interface EntitlementServiceObligations extends STNode {
    any: any;
}

export interface DataServiceCallOperations extends STNode {
    operation: DataServiceCallOperationsOperation[];
    type: string;
}

export interface TMessage extends TExtensibleDocumented, STNode {
    part: TPart[];
    name: string;
}

export interface DbMediatorStatement extends STNode {
    sql: string;
    parameter: DbMediatorStatementParameter[];
    result: DbMediatorStatementResult[];
}

export interface TDocumentation extends STNode {
    content: any[];
}

export interface Class extends STNode {
    property: MediatorProperty[];
    name: string;
    description: string;
}

export interface TImport extends TExtensibleAttributesDocumented, STNode {
    otherAttributes: any;
    namespace: string;
    location: string;
}

export interface InterfaceType extends ExtensibleDocumentedType, STNode {
    otherAttributes: any;
    operationOrFaultOrAny: InterfaceOperationType | InterfaceFaultType;
    name: string;
    _extends: any;
    styleDefault: any;
}

export interface ValidateProperty extends STNode {
    name: string;
    value: boolean;
}

export interface Sequence extends STNode {
    mediatorList: (CallTemplate | Smooks | Spring | Bam | Class | PublishEvent | Header | PojoCommand | Callout | Loopback | Xquery | Foreach | Iterate | Script | Builder | Store | Enrich | Ejb | FastXSLT | Clone | DbMediator | Log | ConditionalRouter | Bean | Throttle | Switch | Cache | Jsontransform | Filter | Rewrite | Property | FilterSequence | OauthService | Validate | Xslt | EntitlementService | Respond | Event | Transaction | Enqueue | PayloadFactory | DataServiceCall | Send | Datamapper | Call | Rule | Drop | Aggregate | PropertyGroup | Makefault)[];
}

export interface EndpointHttpAuthenticationOauth extends STNode {
    authorizationCode: EndpointHttpAuthenticationOauthAuthorizationCode;
    clientCredentials: EndpointHttpAuthenticationOauthClientCredentials;
    passwordCredentials: EndpointHttpAuthenticationOauthPasswordCredentials;
}

export interface EndpointHttpAuthenticationOauthPasswordCredentials {
    username: STNode;
    password: STNode;
    clientId: STNode;
    clientSecret: STNode;
    refreshToken: STNode;
    tokenUrl: STNode;
    requestParameters: EndpointHttpAuthenticationOauthRequestParameters;
    authMode: STNode;
}

export interface XsltFeature extends STNode {
    name: string;
    value: boolean;
}

export interface DataServiceCall extends STNode {
    source: DataServiceCallSource;
    operations: DataServiceCallOperations;
    target: DataServiceCallTarget;
    serviceName: string;
    description: string;
}

export interface APIResource extends STNode {
    api: string;
    inSequence: Sequence;
    outSequence: Sequence;
    faultSequence: Sequence;
    methods: [string];
    protocol: [string];
    inSequenceAttribute: string;
    outSequenceAttribute: string;
    faultSequenceAttribute: string;
    uriTemplate: string;
    urlMapping: string;
}

export interface DSSResource extends STNode {
    path: string;
    method: string;
    queryId: string;
    description: string;
    enableStreaming: boolean;
    returnRequestStatus: boolean;
}

export interface DSSOperation extends STNode {
    name: string;
    queryId: string;
    description: string;
    enableStreaming: boolean;
}

export interface DSSQuery extends STNode {
    name: string;
    datasource: string;
    query: string;
}

export interface DataServiceCallOperationsOperation extends STNode {
    param: DataServiceCallOperationsOperationParam[];
    name: string;
}

export interface InterfaceOperationType extends ExtensibleDocumentedType, STNode {
    otherAttributes: any;
    inputOrOutputOrInfault: MessageRefFaultType | MessageRefType;
    name: string;
    pattern: string;
    safe: boolean;
    style: string;
}

export interface Iterate extends STNode {
    target: Target;
    sequential: boolean;
    continueParent: boolean;
    expression: string;
    preservePayload: boolean;
    attachPath: string;
    id: string;
    description: string;
}

export interface XsltResource extends STNode {
    location: string;
    key: string;
}

export interface WSDLEndpointTimeout extends STNode {
    content: any[];
}

export interface AggregateCompleteCondition extends STNode {
    messageCount: AggregateCompleteConditionMessageCount;
    timeout: number;
}

export interface EndpointLoadbalanceMember extends STNode {
    hostName: string;
    httpPort: string;
    httpsPort: string;
}

export interface EndpointRecipientlistEndpoint extends STNode {
    _default: DefaultEndpoint;
    http: EndpointHttp;
    address: EndpointAddress;
    wsdl: WSDLEndpoint;
    loadbalance: EndpointLoadbalance;
    session: EndpointSession;
    failover: EndpointFailover;
    name: string;
    key: string;
}

export interface AggregateCompleteConditionMessageCount extends STNode {
    min: string;
    max: string;
}

export interface RuleChildMediators extends STNode {
    mediatorList: CallTemplate | Smooks | Spring | Bam | Class | PublishEvent | Header | PojoCommand | Callout | Loopback | Xquery | Foreach | Iterate | Script | Builder | Store | Enrich | Ejb | FastXSLT | Clone | DbMediator | Log | ConditionalRouter | Bean | Throttle | Switch | Cache | Jsontransform | Filter | Rewrite | Property | OauthService | Validate | Xslt | EntitlementService | Respond | Event | Transaction | Enqueue | FilterSequence | PayloadFactory | DataServiceCall | Send | Datamapper | Call | Rule | Drop | Aggregate | PropertyGroup | Makefault;
}

export interface CalloutConfiguration extends STNode {
    axis2Xml: string;
    repository: string;
}

export interface TPortType extends TExtensibleAttributesDocumented, STNode {
    otherAttributes: any;
    operation: TOperation[];
    name: string;
}

export interface MakefaultReason extends STNode {
    value: string;
    expression: string;
}

export interface CacheOnCacheHit extends STNode {
    mediatorList: STNode[];
    sequence: string;
}

export interface Registry extends STNode {
    parameter: Parameter[];
    provider: string;
}

export interface RuleRulesetCreationProperty extends STNode {
    name: string;
    value: string;
}

export interface MakefaultCode extends STNode {
    value: string;
    expression: string;
}

export interface Makefault extends STNode {
    code: MakefaultCode;
    reason: MakefaultReason;
    node: any;
    role: any;
    detail: MakefaultDetail;
    version: string;
    response: boolean;
    description: string;
}

export interface MediatorProperty extends STNode {
    otherAttributes: any;
    content: any[];
    name: string;
    value: string;
    expression: string;
}

export interface TBindingOperation extends TExtensibleDocumented, STNode {
    input: TBindingOperationMessage;
    output: TBindingOperationMessage;
    fault: TBindingOperationFault[];
    name: string;
}

export interface EndpointOrMember extends STNode {
    endpoint?: EndpointLoadbalanceEndpoint;
    member?: EndpointLoadbalanceMember;
}

export interface EndpointLoadbalance extends STNode {
    endpointOrMember: EndpointOrMember[];
    algorithm: string;
    failover: boolean;
    policy: string;
    buildMessage: boolean;
}

export interface TExtensibleAttributesDocumented extends TDocumented, STNode {
    otherAttributes: any;
}

export interface DbMediatorStatementParameter extends STNode {
    type: string;
    value: string;
    expression: string;
}

export interface WithParam extends STNode {
    name: string;
    value: string;
    description: string;
}

export interface PayloadFactory extends STNode {
    format: PayloadFactoryFormat;
    args: PayloadFactoryArgs;
    mediaType: string;
    templateType: string;
    description: string;
}

export interface Template extends STNode {
    parameter: TemplateParameter[];
    endpoint: NamedEndpoint;
    sequence: NamedSequence;
    name: string;
}

export interface DbMediatorStatementResult extends STNode {
    name: string;
    column: string;
}

export interface EndpointSession extends STNode {
    sessionTimeout: number;
    type: string;
}

export interface TExtensibleDocumented extends TDocumented, STNode {
    any: any[];
}

export interface KeyAttribute extends STNode {
    content: string;
    key: string;
}

export interface IncludeType extends ExtensibleDocumentedType, STNode {
    otherAttributes: any;
    any: any[];
    location: string;
}

export interface MessageProcessor extends STNode {
    parameter: Parameter[];
    name: string;
    clazz: string;
    messageStore: string;
    targetEndpoint: string;
}

export interface MakefaultDetail extends STNode {
    content: string;
    expression: string;
}

export interface InboundEndpointParameters extends STNode {
    parameter: Parameter[];
}

export interface AnyTopLevelOptionalElement extends STNode {
    _import?: TImport;
    types?: TTypes;
    message?: TMessage;
    portType?: TPortType;
    binding?: TBinding;
    service?: TService;
}

export interface TDefinitions extends TExtensibleDocumented, STNode {
    anyTopLevelOptionalElement: any[];
    targetNamespace: string;
    name: string;
}

export interface DbMediatorConnectionPool extends STNode {
    dsName: KeyAttribute;
    icClass: KeyAttribute;
    driver: KeyAttribute;
    url: KeyAttribute;
    user: KeyAttribute;
    password: KeyAttribute;
    property: DbMediatorConnectionPoolProperty[];
}

export interface CacheProtocol extends STNode {
    methods: STNode;
    headersToExcludeInHash: STNode;
    headersToIncludeInHash: STNode
    responseCodes: STNode
    enableCacheControl: STNode
    includeAgeHeader: STNode
    hashGenerator: STNode
    type: string;
}

export interface EndpointHttpAuthenticationOauthAuthorizationCode extends STNode {
    clientId: STNode;
    clientSecret: STNode;
    refreshToken: STNode;
    tokenUrl: STNode;
    requestParameters: EndpointHttpAuthenticationOauthRequestParameters;
    authMode: STNode;
}

export interface EndpointHttpAuthenticationOauthRequestParameters extends STNode {
    parameter: Parameter[];
}

export interface Rewrite extends STNode {
    rewriterule: RewriteRewriterule[];
    inProperty: string;
    outProperty: string;
    description: string;
}

export interface PublishEventAttributesMeta extends STNode {
    attributes: Attribute[];
}

export interface RewriteRewriteruleAction extends STNode {
    value: string;
    xpath: string;
    regex: string;
    type: string;
    fragment: string;
}

export interface Target extends STNode {
    sequence: Sequence;
    endpoint: NamedEndpoint;
    sequenceAttribute: string;
    endpointAttribute: string;
    to: string;
    soapAction: string;
}

export interface DbMediatorConnection extends STNode {
    pool: DbMediatorConnectionPool;
}

export interface ProxyPolicy extends STNode {
    key: string;
    type: string;
}

export interface DataServiceCallOperationsOperationParam extends STNode {
    name: string;
    value: string;
    expression: string;
    evaluator: string;
}

export interface BindingOperationFaultType extends ExtensibleDocumentedType, STNode {
    otherAttributes: any;
    any: any[];
    ref: string;
    messageLabel: string;
}

export interface AggregateCorrelateOn extends STNode {
    expression: string;
}

export interface PublishEventAttributesArbitraryAttribute extends STNode {
    name: string;
    dataType: string;
    _default: string;
    value: string;
}

export interface Event extends STNode {
    topic: string;
    expression: string;
    description: string;
}

export interface FastXSLT extends STNode {
    key: string;
    description: string;
}

export interface RegistryOrApiOrProxy extends STNode {
    registry?: Registry;
    api?: API;
    proxy?: Proxy;
    endpoint?: NamedEndpoint;
    inboundEndpoint?: InboundEndpoint;
    localEntry?: LocalEntry;
    messageStore?: MessageStore;
    messageProcessor?: MessageProcessor;
    sequence?: NamedSequence;
    task?: Task;
    template?: Template;
}

export interface Definition extends STNode {
    registryOrApiOrProxy: RegistryOrApiOrProxy[];
}

export interface MessageRefType extends ExtensibleDocumentedType, STNode {
    otherAttributes: any;
    any: any[];
    messageLabel: string;
    element: string;
}

export interface EnableSecAndEnableRMAndEnableAddressing extends STNode {
    enableSec?: WSDLEndpointEnableSec;
    enableRM?: WSDLEndpointEnableRM;
    enableAddressing?: WSDLEndpointEnableAddressing;
    timeout?: WSDLEndpointTimeout;
    suspendOnFailure?: WSDLEndpointSuspendOnFailure;
    markForSuspension?: WSDLEndpointMarkForSuspension;
    authentication?: EndpointHttpAuthentication;
    retryConfig?: EndpointRetryConfig;
}

export interface EndpointRetryConfig extends STNode {
    enabledErrorCodes: STNode;
    disabledErrorCodes: STNode;
}

export interface EndpointHttp extends STNode {
    enableSecAndEnableRMAndEnableAddressing: EnableSecAndEnableRMAndEnableAddressing;
    uriTemplate: string;
    method: string;
    statistics: string;
    trace: string;
}

export interface PayloadFactoryArgsArg extends STNode {
    content: string;
    value: string;
    evaluator: string;
    expression: string;
    literal: boolean;
}

export interface ValidateResource extends STNode {
    key: string;
    location: string;
}

export interface SourceEnrich extends STNode {
    content: any;
    clone: boolean;
    xpath: string;
    key: string;
    type: string;
    property: string;
}

export interface Transaction extends STNode {
    action: string;
    description: string;
}

export interface EndpointRecipientlist extends STNode {
    endpoint: EndpointRecipientlistEndpoint[];
}

export interface RuleRulesetSource extends STNode {
    any: any[];
    key: string;
}

export interface TExtensibilityElement extends STNode {
    required: boolean;
}

export interface WSDLEndpointEnableSec extends STNode {
    policy: string;
}

export interface RewriteRewriteruleCondition extends STNode {
    and: And;
    or: Or;
    equal: Equal;
    not: Not;
    condition: string
}

export interface BindingFaultType extends ExtensibleDocumentedType, STNode {
    otherAttributes: any;
    any: any[];
    ref: string;
}

export interface EndpointFailoverEndpoint extends STNode {
    _default: DefaultEndpoint;
    http: EndpointHttp;
    address: EndpointAddress;
    wsdl: WSDLEndpoint;
    loadbalance: EndpointLoadbalance;
    session: EndpointSession;
    name: string;
    key: string;
}

export interface BamServerProfile extends STNode {
    streamConfig: BamServerProfileStreamConfig;
    name: string;
}

export interface LocalEntry extends STNode {
    content: any[];
    key: string;
    src: string;
}

export interface PublishEventAttributes extends STNode {
    meta: PublishEventAttributesMeta;
    correlation: PublishEventAttributesCorrelation;
    payload: PublishEventAttributesPayload;
    arbitrary: PublishEventAttributesArbitrary;
}

export interface Loopback extends STNode {
    description: string;
}

export interface PublishEventAttributesPayload extends STNode {
    attributes: Attribute[];
}

export interface Call extends STNode {
    source: CallSource;
    target: CallTarget;
    endpoint: NamedEndpoint;
    blocking: boolean;
    initAxis2ClientOptions: boolean;
    description: string;
}

export interface OauthService extends STNode {
    remoteServiceUrl: string;
    username: string;
    password: string;
    description: string;
}

export interface Respond extends STNode {
    description: string;
}

export interface WSDLEndpointEnableRM extends STNode {
    policy: string;
}

export interface RuleRuleset extends STNode {
    properties: RuleRuleSetProperties;
    rule: RuleRuleSetRule;
}

export interface RuleRuleSetProperties {
    property: MediatorProperty[];
}

export interface RuleRuleSetRule {
    value: string;
    resourceType: string;
    sourceType: string;
}

export interface TService extends TExtensibleDocumented, STNode {
    port: TPort[];
    name: string;
}

export interface ThrottlePolicy extends STNode {
    content: Policy[];
    key: string;
}

export interface Policy extends OperatorContentType {
    otherAttributes: any;
    name: string;
    id: ID
}

export interface OperatorContentType extends STNode {
    policyOrAllOrExactlyOne: any[];
}

export interface ID extends STNode {
    value: string;
    type: string;
}

export interface TaskTrigger extends STNode {
    interval: string;
    count: string;
    once: any;
    cron: string;
}

export interface Parameter extends STNode {
    otherAttributes: any;
    content: any[];
    name: string;
    key: string;
    locked: boolean;
}

export interface AggregateOnComplete extends STNode {
    mediatorList: STNode[];
    expression: string;
    sequenceAttribute: string;
    enclosingElementProperty: string;
    aggregateElementType: string;
}

export interface Rule extends STNode {
    source: RuleSource;
    target: RuleTarget;
    ruleSet: RuleRuleset;
    input: RuleInput;
    output: RuleOutput;
    description: string;
}

export interface RuleInput {
    fact: RuleInputFact[];
    namespace: string;
    wrapperElementName: string;
}

export interface RuleInputFact {
    elementName: string;
    namespace: string;
    type: string;
    xpath: string;
}

export interface RuleOutput {
    fact: RuleOutputFact[];
    namespace: string;
    wrapperElementName: string;
}

export interface RuleOutputFact {
    elementName: string;
    namespace: string;
    type: string;
}

export interface RuleSource extends STNode {
    value: string;
    xpath: string;
}

export interface RuleTarget extends STNode {
    value: string;
    action: string;
    resultXpath: string;
    xpath: string;
}

export interface EjbArgs extends STNode {
    arg: EjbArgsArg[];
}

export interface Cache extends STNode {
    onCacheHit: CacheOnCacheHit;
    protocol: CacheProtocol;
    implementation: CacheImplementation;
    id: string;
    timeout: number;
    collector: boolean;
    maxMessageSize: number;
    scope: string;
    hashGenerator: string;
    description: string;
}

export enum LogLevel {
    simple,
    headers,
    full,
    custom,
}

export enum LogCategory {
    INFO,
    FATAL,
    ERROR,
    WARN,
    DEBUG,
    TRACE,
}

export enum SchemaType {
    XML,
    JSON,
    CSV,
    XSD,
    JSONSCHEMA,
    CONNECTOR,
}

export enum PolicyType {
    in,
    out,
}

export enum EnableDisable {
    enable,
    disable,
}

export enum SetRemove {
    set,
    remove,
}

export interface Ntlm extends STNode {
    domain: string;
    host: string;
    username: string;
    password: string;
    ntlmVersion: string;
    description: string;
}

export type DiagramService = APIResource | NamedSequence | Proxy | Template | Query;

export interface Connector extends STNode {
    connectorName: string;
    method: string;
    parameters: ConnectorParameter[];
    configKey?: string;
    tools?: Tools;
    mcpConnection?: string;
    mediator?: any;
}

export interface AIConnector extends Connector {
    connections: { [key: string]: AIConnectorConnection };
}

export interface AIConnectorConnection {
    name: string;
    path: string;
    connectionType?: string;
    connectorName?: string;
    parameters: any[]
}

export interface Tools extends STNode {
    tools: Tool[];
}

export interface Tool extends STNode {
    name: string;
    description: string;
    template: string;
    mediator: Connector;
    isMcpTool?: boolean;
    mcpConnection?: string;
    mcpToolNames?: string[];
}

export interface ConnectorParameter extends STNode {
    name: string;
    value: string;
    isExpression: boolean;
}

export interface UnitTest extends STNode {
    unitTestArtifacts: UnitTestArtifacts;
    testCases: TestCases;
    mockServices: MockServices;
}

export interface UnitTestArtifacts {
    testArtifact: TestArtifact;
    supportiveArtifacts: SupportiveArtifacts;
    registryResources: RegistryResources;
    connectorResources: ConnectorResources;
}

export interface SupportiveArtifacts extends STNode {
    artifacts: Artifact[];
}

export interface RegistryResources extends STNode {
    registryResources: Artifact[];
}

export interface ConnectorResources extends STNode {
    connectorResources: Artifact[];
}

export interface TestArtifact extends STNode {
    artifact: Artifact;
}

export interface Artifact extends STNode {
    content: string;
}

export interface TestCases extends STNode {
    testCases: TestCase[];
}

export interface TestCase extends STNode {
    name: string;
    assertions: Assertions;
    input: TestCaseInput;
}

export interface Assertions extends STNode {
    assertions: Assertion[];
}

export interface TestCaseInput extends STNode {
    requestPath: STNode;
    requestMethod: STNode;
    requestProtocol: STNode;
    payload: STNode;
    properties?: TestCaseInputProperties;
}

export interface TestCaseInputProperties extends STNode {
    properties: Property[];
}

export interface Assertion extends STNode {
    expected: STNode;
    actual: STNode;
    message: STNode;

}

export interface MockServices extends STNode {
    services: STNode[];
}

export interface MockService extends STNode {
    context: STNode;
    port: STNode;
    serviceName: STNode;
    resources: MockServiceResources;
}

export interface MockServiceResources extends STNode {
    resources: MockServiceResource[];
}

export interface MockServiceResource extends STNode {
    method: STNode;
    request: MockRequest;
    response: MockResponse;
    subContext: STNode;
}

export interface MockRequest extends STNode {
    headers: MockResourceHeaders;
    payload: STNode;
}

export interface MockResponse extends STNode {
    headers: MockResourceHeaders;
    statusCode: STNode;
    payload: STNode;
}

export interface MockResourceHeaders extends STNode {
    headers: MockResourceHeader[];
}

export interface MockResourceHeader {
    name: string;
    value: string;
}

export interface Query extends STNode {
    id: string;
    params?: QueryParameter[];
    result?: QueryResult;
    returnGeneratedKeys?: boolean;
    returnUpdatedRowCount?: boolean;
    sql?: STNode;
    expression?: STNode;
    properties?: any;
    useConfig?: string;
    keyColumns?: string;
}

export interface QueryParameter extends STNode {
    name: string;
    sqlType?: string;
    paramType?: string;
    optional?: boolean;
    ordinal?: number;
    query?: string;
    type?: string;
    defaultValue?: string;
    paramElements?: any[];
}

export interface QueryResult extends STNode {
    attributes?: ResultAttribute[];
    callQueries?: ResultQuery[];
    defaultNamespace?: string;
    element?: string;
    elements?: ResultElement[];
    rowName?: string;
    xsltPath?: string;
    outputType?: string;
    useColumnNumbers?: boolean;
    escapeNonPrintableChar?: boolean;
    rdfBaseURI?: string;
}

export interface ResultAttribute extends STNode {
    name: string;
    column?: string;
    queryParam?: string;
    arrayName?: string;
    xsdType: string;
    optional?: boolean;
    exportName?: string;
    exportType?: string;
    requiredRoles: string;
}

export interface ResultElement extends STNode {
    name: string;
    namespace?: string;
    column?: string;
    queryParam?: string;
    arrayName?: string;
    xsdType: string;
    optional?: boolean;
    exportName?: string;
    exportType?: string;
    requiredRoles: string;
    elements?: ResultElement[];
    inlineXml?: string;
}

export interface ResultQuery extends STNode {
    href: string;
    requiredRoles: string;
    withParam?: any[];
}
