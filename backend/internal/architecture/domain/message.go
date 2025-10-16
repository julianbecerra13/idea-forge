package domain

import (
	"time"

	"github.com/google/uuid"
)

// ArchitectureMessage represents a chat message in the architecture design conversation
type ArchitectureMessage struct {
	ID             uuid.UUID `json:"id" db:"id"`
	ArchitectureID uuid.UUID `json:"architecture_id" db:"architecture_id"`
	Role           string    `json:"role" db:"role"` // user, assistant, system
	Content        string    `json:"content" db:"content"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
}
