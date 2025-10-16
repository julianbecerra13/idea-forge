package pg

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/dark/idea-forge/internal/architecture/domain"
	"github.com/dark/idea-forge/internal/architecture/port"
)

type repo struct{ db *sql.DB }

func NewRepo(db *sql.DB) port.ArchitectureRepository { return &repo{db: db} }

func (r *repo) Save(ctx context.Context, arch *domain.Architecture) error {
	now := time.Now()
	arch.CreatedAt = now
	arch.UpdatedAt = now

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO architectures
		  (id, action_plan_id, status, user_stories, database_type, database_schema, entities_relationships, tech_stack, architecture_pattern, system_architecture, completed, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
	`, arch.ID, arch.ActionPlanID, arch.Status, arch.UserStories, arch.DatabaseType, arch.DatabaseSchema, arch.EntitiesRelationships, arch.TechStack, arch.ArchitecturePattern, arch.SystemArchitecture, arch.Completed, arch.CreatedAt, arch.UpdatedAt)
	return err
}

func (r *repo) FindByID(ctx context.Context, id uuid.UUID) (*domain.Architecture, error) {
	var arch domain.Architecture
	err := r.db.QueryRowContext(ctx, `
		SELECT id, action_plan_id, status, user_stories, database_type, database_schema, entities_relationships, tech_stack, architecture_pattern, system_architecture, completed, created_at, updated_at
		  FROM architectures
		 WHERE id=$1
	`, id).
		Scan(&arch.ID, &arch.ActionPlanID, &arch.Status, &arch.UserStories, &arch.DatabaseType, &arch.DatabaseSchema, &arch.EntitiesRelationships, &arch.TechStack, &arch.ArchitecturePattern, &arch.SystemArchitecture, &arch.Completed, &arch.CreatedAt, &arch.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &arch, nil
}

func (r *repo) FindByActionPlanID(ctx context.Context, actionPlanID uuid.UUID) (*domain.Architecture, error) {
	var arch domain.Architecture
	err := r.db.QueryRowContext(ctx, `
		SELECT id, action_plan_id, status, user_stories, database_type, database_schema, entities_relationships, tech_stack, architecture_pattern, system_architecture, completed, created_at, updated_at
		  FROM architectures
		 WHERE action_plan_id=$1
	`, actionPlanID).
		Scan(&arch.ID, &arch.ActionPlanID, &arch.Status, &arch.UserStories, &arch.DatabaseType, &arch.DatabaseSchema, &arch.EntitiesRelationships, &arch.TechStack, &arch.ArchitecturePattern, &arch.SystemArchitecture, &arch.Completed, &arch.CreatedAt, &arch.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &arch, nil
}

func (r *repo) Update(ctx context.Context, arch *domain.Architecture) error {
	arch.UpdatedAt = time.Now()

	_, err := r.db.ExecContext(ctx, `
		UPDATE architectures
		   SET status=$2, user_stories=$3, database_type=$4, database_schema=$5, entities_relationships=$6, tech_stack=$7, architecture_pattern=$8, system_architecture=$9, completed=$10, updated_at=$11
		 WHERE id=$1
	`, arch.ID, arch.Status, arch.UserStories, arch.DatabaseType, arch.DatabaseSchema, arch.EntitiesRelationships, arch.TechStack, arch.ArchitecturePattern, arch.SystemArchitecture, arch.Completed, arch.UpdatedAt)
	return err
}

func (r *repo) AppendMessage(ctx context.Context, msg *domain.ArchitectureMessage) error {
	msg.CreatedAt = time.Now()

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO architecture_messages (id, architecture_id, role, content, created_at)
		VALUES ($1,$2,$3,$4,$5)
	`, msg.ID, msg.ArchitectureID, msg.Role, msg.Content, msg.CreatedAt)
	return err
}

func (r *repo) ListMessages(ctx context.Context, architectureID uuid.UUID, limit int) ([]domain.ArchitectureMessage, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, architecture_id, role, content, created_at
		  FROM architecture_messages
		 WHERE architecture_id=$1
		 ORDER BY created_at
		 LIMIT $2
	`, architectureID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []domain.ArchitectureMessage
	for rows.Next() {
		var m domain.ArchitectureMessage
		if err := rows.Scan(&m.ID, &m.ArchitectureID, &m.Role, &m.Content, &m.CreatedAt); err != nil {
			return nil, err
		}
		messages = append(messages, m)
	}
	return messages, rows.Err()
}
