/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

/**
 * Synapse Async Processing Reference: Message Stores, Message Processors,
 * the <store> mediator, and common DLQ / retry / guaranteed-delivery patterns.
 *
 * Documents only the XML shape and fully-qualified class names the agent would
 * otherwise hallucinate. Assumes common Synapse knowledge for the rest.
 */

export const SYNAPSE_ASYNC_REFERENCE_SECTIONS: Record<string, string> = {

overview: `## Async Processing: Stores + Processors + Store Mediator

The async pipeline in Synapse has three parts that must line up by name:
1. **Message Store** (\`<messageStore>\`) — durable queue. Identified by its \`name\`.
2. **Store Mediator** (\`<store messageStore="..."/>\`) — places the current message into the named store and **ends mediation for the current flow** (no \`<send>\`/\`<respond>\` runs after).
3. **Message Processor** (\`<messageProcessor>\`) — consumes from the store on a schedule and either injects into a sequence (sampling) or forwards to an endpoint (scheduled forwarding).

### Path layout
- \`src/main/wso2mi/artifacts/message-stores/<Name>.xml\` — \`artifact.xml\` type \`synapse/message-store\`
- \`src/main/wso2mi/artifacts/message-processors/<Name>.xml\` — \`artifact.xml\` type \`synapse/message-processor\`

### Naming invariant
\`<store messageStore="X"/>\` → \`<messageStore name="X" ...>\` → \`<messageProcessor ...><parameter name="message.store">X</parameter>...</messageProcessor>\`
If these three names don't match exactly, messages are silently lost or accumulate unprocessed.`,

message_stores: `## Message Stores

### In-Memory (non-persistent, single-node only)
\`\`\`xml
<messageStore xmlns="http://ws.apache.org/ns/synapse"
              name="OrdersInMem"
              class="org.apache.synapse.message.store.impl.memory.InMemoryStore"/>
\`\`\`
No parameters. Lost on restart. Use for tests and low-value sampling only.

### JMS (ActiveMQ, IBM MQ, WebLogic JMS, etc.)
\`\`\`xml
<messageStore name="OrdersJMS"
              class="org.apache.synapse.message.store.impl.jms.JmsStore">
  <parameter name="java.naming.factory.initial">org.apache.activemq.jndi.ActiveMQInitialContextFactory</parameter>
  <parameter name="java.naming.provider.url">tcp://localhost:61616</parameter>
  <parameter name="store.jms.connection.factory">QueueConnectionFactory</parameter>
  <parameter name="store.jms.destination">OrdersQueue</parameter>
  <parameter name="store.jms.username">admin</parameter>
  <parameter name="store.jms.password">admin</parameter>
  <parameter name="store.jms.JMSSpecVersion">1.1</parameter>
  <parameter name="store.jms.cache.connection">true</parameter>
  <parameter name="store.producer.guaranteed.delivery.enable">true</parameter>
</messageStore>
\`\`\`

### RabbitMQ
\`\`\`xml
<messageStore name="OrdersRabbit"
              class="org.apache.synapse.message.store.impl.rabbitmq.RabbitMQStore">
  <parameter name="store.rabbitmq.host.name">rabbit.example.com</parameter>
  <parameter name="store.rabbitmq.host.port">5672</parameter>
  <parameter name="store.rabbitmq.username">guest</parameter>
  <parameter name="store.rabbitmq.password">guest</parameter>
  <parameter name="store.rabbitmq.virtual.host">/</parameter>
  <parameter name="store.rabbitmq.queue.name">orders</parameter>
  <parameter name="store.rabbitmq.exchange.name">orders_exchange</parameter>
  <parameter name="store.rabbitmq.route.key">orders</parameter>
  <parameter name="rabbitmq.connection.retry.count">5</parameter>
  <parameter name="rabbitmq.connection.retry.interval">2000</parameter>
  <parameter name="store.producer.guaranteed.delivery.enable">true</parameter>
</messageStore>
\`\`\`

### JDBC
\`\`\`xml
<messageStore name="OrdersJDBC"
              class="org.apache.synapse.message.store.impl.jdbc.JDBCMessageStore">
  <parameter name="store.jdbc.driver">com.mysql.cj.jdbc.Driver</parameter>
  <parameter name="store.jdbc.connection.url">jdbc:mysql://localhost:3306/mi</parameter>
  <parameter name="store.jdbc.username">mi</parameter>
  <parameter name="store.jdbc.password">mi</parameter>
  <parameter name="store.jdbc.table">MI_MSG_STORE</parameter>
</messageStore>
\`\`\`
The target table is auto-created by the runtime if missing.

### WSO2MB (deprecated — avoid for new work)
Class \`org.apache.synapse.message.store.impl.wso2mb.WSO2MBStore\`. Keep if already in use; migrate to JMS/RabbitMQ otherwise.

### Resequence
Class \`org.apache.synapse.message.store.impl.resequence.ResequenceMessageStore\`. Specialized: reorders messages by a sequence id before the processor dequeues. Uses JDBC under the hood; takes the JDBC parameters plus \`store.resequence.timeout\`.`,

message_processors: `## Message Processors

### Sampling Processor — inject into a sequence at interval
Use when messages are produced and consumed at the same speed (sampling, metric fanout, async side-effects). The processor dequeues at \`interval\` ms and injects the message into \`message.processor.sequence\`.

\`\`\`xml
<messageProcessor xmlns="http://ws.apache.org/ns/synapse"
                  name="OrdersSampler"
                  class="org.apache.synapse.message.processor.impl.sampler.SamplingProcessor"
                  messageStore="OrdersJMS"
                  targetEndpoint="">
  <parameter name="interval">1000</parameter>
  <parameter name="concurrency">1</parameter>
  <parameter name="sequence">ProcessOrderSeq</parameter>
  <parameter name="is.active">true</parameter>
</messageProcessor>
\`\`\`
\`targetEndpoint\` is ignored for sampling — leave empty.

### Scheduled Message-Forwarding Processor — forward to an endpoint with retry
Use for **guaranteed delivery**: persist first, deliver with retry, land failures in a DLQ. The processor dequeues and \`<send>\`s to \`message.processor.target.endpoint\` (must be a named endpoint).

\`\`\`xml
<messageProcessor name="OrdersForwarder"
                  class="org.apache.synapse.message.processor.impl.forwarder.ScheduledMessageForwardingProcessor"
                  messageStore="OrdersJMS"
                  targetEndpoint="OrdersBackendEP">
  <parameter name="interval">2000</parameter>
  <parameter name="client.retry.interval">1000</parameter>
  <parameter name="max.delivery.attempts">5</parameter>
  <parameter name="max.delivery.drop">Disabled</parameter>           <!-- Enabled = drop after max attempts -->
  <parameter name="message.processor.reply.sequence">OrdersReplySeq</parameter>
  <parameter name="message.processor.fault.sequence">OrdersForwardFault</parameter>
  <parameter name="message.processor.deactivate.sequence">OrdersDeactivated</parameter>
  <parameter name="store.connection.retry.interval">1000</parameter>
  <parameter name="is.active">true</parameter>
</messageProcessor>
\`\`\`

### Common processor parameters (\`ScheduledMessageProcessor\` inheritance)
| Parameter | Purpose |
|-----------|---------|
| \`interval\` | ms between scheduled runs |
| \`cronExpression\` | Alternative to \`interval\` — Quartz cron |
| \`is.active\` | Start in active state (\`true\`/\`false\`) |
| \`concurrency\` | Messages per scheduled run |
| \`max.store.connection.attempts\` / \`store.connection.retry.interval\` | Store-level retry on broker outage |
| \`member.count\` | For clustered processors — controls how many nodes poll |

### Pitfalls
- The processor's \`messageStore="..."\` **attribute** must match a deployed \`<messageStore name="...">\`. Misspelling leads to "Message store not found" at startup but the artifact still deploys.
- \`max.delivery.drop="Disabled"\` keeps failed messages stuck in the store forever — pair with a fault sequence that moves them to a DLQ store (see dlq_pattern).
- \`is.active=false\` is the correct way to disable a processor; commenting out the XML requires redeployment.`,

store_mediator: `## Store Mediator (\`<store>\`) — Terminal Mediator

\`\`\`xml
<!-- 'sequence' is optional; when set it runs in-flight before the store write. -->
<store messageStore="OrdersJMS" sequence="PostStoreSeq"/>
\`\`\`

### Behavior
- Places the **current message** (envelope + headers + properties) into the named store.
- Returns a response to the client (for synchronous transports) before the processor runs.
- **Ends mediation for the current flow** — mediators after \`<store>\` are NOT executed unless you also specify \`sequence="..."\`, which is run in-flight *before* the store write.
- The stored message can be dequeued later by a message processor.

### Common usage
\`\`\`xml
<resource methods="POST" uri-template="/orders">
  <inSequence>
    <!-- validate -->
    <property name="HTTP_SC" value="202" scope="axis2"/>
    <payloadFactory media-type="json">
      <format>{"status": "accepted", "id": "$1"}</format>
      <args><arg expression="$ctx:payload.id" evaluator="json"/></args>
    </payloadFactory>
    <!-- <store> enqueues the current message AND returns the 202 response. -->
    <!-- It is terminal — do NOT add <respond/> after it (and don't put <respond/>
         before it, or the store write would never happen). -->
    <store messageStore="OrdersJMS"/>
  </inSequence>
</resource>
\`\`\`

### Anti-pattern
\`\`\`xml
<!-- WRONG: <respond/> is terminal, so the store line never runs and the
     message is never queued. Drop the <respond/>; <store> already returns
     the response to the client. -->
<respond/>
<store messageStore="OrdersJMS"/>

<!-- WRONG: <store> is also terminal, so <respond/> after it never runs. -->
<store messageStore="OrdersJMS"/>
<respond/>
\`\`\``,

dlq_pattern: `## Dead-Letter Queue Pattern

Two stores + two processors. Failed messages land in \`DeadLetterStore\` via the forwarder's fault sequence.

\`\`\`xml
<!-- Primary store + forwarder -->
<messageStore name="OrdersStore" class="...jms.JmsStore">...</messageStore>
<messageStore name="DeadLetterStore" class="...jms.JmsStore">...</messageStore>

<messageProcessor name="OrdersForwarder"
                  class="...ScheduledMessageForwardingProcessor"
                  messageStore="OrdersStore"
                  targetEndpoint="OrdersBackendEP">
  <parameter name="interval">2000</parameter>
  <parameter name="max.delivery.attempts">3</parameter>
  <parameter name="max.delivery.drop">Disabled</parameter>
  <parameter name="message.processor.fault.sequence">DLQRoutingSeq</parameter>
</messageProcessor>

<!-- Fault sequence: move to DLQ -->
<sequence name="DLQRoutingSeq">
  <log level="custom" category="WARN">
    <property name="DLQ" expression="\${props.synapse.ERROR_MESSAGE}"/>
  </log>
  <store messageStore="DeadLetterStore"/>
</sequence>

<!-- Optional: DLQ drain/alert processor (sampling-only) -->
<messageProcessor name="DLQAlerter"
                  class="...SamplingProcessor"
                  messageStore="DeadLetterStore">
  <parameter name="interval">60000</parameter>
  <parameter name="sequence">AlertOpsSeq</parameter>
  <parameter name="is.active">true</parameter>
</messageProcessor>
\`\`\`

### Why this shape works
- Forwarder's \`max.delivery.attempts\` bounds the retry budget.
- On exhaustion it invokes \`message.processor.fault.sequence\`, which uses \`<store>\` to move the message into the DLQ store — \`<store>\` preserves the original envelope.
- A sampling processor on the DLQ store surfaces failures (alerts, ticketing) without autonomously redelivering — manual intervention is the usual answer for a DLQ.`,

};

export const SYNAPSE_ASYNC_REFERENCE_FULL =
    `# WSO2 MI Async Processing Reference\n\n` +
    Object.values(SYNAPSE_ASYNC_REFERENCE_SECTIONS).join('\n\n---\n\n');
