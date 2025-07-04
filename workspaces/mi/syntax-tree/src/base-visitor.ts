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

import * as Synapse from "./syntax-tree-interfaces";

export interface Visitor {
    skipChildren(): boolean;

    beginVisitSTNode?(node: Synapse.STNode): void;
    endVisitSTNode?(node: Synapse.STNode): void;

    beginVisitTBindingOperationFault?(node: Synapse.TBindingOperationFault): void;
    endVisitTBindingOperationFault?(node: Synapse.TBindingOperationFault): void;

    beginVisitCallSource?(node: Synapse.CallSource): void;
    endVisitCallSource?(node: Synapse.CallSource): void;

    beginVisitRuleFactsFact?(node: Synapse.RuleFactsFact): void;
    endVisitRuleFactsFact?(node: Synapse.RuleFactsFact): void;

    beginVisitRuleFacts?(node: Synapse.RuleFacts): void;
    endVisitRuleFacts?(node: Synapse.RuleFacts): void;

    beginVisitDataServiceCallSource?(node: Synapse.DataServiceCallSource): void;
    endVisitDataServiceCallSource?(node: Synapse.DataServiceCallSource): void;

    beginVisitTemplateParameter?(node: Synapse.TemplateParameter): void;
    endVisitTemplateParameter?(node: Synapse.TemplateParameter): void;

    beginVisitWSDLEndpoint?(node: Synapse.WSDLEndpoint): void;
    endVisitWSDLEndpoint?(node: Synapse.WSDLEndpoint): void;

    beginVisitCalloutEnableSec?(node: Synapse.CalloutEnableSec): void;
    endVisitCalloutEnableSec?(node: Synapse.CalloutEnableSec): void;

    beginVisitWSDLEndpointSuspendOnFailure?(node: Synapse.WSDLEndpointSuspendOnFailure): void;
    endVisitWSDLEndpointSuspendOnFailure?(node: Synapse.WSDLEndpointSuspendOnFailure): void;

    beginVisitSpring?(node: Synapse.Spring): void;
    endVisitSpring?(node: Synapse.Spring): void;

    beginVisitTask?(node: Synapse.Task): void;
    endVisitTask?(node: Synapse.Task): void;

    beginVisitFilterElse?(node: Synapse.FilterElse): void;
    endVisitFilterElse?(node: Synapse.FilterElse): void;

    beginVisitHeader?(node: Synapse.Header): void;
    endVisitHeader?(node: Synapse.Header): void;

    beginVisitEndpointFailover?(node: Synapse.EndpointFailover): void;
    endVisitEndpointFailover?(node: Synapse.EndpointFailover): void;

    beginVisitForeach?(node: Synapse.Foreach): void;
    endVisitForeach?(node: Synapse.Foreach): void;

    beginVisitPayloadFactoryFormat?(node: Synapse.PayloadFactoryFormat): void;
    endVisitPayloadFactoryFormat?(node: Synapse.PayloadFactoryFormat): void;

    beginVisitBuilderMessageBuilder?(node: Synapse.BuilderMessageBuilder): void;
    endVisitBuilderMessageBuilder?(node: Synapse.BuilderMessageBuilder): void;

    beginVisitTPort?(node: Synapse.TPort): void;
    endVisitTPort?(node: Synapse.TPort): void;

    beginVisitAnd?(node: Synapse.And): void;
    endVisitAnd?(node: Synapse.And): void;

    beginVisitScript?(node: Synapse.Script): void;
    endVisitScript?(node: Synapse.Script): void;

    beginVisitTOperation?(node: Synapse.TOperation): void;
    endVisitTOperation?(node: Synapse.TOperation): void;

    beginVisitDatamapper?(node: Synapse.Datamapper): void;
    endVisitDatamapper?(node: Synapse.Datamapper): void;

    beginVisitServiceType?(node: Synapse.ServiceType): void;
    endVisitServiceType?(node: Synapse.ServiceType): void;

    beginVisitPublishEventAttributesArbitrary?(node: Synapse.PublishEventAttributesArbitrary): void;
    endVisitPublishEventAttributesArbitrary?(node: Synapse.PublishEventAttributesArbitrary): void;

    beginVisitPublishEvent?(node: Synapse.PublishEvent): void;
    endVisitPublishEvent?(node: Synapse.PublishEvent): void;

    beginVisitStore?(node: Synapse.Store): void;
    endVisitStore?(node: Synapse.Store): void;

    beginVisitAPIHandlers?(node: Synapse.APIHandlers): void;
    endVisitAPIHandlers?(node: Synapse.APIHandlers): void;

    beginVisitNot?(node: Synapse.Not): void;
    endVisitNot?(node: Synapse.Not): void;

    beginVisitFeature?(node: Synapse.Feature): void;
    endVisitFeature?(node: Synapse.Feature): void;

    beginVisitTFault?(node: Synapse.TFault): void;
    endVisitTFault?(node: Synapse.TFault): void;

    beginVisitTypesType?(node: Synapse.TypesType): void;
    endVisitTypesType?(node: Synapse.TypesType): void;

