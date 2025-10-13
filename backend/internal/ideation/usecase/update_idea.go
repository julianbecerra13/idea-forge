package usecase

import (
	"context"
	"errors"

	"github.com/dark/idea-forge/internal/ideation/domain"
	"github.com/dark/idea-forge/internal/ideation/port"
	"github.com/google/uuid"
)

type UpdateIdea struct {
	repo port.IdeaRepository
}

func NewUpdateIdea(repo port.IdeaRepository) *UpdateIdea {
	return &UpdateIdea{repo: repo}
}

func (uc *UpdateIdea) Execute(
	ctx context.Context,
	id uuid.UUID,
	title, objective, problem, scope string,
	validateCompetition, validateMonetization bool,
	completed *bool,
) (*domain.Idea, error) {
	// 1. Verificar que la idea existe
	existing, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		return nil, errors.New("idea no encontrada")
	}

	// 2. Actualizar solo los campos que no estén vacíos
	if title != "" {
		existing.Title = title
	}
	if objective != "" {
		existing.Objective = objective
	}
	if problem != "" {
		existing.Problem = problem
	}
	if scope != "" {
		existing.Scope = scope
	}

	// Las validaciones siempre se actualizan (pueden cambiar a false)
	existing.ValidateCompetition = validateCompetition
	existing.ValidateMonetization = validateMonetization

	// Actualizar completed si se proporcionó
	if completed != nil {
		existing.Completed = *completed
	}

	// 3. Guardar cambios
	if err := uc.repo.UpdateIdea(ctx, existing); err != nil {
		return nil, err
	}

	return existing, nil
}
