package contact

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/alcash55/Portfolio/pkg/config"
	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// newTestRouter wires the handler under test into a real gin router (not a
// bare gin.Context), matching how it runs in production, and points cfg at
// webhookURL.
func newTestRouter(webhookURL string) *gin.Engine {
	cfg := config.Config{WebhookURL: webhookURL}
	h := New(cfg)

	r := gin.New()
	r.POST("/api/v1/contact", h.SendMessage)
	return r
}

func postJSON(t *testing.T, router *gin.Engine, body []byte) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/contact", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	return rec
}

func validMessage() message {
	return message{Name: "Ada Lovelace", Email: "ada@example.com", Message: "Hello from the contact form."}
}

// TestSendMessage_Success drives a full valid submission through a fake
// Discord webhook and inspects exactly what the webhook received, because
// that payload shape is the actual contract this handler exists to enforce.
func TestSendMessage_Success(t *testing.T) {
	var captured discordPayload
	var rawBody []byte
	webhook := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var err error
		rawBody, err = io.ReadAll(r.Body)
		if err != nil {
			t.Fatalf("fake webhook: reading request body: %v", err)
		}
		if err := json.Unmarshal(rawBody, &captured); err != nil {
			t.Fatalf("fake webhook: request body is not valid JSON: %v\nbody: %s", err, rawBody)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer webhook.Close()

	router := newTestRouter(webhook.URL)
	msg := validMessage()
	body, _ := json.Marshal(msg)

	rec := postJSON(t, router, body)

	if rec.Code != http.StatusOK {
		t.Fatalf("SendMessage with valid payload: status = %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}

	// Security control: the @everyone / role-mention guard. This is the whole
	// reason allowed_mentions exists on the outbound payload.
	if captured.AllowedMentions.Parse == nil || len(captured.AllowedMentions.Parse) != 0 {
		t.Errorf("webhook payload allowed_mentions.parse = %#v, want an empty (non-nil-or-nil, but zero-length) array — a non-empty list would let the submitted content ping @everyone/roles", captured.AllowedMentions.Parse)
	}
	if !bytes.Contains(rawBody, []byte(`"parse":[]`)) {
		t.Errorf("webhook raw JSON body does not contain literal \"parse\":[] — got: %s", rawBody)
	}

	if captured.Username != "Portfolio Bot" {
		t.Errorf("webhook payload username = %q, want %q", captured.Username, "Portfolio Bot")
	}

	for _, want := range []string{msg.Name, msg.Email, msg.Message} {
		if !strings.Contains(captured.Content, want) {
			t.Errorf("webhook payload content = %q, want it to contain %q", captured.Content, want)
		}
	}
}

// TestSendMessage_Validation covers the required-field and length-boundary
// rules on message. Table-driven so each case reports independently.
func TestSendMessage_Validation(t *testing.T) {
	// A syntactically valid email at exactly 254 characters, constructed
	// deliberately so the length case is isolated from the format case (a
	// naive "pad with a's" approach could accidentally produce something the
	// validator also rejects on format grounds).
	localPart := strings.Repeat("a", 242) // 242 + 1 ('@') + 11 ("example.com") = 254
	email254 := localPart + "@example.com"
	if len(email254) != 254 {
		t.Fatalf("test setup: email254 is %d chars, want 254", len(email254))
	}

	name100 := strings.Repeat("n", 100)
	message1500 := strings.Repeat("m", 1500)

	tests := []struct {
		name       string
		msg        message
		wantStatus int
	}{
		{name: "missing name", msg: message{Email: "a@b.co", Message: "hi"}, wantStatus: http.StatusBadRequest},
		{name: "missing email", msg: message{Name: "A", Message: "hi"}, wantStatus: http.StatusBadRequest},
		{name: "missing message", msg: message{Name: "A", Email: "a@b.co"}, wantStatus: http.StatusBadRequest},
		{name: "malformed email", msg: message{Name: "A", Email: "not-an-email", Message: "hi"}, wantStatus: http.StatusBadRequest},
		{name: "name over 100 chars", msg: message{Name: strings.Repeat("n", 101), Email: "a@b.co", Message: "hi"}, wantStatus: http.StatusBadRequest},
		{name: "email over 254 chars", msg: message{Name: "A", Email: strings.Repeat("a", 243) + "@example.com", Message: "hi"}, wantStatus: http.StatusBadRequest},
		{name: "message over 1500 chars", msg: message{Name: "A", Email: "a@b.co", Message: strings.Repeat("m", 1501)}, wantStatus: http.StatusBadRequest},

		{name: "name at exactly 100 chars", msg: message{Name: name100, Email: "a@b.co", Message: "hi"}, wantStatus: http.StatusOK},
		{name: "email at exactly 254 chars", msg: message{Name: "A", Email: email254, Message: "hi"}, wantStatus: http.StatusOK},
		{name: "message at exactly 1500 chars", msg: message{Name: "A", Email: "a@b.co", Message: message1500}, wantStatus: http.StatusOK},
	}

	webhook := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		io.Copy(io.Discard, r.Body)
		w.WriteHeader(http.StatusOK)
	}))
	defer webhook.Close()
	router := newTestRouter(webhook.URL)

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, err := json.Marshal(tt.msg)
			if err != nil {
				t.Fatalf("json.Marshal(%+v): %v", tt.msg, err)
			}

			rec := postJSON(t, router, body)

			if rec.Code != tt.wantStatus {
				t.Errorf("SendMessage(%+v): status = %d, want %d; body: %s", tt.msg, rec.Code, tt.wantStatus, rec.Body.String())
			}
		})
	}
}

