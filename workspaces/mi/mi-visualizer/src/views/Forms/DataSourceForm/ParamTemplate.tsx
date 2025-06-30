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

interface DataSourceConfigParameter {
    name?: string;
    type: string;
    value?: string | number | boolean;
    items?: { content: string; value: string }[];
    validate?: {
        type: string;
        required?: boolean;
        min?: number;
        max?: number;
        patter?: string;
    };
}

interface ParamPool {
    [key: string]: DataSourceConfigParameter;
}

export const dataSourceParams: ParamPool = {
    defaultAutoCommit: {
        name: 'Default Auto Commit',
        type: 'checkbox',
    },
    defaultReadOnly: {
        name: 'Default Read Only',
        type: 'checkbox',
    },
    defaultTransactionIsolation: {
        name: 'Default Transaction Isolation',
        type: 'dropdown',
        items: [
            {
                content: "NONE",
                value: "NONE",
            },
            {
                content: "READ_COMMITTED",
                value: "READ_COMMITTED",
            },
            {
                content: "READ_UNCOMMITTED",
                value: "READ_UNCOMMITTED",
            },
            {
                content: "REPEATABLE_READ",
                value: "REPEATABLE_READ",
            },
            {
                content: "SERIALIZABLE",
                value: "SERIALIZABLE",
            },
        ],
        value: 'NONE',
    },
    defaultCatalog: {
        name: 'Default Catalog',
        type: 'text',
    },
    maxActive: {
        name: 'Max Active',
        type: 'text',
        validate: {
            type: 'number',
        },
    },
    maxIdle: {
        name: 'Max Idle',
        type: 'text',
        validate: {
            type: 'number',
        },
    },
    minIdle: {
        name: 'Min Idle',
        type: 'text',
        validate: {
            type: 'number',
        },
    },
    initialSize: {
        name: 'Initial Size',
        type: 'text',
        validate: {
            type: 'number',
        },
    },
    maxWait: {
        name: 'Max Wait (ms)',
        type: 'text',
        validate: {
            type: 'number',
        },
    },
    testOnBorrow: {
        name: 'Test On Borrow',
        type: 'checkbox',
    },
    testOnReturn: {
        name: 'Test On Return',
        type: 'checkbox',
    },
    testWhileIdle: {
        name: 'Test While Idle',
        type: 'checkbox',
    },
    validationQuery: {
        name: 'Validation Query',
        type: 'text',
    },
    validatorClassName: {
        name: 'Validator Class Name',
        type: 'text',
    },
    timeBetweenEvictionRunsMillis: {
        name: 'Time Between Eviction Runs Millis',
        type: 'text',
        validate: {
            type: 'number',
        },
    },
    numTestsPerEvictionRun: {
        name: 'Num Tests Per Eviction Run',
        type: 'text',
        validate: {
            type: 'number',
        },
    },
    minEvictableIdleTimeMillis: {
        name: 'Min Evictable Idle Time Millis',
        type: 'text',
        validate: {
            type: 'number',
        },
    },
    accessToUnderlyingConnectionAllowed: {
        name: 'Access To Underlying Connection Allowed',
        type: 'checkbox',
    },
    removeAbandoned: {
        name: 'Remove Abandoned',
        type: 'checkbox',
    },
    removeAbandonedTimeout: {
        name: 'Remove Abandoned Timeout',
        type: 'text',
        validate: {
            type: 'number',
        },
    },
    logAbandoned: {
        name: 'Log Abandoned',
        type: 'checkbox',
    },
    connectionProperties: {
        name: 'Connection Properties',
        type: 'text',
    },
    initSQL: {
        name: 'Init SQL',
        type: 'text',
    },
    jdbcInterceptors: {
        name: 'JDBC Interceptors',
        type: 'text',
    },
    validationInterval: {
        name: 'Validation Interval',
        type: 'text',
        validate: {
            type: 'number',
        },
    },
    jmxEnabled: {
        name: 'JMX Enabled',
        type: 'checkbox',
    },
    fairQueue: {
        name: 'Fair Queue',
        type: 'checkbox',
    },
    abandonWhenPercentageFull: {
        name: 'Abandon When Percentage Full',
        type: 'text',
        validate: {
            type: 'number',
        },
    },
    maxAge: {
        name: 'Max Age',
        type: 'text',
        validate: {
            type: 'number',
        },
    },
    useEquals: {
        name: 'Use Equals',
        type: 'checkbox',
    },
    suspectTimeout: {
        name: 'Suspect Timeout',
        type: 'text',
        validate: {
            type: 'number',
        },
    },
    alternateUsernameAllowed: {
        name: 'Alternate Username Allowed',
        type: 'checkbox',
    },
    validationQueryTimeout: {
        name: 'Validation Query Timeout',
        type: 'text',
        validate: {
            type: 'number',
        },
    },
};