    beginVisitEndpointHttpAuthenticationBasicAuth?(node: Synapse.EndpointHttpAuthenticationBasicAuth): void;
    endVisitEndpointHttpAuthenticationBasicAuth?(node: Synapse.EndpointHttpAuthenticationBasicAuth): void;

    beginVisitTTypes?(node: Synapse.TTypes): void;
    endVisitTTypes?(node: Synapse.TTypes): void;

    beginVisitBean?(node: Synapse.Bean): void;
    endVisitBean?(node: Synapse.Bean): void;

    beginVisitCorrelateOnOrCompleteConditionOrOnComplete?(node: Synapse.CorrelateOnOrCompleteConditionOrOnComplete): void;
    endVisitCorrelateOnOrCompleteConditionOrOnComplete?(node: Synapse.CorrelateOnOrCompleteConditionOrOnComplete): void;

    beginVisitAggregate?(node: Synapse.Aggregate): void;
    endVisitAggregate?(node: Synapse.Aggregate): void;

    beginVisitRewriteRewriterule?(node: Synapse.RewriteRewriterule): void;
    endVisitRewriteRewriterule?(node: Synapse.RewriteRewriterule): void;

    beginVisitExtensibleDocumentedType?(node: Synapse.ExtensibleDocumentedType): void;
    endVisitExtensibleDocumentedType?(node: Synapse.ExtensibleDocumentedType): void;

    beginVisitSend?(node: Synapse.Send): void;
    endVisitSend?(node: Synapse.Send): void;

    beginVisitLog?(node: Synapse.Log): void;
    endVisitLog?(node: Synapse.Log): void;

    beginVisitEndpointHttpAuthentication?(node: Synapse.EndpointHttpAuthentication): void;
    endVisitEndpointHttpAuthentication?(node: Synapse.EndpointHttpAuthentication): void;

    beginVisitRuleRulesetCreation?(node: Synapse.RuleRulesetCreation): void;
    endVisitRuleRulesetCreation?(node: Synapse.RuleRulesetCreation): void;

    beginVisitEnrich?(node: Synapse.Enrich): void;
    endVisitEnrich?(node: Synapse.Enrich): void;

    beginVisitCalloutTarget?(node: Synapse.CalloutTarget): void;
    endVisitCalloutTarget?(node: Synapse.CalloutTarget): void;

    beginVisitEntitlementService?(node: Synapse.EntitlementService): void;
    endVisitEntitlementService?(node: Synapse.EntitlementService): void;

    beginVisitConditionalRouter?(node: Synapse.ConditionalRouter): void;
    endVisitConditionalRouter?(node: Synapse.ConditionalRouter): void;

    beginVisitFilterSequence?(node: Synapse.FilterSequence): void;
    endVisitFilterSequence?(node: Synapse.FilterSequence): void;

    beginVisitSwitch?(node: Synapse.Switch): void;
    endVisitSwitch?(node: Synapse.Switch): void;

    beginVisitProxyTarget?(node: Synapse.ProxyTarget): void;
    endVisitProxyTarget?(node: Synapse.ProxyTarget): void;

    beginVisitTParam?(node: Synapse.TParam): void;
    endVisitTParam?(node: Synapse.TParam): void;

    beginVisitInboundEndpoint?(node: Synapse.InboundEndpoint): void;
    endVisitInboundEndpoint?(node: Synapse.InboundEndpoint): void;

    beginVisitSmooksOutput?(node: Synapse.SmooksOutput): void;
    endVisitSmooksOutput?(node: Synapse.SmooksOutput): void;

    beginVisitRuleSession?(node: Synapse.RuleSession): void;
    endVisitRuleSession?(node: Synapse.RuleSession): void;

    beginVisitPojoCommandProperty?(node: Synapse.PojoCommandProperty): void;
    endVisitPojoCommandProperty?(node: Synapse.PojoCommandProperty): void;

    beginVisitSourceOrTargetOrConfiguration?(node: Synapse.SourceOrTargetOrConfiguration): void;
    endVisitSourceOrTargetOrConfiguration?(node: Synapse.SourceOrTargetOrConfiguration): void;

    beginVisitCallout?(node: Synapse.Callout): void;
    endVisitCallout?(node: Synapse.Callout): void;

    beginVisitBindingOperationType?(node: Synapse.BindingOperationType): void;
    endVisitBindingOperationType?(node: Synapse.BindingOperationType): void;

    beginVisitDataServiceCallTarget?(node: Synapse.DataServiceCallTarget): void;
    endVisitDataServiceCallTarget?(node: Synapse.DataServiceCallTarget): void;

    beginVisitDrop?(node: Synapse.Drop): void;
    endVisitDrop?(node: Synapse.Drop): void;

    beginVisitSmooks?(node: Synapse.Smooks): void;
    endVisitSmooks?(node: Synapse.Smooks): void;

    beginVisitEjb?(node: Synapse.Ejb): void;
    endVisitEjb?(node: Synapse.Ejb): void;

