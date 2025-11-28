package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/dark/idea-forge/internal/ideation/port"
)

type DeleteIdea struct{ repo port.IdeaRepository }

func NewDeleteIdea(r port.IdeaRepository) *DeleteIdea { return &DeleteIdea{repo: r} }

func (uc *DeleteIdea) Execute(ctx context.Context, id uuid.UUID) error {
	return uc.repo.Delete(ctx, id)
}
