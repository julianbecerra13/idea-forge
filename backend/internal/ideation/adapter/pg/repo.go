package pg

import (
	"context"
	"database/sql"

	"github.com/google/uuid"
	"github.com/dark/idea-forge/internal/ideation/domain"
	"github.com/dark/idea-forge/internal/ideation/port"
)

type repo struct{ db *sql.DB }

func NewRepo(db *sql.DB) port.IdeaRepository { return &repo{db: db} }

func (r *repo) Save(ctx context.Context, i *domain.Idea) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO ideation_ideas
		  (id, title, objective, problem, scope, validate_competition, validate_monetization, completed, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
	`, i.ID, i.Title, i.Objective, i.Problem, i.Scope, i.ValidateCompetition, i.ValidateMonetization, i.Completed, i.CreatedAt)
	return err
}

func (r *repo) FindByID(ctx context.Context, id uuid.UUID) (*domain.Idea, error) {
	var i domain.Idea
	err := r.db.QueryRowContext(ctx, `
		SELECT id, title, objective, problem, scope, validate_competition, validate_monetization, completed, created_at
		  FROM ideation_ideas
		 WHERE id=$1
	`, id).
		Scan(&i.ID, &i.Title, &i.Objective, &i.Problem, &i.Scope, &i.ValidateCompetition, &i.ValidateMonetization, &i.Completed, &i.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &i, nil
}

func (r *repo) FindAll(ctx context.Context, limit int) ([]domain.Idea, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, title, objective, problem, scope, validate_competition, validate_monetization, completed, created_at
		  FROM ideation_ideas
		 ORDER BY created_at DESC
		 LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ideas []domain.Idea
	for rows.Next() {
		var i domain.Idea
		if err := rows.Scan(&i.ID, &i.Title, &i.Objective, &i.Problem, &i.Scope, &i.ValidateCompetition, &i.ValidateMonetization, &i.Completed, &i.CreatedAt); err != nil {
			return nil, err
		}
		ideas = append(ideas, i)
	}
	return ideas, rows.Err()
}

func (r *repo) UpdateIdea(ctx context.Context, i *domain.Idea) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE ideation_ideas
		   SET title = $2,
		       objective = $3,
		       problem = $4,
		       scope = $5,
		       validate_competition = $6,
		       validate_monetization = $7,
		       completed = $8
		 WHERE id = $1
	`, i.ID, i.Title, i.Objective, i.Problem, i.Scope, i.ValidateCompetition, i.ValidateMonetization, i.Completed)
	return err
}

func (r *repo) Delete(ctx context.Context, id uuid.UUID) error {
	// Eliminar primero los mensajes relacionados (CASCADE)
	_, err := r.db.ExecContext(ctx, `DELETE FROM ideation_messages WHERE idea_id = $1`, id)
	if err != nil {
		return err
	}

	// Eliminar la idea
	_, err = r.db.ExecContext(ctx, `DELETE FROM ideation_ideas WHERE id = $1`, id)
	return err
}

func (r *repo) AppendMessage(ctx context.Context, m *domain.Message) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO ideation_messages (id, idea_id, role, content, created_at)
		VALUES ($1,$2,$3,$4, now())
	`, m.ID, m.IdeaID, m.Role, m.Content)
	return err
}

func (r *repo) ListMessages(ctx context.Context, ideaID uuid.UUID, limit int) ([]domain.Message, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, idea_id, role, content, created_at
		  FROM ideation_messages
		 WHERE idea_id=$1
		 ORDER BY created_at ASC
		 LIMIT $2
	`, ideaID, limit)
	if err != nil { return nil, err }
	defer rows.Close()

	var out []domain.Message
	for rows.Next() {
		var m domain.Message
		if err := rows.Scan(&m.ID, &m.IdeaID, &m.Role, &m.Content, &m.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}
