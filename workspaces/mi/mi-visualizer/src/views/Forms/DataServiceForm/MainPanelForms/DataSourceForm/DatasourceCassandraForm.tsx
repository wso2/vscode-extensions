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
import { TextField, Dropdown, RadioButtonGroup } from "@wso2/ui-toolkit";

export interface DataSourceCassandraFormProps {
    renderProps: any;
}

interface OptionProps {
    value: string;
}

export function DataSourceCassandraForm(props: DataSourceCassandraFormProps) {

    const compressionOptions: OptionProps[] = [
        { value: "LZ4"},
        { value: "NONE"},
        { value: "SNAPPY"}
    ];

    const compressionPolicies: OptionProps[] = [
        { value: "RoundRobinPolicy"},
        { value: "DCAwareRoundRobinPolicy"},
        { value: "LatencyAwareRoundRobinPolicy"},
        { value: "TokenAwareRoundRobinPolicy"},
        { value: "TokenAwareDCAwareRoundRobinPolicy"}
    ];

    const consistencyLevels: OptionProps[] = [
        { value: "ALL"},
        { value: "ANY"},
        { value: "EACH_QUORUM"},
        { value: "LOCAL_ONE"},
        { value: "LOCAL_QUORUM"},
        { value: "LOCAL_SERIAL"},
        { value: "ONE"},
        { value: "QUORUM"},
        { value: "SERIAL"},
        { value: "THREE"},
        { value: "TWO"}
    ];

    const protocolVersions: OptionProps[] = [
        { value: "1"},
        { value: "2"},
        { value: "3"},
        { value: "4"}
    ];

    const reconnectionPolicies: OptionProps[] = [
        { value: "ConstantReconnectionPolicy"},
        { value: "ExponentialReconnectionPolicy"}
    ];

    const retryPolicies: OptionProps[] = [
        { value: "DefaultRetryPolicy"},
        { value: "DowngradingConsistencyRetryPolicy"},
        { value: "FallthroughRetryPolicy"},
        { value: "LoggingDefaultRetryPolicy"},
        { value: "LoggingDowngradingConsistencyRetryPolicy"},
        { value: "LoggingFallthroughRetryPolicy"}
    ];

    const options = [{ content: "True", value: "true" }, {content: "False", value: "false"}];

    const inputFieldAttributes = [
        { label: "Keyspace", key: 'cassandra.keyspace', type: 'text' },
        { label: "Port", key: 'cassandra.port', type: 'text' },
        { label: "Cluster Name", key: 'cassandra.clusterName', type: 'text' },
        { label: "Compression", key: 'cassandra.compression', type: 'dropdown', items:  compressionOptions},
        { label: "Username", key: 'cassandra.username', type: 'text' },
        { label: "Password", key: 'cassandra.password', type: 'text' },
        { label: "Load Balancing Policy", key: 'cassandra.loadBalancingPolicy', type: 'dropdown', items:  compressionPolicies},
        { label: "Cassandra Data Center", key: 'cassandra.dataCenter', type: 'text' },
        { label: "Allow Remote DCs for Local Consistency Level", key: 'cassandra.allowRemoteDCsForLocalConsistencyLevel', type: 'radio', items: options},
        { label: "Enable JMX Reporting", key: 'cassandra.enableJMXReporting', type: 'radio', items: options},
        { label: "Enable Metrics", key: 'cassandra.enableMetrics', type: 'radio', items: options},
        { label: "Local Core Connections Per Host", key: 'cassandra.localCoreConnectionsPerHost', type: 'text' },
        { label: "Remote Core Connections Per Host", key: 'cassandra.remoteCoreConnectionsPerHost', type: 'text' },
        { label: "Local Max Connections Per Host", key: 'cassandra.localMaxConnectionsPerHost', type: 'text' },
        { label: "Remote Max Connections Per Host", key: 'cassandra.remoteMaxConnectionsPerHost', type: 'text' },
        { label: "Local New Connection Threshold", key: 'cassandra.localNewConnectionThreshold', type: 'text' },
        { label: "Remote New Connection Threshold", key: 'cassandra.remoteNewConnectionThreshold', type: 'text' },
        { label: "Local Max Requests Per Connection", key: 'cassandra.localMaxRequestsPerConnection', type: 'text' },
        { label: "Remote Max Requests Per Connection", key: 'cassandra.remoteMaxRequestsPerConnection', type: 'text' },
        { label: "Protocol Version", key: 'cassandra.protocolVersion', type: 'dropdown', items: protocolVersions},
        { label: "Consistency Level", key: 'cassandra.consistencyLevel', type: 'dropdown', items: consistencyLevels},
        { label: "Fetch Size", key: 'cassandra.fetchSize', type: 'text' },
        { label: "Serial Consistency Level", key: 'cassandra.serialConsistencyLevel', type: 'dropdown', items: consistencyLevels},
        { label: "Reconnection Policy", key: 'cassandra.reconnectionPolicy', type: 'dropdown', items: reconnectionPolicies},
        { label: "Constant Reconnection Policy Delay", key: 'cassandra.constantReconnectionPolicyDelay', type: 'text' },
        { label: "Exponential Reconnection Policy Base Delay", key: 'cassandra.exponentialReconnectionPolicyBaseDelay', type: 'text' },
        { label: "Exponential Reconnection Policy Max Delay", key: 'cassandra.exponentialReconnectionPolicyMaxDelay', type: 'text' },
        { label: "Retry Policy", key: 'cassandra.retryPolicy', type: 'dropdown', items: retryPolicies},
        { label: "Connection Timeout", key: 'cassandra.connectionTimeoutMillis', type: 'text' },
        { label: "Keep Alive", key: 'cassandra.keepAlive', type: 'radio', items: options},
        { label: "Read Timeout", key: 'cassandra.readTimeoutMillis', type: 'text' },
        { label: "Receive Buffer Size", key: 'cassandra.receiverBufferSize', type: 'text' },
        { label: "Send Buffer Size", key: 'cassandra.sendBufferSize', type: 'text' },
        { label: "Reuse Address", key: 'cassandra.reuseAddress', type: 'radio', items: options},
        { label: "So Linger", key: 'cassandra.soLinger', type: 'text' },
        { label: "TCP No Delay", key: 'cassandra.tcpNoDelay', type: 'radio', items: options},
        { label: "Enable SSL", key: 'cassandra.enableSSL', type: 'radio', items: options}
    ];

    return (
        <>
            <TextField
                label="Cassandra Servers"
                required
                size={100}
                {...props.renderProps('cassandra.cassandraServers')}
            />

            {inputFieldAttributes.map(field => (
                <>
                    {field.type === 'text' && (
                        <TextField
                            label={field.label}
                            size={100}
                            {...props.renderProps(field.key)}
                        />
                    )}
                    {field.type === 'dropdown' && (
                        <Dropdown
                            label={field.label}
                            items={field.items}
                            {...props.renderProps(field.key)}
                        />
                    )}
                    {field.type === 'radio' && (
                        <RadioButtonGroup
                            label={field.label}
                            options={field.items}
                            {...props.renderProps(field.key)}
                        />
                    )}
                </>
            ))}
        </>
    );
}
