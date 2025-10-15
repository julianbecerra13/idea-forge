package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/dark/idea-forge/internal/actionplan/domain"
	"github.com/dark/idea-forge/internal/actionplan/port"
)

// ActionPlanUsecase handles business logic for action plans
type ActionPlanUsecase struct {
	repo port.ActionPlanRepository
}

// NewActionPlanUsecase creates a new action plan use case
func NewActionPlanUsecase(repo port.ActionPlanRepository) *ActionPlanUsecase {
	return &ActionPlanUsecase{repo: repo}
}

// CreateActionPlan creates a new action plan from a completed idea
func (uc *ActionPlanUsecase) CreateActionPlan(ctx context.Context, ideaID uuid.UUID) (*domain.ActionPlan, error) {
	// Check if action plan already exists for this idea
	existing, err := uc.repo.FindByIdeaID(ctx, ideaID)
	if err == nil && existing != nil {
		return existing, nil
	}

	plan := &domain.ActionPlan{
		ID:                        uuid.New(),
		IdeaID:                    ideaID,
		Status:                    "draft",
		FunctionalRequirements:    "",
		NonFunctionalRequirements: "",
		BusinessLogicFlow:         "",
		Completed:                 false,
	}

	if err := uc.repo.Save(ctx, plan); err != nil {
		return nil, err
	}

	return plan, nil
}

// GetActionPlan retrieves an action plan by ID
func (uc *ActionPlanUsecase) GetActionPlan(ctx context.Context, id uuid.UUID) (*domain.ActionPlan, error) {
	return uc.repo.FindByID(ctx, id)
}

// GetActionPlanByIdeaID retrieves an action plan by idea ID
func (uc *ActionPlanUsecase) GetActionPlanByIdeaID(ctx context.Context, ideaID uuid.UUID) (*domain.ActionPlan, error) {
	return uc.repo.FindByIdeaID(ctx, ideaID)
}

// UpdateActionPlan updates an existing action plan
func (uc *ActionPlanUsecase) UpdateActionPlan(ctx context.Context, plan *domain.ActionPlan) error {
	return uc.repo.Update(ctx, plan)
}

// AddMessage adds a message to the action plan conversation
func (uc *ActionPlanUsecase) AddMessage(ctx context.Context, msg *domain.ActionPlanMessage) error {
	return uc.repo.AppendMessage(ctx, msg)
}

// GetMessages retrieves messages for an action plan
func (uc *ActionPlanUsecase) GetMessages(ctx context.Context, actionPlanID uuid.UUID, limit int) ([]domain.ActionPlanMessage, error) {
	return uc.repo.ListMessages(ctx, actionPlanID, limit)
}