    beginVisitAttribute?(node: Synapse.Attribute): void;
    endVisitAttribute?(node: Synapse.Attribute): void;

    beginVisitBamServerProfileStreamConfig?(node: Synapse.BamServerProfileStreamConfig): void;
    endVisitBamServerProfileStreamConfig?(node: Synapse.BamServerProfileStreamConfig): void;

    beginVisitDefaultEndpoint?(node: Synapse.DefaultEndpoint): void;
    endVisitDefaultEndpoint?(node: Synapse.DefaultEndpoint): void;

    beginVisitPublishEventAttributesCorrelation?(node: Synapse.PublishEventAttributesCorrelation): void;
    endVisitPublishEventAttributesCorrelation?(node: Synapse.PublishEventAttributesCorrelation): void;

    beginVisitEndpointAddress?(node: Synapse.EndpointAddress): void;
    endVisitEndpointAddress?(node: Synapse.EndpointAddress): void;

    beginVisitImportType?(node: Synapse.ImportType): void;
    endVisitImportType?(node: Synapse.ImportType): void;

    beginVisitBindingType?(node: Synapse.BindingType): void;
    endVisitBindingType?(node: Synapse.BindingType): void;

    beginVisitBindingOperationMessageType?(node: Synapse.BindingOperationMessageType): void;
    endVisitBindingOperationMessageType?(node: Synapse.BindingOperationMessageType): void;

    beginVisitCallTarget?(node: Synapse.CallTarget): void;
    endVisitCallTarget?(node: Synapse.CallTarget): void;

    beginVisitThrottle?(node: Synapse.Throttle): void;
    endVisitThrottle?(node: Synapse.Throttle): void;

    beginVisitMessageStore?(node: Synapse.MessageStore): void;
    endVisitMessageStore?(node: Synapse.MessageStore): void;

    beginVisitXquery?(node: Synapse.Xquery): void;
    endVisitXquery?(node: Synapse.Xquery): void;

    beginVisitWSDLEndpointEnableAddressing?(node: Synapse.WSDLEndpointEnableAddressing): void;
    endVisitWSDLEndpointEnableAddressing?(node: Synapse.WSDLEndpointEnableAddressing): void;

    beginVisitXqueryVariable?(node: Synapse.XqueryVariable): void;
    endVisitXqueryVariable?(node: Synapse.XqueryVariable): void;

    beginVisitInterfaceFaultType?(node: Synapse.InterfaceFaultType): void;
    endVisitInterfaceFaultType?(node: Synapse.InterfaceFaultType): void;

    beginVisitValidateOnFail?(node: Synapse.ValidateOnFail): void;
    endVisitValidateOnFail?(node: Synapse.ValidateOnFail): void;

    beginVisitCloneTarget?(node: Synapse.CloneTarget): void;
    endVisitCloneTarget?(node: Synapse.CloneTarget): void;

    beginVisitEndpointProperty?(node: Synapse.EndpointProperty): void;
    endVisitEndpointProperty?(node: Synapse.EndpointProperty): void;

    beginVisitDblookup?(node: Synapse.DbMediator): void;
    endVisitDblookup?(node: Synapse.DbMediator): void;

    beginVisitDbreport?(node: Synapse.DbMediator): void;
    endVisitDbreport?(node: Synapse.DbMediator): void;

    beginVisitEntitlementServiceAdvice?(node: Synapse.EntitlementServiceAdvice): void;
    endVisitEntitlementServiceAdvice?(node: Synapse.EntitlementServiceAdvice): void;

    beginVisitEndpoint?(node: Synapse.Endpoint): void;
    endVisitEndpoint?(node: Synapse.Endpoint): void;

    beginVisitAPI?(node: Synapse.API): void;
    endVisitAPI?(node: Synapse.API): void;

    beginVisitWSDLEndpointMarkForSuspension?(node: Synapse.WSDLEndpointMarkForSuspension): void;
    endVisitWSDLEndpointMarkForSuspension?(node: Synapse.WSDLEndpointMarkForSuspension): void;

    beginVisitAPIHandlersHandler?(node: Synapse.APIHandlersHandler): void;
    endVisitAPIHandlersHandler?(node: Synapse.APIHandlersHandler): void;

    beginVisitRuleResults?(node: Synapse.RuleResults): void;
    endVisitRuleResults?(node: Synapse.RuleResults): void;

    beginVisitEndpointType?(node: Synapse.EndpointType): void;
    endVisitEndpointType?(node: Synapse.EndpointType): void;

    beginVisitResource?(node: Synapse.Resource): void;
    endVisitResource?(node: Synapse.Resource): void;

    beginVisitEqual?(node: Synapse.Equal): void;
    endVisitEqual?(node: Synapse.Equal): void;

    beginVisitDocumentationType?(node: Synapse.DocumentationType): void;
    endVisitDocumentationType?(node: Synapse.DocumentationType): void;

    beginVisitTBindingOperationMessage?(node: Synapse.TBindingOperationMessage): void;
    endVisitTBindingOperationMessage?(node: Synapse.TBindingOperationMessage): void;

