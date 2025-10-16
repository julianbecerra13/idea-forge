package port

import (
	"context"

	"github.com/google/uuid"
	"github.com/dark/idea-forge/internal/architecture/domain"
)

// ArchitectureRepository defines the interface for architecture data persistence
type ArchitectureRepository interface {
	// Architecture operations
	Save(ctx context.Context, arch *domain.Architecture) error
	FindByID(ctx context.Context, id uuid.UUID) (*domain.Architecture, error)
	FindByActionPlanID(ctx context.Context, actionPlanID uuid.UUID) (*domain.Architecture, error)
	Update(ctx context.Context, arch *domain.Architecture) error

	// Message operations
	AppendMessage(ctx context.Context, msg *domain.ArchitectureMessage) error
	ListMessages(ctx context.Context, architectureID uuid.UUID, limit int) ([]domain.ArchitectureMessage, error)
}
