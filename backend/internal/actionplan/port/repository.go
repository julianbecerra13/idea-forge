package port

import (
	"context"

	"github.com/google/uuid"
	"github.com/dark/idea-forge/internal/actionplan/domain"
)

// ActionPlanRepository defines the interface for action plan data persistence
type ActionPlanRepository interface {
	// ActionPlan operations
	Save(ctx context.Context, plan *domain.ActionPlan) error
	FindByID(ctx context.Context, id uuid.UUID) (*domain.ActionPlan, error)
	FindByIdeaID(ctx context.Context, ideaID uuid.UUID) (*domain.ActionPlan, error)
	Update(ctx context.Context, plan *domain.ActionPlan) error

	// Message operations
	AppendMessage(ctx context.Context, msg *domain.ActionPlanMessage) error
	ListMessages(ctx context.Context, actionPlanID uuid.UUID, limit int) ([]domain.ActionPlanMessage, error)
}
