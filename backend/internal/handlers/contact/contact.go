package contact

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/alcash55/Portfolio/pkg/config"
	"github.com/gin-gonic/gin"
)

// maxBodyBytes caps how much of an inbound contact request we are willing to
// read, so a large POST can't exhaust memory.
const maxBodyBytes = 64 << 10 // 64 KiB

// message is the contact-form payload accepted by SendMessage. The field caps
// keep the rendered Discord message under that API's 2000-character limit.
type message struct {
	Name    string `json:"name" binding:"required,max=100"`
	Email   string `json:"email" binding:"required,email,max=254"`
	Message string `json:"message" binding:"required,max=1500"`
}

// discordPayload is the shape Discord's webhook API expects.
type discordPayload struct {
	Username        string          `json:"username"`
	Content         string          `json:"content"`
	AllowedMentions allowedMentions `json:"allowed_mentions"`
}

// allowedMentions with an empty Parse list stops a submitted message from
// pinging @everyone or any role when Discord renders it.
type allowedMentions struct {
	Parse []string `json:"parse"`
}

// Handler carries the dependencies the contact endpoints need.
type Handler struct {
	cfg    config.Config
	client *http.Client
}

// New builds a contact handler bound to cfg.
func New(cfg config.Config) *Handler {
	return &Handler{
		cfg:    cfg,
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

func (h *Handler) SendMessage(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBodyBytes)

	var msg message
	if err := c.ShouldBindJSON(&msg); err != nil {
		if _, ok := errors.AsType[*http.MaxBytesError](err); ok {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "message too large"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Build the Discord payload from the validated fields rather than
	// forwarding the raw body, so the webhook only ever sees known values.
	payload, err := json.Marshal(discordPayload{
		Username: "Portfolio Bot",
		Content: fmt.Sprintf("%s has sent you a message\nemail: %s\nmessage: %s",
			msg.Name, msg.Email, msg.Message),
		AllowedMentions: allowedMentions{Parse: []string{}},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not encode message"})
		return
	}

	resp, err := h.client.Post(h.cfg.WebhookURL, "application/json", bytes.NewReader(payload))
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "could not reach webhook"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		c.JSON(http.StatusBadGateway, gin.H{"error": "webhook rejected the message"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
