package telemetry

// MultiSink fans out Send and Shutdown calls to multiple SpanEventSink implementations.
// This allows the CLI to simultaneously stream to the VS Code local tracer server
// (HTTPSink) and an external OTLP backend (OTLPSink).
type MultiSink struct {
	sinks []SpanEventSink
}

// NewMultiSink creates a MultiSink that fans out to all provided sinks.
func NewMultiSink(sinks ...SpanEventSink) *MultiSink {
	return &MultiSink{sinks: sinks}
}

func (m *MultiSink) Send(event TraceEvent) {
	for _, s := range m.sinks {
		s.Send(event)
	}
}

func (m *MultiSink) Shutdown() {
	for _, s := range m.sinks {
		s.Shutdown()
	}
}