    beginVisitEnqueue?(node: Synapse.Enqueue): void;
    endVisitEnqueue?(node: Synapse.Enqueue): void;

    beginVisitTDocumented?(node: Synapse.TDocumented): void;
    endVisitTDocumented?(node: Synapse.TDocumented): void;

    beginVisitCacheImplementation?(node: Synapse.CacheImplementation): void;
    endVisitCacheImplementation?(node: Synapse.CacheImplementation): void;

    beginVisitFilterThen?(node: Synapse.FilterThen): void;
    endVisitFilterThen?(node: Synapse.FilterThen): void;

    beginVisitValidateSchema?(node: Synapse.ValidateSchema): void;
    endVisitValidateSchema?(node: Synapse.ValidateSchema): void;

    beginVisitValidate?(node: Synapse.Validate): void;
    endVisitValidate?(node: Synapse.Validate): void;

    beginVisitPayloadFactoryArgs?(node: Synapse.PayloadFactoryArgs): void;
    endVisitPayloadFactoryArgs?(node: Synapse.PayloadFactoryArgs): void;

    beginVisitXslt?(node: Synapse.Xslt): void;
    endVisitXslt?(node: Synapse.Xslt): void;

    beginVisitTPart?(node: Synapse.TPart): void;
    endVisitTPart?(node: Synapse.TPart): void;

    beginVisitEvaluatorList?(node: Synapse.EvaluatorList): void;
    endVisitEvaluatorList?(node: Synapse.EvaluatorList): void;

    beginVisitOr?(node: Synapse.Or): void;
    endVisitOr?(node: Synapse.Or): void;

    beginVisitFilter?(node: Synapse.Filter): void;
    endVisitFilter?(node: Synapse.Filter): void;

    beginVisitTargetEnrich?(node: Synapse.TargetEnrich): void;
    endVisitTargetEnrich?(node: Synapse.TargetEnrich): void;

    beginVisitMessageRefFaultType?(node: Synapse.MessageRefFaultType): void;
    endVisitMessageRefFaultType?(node: Synapse.MessageRefFaultType): void;

    beginVisitCallTemplate?(node: Synapse.CallTemplate): void;
    endVisitCallTemplate?(node: Synapse.CallTemplate): void;

    beginVisitRuleResultsResult?(node: Synapse.RuleResultsResult): void;
    endVisitRuleResultsResult?(node: Synapse.RuleResultsResult): void;

    beginVisitBam?(node: Synapse.Bam): void;
    endVisitBam?(node: Synapse.Bam): void;

    beginVisitEndpointParameter?(node: Synapse.EndpointParameter): void;
    endVisitEndpointParameter?(node: Synapse.EndpointParameter): void;

    beginVisitEndpointHttpAuthenticationOauthClientCredentials?(node: Synapse.EndpointHttpAuthenticationOauthClientCredentials): void;
    endVisitEndpointHttpAuthenticationOauthClientCredentials?(node: Synapse.EndpointHttpAuthenticationOauthClientCredentials): void;

    beginVisitTBinding?(node: Synapse.TBinding): void;
    endVisitTBinding?(node: Synapse.TBinding): void;

    beginVisitEjbArgsArg?(node: Synapse.EjbArgsArg): void;
    endVisitEjbArgsArg?(node: Synapse.EjbArgsArg): void;

    beginVisitConditionalRouterRoute?(node: Synapse.ConditionalRouterRoute): void;
    endVisitConditionalRouterRoute?(node: Synapse.ConditionalRouterRoute): void;

    beginVisitSwitchCase?(node: Synapse.SwitchCase): void;
    endVisitSwitchCase?(node: Synapse.SwitchCase): void;

    beginVisitCalloutSource?(node: Synapse.CalloutSource): void;
    endVisitCalloutSource?(node: Synapse.CalloutSource): void;

    beginVisitDescriptionType?(node: Synapse.DescriptionType): void;
    endVisitDescriptionType?(node: Synapse.DescriptionType): void;

    beginVisitEndpointLoadbalanceEndpoint?(node: Synapse.EndpointLoadbalanceEndpoint): void;
    endVisitEndpointLoadbalanceEndpoint?(node: Synapse.EndpointLoadbalanceEndpoint): void;

    beginVisitSwitchDefault?(node: Synapse.SwitchDefault): void;
    endVisitSwitchDefault?(node: Synapse.SwitchDefault): void;

    beginVisitSmooksInput?(node: Synapse.SmooksInput): void;
    endVisitSmooksInput?(node: Synapse.SmooksInput): void;

    beginVisitNamedEndpoint?(node: Synapse.NamedEndpoint): void;
    endVisitNamedEndpoint?(node: Synapse.NamedEndpoint): void;

    beginVisitProxyPublishWSDL?(node: Synapse.ProxyPublishWSDL): void;
    endVisitProxyPublishWSDL?(node: Synapse.ProxyPublishWSDL): void;

    beginVisitPropertyGroup?(node: Synapse.PropertyGroup): void;
    endVisitPropertyGroup?(node: Synapse.PropertyGroup): void;

