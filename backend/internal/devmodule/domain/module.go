package domain

import (
	"time"

	"github.com/google/uuid"
)

// DevelopmentModule represents a module to be developed for the project
type DevelopmentModule struct {
	ID               uuid.UUID `json:"id" db:"id"`
	ArchitectureID   uuid.UUID `json:"architecture_id" db:"architecture_id"`
	Name             string    `json:"name" db:"name"`
	Description      string    `json:"description" db:"description"`
	Functionality    string    `json:"functionality" db:"functionality"`
	Dependencies     string    `json:"dependencies" db:"dependencies"` // JSON array of module names
	TechnicalDetails string    `json:"technical_details" db:"technical_details"`
	Priority         int       `json:"priority" db:"priority"`
	Status           string    `json:"status" db:"status"` // pending, in_progress, completed
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time `json:"updated_at" db:"updated_at"`
}

// GlobalChatMessage represents a message in the global chat
type GlobalChatMessage struct {
	ID              uuid.UUID `json:"id" db:"id"`
	IdeaID          uuid.UUID `json:"idea_id" db:"idea_id"`
	Role            string    `json:"role" db:"role"` // user, assistant, system
	Content         string    `json:"content" db:"content"`
	AffectedModules string    `json:"affected_modules" db:"affected_modules"` // JSON array
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
}
