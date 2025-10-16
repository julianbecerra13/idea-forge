package pg

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/dark/idea-forge/internal/actionplan/domain"
	"github.com/dark/idea-forge/internal/actionplan/port"
)

type repo struct{ db *sql.DB }

func NewRepo(db *sql.DB) port.ActionPlanRepository { return &repo{db: db} }

func (r *repo) Save(ctx context.Context, plan *domain.ActionPlan) error {
	now := time.Now()
	plan.CreatedAt = now
	plan.UpdatedAt = now

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO action_plans
		  (id, idea_id, status, functional_requirements, non_functional_requirements, business_logic_flow, completed, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
	`, plan.ID, plan.IdeaID, plan.Status, plan.FunctionalRequirements, plan.NonFunctionalRequirements, plan.BusinessLogicFlow, plan.Completed, plan.CreatedAt, plan.UpdatedAt)
	return err
}

func (r *repo) FindByID(ctx context.Context, id uuid.UUID) (*domain.ActionPlan, error) {
	var plan domain.ActionPlan
	err := r.db.QueryRowContext(ctx, `
		SELECT id, idea_id, status, functional_requirements, non_functional_requirements, business_logic_flow, completed, created_at, updated_at
		  FROM action_plans
		 WHERE id=$1
	`, id).
		Scan(&plan.ID, &plan.IdeaID, &plan.Status, &plan.FunctionalRequirements, &plan.NonFunctionalRequirements, &plan.BusinessLogicFlow, &plan.Completed, &plan.CreatedAt, &plan.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &plan, nil
}

func (r *repo) FindByIdeaID(ctx context.Context, ideaID uuid.UUID) (*domain.ActionPlan, error) {
	var plan domain.ActionPlan
	err := r.db.QueryRowContext(ctx, `
		SELECT id, idea_id, status, functional_requirements, non_functional_requirements, business_logic_flow, completed, created_at, updated_at
		  FROM action_plans
		 WHERE idea_id=$1
	`, ideaID).
		Scan(&plan.ID, &plan.IdeaID, &plan.Status, &plan.FunctionalRequirements, &plan.NonFunctionalRequirements, &plan.BusinessLogicFlow, &plan.Completed, &plan.CreatedAt, &plan.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &plan, nil
}

func (r *repo) Update(ctx context.Context, plan *domain.ActionPlan) error {
	plan.UpdatedAt = time.Now()

	_, err := r.db.ExecContext(ctx, `
		UPDATE action_plans
		   SET status=$2, functional_requirements=$3, non_functional_requirements=$4, business_logic_flow=$5, completed=$6, updated_at=$7
		 WHERE id=$1
	`, plan.ID, plan.Status, plan.FunctionalRequirements, plan.NonFunctionalRequirements, plan.BusinessLogicFlow, plan.Completed, plan.UpdatedAt)
	return err
}

func (r *repo) AppendMessage(ctx context.Context, msg *domain.ActionPlanMessage) error {
	msg.CreatedAt = time.Now()

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO action_plan_messages (id, action_plan_id, role, content, created_at)
		VALUES ($1,$2,$3,$4,$5)
	`, msg.ID, msg.ActionPlanID, msg.Role, msg.Content, msg.CreatedAt)
	return err
}

func (r *repo) ListMessages(ctx context.Context, actionPlanID uuid.UUID, limit int) ([]domain.ActionPlanMessage, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, action_plan_id, role, content, created_at
		  FROM action_plan_messages
		 WHERE action_plan_id=$1
		 ORDER BY created_at
		 LIMIT $2
	`, actionPlanID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []domain.ActionPlanMessage
	for rows.Next() {
		var m domain.ActionPlanMessage
		if err := rows.Scan(&m.ID, &m.ActionPlanID, &m.Role, &m.Content, &m.CreatedAt); err != nil {
			return nil, err
		}
		messages = append(messages, m)
	}
	return messages, rows.Err()
}
