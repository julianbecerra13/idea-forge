package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/dark/idea-forge/internal/devmodule/domain"
	"github.com/dark/idea-forge/internal/devmodule/port"
)

// DevModuleUsecase handles business logic for development modules
type DevModuleUsecase struct {
	repo port.DevModuleRepository
}

// NewDevModuleUsecase creates a new development module use case
func NewDevModuleUsecase(repo port.DevModuleRepository) *DevModuleUsecase {
	return &DevModuleUsecase{repo: repo}
}

// CreateModule creates a new development module
func (uc *DevModuleUsecase) CreateModule(ctx context.Context, module *domain.DevelopmentModule) error {
	module.ID = uuid.New()
	if module.Status == "" {
		module.Status = "pending"
	}
	return uc.repo.Save(ctx, module)
}

// CreateModules creates multiple development modules at once
func (uc *DevModuleUsecase) CreateModules(ctx context.Context, modules []domain.DevelopmentModule) error {
	for i := range modules {
		modules[i].ID = uuid.New()
		if modules[i].Status == "" {
			modules[i].Status = "pending"
		}
	}
	return uc.repo.SaveBatch(ctx, modules)
}

// GetModule retrieves a development module by ID
func (uc *DevModuleUsecase) GetModule(ctx context.Context, id uuid.UUID) (*domain.DevelopmentModule, error) {
	return uc.repo.FindByID(ctx, id)
}

// GetModulesByArchitectureID retrieves all modules for an architecture
func (uc *DevModuleUsecase) GetModulesByArchitectureID(ctx context.Context, architectureID uuid.UUID) ([]domain.DevelopmentModule, error) {
	return uc.repo.FindByArchitectureID(ctx, architectureID)
}

// UpdateModule updates an existing development module
func (uc *DevModuleUsecase) UpdateModule(ctx context.Context, module *domain.DevelopmentModule) error {
	return uc.repo.Update(ctx, module)
}

// DeleteModule deletes a development module
func (uc *DevModuleUsecase) DeleteModule(ctx context.Context, id uuid.UUID) error {
	return uc.repo.Delete(ctx, id)
}

// ReplaceModules deletes all existing modules for an architecture and creates new ones
func (uc *DevModuleUsecase) ReplaceModules(ctx context.Context, architectureID uuid.UUID, modules []domain.DevelopmentModule) error {
	// Delete existing modules
	if err := uc.repo.DeleteByArchitectureID(ctx, architectureID); err != nil {
		return err
	}

	// Create new modules
	if len(modules) > 0 {
		for i := range modules {
			modules[i].ArchitectureID = architectureID
		}
		return uc.CreateModules(ctx, modules)
	}
	return nil
}

// Global Chat Messages

// AddGlobalMessage adds a message to the global chat
func (uc *DevModuleUsecase) AddGlobalMessage(ctx context.Context, msg *domain.GlobalChatMessage) error {
	msg.ID = uuid.New()
	return uc.repo.SaveMessage(ctx, msg)
}

// GetGlobalMessages retrieves global chat messages for an idea
func (uc *DevModuleUsecase) GetGlobalMessages(ctx context.Context, ideaID uuid.UUID, limit int) ([]domain.GlobalChatMessage, error) {
	return uc.repo.ListMessages(ctx, ideaID, limit)
}
