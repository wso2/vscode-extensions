// Package telemetry defines the trace event model and interfaces for the
// Arazzo workflow runner's OpenTelemetry-based tracing bridge.
//
// Phase 1 uses a lightweight JSON event model posted to a local tracer server.
// The event shape follows the OpenTelemetry span structure (see
// https://opentelemetry.io/docs/concepts/signals/traces/) with two custom
// extensions:
//   - "lifecycle" (start|end) — enables real-time streaming to the UI before
//     a span completes, which standard OTel does not support.
//   - "arazzo_span_kind" — classifies spans by Arazzo concept (workflow/step/http)
//     in addition to the standard OTel "kind" field.
package telemetry

import "time"

// SpanKind classifies the Arazzo-specific type of span (custom extension).
type SpanKind string

const (
	SpanKindWorkflow SpanKind = "workflow"
	SpanKindStep     SpanKind = "step"
	SpanKindHTTP     SpanKind = "http"
	SpanKindRetry    SpanKind = "retry"
)

// OTelSpanKind is the standard OpenTelemetry span kind value.
type OTelSpanKind string

const (
	// OTelSpanKindInternal represents operations within a single process (workflow/step spans).
	OTelSpanKindInternal OTelSpanKind = "SPAN_KIND_INTERNAL"
	// OTelSpanKindClient represents outgoing synchronous remote calls (HTTP spans).
	OTelSpanKindClient OTelSpanKind = "SPAN_KIND_CLIENT"
)

// Lifecycle indicates whether this event marks the start or end of a span.
// This is a custom extension — standard OTel emits complete spans on end only.
type Lifecycle string

const (
	LifecycleStart Lifecycle = "start"
	LifecycleEnd   Lifecycle = "end"
)

// SpanStatus represents the outcome of a span, using OTel status code strings.
type SpanStatus string

const (
	SpanStatusUnset SpanStatus = "STATUS_CODE_UNSET"
	SpanStatusOK    SpanStatus = "STATUS_CODE_OK"
	SpanStatusError SpanStatus = "STATUS_CODE_ERROR"
)

// SpanContext holds the OTel trace and span identifiers, matching the standard
// "context" sub-object in the OTel span JSON representation.
type SpanContext struct {
	TraceID string `json:"trace_id"`
	SpanID  string `json:"span_id"`
}

// TraceEvent is the normalized event shape sent from the Go runner to the
// TypeScript tracer server. It follows the OTel span structure with two custom
// extensions: "lifecycle" and "arazzo_span_kind". It carries only metadata —
// never raw request bodies, auth tokens, or secret values.
type TraceEvent struct {
	// OTel standard fields
	Name          string            `json:"name"`
	Context       SpanContext       `json:"context"`
	ParentID      string            `json:"parent_id,omitempty"`
	Kind          OTelSpanKind      `json:"kind"`
	StartTime     time.Time         `json:"start_time"`
	EndTime       *time.Time        `json:"end_time,omitempty"`
	StatusCode    SpanStatus        `json:"status_code"`
	StatusMessage string            `json:"status_message,omitempty"`
	Attributes    map[string]string `json:"attributes"`

	// Custom extensions
	Lifecycle  Lifecycle `json:"lifecycle"`
	ArazzoKind SpanKind  `json:"arazzo_span_kind"`
	DurationMs *float64  `json:"duration_ms,omitempty"`
}

// SpanEventSink is the contract for anything that can receive trace events.
// The runner depends on this interface, not on the HTTP delivery mechanism.
// This allows swapping the sink (e.g. local HTTP, OTLP, or a no-op) without
// changing any runner code.
type SpanEventSink interface {
	// Send enqueues a trace event for delivery. Implementations must not
	// block — if the delivery channel is full, they should drop the event
	// and increment a counter. Errors in delivery must never fail a workflow.
	Send(event TraceEvent)

	// Shutdown flushes any buffered events and releases resources.
	// It should be called when the MCP server is shutting down.
	Shutdown()
}

// NoopSink is a sink that silently discards all events.
// Used when tracing is disabled (no --trace-endpoint provided).
type NoopSink struct{}

func (n *NoopSink) Send(event TraceEvent) {}
func (n *NoopSink) Shutdown()             {}
