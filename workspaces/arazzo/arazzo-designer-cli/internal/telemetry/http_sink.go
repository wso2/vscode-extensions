package telemetry

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"sync"
	"sync/atomic"
	"time"
)

const (
	// queueSize is the buffered channel capacity.
	queueSize = 256
	// httpTimeout for posting events to the tracer server.
	httpTimeout = 2 * time.Second
)

// HTTPSink posts trace events to a local tracer server endpoint.
// It runs a background goroutine that drains a buffered channel and delivers
// events one at a time via HTTP POST. If the channel fills, events are dropped.
type HTTPSink struct {
	endpoint string
	client   *http.Client
	queue    chan TraceEvent
	done     chan struct{}
	wg       sync.WaitGroup
	dropped  atomic.Int64
}

// NewHTTPSink creates an HTTPSink that posts JSON events to the given endpoint.
// Call Shutdown() when done to flush remaining events.
func NewHTTPSink(endpoint string) *HTTPSink {
	s := &HTTPSink{
		endpoint: endpoint,
		client: &http.Client{
			Timeout: httpTimeout,
		},
		queue: make(chan TraceEvent, queueSize),
		done:  make(chan struct{}),
	}
	s.wg.Add(1)
	go s.worker()
	return s
}

// Send enqueues a trace event. Non-blocking — drops if the queue is full.
func (s *HTTPSink) Send(event TraceEvent) {
	select {
	case s.queue <- event:
	default:
		d := s.dropped.Add(1)
		if d%10 == 1 {
			log.Printf("[telemetry] Event queue full, dropped %d event(s) so far", d)
		}
	}
}

// Shutdown signals the worker to stop and waits for it to drain.
func (s *HTTPSink) Shutdown() {
	close(s.done)
	s.wg.Wait()
	if d := s.dropped.Load(); d > 0 {
		log.Printf("[telemetry] Total events dropped during session: %d", d)
	}
}

// worker drains the queue and posts events until Shutdown is called.
func (s *HTTPSink) worker() {
	defer s.wg.Done()
	for {
		select {
		case ev := <-s.queue:
			s.post(ev)
		case <-s.done:
			// Drain remaining events in the queue
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

// post sends one event to the tracer server. Errors are logged but never
// propagated — tracing failures must not affect workflow execution.
func (s *HTTPSink) post(event TraceEvent) {
	body, err := json.Marshal(event)
	if err != nil {
		log.Printf("[telemetry] Failed to marshal event: %v", err)
		return
	}

	resp, err := s.client.Post(s.endpoint, "application/json", bytes.NewReader(body))
	if err != nil {
		log.Printf("[telemetry] Failed to post event: %v", err)
		return
	}
	resp.Body.Close()

	if resp.StatusCode >= 400 {
		log.Printf("[telemetry] Tracer server returned %d for span %s", resp.StatusCode, event.Context.SpanID)
	}
}

// --- ID generation ---

// GenerateTraceID produces a 32-hex-char trace ID (128 bits).
func GenerateTraceID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return fmt.Sprintf("%x", b)
}

// GenerateSpanID produces a 16-hex-char span ID (64 bits).
func GenerateSpanID() string {
	b := make([]byte, 8)
	rand.Read(b)
	return fmt.Sprintf("%x", b)
}