    beginVisitDocumentedType?(node: Synapse.DocumentedType): void;
    endVisitDocumentedType?(node: Synapse.DocumentedType): void;

    beginVisitDbMediatorConnectionPoolProperty?(node: Synapse.DbMediatorConnectionPoolProperty): void;
    endVisitDbMediatorConnectionPoolProperty?(node: Synapse.DbMediatorConnectionPoolProperty): void;

    beginVisitProxy?(node: Synapse.Proxy): void;
    endVisitProxy?(node: Synapse.Proxy): void;

    beginVisitExtensionElement?(node: Synapse.ExtensionElement): void;
    endVisitExtensionElement?(node: Synapse.ExtensionElement): void;

    beginVisitJsontransform?(node: Synapse.Jsontransform): void;
    endVisitJsontransform?(node: Synapse.Jsontransform): void;

    beginVisitClone?(node: Synapse.Clone): void;
    endVisitClone?(node: Synapse.Clone): void;

    beginVisitScatterGather?(node: Synapse.ScatterGather): void;
    endVisitScatterGather?(node: Synapse.ScatterGather): void;

    beginVisitBuilder?(node: Synapse.Builder): void;
    endVisitBuilder?(node: Synapse.Builder): void;

    beginVisitPojoCommand?(node: Synapse.PojoCommand): void;
    endVisitPojoCommand?(node: Synapse.PojoCommand): void;

    beginVisitNamedSequence?(node: Synapse.NamedSequence): void;
    endVisitNamedSequence?(node: Synapse.NamedSequence): void;

    beginVisitProperty?(node: Synapse.Property): void;
    endVisitProperty?(node: Synapse.Property): void;

    beginVisitVariable?(node: Synapse.Variable): void;
    endVisitVariable?(node: Synapse.Variable): void;

    beginVisitThrowError?(node: Synapse.ThrowError): void;
    endVisitThrowError?(node: Synapse.ThrowError): void;

    beginVisitAPIHandlersHandlerProperty?(node: Synapse.APIHandlersHandlerProperty): void;
    endVisitAPIHandlersHandlerProperty?(node: Synapse.APIHandlersHandlerProperty): void;

    beginVisitEntitlementServiceObligations?(node: Synapse.EntitlementServiceObligations): void;
    endVisitEntitlementServiceObligations?(node: Synapse.EntitlementServiceObligations): void;

    beginVisitDataServiceCallOperations?(node: Synapse.DataServiceCallOperations): void;
    endVisitDataServiceCallOperations?(node: Synapse.DataServiceCallOperations): void;

    beginVisitTMessage?(node: Synapse.TMessage): void;
    endVisitTMessage?(node: Synapse.TMessage): void;

    beginVisitDbMediatorStatement?(node: Synapse.DbMediatorStatement): void;
    endVisitDbMediatorStatement?(node: Synapse.DbMediatorStatement): void;

    beginVisitTDocumentation?(node: Synapse.TDocumentation): void;
    endVisitTDocumentation?(node: Synapse.TDocumentation): void;

    beginVisitClass?(node: Synapse.Class): void;
    endVisitClass?(node: Synapse.Class): void;

    beginVisitTImport?(node: Synapse.TImport): void;
    endVisitTImport?(node: Synapse.TImport): void;

    beginVisitInterfaceType?(node: Synapse.InterfaceType): void;
    endVisitInterfaceType?(node: Synapse.InterfaceType): void;

    beginVisitValidateProperty?(node: Synapse.ValidateProperty): void;
    endVisitValidateProperty?(node: Synapse.ValidateProperty): void;

    beginVisitSequence?(node: Synapse.Sequence): void;
    endVisitSequence?(node: Synapse.Sequence): void;

    beginVisitEndpointHttpAuthenticationOauth?(node: Synapse.EndpointHttpAuthenticationOauth): void;
    endVisitEndpointHttpAuthenticationOauth?(node: Synapse.EndpointHttpAuthenticationOauth): void;

    beginVisitXsltFeature?(node: Synapse.XsltFeature): void;
    endVisitXsltFeature?(node: Synapse.XsltFeature): void;

    beginVisitDataServiceCall?(node: Synapse.DataServiceCall): void;
    endVisitDataServiceCall?(node: Synapse.DataServiceCall): void;

    beginVisitAPIResource?(node: Synapse.APIResource): void;
    endVisitAPIResource?(node: Synapse.APIResource): void;

    beginVisitDataServiceCallOperationsOperation?(node: Synapse.DataServiceCallOperationsOperation): void;
    endVisitDataServiceCallOperationsOperation?(node: Synapse.DataServiceCallOperationsOperation): void;

    beginVisitInterfaceOperationType?(node: Synapse.InterfaceOperationType): void;
    endVisitInterfaceOperationType?(node: Synapse.InterfaceOperationType): void;

    beginVisitIterate?(node: Synapse.Iterate): void;
    endVisitIterate?(node: Synapse.Iterate): void;