// TestSendMessage_BodyTooLarge sends a body over maxBodyBytes and asserts
// the handler returns 413, not 400. This exercises the
// errors.AsType[*http.MaxBytesError] branch specifically: an oversized body
// must be rejected as "too large", not fall through to generic JSON-bind
// validation error handling.
func TestSendMessage_BodyTooLarge(t *testing.T) {
	webhook := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("fake webhook: should not be called — the request should be rejected for size before it reaches this handler's webhook call")
	}))
	defer webhook.Close()
	router := newTestRouter(webhook.URL)

	// Build an oversized but otherwise well-formed JSON payload so the only
	// thing tripping is size, not JSON syntax or field validation ordering.
	oversizedMessage := strings.Repeat("x", maxBodyBytes+1024)
	body, err := json.Marshal(message{Name: "A", Email: "a@b.co", Message: oversizedMessage})
	if err != nil {
		t.Fatalf("json.Marshal: %v", err)
	}
	if len(body) <= maxBodyBytes {
		t.Fatalf("test setup: body is %d bytes, want > maxBodyBytes (%d)", len(body), maxBodyBytes)
	}

	rec := postJSON(t, router, body)

	if rec.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("SendMessage with %d-byte body (maxBodyBytes=%d): status = %d, want %d (StatusRequestEntityTooLarge); body: %s",
			len(body), maxBodyBytes, rec.Code, http.StatusRequestEntityTooLarge, rec.Body.String())
	}
}

// TestSendMessage_WebhookUnreachable starts a real httptest server to get a
// valid-looking URL, closes it immediately, and confirms a connection
// failure surfaces as 502 rather than a 5xx crash or a leaked dial error.
func TestSendMessage_WebhookUnreachable(t *testing.T) {
	webhook := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	webhookURL := webhook.URL
	webhook.Close() // now unreachable, but webhookURL is still a syntactically valid, previously-live address

	router := newTestRouter(webhookURL)
	body, _ := json.Marshal(validMessage())

	rec := postJSON(t, router, body)

	if rec.Code != http.StatusBadGateway {
		t.Fatalf("SendMessage with unreachable webhook: status = %d, want %d; body: %s", rec.Code, http.StatusBadGateway, rec.Body.String())
	}
}

// TestSendMessage_ValidationErrorDoesNotLeakBindingDetail is B3: the client
// must get a stable, user-safe 400 body, never gin's raw binding error text
// (e.g. "Key: 'message.Email' Error:Field validation for 'Email' failed on
// the 'email' tag..."), which is internal detail about our validation
// library, not something to show a site visitor.
func TestSendMessage_ValidationErrorDoesNotLeakBindingDetail(t *testing.T) {
	webhook := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("fake webhook: should not be called — an invalid submission must never reach the webhook")
	}))
	defer webhook.Close()
	router := newTestRouter(webhook.URL)

	// Missing every required field, guaranteed to fail gin's binding.
	body, _ := json.Marshal(message{})
	rec := postJSON(t, router, body)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("SendMessage with empty payload: status = %d, want %d; body: %s", rec.Code, http.StatusBadRequest, rec.Body.String())
	}

	const wantBody = `{"error":"please check your details and try again"}`
	if got := rec.Body.String(); got != wantBody {
		t.Errorf("SendMessage with empty payload: body = %q, want %q (must not leak gin's internal binding error text)", got, wantBody)
	}

	for _, leaked := range []string{"Key:", "Error:Field validation", "'required'", "message.Email", "message.Name"} {
		if strings.Contains(rec.Body.String(), leaked) {
			t.Errorf("SendMessage with empty payload: response body leaked internal binding detail %q — got: %s", leaked, rec.Body.String())
		}
	}
}

