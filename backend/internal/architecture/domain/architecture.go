package domain

import (
	"time"

	"github.com/google/uuid"
)

// Architecture represents the technical architecture and data design for a project
type Architecture struct {
	ID                    uuid.UUID `json:"id" db:"id"`
	ActionPlanID          uuid.UUID `json:"action_plan_id" db:"action_plan_id"`
	Status                string    `json:"status" db:"status"` // draft, in_progress, completed

	// User Stories
	UserStories           string    `json:"user_stories" db:"user_stories"`

	// Database Design
	DatabaseType          string    `json:"database_type" db:"database_type"` // relational, nosql, hybrid
	DatabaseSchema        string    `json:"database_schema" db:"database_schema"`
	EntitiesRelationships string    `json:"entities_relationships" db:"entities_relationships"`

	// Technical Architecture
	TechStack             string    `json:"tech_stack" db:"tech_stack"`
	ArchitecturePattern   string    `json:"architecture_pattern" db:"architecture_pattern"`
	SystemArchitecture    string    `json:"system_architecture" db:"system_architecture"`

	Completed             bool      `json:"completed" db:"completed"`
	CreatedAt             time.Time `json:"created_at" db:"created_at"`
	UpdatedAt             time.Time `json:"updated_at" db:"updated_at"`
}
