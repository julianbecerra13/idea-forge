package domain

import (
	"time"

	"github.com/google/uuid"
)

// ActionPlan represents a detailed action plan derived from a completed idea
type ActionPlan struct {
	ID                        uuid.UUID `json:"id" db:"id"`
	IdeaID                    uuid.UUID `json:"idea_id" db:"idea_id"`
	Status                    string    `json:"status" db:"status"` // draft, in_progress, completed
	FunctionalRequirements    string    `json:"functional_requirements" db:"functional_requirements"`
	NonFunctionalRequirements string    `json:"non_functional_requirements" db:"non_functional_requirements"`
	BusinessLogicFlow         string    `json:"business_logic_flow" db:"business_logic_flow"`
	Completed                 bool      `json:"completed" db:"completed"`
	CreatedAt                 time.Time `json:"created_at" db:"created_at"`
	UpdatedAt                 time.Time `json:"updated_at" db:"updated_at"`
}
