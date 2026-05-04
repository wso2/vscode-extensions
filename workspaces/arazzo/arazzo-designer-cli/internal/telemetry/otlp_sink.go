package telemetry

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"
)

// OTLPSink sends completed spans to an OTLP/HTTP JSON endpoint
// (e.g. Jaeger at http://localhost:4318, Honeycomb, Datadog, etc).
//
// Only lifecycle=end events are forwarded because OTLP represents a span as a
// single complete record, not as start/end pairs like our streaming model does.
type OTLPSink struct {
	endpoint string // base URL only, e.g. "http://localhost:4318"
	client   *http.Client
	queue    chan TraceEvent
	done     chan struct{}
	wg       sync.WaitGroup
}

// NewOTLPSink creates an OTLPSink that posts OTLP/HTTP JSON to the given base URL.
// Spans are posted to {endpoint}/v1/traces. The endpoint may optionally include
// the path — it will be stripped to avoid doubling.
func NewOTLPSink(endpoint string) *OTLPSink {
	// Be defensive: strip the path if the user accidentally includes it.
	endpoint = strings.TrimSuffix(endpoint, "/v1/traces")
	endpoint = strings.TrimSuffix(endpoint, "/")
	s := &OTLPSink{
		endpoint: endpoint,
		client:   &http.Client{Timeout: 5 * time.Second},
		queue:    make(chan TraceEvent, queueSize),
		done:     make(chan struct{}),
	}
	s.wg.Add(1)
	go s.worker()
	return s
}

// Send enqueues a trace event. Only end events are forwarded to OTLP.
func (s *OTLPSink) Send(event TraceEvent) {
	if event.Lifecycle != LifecycleEnd {
		return
	}
	select {
	case s.queue <- event:
	default:
		log.Printf("[otlp] Event queue full, dropping span: %s", event.Name)
	}
}

// Shutdown signals the worker to stop and waits for it to drain.
func (s *OTLPSink) Shutdown() {
	close(s.done)
	s.wg.Wait()
}

func (s *OTLPSink) worker() {
	defer s.wg.Done()
	for {
		select {
		case ev := <-s.queue:
			s.post(ev)
		case <-s.done:
			for {
				select {
				case ev := <-s.queue:
					s.post(ev)
				default:
					return
				}
			}
		}
	}
}

func (s *OTLPSink) post(event TraceEvent) {
	payload := toOTLPPayload(event)
	body, err := json.Marshal(payload)
	if err != nil {
		log.Printf("[otlp] Failed to marshal payload: %v", err)
		return
	}

	resp, err := s.client.Post(s.endpoint+"/v1/traces", "application/json", bytes.NewReader(body))
	if err != nil {
		log.Printf("[otlp] Failed to post span %q: %v", event.Name, err)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		log.Printf("[otlp] Endpoint returned %d for span %q", resp.StatusCode, event.Name)
	}
}

// --- OTLP JSON types ---
// These match the protobuf JSON encoding of opentelemetry-proto/trace/v1/trace.proto.

type otlpPayload struct {
	ResourceSpans []otlpResourceSpan `json:"resourceSpans"`
}

type otlpResourceSpan struct {
	Resource   otlpResource    `json:"resource"`
	ScopeSpans []otlpScopeSpan `json:"scopeSpans"`
}

type otlpResource struct {
	Attributes []otlpKV `json:"attributes"`
}

type otlpScopeSpan struct {
	Scope otlpInstrumentationScope `json:"scope"`
	Spans []otlpSpan               `json:"spans"`
}

type otlpInstrumentationScope struct {
	Name    string `json:"name"`
	Version string `json:"version,omitempty"`
}

type otlpSpan struct {
	TraceID           string     `json:"traceId"`
	SpanID            string     `json:"spanId"`
	ParentSpanID      string     `json:"parentSpanId,omitempty"`
	Name              string     `json:"name"`
	Kind              int        `json:"kind"`
	StartTimeUnixNano string     `json:"startTimeUnixNano"`
	EndTimeUnixNano   string     `json:"endTimeUnixNano"`
	Attributes        []otlpKV   `json:"attributes"`
	Status            otlpStatus `json:"status"`
}

type otlpStatus struct {
	Code    int    `json:"code"`
	Message string `json:"message,omitempty"`
}

type otlpKV struct {
	Key   string    `json:"key"`
	Value otlpValue `json:"value"`
}

type otlpValue struct {
	StringValue string `json:"stringValue"`
}

// toOTLPPayload converts one of our TraceEvent (end lifecycle) into an OTLP payload.
func toOTLPPayload(event TraceEvent) otlpPayload {
	// OTel span kind integers (from SpanKind enum in trace.proto)
	kind := 1 // SPAN_KIND_INTERNAL
	if event.Kind == OTelSpanKindClient {
		kind = 3 // SPAN_KIND_CLIENT
	}

	// OTel status code integers (from Status.StatusCode enum)
	statusCode := 0 // STATUS_CODE_UNSET
	switch event.StatusCode {
	case SpanStatusOK:
		statusCode = 1
	case SpanStatusError:
		statusCode = 2
	}

	// Times as nanoseconds-since-epoch strings (OTLP fixed64 → JSON string)
	startNano := fmt.Sprintf("%d", event.StartTime.UnixNano())
	endNano := startNano
	if event.EndTime != nil {
		endNano = fmt.Sprintf("%d", event.EndTime.UnixNano())
	}

	// Attributes: convert map → OTLP key-value list and add arazzo_span_kind
	attrs := make([]otlpKV, 0, len(event.Attributes)+1)
	for k, v := range event.Attributes {
		attrs = append(attrs, otlpKV{Key: k, Value: otlpValue{StringValue: v}})
	}
	attrs = append(attrs, otlpKV{
		Key:   "arazzo.span_kind",
		Value: otlpValue{StringValue: string(event.ArazzoKind)},
	})

	span := otlpSpan{
		// OTLP JSON spec overrides proto-JSON for IDs: use lowercase hex strings.
		TraceID:           event.Context.TraceID,
		SpanID:            event.Context.SpanID,
		ParentSpanID:      event.ParentID,
		Name:              event.Name,
		Kind:              kind,
		StartTimeUnixNano: startNano,
		EndTimeUnixNano:   endNano,
		Attributes:        attrs,
		Status:            otlpStatus{Code: statusCode, Message: event.StatusMessage},
	}

	return otlpPayload{
		ResourceSpans: []otlpResourceSpan{{
			Resource: otlpResource{
				Attributes: []otlpKV{
					{Key: "service.name", Value: otlpValue{StringValue: "arazzo-runner"}},
				},
			},
			ScopeSpans: []otlpScopeSpan{{
				Scope: otlpInstrumentationScope{Name: "arazzo-runner"},
				Spans: []otlpSpan{span},
			}},
		}},
	}
}
