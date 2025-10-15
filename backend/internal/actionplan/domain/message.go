package domain

import (
	"time"

	"github.com/google/uuid"
)

// ActionPlanMessage represents a chat message in the action plan refinement conversation
type ActionPlanMessage struct {
	ID           uuid.UUID `json:"id" db:"id"`
	ActionPlanID uuid.UUID `json:"action_plan_id" db:"action_plan_id"`
	Role         string    `json:"role" db:"role"` // user, assistant, system
	Content      string    `json:"content" db:"content"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}
