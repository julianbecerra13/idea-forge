package port

import (
	"context"

	"github.com/google/uuid"
	"github.com/dark/idea-forge/internal/ideation/domain"
)

type IdeaRepository interface {
	Save(ctx context.Context, idea *domain.Idea) error
	FindByID(ctx context.Context, id uuid.UUID) (*domain.Idea, error)
	FindAll(ctx context.Context, limit int) ([]domain.Idea, error)
	UpdateIdea(ctx context.Context, idea *domain.Idea) error
	Delete(ctx context.Context, id uuid.UUID) error

	AppendMessage(ctx context.Context, msg *domain.Message) error
	ListMessages(ctx context.Context, ideaID uuid.UUID, limit int) ([]domain.Message, error)
}
