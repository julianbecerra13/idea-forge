package pg

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/dark/idea-forge/internal/devmodule/domain"
	"github.com/dark/idea-forge/internal/devmodule/port"
)

type repo struct{ db *sql.DB }

func NewRepo(db *sql.DB) port.DevModuleRepository { return &repo{db: db} }

func (r *repo) Save(ctx context.Context, module *domain.DevelopmentModule) error {
	now := time.Now()
	module.CreatedAt = now
	module.UpdatedAt = now

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO development_modules
		  (id, architecture_id, name, description, functionality, dependencies, technical_details, priority, status, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
	`, module.ID, module.ArchitectureID, module.Name, module.Description, module.Functionality, module.Dependencies, module.TechnicalDetails, module.Priority, module.Status, module.CreatedAt, module.UpdatedAt)
	return err
}

func (r *repo) SaveBatch(ctx context.Context, modules []domain.DevelopmentModule) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO development_modules
		  (id, architecture_id, name, description, functionality, dependencies, technical_details, priority, status, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	now := time.Now()
	for i := range modules {
		modules[i].CreatedAt = now
		modules[i].UpdatedAt = now
		_, err := stmt.ExecContext(ctx,
			modules[i].ID, modules[i].ArchitectureID, modules[i].Name, modules[i].Description,
			modules[i].Functionality, modules[i].Dependencies, modules[i].TechnicalDetails,
			modules[i].Priority, modules[i].Status, modules[i].CreatedAt, modules[i].UpdatedAt)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *repo) FindByID(ctx context.Context, id uuid.UUID) (*domain.DevelopmentModule, error) {
	var module domain.DevelopmentModule
	err := r.db.QueryRowContext(ctx, `
		SELECT id, architecture_id, name, description, functionality, dependencies, technical_details, priority, status, created_at, updated_at
		  FROM development_modules
		 WHERE id=$1
	`, id).
		Scan(&module.ID, &module.ArchitectureID, &module.Name, &module.Description, &module.Functionality, &module.Dependencies, &module.TechnicalDetails, &module.Priority, &module.Status, &module.CreatedAt, &module.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &module, nil
}

func (r *repo) FindByArchitectureID(ctx context.Context, architectureID uuid.UUID) ([]domain.DevelopmentModule, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, architecture_id, name, description, functionality, dependencies, technical_details, priority, status, created_at, updated_at
		  FROM development_modules
		 WHERE architecture_id=$1
		 ORDER BY priority ASC, created_at ASC
	`, architectureID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var modules []domain.DevelopmentModule
	for rows.Next() {
		var m domain.DevelopmentModule
		if err := rows.Scan(&m.ID, &m.ArchitectureID, &m.Name, &m.Description, &m.Functionality, &m.Dependencies, &m.TechnicalDetails, &m.Priority, &m.Status, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, err
		}
		modules = append(modules, m)
	}
	return modules, rows.Err()
}

func (r *repo) Update(ctx context.Context, module *domain.DevelopmentModule) error {
	module.UpdatedAt = time.Now()

	_, err := r.db.ExecContext(ctx, `
		UPDATE development_modules
		   SET name=$2, description=$3, functionality=$4, dependencies=$5, technical_details=$6, priority=$7, status=$8, updated_at=$9
		 WHERE id=$1
	`, module.ID, module.Name, module.Description, module.Functionality, module.Dependencies, module.TechnicalDetails, module.Priority, module.Status, module.UpdatedAt)
	return err
}

func (r *repo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM development_modules WHERE id=$1`, id)
	return err
}

func (r *repo) DeleteByArchitectureID(ctx context.Context, architectureID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM development_modules WHERE architecture_id=$1`, architectureID)
	return err
}

// Global Chat Messages

func (r *repo) SaveMessage(ctx context.Context, msg *domain.GlobalChatMessage) error {
	msg.CreatedAt = time.Now()

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO global_chat_messages (id, idea_id, role, content, affected_modules, created_at)
		VALUES ($1,$2,$3,$4,$5,$6)
	`, msg.ID, msg.IdeaID, msg.Role, msg.Content, msg.AffectedModules, msg.CreatedAt)
	return err
}

func (r *repo) ListMessages(ctx context.Context, ideaID uuid.UUID, limit int) ([]domain.GlobalChatMessage, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, idea_id, role, content, COALESCE(affected_modules, ''), created_at
		  FROM global_chat_messages
		 WHERE idea_id=$1
		 ORDER BY created_at ASC
		 LIMIT $2
	`, ideaID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []domain.GlobalChatMessage
	for rows.Next() {
		var m domain.GlobalChatMessage
		if err := rows.Scan(&m.ID, &m.IdeaID, &m.Role, &m.Content, &m.AffectedModules, &m.CreatedAt); err != nil {
			return nil, err
		}
		messages = append(messages, m)
	}
	return messages, rows.Err()
}
