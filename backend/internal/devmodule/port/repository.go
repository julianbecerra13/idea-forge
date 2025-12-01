package port

import (
	"context"

	"github.com/google/uuid"
	"github.com/dark/idea-forge/internal/devmodule/domain"
)

// DevModuleRepository defines the interface for development module data persistence
type DevModuleRepository interface {
	// Development Module operations
	Save(ctx context.Context, module *domain.DevelopmentModule) error
	SaveBatch(ctx context.Context, modules []domain.DevelopmentModule) error
	FindByID(ctx context.Context, id uuid.UUID) (*domain.DevelopmentModule, error)
	FindByArchitectureID(ctx context.Context, architectureID uuid.UUID) ([]domain.DevelopmentModule, error)
	Update(ctx context.Context, module *domain.DevelopmentModule) error
	Delete(ctx context.Context, id uuid.UUID) error
	DeleteByArchitectureID(ctx context.Context, architectureID uuid.UUID) error

	// Global Chat operations
	SaveMessage(ctx context.Context, msg *domain.GlobalChatMessage) error
	ListMessages(ctx context.Context, ideaID uuid.UUID, limit int) ([]domain.GlobalChatMessage, error)
}
