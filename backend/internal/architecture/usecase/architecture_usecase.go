package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/dark/idea-forge/internal/architecture/domain"
	"github.com/dark/idea-forge/internal/architecture/port"
)

// ArchitectureUsecase handles business logic for architecture design
type ArchitectureUsecase struct {
	repo port.ArchitectureRepository
}

// NewArchitectureUsecase creates a new architecture use case
func NewArchitectureUsecase(repo port.ArchitectureRepository) *ArchitectureUsecase {
	return &ArchitectureUsecase{repo: repo}
}

// CreateArchitecture creates a new architecture from a completed action plan
func (uc *ArchitectureUsecase) CreateArchitecture(ctx context.Context, actionPlanID uuid.UUID) (*domain.Architecture, error) {
	// Check if architecture already exists for this action plan
	existing, err := uc.repo.FindByActionPlanID(ctx, actionPlanID)
	if err == nil && existing != nil {
		return existing, nil
	}

	arch := &domain.Architecture{
		ID:                    uuid.New(),
		ActionPlanID:          actionPlanID,
		Status:                "draft",
		UserStories:           "",
		DatabaseType:          "",
		DatabaseSchema:        "",
		EntitiesRelationships: "",
		TechStack:             "",
		ArchitecturePattern:   "",
		SystemArchitecture:    "",
		Completed:             false,
	}

	if err := uc.repo.Save(ctx, arch); err != nil {
		return nil, err
	}

	return arch, nil
}

// GetArchitecture retrieves an architecture by ID
func (uc *ArchitectureUsecase) GetArchitecture(ctx context.Context, id uuid.UUID) (*domain.Architecture, error) {
	return uc.repo.FindByID(ctx, id)
}

// GetArchitectureByActionPlanID retrieves an architecture by action plan ID
func (uc *ArchitectureUsecase) GetArchitectureByActionPlanID(ctx context.Context, actionPlanID uuid.UUID) (*domain.Architecture, error) {
	return uc.repo.FindByActionPlanID(ctx, actionPlanID)
}

// UpdateArchitecture updates an existing architecture
func (uc *ArchitectureUsecase) UpdateArchitecture(ctx context.Context, arch *domain.Architecture) error {
	return uc.repo.Update(ctx, arch)
}

// AddMessage adds a message to the architecture conversation
func (uc *ArchitectureUsecase) AddMessage(ctx context.Context, msg *domain.ArchitectureMessage) error {
	return uc.repo.AppendMessage(ctx, msg)
}

// GetMessages retrieves messages for an architecture
func (uc *ArchitectureUsecase) GetMessages(ctx context.Context, architectureID uuid.UUID, limit int) ([]domain.ArchitectureMessage, error) {
	return uc.repo.ListMessages(ctx, architectureID, limit)
}
