package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/dark/idea-forge/internal/ideation/domain"
	"github.com/dark/idea-forge/internal/ideation/port"
)

type GetIdea struct{ repo port.IdeaRepository }

func NewGetIdea(r port.IdeaRepository) *GetIdea { return &GetIdea{repo: r} }

func (uc *GetIdea) Execute(ctx context.Context, id uuid.UUID) (*domain.Idea, error) {
	return uc.repo.FindByID(ctx, id)
}
