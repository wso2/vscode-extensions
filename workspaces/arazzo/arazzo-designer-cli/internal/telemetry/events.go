// Package telemetry defines the trace event model and interfaces for the
// Arazzo workflow runner's OpenTelemetry-based tracing bridge.
//
// Phase 1 uses a lightweight JSON event model posted to a local tracer server.
// The event shape is shared between the Go runner (producer) and the
// TypeScript extension (consumer) via matching interface definitions.
package telemetry

import "time"

// SpanKind classifies the type of span.
type SpanKind string

const (
	SpanKindWorkflow SpanKind = "workflow"
	SpanKindStep     SpanKind = "step"
	SpanKindHTTP     SpanKind = "http"
)

// Lifecycle indicates whether this event marks the start or end of a span.
type Lifecycle string

const (
	LifecycleStart Lifecycle = "start"
	LifecycleEnd   Lifecycle = "end"
)

// SpanStatus represents the outcome of a span.
type SpanStatus string

const (
	SpanStatusUnset SpanStatus = "unset"
	SpanStatusOK    SpanStatus = "ok"
	SpanStatusError SpanStatus = "error"
)

// TraceEvent is the normalized event shape sent from the Go runner to the
// TypeScript tracer server. It carries only metadata — never raw request
// bodies, auth tokens, or secret values.
type TraceEvent struct {
	Lifecycle    Lifecycle         `json:"lifecycle"`
	TraceID      string            `json:"traceId"`
	SpanID       string            `json:"spanId"`
	ParentSpanID string            `json:"parentSpanId,omitempty"`
	SpanName     string            `json:"spanName"`
	SpanKind     SpanKind          `json:"spanKind"`
	Timestamp    time.Time         `json:"timestamp"`
	DurationMs   *float64          `json:"durationMs,omitempty"`
	Status       SpanStatus        `json:"status"`
	ErrorMessage string            `json:"errorMessage,omitempty"`
	Attributes   map[string]string `json:"attributes"`
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
