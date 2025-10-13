package usecase

import (
	"context"

	"github.com/dark/idea-forge/internal/ideation/domain"
	"github.com/dark/idea-forge/internal/ideation/port"
)

type ListIdeas struct {
	repo port.IdeaRepository
}

func NewListIdeas(repo port.IdeaRepository) *ListIdeas {
	return &ListIdeas{repo: repo}
}

func (uc *ListIdeas) Execute(ctx context.Context, limit int) ([]domain.Idea, error) {
	if limit <= 0 {
		limit = 50 // Default limit
	}
	return uc.repo.FindAll(ctx, limit)
}