    beginVisitXsltResource?(node: Synapse.XsltResource): void;
    endVisitXsltResource?(node: Synapse.XsltResource): void;

    beginVisitWSDLEndpointTimeout?(node: Synapse.WSDLEndpointTimeout): void;
    endVisitWSDLEndpointTimeout?(node: Synapse.WSDLEndpointTimeout): void;

    beginVisitAggregateCompleteCondition?(node: Synapse.AggregateCompleteCondition): void;
    endVisitAggregateCompleteCondition?(node: Synapse.AggregateCompleteCondition): void;

    beginVisitEndpointLoadbalanceMember?(node: Synapse.EndpointLoadbalanceMember): void;
    endVisitEndpointLoadbalanceMember?(node: Synapse.EndpointLoadbalanceMember): void;

    beginVisitEndpointRecipientlistEndpoint?(node: Synapse.EndpointRecipientlistEndpoint): void;
    endVisitEndpointRecipientlistEndpoint?(node: Synapse.EndpointRecipientlistEndpoint): void;

    beginVisitAggregateCompleteConditionMessageCount?(node: Synapse.AggregateCompleteConditionMessageCount): void;
    endVisitAggregateCompleteConditionMessageCount?(node: Synapse.AggregateCompleteConditionMessageCount): void;

    beginVisitRuleChildMediators?(node: Synapse.RuleChildMediators): void;
    endVisitRuleChildMediators?(node: Synapse.RuleChildMediators): void;

    beginVisitCalloutConfiguration?(node: Synapse.CalloutConfiguration): void;
    endVisitCalloutConfiguration?(node: Synapse.CalloutConfiguration): void;

    beginVisitTPortType?(node: Synapse.TPortType): void;
    endVisitTPortType?(node: Synapse.TPortType): void;

    beginVisitMakefaultReason?(node: Synapse.MakefaultReason): void;
    endVisitMakefaultReason?(node: Synapse.MakefaultReason): void;

    beginVisitCacheOnCacheHit?(node: Synapse.CacheOnCacheHit): void;
    endVisitCacheOnCacheHit?(node: Synapse.CacheOnCacheHit): void;

    beginVisitRegistry?(node: Synapse.Registry): void;
    endVisitRegistry?(node: Synapse.Registry): void;

    beginVisitRuleRulesetCreationProperty?(node: Synapse.RuleRulesetCreationProperty): void;
    endVisitRuleRulesetCreationProperty?(node: Synapse.RuleRulesetCreationProperty): void;

    beginVisitMakefaultCode?(node: Synapse.MakefaultCode): void;
    endVisitMakefaultCode?(node: Synapse.MakefaultCode): void;

    beginVisitMakefault?(node: Synapse.Makefault): void;
    endVisitMakefault?(node: Synapse.Makefault): void;

    beginVisitMediatorProperty?(node: Synapse.MediatorProperty): void;
    endVisitMediatorProperty?(node: Synapse.MediatorProperty): void;

    beginVisitTBindingOperation?(node: Synapse.TBindingOperation): void;
    endVisitTBindingOperation?(node: Synapse.TBindingOperation): void;

    beginVisitEndpointOrMember?(node: Synapse.EndpointOrMember): void;
    endVisitEndpointOrMember?(node: Synapse.EndpointOrMember): void;

    beginVisitEndpointLoadbalance?(node: Synapse.EndpointLoadbalance): void;
    endVisitEndpointLoadbalance?(node: Synapse.EndpointLoadbalance): void;

    beginVisitTExtensibleAttributesDocumented?(node: Synapse.TExtensibleAttributesDocumented): void;
    endVisitTExtensibleAttributesDocumented?(node: Synapse.TExtensibleAttributesDocumented): void;

    beginVisitDbMediatorStatementParameter?(node: Synapse.DbMediatorStatementParameter): void;
    endVisitDbMediatorStatementParameter?(node: Synapse.DbMediatorStatementParameter): void;

    beginVisitWithParam?(node: Synapse.WithParam): void;
    endVisitWithParam?(node: Synapse.WithParam): void;

    beginVisitPayloadFactory?(node: Synapse.PayloadFactory): void;
    endVisitPayloadFactory?(node: Synapse.PayloadFactory): void;

    beginVisitTemplate?(node: Synapse.Template): void;
    endVisitTemplate?(node: Synapse.Template): void;

    beginVisitDbMediatorStatementResult?(node: Synapse.DbMediatorStatementResult): void;
    endVisitDbMediatorStatementResult?(node: Synapse.DbMediatorStatementResult): void;

    beginVisitEndpointSession?(node: Synapse.EndpointSession): void;
    endVisitEndpointSession?(node: Synapse.EndpointSession): void;

    beginVisitTExtensibleDocumented?(node: Synapse.TExtensibleDocumented): void;
    endVisitTExtensibleDocumented?(node: Synapse.TExtensibleDocumented): void;

    beginVisitKeyAttribute?(node: Synapse.KeyAttribute): void;
    endVisitKeyAttribute?(node: Synapse.KeyAttribute): void;

