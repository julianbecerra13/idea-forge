package usecase

import (
	"context"

	"github.com/dark/idea-forge/internal/ideation/domain"
	"github.com/dark/idea-forge/internal/ideation/port"
)

type CreateIdea struct{ repo port.IdeaRepository }

func NewCreateIdea(r port.IdeaRepository) *CreateIdea { return &CreateIdea{repo: r} }

func (uc *CreateIdea) Execute(ctx context.Context, title, objective, problem, scope string, comp, monet bool) (*domain.Idea, error) {
	idea, err := domain.NewIdea(title, objective, problem, scope, comp, monet)
	if err != nil { return nil, err }
	if err := uc.repo.Save(ctx, idea); err != nil { return nil, err }
	return idea, nil
}