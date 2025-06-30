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

import { render } from "mustache";

interface Parameter {
    [key: string]: string;
}

export interface MessageProcessorTemplateArgs {
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

const paramPool: { [key: string]: Parameter } = {
    ScheduledMessageForwardingProcessor: {
        'client.retry.interval': 'retryInterval',
        'member.count': 'taskCount',
        'message.processor.reply.sequence': 'replySequence',
        'axis2.config': 'axis2Config',
        'quartz.conf': 'quartzConfigPath',
        'non.retry.status.codes': 'statusCodes',
        'message.processor.deactivate.sequence': 'deactivateSequence',
        'is.active': 'processorState',
        'axis2.repo': 'clientRepository',
        cronExpression: 'cron',
        'max.delivery.attempts': 'maxRedeliveryAttempts',
        'message.processor.fault.sequence': 'faultSequence',
        'store.connection.retry.interval': 'connectionAttemptInterval',
        'max.store.connection.attempts': 'maxConnectionAttempts',
        'max.delivery.drop': 'dropMessageOption',
        interval: 'forwardingInterval',
        'message.processor.failMessagesStore': 'failMessageStoreType'
    },
    ScheduledFailoverMessageForwardingProcessor: {
        'client.retry.interval': 'retryInterval',
        cronExpression: 'cron',
        'max.delivery.attempts': 'maxRedeliveryAttempts',
        'member.count': 'taskCount',
        'message.processor.fault.sequence': 'faultSequence',
        'quartz.conf': 'quartzConfigPath',
        'max.delivery.drop': 'dropMessageOption',
        interval: 'forwardingInterval',
        'store.connection.retry.interval': 'connectionAttemptInterval',
        'max.store.connection.attempts': 'maxConnectionAttempts',
        'message.processor.deactivate.sequence': 'deactivateSequence',
        'is.active': 'processorState',
        'message.target.store.name': 'targetMessageStoreType'
    },
    MessageSamplingProcessor: {
        cronExpression: 'cron',
        sequence: 'sequence',
        'quartz.conf': 'quartzConfigPath',
        interval: 'samplingInterval',
        'is.active': 'processorState',
        concurrency: 'samplingConcurrency',
    }
};

export function getMessageProcessorMustacheTemplate() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<messageProcessor class="{{messageProcessorClass}}" name="{{messageProcessorName}}" messageStore="{{messageStoreType}}" {{#endpoint}}targetEndpoint="{{endpoint}}"{{/endpoint}} xmlns="http://ws.apache.org/ns/synapse">
    {{#params}}
        <parameter name="{{key}}">{{value}}</parameter>
    {{/params}}
</messageProcessor>`;
}

export function getMessageProcessorXml(data: MessageProcessorTemplateArgs) {

    let messageProcessorClass = data.messageProcessorType === 'Scheduled Message Forwarding Processor' ? 'org.apache.synapse.message.processor.impl.forwarder.ScheduledMessageForwardingProcessor' :
        data.messageProcessorType === 'Message Sampling Processor' ? 'org.apache.synapse.message.processor.impl.sampler.SamplingProcessor' :
            data.messageProcessorType === 'Scheduled Failover Message Forwarding Processor' ? 'org.apache.synapse.message.processor.impl.failover.FailoverScheduledMessageForwardingProcessor' : data.providerClass;

    data.processorState = data.processorState === 'Activate' ? 'true' : 'false';
    let params: Parameter[] = [];

    if (data.messageProcessorType === 'Custom Message Processor') {
        messageProcessorClass = data.providerClass;
        params = data.properties;
    } else {
        Object.entries(paramPool[data.messageProcessorType.split(" ").join("")]).map(([key, value]) => {
            if (data[value] != '' && data[value] != null) {
                params.push({ key, value: data[value] });
            }
        });
        params.push(...data.properties);
    }

    if (data.messageProcessorType === 'Scheduled Failover Message Forwarding Processor') {
        data.messageStoreType = data.sourceMessageStoreType;
    }

    const modifiedData = {
        ...data,
        messageProcessorClass,
        params
    };

    return render(getMessageProcessorMustacheTemplate(), modifiedData);
}
