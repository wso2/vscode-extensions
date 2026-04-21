/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
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
 * Mirrors the Go telemetry.TraceEvent struct. The Go runner POSTs these
 * JSON events to the tracer server during workflow execution.
 *
 * Field names follow the OpenTelemetry span standard:
 * https://opentelemetry.io/docs/concepts/signals/traces/
 * Custom extensions: `lifecycle` (streaming) and `arazzo_span_kind` (routing).
 */

export type SpanKind = 'workflow' | 'step' | 'http';
export type OTelSpanKind = 'SPAN_KIND_INTERNAL' | 'SPAN_KIND_CLIENT';
export type Lifecycle = 'start' | 'end';
export type SpanStatus = 'STATUS_CODE_UNSET' | 'STATUS_CODE_OK' | 'STATUS_CODE_ERROR';

export interface SpanContext {
    trace_id: string;
    span_id: string;
}

export interface TraceEvent {
    // OTel standard fields
    name: string;
    context: SpanContext;
    parent_id?: string;
    kind: OTelSpanKind;
    start_time: string;         // ISO-8601
    end_time?: string;          // ISO-8601
    status_code: SpanStatus;
    status_message?: string;
    attributes: Record<string, string>;
    // Custom streaming extension
    lifecycle: Lifecycle;
    // Custom Arazzo span classification
    arazzo_span_kind: SpanKind;
    duration_ms?: number;
}