    beginVisitIncludeType?(node: Synapse.IncludeType): void;
    endVisitIncludeType?(node: Synapse.IncludeType): void;

    beginVisitMessageProcessor?(node: Synapse.MessageProcessor): void;
    endVisitMessageProcessor?(node: Synapse.MessageProcessor): void;

    beginVisitMakefaultDetail?(node: Synapse.MakefaultDetail): void;
    endVisitMakefaultDetail?(node: Synapse.MakefaultDetail): void;

    beginVisitInboundEndpointParameters?(node: Synapse.InboundEndpointParameters): void;
    endVisitInboundEndpointParameters?(node: Synapse.InboundEndpointParameters): void;

    beginVisitAnyTopLevelOptionalElement?(node: Synapse.AnyTopLevelOptionalElement): void;
    endVisitAnyTopLevelOptionalElement?(node: Synapse.AnyTopLevelOptionalElement): void;

    beginVisitTDefinitions?(node: Synapse.TDefinitions): void;
    endVisitTDefinitions?(node: Synapse.TDefinitions): void;

    beginVisitDbMediatorConnectionPool?(node: Synapse.DbMediatorConnectionPool): void;
    endVisitDbMediatorConnectionPool?(node: Synapse.DbMediatorConnectionPool): void;

    beginVisitCacheProtocol?(node: Synapse.CacheProtocol): void;
    endVisitCacheProtocol?(node: Synapse.CacheProtocol): void;

    beginVisitEndpointHttpAuthenticationOauthAuthorizationCode?(node: Synapse.EndpointHttpAuthenticationOauthAuthorizationCode): void;
    endVisitEndpointHttpAuthenticationOauthAuthorizationCode?(node: Synapse.EndpointHttpAuthenticationOauthAuthorizationCode): void;

    beginVisitRewrite?(node: Synapse.Rewrite): void;
    endVisitRewrite?(node: Synapse.Rewrite): void;

    beginVisitPublishEventAttributesMeta?(node: Synapse.PublishEventAttributesMeta): void;
    endVisitPublishEventAttributesMeta?(node: Synapse.PublishEventAttributesMeta): void;

    beginVisitRewriteRewriteruleAction?(node: Synapse.RewriteRewriteruleAction): void;
    endVisitRewriteRewriteruleAction?(node: Synapse.RewriteRewriteruleAction): void;

    beginVisitTarget?(node: Synapse.Target | Synapse.ProxyTarget): void;
    endVisitTarget?(node: Synapse.Target | Synapse.ProxyTarget): void;

    beginVisitDbMediatorConnection?(node: Synapse.DbMediatorConnection): void;
    endVisitDbMediatorConnection?(node: Synapse.DbMediatorConnection): void;

    beginVisitProxyPolicy?(node: Synapse.ProxyPolicy): void;
    endVisitProxyPolicy?(node: Synapse.ProxyPolicy): void;

    beginVisitDataServiceCallOperationsOperationParam?(node: Synapse.DataServiceCallOperationsOperationParam): void;
    endVisitDataServiceCallOperationsOperationParam?(node: Synapse.DataServiceCallOperationsOperationParam): void;

    beginVisitBindingOperationFaultType?(node: Synapse.BindingOperationFaultType): void;
    endVisitBindingOperationFaultType?(node: Synapse.BindingOperationFaultType): void;

    beginVisitAggregateCorrelateOn?(node: Synapse.AggregateCorrelateOn): void;
    endVisitAggregateCorrelateOn?(node: Synapse.AggregateCorrelateOn): void;

    beginVisitPublishEventAttributesArbitraryAttribute?(node: Synapse.PublishEventAttributesArbitraryAttribute): void;
    endVisitPublishEventAttributesArbitraryAttribute?(node: Synapse.PublishEventAttributesArbitraryAttribute): void;

    beginVisitEvent?(node: Synapse.Event): void;
    endVisitEvent?(node: Synapse.Event): void;

    beginVisitFastXSLT?(node: Synapse.FastXSLT): void;
    endVisitFastXSLT?(node: Synapse.FastXSLT): void;

    beginVisitRegistryOrApiOrProxy?(node: Synapse.RegistryOrApiOrProxy): void;
    endVisitRegistryOrApiOrProxy?(node: Synapse.RegistryOrApiOrProxy): void;

    beginVisitDefinition?(node: Synapse.Definition): void;
    endVisitDefinition?(node: Synapse.Definition): void;

    beginVisitMessageRefType?(node: Synapse.MessageRefType): void;
    endVisitMessageRefType?(node: Synapse.MessageRefType): void;

    beginVisitEnableSecAndEnableRMAndEnableAddressing?(node: Synapse.EnableSecAndEnableRMAndEnableAddressing): void;
    endVisitEnableSecAndEnableRMAndEnableAddressing?(node: Synapse.EnableSecAndEnableRMAndEnableAddressing): void;

    beginVisitEndpointHttp?(node: Synapse.EndpointHttp): void;
    endVisitEndpointHttp?(node: Synapse.EndpointHttp): void;

