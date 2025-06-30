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

import styled from "@emotion/styled";
import { Transition } from "@headlessui/react";
import { Codicon, Card, Typography, LinkButton, Divider } from "@wso2/ui-toolkit";
import { css } from "@emotion/css";
import React from "react";

const PanelViewMore = styled.div({
    display: "flex",
    flexDirection: "column",
    gap: 10,
});

const HorizontalCardContainer = styled.div({
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gridAutoRows: "minmax(80px, auto)",
    gap: "20px",
});

const PanelFooter = styled.div({
    display: "flex",
    justifyContent: "center",
});

const transitionEffect = {
    enter: css({
        transition: "opacity 75ms ease-out",
    }),
    enterFrom: css({
        opacity: 0,
    }),
    enterTo: css({
        opacity: 1,
    }),
    leave: css({
        transition: "opacity 150ms ease-in",
    }),
    leaveFrom: css({
        opacity: 1,
    }),
    leaveTo: css({
        opacity: 0,
    }),
};

interface CardData {
    title: string;
    icon: string;
    description: string;
}

interface CardWrapperType {
    basic: CardData[];
    advanced?: CardData[];
}

const CARD_WRAPPER_DATA: { [key: string]: CardWrapperType } = {
    MESSAGE_PROCESSOR: {
        basic: [
            {
                title: 'Message Sampling Processor',
                icon: 'message-sampling-processor',
                description: 'Sample messages for processing',
            },
            {
                title: 'Scheduled Message Forwarding Processor',
                icon: 'scheduled-message-forwarding-processor',
                description: 'Forwards messages on a schedule',
            },
            {
                title: 'Scheduled Failover Message Forwarding Processor',
                icon: 'scheduled-failover-message-forwarding-processor',
                description: 'Handle failover scenarios',
            },
            {
                title: 'Custom Message Processor',
                icon: 'custom-message-processor',
                description: 'Configure a custom message processor',
            }
        ]
    },
    ENDPOINT: {
        basic: [
            {
                title: 'HTTP Endpoint',
                icon: 'http-endpoint',
                description: 'HTTP connection endpoint',
            },
            {
                title: 'Load Balance Endpoint',
                icon: 'load-balance-endpoint',
                description: 'Distributes load among multiple endpoints',
            },
            {
                title: 'Failover Endpoint',
                icon: 'failover-endpoint',
                description: 'Backup endpoint on failure',
            }
        ],
        advanced: [
            {
                title: 'Address Endpoint',
                icon: 'address-endpoint',
                description: 'Direct address connection',
            },
            {
                title: 'Default Endpoint',
                icon: 'default-endpoint',
                description: 'Fallback endpoint',
            },
            {
                title: 'Recipient List Endpoint',
                icon: 'recipient-list-endpoint',
                description: 'Routes messages to multiple destinations',
            },
            {
                title: 'Template Endpoint',
                icon: 'template-endpoint',
                description: 'Reusable endpoint template',
            },
            {
                title: 'WSDL Endpoint',
                icon: 'wsdl-endpoint',
                description: 'Endpoint defined in a WSDL file',
            }
        ]
    },
    TEMPLATE: {
        basic: [
            {
                title: 'Address Endpoint Template',
                icon: 'address-endpoint-template',
                description: 'Specifies a communication URL',
            },
            {
                title: 'Default Endpoint Template',
                icon: 'default-endpoint-template',
                description: 'Adds QoS to the To address',
            },
            {
                title: 'HTTP Endpoint Template',
                icon: 'http-endpoint-template',
                description: 'Defines REST endpoints',
            },
            {
                title: 'WSDL Endpoint Template',
                icon: 'wsdl-endpoint-template',
                description: 'Connects to WSDL definitions',
            },
            {
                title: 'Sequence Template',
                icon: 'sequence-template',
                description: 'Sequential processing specification',
            },
        ]
    },
    LOCAL_ENTRY: {
        basic: [
            {
                title: 'In-Line Text Entry',
                icon: 'in-line-text-entry',
                description: 'Stores text content',
            },
            {
                title: 'In-Line XML Entry',
                icon: 'in-line-xml-entry',
                description: 'Stores XML content',
            },
            {
                title: 'Source URL Entry',
                icon: 'source-url-entry',
                description: 'Stores a URL reference',
            }
        ]
    },
    MESSAGE_STORE: {
        basic: [
            {
                title: 'In Memory Message Store',
                icon: 'in-memory-message-store',
                description: 'Temporarily holds messages in memory',
            },
            {
                title: 'RabbitMQ Message Store',
                icon: 'rabbitMQ-message-store',
                description: 'Utilizes RabbitMQ for message storage',
            },
            {
                title: 'JMS Message Store',
                icon: 'jms-message-store',
                description: 'Stores messages for Java Message Service (JMS) communication.',
            },
            {
                title: 'JDBC Message Store',
                icon: 'jdbc-message-store',
                description: 'Persists messages using a JDBC database',
            },
            {
                title: 'Custom Message Store',
                icon: 'custom-message-store',
                description: 'Allows custom implementations for specific requirements',
            },
            {
                title: 'Resequence Message Store',
                icon: 'resequence-message-store',
                description: 'Reorders messages based on specified criteria',
            },
            {
                title: 'WSO2 MB Message Store',
                icon: 'wso2-mb-message-store',
                description: 'Integrates with WSO2 Message Broker',
            }
        ]
    },
};

type CardWrapperProps = {
    cardsType: keyof typeof CARD_WRAPPER_DATA;
    setType: (type: string) => void;
}

const CardWrapper = (props: CardWrapperProps) => {

    const [viewMore, setViewMore] = React.useState<boolean>(false);

    return (
        <>
            <HorizontalCardContainer>
                {CARD_WRAPPER_DATA[props.cardsType].basic.map((card, index) => (
                    <Card
                        key={index}
                        icon={card.icon}
                        title={card.title}
                        description={card.description}
                        onClick={() => props.setType(card.title)}
                    />
                ))}
            </HorizontalCardContainer>
            {Object.keys(CARD_WRAPPER_DATA[props.cardsType]).length > 1 && 'advanced' in CARD_WRAPPER_DATA[props.cardsType] &&
                <>
                    <Transition
                        show={viewMore}
                        {...transitionEffect}
                    >
                        <PanelViewMore>
                            <Divider/>
                            <Typography variant="h3" sx={{margin: 0}}>
                                Advanced
                            </Typography>
                            <HorizontalCardContainer>
                                {CARD_WRAPPER_DATA[props.cardsType]?.advanced?.map((card, index) => (
                                    <Card
                                        key={index}
                                        icon={card.icon}
                                        title={card.title}
                                        description={card.description}
                                        onClick={() => props.setType(card.title)}
                                    />
                                ))}
                            </HorizontalCardContainer>
                        </PanelViewMore>
                    </Transition>
                    <PanelFooter>
                        {!viewMore ? (
                            <LinkButton sx={{padding: "4px 8px"}} onClick={() => setViewMore(true)}>
                                <Codicon name="plus"/>
                                <Typography variant="body2">View More</Typography>
                            </LinkButton>
                        ) : (
                            <LinkButton sx={{padding: "4px 8px"}} onClick={() => setViewMore(false)}>
                                <Typography variant="body2">Show Less</Typography>
                            </LinkButton>
                        )}
                    </PanelFooter>
                </>
            }
        </>
    )
}

export default CardWrapper;