// TestSendMessage_Honeypot covers the honeypot contract implemented in
// SendMessage: a non-empty "website" field must look exactly like success
// from the outside (200 {"status":"ok"}) while silently never reaching the
// webhook — and an empty or absent "website" must never affect a genuine
// submission.
func TestSendMessage_Honeypot(t *testing.T) {
	t.Run("non-empty website is dropped silently", func(t *testing.T) {
		webhook := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Fatal("fake webhook: should not be called — a tripped honeypot must never be forwarded to Discord")
		}))
		defer webhook.Close()
		router := newTestRouter(webhook.URL)

		msg := validMessage()
		msg.Website = "http://spam.example"
		body, _ := json.Marshal(msg)

		rec := postJSON(t, router, body)

		if rec.Code != http.StatusOK {
			t.Fatalf("SendMessage with a non-empty website field: status = %d, want %d (must look identical to success); body: %s", rec.Code, http.StatusOK, rec.Body.String())
		}
		const wantBody = `{"status":"ok"}`
		if got := rec.Body.String(); got != wantBody {
			t.Errorf("SendMessage with a non-empty website field: body = %q, want %q", got, wantBody)
		}
	})

	t.Run("absent website still sends normally", func(t *testing.T) {
		var called bool
		webhook := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			called = true
			w.WriteHeader(http.StatusOK)
		}))
		defer webhook.Close()
		router := newTestRouter(webhook.URL)

		// A raw JSON literal, deliberately omitting "website" entirely —
		// json.Marshal(message{...}) would always include the key (no
		// omitempty tag), so it can't express the truly-absent case.
		body := []byte(`{"name":"Ada Lovelace","email":"ada@example.com","message":"Hello from the contact form."}`)

		rec := postJSON(t, router, body)

		if rec.Code != http.StatusOK {
			t.Fatalf("SendMessage with website absent: status = %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
		}
		if !called {
			t.Error("SendMessage with website absent: fake webhook was never called, want a genuine submission to be forwarded")
		}
	})

	t.Run("empty website still sends normally", func(t *testing.T) {
		var called bool
		webhook := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			called = true
			w.WriteHeader(http.StatusOK)
		}))
		defer webhook.Close()
		router := newTestRouter(webhook.URL)

		body := []byte(`{"name":"Ada Lovelace","email":"ada@example.com","message":"Hello from the contact form.","website":""}`)

		rec := postJSON(t, router, body)

		if rec.Code != http.StatusOK {
			t.Fatalf("SendMessage with website empty: status = %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
		}
		if !called {
			t.Error("SendMessage with website empty: fake webhook was never called, want a genuine submission to be forwarded")
		}
	})
}

// TestSendMessage_WebhookNonOK covers Discord returning a non-2xx status,
// and separately proves that the webhook's own response body (which could
// contain internal details) never reaches the client — the entire point of
// the indirection this handler provides.
func TestSendMessage_WebhookNonOK(t *testing.T) {
	const leakedDetail = "internal discord error: token xyz"

	tests := []struct {
		name        string
		webhookHTTP int
	}{
		{name: "webhook returns 500", webhookHTTP: http.StatusInternalServerError},
		{name: "webhook returns 404", webhookHTTP: http.StatusNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			webhook := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(tt.webhookHTTP)
				fmt.Fprint(w, leakedDetail)
			}))
			defer webhook.Close()

			router := newTestRouter(webhook.URL)
			body, _ := json.Marshal(validMessage())

			rec := postJSON(t, router, body)

			if rec.Code != http.StatusBadGateway {
				t.Errorf("SendMessage with webhook returning %d: client status = %d, want %d; body: %s", tt.webhookHTTP, rec.Code, http.StatusBadGateway, rec.Body.String())
			}
			if strings.Contains(rec.Body.String(), leakedDetail) {
				t.Errorf("SendMessage with webhook returning %d: client response body leaked the webhook's error text %q — got: %s", tt.webhookHTTP, leakedDetail, rec.Body.String())
			}
		})
	}
}