    beginVisitPayloadFactoryArgsArg?(node: Synapse.PayloadFactoryArgsArg): void;
    endVisitPayloadFactoryArgsArg?(node: Synapse.PayloadFactoryArgsArg): void;

    beginVisitValidateResource?(node: Synapse.ValidateResource): void;
    endVisitValidateResource?(node: Synapse.ValidateResource): void;

    beginVisitSourceEnrich?(node: Synapse.SourceEnrich): void;
    endVisitSourceEnrich?(node: Synapse.SourceEnrich): void;

    beginVisitTransaction?(node: Synapse.Transaction): void;
    endVisitTransaction?(node: Synapse.Transaction): void;

    beginVisitEndpointRecipientlist?(node: Synapse.EndpointRecipientlist): void;
    endVisitEndpointRecipientlist?(node: Synapse.EndpointRecipientlist): void;

    beginVisitRuleRulesetSource?(node: Synapse.RuleRulesetSource): void;
    endVisitRuleRulesetSource?(node: Synapse.RuleRulesetSource): void;

    beginVisitTExtensibilityElement?(node: Synapse.TExtensibilityElement): void;
    endVisitTExtensibilityElement?(node: Synapse.TExtensibilityElement): void;

    beginVisitWSDLEndpointEnableSec?(node: Synapse.WSDLEndpointEnableSec): void;
    endVisitWSDLEndpointEnableSec?(node: Synapse.WSDLEndpointEnableSec): void;

    beginVisitRewriteRewriteruleCondition?(node: Synapse.RewriteRewriteruleCondition): void;
    endVisitRewriteRewriteruleCondition?(node: Synapse.RewriteRewriteruleCondition): void;

    beginVisitBindingFaultType?(node: Synapse.BindingFaultType): void;
    endVisitBindingFaultType?(node: Synapse.BindingFaultType): void;

    beginVisitEndpointFailoverEndpoint?(node: Synapse.EndpointFailoverEndpoint): void;
    endVisitEndpointFailoverEndpoint?(node: Synapse.EndpointFailoverEndpoint): void;

    beginVisitBamServerProfile?(node: Synapse.BamServerProfile): void;
    endVisitBamServerProfile?(node: Synapse.BamServerProfile): void;

    beginVisitLocalEntry?(node: Synapse.LocalEntry): void;
    endVisitLocalEntry?(node: Synapse.LocalEntry): void;

    beginVisitPublishEventAttributes?(node: Synapse.PublishEventAttributes): void;
    endVisitPublishEventAttributes?(node: Synapse.PublishEventAttributes): void;

    beginVisitLoopback?(node: Synapse.Loopback): void;
    endVisitLoopback?(node: Synapse.Loopback): void;

    beginVisitPublishEventAttributesPayload?(node: Synapse.PublishEventAttributesPayload): void;
    endVisitPublishEventAttributesPayload?(node: Synapse.PublishEventAttributesPayload): void;

    beginVisitCall?(node: Synapse.Call): void;
    endVisitCall?(node: Synapse.Call): void;

    beginVisitOauthService?(node: Synapse.OauthService): void;
    endVisitOauthService?(node: Synapse.OauthService): void;

    beginVisitRespond?(node: Synapse.Respond): void;
    endVisitRespond?(node: Synapse.Respond): void;

    beginVisitWSDLEndpointEnableRM?(node: Synapse.WSDLEndpointEnableRM): void;
    endVisitWSDLEndpointEnableRM?(node: Synapse.WSDLEndpointEnableRM): void;

    beginVisitRuleRuleset?(node: Synapse.RuleRuleset): void;
    endVisitRuleRuleset?(node: Synapse.RuleRuleset): void;

    beginVisitTService?(node: Synapse.TService): void;
    endVisitTService?(node: Synapse.TService): void;

    beginVisitThrottlePolicy?(node: Synapse.ThrottlePolicy): void;
    endVisitThrottlePolicy?(node: Synapse.ThrottlePolicy): void;

    beginVisitTaskTrigger?(node: Synapse.TaskTrigger): void;
    endVisitTaskTrigger?(node: Synapse.TaskTrigger): void;

    beginVisitParameter?(node: Synapse.Parameter): void;
    endVisitParameter?(node: Synapse.Parameter): void;

    beginVisitAggregateOnComplete?(node: Synapse.AggregateOnComplete): void;
    endVisitAggregateOnComplete?(node: Synapse.AggregateOnComplete): void;

    beginVisitRule?(node: Synapse.Rule): void;
    endVisitRule?(node: Synapse.Rule): void;

    beginVisitNTLM?(node: Synapse.Ntlm): void;
    endVisitNTLM?(node: Synapse.Ntlm): void;

    beginVisitEjbArgs?(node: Synapse.EjbArgs): void;
    endVisitEjbArgs?(node: Synapse.EjbArgs): void;

    beginVisitCache?(node: Synapse.Cache): void;
    endVisitCache?(node: Synapse.Cache): void;

    beginVisitConnector?(node: Synapse.Connector): void;
    endVisitConnector?(node: Synapse.Connector): void;
}
